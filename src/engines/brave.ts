import * as cheerio from "cheerio";
import type { EngineSearchResponse } from "./types.js";

const BASE_URL = "https://search.brave.com/search";

/**
 * Search Brave Search.
 * Brave frequently returns CAPTCHA challenges for automated requests.
 * When that happens, blocked: true is returned.
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

  // Detect CAPTCHA or JS challenge page
  if (
    html.includes("captcha") ||
    html.includes("suspicious") ||
    html.includes("noscript-hide") ||
    html.includes("This page needs JavaScript") ||
    html.length < 3000
  ) {
    return { results: [], blocked: true };
  }

  const $ = cheerio.load(html);
  const resultsList: Array<{ title: string; url: string; snippet: string }> = [];

  // Brave results are typically in <div class="snippet" data-serp-pos="...">
  // Try multiple selectors to be robust
  $('[data-serp-pos], .snippet, .result, .search-result').each((_, el) => {
    const $el = $(el);

    // Title: <a class="snippet-title"> or <h2><a> or any heading link
    const $titleLink = $el.find("a.snippet-title, h2 a, h3 a, .heading a, .title a").first();
    const title = $titleLink.text().trim();
    let resultUrl = $titleLink.attr("href") || "";

    // Snippet: <p class="snippet-description"> or <div class="snippet-content">
    const snippet =
      $el.find(".snippet-description, .snippet-content, .description, p.s").first().text().trim();

    if (!title || !resultUrl) return;

    resultsList.push({ title, url: resultUrl, snippet });
  });

  // Fallback: try finding links within the main content area
  if (resultsList.length === 0) {
    $("a[href^='http']").each((_, el) => {
      const $el = $(el);
      const href = $el.attr("href") || "";
      const text = $el.text().trim();

      // Skip navigation/social links
      if (
        href.includes("brave.com") ||
        href.includes("search.brave.com") ||
        text.length < 10
      )
        return;

      // Try to find a nearby snippet paragraph
      const $parent = $el.parent();
      const snippet = $parent.find("p, .description, .snippet-description").text().trim() ||
        $parent.next("p, div").text().trim();

      resultsList.push({ title: text, url: href, snippet: snippet.substring(0, 300) });
    });
  }

  return { results: resultsList.slice(0, 20), blocked: false };
}