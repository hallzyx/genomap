import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Read-only MCP tools over Genomap's public API. They can only look up profiles whose owners
// turned on the public profile, and never write anything.
const QUERY = /^@?[A-Za-z0-9_]{3,56}$/;
const KINDS = ["attendance", "winner", "staff", "speaker"];

const query = z.string().trim().regex(QUERY, "Use a username (3-24 letters, numbers or underscores) or a Stellar wallet address starting with G.")
  .describe("A Genomap username (with or without @) or a Stellar wallet address that starts with G.");

function publicMark(mark) {
  const { kind, title, eventDate, organizer, status, hash, commitment } = mark;
  return { kind, title, eventDate, organizer, status, transactionHash: hash ?? null, commitment };
}

/** Counts that an agent can read at a glance. */
export function summarize(marks) {
  const byKind = Object.fromEntries(KINDS.map((kind) => [kind, marks.filter((mark) => mark.kind === kind).length]));
  const onChain = marks.filter((mark) => mark.status === "confirmed").length;
  return { total: marks.length, onChain, signedOnly: marks.length - onChain, byKind };
}

export function verdictFor(report) {
  const checkable = report.results.filter((row) => row.status !== "local_only");
  const mismatched = checkable.filter((row) => row.status !== "match").length;
  if (!checkable.length) return "nothing_anchored";
  return mismatched === 0 && report.onChainOnly === 0 ? "match" : "mismatch";
}

const text = (value) => ({ content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }] });
const failure = (message) => ({ isError: true, ...text(message) });

/**
 * @param {{ baseUrl: string, fetchImpl?: typeof fetch }} options
 */
export function createGenomapMcp({ baseUrl, fetchImpl = fetch }) {
  const origin = new URL(baseUrl).origin;

  async function get(path) {
    let response;
    try {
      response = await fetchImpl(`${origin}${path}`, { redirect: "error", signal: AbortSignal.timeout(15_000), headers: { accept: "application/json" } });
    } catch (cause) {
      // The reason stays in the server log; the agent only learns that Genomap was unreachable.
      console.error(`Genomap MCP: could not reach ${origin}: ${cause?.cause?.message ?? cause?.message}`);
      return { error: "unreachable" };
    }
    const body = await response.json().catch(() => null);
    if (response.ok) return { body };
    return { error: body?.error?.code ?? "unknown", status: response.status };
  }

  const server = new McpServer(
    { name: "genomap", version: "0.1.0" },
    { instructions: "Genomap keeps a verifiable trail of events a builder attended, won, spoke at or helped run on Stellar. Use validate_builder to read a public trail, then verify_builder to compare it with what the Stellar network holds. Both tools are read-only." },
  );

  server.registerTool("validate_builder", {
    title: "Validate a builder's trail",
    description: "Look up a builder by Genomap username or Stellar wallet address and return their name, anchor wallet and the marks (events they attended, won, spoke at or helped run). A mark with status 'confirmed' is written on Stellar; 'unanchored' is signed by an approved organizer and stored in Genomap only. Only public profiles can be found.",
    inputSchema: { query },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, async ({ query: raw }) => {
    const q = raw.replace(/^@/, "");
    const { body, error } = await get(`/api/validate/${encodeURIComponent(q)}`);
    if (error === "profile_missing") return { ...text(`No public trail found for "${q}". The person may not exist or may have kept their profile private.`), structuredContent: { found: false, query: q } };
    if (error) return failure(error === "unreachable" ? "Genomap could not be reached." : `Genomap returned an error (${error}).`);
    const marks = body.credentials.map(publicMark);
    const structured = {
      found: true, name: body.name, username: body.username, wallet: body.wallet, network: body.network,
      summary: summarize(marks), marks,
    };
    return { ...text(structured), structuredContent: structured };
  });

  server.registerTool("verify_builder", {
    title: "Verify a builder's trail against Stellar",
    description: "Compare a builder's marks in Genomap with what the Stellar contract holds for their wallet. Returns a verdict: 'match' (everything anchored is on the network), 'mismatch' (something Genomap shows is missing on Stellar, or the reverse; trust Stellar), or 'nothing_anchored' (no mark is on Stellar yet). Makes a live network call, so use it only when you need on-chain proof.",
    inputSchema: { query },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, async ({ query: raw }) => {
    const q = raw.replace(/^@/, "");
    const { body, error } = await get(`/api/validate/${encodeURIComponent(q)}/verify`);
    if (error === "profile_missing") return { ...text(`No public trail found for "${q}".`), structuredContent: { found: false, query: q } };
    if (error === "wallet_missing") return { ...text(`"${q}" has not linked a wallet, so there is nothing to verify on Stellar.`), structuredContent: { found: true, query: q, verdict: "no_wallet" } };
    if (error === "chain_unavailable") return failure("Stellar could not be reached or is not configured on this Genomap server. Try again later.");
    if (error) return failure(error === "unreachable" ? "Genomap could not be reached." : `Genomap returned an error (${error}).`);
    const counts = { match: 0, missingOnChain: 0, localOnly: 0 };
    for (const row of body.results) {
      if (row.status === "match") counts.match++;
      else if (row.status === "missing_on_chain") counts.missingOnChain++;
      else counts.localOnly++;
    }
    const structured = {
      found: true, verdict: verdictFor(body), wallet: body.wallet, network: body.network, contractId: body.contractId,
      checkedAt: body.checkedAt, counts, onChainOnly: body.onChainOnly,
    };
    return { ...text(structured), structuredContent: structured };
  });

  return server;
}
