import { useMemo, useState } from "preact/hooks";
import { BAND_LABEL, bandFor } from "../../shared/price";
import { slugify } from "../../shared/slug";
import type { Place, Rating, SectionId, VegKind } from "../../shared/types";
import { moods, places, sections } from "../data";
import { PhotoGrid, api } from "./PhotoPicker";
import "./picker.css";

/** Dev-only: add a restaurant to the site. Search Google, check the pre-filled details, price it, pick photos, save. */

interface Found { placeId: string; name: string; address: string; lat: number | null; lng: number | null; distanceKm: number | null; closed: boolean; maps: string | null }
interface Details { name: string; address: string; distanceKm: number | null; closed: boolean; googleMapsUrl: string | null; rating: Rating | null; priceLevel: string | null; type: string | null; servesVeg: boolean | null }

const VEG: { id: VegKind; label: string }[] = [
  { id: "pure", label: "Pure veg" },
  { id: "both", label: "Veg & non-veg" },
  { id: "options", label: "Veg options (not sure)" },
];

/** "Salt - Indian Restaurant Gachibowli" -> a short name to search Swiggy with. */
const shortName = (n: string) => n.replace(/\s*[–|:(-].*$/, "").trim() || n;

export function AddRestaurant() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Found[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [chosen, setChosen] = useState<Found | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ used: number; cap: number } | null>(null);

  // the form
  const [name, setName] = useState("");
  const [searchName, setSearchName] = useState("");
  const [section, setSection] = useState<SectionId>("new");
  const [cuisine, setCuisine] = useState("");
  const [moodIds, setMoodIds] = useState<string[]>([]);
  const [veg, setVeg] = useState<VegKind>("options");
  const [rating, setRating] = useState<Rating | null>(null);
  const [dining, setDining] = useState("");
  const [mealPrice, setMealPrice] = useState("");
  const [source, setSource] = useState("");
  const [confidence, setConfidence] = useState<"menu" | "estimate">("estimate");
  const [note, setNote] = useState("");
  const [flag, setFlag] = useState("");
  const [tried, setTried] = useState(false);
  const [swiggy, setSwiggy] = useState("");
  const [zomato, setZomato] = useState("");
  const [mapsUrl, setMapsUrl] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);
  const [picks, setPicks] = useState<number[]>([]);
  const [hint, setHint] = useState<Details | null>(null);

  const meal = Number(mealPrice) || null;
  const band = bandFor(meal);
  const priceSection = section === "budget" || section === "mid" || section === "premium";
  const slug = useMemo(() => slugify(searchName || name), [searchName, name]);
  const slugTaken = places.some((p) => p.id === slug);

  const search = async (text = q) => {
    if (!text.trim()) return;
    setBusy(true); setError(null);
    try { setResults((await api<{ results: Found[] }>(`/api/dev/search?q=${encodeURIComponent(text)}`)).results); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  const choose = async (f: Found) => {
    setChosen(f); setError(null); setErrors([]); setSaved(null); setPicks([]);
    const dup = places.find((p) => p.googleMapsUrl && f.maps && f.maps.includes(p.googleMapsUrl.split("cid=")[1] ?? "~"));
    if (dup) setError(`This looks like ${dup.name}, which is already on the site.`);
    setName(shortName(f.name)); setSearchName(shortName(f.name)); setClosed(f.closed);
    try {
      const d = await api<Details>(`/api/dev/add/details?placeId=${encodeURIComponent(f.placeId)}`);
      setHint(d); setRating(d.rating); setMapsUrl(d.googleMapsUrl); setClosed(d.closed);
      if (d.type && !cuisine) setCuisine(d.type.replace(/\s*restaurant$/i, ""));
      if (d.servesVeg === true) setVeg("options");
    } catch (e) { setError((e as Error).message); }
  };

  const useBandSection = () => { if (band) setSection(band); };

  const save = async () => {
    if (!chosen) return;
    setBusy(true); setErrors([]); setError(null);
    const place: Partial<Place> = {
      name, searchName, section, cuisine, moods: moodIds, veg, rating, price: dining || null, note: note || null, flag: flag || null, closed,
      googleMapsUrl: mapsUrl, swiggyUrl: swiggy || null, zomatoUrl: zomato || null, triedByShivang: tried,
      mealPrice: meal, priceSource: source || null, priceConfidence: meal ? confidence : null,
    };
    try {
      const r = await fetch("/api/dev/add/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ placeId: chosen.placeId, googleName: chosen.name, address: chosen.address, lat: chosen.lat, lng: chosen.lng, closedOnGoogle: closed, picks, place }) });
      const body = await r.json();
      if (!r.ok) setErrors(body.errors ?? [body.error ?? `HTTP ${r.status}`]);
      else { setSaved(body.id); setChosen(null); setResults(null); setQ(""); }
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <main class="pp add">
      <h1>Add a restaurant <small>/dev/add · local only</small></h1>
      <p class="pp-intro">
        Search Google, check the details, price it from its delivery menu, pick photos, save. It is written into <code>data/places.json</code> and the photo files with the
        same checks as every other place. Afterwards commit and push (or ask Claude to) and Vercel updates the site.
      </p>

      {saved && (
        <div class="pp-ok" role="status">
          Added <b>{saved}</b>. Open <a href={`/?p=${saved}`} target="_blank" rel="noopener">its page</a> to see it, then commit and push when you're happy.
        </div>
      )}

      {!chosen && (
        <section>
          <form class="add-search" onSubmit={(e) => { e.preventDefault(); void search(); }}>
            <input value={q} onInput={(e) => setQ((e.currentTarget as HTMLInputElement).value)} placeholder="Restaurant name and area, e.g. Paradise Biryani Gachibowli" aria-label="Search Google Maps" autofocus />
            <button type="submit" disabled={busy || !q.trim()}>{busy ? "Searching…" : "Search"}</button>
          </form>
          {error && <p class="pp-error">{error}</p>}
          <ul class="add-results">
            {(results ?? []).map((f) => {
              const onSite = places.some((p) => p.googleMapsUrl && f.maps && f.maps.includes(p.googleMapsUrl.split("cid=")[1] ?? "~"));
              return (
                <li key={f.placeId}>
                  <div><b>{f.name}</b>{f.closed && <span class="pp-tag warn">closed on Google</span>}{onSite && <span class="pp-tag approved">already on the site</span>}
                    <small>{f.address}{f.distanceKm !== null ? ` · ${f.distanceKm} km from Manikonda` : ""}</small></div>
                  <a href={f.maps ?? "#"} target="_blank" rel="noopener">Open in Maps</a>
                  <button type="button" onClick={() => choose(f)}>Add this</button>
                </li>
              );
            })}
            {results && !results.length && <li class="pp-empty">No results. Try the name plus the area.</li>}
          </ul>
        </section>
      )}

      {chosen && (
        <section class="add-form">
          <p class="pp-matched">Google: <b>{chosen.name}</b> · {chosen.address}{hint?.distanceKm != null ? ` · ${hint.distanceKm} km` : ""} · <button type="button" class="pp-link" onClick={() => setChosen(null)}>Pick a different one</button></p>
          {error && <p class="pp-error">{error}</p>}

          <fieldset>
            <legend>Basics</legend>
            <label>Name shown on the site<input value={name} onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)} /></label>
            <label>Name used to search Swiggy and Google<input value={searchName} onInput={(e) => setSearchName((e.currentTarget as HTMLInputElement).value)} /></label>
            <p class="hint">Page address will be <code>/?p={slug || "…"}</code>{slugTaken && " (taken, a number will be added)"}</p>
            <label>Cuisine (a few words)<input value={cuisine} placeholder="e.g. Hyderabadi biryani" onInput={(e) => setCuisine((e.currentTarget as HTMLInputElement).value)} /></label>
            <div class="chipset" role="group" aria-label="Moods">
              {moods.map((m) => <button key={m.id} type="button" class="chip" aria-pressed={moodIds.includes(m.id)} onClick={() => setMoodIds((l) => l.includes(m.id) ? l.filter((x) => x !== m.id) : [...l, m.id])}>{m.short}</button>)}
            </div>
            <div class="chipset" role="group" aria-label="Veg label">
              {VEG.map((v) => <button key={v.id} type="button" class="chip" aria-pressed={veg === v.id} onClick={() => setVeg(v.id)}>{v.label}</button>)}
            </div>
            <label class="inline"><input type="checkbox" checked={tried} onChange={(e) => { const on = (e.currentTarget as HTMLInputElement).checked; setTried(on); if (!on && !priceSection) setSection("new"); }} /> Shivang has ordered from here</label>
          </fieldset>

          <fieldset>
            <legend>Price</legend>
            <p class="hint">Use the <b>delivery menu</b> on Swiggy/Zomato: what a typical veg main meal for one costs (a thali, or one paneer dish with bread or rice). Ordering and dining-out prices differ.</p>
            <label>Veg meal for one, ₹<input type="number" min="1" value={mealPrice} onInput={(e) => setMealPrice((e.currentTarget as HTMLInputElement).value)} /></label>
            <p class="bandline">{band ? <>Band: <b class={`pband ${band}`}>{BAND_LABEL[band]}</b></> : "Band appears once you enter a price."}{hint?.priceLevel && <small> · Google's price level: {hint.priceLevel.replace("PRICE_LEVEL_", "").toLowerCase()}</small>}</p>
            <label>Where the price came from<input value={source} placeholder="e.g. Zomato delivery menu: veg thali ₹240" onInput={(e) => setSource((e.currentTarget as HTMLInputElement).value)} /></label>
            <div class="chipset" role="group" aria-label="Confidence">
              {(["menu", "estimate"] as const).map((c) => <button key={c} type="button" class="chip" aria-pressed={confidence === c} onClick={() => setConfidence(c)}>{c === "menu" ? "Seen on a menu" : "My estimate"}</button>)}
            </div>
            <label>Dining-out price, if known (optional)<input value={dining} placeholder="e.g. ₹400–600 per person" onInput={(e) => setDining((e.currentTarget as HTMLInputElement).value)} /></label>
          </fieldset>

          <fieldset>
            <legend>Where it appears</legend>
            <label>Section
              <select value={section} onChange={(e) => setSection((e.currentTarget as HTMLSelectElement).value as SectionId)}>
                {sections.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </label>
            {band && priceSection && section !== band && <p class="pp-error">{BAND_LABEL[section as "budget" | "mid" | "premium"]} only holds {BAND_LABEL[section as "budget" | "mid" | "premium"]} places, but this one is {BAND_LABEL[band]}. <button type="button" class="pp-link" onClick={useBandSection}>Use {BAND_LABEL[band]}</button></p>}
            {!band && priceSection && <p class="pp-error">Budget, Mid-range and Premium need a meal price.</p>}
            <p class="hint">Tried-by-Shivang places usually go in Best offers or a price row; suggestions go in New to try.</p>
          </fieldset>

          <fieldset>
            <legend>Details (all optional)</legend>
            <label>One-line note<input value={note} maxLength={160} onInput={(e) => setNote((e.currentTarget as HTMLInputElement).value)} /></label>
            <label>"Good to know" warning<input value={flag} maxLength={200} onInput={(e) => setFlag((e.currentTarget as HTMLInputElement).value)} /></label>
            <label>Swiggy link<input value={swiggy} placeholder="https://www.swiggy.com/…" onInput={(e) => setSwiggy((e.currentTarget as HTMLInputElement).value)} /></label>
            <label>Zomato link<input value={zomato} placeholder="https://www.zomato.com/hyderabad/…" onInput={(e) => setZomato((e.currentTarget as HTMLInputElement).value)} /></label>
            <label class="inline"><input type="checkbox" checked={closed} onChange={(e) => setClosed((e.currentTarget as HTMLInputElement).checked)} /> Closed on Google (shows "check app")</label>
            {rating && <p class="hint">Rating from Google: {rating.value.toFixed(1)} ★ ({rating.count}) <button type="button" class="pp-link" onClick={() => setRating(null)}>Remove</button></p>}
          </fieldset>

          <fieldset>
            <legend>Photos</legend>
            <PhotoGrid place={{ id: slug || "new", name }} placeId={chosen.placeId} persist={false} picks={picks} onPicks={setPicks} onUsage={(used, cap) => setUsage({ used, cap })} />
            {usage && <p class="hint">Photo requests today: {usage.used}/{usage.cap}</p>}
          </fieldset>

          {errors.length > 0 && <div class="pp-alert" role="alert"><b>Not saved:</b><ul>{errors.map((e) => <li key={e}>{e}</li>)}</ul></div>}
          <div class="add-actions">
            <button type="button" class="save" disabled={busy || !name.trim()} onClick={save}>{busy ? "Saving…" : "Save to the site"}</button>
            <small>{picks.length ? `${picks.length} photo${picks.length > 1 ? "s" : ""} picked.` : "No photos picked: the card will use Google's first photo order, or a generated card."}</small>
          </div>
        </section>
      )}
    </main>
  );
}
