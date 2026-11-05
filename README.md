# Scale Strategies

```
agency/            tryscalestrategies.com: the single-offer homepage. Netlify serves this folder as-is.
templates/shop/    client site template: render.mjs (markup), shop.css (styles), content.json (demo shop)
shared/tokens.css  design tokens + Archivo font, shared by both
clients/           one JSON file per real client shop
tools/             build-client.mjs (builds a shop), sync-tokens.mjs (copies tokens into agency/)
```

## Agency site

- `agency/index.html`, `agency/agency.css`, `agency/main.js` (3.9KB), `agency/fonts/`. No build step.
- One offer, one CTA: **Book my free shop audit**. On desktop it scrolls to `#audit` (inline Calendly, lazy-loaded). On phones it opens the Calendly popup. Without JS it falls back to plain Calendly links.
- `/book` forwards to `/#audit` so old links keep working. `/services` 301s to `/`. `/gyms` uses the old stylesheet (`agency/style.css`) and is linked only in the footer.
- **Qualifying check:** before the calendar shows, visitors answer 3 questions: on Long Island, can call leads back within an hour, ready for $2,500/month ($1,000 fee + $1,500+ ads). Any "no" shows a reason-specific message plus a "Keep me posted" phone/email box (Netlify Forms, form name `later`; turn on email notifications in Netlify → Forms). A pass fires the Pixel's standard `Lead` event and opens Calendly with the answers prefilled as `a1`–`a3`.
- **Calendly invitee questions** (Event type → Booking page options → Invitee questions). The first 3 must match this order exactly so the answers prefill:
  1. Is your shop in Nassau or Suffolk County? (Yes / No)
  2. Can someone call new leads back within about an hour during business hours? (Yes / No)
  3. Are you ready to invest $2,500 a month to fill your bays? $1,500+ in ads paid to Meta plus a $1,000 management fee. (Yes / No)
  4. What kind of shop do you run? (one line)
  5. Do you have bay time for 10+ more jobs next month? (Yes / No)
- `/privacy` is linked in the footer. Have someone read it before the Pixel or lead ads go live.
- `og.png` is the link preview image (1200×630). Re-render it with your face once you have a photo.
- Fill in every `TODO(Frank)`: `grep -rn "TODO(Frank)" agency/`
- **Changing colors or type?** Edit `shared/tokens.css`, then run `node tools/sync-tokens.mjs`. Don't edit the tokens block inside `agency/agency.css` by hand.
- Before deploying, copy your existing `demo.html` into `agency/` (the gyms page links to `/demo`). It already works with `agency/style.css`.

Netlify: `netlify.toml` publishes `agency/`. Connect this repo to the existing site, or drag the `agency/` folder in.

## New client shop in 15 minutes

You need: the shop's name, phone, address, hours, services, brand color, the offer from their ad, and their Meta Pixel ID.

1. **Copy the demo** (1 min)
   `cp templates/shop/content.json clients/main-st-auto.json`
2. **Fill in the content** (8 min). In that file:
   - `slug`: lowercase with dashes, e.g. `main-st-auto`
   - `business`: name, phone, address, license, towns served
   - `hero.headline`: service + town, e.g. `"Brake & collision repair in *Massapequa*."` (`*stars*` = accent color)
   - `offer`: copy the live ad's offer **word for word**, so the page says what the ad promised
   - `services`, `hours` (keep the `schema` strings, e.g. `"Mo-Fr 08:00-18:00"`), `faq`
   - `theme.accent`: the shop's brand color as a 6-digit hex. The build rejects it if it isn't readable (it needs 3:1 against the page and 4.5:1 for the button text) and tells you what to change.
   - `bookingUrl`: their online booking link if they have one. Otherwise the "Book" buttons go to the request form on the page.
   - `reviews.items`: **real Google reviews only, pasted word for word.** Leave it empty and the section stays hidden.
   - `site.url`, `tracking.metaPixelId`, and set `"demo": false`
3. **Photos** (2 min, optional): put them in `clients/main-st-auto/` and reference them as `/img/bay.jpg`. Use WebP, under 200KB.
4. **Build and check** (2 min)
   `node tools/build-client.mjs clients/main-st-auto.json --strict`
   `--strict` fails while any `REPLACE`/`TODO` text, demo mode, or a missing pixel/URL is left. Fix until it passes.
5. **Deploy** (2 min)
   `npx netlify deploy --dir dist/main-st-auto --prod` as its **own** Netlify site, then point the shop's domain at it.
   In Netlify → Forms, turn on email notifications for the `booking` form and send them to the shop, so leads get answered inside the hour.

Every shop site gets tap-to-call, a sticky Call / Book bar on phones, the ad offer, services, a booking request form (Netlify Forms), a reviews slot, hours, a Google map and directions, FAQ, `AutoRepair` schema, and Meta Pixel events (`PageView`, `Contact` on call taps, `Lead` on the thanks page).

Change the design once in `templates/shop/` and run `node tools/build-client.mjs --all` to rebuild every shop. Gyms come later as a second template with `"vertical": "gym"`.
