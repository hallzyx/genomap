import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createGenomapMcp, summarize, verdictFor } from "./tools.js";

const mark = (kind, status, extra = {}) => ({
  kind, title: "Stellar Hack Lima", eventDate: "2026-10-12", organizer: "Stellar LATAM", status,
  hash: status === "confirmed" ? "ab".repeat(32) : null, commitment: "cd".repeat(32),
  nonce: "must-not-leak", learnerName: "must-not-leak", proof: ["must-not-leak"], ...extra,
});

async function connect(routes) {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    const { pathname } = new URL(url);
    const route = routes[pathname];
    if (!route) return new Response(JSON.stringify({ error: { code: "missing" } }), { status: 404 });
    if (route instanceof Error) throw route;
    return new Response(JSON.stringify(route.body), { status: route.status ?? 200 });
  };
  const server = createGenomapMcp({ baseUrl: "http://genomap.test/ignored/path", fetchImpl });
  const client = new Client({ name: "test-agent", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  return { client, calls };
}

test("exposes two read-only tools", async () => {
  const { client } = await connect({});
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((tool) => tool.name).sort(), ["validate_builder", "verify_builder"]);
  for (const tool of tools) assert.equal(tool.annotations.readOnlyHint, true);
});

test("validate_builder returns the public trail and nothing private", async () => {
  const { client, calls } = await connect({
    "/api/validate/valeria": { body: { name: "Valeria Soto", username: "valeria", wallet: "G".padEnd(56, "A"), network: "testnet", credentials: [mark("winner", "confirmed"), mark("staff", "unanchored")] } },
  });
  const result = await client.callTool({ name: "validate_builder", arguments: { query: "@valeria" } });
  assert.equal(result.isError, undefined);
  assert.equal(calls[0], "http://genomap.test/api/validate/valeria");
  const data = result.structuredContent;
  assert.equal(data.found, true);
  assert.deepEqual(data.summary, { total: 2, onChain: 1, signedOnly: 1, byKind: { attendance: 0, winner: 1, staff: 1, speaker: 0 } });
  assert.equal(data.marks[0].transactionHash, "ab".repeat(32));
  assert.ok(!JSON.stringify(result).includes("must-not-leak"), "private fields must not reach the agent");
});

test("unknown or private profiles are an answer, not an error", async () => {
  const { client } = await connect({ "/api/validate/nobody": { status: 404, body: { error: { code: "profile_missing" } } } });
  const result = await client.callTool({ name: "validate_builder", arguments: { query: "nobody" } });
  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent.found, false);
});

test("input is validated before any request is made", async () => {
  const { client, calls } = await connect({});
  const result = await client.callTool({ name: "validate_builder", arguments: { query: "../../etc/passwd" } });
  assert.equal(result.isError, true);
  assert.equal(calls.length, 0);
});

test("verify_builder gives a clear verdict", async () => {
  const report = (results, onChainOnly = 0) => ({ body: { wallet: "G".padEnd(56, "A"), network: "testnet", contractId: "C".padEnd(56, "A"), checkedAt: "2026-11-24T12:00:00Z", results, onChainOnly, records: [] } });
  const run = async (route) => {
    const { client } = await connect({ "/api/validate/valeria/verify": route });
    return (await client.callTool({ name: "verify_builder", arguments: { query: "valeria" } })).structuredContent;
  };
  assert.equal((await run(report([{ id: "1", status: "match" }, { id: "2", status: "local_only" }]))).verdict, "match");
  assert.equal((await run(report([{ id: "1", status: "missing_on_chain" }]))).verdict, "mismatch");
  assert.equal((await run(report([{ id: "1", status: "match" }], 1))).verdict, "mismatch");
  assert.equal((await run(report([{ id: "1", status: "local_only" }]))).verdict, "nothing_anchored");
  assert.equal((await run({ status: 409, body: { error: { code: "wallet_missing" } } })).verdict, "no_wallet");
});

test("failures are reported as errors without leaking details", async () => {
  const { client } = await connect({ "/api/validate/valeria/verify": { status: 503, body: { error: { code: "chain_unavailable" } } }, "/api/validate/valeria": new Error("ECONNREFUSED 10.0.0.5") });
  const verify = await client.callTool({ name: "verify_builder", arguments: { query: "valeria" } });
  assert.equal(verify.isError, true);
  const validate = await client.callTool({ name: "validate_builder", arguments: { query: "valeria" } });
  assert.equal(validate.isError, true);
  assert.ok(!JSON.stringify(validate).includes("10.0.0.5"));
});

test("helpers", () => {
  assert.equal(summarize([]).total, 0);
  assert.equal(verdictFor({ results: [], onChainOnly: 0 }), "nothing_anchored");
});
