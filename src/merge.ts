import type { SearchResult } from "./engines/types.js";

/**
 * Normalize a URL for deduplication:
 * - Lowercase hostname
 * - Remove "www." prefix
 * - Remove trailing slash
 * - Strip common tracking parameters (utm_*, fbclid, gclid, etc.)
 */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // Lowercase hostname
    u.hostname = u.hostname.toLowerCase();
    // Remove www.
    if (u.hostname.startsWith("www.")) {
      u.hostname = u.hostname.slice(4);
    }
    // Sort query params and remove tracking params
    const trackingParams = new Set([
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "utm_id",
      "fbclid",
      "gclid",
      "gclsrc",
      "dclid",
      "msclkid",
      "ref",
      "source",
      "mc_cid",
      "mc_eid",
      "_ga",
      "_gl",
    ]);

    const cleanParams = new URLSearchParams();
    u.searchParams.forEach((value, key) => {
      if (!trackingParams.has(key.toLowerCase())) {
        cleanParams.append(key, value);
      }
    });
    cleanParams.sort();
    u.search = cleanParams.toString();

    // Remove trailing slash from path
    let path = u.pathname;
    if (path.length > 1 && path.endsWith("/")) {
      path = path.slice(0, -1);
    }
    u.pathname = path;

    // Remove hash
    u.hash = "";

    return u.toString();
  } catch {
    // If URL parsing fails, do basic normalization
    let s = url.toLowerCase().trim();
    s = s.replace(/^https?:\/\/www\./, "https://");
    s = s.replace(/\/$/, "");
    s = s.replace(/[?&](?:utm_source|utm_medium|utm_campaign|utm_term|utm_content|utm_id|fbclid|gclid|gclsrc|dclid|msclkid|ref|source|mc_cid|mc_eid|_ga|_gl)=[^&]*/gi, "");
    return s;
  }
}

interface EngineResult {
  engine: string;
  blocked: boolean;
  results: SearchResult[];
}

interface RankedResult extends SearchResult {
  /** Number of engines that returned this URL */
  score: number;
  /** Best (lowest) position across engines */
  bestPosition: number;
}

/**
 * Merge results from multiple engines.
 * Deduplicates by normalized URL, ranks by:
 * 1. Number of engines that returned the URL (higher = better)
 * 2. Best (lowest) position across engines
 */
export function mergeResults(engineResults: EngineResult[]): {
  results: RankedResult[];
  engineStatus: string;
} {
  const urlMap = new Map<string, RankedResult>();

  for (const engineResult of engineResults) {
    for (let i = 0; i < engineResult.results.length; i++) {
      const result = engineResult.results[i];
      const normalized = normalizeUrl(result.url);
      const existing = urlMap.get(normalized);

      if (existing) {
        existing.score++;
        existing.bestPosition = Math.min(existing.bestPosition, i);
        // Prefer longer snippets
        if (result.snippet.length > existing.snippet.length) {
          existing.snippet = result.snippet;
          existing.title = result.title;
          existing.url = result.url;
        }
      } else {
        urlMap.set(normalized, {
          ...result,
          score: 1,
          bestPosition: i,
        });
      }
    }
  }

  // Sort: by score (desc), then best position (asc)
  const ranked = [...urlMap.values()].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.bestPosition - b.bestPosition;
  });

  // Build engine status line
  const statusParts = engineResults
    .filter((e) => e.results.length > 0 || e.blocked)
    .map((e) => {
      if (e.blocked) return `${e.engine} (blocked)`;
      return e.engine;
    });

  const engineStatus = statusParts.length > 0 ? statusParts.join(", ") : "none";

  return { results: ranked, engineStatus };
}

/**
 * Format ranked results as plain text.
 */
export function formatResults(ranked: RankedResult[], engineStatus: string): string {
  if (ranked.length === 0) {
    return `No results found. Sources checked: ${engineStatus || "none"}.`;
  }

  const lines = ranked.map((r, i) => {
    return `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.snippet}`;
  });

  lines.push(`\nSources: ${engineStatus}`);
  return lines.join("\n\n");
}