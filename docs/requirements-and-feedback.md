# Requirements and feedback log

Everything Shivang asked for and every reaction he gave, in the order it happened (15 Oct 2026). Later items override earlier ones.

## 1. Original brief

- He gave his list of restaurants he orders from near Manikonda, Hyderabad, grouped as:
  - **Best offers & taste:** Bihari Bowl, Rajthali, Chai Chakhna Company, Meal O Clock Pure Veg, Pikadili, Millet Express, The Kulcha Kulture, Norfest – The Dhaba, Haldiram's, Tadka Treats, ITC Aashirvaad Soul Creations, Mealful Rolls, Raju Gari Biryani, 1881 Dum House: Lucknow's Legacy, Biryani By Kilo (Bihari Bowl was listed twice)
  - **👌 (became "Premium"):** Salt, Amritsari Aangan, The Punjabis Swag, Punjabi Affair
  - **Healthy:** Greens & More, ATH All Things Healthy, Harvest Salad Co, Lo! Low Carb and Keto Foods, California Burrito, Great Indian Khichdi by EatFit, Home Plate by EatFit
  - **Budget:** Sai Bihari Dhaba, Bihari Dhaba, Udupis Upahar, JDM Punjabi Dhaba, Punjabi Paratha Junction, Balle Balle Punjabi, Box8, Rolls Mania
  - **Special mentions:** Vellanki Foods (dry fruit pootharekulu), Manakamana Kitchen (cheap rotis if you have or are making sabzi)
- "Not sharing what I ordered, they can explore themselves." "Mostly vegetarian."
- Wanted: validate his opinions, suggest new restaurants, make a shareable master list for anyone struggling to order.

## 2. Clarifying answers

- 👌 section = **Premium**. Move **Norfest** there. Then: **ITC Aashirvaad also premium.**
- New suggestions: **veg-friendly only**.
- Format: **shareable web page**.
- Credit: **"Shivang's picks"**.

## 3. Feedback rounds

1. Add **Zomato links**. Research price segments and **tell him when a place seems to sit in the wrong segment** (done; see research-notes.md). Make it creative, not a checkbox list. "Functionality always comes first, then user experience."
2. Wanted stickers, basic animations, a style hinting at his design/dev style; better than the green theme; add images.
3. **Rejected the developer theme:** viewers are laypeople. "Just add some creativity… it should look pretty. Usability first."
4. Opening the page was "a blast of so many things… so many cards". Wanted breathing room, white space, design principles, UX case studies (Uber, Zomato, Swiggy, Duolingo): convenience and simplicity. "Go all out."
5. Dark blue background didn't suit food. Asked for better backgrounds suited to food, a possibly minimal theme, clean and neat design. "Make me proud."
6. Wanted **Instagram-like likes and comments** and other features that add UX and function.
7. Said the food icons should be **replaced by real images** of the restaurants. "You are looking at this recommendation to order food, not cracking jokes." Make it look realistic.
8. Wanted e-card / e-invite polish: confetti, animations that pop, interactive and engaging while functional.
9. Frustrated that real restaurant images still weren't there. "If we can't, it is just a name list."
10. The page is for his private network only, not public or LinkedIn. Offered API help.
11. **Veg labels:** places with both should read **veg / non-veg**. All of his places serve veg; none should look like pure non-veg.
12. **Mood panel:** "The icons… are turning my mood off." Not premium-looking. **Loves the hero** ("What should you order today?" with the gradient behind it); the same hierarchy and modern look wasn't followed below.
13. Proposed official APIs for photos: **Google Places API (New)** (recommended), Foursquare Places, Tripadvisor Content API.
14. Chose **self-hosted + Places API**.
15. Decided to **move development to Claude Code** for a proper build.

## 4. What Claude declined, and why (so Claude Code doesn't repeat the back-and-forth)

- Copying restaurant photos off Swiggy, Zomato or Google Maps pages into the site. Use the Places API instead, which licenses display with attribution, loaded live as Google's terms require.
- Inside the Claude artifact runtime, external images are blocked by CSP, so the API route needed self-hosting. On a self-hosted site this restriction is gone.
