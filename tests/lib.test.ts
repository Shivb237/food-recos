import { describe, expect, it } from "vitest";
import raw from "../data/places.json";
import { placesFileSchema } from "../shared/schema";
import type { Place } from "../shared/types";
import { buildIndex, searchPlaces } from "../src/lib/search";
import { buildUrl, parseLocation } from "../src/lib/router";
import { pickRandom } from "../src/lib/pick";
import { swiggyLink, zomatoLink } from "../src/lib/links";

const file = placesFileSchema.parse(raw);
const index = buildIndex(file.places, file.moods, file.sections);
const find = (q: string) => searchPlaces(index, q).map((p) => p.id);
const byId = (id: string) => file.places.find((p) => p.id === id)!;

describe("search", () => {
  it("returns everything for an empty query", () => {
    expect(find("")).toHaveLength(file.places.length);
  });
  it("finds names without punctuation or case", () => {
    expect(find("HALDIRAMS")).toEqual(["haldirams"]);
    expect(find("haldiram's")).toEqual(["haldirams"]);
  });
  it("finds by cuisine and mood", () => {
    expect(find("dosa")).toContain("millet-express");
    expect(find("biryani")).toEqual(expect.arrayContaining(["raju-gari-biryani", "biryani-by-kilo", "1881-dum-house"]));
  });
  it("ranks a name match above a cuisine match", () => {
    const r = find("punjabi");
    expect(r.indexOf("balle-balle-punjabi")).toBeLessThan(r.indexOf("salt"));
  });
  it("requires every word to match", () => {
    expect(find("biryani zzz")).toEqual([]);
  });
  it("understands veg words", () => {
    expect(find("pure veg")).toContain("amrutham-pure-vegetarian");
    expect(find("non veg")).toContain("raju-gari-biryani");
    expect(find("non veg")).not.toContain("rajthali");
  });
});

describe("router", () => {
  it("round-trips every kind of location", () => {
    const locs = [
      { route: { view: "home" as const }, place: null },
      { route: { view: "mood" as const, id: "biryani" }, place: null },
      { route: { view: "section" as const, id: "best" }, place: "rajthali" },
      { route: { view: "search" as const, q: "dosa idli" }, place: null },
    ];
    for (const l of locs) {
      const url = new URL(buildUrl(l), "https://x.test");
      expect(parseLocation(url.pathname, url.search)).toEqual(l);
    }
  });
  it("ignores a malformed place parameter", () => {
    expect(parseLocation("/", "?p=<script>").place).toBeNull();
  });
});

describe("pick", () => {
  it("never picks a closed place or the previous pick", () => {
    const pool = [byId("norfest-the-dhaba"), byId("salt"), byId("rajthali")];
    for (let i = 0; i < 50; i++) {
      const p = pickRandom(pool, "salt")!;
      expect(p.id).toBe("rajthali");
    }
  });
  it("still picks when only one open place exists", () => {
    expect(pickRandom([byId("salt")], "salt")?.id).toBe("salt");
  });
  it("returns null when nothing is open", () => {
    expect(pickRandom([byId("norfest-the-dhaba")], null)).toBeNull();
  });
});

describe("order links", () => {
  it("uses the clean search name, not the display name", () => {
    expect(swiggyLink(byId("mojo-pizza"))).toBe("https://www.swiggy.com/search?query=MOJO%20Pizza");
    expect(zomatoLink(byId("tadka-treats"))).toContain(encodeURIComponent("Tadka Treats Hyderabad"));
  });
  it("prefers a stored real URL", () => {
    const p: Place = { ...byId("salt"), swiggyUrl: "https://www.swiggy.com/restaurants/salt-1", zomatoUrl: "https://www.zomato.com/hyderabad/salt" };
    expect(swiggyLink(p)).toBe("https://www.swiggy.com/restaurants/salt-1");
    expect(zomatoLink(p)).toBe("https://www.zomato.com/hyderabad/salt");
  });
});
