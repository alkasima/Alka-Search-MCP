import type { EngineSearchResponse } from "./types.js";

const TAVILY_API = "https://api.tavily.com/search";

/**
 * Search via Tavily API (paid, but higher quality).
 * Only used as a fallback when all free engines fail.
 * Requires TAVILY_API_KEY environment variable.
 */
export async function search(query: string, signal: AbortSignal): Promise<EngineSearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return { results: [], blocked: false };
  }

  const response = await fetch(TAVILY_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      max_results: 10,
      search_depth: "basic",
    }),
    signal,
  });

  if (!response.ok) {
    return { results: [], blocked: false };
  }

  const data = (await response.json()) as {
    results?: Array<{ title: string; url: string; content: string }>;
  };

  const results = (data.results || []).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.content || "",
  }));

  return { results, blocked: false };
}