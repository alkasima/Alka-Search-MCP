# Install and connect Alka Search MCP

The skill and server are separate. This skill needs a local agent client with MCP stdio support, Node.js 20.18.1 or newer (Node.js 22 or 24 LTS recommended), npm/npx, and internet access. A cloud-only agent without a local MCP runtime cannot run this server directly.

## Connect using npm

The package is `@alkasima/alka-search-mcp`, maintained by `alkasima`, with source at https://github.com/alkasima/Alka-Search-MCP. Use the pinned release `@alkasima/alka-search-mcp@1.0.2`.

When setup is requested, add a local stdio server named `alka-search` in the client's MCP settings. Loading the skill through Agensi alone does not install the server or change client configuration.

### macOS / Linux

For clients using an `mcpServers` JSON object:

```json
{
  "mcpServers": {
    "alka-search": {
      "command": "npx",
      "args": ["--yes", "@alkasima/alka-search-mcp@1.0.2"]
    }
  }
}
```

### Windows

Launch the npm command wrapper through `cmd`:

```json
{
  "mcpServers": {
    "alka-search": {
      "command": "cmd",
      "args": ["/d", "/c", "npx", "--yes", "@alkasima/alka-search-mcp@1.0.2"]
    }
  }
}
```

These commands download and run the pinned package from npm on first use. No Git checkout or TypeScript build is needed. Installation changes local files and requires network access to npm. Preserve existing MCP entries; configuration location and wrapper keys vary by client.

Restart or reconnect the server and verify that `web_search`, `fetch_page`, and `fetch_llms_txt` appear before claiming setup succeeded. If npx cannot be found, make Node.js available in the client's environment and restart it. Allow time for the initial package download.

Running `npx --yes @alkasima/alka-search-mcp@1.0.2` directly in a terminal starts the server and waits for MCP messages; it is not a web interface or a chat prompt. The intended caller is the agent's MCP client.

## Alternative: build from GitHub

Use this if the user prefers to inspect or build the source. Git is required for this path.

```sh
git clone --branch v1.0.2 --depth 1 https://github.com/alkasima/Alka-Search-MCP.git
cd Alka-Search-MCP
npm ci --ignore-scripts
npm run build
npm test
npm run smoke
```

Then configure a local stdio server with command `node` (or its absolute executable path) and one argument: the absolute path to `Alka-Search-MCP/dist/index.js`. On Windows, JSON paths can use forward slashes, such as `C:/Users/your-name/Alka-Search-MCP/dist/index.js`.

The source checkout's offline smoke check starts the server over stdio, discovers all three tools, and verifies that a private URL is blocked. It does not call a search provider.

## Optional configuration

The default search uses DuckDuckGo, Mojeek, and Brave without an API key. The server sends queries to these services. Their availability and rate limits vary.

Only when requested, configure `TAVILY_API_KEY` for a Tavily fallback or `SEARX_URL` for the user's chosen SearXNG instance. Tavily may incur charges under the user's account. Put credentials in the client's server environment settings; never put them in skill files or the repository. `.env` files are not automatically loaded.

`REQUEST_TIMEOUT_MS` sets the request deadline. The defaults are 8 seconds per search provider and 15 seconds per page or llms.txt file. Page/text downloads are limited to 5 MiB and five redirects. Private, loopback, link-local, and reserved addresses are blocked, including DNS answers and redirect destinations. Keep `ALLOW_PRIVATE_URLS` unset for public-web research.

For a live diagnostic, run `npm run smoke -- --live`. This sends a public test query to search providers and fetches `example.com` and `modelcontextprotocol.io`. A reported block or missing llms.txt is an upstream limitation, not proof of successful retrieval.
