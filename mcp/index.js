import { createServer } from "node:http";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createGenomapMcp } from "./tools.js";

// Genomap MCP server (read-only).
//   stdio (default):  node mcp/index.js
//   HTTP service:     node mcp/index.js --http
// Settings come from the environment:
//   GENOMAP_URL        Genomap app to read from. Default http://127.0.0.1:4173
//   GENOMAP_MCP_HOST   HTTP bind address. Default 127.0.0.1 (use 0.0.0.0 inside a container)
//   GENOMAP_MCP_PORT   HTTP port. Default 4174
const baseUrl = process.env.GENOMAP_URL ?? "http://127.0.0.1:4173";
const http = process.argv.includes("--http");

if (!http) {
  await createGenomapMcp({ baseUrl }).connect(new StdioServerTransport());
  console.error(`Genomap MCP (stdio) reading ${baseUrl}`);
} else {
  const host = process.env.GENOMAP_MCP_HOST ?? "127.0.0.1";
  const port = Number(process.env.GENOMAP_MCP_PORT ?? 4174);
  // Stateless: each request gets its own server and transport. Nothing is stored between calls.
  const service = createServer(async (request, response) => {
    const path = new URL(request.url, "http://localhost").pathname;
    if (path === "/health") return response.writeHead(200, { "content-type": "text/plain" }).end("ok");
    if (path !== "/mcp") return response.writeHead(404).end();
    if (request.method !== "POST") return response.writeHead(405, { allow: "POST" }).end();
    const mcp = createGenomapMcp({ baseUrl });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    response.on("close", () => { transport.close(); mcp.close(); });
    try {
      await mcp.connect(transport);
      await transport.handleRequest(request, response);
    } catch {
      if (!response.headersSent) response.writeHead(500).end();
    }
  });
  service.listen(port, host, () => console.error(`Genomap MCP (http) on http://${host}:${port}/mcp reading ${baseUrl}`));
  for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => service.close());
}
