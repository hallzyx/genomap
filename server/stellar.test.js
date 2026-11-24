import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";
import { Account, Keypair, Networks, Operation, StrKey, TransactionBuilder, nativeToScVal, xdr } from "@stellar/stellar-sdk";
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
const sample = {
  wallet: Keypair.random().publicKey(), organizerId: "0a".repeat(32), kind: "attendance",
  eventId: "0b".repeat(32), eventTitle: "Sample workshop", eventDate: "2026-11-18", commitment,
};
const entry = (key, val) => new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol(key), val });
const storedRecord = () => xdr.ScVal.scvVec([xdr.ScVal.scvMap([
  entry("anchored_at", nativeToScVal(1_700_000_000n, { type: "u64" })),
  entry("commitment", xdr.ScVal.scvBytes(Buffer.from(commitment, "hex"))),
  entry("event", xdr.ScVal.scvString("Sample workshop")),
  entry("event_date", xdr.ScVal.scvU32(20261118)),
  entry("event_id", xdr.ScVal.scvBytes(Buffer.alloc(32, 11))),
  entry("kind", xdr.ScVal.scvU32(1)),
  entry("organizer_id", xdr.ScVal.scvBytes(Buffer.alloc(32, 10))),
])]);

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
  await assert.rejects(adapter.issue(sample), /standalone/);
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

  await assert.rejects(createStellarAdapter({ ...config, url }).issue(sample));
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
        assert.equal(invokeArgs.functionName.toString(), "issue");
        assert.equal(invokeArgs.args.length, 7);
        assert.equal(invokeArgs.args[2].value, 0);
        assert.equal(invokeArgs.args[5].value, 20261118);
        assert.deepEqual(Buffer.from(invokeArgs.args[6].value.value), Buffer.from(commitment, "hex"));
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
  assert.throws(() => adapter.issue({ ...sample, commitment: "invalid" }), /32-byte/);
  assert.throws(() => adapter.issue({ ...sample, kind: "mystery" }), /Unknown record kind/);
  assert.throws(() => adapter.issue({ ...sample, wallet: "not a wallet" }), /public Stellar account/);
  assert.deepEqual(await adapter.issue(sample), { hash: currentHash, contractId: config.contractId, created: false });
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
  const { issuerAlias: _alias, ...noSigner } = testnet;
  assert.throws(() => createStellarAdapter({ ...testnet, issuerSecret: config.issuerSecret }, dependencies), /exactly one signer/);
  assert.throws(() => createStellarAdapter(noSigner, dependencies), /exactly one signer/);
  assert.throws(() => createStellarAdapter({ ...noSigner, issuerSecret: "not a seed" }, dependencies), /exactly one signer/);
  assert.throws(() => createStellarAdapter({ ...testnet, issuerAlias: config.issuerSecret }, dependencies), /exactly one signer/);
  assert.throws(() => createStellarAdapter({ ...testnet, issuerAlias: "--network" }, dependencies), /exactly one signer/);
  assert.throws(() => createStellarAdapter({ ...testnet, network: "mainnet" }, dependencies), /standalone/);
});

test("Testnet can sign with an issuer secret when the CLI is not installed", async () => {
  let sent;
  const adapter = createStellarAdapter({ network: "testnet", contractId: config.contractId, issuerSecret: keypair.secret() }, {
    resolveAlias: async () => assert.fail("No CLI lookup when a secret is configured"),
    signAlias: async () => assert.fail("No CLI signing when a secret is configured"),
    wait: async () => {},
    makeServer: (url, allowHttp) => {
      assert.equal(url, TESTNET_RPC);
      assert.equal(allowHttp, false);
      return {
        getNetwork: async () => ({ passphrase: Networks.TESTNET }),
        getAccount: async (source) => { assert.equal(source, keypair.publicKey()); return new Account(source, "0"); },
        prepareTransaction: async (transaction) => transaction,
        sendTransaction: async (signed) => {
          assert.equal(signed.signatures.length, 1);
          assert.ok(keypair.verify(signed.hash(), signed.signatures[0].signature));
          sent = Buffer.from(signed.hash()).toString("hex");
          return { status: "PENDING", hash: sent };
        },
        getTransaction: async () => ({ status: "SUCCESS" }),
      };
    },
  });
  const result = await adapter.issue(sample);
  assert.equal(result.hash, sent);
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
      assert.equal(functionName.toString(), "records_of");
      assert.equal(args[1].value, 0);
      return { transactionData: {}, result: { retval: storedRecord() } };
    },
  });
  assert.deepEqual(await adapter.issue(sample, async (hash) => { journalled = hash; }),
    { hash: journalled, contractId: config.contractId, created: false });
  assert.deepEqual(await adapter.recordsOf(sample.wallet), [{
    kind: "winner", eventId: "0b".repeat(32), event: "Sample workshop", eventDate: "2026-11-18",
    organizerId: "0a".repeat(32), commitment, anchoredAt: 1_700_000_000,
  }]);
});

test("Testnet never submits after a network mismatch, altered envelope or wrong signer", async () => {
  const wrongNetwork = mockTestnet({ passphrases: [Networks.TESTNET, Networks.PUBLIC], sign: () => assert.fail("Do not sign") });
  await assert.rejects(wrongNetwork.issue(sample), /Stellar Testnet required/);
  const switchedNetwork = mockTestnet({ passphrases: [Networks.TESTNET, Networks.TESTNET, Networks.PUBLIC] });
  await assert.rejects(switchedNetwork.issue(sample), /Stellar Testnet required/);

  const altered = mockTestnet({ sign: async () => {
    const different = new TransactionBuilder(new Account(keypair.publicKey(), "0"), {
      fee: "100", networkPassphrase: Networks.TESTNET,
    }).addOperation(Operation.bumpSequence({ bumpTo: "2" })).setTimeout(60).build();
    different.sign(keypair);
    return different.toXDR();
  } });
  await assert.rejects(altered.issue(sample), /altered or unverified/);
  const wrongSigner = mockTestnet({ sign: async (_alias, input) => {
    const transaction = TransactionBuilder.fromXDR(input, Networks.TESTNET);
    transaction.sign(Keypair.random());
    return transaction.toXDR();
  } });
  await assert.rejects(wrongSigner.issue(sample), /altered or unverified/);
});
