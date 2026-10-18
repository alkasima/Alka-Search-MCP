import { lookup } from "node:dns";
import { isIP, type LookupFunction } from "node:net";
import ipaddr from "ipaddr.js";

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
}

/** Classify literal addresses and local names; DNS is checked at connection time. */
export function isPrivateHost(hostname: string): boolean {
  const host = normalizeHost(hostname);
  if (host === "localhost" || host.endsWith(".localhost") ||
      host.endsWith(".local") || host.endsWith(".internal") ||
      (!host.includes(".") && !host.includes(":") && !isIP(host))) return true;
  // process() converts IPv4-mapped IPv6 before classifying its range.
  if (ipaddr.isValid(host)) return ipaddr.process(host).range() !== "unicast";
  return false;
}

export function isPrivateAllowed(): boolean {
  return process.env.ALLOW_PRIVATE_URLS === "true";
}

/** Protocol/credential rules remain active when private hosts are allowed. */
export function validateUrl(rawUrl: string, allowPrivate = false): string | null {
  let parsed: URL;
  try { parsed = new URL(rawUrl); } catch { return "Invalid URL."; }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "Only http and https URLs are allowed.";
  }
  if (parsed.username || parsed.password) return "URLs containing credentials are not allowed.";
  if (!allowPrivate && isPrivateHost(parsed.hostname)) {
    return "URL hostname is a private/internal or reserved address. Blocked for SSRF protection.";
  }
  return null;
}

/** Hand only checked DNS answers to the socket, avoiding a second DNS lookup. */
export const publicLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { all: true, verbatim: true }, (error, addresses) => {
    if (error) return callback(error, []);
    if (!addresses.length || addresses.some(({ address }) => isPrivateHost(address))) {
      return callback(new Error("DNS resolved to a private/internal or reserved address. Blocked for SSRF protection."), []);
    }
    const family = Number(options.family) || 0;
    const usable = family ? addresses.filter((entry) => entry.family === family) : addresses;
    if (!usable.length) return callback(new Error("No address found for the requested family."), []);
    if (options.all) callback(null, usable);
    else callback(null, usable[0]!.address, usable[0]!.family);
  });
};
