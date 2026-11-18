import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";
import { Account, Keypair, Networks, StrKey } from "@stellar/stellar-sdk";
import { createStellarAdapter } from "./stellar.js";

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
