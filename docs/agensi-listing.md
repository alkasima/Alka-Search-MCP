# Agensi listing

**Title:** Alka Search - Free Web Search & Page Reading

**Price:** Free ($0)

**Short description:** Search the web, read pages, and retrieve llms.txt documentation with a source-citing workflow powered by Alka Search MCP. Requires a separately connected local MCP server.

**Category:** Research (or the closest available research/productivity category)

**Tags:** web-search, research, mcp, documentation, open-source

**Source:** https://github.com/alkasima/Alka-Search-MCP

## Description

Alka Search helps an AI agent find public sources, read the relevant pages, and answer with supporting links. Use it to check documentation, summarize an article, or research a factual question.

The companion skill guides the agent through three tools supplied by the open-source Alka Search MCP server:

- **Web search:** Query DuckDuckGo, Mojeek, and Brave in parallel, then merge and deduplicate the results.
- **Page reading:** Extract HTML articles as Markdown, or read plain-text pages, with adjustable output length.
- **Documentation retrieval:** Try a site's llms-full.txt and llms.txt files for documentation in text form.

The workflow explains when to search or fetch directly, how to cite evidence, how to handle blocked requests, and how to treat fetched material as untrusted data.

### Requirements

This listing is a companion skill. Install and connect the Alka Search MCP server separately using the included setup guide. You need Node.js 20.18.1 or newer with npm/npx, internet access, and a local agent client that supports MCP stdio servers. Run npx --yes @alkasima/alka-search-mcp@1.0.2 through your MCP client; no Git checkout or build is required for the npm package. Git remains optional for source-based installation. Loading the skill through Agensi alone does not install the server.

The server and companion skill are free and MIT licensed. The default providers require no API key. Optional Tavily and SearXNG fallbacks require your own configuration; Tavily may carry separate costs.

### Limits

Search providers may rate-limit or block automated requests. The server does not execute page JavaScript, sign into websites, bypass access controls, or parse PDFs. Search results are cached for ten minutes. Retrieved output is capped, with truncation reported. Availability depends on the upstream websites and providers.

### Try asking

- Find the official documentation for this library and summarize its installation steps with sources.
- Read this article and explain its main claims.
- Check this documentation domain for llms.txt and find its authentication guidance.

### Compatibility

Uses portable SKILL.md instructions and standard MCP stdio tools. Server initialization and tool calls are checked with the official MCP SDK client on Windows. Individual agent applications have different setup requirements; only mark application-specific compatibility as verified after testing that application.

## Submission file

`release/alka-search-1.0.2.zip` contains the `alka-search/` folder with SKILL.md, the setup reference, and the MIT license. It contains no credentials, dependencies, executables, or automatic installation hooks.
