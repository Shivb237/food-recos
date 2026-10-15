import { useEffect, useMemo, useState } from "preact/hooks";
import type { PlaceIdEntry } from "../../shared/placeIds";
import type { Place } from "../../shared/types";
import { places, sectionById } from "../data";
import "./picker.css";

/** Dev-only: choose the food photo for each place and fix weak Google matches. Saves into data/*.json via /api/dev/*. */

interface DevState {
  ids: Record<string, PlaceIdEntry>;
  review: Record<string, { query?: string }>;
  picks: Record<string, number[]>;
  hasKey: boolean;
  pickerUsed: number;
  pickerCap: number;
}
interface Failure { index: number; status: number; reason: string }
interface PhotosResponse { photos: Thumb[]; failed: Failure[]; total: number; used: number; cap: number }
interface Thumb { index: number; uri: string; author: string; authorUri: string | null }
interface Found { placeId: string; name: string; address: string; lat: number | null; lng: number | null; distanceKm: number | null; closed: boolean; maps: string | null }

const MAX_PICKS = 4;
const mapsLink = (placeId: string) => `https://www.google.com/maps/place/?q=place_id:${placeId}`;

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, body === undefined ? undefined : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  return data as T;
}

type Kind = "approved" | "weak" | "none";
const kindOf = (e?: PlaceIdEntry): Kind => (!e ? "none" : e.approved ? "approved" : "weak");
const LABEL: Record<Kind, string> = { approved: "Matched", weak: "Needs review", none: "No match" };

