import { BASE_FEE, Contract, Keypair, Networks, StrKey, Transaction, TransactionBuilder, rpc, xdr } from "@stellar/stellar-sdk";
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
    if (endpoint?.href !== TESTNET_RPC || issuerSecret !== undefined || !validIssuerAlias(issuerAlias)) {
      throw new Error("SDF Stellar Testnet requires an explicit CLI issuer alias and no issuer secret.");
    }
  } else if (network !== "standalone" || !endpoint || endpoint.protocol !== "http:" || endpoint.hostname !== "127.0.0.1" ||
      endpoint.username || endpoint.password || endpoint.search || endpoint.hash || issuerAlias !== undefined ||
      !StrKey.isValidEd25519SecretSeed(issuerSecret ?? "")) {
    throw new Error("Provide a loopback Stellar RPC URL and issuer secret for standalone mode.");
  }
  const server = makeServer(endpoint.href, !testnet);
  const localIssuer = testnet ? null : Keypair.fromSecret(issuerSecret);
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

function proofBytes(commitment) {
  if (typeof commitment !== "string" || !digest.test(commitment)) {
    throw new Error("An attendance commitment must be a 32-byte hex digest.");
  }
  return xdr.ScVal.scvBytes(Buffer.from(commitment, "hex"));
}

export function createStellarAdapter({ network = "standalone", url, contractId, issuerSecret, issuerAlias }, dependencies) {
  if (network === "standalone" && ![url, contractId, issuerSecret, issuerAlias].some(Boolean)) return null;
  const publisher = createPublisher({ network, url, issuerSecret, issuerAlias }, dependencies);
  if (!StrKey.isValidContract(contractId ?? "")) throw new Error("Provide a valid Stellar contract ID.");
  const contract = new Contract(contractId);
  let queue = Promise.resolve();
  return {
    contractId,
    network,
    attest(commitment, beforeSend) {
      const operation = contract.call("attest", proofBytes(commitment));
      const work = queue.then(async () => {
        const address = await publisher.issuerAddress();
        const prepared = await publisher.prepare(address, operation);
        const { hash } = await publisher.submit(prepared, address, beforeSend);
        return { hash, contractId };
      });
      queue = work.catch(() => {});
      return work;
    },
    async hasAttestation(commitment) {
      const operation = contract.call("has_attestation", proofBytes(commitment));
      const value = await publisher.simulate(await publisher.issuerAddress(), operation);
      if (value.type !== "scvBool") throw new Error("Stellar returned an invalid commitment readback.");
      return value.value;
    },
  };
}
