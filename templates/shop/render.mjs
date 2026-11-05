// Local shop site template. Pure function: shop content JSON in, HTML out.
// Design changes happen here and in shop.css. Shop content lives in clients/<slug>.json.

const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// "*word*" in a headline renders in the shop's accent color.
const accent = (v) => esc(v).replace(/\*(.+?)\*/g, '<em>$1</em>');
const has = (v) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && String(v).trim() !== '');

export const telHref = (phone) => {
  const d = String(phone).replace(/\D/g, '');
  return 'tel:+' + (d.length === 10 ? '1' + d : d);
};

const icon = {
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.6a1 1 0 0 1-.25 1z" fill="currentColor"/></svg>',
  cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm-2 8h14v10H5V10zm2 2v2h2v-2H7zm4 0v2h2v-2h-2z" fill="currentColor"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" fill="currentColor"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 17.3 6.2 3.7-1.6-7 5.4-4.7-7.1-.6L12 2 9.1 8.7 2 9.3l5.4 4.7-1.6 7z" fill="currentColor"/></svg>',
};

function pixel(id) {
  if (!has(id)) return '';
  return `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${esc(id)}');fbq('track','PageView');</script>`;
}

const absUrl = (shop, path) => (has(shop.site.url) ? shop.site.url.replace(/\/$/, '') + '/' + String(path).replace(/^\//, '') : '');

function head(shop, theme, { title, description, path = '/', noindex = false }) {
  const url = absUrl(shop, path);
  const img = has(shop.hero.image) ? absUrl(shop, shop.hero.image) : '';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  ${url ? `<link rel="canonical" href="${esc(url)}">\n  <meta property="og:url" content="${esc(url)}">` : ''}
  ${noindex ? '<meta name="robots" content="noindex">' : ''}
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  ${img ? `<meta property="og:image" content="${esc(img)}">` : ''}
  <meta name="theme-color" content="#0E1113">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="preload" href="/fonts/archivo-latin-wght.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/shop.css">
  <style>:root{--accent:${esc(theme.accent)};--accent-hover:${esc(theme.accentHover)};--accent-ink:${esc(theme.accentInk)}}</style>
  ${pixel(shop.tracking?.metaPixelId)}
</head>`;
}

function schema(shop) {
  const b = shop.business;
  const data = {
    '@context': 'https://schema.org',
    '@type': b.schemaType || 'AutoRepair',
    name: b.name,
    telephone: b.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: b.address.street,
      addressLocality: b.address.city,
      addressRegion: b.address.state,
      postalCode: b.address.zip,
      addressCountry: 'US',
    },
  };
  if (has(shop.site.url)) data.url = shop.site.url;
  if (has(b.email)) data.email = b.email;
  if (has(b.serviceArea)) data.areaServed = b.serviceArea.map((name) => ({ '@type': 'City', name }));
  const hours = (shop.hours || []).map((h) => h.schema).filter(has);
  if (hours.length) data.openingHours = hours;
  if (has(shop.hero.image) && has(shop.site.url)) data.image = absUrl(shop, shop.hero.image);
  // No aggregateRating on purpose: self-published ratings aren't eligible for review stars.
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

function footer(shop) {
  const b = shop.business;
  return `<footer class="footer">
    <div class="wrap footer-grid">
      <div>
        <strong>${esc(b.name)}</strong><br>
        ${esc(b.address.street)}<br>${esc(b.address.city)}, ${esc(b.address.state)} ${esc(b.address.zip)}<br>
        <a href="${telHref(b.phone)}">${esc(b.phone)}</a>
      </div>
      ${has(b.serviceArea) ? `<div><strong>Serving</strong><br>${b.serviceArea.map(esc).join(', ')}</div>` : ''}
      <div class="footer-meta">
        ${has(b.license) ? `<span>${esc(b.license)}</span>` : ''}
        <span>&copy; ${new Date().getFullYear()} ${esc(b.name)}</span>
        ${shop.credit !== false ? '<a href="https://tryscalestrategies.com" rel="noopener">Website by Scale Strategies</a>' : ''}
      </div>
    </div>
  </footer>`;
}

export function renderIndex(shop, theme) {
  const b = shop.business;
  const tel = telHref(b.phone);
  const addr = `${b.address.street}, ${b.address.city}, ${b.address.state} ${b.address.zip}`;
  const mapsQ = encodeURIComponent(has(b.mapsQuery) ? b.mapsQuery : `${b.name}, ${addr}`);
  const directions = has(b.googleMapsUrl) ? b.googleMapsUrl : `https://www.google.com/maps/dir/?api=1&destination=${mapsQ}`;
  const formOn = shop.form?.enabled !== false;
  const online = has(b.bookingUrl);
  // The "Book" path: the shop's own booking tool if it has one, otherwise the request form on this page.
  const book = online
    ? { href: b.bookingUrl, label: shop.bookLabel || 'Book online', attrs: ' target="_blank" rel="noopener"' }
    : { href: formOn ? '#book' : tel, label: shop.bookLabel || 'Book an appointment', attrs: '' };

  // Real-reviews slot: renders only when real reviews exist. Never write or edit reviews.
  const r = shop.reviews || {};
  const reviewItems = (r.items || []).filter((i) => has(i.quote));
  const reviewsUrl = r.googleUrl || b.googleReviewsUrl;
  const showReviews = reviewItems.length > 0;
  const rating = has(r.rating)
    ? `<p class="rating">${icon.star}<b>${esc(r.rating)}</b>&nbsp;on Google${has(r.count) ? ` &middot; ${esc(r.count)} reviews` : ''}</p>`
    : '';

  const nav = [['#services', 'Services'], showReviews ? ['#reviews', 'Reviews'] : null, ['#location', 'Hours &amp; location']].filter(Boolean);

  return `${head(shop, theme, { title: shop.site.title, description: shop.site.description })}
<body>
  <a class="skip" href="#main">Skip to content</a>
  ${shop.demo ? '<div class="demo-flag" role="region" aria-label="Template preview notice">Template preview: example business with placeholder details, not a real shop.</div>' : ''}
  <header class="topbar">
    <div class="wrap topbar-row">
      <a class="logo" href="/">${has(b.logo) ? `<img src="${esc(b.logo)}" alt="${esc(b.name)}" height="40">` : esc(b.shortName || b.name)}</a>
      <nav class="links" aria-label="Main">${nav.map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}</nav>
      <a class="btn btn-sm" href="${tel}" data-track="call" aria-label="Call ${esc(b.phone)}">${icon.phone}<span>${esc(b.phone)}</span></a>
    </div>
  </header>

  <main id="main">
    <section class="hero${has(shop.hero.image) ? ' has-img' : ''}"${has(shop.hero.image) ? ` style="--hero:url('${esc(shop.hero.image)}')"` : ''}>
      <div class="wrap">
        ${has(shop.hero.eyebrow) ? `<p class="eyebrow">${esc(shop.hero.eyebrow)}</p>` : ''}
        <h1>${accent(shop.hero.headline)}</h1>
        ${has(shop.hero.sub) ? `<p class="lead">${esc(shop.hero.sub)}</p>` : ''}
        <div class="cta-row">
          <a class="btn" href="${tel}" data-track="call">${icon.phone}Call ${esc(b.phone)}</a>
          <a class="btn btn-outline" href="${esc(book.href)}"${book.attrs}>${icon.cal}${esc(book.label)}</a>
        </div>
        ${rating}
        ${has(shop.badges) ? `<ul class="badges">${shop.badges.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      </div>
    </section>

    ${has(shop.offer?.title) ? `<section class="section">
      <div class="wrap">
        <article class="ticket">
          ${has(shop.offer.label) ? `<p class="ticket-label">${esc(shop.offer.label)}</p>` : ''}
          <h2>${esc(shop.offer.title.replace(/\*/g, ''))}</h2>
          ${has(shop.offer.details) ? `<p>${esc(shop.offer.details)}</p>` : ''}
          <div class="cta-row">
            <a class="btn btn-ticket" href="${esc(book.href)}"${book.attrs}>${esc(shop.offer.cta || book.label)}</a>
            <a class="btn btn-ticket-outline" href="${tel}" data-track="call">${icon.phone}Call ${esc(b.phone)}</a>
          </div>
          ${has(shop.offer.fine) ? `<p class="fine">${esc(shop.offer.fine)}</p>` : ''}
        </article>
      </div>
    </section>` : ''}

    <section class="section" id="services">
      <div class="wrap">
        <h2>${accent(shop.servicesHeadline || 'What we fix')}</h2>
        <div class="cards">
          ${shop.services.map((s) => `<article class="card">
            <h3>${esc(s.name)}</h3>
            ${has(s.desc) ? `<p>${esc(s.desc)}</p>` : ''}
            ${has(s.price) ? `<p class="price">${esc(s.price)}</p>` : ''}
          </article>`).join('')}
        </div>
      </div>
    </section>

    ${has(shop.why) ? `<section class="section">
      <div class="wrap">
        <h2>${accent(shop.whyHeadline || 'Why drivers come back')}</h2>
        <div class="why-grid">
          ${shop.why.map((w) => `<div><h3>${esc(w.title)}</h3><p>${esc(w.text)}</p></div>`).join('')}
        </div>
      </div>
    </section>` : ''}

    ${showReviews ? `<section class="section" id="reviews">
      <div class="wrap">
        <h2>${accent(r.headline || 'What drivers say')}</h2>
        ${rating}
        <div class="cards">
          ${reviewItems.slice(0, 3).map((i) => `<figure class="card review">
            <blockquote>&ldquo;${esc(i.quote)}&rdquo;</blockquote>
            ${has(i.author) ? `<figcaption>${esc(i.author)}</figcaption>` : ''}
          </figure>`).join('')}
        </div>
        ${has(reviewsUrl) ? `<p class="more"><a href="${esc(reviewsUrl)}" target="_blank" rel="noopener">Read all our reviews on Google</a></p>` : ''}
      </div>
    </section>` : '<!-- Reviews slot: add real Google reviews to reviews.items in the shop JSON and this section appears. -->'}

    ${formOn ? `<section class="section" id="book">
      <div class="wrap form-grid">
        <div>
          <h2>${accent(shop.form?.headline || 'Tell us what your car needs.')}</h2>
          <p class="lead">${esc(shop.form?.promise || 'We call you back fast during business hours with a price and a time.')}</p>
          <p class="or">Faster? <a href="${tel}" data-track="call">Call ${esc(b.phone)}</a></p>
        </div>
        <form name="booking" method="POST" action="/thanks" data-netlify="true" netlify-honeypot="bot-field" class="form">
          <input type="hidden" name="form-name" value="booking">
          <p class="hp"><label>Leave this empty <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>
          <label>Your name<input name="name" required autocomplete="name"></label>
          <label>Phone<input name="phone" type="tel" required autocomplete="tel" inputmode="tel"></label>
          <label>Car (year, make, model)<input name="vehicle" placeholder="2018 Honda Accord"></label>
          <label>What do you need?
            <select name="service">
              ${shop.services.map((s) => `<option>${esc(s.name)}</option>`).join('')}
              <option>Something else</option>
            </select>
          </label>
          <label class="full">Anything else? <span class="opt">(optional)</span><textarea name="message" rows="3" placeholder="Noises, warning lights, when you can drop it off"></textarea></label>
          <button class="btn full" type="submit">${esc(shop.form?.button || 'Send my request')}</button>
        </form>
      </div>
    </section>` : ''}

    <section class="section" id="location">
      <div class="wrap loc-grid">
        <div>
          <h2>${accent(shop.locationHeadline || `Find us in ${b.address.city}`)}</h2>
          <address>${icon.pin}<span>${esc(b.address.street)}<br>${esc(b.address.city)}, ${esc(b.address.state)} ${esc(b.address.zip)}</span></address>
          <table class="hours">
            <caption>Hours</caption>
            <tbody>${shop.hours.map((h) => `<tr><th scope="row">${esc(h.days)}</th><td>${esc(h.time)}</td></tr>`).join('')}</tbody>
          </table>
          <p class="more"><a href="${esc(directions)}" target="_blank" rel="noopener">Get directions</a></p>
        </div>
        <div class="map">
          <iframe title="Map to ${esc(b.name)}" src="https://maps.google.com/maps?q=${mapsQ}&amp;output=embed" width="600" height="400" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
        </div>
      </div>
    </section>

    ${has(shop.faq) ? `<section class="section">
      <div class="wrap">
        <h2>${accent(shop.faqHeadline || 'Good to know')}</h2>
        <div class="faq">
          ${shop.faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}
        </div>
      </div>
    </section>` : ''}
  </main>

  ${footer(shop)}

  <nav class="dock" aria-label="Call or book">
    <a class="btn" href="${tel}" data-track="call">${icon.phone}Call</a>
    <a class="btn btn-outline" href="${esc(book.href)}"${book.attrs}>${icon.cal}Book</a>
  </nav>

  ${schema(shop)}
  ${has(shop.tracking?.metaPixelId) ? `<script>document.addEventListener('click',function(e){var a=e.target.closest('[data-track="call"]');if(a&&window.fbq)fbq('track','Contact');});</script>` : ''}
</body>
</html>
`;
}

export function renderThanks(shop, theme) {
  const b = shop.business;
  return `${head(shop, theme, { title: `Thanks | ${b.name}`, description: `Your request was sent to ${b.name}.`, path: '/thanks', noindex: true })}
<body>
  <header class="topbar"><div class="wrap topbar-row"><a class="logo" href="/">${esc(b.shortName || b.name)}</a><a class="btn btn-sm" href="${telHref(b.phone)}" aria-label="Call ${esc(b.phone)}">${icon.phone}<span>${esc(b.phone)}</span></a></div></header>
  <main class="thanks wrap">
    <h1>Got it. <em>We'll call you shortly.</em></h1>
    <p class="lead">${esc(shop.form?.thanks || `Your request went straight to ${b.name}. If it's urgent, call us now.`)}</p>
    <div class="cta-row"><a class="btn" href="${telHref(b.phone)}">${icon.phone}Call ${esc(b.phone)}</a></div>
    <p class="more"><a href="/">Back to the site</a></p>
  </main>
  ${footer(shop)}
  ${has(shop.tracking?.metaPixelId) ? `<script>window.fbq&&fbq('track','Lead');</script>` : ''}
</body>
</html>
`;
}
