import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import test from "node:test";
import { Keypair, StrKey } from "@stellar/stellar-sdk";
import { createPilot } from "./app.js";
import { bootstrapModerator } from "./auth.js";

async function withPilot(context, chain = null) {
  let pilot;
  const server = createServer((req, res) => pilot.app(req, res));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  context.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    pilot?.db.close();
  });
  pilot = await createPilot({ databasePath: ":memory:", origin, chain });
  function browser() {
    let cookie = "";
    return async function request(path, { body, alternateOrigin = origin } = {}) {
      const headers = { origin: alternateOrigin };
      if (cookie) headers.cookie = cookie;
      if (body !== undefined) headers["content-type"] = "application/json";
      const response = await fetch(origin + path, {
        method: body === undefined ? "GET" : "POST",
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const set = response.headers.getSetCookie();
      if (set.length) cookie = set.map((value) => value.split(";")[0]).join("; ");
      const contentType = response.headers.get("content-type");
      return {
        status: response.status,
        contentType,
        body: contentType?.includes("json") ? await response.json() : await response.text(),
        set,
      };
    };
  }
  return { ...pilot, browser };
}

const freshPassword = () => randomBytes(20).toString("base64url");

// Link a wallet the way a real client does: ask for a message, sign it (SEP-53), submit.
async function linkWallet(browser, keypair) {
  const challenge = await browser("/api/profile/address/challenge", { body: { address: keypair.publicKey() } });
  if (challenge.status !== 200) return challenge;
  const payload = createHash("sha256").update(Buffer.concat([
    Buffer.from("Stellar Signed Message:\n"), Buffer.from(challenge.body.message),
  ])).digest();
  return browser("/api/profile/address", {
    body: { address: keypair.publicKey(), signature: Buffer.from(keypair.sign(payload)).toString("base64") },
  });
}

async function register(browser, name = "Test learner") {
  const email = `${randomBytes(12).toString("hex")}@example.test`;
  const password = freshPassword();
  const registration = await browser("/api/auth/sign-up/email", { body: { name, email, password } });
  assert.ok(registration.status < 300, JSON.stringify(registration.body.error ?? registration.body.message ?? ""));
  assert.ok(registration.set.some((cookie) => /httponly/i.test(cookie)));
  return { email, password };
}

test("local identity, permissions, unique attendance, sharing privacy and sign-out", async (context) => {
  const pilot = await withPilot(context);
  const learner = pilot.browser();
  const organizer = pilot.browser();
  const moderator = pilot.browser();
  const stranger = pilot.browser();
  assert.equal((await stranger("/api/me")).status, 401);
  assert.equal((await stranger("/api/me/qr.svg")).status, 401);
  const learnerAccount = await register(learner, "Sample learner");
  await register(organizer, "Sample coordinator");
  await assert.rejects(bootstrapModerator(pilot, learnerAccount.email, learnerAccount.password), /new email/);
  const moderatorEmail = "moderator@example.test";
  const moderatorPassword = freshPassword();
  await bootstrapModerator(pilot, moderatorEmail, moderatorPassword);
  assert.equal((await moderator("/api/auth/sign-in/email", { body: { email: moderatorEmail, password: moderatorPassword } })).status, 200);
  assert.equal((await moderator("/api/me")).body.profile.role, "moderator");
  const eventPayload = { title: "Sample workshop", eventDate: "2026-11-18" };
  assert.equal((await organizer("/api/events", { body: eventPayload })).status, 403);
  assert.equal((await learner("/api/moderation")).status, 403);
  const absent = await learner("/api/profile/share", { body: { enabled: true }, alternateOrigin: "http://localhost:9999" });
  assert.equal(absent.status, 403);
  const request = await organizer("/api/organizer/request", { body: { name: "Sample community" } });
  assert.equal(request.status, 201);
  assert.equal(request.body.profile.organizerStatus, "pending");
  assert.equal((await organizer("/api/events", { body: eventPayload })).status, 403);
  const queue = (await moderator("/api/moderation")).body.requests;
  assert.equal(queue.length, 1);
  assert.equal((await learner(`/api/moderation/${queue[0].id}/approve`, { body: {} })).status, 403);
  assert.equal((await moderator(`/api/moderation/${queue[0].id}/approve`, { body: {} })).status, 200);
  assert.equal((await organizer("/api/me")).body.profile.role, "organizer");
  assert.equal((await moderator("/api/events", { body: eventPayload })).status, 403);
  assert.equal((await organizer("/api/events", { body: { ...eventPayload, eventDate: "2026-02-30" } })).status, 400);
  const { body: { event }, status: eventStatus } = await organizer("/api/events", { body: eventPayload });
  assert.equal(eventStatus, 201);
  const learnerProfile = (await learner("/api/me")).body.profile;
  assert.match(learnerProfile.code, /^[0-9A-F]{16}$/);
  const qr = await learner("/api/me/qr.svg");
  assert.match(qr.contentType, /^image\/svg\+xml/);
  assert.match(qr.body, /<svg/);
  const checkIn = `/api/events/${event.id}/attendance`;
  assert.equal((await learner(checkIn, { body: { code: learnerProfile.code } })).status, 403);
  assert.equal((await organizer(checkIn, { body: { code: "bad" } })).status, 400);
  const result = await organizer(checkIn, { body: { code: learnerProfile.code } });
  assert.equal(result.status, 201);
  const credential = result.body.credential;
  assert.equal(credential.status, "unanchored");
  assert.equal(credential.hash, null);
  assert.equal((await organizer(checkIn, { body: { code: learnerProfile.code } })).status, 409);
  const anchor = `/api/credentials/${credential.id}/anchor`;
  assert.equal((await learner(anchor, { body: {} })).status, 403);
  assert.equal((await organizer(anchor, { body: {} })).status, 503);
  assert.equal((await learner("/api/credentials")).body.credentials[0].canAnchor, false);
  const wallet = Keypair.random();
  const address = wallet.publicKey();
  assert.equal((await learner("/api/profile/address/challenge", { body: { address: "not a Stellar address" } })).status, 400);
  assert.equal((await learner("/api/profile/address", { body: { address, signature: "AAAA" } })).status, 400);
  assert.equal((await moderator("/api/profile/address/challenge", { body: { address } })).status, 403);
  const challenge = await learner("/api/profile/address/challenge", { body: { address } });
  const forged = Buffer.from(Keypair.random().sign(Buffer.alloc(32))).toString("base64");
  assert.equal((await learner("/api/profile/address", { body: { address, signature: forged } })).status, 400);
  const linked = await linkWallet(learner, wallet);
  assert.equal(linked.status, 200);
  assert.equal(linked.body.profile.address, address);
  assert.ok(challenge.body.message.includes(address));
  // The wallet is permanent and belongs to one profile only.
  assert.equal((await linkWallet(learner, Keypair.random())).status, 409);
  assert.equal((await linkWallet(organizer, wallet)).body.error.code, "address_taken");
  assert.equal((await learner("/api/profile/address", { body: { address: null } })).status, 400);
  assert.equal((await learner("/api/me")).body.profile.address, address);
  assert.equal((await learner("/api/profile/username", { body: { username: "no" } })).status, 400);
  assert.equal((await learner("/api/profile/username", { body: { username: "Sample_Learner" } })).body.profile.username, "sample_learner");
  assert.equal((await learner("/api/profile/username", { body: { username: "another_name" } })).status, 409);
  assert.equal((await organizer("/api/profile/username", { body: { username: "SAMPLE_learner" } })).status, 409);
  assert.equal((await stranger("/api/validate/sample_learner")).status, 404, "profiles are private until shared");
  const enabled = await learner("/api/profile/share", { body: { enabled: true } });
  const publicPath = `/api/public/${enabled.body.profile.shareToken}`;
  const shared = await stranger(publicPath);
  assert.equal(shared.status, 200);
  assert.deepEqual(Object.keys(shared.body).sort(), ["address", "credentials", "name", "network", "username"]);
  const serialized = JSON.stringify(shared.body);
  for (const value of [learnerAccount.email, learnerProfile.code, "canAnchor"]) {
    assert.ok(!serialized.includes(value));
  }
  const byName = await stranger("/api/validate/sample_learner");
  const byWallet = await stranger(`/api/validate/${address}`);
  assert.equal(byName.status, 200);
  assert.equal(byName.body.wallet, address);
  assert.deepEqual(byWallet.body, byName.body);
  assert.equal(byName.body.credentials[0].kind, "attendance");
  assert.equal((await stranger("/api/validate/sample_learner/verify")).status, 503);
  const publicCredential = shared.body.credentials[0];
  assert.equal(createHash("sha256").update(JSON.stringify(publicCredential.proof)).digest("hex"),
    publicCredential.commitment);
  assert.equal((await learner("/api/profile/share", { body: { enabled: false } })).status, 200);
  assert.equal((await stranger(publicPath)).status, 404);
  assert.equal((await stranger("/api/validate/sample_learner")).status, 404);
  assert.equal((await learner("/api/auth/sign-out", { body: {} })).status, 200);
  assert.equal((await learner("/api/me")).status, 401);
  assert.equal((await learner("/api/auth/sign-in/email", { body: learnerAccount })).status, 200);
  assert.equal((await learner("/api/credentials")).body.credentials.length, 1);
});

test("role isolation and proof state require a successful publisher response", async (context) => {
  let calls = 0;
  const result = { hash: "ab".repeat(32), contractId: StrKey.encodeContract(Buffer.alloc(32, 17)) };
  const registered = [];
  const issued = [];
  const pilot = await withPilot(context, {
    async registerOrganizer({ organizerId, name }) {
      assert.match(organizerId, /^[a-f0-9]{64}$/);
      registered.push(name);
      return result;
    },
    async issue(record) {
      assert.match(record.commitment, /^[a-f0-9]{64}$/);
      assert.match(record.eventId, /^[a-f0-9]{64}$/);
      calls++;
      if (calls === 1) throw new Error("Test-only RPC failure");
      issued.push(record);
      return { ...result, created: true };
    },
  });
  const publisher = pilot.browser(), learner = pilot.browser(), other = pilot.browser();
  await register(learner, "Learner");
  for (const organizer of [publisher, other]) {
    await register(organizer, "Organizer");
    const me = (await organizer("/api/me")).body;
    await organizer("/api/organizer/request", { body: { name: "Test community" } });
    assert.equal(pilot.store.approve(me.user.id), true);
  }
  const { body: { event } } = await publisher("/api/events", {
    body: { title: "Example", eventDate: "2026-11-18" },
  });
  const path = `/api/events/${event.id}/attendance`;
  const { code } = (await learner("/api/me")).body.profile;
  assert.equal((await other(path, { body: { code } })).status, 404);
  assert.equal((await publisher(path, { body: { code, kind: "mystery" } })).status, 400);
  const { body: { credential } } = await publisher(path, { body: { code, kind: "winner" } });
  assert.equal(credential.kind, "winner");
  assert.equal((await publisher(path, { body: { code } })).status, 201, "another kind for the same event is allowed");
  assert.equal((await publisher(path, { body: { code, kind: "winner" } })).status, 409);
  const target = `/api/credentials/${credential.id}/anchor`;
  assert.equal((await other(target, { body: {} })).status, 404);
  assert.equal((await publisher(target, { body: {} })).body.error.code, "wallet_required");
  assert.equal((await linkWallet(learner, Keypair.random())).status, 200);
  assert.equal((await publisher(target, { body: {} })).status, 503);
  assert.equal((await learner("/api/credentials")).body.credentials[0].status, "unanchored");
  const anchored = await publisher(target, { body: {} });
  assert.equal(anchored.body.credential.status, "confirmed");
  assert.equal(anchored.body.credential.hash, result.hash);
  assert.equal(anchored.body.credential.contractId, result.contractId);
  assert.equal((await publisher(target, { body: {} })).status, 200);
  assert.equal(calls, 2);
  assert.deepEqual(registered, ["Test community"], "the organizer is registered on-chain once");
  assert.equal(issued[0].kind, "winner");
  assert.equal(issued[0].eventTitle, "Example");
  assert.equal(issued[0].eventDate, "2026-11-18");
});
