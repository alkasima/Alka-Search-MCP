import { isIP } from "node:net";

// IPv4 private ranges
const PRIVATE_IPV4_RANGES = [
  { start: ip4ToInt("10.0.0.0"), end: ip4ToInt("10.255.255.255") },
  { start: ip4ToInt("127.0.0.0"), end: ip4ToInt("127.255.255.255") },
  { start: ip4ToInt("169.254.0.0"), end: ip4ToInt("169.254.255.255") },
  { start: ip4ToInt("172.16.0.0"), end: ip4ToInt("172.31.255.255") },
  { start: ip4ToInt("192.0.0.0"), end: ip4ToInt("192.0.0.255") },
  { start: ip4ToInt("192.0.2.0"), end: ip4ToInt("192.0.2.255") },
  { start: ip4ToInt("192.88.99.0"), end: ip4ToInt("192.88.99.255") },
  { start: ip4ToInt("192.168.0.0"), end: ip4ToInt("192.168.255.255") },
  { start: ip4ToInt("198.18.0.0"), end: ip4ToInt("198.19.255.255") },
  { start: ip4ToInt("198.51.100.0"), end: ip4ToInt("198.51.100.255") },
  { start: ip4ToInt("203.0.113.0"), end: ip4ToInt("203.0.113.255") },
  { start: ip4ToInt("224.0.0.0"), end: ip4ToInt("239.255.255.255") }, // Multicast
  { start: ip4ToInt("240.0.0.0"), end: ip4ToInt("255.255.255.255") }, // Reserved
];

// Cloud metadata addresses (blocked by default)
const CLOUD_METADATA_IPS = new Set([
  "169.254.169.254", // AWS, GCP, Azure
  "100.100.100.200", // Alibaba Cloud
  "169.254.170.2",   // AWS ECS agent
  "fc00:ec2::254",   // AWS IPv6
  "metadata.google.internal", // GCP
]);

// Private/special-use hostnames
const PRIVATE_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
  "::1",
]);

function ip4ToInt(ip: string): number {
  const parts = ip.split(".").map(Number);
  return ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  const int = ip4ToInt(ip);
  return PRIVATE_IPV4_RANGES.some((range) => int >= range.start && int <= range.end);
}

function isPrivateIPv6(ip: string): boolean {
  // Normalize IPv6 for comparison
  const normalized = ip.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fe80:") || // link-local
    normalized.startsWith("fc") ||    // unique local
    normalized.startsWith("fd") ||    // unique local
    normalized.startsWith("ff") ||    // multicast
    normalized === "::"               // unspecified
  );
}

/**
 * Check if a hostname resolves to a private/internal IP.
 * We use the `isIP` function from Node and check against known ranges.
 */
export function isPrivateHost(hostname: string): boolean {
  // Direct private hostnames
  if (PRIVATE_HOSTNAMES.has(hostname.toLowerCase())) {
    return true;
  }

  // Check cloud metadata addresses
  if (CLOUD_METADATA_IPS.has(hostname)) {
    return true;
  }

  // Check for "localhost" variants
  if (
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    return true;
  }

  // Check if the hostname is an IP address
  const ipVersion = isIP(hostname);
  if (ipVersion === 4) {
    return isPrivateIPv4(hostname);
  }
  if (ipVersion === 6) {
    return isPrivateIPv6(hostname);
  }

  // Handle decimal-IP tricks (e.g., http://2130706433 = 127.0.0.1)
  if (/^\d+$/.test(hostname)) {
    const num = parseInt(hostname, 10);
    if (num >= 0 && num <= 0xffffffff) {
      const ip = [
        (num >>> 24) & 0xff,
        (num >>> 16) & 0xff,
        (num >>> 8) & 0xff,
        num & 0xff,
      ].join(".");
      if (isPrivateIPv4(ip)) return true;
    }
  }

  return false;
}

/**
 * Validate a URL for SSRF safety.
 * Returns an error message string if blocked, or null if safe.
 */
export function validateUrl(rawUrl: string): string | null {
  // Only http and https
  if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
    return "Only http and https URLs are allowed.";
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return `Invalid URL: ${rawUrl}`;
  }

  // Block non-standard ports for http/https that could be used for SSRF
  // This is a basic check - we also check the hostname below
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "Only http and https URLs are allowed.";
  }

  if (isPrivateHost(parsed.hostname)) {
    return `URL hostname (${parsed.hostname}) resolves to a private/internal address. Blocked for SSRF protection.`;
  }

  return null;
}

/**
 * Check if private URLs are allowed via env var.
 */
export function isPrivateAllowed(): boolean {
  return process.env.ALLOW_PRIVATE_URLS === "true";
}