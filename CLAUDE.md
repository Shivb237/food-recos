# Manikonda Picks — project context

Shivang's curated food-delivery guide for people in his network who live around **Manikonda, Hyderabad** and can't decide what to order. It started as a Claude.ai artifact and is moving to a properly built, self-hosted web app.

Read this file first. Details live in `docs/`:

| File | What's in it |
|---|---|
| `data/places.json` | All 46 restaurants (36 Shivang has tried + 10 suggested), sections, moods. **Source of truth for content.** |
| `docs/requirements-and-feedback.md` | What Shivang asked for, in order, and every piece of feedback he gave. Read before any design decision. |
| `docs/architecture.md` | The target self-hosted build: Vercel functions, Google Places API (New) photos, Upstash Redis for likes/comments. Costs and Google's terms. |
| `docs/design-system.md` | Palette, type, components and motion used so far, plus what to change. |
| `docs/research-notes.md` | Ratings/prices found, price-segment conflicts flagged to Shivang, sources. |
| `reference/claude-artifact-v7.html` | The last working version (single HTML file, built for the Claude artifact runtime). Use it as a behaviour reference, not as code to keep. |

## Owner

- Shivang, software engineer (backend, SQL, data pipelines, LLM apps). Comfortable with code, Vercel, APIs.
- Audience is **laypeople** in his personal network, mostly on phones. No developer jokes or code aesthetics in the UI (he explicitly rejected a terminal/code-sticker theme).
- Not a public product. Shared privately with friends.

## Goals, in priority order

1. **Function first:** someone opens the link and gets to "order from X on Swiggy/Zomato" in as few taps as possible.
2. **UX second:** calm, premium, app-like (benchmarks he named: Swiggy, Zomato, Uber, Duolingo, Instagram). Breathing room, clear hierarchy, progressive disclosure.
3. **Delight third:** e-card / e-invite level polish: confetti, micro-animations, a living hero. Tasteful, not gimmicky.

## Hard requirements (from Shivang)

- **Real photos of each restaurant's food on every card.** This is the top open item. Placeholder initials and cartoon icons were rejected. Plan: Google Places API (New) photos, loaded live, with author attribution (see `docs/architecture.md`).
- **Veg labels:** every place serves veg. Places that also serve non-veg are labelled **"Veg & non-veg"** (show the green and brown marks together). Never show a lone non-veg mark. Confirmed pure-veg places get **"Pure veg"**. Unconfirmed places get **"Veg options"**. (`veg` field in places.json: `pure` | `both` | `options`.)
- **Remove the "Pure veg" filter switch.** He said the filter isn't needed. (His message was voice-typed as "Doorwise filter is not required"; confirm with him if unsure.)
- **Mood panel redesign:** the cartoon food icons "turn his mood off". Use real photo tiles (e.g. a photo from the top place in that mood) with a strong label.
- **Carry the hero's quality down the page.** He loves the hero ("What should you order today?" over a drifting colour gradient). Sections below didn't match its hierarchy and modern feel.
- **Order links:** Swiggy and Zomato on every place. Google Maps link where known.
- **Likes and comments like Instagram** (heart, double-tap, comment thread, "Most loved", "What people are saying").
- Keep: section rows, "See all", search, "Can't decide? pick for me" with a shuffle, details in a bottom sheet, save for later, recently viewed, confetti on key moments.
- Respect his section placement even where research suggests a different price segment (he decides). Show the segment notes as "Good to know".
- Don't list dishes to order. His rule: "Not sharing what I ordered, they can explore themselves."

## Content rules

