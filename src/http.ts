import { Agent, fetch } from "undici";
import { isPrivateAllowed, publicLookup, validateUrl } from "./ssrf.js";

const publicAgent = new Agent({ connect: { lookup: publicLookup } });
const MAX_REDIRECTS = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const REDIRECTS = new Set([301, 302, 303, 307, 308]);
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

export function requestTimeout(defaultMs: number): number {
  const value = Number(process.env.REQUEST_TIMEOUT_MS);
  return Number.isSafeInteger(value) && value > 0 && value <= 2147483647 ? value : defaultMs;
}

/** One deadline covers DNS, redirects, and bounded response-body downloads. */
export async function fetchText(url: string, accept: string, timeoutMs = requestTimeout(15000)) {
  const allowPrivate = isPrivateAllowed();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let currentUrl = url;
  try {
    for (let hop = 0; ; hop++) {
      const error = validateUrl(currentUrl, allowPrivate);
      if (error) throw new Error((hop ? "Redirect blocked: " : "") + error);
      const response = await fetch(currentUrl, {
        headers: { "User-Agent": USER_AGENT, "Accept-Language": "en-US,en;q=0.9", Accept: accept },
        redirect: "manual",
        signal: controller.signal,
        ...(allowPrivate ? {} : { dispatcher: publicAgent }),
      });
      const location = response.headers.get("location");
      if (REDIRECTS.has(response.status) && location) {
        await response.body?.cancel();
        if (hop >= MAX_REDIRECTS) throw new Error("Too many redirects.");
        currentUrl = new URL(location, currentUrl).href;
        continue;
      }
      const contentType = response.headers.get("content-type") || "";
      if (response.status !== 200) {
        await response.body?.cancel();
        return { url: currentUrl, status: response.status, contentType, text: "" };
      }
      if (Number(response.headers.get("content-length")) > MAX_BYTES) {
        await response.body?.cancel();
        throw new Error("Response exceeds the 5 MiB download limit.");
      }
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let text = "";
      let bytes = 0;
      if (reader) {
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            bytes += value.byteLength;
            if (bytes > MAX_BYTES) throw new Error("Response exceeds the 5 MiB download limit.");
            text += decoder.decode(value, { stream: true });
          }
          text += decoder.decode();
        } finally {
          await reader.cancel().catch(() => {});
          reader.releaseLock();
        }
      }
      return { url: currentUrl, status: response.status, contentType, text };
    }
  } catch (error) {
    if (controller.signal.aborted) throw new Error("Request timed out after " + timeoutMs + " ms.");
    if (error instanceof TypeError && error.cause instanceof Error) throw error.cause;
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
