import { lstatSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export function readConfig(env = process.env) {
  const port = Number(env.GENOMAP_PORT ?? 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Set a valid GENOMAP_PORT.");
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
  mkdirSync(dirname(databasePath), { recursive: true });
  return { port, origin: `http://127.0.0.1:${port}`, databasePath, authSecret: env.GENOMAP_AUTH_SECRET, network };
}
