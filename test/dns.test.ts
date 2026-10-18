import { afterEach, expect, it, vi } from "vitest";
import { lookup } from "node:dns";
import { publicLookup } from "../src/ssrf.js";

vi.mock("node:dns", () => ({ lookup: vi.fn() }));
afterEach(() => vi.resetAllMocks());

function answers(addresses: { address: string; family: number }[]) {
  vi.mocked(lookup).mockImplementation((_host, _options, callback: any) => callback(null, addresses));
}

it("rejects mixed public/private DNS answers instead of selecting a public one", () => {
  answers([{ address: "8.8.8.8", family: 4 }, { address: "127.0.0.1", family: 4 }]);
  const callback = vi.fn();
  publicLookup("example.com", { all: true }, callback);
  expect(callback.mock.calls[0][0].message).toContain("private");
});

it("hands the validated address to the socket without another resolution", () => {
  answers([{ address: "8.8.8.8", family: 4 }]);
  const callback = vi.fn();
  publicLookup("example.com", {}, callback);
  expect(callback).toHaveBeenCalledWith(null, "8.8.8.8", 4);
  expect(lookup).toHaveBeenCalledTimes(1);
});

it("supports the all-address callback used for IPv4/IPv6 connections", () => {
  const addresses = [{ address: "8.8.8.8", family: 4 }, { address: "2606:4700:4700::1111", family: 6 }];
  answers(addresses);
  const callback = vi.fn();
  publicLookup("example.com", { all: true }, callback);
  expect(callback).toHaveBeenCalledWith(null, addresses);
});
