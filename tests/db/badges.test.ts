import { beforeEach, describe, expect, it } from "vitest";
import { userBadges } from "@/server/badges";
import { addEntry, makeUser, resetData } from "./helpers";

beforeEach(resetData);

describe("badges", () => {
  it("awards first döner and Stammgast", async () => {
    const me = await makeUser("Niklas");
    await addEntry(me, { place: "Bosporus Grill", overall: 5, at: "2026-10-01T12:00:00Z" });
    let earned = (await userBadges(me)).filter((b) => b.earnedAt).map((b) => b.key);
    expect(earned).toEqual(["first"]);
    for (let i = 2; i <= 5; i++) await addEntry(me, { place: "Bosporus Grill", overall: 4, at: `2026-10-0${i}T12:00:00Z` });
    earned = (await userBadges(me)).filter((b) => b.earnedAt).map((b) => b.key);
    expect(earned).toContain("regular");
  });

  it("awards Nachteule in the app time zone", async () => {
    const me = await makeUser("Niklas");
    await addEntry(me, { place: "Spät", overall: 4, at: "2026-10-01T21:30:00Z" }); // 23:30 Berlin
    expect((await userBadges(me)).find((b) => b.key === "night_owl")?.earnedAt).toBeTruthy();
  });
});
