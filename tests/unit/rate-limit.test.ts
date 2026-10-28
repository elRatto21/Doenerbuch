import { beforeEach, describe, expect, it } from "vitest";
import { rateLimit, RateLimitError, resetRateLimits } from "@/server/rate-limit";
import { isOwnUploadKey } from "@/lib/validation";
import { safeNext } from "@/lib/safe-next";

beforeEach(resetRateLimits);

describe("rate limiter", () => {
  it("allows up to the limit per window and per user", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 10; i++) rateLimit("friendRequest", "u1", t0 + i);
    expect(() => rateLimit("friendRequest", "u1", t0 + 10)).toThrow(RateLimitError);
    // other users and other actions are independent
    expect(() => rateLimit("friendRequest", "u2", t0 + 10)).not.toThrow();
    expect(() => rateLimit("upload", "u1", t0 + 10)).not.toThrow();
    // the minute window slides
    expect(() => rateLimit("friendRequest", "u1", t0 + 61_000)).not.toThrow();
  });

  it("enforces the daily cap too", () => {
    let t = 1_000_000;
    for (let i = 0; i < 50; i++) {
      rateLimit("friendRequest", "u1", t);
      t += 7_000; // stays under 10/min
    }
    expect(() => rateLimit("friendRequest", "u1", t)).toThrow(/Minuten|Sekunden/);
  });
});

describe("input guards", () => {
  it("only accepts upload keys we issued", () => {
    const uuid = "0b9c0d8e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
    expect(isOwnUploadKey(`entries/u1/${uuid}.jpg`, "entries", "u1")).toBe(true);
    expect(isOwnUploadKey(`entries/u2/${uuid}.jpg`, "entries", "u1")).toBe(false);
    expect(isOwnUploadKey(`entries/u1/../u2/${uuid}.jpg`, "entries", "u1")).toBe(false);
    expect(isOwnUploadKey(`entries/u1/${uuid}.svg`, "entries", "u1")).toBe(false);
    expect(isOwnUploadKey(`avatars/u1/${uuid}.png`, "entries", "u1")).toBe(false);
  });

  it("only redirects to same-origin paths after login", () => {
    expect(safeNext("/freunde")).toBe("/freunde");
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("/\\evil.example")).toBe("/");
    expect(safeNext(null)).toBe("/");
  });
});
