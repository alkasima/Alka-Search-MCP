import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { parseArgs } from "node:util";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const { values } = parseArgs({ options: { server: { type: "string" }, npx: { type: "boolean" }, live: { type: "boolean" } } });
if (values.server && values.npx) throw new Error("Choose --server or --npx, not both.");
const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
assert.match(version, /^\d+\.\d+\.\d+$/);
const packageSpec = "@alkasima/alka-search-mcp@" + version;
const command = values.npx ? (process.platform === "win32" ? "cmd.exe" : "npx") : process.execPath;
const args = values.npx
  ? [...(process.platform === "win32" ? ["/d", "/c", "npx"] : []), "--yes", packageSpec]
  : [values.server || fileURLToPath(new URL("../dist/index.js", import.meta.url))];
const client = new Client({ name: "alka-search-smoke", version });
const transport = new StdioClientTransport({
  command,
  args,
  // Run npx outside this checkout so npm resolves the published package.
  cwd: values.npx ? tmpdir() : undefined,
  stderr: "pipe",
});
try {
  await client.connect(transport, { timeout: 120000 });
  assert.equal(client.getServerVersion()?.version, version);
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(({ name }) => name).sort(), ["fetch_llms_txt", "fetch_page", "web_search"]);
  const blocked = await client.callTool({ name: "fetch_page", arguments: { url: "http://[::ffff:127.0.0.1]/" } });
  assert.match(blocked.content[0].text, /private/);
  console.log("PASS: MCP initialization, tool discovery, and blocked private URL.");
  if (values.live) {
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
