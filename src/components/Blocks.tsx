import type { Place, Section } from "../../shared/types";
import { PlaceCard } from "./PlaceCard";
import { Rail } from "./Rail";
import { IconChevron } from "./Icons";
import { SECTION_EYEBROW } from "../moods";

interface RowProps { places: Place[]; onOpen: (p: Place) => void; label: string }

export function PlaceRail({ places, onOpen, label }: RowProps) {
  return (
    <Rail label={label}>
      {places.map((p) => (
        <div class="rail-item" role="listitem" key={p.id}><PlaceCard place={p} onOpen={onOpen} /></div>
      ))}
    </Rail>
  );
}

/** A section of the home page: tinted header in the hero's hierarchy, then its row of cards. */
export function SectionBlock({ section, places, onOpen, onSeeAll }: { section: Section; places: Place[]; onOpen: (p: Place) => void; onSeeAll: () => void }) {
  return (
    <section class="block" style={{ "--c": `var(--c-${section.id})`, "--s": `var(--s-${section.id})` } as Record<string, string>} aria-labelledby={`sec-${section.id}`}>
      <header class="shead">
        <span class="eyebrow">{SECTION_EYEBROW[section.id] ?? section.title}</span>
        <h2 id={`sec-${section.id}`}>{section.title}</h2>
        <p>{section.sub}</p>
        {places.length > 3 && (
          <button class="seeall" type="button" onClick={onSeeAll}>See all {places.length}<IconChevron /></button>
        )}
      </header>
      <PlaceRail places={places} onOpen={onOpen} label={section.title} />
    </section>
  );
}

/** Simple titled row (Saved, Recently viewed). */
export function PersonalRow({ title, sub, places, onOpen, action }: { title: string; sub?: string; places: Place[]; onOpen: (p: Place) => void; action?: { label: string; run: () => void } }) {
  return (
    <section class="block personal" aria-label={title}>
      <header class="phead">
        <div><h2>{title}</h2>{sub && <p>{sub}</p>}</div>
        {action && <button class="textbtn" type="button" onClick={action.run}>{action.label}</button>}
      </header>
      <PlaceRail places={places} onOpen={onOpen} label={title} />
    </section>
  );
}
