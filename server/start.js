import { createPilot } from "./app.js";
import { ensureModerator } from "./auth.js";
import { readConfig } from "./config.js";
import { createStellarAdapter } from "./stellar.js";

const config = readConfig();
const chain = createStellarAdapter({
  network: config.network,
  url: process.env.GENOMAP_STELLAR_RPC_URL,
  contractId: process.env.GENOMAP_STELLAR_CONTRACT_ID,
  issuerSecret: process.env.GENOMAP_STELLAR_ISSUER_SECRET,
  issuerAlias: process.env.GENOMAP_STELLAR_ISSUER_ALIAS,
});
const pilot = await createPilot({ ...config, chain });
const moderator = await ensureModerator(pilot, process.env.GENOMAP_MODERATOR_EMAIL, process.env.GENOMAP_MODERATOR_PASSWORD);
if (moderator) console.log(moderator);
const { app, db } = pilot;
const server = app.listen(config.port, config.host, () => console.log(`GenoMap pilot: ${config.origin}`));
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => server.close(() => db.close()));
}
