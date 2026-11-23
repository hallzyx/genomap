import { fileURLToPath } from "node:url";
import { join } from "node:path";
import express from "express";
import QRCode from "qrcode";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { StrKey } from "@stellar/stellar-sdk";
import { openIdentity } from "./auth.js";
import { createStore } from "./store.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const recordId = /^[0-9a-f-]{36}$/i;
const shareId = /^[A-Za-z0-9_-]{32}$/;

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
const refuse = (status, code, message) => { throw new HttpError(status, code, message); };

function requiredText(value, max, label) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || text.length > max) refuse(400, "invalid_input", `Provide a valid ${label}.`);
  return text;
}

function dateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    refuse(400, "invalid_input", "Use YYYY-MM-DD for the event date.");
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    refuse(400, "invalid_input", "Provide a valid event date.");
  }
  return value;
}

export async function createPilot({ databasePath, origin, authSecret, chain = null }) {
  const { db, auth } = await openIdentity({ databasePath, origin, authSecret });
  const store = createStore(db);
  const app = express();
  const inFlight = new Map();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    // Bind the loopback service to the configured origin, including against DNS rebinding.
    if (req.headers.host !== new URL(origin).host) {
      return res.status(421).end();
    }
    res.set({
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    });
    next();
  });
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!["GET", "HEAD"].includes(req.method) && req.get("origin") !== origin) {
      return next(new HttpError(403, "origin_required", "Use GenoMap from the same origin."));
    }
    next();
  });
  const authHandler = toNodeHandler(auth);
  app.all("/api/auth/*splat", (req, res) => {
    req.headers["x-genomap-client-ip"] = req.socket.remoteAddress ?? "";
    return authHandler(req, res);
  });
  app.use("/api", express.json({ limit: "16kb" }));

  const signedIn = (role, action) => async (req, res) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session?.user) refuse(401, "sign_in_required", "Sign in to continue.");
    const { id, name, email } = session.user;
    const profile = store.profile(id);
    if (role && profile.role !== role) refuse(403, "role_required", "You do not have permission for this action.");
    await action(req, res, { id, name, email }, profile);
  };

  app.get("/api/me", signedIn(null, (_req, res, user, profile) => {
    res.json({ user, profile, chainEnabled: Boolean(chain) });
  }));
  app.get("/api/me/qr.svg", signedIn(null, async (_req, res, _user, profile) => {
    const svg = await QRCode.toString(profile.code, { type: "svg", margin: 2 });
    res.type("image/svg+xml").send(svg);
  }));

  app.post("/api/organizer/request", signedIn("learner", (req, res, user) => {
    const name = requiredText(req.body?.name, 100, "organizer name");
    if (!store.requestOrganizer(user.id, name)) refuse(409, "not_requestable", "An organizer request already exists.");
    res.status(201).json({ profile: store.profile(user.id) });
  }));
  app.get("/api/moderation", signedIn("moderator", (_req, res) => {
    res.json({ requests: store.requests() });
  }));
  app.post("/api/moderation/:id/approve", signedIn("moderator", (req, res) => {
    if (!store.approve(req.params.id)) refuse(404, "request_missing", "No pending request was found.");
    res.json({ ok: true });
  }));

  app.get("/api/events", signedIn("organizer", (_req, res, user) => {
    res.json({ events: store.listEvents(user.id) });
  }));
  app.post("/api/events", signedIn("organizer", (req, res, user) => {
    const event = store.createEvent(user.id, requiredText(req.body?.title, 120, "event title"), dateOnly(req.body?.eventDate));
    res.status(201).json({ event });
  }));
  app.post("/api/events/:id/attendance", signedIn("organizer", (req, res, user, profile) => {
    const event = recordId.test(req.params.id) && store.ownedEvent(user.id, req.params.id);
    if (!event) refuse(404, "event_missing", "No event was found.");
    const code = typeof req.body?.code === "string" ? req.body.code.trim().toUpperCase() : "";
    if (!/^[0-9A-F]{16}$/.test(code)) refuse(400, "invalid_code", "Provide a valid check-in code.");
    const learner = store.learnerForCode(code);
    if (!learner) refuse(404, "learner_missing", "No learner was found for this code.");
    if (learner.id === user.id) refuse(400, "self_check_in", "You cannot confirm your own attendance.");
    const credential = store.issue(user.id, profile.organizerName, event, learner);
    if (!credential) refuse(409, "already_checked_in", "Attendance was already recorded.");
    res.status(201).json({ credential });
  }));

  app.get("/api/credentials", signedIn(null, (_req, res, user, profile) => {
    res.json({ credentials: store.credentials(user.id, profile.role === "organizer") });
  }));
  app.post("/api/credentials/:id/anchor", signedIn("organizer", async (req, res, user) => {
    const credential = recordId.test(req.params.id) && store.ownedCredential(user.id, req.params.id);
    if (!credential) refuse(404, "credential_missing", "No credential was found.");
    if (credential.hash) return res.json({ credential });
    if (!chain) refuse(503, "chain_unavailable", "The local Stellar RPC is not configured.");
    let anchoring = inFlight.get(credential.id);
    if (!anchoring) {
      anchoring = Promise.resolve().then(async () => {
        const { hash, contractId } = await chain.attest(credential.commitment);
        return store.confirm(user.id, credential.id, hash, contractId);
      }).finally(() => inFlight.delete(credential.id));
      inFlight.set(credential.id, anchoring);
    }
    try {
      res.json({ credential: await anchoring });
    } catch {
      refuse(503, "chain_unavailable", "Stellar has not confirmed this credential.");
    }
  }));

  app.post("/api/profile/address", signedIn(null, (req, res, user) => {
    const address = req.body?.address;
    if (address !== null && (typeof address !== "string" || !StrKey.isValidEd25519PublicKey(address))) {
      refuse(400, "invalid_address", "Provide a public Stellar account address.");
    }
    res.json({ profile: store.setAddress(user.id, address) });
  }));
  app.post("/api/profile/share", signedIn(null, (req, res, user) => {
    if (typeof req.body?.enabled !== "boolean") refuse(400, "invalid_input", "Specify whether sharing is enabled.");
    res.json({ profile: store.setSharing(user.id, req.body.enabled) });
  }));
  app.get("/api/public/:token", (req, res) => {
    const profile = shareId.test(req.params.token) && store.publicProfile(req.params.token);
    if (!profile) refuse(404, "profile_missing", "No shared profile was found.");
    res.json(profile);
  });
  app.use("/api", (_req, _res, next) => next(new HttpError(404, "missing", "No endpoint was found.")));

  const send = (path) => (_req, res, next) => res.sendFile(join(root, path), (error) => {
    if (error) next(error);
  });
  app.use("/assets", express.static(join(root, "assets"), { index: false, redirect: false }));
  app.use("/pilot-assets", express.static(join(root, "dist"), { index: false, redirect: false }));
  app.get(["/", "/index.html"], send("dist/landing/index.html"));
  app.get(["/en", "/en/", "/en/index.html"], send("dist/landing/en/index.html"));
  app.get("/styles.css", send("styles.css"));
  app.get("/app.css", send("app.css"));
  app.get(["/app", "/app/index.html", "/en/app", "/en/app/index.html"], send("dist/index.html"));
  app.use((error, _req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof HttpError) {
      return res.status(error.status).json({ error: { code: error.code, message: error.message } });
    }
    const status = [400, 404, 413].includes(error.status) ? error.status : 500;
    res.status(status).json({ error: { code: status === 500 ? "internal" : "bad_request", message: "The request could not be completed." } });
  });
  return { app, auth, store, db, origin };
}
