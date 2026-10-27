import { describe, expect, it } from "vitest";
import { companionsLabel, formatPrice, formatRating, initials, parsePrice } from "@/lib/format";
import { haversineMeters, normalizePlaceName } from "@/lib/geo";
import { normalizeFriendCode } from "@/server/friend-code";

describe("format", () => {
  it("formats prices the German way", () => {
    expect(formatPrice(750)).toBe("€ 7,50");
    expect(formatPrice(1150, "EUR")).toBe("€ 11,50");
    expect(formatPrice(36240, "EUR", true)).toBe("€ 362");
    expect(formatPrice(900, "CHF")).toBe("CHF 9,00");
    expect(formatPrice(null)).toBe("–");
  });

  it("parses price input", () => {
    expect(parsePrice("7,50")).toBe(750);
    expect(parsePrice("7.5")).toBe(750);
    expect(parsePrice("€ 11")).toBe(1100);
    expect(parsePrice("1.250,00")).toBe(125000);
    expect(parsePrice("")).toBeNull();
    expect(parsePrice("abc")).toBeNull();
  });

  it("formats ratings with comma", () => {
    expect(formatRating(4.25)).toBe("4,3");
    expect(formatRating(5)).toBe("5,0");
    expect(formatRating(null)).toBe("–");
  });

  it("builds initials and companion labels", () => {
    expect(initials("Niklas Test")).toBe("NT");
    expect(initials("Lena")).toBe("LE");
    expect(companionsLabel([])).toBe("allein");
    expect(companionsLabel(["Tim Kaya", "Jonas B"])).toBe("mit Tim, Jonas");
  });
});

describe("geo", () => {
  it("normalizes place names for dedupe", () => {
    expect(normalizePlaceName("Kebap Haus Ece")).toBe(normalizePlaceName("kebap-haus  ECE"));
    expect(normalizePlaceName("Mangal Ocakbaşı")).toBe("mangalocakbasi");
    expect(normalizePlaceName("Döner Straße")).toBe("donerstrasse");
  });

  it("computes distances", () => {
    const d = haversineMeters({ lat: 50.9375, lng: 6.9603 }, { lat: 50.9379, lng: 6.9603 });
    expect(d).toBeGreaterThan(40);
    expect(d).toBeLessThan(50);
  });
});

describe("friend codes", () => {
  it("normalizes user input", () => {
    expect(normalizeFriendCode("DÖN-4K7Q")).toBe("DÖN-4K7Q");
    expect(normalizeFriendCode("don4k7q")).toBe("DÖN-4K7Q");
    expect(normalizeFriendCode("4k7q")).toBe("DÖN-4K7Q");
    expect(normalizeFriendCode("tim")).toBeNull();
    expect(normalizeFriendCode("DÖN-0000")).toBeNull();
  });
});
