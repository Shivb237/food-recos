# Product audit: why Manikonda Picks plateaus, and a path to a public product

Written 16 Nov 2026. This is a diagnosis and a staged plan, not a build. Nothing in the code was changed for it. Claims are tagged **[checked]** (I verified it in the code, data or live site), **[sourced]** (from a source I read, quality noted) or **[hypothesis]** (my inference, to be tested).

## 1. Verdict in four lines

1. The app is a **good personal list**, and a list is not a product. Its only edge over Swiggy, Zomato and Google Maps is "Shivang picked this", which only matters to people who know and trust Shivang. **[hypothesis]**
2. The core promise (get to "order from X" in the fewest taps) is **mostly not delivered**: 45 of 47 places open a Swiggy *search*, not the restaurant. **[checked]**
3. There is **no reason to come back**. The content is a frozen October snapshot, and the live site has **0 likes and 0 comments** (read-only check of `/api/social`, 16 Nov 2026). **[checked]** I could not see visitor numbers, so "nobody visits" and "people visit once" are not yet told apart. Read the Vercel Analytics dashboard first (step 0 below).
4. Going general means changing the architecture and several of your own rules. Do it in stages and measure before each one.

## 2. What the app does today (facts)

| Area | State | Source |
|---|---|---|
| Content | 47 places, 37 tried by Shivang, 1 curator, 1 neighbourhood | [checked] `data/places.json` |
| Swiggy links | 2 real, 45 fall back to `swiggy.com/search?query=` | [checked] `src/lib/links.ts`, data |
| Zomato links | 33 real, 14 fall back to a Google search scoped to zomato.com | [checked] |
| Pick for me | Uniform random from the visible list. It ignores budget, diet, group size, time and past picks | [checked] `src/lib/pick.ts` |
| Freshness | Ratings and prices are an October snapshot. No "open now", no "delivers to me" signal | [checked] |
| Updating content | Edit through a localhost-only tool, then commit and push. Nobody else can contribute | [checked] |
| Social | Hearts and comments work, but with zero use so far | [checked] live API |
| Accounts, notifications, history | None. State lives in the phone's localStorage | [checked] |

## 3. Why it feels irrelevant (diagnosis)

1. **It competes where it loses.** Swiggy and Zomato already show photos, ratings, price, ETA and offers, and together hold about 95% of the market. [sourced, trade press: figures vary by source and period] A second list of the same restaurants adds only the curator's taste.
2. **The last mile is broken.** One tap to a search page, then another to find the place, is the same effort as opening Swiggy yourself.
3. **Single-player.** One person's taste, updated by one person, with no way for a reader to add, correct or confirm anything. The interaction features exist but give people nothing to react to.
4. **No loop.** Nothing brings a visitor back next Friday: no memory of "what I ordered last time", no "new this week", no reminder, no share mechanic beyond the link.
5. **No answer to the real question.** People rarely ask "which restaurants are good?" They ask "what should *we* eat tonight, given budget, veg or not, mood and who is coming?". The random pick does not use any of that.

## 4. What the research does and does not say

I looked for hard evidence and mostly found thin or secondhand material. Treat these as direction, not proof.

