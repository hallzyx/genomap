import { Address, BASE_FEE, Contract, Keypair, Networks, StrKey, Transaction, TransactionBuilder, rpc, scValToNative, xdr } from "@stellar/stellar-sdk";
import { addressForAlias, signWithAlias, TESTNET_RPC, validIssuerAlias } from "./stellar-cli.js";

const digest = /^[a-f0-9]{64}$/;
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function connectRpc(endpoint, allowHttp) {
  const server = new rpc.Server(endpoint, { allowHttp, timeout: 3000 });
  server.httpClient.defaults.maxRedirects = 0;
  server.httpClient.defaults.proxy = false;
  return server;
}

async function requireNetwork(server, passphrase) {
  if ((await server.getNetwork()).passphrase === passphrase) return;
  throw new Error(passphrase === Networks.TESTNET ? "SDF Stellar Testnet required." : "Local standalone Stellar network required.");
}

function verifySignature(before, after, issuer) {
  const signature = after.signatures[0];
  if (!(after instanceof Transaction) || !Buffer.from(before.hash()).equals(Buffer.from(after.hash())) ||
      after.signatures.length !== 1 || !Buffer.from(signature.hint.toXDR()).equals(Buffer.from(issuer.signatureHint())) ||
      !issuer.verify(after.hash(), signature.signature)) {
    throw new Error("The CLI returned an altered or unverified Stellar transaction.");
  }
}

function createPublisher({ network, url, issuerSecret, issuerAlias }, {
  makeServer = connectRpc, resolveAlias = addressForAlias, signAlias = signWithAlias, wait = pause,
} = {}) {
  const testnet = network === "testnet";
  const passphrase = testnet ? Networks.TESTNET : Networks.STANDALONE;
  const endpoint = URL.parse(url ?? (testnet ? TESTNET_RPC : ""));
  if (testnet) {
    // Testnet signs with exactly one of: a Stellar CLI alias, or an issuer secret kept in the
    // server's private environment (for servers without the CLI). Never Mainnet keys.
    const bySecret = issuerSecret !== undefined;
    const byAlias = issuerAlias !== undefined;
    if (endpoint?.href !== TESTNET_RPC || bySecret === byAlias ||
        (byAlias && !validIssuerAlias(issuerAlias)) || (bySecret && !StrKey.isValidEd25519SecretSeed(issuerSecret))) {
      throw new Error("SDF Stellar Testnet requires exactly one signer: a CLI issuer alias or a valid issuer secret.");
    }
  } else if (network !== "standalone" || !endpoint || endpoint.protocol !== "http:" || endpoint.hostname !== "127.0.0.1" ||
      endpoint.username || endpoint.password || endpoint.search || endpoint.hash || issuerAlias !== undefined ||
      !StrKey.isValidEd25519SecretSeed(issuerSecret ?? "")) {
    throw new Error("Provide a loopback Stellar RPC URL and issuer secret for standalone mode.");
  }
  const server = makeServer(endpoint.href, !testnet);
  const localIssuer = issuerSecret === undefined ? null : Keypair.fromSecret(issuerSecret);
  const issuerAddress = async () => {
    const address = localIssuer ? localIssuer.publicKey() : await resolveAlias(issuerAlias);
    if (!StrKey.isValidEd25519PublicKey(address)) throw new Error("The issuer alias did not resolve to an account.");
    return address;
  };
  const build = async (address, operation) => new TransactionBuilder(await server.getAccount(address), { fee: BASE_FEE, networkPassphrase: passphrase })
    .addOperation(operation).setTimeout(60).build();

  return {
    issuerAddress,
    requireNetwork: () => requireNetwork(server, passphrase),
    async prepare(address, operation) {
      await requireNetwork(server, passphrase);
      return server.prepareTransaction(await build(address, operation));
    },
    async submit(prepared, address, beforeSend = async () => {}) {
      await requireNetwork(server, passphrase);
      let signed = prepared;
      if (prepared.source !== address || prepared.signatures.length) throw new Error("Unexpected Stellar source account or signatures.");
      if (localIssuer) {
        if (localIssuer.publicKey() !== address) throw new Error("Unexpected local Stellar issuer.");
        signed.sign(localIssuer);
      } else {
        signed = TransactionBuilder.fromXDR(await signAlias(issuerAlias, prepared.toXDR()), passphrase);
        verifySignature(prepared, signed, Keypair.fromPublicKey(address));
      }
      const hash = Buffer.from(signed.hash()).toString("hex");
      await requireNetwork(server, passphrase);
      await beforeSend(hash);
      const submitted = await server.sendTransaction(signed);
      if (!["PENDING", "DUPLICATE"].includes(submitted.status)) throw new Error("The Stellar RPC did not accept the transaction.");
      if (submitted.hash !== hash) throw new Error("Unexpected Stellar transaction hash.");
      for (let attempt = 0; attempt < 9; attempt++) {
        if (attempt) await wait(1250);
        const result = await server.getTransaction(hash);
        if (result.status === "SUCCESS") return { hash, returnValue: result.returnValue };
        if (result.status !== "NOT_FOUND") throw new Error("The Stellar transaction did not succeed.");
      }
      throw new Error("The Stellar transaction has not been confirmed.");
    },
    async simulate(address, operation) {
      await requireNetwork(server, passphrase);
      const response = await server.simulateTransaction(await build(address, operation));
      if (!rpc.Api.isSimulationSuccess(response) || !response.result?.retval) {
        throw new Error("Stellar could not verify the contract readback.");
      }
      return response.result.retval;
    },
  };
}

