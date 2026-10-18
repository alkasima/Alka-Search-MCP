# Install and connect Alka Search MCP

The skill and server are separate. This skill needs a desktop/local agent client with MCP stdio support, Git, Node.js 20.18.1 or newer (Node.js 22 or 24 LTS recommended), and internet access. A cloud-only agent without a local MCP runtime cannot run this server directly.

## Build from the author's GitHub release

In a terminal, choose a directory for the checkout and run:

```sh
git clone --branch v1.0.1 --depth 1 https://github.com/alkasima/Alka-Search-MCP.git
cd Alka-Search-MCP
npm ci --ignore-scripts
npm run build
npm test
npm run smoke
```

The offline smoke check starts the server over stdio, discovers all three tools, and verifies that a private URL is blocked. It does not call a search provider.

The GitHub repository is the distribution source for this release. Do not assume that the similarly named npm package exists or belongs to this project.

## Register a local stdio server

In the client's MCP server settings, add a server named `alka-search` with:

- Transport: stdio
- Command: the absolute path to your `node` executable, or `node` if available to the client
- Arguments: one item, the absolute path to `Alka-Search-MCP/dist/index.js`

Clients that use an `mcpServers` JSON object can use this shape, replacing the path:

```json
{
  "mcpServers": {
    "alka-search": {
      "command": "node",
      "args": ["/absolute/path/Alka-Search-MCP/dist/index.js"]
    }
  }
}
```

On Windows, use a JSON-safe path such as `C:/Users/your-name/Alka-Search-MCP/dist/index.js`. Merge the server entry into the existing configuration rather than replacing other entries. Configuration location and wrapper keys vary by client; follow that client's current MCP settings instructions. Restart or reconnect the server and verify that `web_search`, `fetch_page`, and `fetch_llms_txt` appear before claiming setup succeeded.

## Optional configuration

The default search uses DuckDuckGo, Mojeek, and Brave without an API key. The server sends queries to these services. Their availability and rate limits vary.

Only when requested, configure `TAVILY_API_KEY` for a Tavily fallback or `SEARX_URL` for the user's chosen SearXNG instance. Tavily may incur charges under the user's account. Put credentials in the client's server environment settings; never put them in skill files or the repository. `.env` files are not automatically loaded.

`REQUEST_TIMEOUT_MS` sets the request deadline. The defaults are 8 seconds per search provider and 15 seconds per page or llms.txt file. Page/text downloads are limited to 5 MiB and five redirects. Private, loopback, link-local, and reserved addresses are blocked, including DNS answers and redirect destinations. Keep `ALLOW_PRIVATE_URLS` unset for public-web research.

For a live diagnostic, run `npm run smoke -- --live`. This sends a public test query to search providers and fetches `example.com` and `modelcontextprotocol.io`. A reported block or missing llms.txt is an upstream limitation, not proof of successful retrieval.
