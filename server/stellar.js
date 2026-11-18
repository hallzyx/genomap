import { BASE_FEE, Contract, Keypair, Networks, StrKey, TransactionBuilder, rpc, xdr } from "@stellar/stellar-sdk";

const digest = /^[a-f0-9]{64}$/;
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function connectLoopbackRpc(endpoint) {
  const server = new rpc.Server(endpoint, { allowHttp: true, timeout: 3000 });
  server.httpClient.defaults.maxRedirects = 0;
  return server;
}

export function createStellarAdapter({ url, contractId, issuerSecret }, {
  makeServer = connectLoopbackRpc,
  wait = pause,
} = {}) {
  if (![url, contractId, issuerSecret].some(Boolean)) return null;
  const endpoint = URL.parse(url ?? "");
  if (!endpoint || endpoint.protocol !== "http:" || endpoint.hostname !== "127.0.0.1" ||
      endpoint.username || endpoint.password || endpoint.search || endpoint.hash ||
      !StrKey.isValidContract(contractId ?? "") || !StrKey.isValidEd25519SecretSeed(issuerSecret ?? "")) {
    throw new Error("Provide a loopback Stellar RPC URL, contract ID and issuer secret together.");
  }
  const server = makeServer(endpoint.href);
  const issuer = Keypair.fromSecret(issuerSecret);
  const contract = new Contract(contractId);
  let queue = Promise.resolve();

  return {
    contractId,
    attest(commitment) {
      if (typeof commitment !== "string" || !digest.test(commitment)) {
        throw new Error("An attendance commitment must be a 32-byte hex digest.");
      }
      const work = queue.then(async () => {
        const network = await server.getNetwork();
        if (network.passphrase !== Networks.STANDALONE) throw new Error("Local standalone Stellar network required.");
        const source = await server.getAccount(issuer.publicKey());
        const transaction = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: Networks.STANDALONE })
          .addOperation(contract.call("attest", xdr.ScVal.scvBytes(Buffer.from(commitment, "hex"))))
          .setTimeout(25)
          .build();
        const prepared = await server.prepareTransaction(transaction);
        prepared.sign(issuer);
        const submitted = await server.sendTransaction(prepared);
        if (!["PENDING", "DUPLICATE"].includes(submitted.status) || !digest.test(submitted.hash ?? "")) {
          throw new Error("The Stellar RPC did not accept the transaction.");
        }
        // Query the corresponding transaction, not simply the current state of the commitment.
        if (submitted.hash !== Buffer.from(prepared.hash()).toString("hex")) throw new Error("Unexpected Stellar transaction hash.");
        for (let attempt = 0; attempt < 6; attempt++) {
          if (attempt) await wait(750);
          const result = await server.getTransaction(submitted.hash);
          if (result.status === "SUCCESS") return { hash: submitted.hash, contractId };
          if (result.status !== "NOT_FOUND") throw new Error("The Stellar transaction did not succeed.");
        }
        throw new Error("The Stellar transaction has not been confirmed.");
      });
      queue = work.catch(() => {});
      return work;
    },
  };
}
