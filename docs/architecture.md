# Target architecture (self-hosted)

Chosen by Shivang: **self-hosted site + Google Places API (New) photos.** Nothing here is built yet; this is the agreed plan.

## Stack

- **Frontend:** static HTML/CSS/JS (a framework is fine if Claude Code prefers one; keep the bundle small, mobile-first). Content from `data/places.json`.
- **Hosting:** Vercel (free tier). Functions under `/api`.
- **Photos:** Google Places API (New), called only from server functions so the key never reaches the browser.
- **Likes/comments:** Upstash Redis (free tier) over its REST API. If its env vars are missing, the API returns 501 and the UI hides social features.
- **Local dev:** a dev server that serves the site and the API, with a mock mode (placeholder images, in-memory store) when keys are absent.

## Env vars

| Name | Purpose |
|---|---|
| `GOOGLE_MAPS_API_KEY` | Places API (New). Restrict the key to that API. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Likes and comments. |
| `ADMIN_TOKEN` (optional) | Lets Shivang delete anyone's comment. |

## `/api/photo?id=<slug>&n=1&w=480` (card) or `&n=4&w=960` (gallery)

1. Reject names not in `places.json` (stops anyone burning the quota with arbitrary queries).
2. **Resolve the place ID** with Text Search, field mask `places.id` only (the "IDs only" SKU has an unlimited free tier). Bias to Manikonda: circle centre 17.4049, 78.3866, radius ~15 km. Allow a per-place `query` override in data for chains or ambiguous names. **Place IDs may be cached indefinitely**, so store them (in memory, Redis, or a generated JSON).
3. **Place Details** `GET https://places.googleapis.com/v1/places/{id}` with `X-Goog-FieldMask: photos,googleMapsUri`.
4. For the first `n` photos: `GET https://places.googleapis.com/v1/{photo.name}/media?maxWidthPx=W&skipHttpRedirect=true&key=…` returns `{ name, photoUri }`.
5. Respond `{ photos: [{ uri, author, authorUri }], mapsUri }`. The browser loads `photoUri` directly.

### Google's rules that shape this

- **Photo names cannot be cached.** Always get them from a fresh Details/Search response (Places photo docs, citing Maps Platform ToS §3.2.3(b)).
- **Author attribution is required wherever a photo is shown** when `authorAttributions` is non-empty: show `displayName`, linked to `uri` where possible (the details sheet). Add a "Photos from Google Maps" credit.
- Don't store photo bytes or re-host them. Show them live.

### Cost (checked 15 Oct 2026, Google Maps Platform pricing page)

- Text Search Essentials (IDs only): free, no cap.
- **Place Details Photos (Enterprise): 1,000 free per month, then $7 per 1,000** (cheaper at higher volumes).
- Every photo shown needs a fresh Details call plus a media call, so **lazy-load photos only for cards on screen**, share one request per place within a page view, and fetch the 4-photo gallery only when a details sheet opens.
- Set a **daily quota cap** on the Places API in Google Cloud so a spike can't bill beyond what Shivang wants, plus a budget alert.

### Photo speed and quotas (Oct 2026)

Each place needs one free "Place Details" lookup plus one billed photo download, and a page shows about 10 places, so without caching every visit cost about 10 lookups. A 300-a-day lookup quota ran out within about 30 visits, and cards then fell back to generated art. Fixes: `/api/photo` answers are cached by Vercel's shared cache for `PHOTO_CACHE_SECONDS` (default 12 h), so Google is asked about once per place per half-day; the app retries failures later, never sticks on a skeleton (4.5 s max), and asks for a `fresh` link if a cached image link has gone stale (limited to 3 per place per hour). Only those two request shapes are accepted, because every distinct address is its own cache entry; partial answers are never cached; a per-day Google quota stops the app asking for 10 minutes. Judgment call: this caches Google's temporary `photoUri`, not photo names or image bytes; set `PHOTO_CACHE_SECONDS=0` to turn it off. Quotas to set: Place Details per day 3,000+ (free for us), per minute 300; Place Photos per day about 200, per minute 120.

### Notes from the build (Oct 2026)

- Place Details with field mask `photos` only is the free "IDs only" tier; adding `googleMapsUri` makes it Pro. The handler asks for `photos` only.
- The project allows 30 Text Search requests a minute; `scripts/resolve-place-ids.ts` paces itself under that.
- The daily photo cap is enforced by `server/kv.ts` (`INCRBY` on `photo-cap:<UTC date>`). Without Upstash it is an in-memory counter per server process, so on Vercel it only becomes global once Redis is configured. Google's own quota is the hard backstop.

## `/api/social` (as built)

Built differently from the sketch below, to stay inside Upstash's free 500K commands a month: counts live in two hashes (`likes:count`, `comments:count`), each phone's hearts in a set (`mine:<fingerprint>`), comments in a capped list per place (`comments:<place>`) plus a global `recent` list. The home summary is 4 commands in one request; comments for a place load only when its sheet opens. Likes use `SADD`/`SREM` (which say whether anything changed) and only then `HINCRBY`, so repeats can't double count. Known limit: those two steps are not one atomic action, so a crash between them could drift a count by one. Writes are limited to 30 a minute per phone. The original sketch follows.


- **Identity:** a random device id in localStorage, sent in an `X-Device` header (no accounts). Ask for a display name once, before the first comment.
- `GET` → `{ likes: { [place]: count }, mine: [place…], comments: [{ id, place, name, text, t, mine }] }`. Never return other people's device ids.
- `POST { action: "like", place, on }`: SADD/SREM `likes:<place>` with the device id.
- `POST { action: "comment", place, name (1–40), text (1–280) }`: LPUSH a JSON item to `comments`, LTRIM to 1,000.
- `POST { action: "delete", id }`: allowed for the comment's own device, or with `ADMIN_TOKEN`.
- Rate-limit per device (e.g. 30 writes/min via INCR + EXPIRE). Escape all user text when rendering.
- Poll `GET` every ~25 s while the tab is visible.

## What the Claude artifact used (reference only)

`reference/claude-artifact-v7.html` used Claude's artifact runtime: `db` (likes in `likes/{uid}`, comments in `comments/{uid}` maps, photos in `photos/all`), `user` (ids and names), and `assets` (owner photo uploads). None of this exists outside claude.ai; replace it with the APIs above.
