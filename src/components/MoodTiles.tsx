import { useState } from "preact/hooks";
import type { Mood } from "../../shared/types";
import { Sticker } from "../cards/stickers";
import { MOOD_ART } from "../moods";
import { Rail } from "./Rail";

function MoodTile({ mood, count, onPick }: { mood: Mood; count: number; onPick: (m: Mood) => void }) {
  const [broken, setBroken] = useState(false);
  const art = MOOD_ART[mood.id] ?? { hue: 30, sticker: "bowl" as const };
  return (
    <button
      class="mood"
      type="button"
      onClick={() => onPick(mood)}
      style={{ "--h": String(art.hue) } as Record<string, string>}
      title={mood.label}
    >
      <span class="mood-bg" aria-hidden="true">
        {broken ? (
          <svg viewBox="0 0 60 80" preserveAspectRatio="xMidYMid slice"><Sticker kind={art.sticker} x={34} y={30} size={46} rot={-10} /></svg>
        ) : (
          <img src={`/moods/${mood.id}.jpg`} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} />
        )}
      </span>
      <span class="mood-label">
        <b>{mood.short}</b>
        <small>{count} {count === 1 ? "place" : "places"}</small>
      </span>
    </button>
  );
}

export function MoodTiles({ moods, counts, onPick }: { moods: Mood[]; counts: Record<string, number>; onPick: (m: Mood) => void }) {
  return (
    <Rail label="Moods">
      {moods.map((m) => (
        <div class="rail-item mood-item" role="listitem" key={m.id}><MoodTile mood={m} count={counts[m.id] ?? 0} onPick={onPick} /></div>
      ))}
    </Rail>
  );
}
