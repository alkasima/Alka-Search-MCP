import { afterEach, describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { search as duckduckgoSearch } from "../src/engines/duckduckgo.js";

const fixturePath = resolve(import.meta.dirname, "fixtures", "duckduckgo.html");
const html = readFileSync(fixturePath, "utf-8");

describe("DuckDuckGo Engine", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("runs the actual search parser against the saved response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(html)));
    const result = await duckduckgoSearch("test", new AbortController().signal);
    expect(result.blocked).toBe(false);
    expect(result.results.length).toBeGreaterThanOrEqual(5);
    for (const entry of result.results) {
      expect(entry.title).not.toBe("");
      expect(entry.url).toMatch(/^https?:\/\//);
      expect(entry.url).not.toContain("uddg=");
    }
  });

  it("should not be blocked by the fixture page", () => {
    // The fixture should contain real results, not a CAPTCHA
    expect(html.includes("captcha")).toBe(false);
    expect(html.includes("g-recaptcha")).toBe(false);
  });

  it("parses result titles from fixture", () => {
    // Quick sanity check on the fixture HTML
    expect(html).toContain('class="result__a"');
    expect(html).toContain('class="result__snippet"');
  });

  it("extracts result count from fixture via cheerio", async () => {
    const cheerio = await import("cheerio");
    const $ = cheerio.load(html);
    const results = $("a.result__a");
    expect(results.length).toBeGreaterThanOrEqual(5);
  });

  it("extracts real URLs from DuckDuckGo redirect links", async () => {
    const cheerio = await import("cheerio");
    const $ = cheerio.load(html);

    $("a.result__a").each((_, el) => {
      const href = $(el).attr("href") || "";
      // Should contain the DuckDuckGo redirect pattern
      if (href) {
        expect(href).toContain("uddg=");
        // Extract and verify the real URL
        const match = href.match(/uddg=([^&]+)/);
        if (match) {
          const decoded = decodeURIComponent(match[1]);
          expect(decoded).toMatch(/^https?:\/\//);
        }
      }
    });
  });

  it("extracts snippet text", async () => {
    const cheerio = await import("cheerio");
    const $ = cheerio.load(html);
    const snippets = $("a.result__snippet");
    expect(snippets.length).toBeGreaterThanOrEqual(3);

    snippets.each((_, el) => {
      const text = $(el).text().trim();
      expect(text.length).toBeGreaterThan(5);
    });
  });
});
