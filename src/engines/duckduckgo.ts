import * as cheerio from "cheerio";
import type { EngineSearchResponse } from "./types.js";

const BASE_URL = "https://html.duckduckgo.com/html/";

/**
 * Search DuckDuckGo's non-JavaScript HTML endpoint.
 * Parses the old-style HTML results page.
 */
export async function search(query: string, signal: AbortSignal): Promise<EngineSearchResponse> {
  const url = `${BASE_URL}?q=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept": "text/html,application/xhtml+xml",
    },
    signal,
  });

  if (response.status === 403 || response.status === 429) {
    return { results: [], blocked: true };
  }

  const html = await response.text();

  // Detect CAPTCHA
  if (
    html.includes("class=\"g-recaptcha\"") ||
    html.includes("verify you are human") ||
    html.includes("captcha") ||
    html.length < 2000
  ) {
    return { results: [], blocked: true };
  }

  const $ = cheerio.load(html);
  const results = $(".result")
    .map((_, el) => {
      const $el = $(el);

      // Title and URL come from the result__a link
      const $titleLink = $el.find("a.result__a");
      const title = $titleLink.text().trim();

      // The href is a DuckDuckGo redirect: //duckduckgo.com/l/?uddg=<encoded_url>&rut=...
      let rawUrl = $titleLink.attr("href") || "";
      // Extract the real URL from the DuckDuckGo redirect
      const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
      if (uddgMatch) {
        rawUrl = decodeURIComponent(uddgMatch[1]);
      }
      // Ensure it has a protocol
      if (rawUrl && !rawUrl.startsWith("http")) {
        rawUrl = "https://" + rawUrl.replace(/^\/+/, "");
      }

      // Snippet is inside <a class="result__snippet">
      const snippet = $el.find("a.result__snippet").text().trim();

      if (!title || !rawUrl) return null;

      return { title, url: rawUrl, snippet };
    })
    .get()
    .filter(Boolean);

  return { results, blocked: false };
}