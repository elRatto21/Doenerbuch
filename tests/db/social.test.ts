import { beforeEach, describe, expect, it } from "vitest";
import { friendFeed, mapPlaces, monthlyRanking } from "@/server/queries/social";
import { getEntryForViewer } from "@/server/queries/entries";
import { incomingRequests, requestFriendship, respondToRequest, searchUsers } from "@/server/queries/friends";
import { addEntry, befriend, makeUser, resetData } from "./helpers";

beforeEach(resetData);

const NOW = new Date("2026-10-27T12:00:00Z");

describe("ranking", () => {
  it("ranks me and friends by count, then average", async () => {
    const me = await makeUser("Niklas");
    const tim = await makeUser("Tim");
    const lena = await makeUser("Lena");
    const hidden = await makeUser("Versteckt", { visibleToFriends: false });
    const stranger = await makeUser("Fremd");
    await befriend(me, tim);
    await befriend(lena, me);
    await befriend(me, hidden);

    for (let i = 0; i < 3; i++) await addEntry(tim, { place: "T", overall: 3, at: `2026-10-0${i + 1}T12:00:00Z` });
    await addEntry(me, { place: "N", overall: 4, at: "2026-10-05T12:00:00Z" });
    await addEntry(me, { place: "N", overall: 4, at: "2026-10-06T12:00:00Z" });
    await addEntry(lena, { place: "L", overall: 5, at: "2026-10-05T12:00:00Z" });
    await addEntry(lena, { place: "L", overall: 5, at: "2026-10-06T12:00:00Z" });
    await addEntry(lena, { place: "L", overall: 5, at: "2026-09-06T12:00:00Z" }); // last month
    await addEntry(hidden, { place: "H", overall: 5, at: "2026-10-06T12:00:00Z" });
    await addEntry(stranger, { place: "F", overall: 5, at: "2026-10-06T12:00:00Z" });

    const ranking = await monthlyRanking(me, NOW);
    expect(ranking.map((r) => [r.name, r.count, r.avgOverall, r.rank, r.isMe])).toEqual([
      ["Tim", 3, 3, 1, false],
      ["Lena", 2, 5, 2, false],
      ["Niklas", 2, 4, 3, true],
    ]);
  });
});

describe("feed and privacy", () => {
  it("shows sharing friends' entries and tagged entries, newest first", async () => {
    const me = await makeUser("Niklas");
    const lena = await makeUser("Lena");
    const shy = await makeUser("Schüchtern", { visibleToFriends: false });
    await befriend(me, lena);
    await befriend(me, shy);
    await addEntry(lena, { place: "Bosporus Grill", overall: 5, at: "2026-10-27T10:00:00Z", companions: [me] });
    await addEntry(lena, { place: "Bosporus Grill", overall: 4, at: "2026-10-20T10:00:00Z" });
    await addEntry(shy, { place: "Geheim", overall: 4, at: "2026-10-26T10:00:00Z" });
    await addEntry(shy, { place: "Mit dir", overall: 4, at: "2026-10-25T10:00:00Z", companions: [me] });

    const { items } = await friendFeed(me);
    expect(items.map((i) => [i.userName, i.placeName, i.withMe, i.newSpot])).toEqual([
      ["Lena", "Bosporus Grill", true, false],
      ["Schüchtern", "Mit dir", true, true],
      ["Lena", "Bosporus Grill", false, true],
    ]);
  });

  it("hides exact GPS from friends and blocks strangers", async () => {
    const me = await makeUser("Niklas");
    const lena = await makeUser("Lena");
    const stranger = await makeUser("Fremd");
    await befriend(me, lena);
    const id = await addEntry(me, { place: "Bosporus Grill", overall: 5, at: "2026-10-27T10:00:00Z" });

    const own = await getEntryForViewer(me, id);
    expect(own?.entry.lat).not.toBeNull();
    const friendView = await getEntryForViewer(lena, id);
    expect(friendView?.entry.lat).toBeNull();
    expect(friendView?.entry.accuracyM).toBeNull();
    expect(await getEntryForViewer(stranger, id)).toBeNull();
  });

  it("aggregates map places for me and friends", async () => {
    const me = await makeUser("Niklas");
    const lena = await makeUser("Lena");
    await befriend(me, lena);
    await addEntry(me, { place: "Bosporus Grill", overall: 5, at: "2026-10-27T10:00:00Z" });
    await addEntry(lena, { place: "Bosporus Grill", overall: 4, at: "2026-10-26T10:00:00Z" });
    await addEntry(lena, { place: "Efe Grill", overall: 3, at: "2026-10-26T10:00:00Z", lat: 50.95 });
    const places = await mapPlaces(me);
    const bosporus = places.find((p) => p.name === "Bosporus Grill")!;
    expect(bosporus).toMatchObject({ myCount: 1, friendCount: 1, avg: 4.5, friendNames: ["Lena"] });
    expect(places.find((p) => p.name === "Efe Grill")).toMatchObject({ myCount: 0, myLastEntryId: null });
  });
});

describe("friend requests", () => {
  it("requests, finds and accepts", async () => {
    const me = await makeUser("Niklas");
    const tim = await makeUser("Tim");
    expect(await requestFriendship(tim, me)).toBe("outgoing");
    const results = await searchUsers(me, "tim");
    expect(results[0]).toMatchObject({ id: tim, relation: "incoming" });
    const [request] = await incomingRequests(me);
    expect(request).toMatchObject({ id: tim, entryCount: 0 });
    await respondToRequest(me, request!.requestId, true);
    expect((await searchUsers(me, "tim"))[0]!.relation).toBe("friends");
  });

  it("accepts automatically when both sides request", async () => {
    const me = await makeUser("Niklas");
    const tim = await makeUser("Tim");
    await requestFriendship(tim, me);
    expect(await requestFriendship(me, tim)).toBe("friends");
  });
});
