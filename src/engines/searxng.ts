import type { EngineSearchResponse } from "./types.js";

/**
 * Search via a SearXNG instance.
 * Only used as a fallback when all free engines fail.
 * Requires SEARX_URL environment variable (e.g. https://searx.example.com).
 */
export async function search(query: string, signal: AbortSignal): Promise<EngineSearchResponse> {
  const baseUrl = process.env.SEARX_URL;
  if (!baseUrl) {
    return { results: [], blocked: false };
  }

  // Normalize base URL
  const normalized = baseUrl.replace(/\/+$/, "");
  const url = `${normalized}/search?q=${encodeURIComponent(query)}&format=json`;

  // First check if the instance is reachable
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      signal,
    });

    if (!response.ok) {
      return { results: [], blocked: false };
    }

    const data = (await response.json()) as {
      results?: Array<{ title: string; url: string; content: string; snippet?: string }>;
    };

    const results = (data.results || []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content || r.snippet || "",
    }));

    return { results, blocked: false };
  } catch {
    return { results: [], blocked: false };
  }
}