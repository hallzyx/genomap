import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createPilot } from "./app.js";
import { readConfig } from "./config.js";

const publicOrigin = "https://genomap.example.test";
const publicHost = new URL(publicOrigin).host;
const authSecret = () => randomBytes(32).toString("base64url");

function scratchDirectory(context) {
  const path = mkdtempSync(join(tmpdir(), "genomap-config-"));
  context.after(() => rmdirSync(path));
  return path;
}

test("the optional env file supplies startup config while inherited variables take precedence", (context) => {
  const cwd = scratchDirectory(context);
  const file = join(cwd, "fixture.env");
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GENOMAP_/i.test(key)));
  const configUrl = new URL("./config.js", import.meta.url).href;
  const script = `import { readConfig } from ${JSON.stringify(configUrl)};
    const { host, origin, network } = readConfig();
    console.log(JSON.stringify({ host, origin, network }));`;
  const load = (extra = {}) => {
    const result = spawnSync(process.execPath, ["--env-file-if-exists=fixture.env", "--input-type=module", "--eval", script], {
      cwd, env: { ...env, GENOMAP_DB_PATH: "pilot.sqlite", ...extra }, encoding: "utf8", timeout: 5000,
    });
    assert.equal(result.status, 0, result.error?.message ?? result.stderr);
    return JSON.parse(result.stdout);
  };
  assert.deepEqual(load(), { host: "127.0.0.1", origin: "http://127.0.0.1:4173", network: "standalone" });
  writeFileSync(file, "GENOMAP_PORT=4195\nGENOMAP_STELLAR_NETWORK=standalone\n", { flag: "wx" });
  try {
    assert.equal(load().origin, "http://127.0.0.1:4195");
    assert.equal(load({ GENOMAP_PORT: "4196" }).origin, "http://127.0.0.1:4196");
  } finally {
    unlinkSync(file);
  }
});

test("a non-loopback listener requires a canonical HTTPS origin and a stable auth secret", (context) => {
  const env = {
    GENOMAP_DB_PATH: join(scratchDirectory(context), "pilot.sqlite"),
    GENOMAP_HOST: "0.0.0.0",
  };
  assert.throws(() => readConfig(env), /GENOMAP_PUBLIC_ORIGIN/);
  assert.throws(() => readConfig({ ...env, GENOMAP_HOST: "localhost" }), /GENOMAP_HOST/);
  for (const invalid of ["http://example.test", "https://example.test/", "https://example.test/path", "https://user@example.test", "https://example.test?query=1"]) {
    assert.throws(() => readConfig({ ...env, GENOMAP_PUBLIC_ORIGIN: invalid }), /GENOMAP_PUBLIC_ORIGIN/);
  }
  const publicEnv = { ...env, GENOMAP_PUBLIC_ORIGIN: publicOrigin };
  assert.throws(() => readConfig(publicEnv), /GENOMAP_AUTH_SECRET/);
  assert.throws(() => readConfig({ ...publicEnv, GENOMAP_AUTH_SECRET: "short" }), /GENOMAP_AUTH_SECRET/);
  const secret = authSecret();
  const config = readConfig({ ...publicEnv, GENOMAP_AUTH_SECRET: secret });
  assert.equal(config.host, "0.0.0.0");
  assert.equal(config.origin, publicOrigin);
  assert.equal(config.authSecret, secret);
});

test("the reverse-proxy path still enforces the canonical host and origin without serving env files", async (context) => {
  const { app, db } = await createPilot({ databasePath: ":memory:", origin: publicOrigin, authSecret: authSecret() });
  const server = app.listen(0, "127.0.0.1");
  context.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  });
  await new Promise((resolve) => server.once("listening", resolve));
  const postData = JSON.stringify({ name: "Proxy Test", email: "proxy-test@example.test", password: authSecret() });
  const send = (path, { host = publicHost, origin = publicOrigin, body } = {}) => new Promise((resolve, reject) => {
    const req = request({
      hostname: "127.0.0.1", port: server.address().port, path, method: body ? "POST" : "GET",
      headers: { host, origin, "x-forwarded-host": publicHost, ...(body && {
        "content-type": "application/json", "content-length": Buffer.byteLength(body),
      }) },
    }, (res) => {
      res.resume();
      res.once("end", () => resolve({ status: res.statusCode, cookies: res.headers["set-cookie"] }));
    });
    req.once("error", reject);
    req.end(body);
  });
  const signUp = "/api/auth/sign-up/email";
  assert.equal((await send(signUp, { host: "untrusted.example.test", body: postData })).status, 421);
  assert.equal((await send(signUp, { origin: "https://untrusted.example.test", body: postData })).status, 403);
  assert.equal((await send("/.env")).status, 404);
  assert.equal((await send("/.env.example")).status, 404);
  const signup = await send(signUp, { body: postData });
  assert.equal(signup.status, 200);
  assert.ok(signup.cookies?.some((cookie) => /; secure(?:;|$)/i.test(cookie)));
});

test("the internal host only reaches the public validator", async (context) => {
  const { app, db } = await createPilot({ databasePath: ":memory:", origin: publicOrigin, authSecret: authSecret(), internalHost: "app:4173" });
  const server = app.listen(0, "127.0.0.1");
  context.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  });
  await new Promise((resolve) => server.once("listening", resolve));
  const status = (path, host, method = "GET") => new Promise((resolve, reject) => {
    request({ hostname: "127.0.0.1", port: server.address().port, path, method, headers: { host } }, (res) => {
      res.resume();
      res.once("end", () => resolve(res.statusCode));
    }).once("error", reject).end();
  });
  assert.equal(await status("/api/validate/nobody", "app:4173"), 404);
  assert.equal(await status("/api/validate/nobody", "other:4173"), 421);
  assert.equal(await status("/api/me", "app:4173"), 421);
  assert.equal(await status("/api/validate/nobody", "app:4173", "POST"), 421);
  assert.throws(() => readConfig({ GENOMAP_INTERNAL_HOST: "http://app" }), /GENOMAP_INTERNAL_HOST/);
});
