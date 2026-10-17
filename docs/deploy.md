# Deploying to Vercel

The site is live on Vercel from GitHub. These are the steps that were followed, kept for setting it up again or on another account.

## 0. What goes where

| Piece | Lives on | Needs |
|---|---|---|
| The pages (HTML, CSS, JS, images) | Vercel (static) | nothing |
| `/api/photo` and `/api/social` | Vercel functions (Mumbai, `bom1`, set in `vercel.json`) | env vars below |
| Hearts and comments | Upstash Redis | a free database |
| Restaurant photos | Google (loaded live) | Google API key |

## 1. Put the code on GitHub

```bash
git add -A
git commit -m "Manikonda Picks"
# create an empty private repo on github.com, then:
git remote add origin https://github.com/<you>/manikonda-picks.git
git push -u origin main
```

`.env.local` is git-ignored, so your keys do not go up. Check with `git status` before committing.

## 2. Upstash (hearts and comments)

1. Sign in at upstash.com, create a **Redis** database, region **ap-south-1 (Mumbai)**, free plan.
2. On its page, copy the **REST URL** and **REST token** (the REST ones, not the redis:// one).

## 3. Vercel

1. vercel.com, **Add New, Project**, import the GitHub repo. It detects Vite. Leave the build settings alone.
2. Before the first deploy, add **Environment Variables** (Production):

| Name | Value |
|---|---|
| `GOOGLE_MAPS_API_KEY` | your key (Places API (New) only) |
| `PHOTO_DAILY_CAP` | `150` |
| `UPSTASH_REDIS_REST_URL` | from step 2 |
| `UPSTASH_REDIS_REST_TOKEN` | from step 2 |
| `ADMIN_TOKEN` | a long random phrase only you know (optional, lets you delete any comment) |
| `SITE_URL` | only if you add a custom domain, e.g. `https://picks.example.com` |

3. Deploy. The link preview image takes its address from the deploy automatically.

## 4. Google Cloud (already mostly done)

- Key restricted to **Places API (New)**. Server keys can't be limited by website address, so the API restriction plus quotas is the protection.
- After you finish picking photos, daily photo quota about 200, per-minute 60. Budget alert $5 a month.

## 5. Check it worked

- Open the link on your phone. Photos and ratings show; a heart and a comment stick after a reload.
- Paste the link into a WhatsApp chat: the orange "What should you order today?" card should appear (WhatsApp caches previews, so a brand-new link is best).
- On your phone, open `https://<your-site>/#admin=<ADMIN_TOKEN>` once. A toast says "Admin mode on", and you can now delete any comment.
- Share, Save and "Add to Home Screen" work from the browser menu.

## If something is off

| Symptom | Likely cause |
|---|---|
| No hearts or comments at all | Upstash env vars missing (the app hides them on purpose) |
| Every card is a coloured generated card | `GOOGLE_MAPS_API_KEY` missing, or the daily Google quota is used up |
| Link preview has no image | `SITE_URL` or the deploy address was missing at build time; redeploy |
| Blank page after an edit | run `npm run build` locally, it validates the data and shows the error |

## Try the built site locally first

```bash
npm run build
npm run preview:prod     # http://localhost:4173, same headers and API as Vercel
```
