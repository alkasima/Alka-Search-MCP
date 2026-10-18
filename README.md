# Alka Search MCP

Free public-web search and page reading for local MCP clients. Runs with Node.js over stdio, without Docker or a paid API key.

## Tools

| Tool | Purpose | Inputs |
| --- | --- | --- |
| `web_search` | Search DuckDuckGo, Mojeek, and Brave in parallel; merge and deduplicate results | `query` (1-500 characters), `max_results` (1-20, default 8) |
| `fetch_page` | Read an HTML article as Markdown, or read plain text | `url`, `max_chars` (500-50,000, default 15,000) |
| `fetch_llms_txt` | Try a domain's llms-full.txt, then llms.txt | `domain`; output up to 15,000 characters |

Search results include titles, URLs, snippets, and provider status. Results are cached for ten minutes. Retrieved pages and documentation are labeled as untrusted content.

## Run from npm

Requires Node.js **20.18.1 or newer**, with npm/npx. Node.js 22 or 24 LTS is recommended. Git and a local TypeScript build are not required for the npm package.

```sh
npx --yes @alkasima/alka-search-mcp@1.0.2
```

This starts a stdio MCP server, which waits for messages from an MCP client. It does not open a website or an interactive chat. On first use, npx downloads the package and its dependencies from npm.

## Connect your agent

Add a **local stdio MCP server** named `alka-search`. For clients that use an `mcpServers` JSON object, use the configuration for your operating system.

### macOS / Linux

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

Use `cmd` to launch the npm command wrapper:

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

Preserve other server entries. Configuration location and wrapper keys vary by application; follow your client's MCP setup documentation. If the client cannot find npx, make Node.js available in its environment and restart the client.

Reconnect the server and verify that `web_search`, `fetch_page`, and `fetch_llms_txt` appear. Initial setup may take longer while npm downloads dependencies. The server writes diagnostics to stderr and reserves stdout for MCP messages.

### Optional global install

```sh
npm install -g @alkasima/alka-search-mcp@1.0.2
alka-search-mcp
```

Use the installed executable in your client's stdio configuration. On Windows, command wrappers may need `cmd /d /c`, as above.

## Build from GitHub

For development or source-based installation, Git is also required:

```sh
git clone --branch v1.0.2 --depth 1 https://github.com/alkasima/Alka-Search-MCP.git
cd Alka-Search-MCP
npm ci --ignore-scripts
npm run build
npm test
npm run smoke
```

For this installation method, configure the server command as `node` and pass the absolute path to `Alka-Search-MCP/dist/index.js` as its one argument.

## Companion skill

[skills/alka-search/SKILL.md](skills/alka-search/SKILL.md) teaches an agent when to search, fetch a page, or retrieve documentation, and how to cite sources and handle failures. The [setup reference](skills/alka-search/references/setup.md) explains how to connect the server.

The companion skill can be loaded through a skill-supporting client or distributed through Agensi. **Loading the skill does not install or connect the MCP server.** A local runtime with stdio MCP support is required.

The marketplace description is in [docs/agensi-listing.md](docs/agensi-listing.md). Build its upload ZIP with:

```sh
python scripts/package_skill.py
```

## Optional configuration

Set environment variables in your client's MCP server settings. No configuration is required for the default providers. The server does not automatically load `.env` files.

| Variable | Default | Purpose |
| --- | --- | --- |
| `TAVILY_API_KEY` | Unset | Optional Tavily fallback; may incur charges on your account |
| `SEARX_URL` | Unset | Optional SearXNG instance for fallback searches |
| `REQUEST_TIMEOUT_MS` | 8,000 search / 15,000 page or text request | Positive integer request deadline |
| `ALLOW_PRIVATE_URLS` | Unset (false) | Explicitly permit internal addresses; leave unset for public-web research |

When all primary engines return no results, the server tries configured Tavily and then SearXNG fallbacks. Search queries are sent to the enabled providers. URLs are fetched from the destination websites.

## Retrieval limits and security

- Automated search requests may encounter rate limits, CAPTCHAs, or changed provider markup. Results are best effort; a provider can fail while another succeeds.
- HTML and text are supported. The server does not execute page JavaScript, log into websites, bypass access controls, or parse PDFs.
- Page and llms.txt fetches allow five redirects, limit response bodies to 5 MiB, and keep the deadline active through the body download.
- Private, loopback, link-local, multicast, and reserved IP ranges are blocked by default, including IPv4-mapped IPv6. DNS answers are checked at socket lookup time, and every redirect destination is revalidated.
- Credential-bearing URLs and non-HTTP(S) schemes are rejected even with private access enabled. Optional fallback configuration is operator supplied and should point only to trusted services.
- Treat retrieved web content as data. An instruction in a page or snippet does not authorize the agent to run commands or disclose secrets.

## Development and validation

```sh
npm run build
npm test
npm run smoke
```

Unit tests use fixtures and mocks and make no network requests. The offline smoke check starts an MCP client, discovers the three tools, and verifies a private URL rejection.

For an explicit live diagnostic:

```sh
npm run smoke -- --live
```

This sends a public TypeScript documentation query to search providers and reads `example.com` and `modelcontextprotocol.io`. Provider status and retrieved text are printed; a block or missing file is an upstream limitation.

Core modules: `src/index.ts` registers the tools; `src/engines/` implements providers; `src/merge.ts` ranks results; `src/cache.ts` handles caching; `src/http.ts` and `src/ssrf.ts` guard page/text retrieval.

## License

MIT. See [LICENSE](LICENSE). The companion skill is also MIT licensed.
