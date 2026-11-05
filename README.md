# Scale Strategies

Two things live in this repo:

1. **`site/`**: the agency site, tryscalestrategies.com. Hand-coded static HTML/CSS on Netlify, built around one offer:
   *10+ booked jobs from Facebook & Instagram in 30 days for Long Island auto shops, or month 2 is free.*
2. **`templates/` + `clients/`**: a reusable site template for client shops. Each shop is one JSON file. No rebuild, just a content swap.

## Agency site (`site/`)

| Page | Job |
|---|---|
| `/` | Sells the one offer. Every CTA says "Book a free shop audit" and goes to `/book`. |
| `/book` | Calendly embed (`calendly.com/frank-tryscalestrategies`) plus email and Instagram backups. |
| `/gyms` | The gym lead follow-up product. Linked only from the footer so it doesn't dilute the homepage. |
| `/services` | Gone. `site/_redirects` 301s it to `/`. |

`netlify.toml` publishes `site/` with no build step. Connect this repo to the existing Netlify site, or drag `site/` into Netlify.

**Before you deploy:** `/gyms` links to `/demo`, which isn't in this repo. Copy `demo.html` (and any script it uses) from the current Netlify source into `site/`, or that button 404s. Its CSS classes are already in `site/style.css`.

**No fake proof, by rule.** When a real shop gets real results, add them to the founder section on `/` ("Results from Long Island shops will go here"). Only real numbers, only with the shop's permission.

## Client sites

```bash
node tools/build-client.mjs clients/<slug>.json            # build dist/<slug>/
node tools/build-client.mjs clients/<slug>.json --strict   # pre-launch check: fails on placeholders
node tools/build-client.mjs --all                          # build every client
```

Zero dependencies, just Node 18+. Output is plain static files in `dist/<slug>/`.

### New shop in 6 steps

1. Copy `clients/example-auto.json` to `clients/<shop-slug>.json`.
2. Fill it in: name, phone, address, hours, services, theme colors, the offer from their ad. Wrap a word in `*stars*` to make it the accent color in a headline.
3. Photos go in `clients/<shop-slug>/` and are referenced as `/img/<file>` (for example `"hero": { "image": "/img/bay.jpg" }`).
4. Reviews: paste **real** Google reviews only, word for word. No reviews yet? Leave `items` empty and set `googleUrl`, or the section hides itself.
5. Set `"demo": false`, `site.url`, and `tracking.metaPixelId`, then run with `--strict` until it passes.
6. Deploy: `npx netlify deploy --dir dist/<shop-slug> --prod` (or drag the folder into Netlify) as **its own** Netlify site, then point the shop's domain at it.

### What every client site gets

- Tap-to-call everywhere, and a bottom dock on phones: **Call · Quote/Book · Directions**
- Ad offer block that matches the Facebook/Instagram ad (same promise, same words)
- Quote form via **Netlify Forms** (`name="quote"`). Turn on email notifications to the shop in Netlify → Forms so leads get answered inside the hour.
- Reviews, hours, address, Google Map, directions link, FAQ
- `AutoRepair` schema.org markup for local SEO (no self-served star ratings, on purpose)
- Meta Pixel when `metaPixelId` is set: `PageView`, `Contact` on call taps, `Lead` on the thanks page
- `bookingUrl` set (Tekmetric, Shopmonkey, Calendly...)? "Get a free quote" becomes "Book online".

### Changing the design

Design lives in `templates/auto-shop/render.mjs` (markup) and `templates/auto-shop/style.css`. Change it once and rebuild with `--all`; every shop gets the update. Gyms come later as `templates/gym/`, selected with `"vertical": "gym"` in the JSON.
