import { randomBytes } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";

export async function openIdentity({ databasePath, origin, authSecret }) {
  const db = new DatabaseSync(databasePath);
  try {
    db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL");
    const auth = betterAuth({
      appName: "GenoMap",
      baseURL: origin,
      secret: authSecret ?? randomBytes(32).toString("base64url"),
      trustedOrigins: [origin],
      database: db,
      emailAndPassword: { enabled: true, minPasswordLength: 12, maxPasswordLength: 128 },
      advanced: { ipAddress: { ipAddressHeaders: ["x-genomap-client-ip"] } },
      rateLimit: { enabled: true, window: 60, max: 100, storage: "database" },
      telemetry: { enabled: false },
    });
    const migration = await getMigrations(auth.options);
    await migration.runMigrations();
    return { db, auth };
  } catch (error) {
    db.close();
    throw error;
  }
}

export async function bootstrapModerator({ auth, store, origin }, email, password) {
  const login = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!login || typeof password !== "string" || password.length < 12 || password.length > 128) {
    throw new Error("Set GENOMAP_MODERATOR_EMAIL and a 12–128 character GENOMAP_MODERATOR_PASSWORD.");
  }
  if (store.findUser(login)) throw new Error("Moderator bootstrap requires a new email.");
  const response = await auth.api.signUpEmail({
    body: { name: "Pilot moderator", email: login, password },
    headers: new Headers({ origin }),
    asResponse: true,
  });
  if (!response.ok) throw new Error("Moderator account could not be created.");
  const { user } = await response.json();
  if (!user || store.findUser(login)?.id !== user.id) throw new Error("Moderator account was not created.");
  store.grantModerator(user.id);
}
