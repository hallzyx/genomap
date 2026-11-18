import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export function readConfig(env = process.env) {
  const port = Number(env.GENOMAP_PORT ?? 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Set a valid GENOMAP_PORT.");
  const databasePath = resolve(env.GENOMAP_DB_PATH ?? ".pilot-data/genomap.sqlite");
  mkdirSync(dirname(databasePath), { recursive: true });
  return { port, origin: `http://127.0.0.1:${port}`, databasePath, authSecret: env.GENOMAP_AUTH_SECRET };
}
