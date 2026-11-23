import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";
import { Account, Keypair, Networks, Operation, StrKey, TransactionBuilder, xdr } from "@stellar/stellar-sdk";
import { readConfig } from "./config.js";
import { createStellarAdapter } from "./stellar.js";
import { TESTNET_RPC } from "./stellar-cli.js";

const keypair = Keypair.random();
const config = {
  url: "http://127.0.0.1:8000/rpc",
  contractId: StrKey.encodeContract(Buffer.alloc(32, 12)),
  issuerSecret: keypair.secret(),
};
const commitment = "9a".repeat(32);

async function listenOnLoopback(context, handle) {
  const server = createServer(handle);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  context.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}/rpc`;
}

test("configured RPC must be loopback and report standalone before signing", async () => {
  assert.equal(createStellarAdapter({}), null);
  assert.throws(() => createStellarAdapter({ ...config, url: "https://example.test/rpc" }), /loopback/);
  assert.throws(() => createStellarAdapter({ ...config, issuerSecret: undefined }), /loopback/);
  const adapter = createStellarAdapter(config, { makeServer: () => ({
    getNetwork: async () => ({ passphrase: Networks.TESTNET }),
    getAccount: async () => assert.fail("No account lookup on a public network"),
  }) });
  await assert.rejects(adapter.attest(commitment), /standalone/);
});

test("configured SDK transport refuses redirects without contacting a second endpoint", async (context) => {
  let redirectHits = 0;
  let targetHits = 0;
  const target = await listenOnLoopback(context, (request, response) => {
    targetHits++;
    request.resume();
    response.writeHead(418).end();
  });
  const url = await listenOnLoopback(context, (request, response) => {
    redirectHits++;
    request.resume();
    response.writeHead(307, { Location: target }).end();
  });

  await assert.rejects(createStellarAdapter({ ...config, url }).attest(commitment));
  assert.equal(redirectHits, 1);
  assert.equal(targetHits, 0, "The configured SDK transport followed a redirect.");
});

test("SDK transaction uses the 32-byte ABI and requires matching confirmed hash", async () => {
  let inquiries = 0;
  let currentHash;
  const adapter = createStellarAdapter(config, {
    wait: async () => {},
    makeServer: () => ({
      getNetwork: async () => ({ passphrase: Networks.STANDALONE }),
      getAccount: async (publicKey) => new Account(publicKey, "0"),
      prepareTransaction: async (tx) => {
        const invokeArgs = tx.operations[0].func.value;
        assert.equal(invokeArgs.functionName.toString(), "attest");
        assert.deepEqual(Buffer.from(invokeArgs.args[0].value.value), Buffer.from(commitment, "hex"));
        return tx;
      },
      sendTransaction: async (signed) => {
        assert.equal(signed.signatures.length, 1);
        currentHash = Buffer.from(signed.hash()).toString("hex");
        return { hash: currentHash, status: "PENDING" };
      },
      getTransaction: async (digest) => {
        assert.equal(digest, currentHash);
        inquiries++;
        return { status: inquiries === 1 ? "NOT_FOUND" : "SUCCESS" };
      },
    }),
  });
  assert.throws(() => adapter.attest("invalid"), /32-byte/);
  assert.deepEqual(await adapter.attest(commitment), { hash: currentHash, contractId: config.contractId });
  assert.equal(inquiries, 2);
});

const testnet = { network: "testnet", contractId: config.contractId, issuerAlias: "deployer2" };

test("Testnet rejects alternate destinations, embedded credentials and private issuers before connecting", () => {
  const dependencies = { makeServer: () => assert.fail("No client construction for an invalid Testnet configuration") };
  for (const url of [
    "http://soroban-testnet.stellar.org/", "https://soroban-testnet.stellar.org.example.test/",
    "https://soroban-testnet.stellar.org/another-path", "https://soroban-testnet.stellar.org/?",
    "https://user@soroban-testnet.stellar.org/", "https://soroban-testnet.stellar.org/#",
  ]) {
    assert.throws(() => createStellarAdapter({ ...testnet, url }, dependencies), /SDF Stellar Testnet/);
  }
  assert.throws(() => createStellarAdapter({ ...testnet, issuerSecret: config.issuerSecret }, dependencies), /no issuer secret/);
  assert.throws(() => createStellarAdapter({ ...testnet, issuerAlias: config.issuerSecret }, dependencies), /CLI issuer alias/);
  assert.throws(() => createStellarAdapter({ ...testnet, issuerAlias: "--network" }, dependencies), /CLI issuer alias/);
  assert.throws(() => createStellarAdapter({ ...testnet, network: "mainnet" }, dependencies), /standalone/);
});

test("Testnet uses its own database rather than the known standalone database", () => {
  assert.throws(() => readConfig({
    GENOMAP_STELLAR_NETWORK: "testnet", GENOMAP_DB_PATH: ".pilot-data/genomap.sqlite",
  }), /dedicated/);
  assert.throws(() => readConfig({ GENOMAP_DB_PATH: ".pilot-data/genomap-testnet.sqlite" }), /dedicated/);
  assert.match(readConfig({ GENOMAP_STELLAR_NETWORK: "testnet" }).databasePath, /genomap-testnet\.sqlite$/);
});

function mockTestnet({ passphrases = [], sign, send, simulate } = {}) {
  const address = keypair.publicKey();
  return createStellarAdapter(testnet, {
    resolveAlias: async (alias) => { assert.equal(alias, "deployer2"); return address; },
    signAlias: sign ?? (async (alias, input) => {
      assert.equal(alias, "deployer2");
      const transaction = TransactionBuilder.fromXDR(input, Networks.TESTNET);
      assert.equal(transaction.source, address);
      assert.equal(transaction.signatures.length, 0);
      transaction.sign(keypair);
      return transaction.toXDR();
    }),
    makeServer: (url, allowHttp) => {
      assert.equal(url, TESTNET_RPC);
      assert.equal(allowHttp, false);
      return {
        getNetwork: async () => ({ passphrase: passphrases.shift() ?? Networks.TESTNET }),
        getAccount: async (source) => new Account(source, "0"),
        prepareTransaction: async (transaction) => transaction,
        sendTransaction: send ?? (async () => assert.fail("Do not submit")),
        getTransaction: async () => ({ status: "SUCCESS" }),
        simulateTransaction: simulate,
      };
    },
  });
}

test("Testnet submits the verified envelope, journals its hash and reads the exact commitment", async () => {
  let journalled;
  const adapter = mockTestnet({
    send: async (transaction) => {
      const hash = Buffer.from(transaction.hash()).toString("hex");
      assert.equal(journalled, hash);
      return { status: "PENDING", hash };
    },
    simulate: async (transaction) => {
      const { functionName, args } = transaction.operations[0].func.value;
      assert.equal(functionName.toString(), "has_attestation");
      assert.equal(Buffer.from(args[0].value.value).toString("hex"), commitment);
      return { transactionData: {}, result: { retval: xdr.ScVal.scvBool(true) } };
    },
  });
  assert.deepEqual(await adapter.attest(commitment, async (hash) => { journalled = hash; }),
    { hash: journalled, contractId: config.contractId });
  assert.equal(await adapter.hasAttestation(commitment), true);
});

test("Testnet never submits after a network mismatch, altered envelope or wrong signer", async () => {
  const wrongNetwork = mockTestnet({ passphrases: [Networks.TESTNET, Networks.PUBLIC], sign: () => assert.fail("Do not sign") });
  await assert.rejects(wrongNetwork.attest(commitment), /Stellar Testnet required/);
  const switchedNetwork = mockTestnet({ passphrases: [Networks.TESTNET, Networks.TESTNET, Networks.PUBLIC] });
  await assert.rejects(switchedNetwork.attest(commitment), /Stellar Testnet required/);

  const altered = mockTestnet({ sign: async () => {
    const different = new TransactionBuilder(new Account(keypair.publicKey(), "0"), {
      fee: "100", networkPassphrase: Networks.TESTNET,
    }).addOperation(Operation.bumpSequence({ bumpTo: "2" })).setTimeout(60).build();
    different.sign(keypair);
    return different.toXDR();
  } });
  await assert.rejects(altered.attest(commitment), /altered or unverified/);
  const wrongSigner = mockTestnet({ sign: async (_alias, input) => {
    const transaction = TransactionBuilder.fromXDR(input, Networks.TESTNET);
    transaction.sign(Keypair.random());
    return transaction.toXDR();
  } });
  await assert.rejects(wrongSigner.attest(commitment), /altered or unverified/);
});
