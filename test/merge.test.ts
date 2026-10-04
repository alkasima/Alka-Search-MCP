import { describe, it, expect } from "vitest";
import { normalizeUrl, mergeResults, formatResults } from "../src/merge.js";
import type { SearchResult } from "../src/engines/types.js";

describe("normalizeUrl", () => {
  it("removes www prefix", () => {
    const result = normalizeUrl("https://www.example.com/page");
    expect(result).not.toContain("www.");
    expect(result).toContain("example.com");
  });

  it("removes trailing slash", () => {
    const result = normalizeUrl("https://example.com/page/");
    expect(result.endsWith("/")).toBe(false);
  });

  it("strips tracking parameters", () => {
    const result = normalizeUrl(
      "https://example.com/page?utm_source=twitter&fbclid=123&keep=me"
    );
    expect(result).not.toContain("utm_source");
    expect(result).not.toContain("fbclid");
    expect(result).toContain("keep=me");
  });

  it("lowercases hostname", () => {
    const result = normalizeUrl("HTTPS://EXAMPLE.COM/Page");
    expect(result).toBe("https://example.com/Page");
  });

  it("returns consistent keys for same URL with different tracking params", () => {
    const a = normalizeUrl("https://example.com?utm_source=a");
    const b = normalizeUrl("https://example.com?utm_source=b&fbclid=x");
    expect(a).toBe(b);
  });
});

describe("mergeResults", () => {
  it("deduplicates by normalized URL", () => {
    const engineResults = [
      {
        engine: "Engine1",
        blocked: false,
        results: [
          { title: "T1", url: "https://example.com/page", snippet: "S1" },
        ] satisfies SearchResult[],
      },
      {
        engine: "Engine2",
        blocked: false,
        results: [
          {
            title: "T1-alt",
            url: "https://www.example.com/page/",
            snippet: "S1 longer",
          },
        ] satisfies SearchResult[],
      },
    ];

    const { results } = mergeResults(engineResults);
    expect(results).toHaveLength(1);
    expect(results[0]!.score).toBe(2);
    expect(results[0]!.snippet).toBe("S1 longer");
  });

  it("ranks by score then position", () => {
    const engineResults = [
      {
        engine: "E1",
        blocked: false,
        results: [
          { title: "A", url: "https://a.com", snippet: "a" },
          { title: "B", url: "https://b.com", snippet: "b" },
        ] satisfies SearchResult[],
      },
      {
        engine: "E2",
        blocked: false,
        results: [
          { title: "B-alt", url: "https://b.com/", snippet: "b-long" },
          { title: "C", url: "https://c.com", snippet: "c" },
        ] satisfies SearchResult[],
      },
    ];

    const { results } = mergeResults(engineResults);
    expect(results).toHaveLength(3);
    // B has score 2, should be first
    expect(results[0]!.title).toContain("B");
    expect(results[0]!.score).toBe(2);
    // A and C both have score 1; A had better position (0 vs 1)
    expect(results[1]!.title).toContain("A");
    expect(results[2]!.title).toContain("C");
  });

  it("reports blocked engines in status", () => {
    const engineResults = [
      { engine: "E1", blocked: true, results: [] },
      { engine: "E2", blocked: false, results: [] },
    ];

    const { engineStatus } = mergeResults(engineResults);
    expect(engineStatus).toContain("E1 (blocked)");
    expect(engineStatus).not.toContain("E2");
  });
});

describe("formatResults", () => {
  it("formats ranked results as plain text", () => {
    const text = formatResults(
      [
        {
          title: "Test Title",
          url: "https://example.com",
          snippet: "This is a test snippet.",
          score: 2,
          bestPosition: 0,
        },
      ],
      "Engine1, Engine2"
    );

    expect(text).toContain("Test Title");
    expect(text).toContain("https://example.com");
    expect(text).toContain("This is a test snippet.");
    expect(text).toContain("Sources: Engine1, Engine2");
  });

  it("handles empty results", () => {
    const text = formatResults([], "none");
    expect(text).toContain("No results found");
    expect(text).toContain("none");
  });
});