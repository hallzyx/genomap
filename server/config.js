import { lstatSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

function readOrigin(value, host, port) {
  if (value === undefined && host === "127.0.0.1") return `http://127.0.0.1:${port}`;
  const url = typeof value === "string" && URL.canParse(value) ? new URL(value) : null;
  if (url?.protocol !== "https:" || value !== url.origin) {
    throw new Error("Set GENOMAP_PUBLIC_ORIGIN to the exact HTTPS origin without a path or trailing slash.");
  }
  return url.origin;
}

export function readConfig(env = process.env) {
  const port = Number(env.GENOMAP_PORT ?? 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Set a valid GENOMAP_PORT.");
  const host = env.GENOMAP_HOST ?? "127.0.0.1";
  if (!["127.0.0.1", "0.0.0.0"].includes(host)) {
    throw new Error("Use 127.0.0.1 or 0.0.0.0 for GENOMAP_HOST.");
  }
  const origin = readOrigin(env.GENOMAP_PUBLIC_ORIGIN, host, port);
  const authSecret = env.GENOMAP_AUTH_SECRET;
  if (env.GENOMAP_PUBLIC_ORIGIN !== undefined && (authSecret?.trim().length ?? 0) < 32) {
    throw new Error("Set GENOMAP_AUTH_SECRET to a stable random secret of at least 32 characters for HTTPS.");
  }
  const network = env.GENOMAP_STELLAR_NETWORK ?? "standalone";
  if (!["standalone", "testnet"].includes(network)) throw new Error("Use standalone or testnet for GENOMAP_STELLAR_NETWORK.");
  const testnetPath = resolve(".pilot-data/genomap-testnet.sqlite");
  const databasePath = resolve(env.GENOMAP_DB_PATH ?? (network === "testnet" ? testnetPath : ".pilot-data/genomap.sqlite"));
  const normalize = (path) => process.platform === "win32" ? path.toLowerCase() : path;
  if ((network === "testnet") !== (normalize(databasePath) === normalize(testnetPath))) {
    throw new Error("Use the dedicated .pilot-data/genomap-testnet.sqlite database for Testnet only.");
  }
  if (network === "testnet") {
    const file = lstatSync(databasePath, { throwIfNoEntry: false });
    if (file && (!file.isFile() || file.nlink !== 1)) throw new Error("The Testnet database must be a separate regular file.");
  }
  // A second host name for services on the same private network (for example the MCP container
  // calling "app:4173"). It only ever reaches the public, read-only validator.
  const internalHost = env.GENOMAP_INTERNAL_HOST || null;
  if (internalHost && !/^[a-z0-9-]+:\d{1,5}$/.test(internalHost)) {
    throw new Error("Set GENOMAP_INTERNAL_HOST as a service name and port, for example app:4173.");
  }
  mkdirSync(dirname(databasePath), { recursive: true });
  return { host, port, origin, databasePath, authSecret, network, internalHost };
}