- **Choice overload in delivery apps:** I found *no* rigorous study testing it. What exists: a Deakin University qualitative interview study (Gupta et al., *BMC Public Health* 2025) finding that comfort food wins because it is easier, cheaper and shown first, and that healthier options are buried. That supports "defaults and curation steer choices", not "too many options causes paralysis". [sourced, I read a summary and the paper's listing, not the full paper]
- **Trust in reviews:** Evidence is mixed. Indian studies show online reviews are widely read, and surveys report distrust of reviews as fake or planted (a 2017 Business Standard report, a 2024 review). None compares word of mouth with reviews directly for Indian restaurants. [sourced, weak] So "friends' recommendations fill a trust gap" is plausible but unproven.
- **Discovery to conversion:** An *Information Systems Research* paper on location-based restaurant recommendations reports that exposure alone does not remove uncertainty; conversion is higher where restaurants provide photos, menus and reputation signals. [sourced, abstract only; the publisher blocked the full text] This supports your photo-first insistence and adds "show menu and price context".
- **Retention:** Only vendor case studies (Atmosfy, Eatigo, Hungry Hobo), which are self-reported marketing. One consistent idea: a predictable routine beats more notifications. [sourced, weak]
- **Closest comparable, Beli:** Social restaurant ranking whose founders say about 80% of growth is referrals; invite-only onboarding, comparative ranking ("better than X?"), streaks and leaderboards. Revenue is unclear in every source. [sourced: founder claim via press]
- **Crowded niche in India:** friends-and-family discovery apps already exist (HOGR in Bengaluru, TastySpots in Kerala, APNA FOOD in Hyderabad, Food Talk India with a large social following) plus a large Instagram food-creator scene in Hyderabad. [sourced, press and directories] Whatever you build must be better at *deciding and ordering*, not at listing.
- **Price sensitivity:** platform fees rose to about ₹15–18 per order in 2026 and cash-on-delivery got a separate fee. [sourced, trade press, figures differ] Value-for-money guidance is relevant, but this is context, not proof that people want it.

## 5. Hard constraints on going public

1. **No open restaurant data.** Neither Swiggy nor Zomato offers a public listing or deep-link API. Swiggy's Builders Club (MCP servers for Food, Instamart, Dineout) is **invite-only**, aimed at agents acting for signed-in users, needs OAuth whitelisting and data-handling agreements (including India's DPDP Act). Whether a solo developer qualifies is not stated. Zomato also has an MCP server, but I did not verify its terms. Affiliate programs exist through third-party networks with conflicting payout claims. [sourced: Swiggy's own pages, plus affiliate blogs of low reliability] **Do not plan revenue or ordering-in-app on any of this until you have applied and heard back.**
2. **Google at scale.** Photos are billed per request (a third-party source says about $7 per 1,000; the official figure should be confirmed). Place IDs may be stored, photo references may not, and your 12-hour shared cache of Google's temporary image link is already a judgment call. With many cities this stops being free. Alternatives: curator-uploaded photos, owner-supplied photos, or a paid data licence.
3. **Architecture.** Content is one JSON file baked into the bundle and written from a localhost tool. A public product needs a database, accounts, moderation, abuse controls and a privacy policy. Likes and comments run on Redis with anonymous device ids, which will not carry accounts or lists.
4. **Your own recorded rules** that generalising would force you to revisit (each needs a conscious decision, not a silent drop):
   - "Private, shared with friends only, not public."
   - "Don't list dishes." A public product people trust usually *needs* dish-level hints.
   - Veg-only suggestions and your section names ("Best offers & taste", etc.). Other curators will not share them.
   - One voice ("Shivang's picks"). Becomes "someone's picks".

## 6. What "for the general public" can mean (pick one)

- **A. Shivang covers more areas.** One curator, more neighbourhoods. Simple, but your taste and time cap it at a few areas. It does not scale.
- **B. Anyone publishes trusted picks for their own area or circle** (recommended). Each curator gets a page like `/c/shivang`, readers follow curators they trust, and the app answers "what should I order tonight" from the curators *you* follow. Growth comes by referral, as Beli's does. Your current app becomes the first curator page and the template. This keeps what is distinctive (trusted human taste) and avoids competing with Google or Swiggy on data.
- **C. An AI order-concierge.** Ask "veg, under ₹300, for two, tonight" and get a pick backed by curated data. It fits your LLM background and Swiggy and Zomato's MCP direction, but it depends on access you may not get and on data you do not yet have.

I recommend **B**, built on the data model that **C** would also need. A is the fallback if B is too much.

## 6b. Learning from Beli: copy the best, fix what it cannot do

**Beli's strongest ideas** [sourced: Wikipedia, App Store listing, two student design critiques, a Harvard D3 submission; all secondhand]
1. **Comparative ranking.** Instead of 1–5 stars it asks "better or worse than X you've had?", which gives sharper signals and is fun. 
2. **A taste match score** with each friend, and a predicted "you'll like this" score per place.
3. **Want-to-try list** that can be filled from Instagram or TikTok links.
4. **Referral-led, invite-only growth**, with status for inviting (about 80% of growth by the founders' own claim).
5. **Social proof from people you know**, not strangers, via a friends feed.

**What Beli does not do** (gaps I found; several are inferences, marked)
- **Nothing about ordering.** None of the sources mention delivery or ordering. It is a dine-out diary and discovery tool. [sourced: absence only]
- **Needs lots of ratings before it is useful**, so poor first recommendations lose users (Harvard D3 submission, which advises launching city by city). [sourced, weak]
- **Skews to elite, big-city dining and streak-chasing**; some users say it rewards maintaining streaks over real interest; others report it getting more commercial and its reviews weaker; privacy concerns were raised in one student paper. [sourced, weak]
- **Built for the US**, English only, and its paid club is New York only. [sourced]
- **Plausibly absent for India** [hypothesis]: delivery-menu prices, veg and Jain diets, group decisions in mixed veg and non-veg households, WhatsApp as the social network, low-end phones and patchy data, Hindi and Telugu.

**How to adapt it for India** (design ideas, not yet validated with users)
| Beli idea | Better version here | Why it should work |
|---|---|---|
| Rank against places you've tried | A 10-second **"better than…?" tap** only when someone marks "I ordered this", never a long form | Keeps effort tiny; builds a taste signal without needing 30 ratings first |
| Taste match with friends | **"Trusted by"**: show which curators you follow like a place, instead of a score | Fits the trust-in-people finding; no algorithm needed at small scale |
| App feed of friends | **WhatsApp-native sharing**: per-place link previews and a **group vote** ("3 picks, tap to vote, winner opens in Swiggy/Zomato") | In India the group chat is the social graph, and the real hard problem is "what do *we* eat tonight" |
| Dining diary | **Order memory**: "last time you ordered from X, 12 days ago; try Y" | Delivery repeat behaviour, which Beli ignores |
| Instagram/TikTok to want-to-try | **Paste an Instagram, Reels, Swiggy or Zomato link** and the place is added to a want-to-try list | Instagram food creators are large in Hyderabad; reuses the add-restaurant search |
| Leaderboards and streaks | **Curator reputation** (picks that others confirmed). No streaks | Avoids the "streak over substance" complaint |
| Dine-out price level | **Delivery price band plus true cost** (menu price, platform fee, delivery fee) | Fees and ordering prices differ from dine-in; already your edge |
| English-only | Hindi and Telugu labels, light pages that work on cheap phones | Wider reach in Hyderabad |
| Invite-only by referral | Invite-only **by neighbourhood or circle** (apartment, office, college) | Matches how trust works locally and gives a natural cold-start unit |

**What Beli cannot do at all, and you can:** go from "we're deciding" to "order is placed" in one flow for a *group*, in a delivery-first market, using prices that match what people actually pay. That is the wedge. Everything above is secondary to getting that one flow reliable (Stage 1), so the Stage 1 list gains a **group vote** item, ahead of anything like rankings or streaks.

## 7. Staged roadmap

Each stage ends with a measurement. Do not start the next stage until the previous result is in.

**Stage 0: measure (days, no code)**
- Open the Vercel Analytics dashboard: visitors, return visits, top pages, device split.
- Watch 5 friends use it to actually order, and count taps and seconds. Ask them one question: "what did you use instead?"
- Decision rule: if visitors are low, the problem is distribution (WhatsApp sharing, link previews). If visitors are fine but use is one-off, the problem is the loop and the last mile.

**Stage 1: make the core job work (1–2 weeks)** *(the goal in CLAUDE.md that is currently unmet)*
1. Real Swiggy and Zomato restaurant URLs for every place (fill them with the existing add tool or a research pass; fall back to search only where none exists).
2. A **contextual pick**: ask 2–3 quick questions (veg or not, budget band, who is eating, mood) and pick from matches, then explain why in one line.
3. **Freshness**: open-now and closed signals from Google, a "last checked" date on each card, a monthly re-verify script.
4. **Share per place** to WhatsApp with a proper preview card (the people you share with are on WhatsApp), then a **group vote** link (3 picks, friends tap, winner opens in the app).
5. **"I ordered this" one-tap** plus "what you ordered last time" on the phone, so the app has a reason to be reopened.
6. Success measure: share of visits that end in an order-link tap, and 14-day return rate.

**Stage 2: multi-curator foundation (3–6 weeks)**
- Database (Postgres, e.g. a managed one, or keep Redis for counters only), tables for curators, lists, picks, places, and reports.
- Sign-in with Google or phone OTP; keep anonymous browsing.
- Hosted version of the add-restaurant tool: search Google, price band, photos (live from Google with a cap, or uploaded by the curator).
- Curator pages, areas, moderation and report buttons, a privacy policy and delete-my-data (DPDP Act).
- Re-decide the four rules in section 5.4.

**Stage 3: growth loop (ongoing)**
- Invite-only start, referral links, "your friends' picks first", a weekly "new this week" message through a WhatsApp channel or broadcast list. Add streaks or rankings only if Stage 1 shows people return.
- Add "agree or disagree with this pick" so a place's trust builds across curators.

**Stage 4: money and ordering (only with evidence)**
- Apply to Swiggy's Builders Club and ask Zomato about partnerships now, because approval is slow and decides what is possible. Treat affiliate income as unverified.
- Consider sponsored placement last, and only if it never changes the order of picks.

**Not worth doing:** your own delivery, scraping Swiggy, Zomato or Google pages, a general star-rating system that competes with Google, and native apps before the web version has returning users.

## 8. Risks

- **Platform dependence:** if Swiggy or Zomato change links or block referrals, ordering breaks. Keep search fallbacks.
- **Data cost and terms:** Google photo billing and caching rules at scale.
- **Cold start:** a curator marketplace with no curators or readers is empty. Stage 1 should prove one curator can retain readers before inviting others.
- **Trust and abuse:** fake or paid picks destroy the one thing that makes this useful. Moderation and visible curator identity matter.
- **Your time:** this is a part-time project; Stage 2 is a multi-week build with ongoing moderation.

## 9. What I did not verify

- Visitor and return numbers (no access to Vercel Analytics from this session).
- Whether the live card links behave on a real phone (I checked the code and data, not a phone tap-through).
- Full text of the Deakin and ISRE papers; ratings of Beli's revenue; Swiggy and Zomato partnership terms for an individual developer; the current official Google photo price.
- Market-share and platform-fee figures come from trade press with inconsistent dates.

## 10. Decision needed from Shivang

Which direction: **A** (you cover more areas), **B** (anyone publishes trusted picks), or **C** (an AI concierge)? Until that is settled, do Stage 0 and Stage 1, which are useful under every option.

## Sources

- Gupta et al., [Understanding food choices… among online food delivery users in Australia, BMC Public Health 2025](https://biomedcentral-bmcpublichealth.publicaciones.saludcastillayleon.es/articles/10.1186/s12889-025-22839-5) (mirror of the DOI 10.1186/s12889-025-22839-5), and the [FoodNavigator summary](https://www.foodnavigator.com/Article/2025/07/16/consumers-crave-convenience-comfort-but-also-affordability-and-health/)
- [Mobile location-based recommendation systems and local businesses: restaurant industry, Information Systems Research](https://pubsonline.informs.org/doi/10.1287/isre.2025.1970) (abstract via search only)
- [Beli: Knowing What Your Belly Wants (Harvard D3)](https://d3.harvard.edu/platform-digit/submission/beli-knowing-what-your-belly-wants/index.html); [Design critique of Beli (Pratt, 2026)](https://ixd.prattsi.org/2026/09/a-design-critique-of-beli-restaurant-discovery-and-social-platform/); [Beli App Store listing](https://apps.apple.com/in/app/id1478375386)
- [Beli (app), Wikipedia](https://en.wikipedia.org/wiki/Beli_(app)); [Demand Curve on Beli's growth](https://www.demandcurve.com/newsletters/growth-newsletter-285); [Ivey Business Review on Beli](https://www.iveybusinessreview.ca/magazine/articles/beli)
- [Swiggy Builders Club: what is Swiggy MCP](https://mcp.swiggy.com/builders/docs/start/what-is-swiggy-mcp/); [Swiggy enterprise partnership page](https://mcp.swiggy.com/builders/enterprises/); [Swiggy Builders Club overview](https://stellagent.ai/insights/swiggy-builders-club-ai-commerce-stack); [Zomato MCP server guide](https://www.f22labs.com/blogs/zomato-mcp-server-guide-architecture-and-features/)
- [Platform fee creeps up again (YourStory, 2026)](https://yourstory.com/2026/03/platform-fee-creeps-up-again-zomato-swiggy-test-market-price-sensitivity); [Swiggy platform fee hike (Outlook Business)](https://www.outlookbusiness.com/corporate/swiggy-platform-fee-hike-brings-it-on-par-with-zomato-charges); [Flipkart food delivery entry (INDmoney)](https://www.indmoney.com/blog/stocks/flipkart-food-delivery-swiggy-zomato-duopoly)
- [Google Places API policies and attributions](https://developers.google.com/maps/documentation/places/web-service/policies); [Place Photos (New)](https://developers.google.com/maps/documentation/places/web-service/place-photos)
- [HOGR (YourStory)](https://yourstory.com/2024/09/heres-how-hogr-helps-people-discover-restaurants-explore-cuisines); [TastySpots (The News Minute)](https://www.thenewsminute.com/amp/story/flix/foodies-only-why-kerala-start-which-lists-restaurants-fresh-break-zomato-35016); [Hungry Indians (Telangana Today)](https://telanganatoday.com/thehungryindians-set-out-to-find-hidden-gems-of-hyderabad)
- [50% consumers deem online reviews fake or planted (Business Standard, 2017)](https://business-standard.com/article/current-affairs/50-consumers-deem-online-reviews-to-be-either-fake-or-planted-study-117112000574_1.html)
- Affiliate listings (low reliability): [Zomato affiliate listing](https://shopper.com/partnerships/zomato-com-affiliate-program), [Swiggy affiliate listing](https://inrdeals.com/index.php/campaigns/swiggy-affiliate-program)
