import type { Place } from "../../shared/types";
import { sectionById } from "../data";
import { ART_H, ART_W, type CardDesign } from "./design";
import { Pattern } from "./patterns";
import { Sticker } from "./stickers";
import "./generated-card.css";

const RUPEE = ["₹", "₹", "₹"];

/** Font size in cqw: big for short names, smaller for long ones, and never so big that a single word overflows. */
function nameSize(name: string): string {
  const longest = Math.max(...name.split(/\s+/).map((w) => w.length));
  const byLength = name.length > 26 ? 8.4 : name.length > 18 ? 9.6 : name.length > 11 ? 11.5 : 13.5;
  const byWord = 62 / (longest * 0.6);
  return `${Math.max(7.4, Math.min(byLength, byWord)).toFixed(1)}cqw`;
}

/**
 * The picture for a place with no photo: a unique gradient, texture and stickers, with the name and
 * the facts someone needs to choose (cuisine, price tier, section, closed warning).
 * The veg badge and rating chip are drawn by the surrounding frame, as they are over a photo.
 */
export function GeneratedCard({ place, design, artOnly = false }: { place: Place; design: CardDesign; artOnly?: boolean }) {
  const text = `gc-text ${design.layout}`;
  return (
    <div
      class={`gc ${artOnly ? "art-only" : ""}`}
      style={{ "--c1": design.c1, "--c2": design.c2, "--angle": `${design.angle}deg` } as Record<string, string>}
      data-layout={design.layout}
    >
      <svg class="gc-art" viewBox={`0 0 ${ART_W} ${ART_H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <Pattern design={design} />
        {design.stickers.map((s, i) => <Sticker key={i} {...s} />)}
      </svg>
      {!artOnly && <div class={`gc-scrim ${design.scrim}`} aria-hidden="true" />}
      {!artOnly && <div class={text}>
        <span class="gc-section">{sectionById[place.section].title}</span>
        <strong class="gc-name" style={{ fontSize: nameSize(place.name) }}>{place.name}</strong>
        <span class="gc-cuisine">{place.cuisine ?? "Delivery favourite"}</span>
        <span class="gc-facts">
          {place.priceTier && (
            <span class="gc-price" aria-label={`Price level ${place.priceTier} of 3`}>
              {RUPEE.map((r, i) => <span key={i} class={i < place.priceTier! ? "on" : ""}>{r}</span>)}
            </span>
          )}
          {place.closed && <span class="gc-warn">Check app</span>}
        </span>
      </div>}
    </div>
  );
}
