import { bootstrapModerator, openIdentity } from "./auth.js";
import { readConfig } from "./config.js";
import { createStore } from "./store.js";

const config = readConfig();
const { db, auth } = await openIdentity(config);
try {
  await bootstrapModerator({ auth, origin: config.origin, store: createStore(db) },
    process.env.GENOMAP_MODERATOR_EMAIL, process.env.GENOMAP_MODERATOR_PASSWORD);
  console.log("Local moderator account created.");
} finally {
  db.close();
}
