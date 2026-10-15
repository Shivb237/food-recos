import { useEffect, useRef, useState } from "preact/hooks";
import { BANDS, BAND_LABEL, type PriceBand } from "../../shared/price";
import type { Mood, Place, Section } from "../../shared/types";
import { PlaceCard } from "./PlaceCard";
import { PickCard } from "./Hero";
import { IconBack, IconSearch } from "./Icons";

export interface ListProps {
  title: string;
  sub?: string;
  places: Place[];
  sections: Section[];
  /** Group results under section headings (mood pages and the empty search). */
  grouped: boolean;
  chips?: { moods: Mood[]; active: string; onSelect: (id: string) => void };
  search?: { q: string; onChange: (q: string) => void; suggestions: Mood[]; onSuggest: (m: Mood) => void };
  onBack: () => void;
  onOpen: (p: Place) => void;
  onPick: () => void;
}

export function ListView({ title, sub, places: allPlaces, sections, grouped, chips, search, onBack, onOpen, onPick }: ListProps) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (search) input.current?.focus(); }, []);

  const [band, setBand] = useState<PriceBand | null>(null);
  const places = band ? allPlaces.filter((p) => p.priceBand === band) : allPlaces;
  const count = `${places.length} ${places.length === 1 ? "place" : "places"}`;
  const groups = grouped
    ? sections.map((s) => ({ section: s, items: places.filter((p) => p.section === s.id) })).filter((g) => g.items.length)
    : [{ section: null, items: places }];

  return (
    <div class="listview">
      <div class="listhead">
        <div class="backrow">
          <button class="back" type="button" onClick={onBack} aria-label="Back"><IconBack /></button>
          <div>
            <h1 class="ltitle">{title}</h1>
            <p class="lsub" aria-live="polite">{sub ? `${sub} · ` : ""}{count}</p>
          </div>
        </div>
        {search && (
          <label class="searchfield">
            <IconSearch />
            <input
              ref={input}
              type="search"
              value={search.q}
              placeholder="Restaurant or cuisine, e.g. dosa"
              aria-label="Search restaurants"
              autocomplete="off"
              enterkeyhint="search"
              onInput={(e) => search.onChange((e.currentTarget as HTMLInputElement).value)}
            />
          </label>
        )}
        <div class="chips" role="group" aria-label="Price">
          <button class="chip" type="button" aria-pressed={band === null} onClick={() => setBand(null)}>Any price</button>
          {BANDS.map((b) => (
            <button key={b} class="chip" type="button" aria-pressed={band === b} onClick={() => setBand(band === b ? null : b)}>{BAND_LABEL[b]}</button>
          ))}
        </div>
        {chips && (
          <div class="chips" role="group" aria-label="Other moods">
            {chips.moods.map((m) => (
              <button key={m.id} class="chip" type="button" aria-pressed={m.id === chips.active} onClick={() => chips.onSelect(m.id)}>{m.short}</button>
            ))}
          </div>
        )}
        {search && !search.q && (
          <div class="chips" role="group" aria-label="Try a mood">
            {search.suggestions.map((m) => <button key={m.id} class="chip" type="button" onClick={() => search.onSuggest(m)}>{m.short}</button>)}
          </div>
        )}
      </div>

      {places.length === 0 ? (
        <div class="empty"><b>Nothing matches</b>Try a different word, like a cuisine (dosa, biryani) or a mood.</div>
      ) : (
        <>
          {places.some((p) => !p.closed) && <PickCard onPick={onPick} hint={`Pick one of these ${places.length} for me`} />}
          {groups.map((g) => (
            <section key={g.section?.id ?? "all"} class="group" style={g.section ? ({ "--c": `var(--c-${g.section.id})` } as Record<string, string>) : undefined}>
              {g.section && <h2 class="gtitle">{g.section.title}</h2>}
              <div class="grid">
                {g.items.map((p) => <PlaceCard key={p.id} place={p} onOpen={onOpen} />)}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
