import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Address, Operation, StrKey } from "@stellar/stellar-sdk";
import { createStellarAdapter, createTestnetPublisher } from "../server/stellar.js";

const ledger = resolve(".pilot-data/genomap-testnet-verification.json");
const wasmPath = resolve("contracts/attendance/target/wasm32v1-none/release/genomap_attendance.wasm");
const horizon = "https://horizon-testnet.stellar.org/accounts/";
const friendbot = "https://friendbot.stellar.org/";
const alias = process.argv[2];
let step = "validate the explicit issuer alias";

async function request(url) {
  return fetch(url, { redirect: "error", signal: AbortSignal.timeout(10_000) });
}

async function main() {
  if (process.argv.length !== 3 || !alias) throw new Error("Provide one alias.");
  const publisher = createTestnetPublisher(alias);
  const address = await publisher.issuerAddress();
  const issuer = Address.fromString(address);
  step = "read the compiled attendance Wasm";
  const wasm = await readFile(wasmPath);
  if (wasm.subarray(0, 8).toString("hex") !== "0061736d01000000") throw new Error("Invalid Wasm header.");
  const wasmHash = createHash("sha256").update(wasm).digest();

  step = "check the official Testnet network and account";
  await publisher.requireNetwork();
  const account = await request(horizon + address);
  if (account.status !== 404 && (!account.ok || (await account.json()).account_id !== address)) {
    throw new Error("The account lookup was inconclusive.");
  }

  step = "reserve the one-time Testnet journal";
  await mkdir(dirname(ledger), { recursive: true });
  const state = { status: "in-flight", network: "testnet", alias, publisher: address, wasmHash: wasmHash.toString("hex") };
  const save = async (options) => writeFile(ledger, JSON.stringify(state, null, 2) + "\n", options);
  await save({ flag: "wx" });

  if (account.status === 404) {
    step = "fund the missing Testnet account";
    state.fundingRequested = true;
    await save();
    const funding = await request(friendbot + "?addr=" + address);
    if (!funding.ok) throw new Error("Friendbot did not confirm funding.");
    state.fundingConfirmed = true;
    await save();
  }

  const submit = async (field, operation) => publisher.submit(await publisher.prepare(address, operation), address, async (hash) => {
    state[field] = hash;
    await save();
  });
  step = "upload the Wasm";
  await submit("uploadHash", Operation.uploadContractWasm({ wasm }));

  step = "deploy the attendance registry";
  const { returnValue } = await submit("deployHash", Operation.createCustomContract({
    address: issuer, wasmHash, constructorArgs: [issuer.toScVal()],
  }));
  const contractId = Address.fromScVal(returnValue).toString();
  if (!StrKey.isValidContract(contractId)) throw new Error("Testnet did not return a contract ID.");
  state.contractId = contractId;
  const commitment = randomBytes(32).toString("hex");
  state.commitment = commitment;
  await save();

  step = "anchor the synthetic commitment";
  const chain = createStellarAdapter({ network: "testnet", issuerAlias: alias, contractId }, { resolveAlias: async () => address });
  await chain.attest(commitment, async (hash) => {
    state.anchorHash = hash;
    await save();
  });
  step = "verify the commitment on Testnet";
  if (!await chain.hasAttestation(commitment)) throw new Error("The commitment was not found on Testnet.");
  state.status = "verified";
  await save();
  console.log(JSON.stringify(state, null, 2));
}

main().catch(() => {
  console.error(`Could not ${step}. No automatic retry was attempted.`);
  console.error("If .pilot-data/genomap-testnet-verification.json exists, inspect its recorded hashes before retrying.");
  process.exitCode = 1;
});
