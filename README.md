# Manikonda Picks

Shivang's curated food-delivery guide for friends around Manikonda, Hyderabad. See `CLAUDE.md` for context and `docs/` for requirements, architecture and the design system.

```bash
npm install
npm run dev         # http://localhost:5173, no keys needed
npm run validate    # check data/places.json against the schema
npm test            # unit tests
npm run build       # validate + typecheck + production build
```

- `data/places.json` is the source of truth for content (schema in `shared/schema.ts`).
- `/dev/cards` (dev server only) previews the generated cards used for places without a photo.
- Status: phases 0 to 6 done (scaffold, data v2, generated cards, core UI, Google photos, likes and comments). Phase 6 (polish, accessibility, brand images, manifest, security headers) is done. Next: deploy, see `docs/deploy.md`.
- Likes and comments need no setup locally (in-memory). For the real site, create a free Upstash Redis database and put its REST URL and token in the env vars (see `.env.example`).
- `/dev/photos` (dev server only): pick the food photo per place and fix weak Google matches.
- Photos: `npm run places:resolve` (find Google place IDs), `npm run places:coverage` (who gets a photo). Needs `GOOGLE_MAPS_API_KEY` in `.env.local`.
- Mood photos in `public/moods/` are from Pexels; credits are in `src/moodCredits.ts` and the footer.
# food-recos