export function createTestnetPublisher(issuerAlias, dependencies) {
  return createPublisher({ network: "testnet", issuerAlias }, dependencies);
}

export const KINDS = { attendance: 0, winner: 1, staff: 2, speaker: 3 };
const KIND_NAMES = Object.keys(KINDS);
const PAGE = 50;

function bytes32(value, label) {
  if (typeof value !== "string" || !digest.test(value)) {
    throw new Error(`The ${label} must be a 32-byte hex digest.`);
  }
  return xdr.ScVal.scvBytes(Buffer.from(value, "hex"));
}

function walletValue(wallet) {
  if (!StrKey.isValidEd25519PublicKey(wallet ?? "")) throw new Error("Provide a public Stellar account address.");
  return new Address(wallet).toScVal();
}

function eventDateNumber(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Use YYYY-MM-DD for the event date.");
  return Number(date.replaceAll("-", ""));
}

function readRecord(raw) {
  const hex = (value) => Buffer.from(value).toString("hex");
  const date = String(raw.event_date);
  return {
    kind: KIND_NAMES[Number(raw.kind)],
    eventId: hex(raw.event_id),
    event: raw.event,
    eventDate: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
    organizerId: hex(raw.organizer_id),
    commitment: hex(raw.commitment),
    anchoredAt: Number(raw.anchored_at),
  };
}

export function createStellarAdapter({ network = "standalone", url, contractId, issuerSecret, issuerAlias }, dependencies) {
  if (network === "standalone" && ![url, contractId, issuerSecret, issuerAlias].some(Boolean)) return null;
  const publisher = createPublisher({ network, url, issuerSecret, issuerAlias }, dependencies);
  if (!StrKey.isValidContract(contractId ?? "")) throw new Error("Provide a valid Stellar contract ID.");
  const contract = new Contract(contractId);
  let queue = Promise.resolve();
  // Writes are serialized so the publisher account's sequence number never collides.
  const write = (operation, beforeSend) => {
    const work = queue.then(async () => {
      const address = await publisher.issuerAddress();
      const prepared = await publisher.prepare(address, operation);
      const { hash, returnValue } = await publisher.submit(prepared, address, beforeSend);
      return { hash, contractId, returnValue };
    });
    queue = work.catch(() => {});
    return work;
  };
  return {
    contractId,
    network,
    /** Approve (or revoke) an organizer on the registry. */
    registerOrganizer({ organizerId, name, approved = true }, beforeSend) {
      if (typeof name !== "string" || !name.trim()) throw new Error("Provide the organizer name.");
      const operation = contract.call("set_organizer", bytes32(organizerId, "organizer id"),
        xdr.ScVal.scvString(name.trim()), xdr.ScVal.scvBool(Boolean(approved)));
      return write(operation, beforeSend).then(({ hash, contractId: id }) => ({ hash, contractId: id }));
    },
    /** Write one record to a learner's wallet. `created` is false if the chain already had it. */
    issue({ wallet, organizerId, kind, eventId, eventTitle, eventDate, commitment }, beforeSend) {
      if (!(kind in KINDS)) throw new Error("Unknown record kind.");
      if (typeof eventTitle !== "string" || !eventTitle) throw new Error("Provide the event title.");
      const operation = contract.call("issue", walletValue(wallet), bytes32(organizerId, "organizer id"),
        xdr.ScVal.scvU32(KINDS[kind]), bytes32(eventId, "event id"), xdr.ScVal.scvString(eventTitle),
        xdr.ScVal.scvU32(eventDateNumber(eventDate)), bytes32(commitment, "commitment"));
      return write(operation, beforeSend).then(({ hash, returnValue }) => ({
        hash, contractId, created: returnValue ? scValToNative(returnValue) === true : false,
      }));
    },
    /** Read every record the registry holds for a wallet (public, no signature). */
    async recordsOf(wallet) {
      const source = await publisher.issuerAddress();
      const address = walletValue(wallet);
      const records = [];
      for (let start = 0; start < 1000; start += PAGE) {
        const value = await publisher.simulate(source, contract.call("records_of", address,
          xdr.ScVal.scvU32(start), xdr.ScVal.scvU32(PAGE)));
        const page = scValToNative(value);
        if (!Array.isArray(page)) throw new Error("Stellar returned an invalid record readback.");
        records.push(...page.map(readRecord));
        if (page.length < PAGE) break;
      }
      return records;
    },
  };
}
