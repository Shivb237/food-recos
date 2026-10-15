import type { Mood, Place, Section } from "../../shared/types";

export const normalise = (text: string) =>
  text.toLowerCase().replace(/['’]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();

const VEG_WORDS = {
  pure: "pure veg vegetarian",
  both: "veg non veg nonveg non-veg",
  options: "veg options",
} as const;

const BAND_WORDS = { budget: "budget cheap affordable", mid: "mid range midrange mid-range", premium: "premium expensive pricey fine dining" } as const;

export interface SearchIndex {
  entries: { place: Place; name: string; cuisine: string; rest: string }[];
}

export function buildIndex(places: Place[], moods: Mood[], sections: Section[]): SearchIndex {
  const moodText = new Map(moods.map((m) => [m.id, `${m.short} ${m.label}`]));
  const sectionTitle = new Map(sections.map((s) => [s.id, s.title]));
  return {
    entries: places.map((place) => ({
      place,
      name: normalise(place.name),
      cuisine: normalise(place.cuisine ?? ""),
      rest: normalise(
        [sectionTitle.get(place.section), ...place.moods.map((m) => moodText.get(m)), VEG_WORDS[place.veg], place.note, place.priceBand ? BAND_WORDS[place.priceBand] : ""].join(" "),
      ),
    })),
  };
}

/** Every word of the query must appear somewhere; name matches rank first, then cuisine, then the rest. */
export function searchPlaces(index: SearchIndex, query: string): Place[] {
  const words = normalise(query).split(" ").filter(Boolean);
  if (!words.length) return index.entries.map((e) => e.place);
  const scored: { place: Place; score: number }[] = [];
  for (const e of index.entries) {
    const all = `${e.name} ${e.cuisine} ${e.rest}`;
    if (!words.every((w) => all.includes(w))) continue;
    const score = words.every((w) => e.name.startsWith(w) || e.name.includes(` ${w}`))
      ? 0
      : words.every((w) => e.name.includes(w))
        ? 1
        : words.every((w) => `${e.name} ${e.cuisine}`.includes(w))
          ? 2
          : 3;
    scored.push({ place: e.place, score });
  }
  return scored
    .sort((a, b) => a.score - b.score || (b.place.rating?.value ?? 0) - (a.place.rating?.value ?? 0) || a.place.name.localeCompare(b.place.name))
    .map((s) => s.place);
}