function MatchPanel({ place, query, onChosen }: { place: Place; query: string; onChosen: (e: PlaceIdEntry | null) => void }) {
  const [q, setQ] = useState(query);
  const [results, setResults] = useState<Found[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const search = async (text = q) => {
    setBusy(true);
    setError(null);
    try {
      setResults((await api<{ results: Found[] }>(`/api/dev/search?q=${encodeURIComponent(text)}`)).results);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => { void search(query); }, []);

  const choose = async (f: Found | null) => {
    try {
      const r = await api<{ entry: PlaceIdEntry | null }>("/api/dev/match", f ? { id: place.id, placeId: f.placeId, name: f.name, address: f.address, lat: f.lat, lng: f.lng, closed: f.closed } : { id: place.id, placeId: null });
      onChosen(r.entry);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div class="pp-match-panel">
      <form onSubmit={(e) => { e.preventDefault(); void search(); }}>
        <input value={q} onInput={(e) => setQ((e.currentTarget as HTMLInputElement).value)} aria-label="Search Google Maps" placeholder="Search Google Maps, e.g. Bihari Bowl Gachibowli" />
        <button type="submit" disabled={busy}>{busy ? "Searching…" : "Search"}</button>
      </form>
      {error && <p class="pp-error">{error}</p>}
      <ul>
        {(results ?? []).map((f) => (
          <li key={f.placeId}>
            <div>
              <b>{f.name}</b>{f.closed && <span class="pp-tag warn">closed on Google</span>}
              <small>{f.address}{f.distanceKm !== null ? ` · ${f.distanceKm} km from Manikonda` : ""}</small>
            </div>
            <a href={f.maps ?? mapsLink(f.placeId)} target="_blank" rel="noopener">Open in Maps</a>
            <button type="button" onClick={() => choose(f)}>Use this</button>
          </li>
        ))}
        {results && !results.length && !busy && <li class="pp-empty">No results.</li>}
      </ul>
      <button type="button" class="pp-none" onClick={() => choose(null)}>None of these: this place has no Google listing</button>
    </div>
  );
}

/**
 * Photo choices for one place. `placeId` loads photos for a Google place that isn't in the site yet (the add page);
 * `persist` false keeps the picks local until the page saves everything together.
 */
export function PhotoGrid({ place, picks, onPicks, onUsage, placeId, persist = true }: { place: { id: string; name: string }; picks: number[]; onPicks: (p: number[]) => void; onUsage: (used: number, cap: number) => void; placeId?: string; persist?: boolean }) {
  const [thumbs, setThumbs] = useState<Thumb[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [failed, setFailed] = useState<Failure[]>([]);
  const [total, setTotal] = useState(0);

  /** Load all photos, or only the `only` positions again (a retry after Google refused some). */
  const load = async (only?: number[]) => {
    setBusy(true);
    setError(null);
    try {
      const r = await api<PhotosResponse>(`/api/dev/photos?${placeId ? `placeId=${encodeURIComponent(placeId)}` : `id=${place.id}`}&w=360${only ? `&only=${only.join(",")}` : ""}`);
      setThumbs((prev) => [...(only ? (prev ?? []).filter((t) => !only.includes(t.index)) : []), ...r.photos].sort((a, b) => a.index - b.index));
      setFailed(r.failed);
      setTotal(r.total);
      onUsage(r.used, r.cap);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (index: number) => {
    let next: number[];
    if (picks.includes(index)) next = picks.filter((i) => i !== index);
    else if (picks.length >= MAX_PICKS) return setNote(`At most ${MAX_PICKS} picks. Un-pick one first.`);
    else next = [...picks, index];
    setNote(null);
    onPicks(next);
    if (!persist) return;
    try {
      await api("/api/dev/picks", { id: place.id, picks: next });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (!thumbs)
    return (
      <div class="pp-load">
        <button type="button" onClick={() => load()} disabled={busy}>{busy ? "Loading… (waits if Google rate-limits)" : "Load photos"}</button>
        <small>Uses up to 10 photo requests (about $0.07, inside the 1,000 a month that are free).</small>
        {picks.length > 0 && <small>Saved picks: positions {picks.map((i) => i + 1).join(", ")}</small>}
        {error && <p class="pp-error">{error}</p>}
      </div>
    );

  const dailyLimit = failed.some((f) => /DAILY/.test(f.reason));
  const rateLimited = failed.some((f) => f.status === 429) && !dailyLimit;
  return (
    <div>
      {failed.length > 0 && (
        <div class="pp-alert" role="alert">
          <b>{failed.length} of {total} photos didn't load.</b>{" "}
          {dailyLimit ? "Your daily photo quota in Google Cloud is used up. Raise it under APIs & Services → Places API (New) → Quotas (Place Photos), then retry. " : rateLimited ? "Google's per-minute photo limit was hit, even after waiting. " : ""}
          {[...new Set(failed.map((f) => f.reason))].join("; ")}.{" "}
          {rateLimited ? "Wait a minute, then retry. " : ""}
          <button type="button" onClick={() => load(failed.map((f) => f.index))} disabled={busy}>{busy ? "Retrying…" : `Retry the missing ${failed.length}`}</button>
        </div>
      )}
      <ul class="pp-grid">
        {thumbs.map((t) => {
          const order = picks.indexOf(t.index);
          return (
            <li key={t.index}>
              <button type="button" class={order >= 0 ? "picked" : ""} aria-pressed={order >= 0} onClick={() => toggle(t.index)} title={t.author}>
                <img src={t.uri} alt={`Photo ${t.index + 1} of ${place.name}`} referrerpolicy="no-referrer" loading="lazy" />
                <span class="pp-pos">{t.index + 1}</span>
                {order >= 0 && <span class="pp-order">{order === 0 ? "Card" : `#${order + 1}`}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <p class="pp-hint">
        {picks.length ? `${persist ? "Saved. " : ""}First pick (${picks[0]! + 1}) is the card photo; picks lead the sheet gallery.` : "Click the food shots, best first. The first pick becomes the card photo."}
        {picks.length > 0 && <button type="button" class="pp-link" onClick={() => { onPicks([]); if (persist) void api("/api/dev/picks", { id: place.id, picks: [] }); }}>Clear picks</button>}
      </p>
      {note && <p class="pp-error">{note}</p>}
      {error && <p class="pp-error">{error}</p>}
    </div>
  );
}

function Row({ place, entry, review, picks, onEntry, onPicks, onUsage }: { onUsage: (used: number, cap: number) => void; place: Place; entry?: PlaceIdEntry; review?: { query?: string }; picks: number[]; onEntry: (e: PlaceIdEntry | null) => void; onPicks: (p: number[]) => void }) {
  const kind = kindOf(entry);
  const [panel, setPanel] = useState(kind !== "approved");
  return (
    <article class={`pp-row ${kind}`}>
      <header>
        <h2>{place.name}</h2>
        <span class="pp-tag">{sectionById[place.section].title}</span>
        <span class={`pp-tag ${kind}`}>{LABEL[kind]}{entry && entry.status !== "weak" ? ` · ${entry.status}` : ""}</span>
        {entry?.closedOnGoogle && <span class="pp-tag warn">closed on Google</span>}
      </header>
      {entry ? (
        <p class="pp-matched">
          Google: <b>{entry.matchedName || "(unnamed)"}</b>{entry.address ? ` · ${entry.address}` : ""}{entry.distanceKm >= 0 ? ` · ${entry.distanceKm} km` : ""}{" "}
          <a href={mapsLink(entry.placeId)} target="_blank" rel="noopener">Open in Maps</a>
        </p>
      ) : (
        <p class="pp-matched">No Google listing chosen. This place shows a generated card.</p>
      )}
      {kind === "approved" && <PhotoGrid place={place} picks={picks} onPicks={onPicks} onUsage={onUsage} />}
      <button type="button" class="pp-link" onClick={() => setPanel(!panel)}>{panel ? "Hide match search" : kind === "approved" ? "Wrong place? Change match" : "Find the right place"}</button>
      {panel && <MatchPanel place={place} query={review?.query ?? `${place.searchName} Hyderabad`} onChosen={(e) => { onEntry(e); setPanel(false); }} />}
    </article>
  );
}

export function PhotoPicker() {
  const [state, setState] = useState<DevState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "review" | "unpicked">("all");

  useEffect(() => {
    api<DevState>("/api/dev/state").then(setState, (e) => setError(String(e.message ?? e)));
  }, []);

  const counts = useMemo(() => {
    if (!state) return { approved: 0, review: 0, picked: 0 };
    const kinds = places.map((p) => kindOf(state.ids[p.id]));
    return { approved: kinds.filter((k) => k === "approved").length, review: kinds.filter((k) => k !== "approved").length, picked: places.filter((p) => state.picks[p.id]?.length).length };
  }, [state]);

  if (error) return <main class="pp"><h1>Photo picker</h1><p class="pp-error">{error}</p></main>;
  if (!state) return <main class="pp"><p>Loading…</p></main>;

  const visible = places.filter((p) => {
    const kind = kindOf(state.ids[p.id]);
    return filter === "all" || (filter === "review" ? kind !== "approved" : kind === "approved" && !state.picks[p.id]?.length);
  });
  const patch = (fn: (s: DevState) => DevState) => setState((s) => (s ? fn(s) : s));

  return (
    <main class="pp">
      <h1>Photo picker <small>/dev/photos · local only</small></h1>
      <p class="pp-intro">
        Pick the food shot for each place. Google lists a place's photos in its own order and doesn't say which show food, so your picks are saved as
        positions in that list (<code>data/photo-picks.json</code>). If a card ever looks wrong later, come back here and re-pick. Reload the app tab to see changes there.
      </p>
      {!state.hasKey && <p class="pp-error">No GOOGLE_MAPS_API_KEY found in .env.local, so photos and search won't load.</p>}
      <div class="pp-bar">
        <span><b>{counts.approved}</b> matched · <b>{counts.review}</b> need a look · <b>{counts.picked}</b> with picks · photo requests today <b class={state.pickerUsed > state.pickerCap * 0.8 ? "pp-warn" : ""}>{state.pickerUsed}/{state.pickerCap}</b></span>
        <div class="pp-seg" role="group" aria-label="Filter">
          {([["all", "All"], ["review", "Needs review"], ["unpicked", "No pick yet"]] as const).map(([k, label]) => (
            <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>{label}</button>
          ))}
        </div>
      </div>
      {visible.map((p) => (
        <Row
          key={p.id}
          place={p}
          entry={state.ids[p.id]}
          review={state.review[p.id]}
          picks={state.picks[p.id] ?? []}
          onEntry={(e) => patch((s) => { const ids = { ...s.ids }; if (e) ids[p.id] = e; else delete ids[p.id]; const picks = { ...s.picks }; delete picks[p.id]; return { ...s, ids, picks }; })}
          onPicks={(list) => patch((s) => ({ ...s, picks: { ...s.picks, [p.id]: list } }))}
          onUsage={(used, cap) => patch((s) => ({ ...s, pickerUsed: used, pickerCap: cap }))}
        />
      ))}
      {!visible.length && <p class="pp-empty">Nothing in this filter.</p>}
    </main>
  );
}
