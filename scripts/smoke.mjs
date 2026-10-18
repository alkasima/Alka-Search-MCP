import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client({ name: "alka-search-smoke", version: "1.0.0" });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [fileURLToPath(new URL("../dist/index.js", import.meta.url))],
  stderr: "pipe",
});
try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(({ name }) => name).sort(), ["fetch_llms_txt", "fetch_page", "web_search"]);
  const blocked = await client.callTool({ name: "fetch_page", arguments: { url: "http://[::ffff:127.0.0.1]/" } });
  assert.match(blocked.content[0].text, /private/);
  console.log("PASS: MCP initialization, tool discovery, and blocked private URL.");
  if (process.argv.includes("--live")) {
    for (const [name, args] of [
      ["web_search", { query: "TypeScript official documentation", max_results: 3 }],
      ["fetch_page", { url: "https://example.com", max_chars: 500 }],
      ["fetch_llms_txt", { domain: "modelcontextprotocol.io" }],
    ]) {
      const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 60000 });
      console.log(JSON.stringify({ tool: name, output: result.content[0].text.substring(0, 1200) }, null, 2));
    }
  }
} finally { await client.close(); }