- Section names are his: Best offers & taste, Premium, Healthy, Budget, Special mentions, plus "New to try" (Claude's suggestions, not yet tried by him).
- ITC Aashirvaad Soul Creations and Norfest – The Dhaba were moved into Premium at his request.
- Google lists Norfest's Manikonda dine-in outlet as permanently closed. Keep the "check app" warning.
- Ratings and prices were checked October 2026. Treat them as snapshots; the Places API can supply live ratings later (cost note in architecture.md).

## Current status

- **Done (artifact v7):** all content, research, mood browsing, rows, bottom sheet, search, pick-for-me with confetti, save/recent (localStorage), likes/comments (Claude artifact `db` capability), owner photo upload (artifact `assets`), warm minimal light/dark theme, animated hero. This all lives in `reference/claude-artifact-v7.html`.
- **Not done:** real restaurant photos, the redesign items above, veg-label fix, removing the veg switch, self-hosting, likes/comments on a real backend.
- The artifact-specific APIs (`window.claude.use("db" | "user" | "assets")`) don't exist outside Claude. Replace them.

## Build progress (Claude Code)

- **Phases 0–3 done:** Vite + Preact + TS app (`src/`), `data/places.json` migrated to v2 (slugs, `searchName`, `priceTier`, `closed`, real-link slots), generated cards for places without photos (`src/cards/`, preview at `/dev/cards` in dev), home with hero / photo mood tiles / section rows, details sheet, search, mood and section lists, pick-for-me, save and recent, deep links (`/?p=<slug>`). Mood photos are Pexels (credited in the footer).
- **Phase 4 done (photos):** `scripts/resolve-place-ids.ts` wrote `data/place-ids.json` (35 approved, 7 need review, 4 no listing). `/api/photo` (`server/photo.ts`) serves Google photos with author credit, a daily cap and a free-tier-only field mask; cards lazy-load them, the sheet has a gallery. Owner photo (`place.photo`) > Google > generated card. `npm run places:coverage` shows who gets what.
- **Photo picker (dev only):** `npm run dev` then `/dev/photos` lets Shivang pick the food photo(s) per place (saved as positions in `data/photo-picks.json`, used first by `/api/photo`) and fix weak or missing Google matches (writes `data/place-ids.json` and `data/place-id-overrides.json`; `null` = no listing). Not deployed: `server/devRoutes.ts` is only mounted by the Vite plugin. Google may reorder photos over time, so re-pick if a card looks off.
- **Open:** Shivang to run through the picker; Mealful Rolls and ATH are "closed on Google".
- **Phase 5 done (likes and comments):** `server/redis.ts` (tiny Redis client + pretend in-memory Redis), `server/social.ts` (`/api/social`), `src/lib/social.ts` + `src/components/Social.tsx` (heart, double-tap, comments, "Most loved", "What people are saying"). Runs on an in-memory store locally; with `UPSTASH_REDIS_REST_URL/TOKEN` set it uses real Redis; on Vercel with neither set the routes answer 501 and the UI hides social features. Admin: set `ADMIN_TOKEN`, then open `/#admin=<token>` once on Shivang's phone.
- **Phase 6 done (polish, prepared for deploy):** axe accessibility pass is clean on home, lists, search and the sheet in light and dark (colours darkened for contrast, focus trap and Esc verified); brand images generated by `npm run brand:images` (og.png, icons, favicon); web manifest + link-preview tags (`__SITE_URL__` filled at build); `vercel.json` has the Mumbai region, SPA rewrite, a strict Content-Security-Policy and cache headers; `npm run preview:prod` runs the built site with those headers and the real API. Steps to go live are in `docs/deploy.md`. **Not yet deployed or committed.**
- **Next:** Shivang deploys (GitHub, Upstash, Vercel env vars), then a real-phone check.
- Run: `npm run dev`; checks: `npm test`, `npm run build`.

## Suggested first steps in Claude Code (original list)

1. Scaffold the stack in `docs/architecture.md` (static frontend + `/api/photo` + `/api/social`), with a local dev server and a mock mode so the UI runs without keys.
2. Load content from `data/places.json`; share it between frontend and API (the photo endpoint must only accept known place names).
3. Build the photo pipeline, then the redesign around real photos.
4. Ask Shivang for: Google Cloud API key (Places API (New) enabled, key restricted to that API, daily quota cap set), Upstash Redis REST URL + token, and whether he wants an admin token for deleting comments.
