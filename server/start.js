import { createPilot } from "./app.js";
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
const { app, db } = await createPilot({ ...config, chain });
const server = app.listen(config.port, "127.0.0.1", () => console.log(`GenoMap pilot: ${config.origin}`));
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => server.close(() => db.close()));
}
