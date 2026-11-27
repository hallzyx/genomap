import { createHash, randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import express from "express";
import QRCode from "qrcode";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { Keypair, StrKey } from "@stellar/stellar-sdk";
import { openIdentity } from "./auth.js";
import { KIND_LIST, createStore, sha256Hex } from "./store.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const recordId = /^[0-9a-f-]{36}$/i;
const shareId = /^[A-Za-z0-9_-]{32}$/;
const queryText = /^[A-Za-z0-9_]{3,56}$/;

// SEP-53 message signing, as produced by wallets such as Freighter.
function validSignature(address, message, signature) {
  if (typeof signature !== "string") return false;
  const payload = createHash("sha256").update(Buffer.concat([
    Buffer.from("Stellar Signed Message:\n"), Buffer.from(message),
  ])).digest();
  try {
    return Keypair.fromPublicKey(address).verify(payload, Buffer.from(signature, "base64"));
  } catch {
    return false;
  }
}

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

export async function createPilot({ databasePath, origin, authSecret, chain = null, internalHost = null }) {
  const { db, auth } = await openIdentity({ databasePath, origin, authSecret });
  const store = createStore(db);
  const app = express();
  const inFlight = new Map();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    // Accept only the configured host, including when accessed through a reverse proxy.
    const internalRead = internalHost && req.headers.host === internalHost &&
      req.method === "GET" && req.path.startsWith("/api/validate/");
    if (req.headers.host !== new URL(origin).host && !internalRead) {
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
    res.json({ user, profile, chainEnabled: Boolean(chain), chainNetwork: chain?.network ?? null });
  }));
  app.get("/api/me/qr.svg", signedIn(null, async (_req, res, _user, profile) => {
    const svg = await QRCode.toString(profile.code, { type: "svg", margin: 2 });
    res.type("image/svg+xml").send(svg);
  }));

  app.post("/api/organizer/request", signedIn("learner", (req, res, user) => {
    const name = requiredText(req.body?.name, 100, "organizer name");
    const optional = (value, max) => (typeof value === "string" && value.trim() ? requiredText(value, max, "text") : null);
    const link = optional(req.body?.link, 200);
    const note = optional(req.body?.note, 1000);
    if (!store.requestOrganizer(user.id, name, link, note)) refuse(409, "not_requestable", "An organizer request already exists.");
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
    const kind = req.body?.kind ?? "attendance";
    if (!KIND_LIST.includes(kind)) refuse(400, "invalid_kind", "Choose attendance, winner, staff or speaker.");
    const credential = store.issue(user.id, profile.organizerName, event, learner, kind);
    if (!credential) refuse(409, "already_checked_in", "Attendance was already recorded.");
    res.status(201).json({ credential });
  }));

  app.get("/api/credentials", signedIn(null, (_req, res, user, profile) => {
    res.json({ credentials: store.credentials(user.id, profile.role === "organizer") });
  }));
  app.post("/api/credentials/:id/anchor", signedIn("organizer", async (req, res, user, profile) => {
    const credential = recordId.test(req.params.id) && store.ownedCredential(user.id, req.params.id);
    if (!credential) refuse(404, "credential_missing", "No credential was found.");
    if (credential.hash) return res.json({ credential });
    if (!chain) refuse(503, "chain_unavailable", "Stellar anchoring is not configured.");
    const context = store.anchorContext(user.id, credential.id);
    if (!context.wallet) refuse(409, "wallet_required", "The learner has not linked a wallet yet.");
    let anchoring = inFlight.get(credential.id);
    if (!anchoring) {
      anchoring = Promise.resolve().then(async () => {
        const organizerId = sha256Hex(user.id);
        if (!store.organizerRegistered(user.id)) {
          await chain.registerOrganizer({ organizerId, name: profile.organizerName });
          store.markOrganizerRegistered(user.id);
        }
        const { hash, contractId } = await chain.issue({
          wallet: context.wallet, organizerId, kind: context.kind, eventId: sha256Hex(context.eventId),
          eventTitle: context.title, eventDate: context.eventDate, commitment: context.commitment,
        });
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

  // Linking a wallet is permanent, so ownership is proven with a signed message (SEP-53,
  // e.g. Freighter's signMessage) before the address is stored.
  const challenges = new Map();
  const linkableAddress = (value, profile) => {
    if (typeof value !== "string" || !StrKey.isValidEd25519PublicKey(value)) {
      refuse(400, "invalid_address", "Provide a public Stellar account address.");
    }
    if (profile.role === "moderator") refuse(403, "role_required", "Moderators cannot link a wallet.");
    if (profile.address) refuse(409, "address_locked", "A wallet is already linked and cannot be changed.");
    if (store.addressOwner(value)) refuse(409, "address_taken", "This wallet belongs to another profile.");
    return value;
  };
  app.post("/api/profile/address/challenge", signedIn(null, (req, res, user, profile) => {
    const address = linkableAddress(req.body?.address, profile);
    const message = [
      "Link this Stellar wallet to my Genomap profile. This cannot be undone.",
      `Wallet: ${address}`, `Account: ${user.id}`, `Nonce: ${randomBytes(16).toString("hex")}`,
    ].join("\n");
    challenges.set(user.id, { address, message, expires: Date.now() + 5 * 60_000 });
    res.json({ message });
  }));
  app.post("/api/profile/address", signedIn(null, (req, res, user, profile) => {
    const address = linkableAddress(req.body?.address, profile);
    const challenge = challenges.get(user.id);
    challenges.delete(user.id);
    if (!challenge || challenge.address !== address || challenge.expires < Date.now()) {
      refuse(400, "challenge_required", "Request a new signing message and try again.");
    }
    if (!validSignature(address, challenge.message, req.body?.signature)) {
      refuse(400, "bad_signature", "The signature does not match this wallet.");
    }
    const linked = store.linkAddress(user.id, address);
    if (!linked) refuse(409, "address_locked", "A wallet is already linked and cannot be changed.");
    res.json({ profile: linked });
  }));
  app.post("/api/profile/username", signedIn(null, (req, res, user, profile) => {
    const username = typeof req.body?.username === "string" ? req.body.username.trim().toLowerCase() : "";
    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      refuse(400, "invalid_username", "Use 3 to 24 letters, numbers or underscores.");
    }
    if (profile.username) refuse(409, "username_locked", "Your username is already set.");
    if (store.usernameTaken(username)) refuse(409, "username_taken", "That username is taken.");
    const claimed = store.claimUsername(user.id, username);
    if (!claimed) refuse(409, "username_locked", "Your username is already set.");
    res.json({ profile: claimed });
  }));
  app.post("/api/profile/share", signedIn(null, (req, res, user) => {
    if (typeof req.body?.enabled !== "boolean") refuse(400, "invalid_input", "Specify whether sharing is enabled.");
    res.json({ profile: store.setSharing(user.id, req.body.enabled) });
  }));
  app.get("/api/public/:token", (req, res) => {
    const profile = shareId.test(req.params.token) && store.publicProfile(req.params.token);
    if (!profile) refuse(404, "profile_missing", "No shared profile was found.");
    res.json({ ...profile, network: chain?.network ?? null });
  });

  // Public validator: look a person up by username or linked wallet. Only profiles whose owner
  // turned public sharing on can be found.
  const lookup = (query) => {
    const card = queryText.test(query) && store.validate(query);
    if (!card) refuse(404, "profile_missing", "No public profile was found.");
    return card;
  };
  app.get("/api/validate/:query", (req, res) => {
    const { name, username, address, credentials } = lookup(req.params.query);
    res.json({ name, username, wallet: address, network: chain?.network ?? null, credentials });
  });
  // Compare the database copy with what the contract holds for this wallet.
  const compareWithChain = async (address, credentials) => {
    if (!chain) refuse(503, "chain_unavailable", "Stellar verification is not configured.");
    if (!address) refuse(409, "wallet_missing", "This profile has not linked a wallet.");
    let records;
    try {
      records = await chain.recordsOf(address);
    } catch {
      refuse(503, "chain_unavailable", "Stellar could not be reached. Try again in a moment.");
    }
    const held = new Set(records.map((record) => record.commitment));
    const known = new Set(credentials.map((credential) => credential.commitment));
    return {
      wallet: address, network: chain.network, contractId: chain.contractId,
      checkedAt: new Date().toISOString(),
      results: credentials.map(({ id, hash, commitment }) => ({
        id, status: !hash ? "local_only" : held.has(commitment) ? "match" : "missing_on_chain",
      })),
      onChainOnly: records.filter((record) => !known.has(record.commitment)).length,
      records,
    };
  };
  app.get("/api/validate/:query/verify", async (req, res) => {
    const card = lookup(req.params.query);
    res.json(await compareWithChain(card.address, card.credentials));
  });
  // The same comparison for your own trail, even while your profile is private.
  app.get("/api/me/verify", signedIn(null, async (_req, res, user, profile) => {
    res.json(await compareWithChain(profile.address, store.credentials(user.id, false)));
  }));
  app.use("/api", (_req, _res, next) => next(new HttpError(404, "missing", "No endpoint was found.")));

  const send = (path) => (_req, res, next) => res.sendFile(join(root, path), (error) => {
    if (error) next(error);
  });
  app.use("/assets", express.static(join(root, "assets"), { index: false, redirect: false }));
  app.use("/pilot-assets", express.static(join(root, "dist"), { index: false, redirect: false }));
  // One single-page app serves every screen; the client reads the path and picks the language.
  // Paths that look like files (a dot) are never answered with the app, so /.env stays a 404.
  app.get(/^\/(?!api(?:\/|$)|assets\/|pilot-assets\/)[^.]*$/, send("dist/index.html"));
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
