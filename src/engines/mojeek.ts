import * as cheerio from "cheerio";
import type { EngineSearchResponse } from "./types.js";

const BASE_URL = "https://www.mojeek.com/search";

/**
 * Search Mojeek.
 * Mojeek may return a CAPTCHA for automated requests; when that happens,
 * blocked: true is returned.
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

  // Detect CAPTCHA page - Mojeek returns a page with title "Captcha" when blocked
  if (
    html.includes("<title>Captcha</title>") ||
    html.includes("captcha") ||
    html.length < 2000
  ) {
    return { results: [], blocked: true };
  }

  const $ = cheerio.load(html);
  const resultsList: Array<{ title: string; url: string; snippet: string }> = [];

  // Mojeek results are in <ul class="results-standard"> or <ul class="results">
  $("ul.results-standard li, ul.results li, .results li").each((_, el) => {
    const $el = $(el);

    // Title link: <a class="title" href="..."> or <h2><a ...>
    const $titleLink = $el.find("a.title, h2 a, h3 a").first();
    const title = $titleLink.text().trim();
    let resultUrl = $titleLink.attr("href") || "";

    // Snippet: <p class="s"> or <span class="snippet"> or <p class="description">
    const snippet =
      $el.find("p.s, .snippet, p.description, .description").first().text().trim() ||
      $el.find("p").first().text().trim();

    // Display URL: <span class="url"> or <cite>
    const displayUrl =
      $el.find("span.url, cite, .display-url").first().text().trim();

    if (!title || !resultUrl) return;

    // Ensure absolute URL
    if (resultUrl.startsWith("/")) {
      resultUrl = "https://www.mojeek.com" + resultUrl;
    }

    resultsList.push({ title, url: resultUrl, snippet });
  });

  return { results: resultsList, blocked: false };
}