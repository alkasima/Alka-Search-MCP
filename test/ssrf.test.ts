import { describe, it, expect } from "vitest";
import { validateUrl, isPrivateHost, isPrivateAllowed } from "../src/ssrf.js";

describe("validateUrl", () => {
  it("rejects non-http URLs", () => {
    expect(validateUrl("ftp://example.com")).toContain("Only http");
    expect(validateUrl("file:///etc/passwd")).toContain("Only http");
    expect(validateUrl("javascript:alert(1)")).toContain("Only http");
  });

  it("rejects invalid URLs", () => {
    expect(validateUrl("not a url")).not.toBeNull();
  });

  it("accepts normal http URLs", () => {
    expect(validateUrl("http://example.com")).toBeNull();
    expect(validateUrl("https://example.com/path?q=1")).toBeNull();
  });

  it("rejects localhost", () => {
    expect(validateUrl("http://localhost:3000")).toContain("private");
    expect(validateUrl("http://127.0.0.1/api")).toContain("private");
    expect(validateUrl("http://[::1]/api")).toContain("private");
  });

  it("rejects private IPv4 ranges", () => {
    expect(validateUrl("http://10.0.0.1/api")).toContain("private");
    expect(validateUrl("http://192.168.1.1/api")).toContain("private");
    expect(validateUrl("http://172.16.0.1/api")).toContain("private");
  });

  it("rejects link-local addresses", () => {
    expect(validateUrl("http://169.254.1.1/api")).toContain("private");
  });

  it("rejects cloud metadata addresses", () => {
    expect(validateUrl("http://169.254.169.254/latest/meta-data")).toContain(
      "private"
    );
    expect(validateUrl("http://100.100.100.200/")).toContain("private");
  });

  it("rejects decimal-IP tricks for private IPs", () => {
    // 127.0.0.1 as decimal = 2130706433
    expect(validateUrl("http://2130706433/")).toContain("private");
  });

  it("accepts public IPs", () => {
    expect(validateUrl("http://8.8.8.8")).toBeNull();
    expect(validateUrl("http://1.1.1.1")).toBeNull();
  });
});

describe("isPrivateHost", () => {
  it("detects localhost variants", () => {
    expect(isPrivateHost("localhost")).toBe(true);
    expect(isPrivateHost("myapp.local")).toBe(true);
    expect(isPrivateHost("service.internal")).toBe(true);
  });

  it("detects private IPv4", () => {
    expect(isPrivateHost("192.168.1.1")).toBe(true);
    expect(isPrivateHost("10.0.0.1")).toBe(true);
  });

  it("detects private IPv6", () => {
    expect(isPrivateHost("::1")).toBe(true);
    expect(isPrivateHost("fe80::1")).toBe(true);
    expect(isPrivateHost("fc00::1")).toBe(true);
    expect(isPrivateHost("fd00::1")).toBe(true);
  });

  it("allows public hostnames", () => {
    expect(isPrivateHost("example.com")).toBe(false);
    expect(isPrivateHost("github.com")).toBe(false);
  });
});