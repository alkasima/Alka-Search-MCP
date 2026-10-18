import { afterEach, describe, expect, it, vi } from "vitest";
import { fetch, Response } from "undici";
import { fetchText, requestTimeout } from "../src/http.js";
import { fetchPage } from "../src/fetchPage.js";
import { fetchLlmsTxt } from "../src/llmsTxt.js";

vi.mock("undici", async (importOriginal) => ({
  ...await importOriginal<typeof import("undici")>(), fetch: vi.fn(),
}));
const mockFetch = vi.mocked(fetch);
afterEach(() => { vi.resetAllMocks(); vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("guarded fetch", () => {
  it.each(["http://[fc00::1]/", "http://[::ffff:127.0.0.1]/", "http://localhost./"])("blocks %s before requesting", async (url) => {
    await expect(fetchText(url, "text/plain")).rejects.toThrow("private");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("checks every redirect and cancels the previous body", async () => {
    const response = new Response("redirect", { status: 302, headers: { location: "http://169.254.169.254/" } });
    const cancel = vi.spyOn(response.body!, "cancel");
    mockFetch.mockResolvedValueOnce(response);
    await expect(fetchText("https://example.com", "text/plain")).rejects.toThrow("Redirect blocked");
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalled();
  });

  it("follows relative redirects and returns the final URL", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/article" } }))
      .mockResolvedValueOnce(new Response("hello"));
    await expect(fetchText("https://example.com/start", "text/plain"))
      .resolves.toMatchObject({ url: "https://example.com/article", text: "hello" });
    expect(mockFetch.mock.calls[1][1]).toMatchObject({ redirect: "manual" });
  });

  it("bounds redirect loops", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 302, headers: { location: "/loop" } }));
    await expect(fetchText("https://example.com", "text/plain")).rejects.toThrow("Too many redirects");
    expect(mockFetch).toHaveBeenCalledTimes(6);
  });

  it("limits streamed downloads even without a Content-Length", async () => {
    mockFetch.mockResolvedValueOnce(new Response(new Uint8Array(5 * 1024 * 1024 + 1)));
    await expect(fetchText("https://example.com", "text/plain")).rejects.toThrow("download limit");
  });

  it("keeps the deadline active after headers arrive", async () => {
    vi.useFakeTimers();
    mockFetch.mockImplementation(async (_url, init) => new Response(new ReadableStream({
      start(controller) {
        init!.signal!.addEventListener("abort", () => controller.error(new Error("aborted")), { once: true });
      },
    })));
    const assertion = expect(fetchText("https://example.com", "text/plain", 50)).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(51);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("private opt-in still rejects credentials and non-HTTP schemes", async () => {
    vi.stubEnv("ALLOW_PRIVATE_URLS", "true");
    await expect(fetchText("file:///etc/passwd", "text/plain")).rejects.toThrow("Only http");
    await expect(fetchText("https://user:secret@example.com", "text/plain")).rejects.toThrow("credentials");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("uses the default for invalid timeout configuration", () => {
    for (const value of ["-1", "0", "abc", "999999999999", "1.5"]) {
      vi.stubEnv("REQUEST_TIMEOUT_MS", value);
      expect(requestTimeout(15000)).toBe(15000);
    }
  });
});

describe("fetch_page", () => {
  it("extracts article markdown, resolves links against the final URL, and truncates", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/docs/article" } }))
      .mockResolvedValueOnce(new Response('<html><body><article><h1>Guide</h1><p><a href="next">Next page</a></p><p>' + "Useful article content. ".repeat(100) + '</p></article></body></html>', { headers: { "content-type": "text/html" } }));
    const result = await fetchPage("https://example.com/start", 500);
    expect(result).toContain("[Content from https://example.com/docs/article");
    expect(result).toContain("[Next page](https://example.com/docs/next)");
    expect(result).toContain("truncated to 500");
  });

  it("reports bot protection", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 429 }));
    expect(await fetchPage("https://example.com")).toContain("bot protection");
  });

  it("preserves plain text containing angle brackets", async () => {
    mockFetch.mockResolvedValueOnce(new Response("Use <widget> here", { headers: { "content-type": "text/plain" } }));
    expect(await fetchPage("https://example.com")).toContain("Use <widget> here");
  });

  it("does not parse PDFs as HTML", async () => {
    mockFetch.mockResolvedValueOnce(new Response("%PDF", { headers: { "content-type": "application/pdf" } }));
    expect(await fetchPage("https://example.com/file.pdf")).toContain("Unsupported content type");
  });
});

describe("fetch_llms_txt", () => {
  it("falls back from missing llms-full.txt to llms.txt", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response("# Documentation", { headers: { "content-type": "text/plain" } }));
    expect(await fetchLlmsTxt("docs.example.com")).toContain("# Documentation");
    expect(mockFetch.mock.calls.map(([url]) => url)).toEqual([
      "https://docs.example.com/llms-full.txt", "https://docs.example.com/llms.txt",
    ]);
  });

  it("rejects private redirects for both paths", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 302, headers: { location: "http://[::ffff:127.0.0.1]/" } }));
    expect(await fetchLlmsTxt("example.com")).toContain("Redirect blocked");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("ignores HTML app shells returned with 200", async () => {
    mockFetch.mockResolvedValueOnce(new Response("<!doctype html><html>App</html>", { headers: { "content-type": "text/html" } }))
      .mockResolvedValueOnce(new Response("# Real documentation", { headers: { "content-type": "text/markdown" } }));
    const result = await fetchLlmsTxt("example.com");
    expect(result).toContain("# Real documentation");
    expect(result).not.toContain("<!doctype");
  });

  it("bounds text and labels it as untrusted", async () => {
    mockFetch.mockResolvedValueOnce(new Response("x".repeat(16000), { headers: { "content-type": "text/plain" } }));
    const result = await fetchLlmsTxt("example.com");
    expect(result).toContain("untrusted web content");
    expect(result).toContain("truncated to 15000");
    expect(result).not.toContain("x".repeat(15001));
  });

  it("rejects malformed or credential-bearing domains without a request", async () => {
    for (const domain of ["example.com@localhost", "example.com?redirect=x", "bad domain", "file:///tmp/test"]) {
      expect(await fetchLlmsTxt(domain)).toMatch(/^Error:/);
    }
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
