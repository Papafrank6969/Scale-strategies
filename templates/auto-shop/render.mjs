// Auto shop site template. Pure function: shop JSON in, HTML files out.
// Edit the design here. Edit a shop's content in clients/<slug>.json, never here.

const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// "*word*" in headlines becomes the accent-colored <em>word</em>.
const accent = (v) => esc(v).replace(/\*(.+?)\*/g, '<em>$1</em>');

const has = (v) => Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && String(v).trim() !== '';

const telHref = (phone) => {
  const d = String(phone).replace(/\D/g, '');
  return 'tel:+' + (d.length === 10 ? '1' + d : d);
};

const fullAddress = (a) => `${a.street}, ${a.city}, ${a.state} ${a.zip}`;

const icon = {
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.6a1 1 0 0 1-.25 1z" fill="currentColor"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" fill="currentColor"/></svg>',
  form: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v12H5.2L4 17.2V4zm2 3v2h12V7H6zm0 4v2h8v-2H6z" fill="currentColor"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" fill="currentColor"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 17.3 6.2 3.7-1.6-7 5.4-4.7-7.1-.6L12 2 9.1 8.7 2 9.3l5.4 4.7-1.6 7z" fill="currentColor"/></svg>',
};

function pixel(id) {
  if (!has(id)) return '';
  return `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${esc(id)}');fbq('track','PageView');</script>`;
}

function head(shop, { title, description, path = '/', noindex = false }) {
  const t = shop.theme || {};
  const url = has(shop.site.url) ? shop.site.url.replace(/\/$/, '') + path : '';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  ${url ? `<link rel="canonical" href="${esc(url)}">\n  <meta property="og:url" content="${esc(url)}">` : ''}
  ${noindex ? '<meta name="robots" content="noindex">' : ''}
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  ${has(shop.hero.image) ? `<meta property="og:image" content="${esc(url ? shop.site.url.replace(/\/$/, '') + '/' + shop.hero.image.replace(/^\//, '') : shop.hero.image)}">` : ''}
  <meta name="theme-color" content="${esc(t.dark || '#111318')}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
  <style>:root{--accent:${esc(t.accent || '#E11D2E')};--accent-ink:${esc(t.accentInk || '#FFFFFF')};--dark:${esc(t.dark || '#111318')}}</style>
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
  if (has(shop.hero.image) && has(shop.site.url)) data.image = shop.site.url.replace(/\/$/, '') + '/' + shop.hero.image.replace(/^\//, '');
  // No aggregateRating on purpose: self-published ratings aren't eligible for review stars.
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

function footer(shop) {
  const b = shop.business;
  return `<footer class="foot">
    <div class="wrap foot-grid">
      <div>
        <strong>${esc(b.name)}</strong><br>
        ${esc(b.address.street)}<br>${esc(b.address.city)}, ${esc(b.address.state)} ${esc(b.address.zip)}<br>
        <a href="${telHref(b.phone)}">${esc(b.phone)}</a>
      </div>
      ${has(b.serviceArea) ? `<div><strong>Serving</strong><br>${b.serviceArea.map(esc).join(', ')}</div>` : ''}
      <div class="foot-meta">
        ${has(b.license) ? `<span>${esc(b.license)}</span>` : ''}
        <span>&copy; ${new Date().getFullYear()} ${esc(b.name)}</span>
        ${shop.credit !== false ? '<a href="https://tryscalestrategies.com" rel="noopener">Website by Scale Strategies</a>' : ''}
      </div>
    </div>
  </footer>`;
}

export function renderIndex(shop) {
  const b = shop.business;
  const tel = telHref(b.phone);
  const addr = fullAddress(b.address);
  const mapsQ = encodeURIComponent(has(b.mapsQuery) ? b.mapsQuery : `${b.name}, ${addr}`);
  const directions = has(b.googleMapsUrl) ? b.googleMapsUrl : `https://www.google.com/maps/dir/?api=1&destination=${mapsQ}`;
  const booking = has(b.bookingUrl);
  const second = booking
    ? { href: b.bookingUrl, label: 'Book online', ext: true }
    : { href: '#quote', label: 'Get a free quote', ext: false };
  const ext = (x) => (x.ext ? ' target="_blank" rel="noopener"' : '');
  const r = shop.reviews || {};
  const reviewItems = (r.items || []).filter((i) => has(i.quote)).slice(0, 3);
  const showReviews = reviewItems.length > 0 || has(r.googleUrl || b.googleReviewsUrl);
  const reviewsUrl = r.googleUrl || b.googleReviewsUrl;
  const rating = has(r.rating) ? `<p class="rating">${icon.star}<b>${esc(r.rating)}</b> on Google${has(r.count) ? ` &middot; ${esc(r.count)} reviews` : ''}</p>` : '';
  const formOn = shop.form?.enabled !== false;
  const nav = [
    ['#services', 'Services'],
    showReviews ? ['#reviews', 'Reviews'] : null,
    ['#location', 'Hours &amp; location'],
  ].filter(Boolean);

  return `${head(shop, { title: shop.site.title, description: shop.site.description })}
<body>
  <a class="skip" href="#main">Skip to content</a>
  ${shop.demo ? '<div class="demo-flag">Template preview. Example business with placeholder details, not a real shop.</div>' : ''}
  <header class="top">
    <div class="wrap top-row">
      <a class="logo" href="/">${has(b.logo) ? `<img src="${esc(b.logo)}" alt="${esc(b.name)}" height="40">` : esc(b.shortName || b.name)}</a>
      <nav class="links" aria-label="Main">${nav.map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}</nav>
      <a class="btn call" href="${tel}" data-track="call">${icon.phone}<span>${esc(b.phone)}</span></a>
    </div>
  </header>

  <main id="main">
    <section class="hero${has(shop.hero.image) ? ' has-img' : ''}"${has(shop.hero.image) ? ` style="--hero:url('${esc(shop.hero.image)}')"` : ''}>
      <div class="wrap">
        ${has(shop.hero.eyebrow) ? `<p class="eyebrow">${esc(shop.hero.eyebrow)}</p>` : ''}
        <h1>${accent(shop.hero.headline)}</h1>
        ${has(shop.hero.sub) ? `<p class="sub">${esc(shop.hero.sub)}</p>` : ''}
        <div class="cta-row">
          <a class="btn big" href="${tel}" data-track="call">${icon.phone}Call ${esc(b.phone)}</a>
          <a class="btn big ghost" href="${esc(second.href)}"${ext(second)}>${second.label}</a>
        </div>
        ${rating}
        ${has(shop.badges) ? `<ul class="badges">${shop.badges.map((x) => `<li>${icon.check}${esc(x)}</li>`).join('')}</ul>` : ''}
      </div>
    </section>

    ${has(shop.offer?.title) ? `<section class="offer-wrap">
      <div class="wrap">
        <div class="offer">
          ${has(shop.offer.label) ? `<span class="pill">${esc(shop.offer.label)}</span>` : ''}
          <h2>${accent(shop.offer.title)}</h2>
          ${has(shop.offer.details) ? `<p>${esc(shop.offer.details)}</p>` : ''}
          <div class="cta-row">
            <a class="btn" href="${formOn ? '#quote' : tel}">${esc(shop.offer.cta || 'Claim this offer')}</a>
            <a class="btn ghost-dark" href="${tel}" data-track="call">${icon.phone}Call now</a>
          </div>
          ${has(shop.offer.fine) ? `<p class="fine">${esc(shop.offer.fine)}</p>` : ''}
        </div>
      </div>
    </section>` : ''}

    <section id="services">
      <div class="wrap">
        <p class="kicker">Services</p>
        <h2>${accent(shop.servicesHeadline || 'What we fix')}</h2>
        <div class="cards">
          ${shop.services.map((s) => `<article class="card">
            <h3>${esc(s.name)}</h3>
            ${has(s.desc) ? `<p>${esc(s.desc)}</p>` : ''}
            ${has(s.price) ? `<span class="price">${esc(s.price)}</span>` : ''}
          </article>`).join('')}
        </div>
      </div>
    </section>

    ${has(shop.why) ? `<section class="why">
      <div class="wrap">
        <p class="kicker">Why ${esc(b.shortName || b.name)}</p>
        <h2>${accent(shop.whyHeadline || 'Straight answers. Work done right.')}</h2>
        <div class="why-grid">
          ${shop.why.map((w) => `<div><h3>${esc(w.title)}</h3><p>${esc(w.text)}</p></div>`).join('')}
        </div>
      </div>
    </section>` : ''}

    ${showReviews ? `<section id="reviews" class="reviews">
      <div class="wrap">
        <p class="kicker">Reviews</p>
        <h2>${accent(r.headline || 'What drivers say')}</h2>
        ${rating}
        ${reviewItems.length ? `<div class="cards">
          ${reviewItems.map((i) => `<figure class="card review">
            <div class="stars" aria-label="5 stars">${icon.star.repeat(5)}</div>
            <blockquote>&ldquo;${esc(i.quote)}&rdquo;</blockquote>
            ${has(i.author) ? `<figcaption>${esc(i.author)}</figcaption>` : ''}
          </figure>`).join('')}
        </div>` : ''}
        ${has(reviewsUrl) ? `<p><a class="text-link" href="${esc(reviewsUrl)}" target="_blank" rel="noopener">Read all our reviews on Google &rarr;</a></p>` : ''}
      </div>
    </section>` : ''}

    ${formOn ? `<section id="quote" class="quote">
      <div class="wrap quote-grid">
        <div>
          <p class="kicker">Free quote</p>
          <h2>${accent(shop.form?.headline || 'Tell us what your car needs.')}</h2>
          <p class="sub">${esc(shop.form?.promise || 'We call you back fast during business hours with a price and a time.')}</p>
          <p class="or">Faster? <a href="${tel}" data-track="call">Call ${esc(b.phone)}</a></p>
        </div>
        <form name="quote" method="POST" action="/thanks" data-netlify="true" netlify-honeypot="bot-field" class="form">
          <input type="hidden" name="form-name" value="quote">
          <p class="hp"><label>Leave this empty <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>
          <label>Your name<input name="name" required autocomplete="name"></label>
          <label>Phone<input name="phone" type="tel" required autocomplete="tel" inputmode="tel"></label>
          <label>Car (year, make, model)<input name="vehicle" placeholder="e.g. 2018 Honda Accord"></label>
          <label>What do you need?
            <select name="service">
              ${shop.services.map((s) => `<option>${esc(s.name)}</option>`).join('')}
              <option>Something else</option>
            </select>
          </label>
          <label class="full">Anything else? <span class="opt">(optional)</span><textarea name="message" rows="3" placeholder="Noises, warning lights, when you can drop it off"></textarea></label>
          <button class="btn big full" type="submit">${esc(shop.form?.button || 'Get my free quote')}</button>
        </form>
      </div>
    </section>` : ''}

    <section id="location" class="location">
      <div class="wrap loc-grid">
        <div>
          <p class="kicker">Hours &amp; location</p>
          <h2>${accent(shop.locationHeadline || `Find us in ${b.address.city}`)}</h2>
          <address>${icon.pin}<span>${esc(b.address.street)}<br>${esc(b.address.city)}, ${esc(b.address.state)} ${esc(b.address.zip)}</span></address>
          <table class="hours">
            <tbody>${shop.hours.map((h) => `<tr><th scope="row">${esc(h.days)}</th><td>${esc(h.time)}</td></tr>`).join('')}</tbody>
          </table>
          <div class="cta-row">
            <a class="btn" href="${esc(directions)}" target="_blank" rel="noopener">${icon.pin}Get directions</a>
            <a class="btn ghost-dark" href="${tel}" data-track="call">${icon.phone}Call</a>
          </div>
        </div>
        <div class="map">
          <iframe title="Map to ${esc(b.name)}" src="https://maps.google.com/maps?q=${mapsQ}&amp;output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
        </div>
      </div>
    </section>

    ${has(shop.faq) ? `<section class="faq">
      <div class="wrap">
        <p class="kicker">Questions</p>
        <h2>${accent(shop.faqHeadline || 'Good to know')}</h2>
        <div class="faq-list">
          ${shop.faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}
        </div>
      </div>
    </section>` : ''}

    <section class="closer">
      <div class="wrap">
        <h2>${accent(shop.closer?.headline || 'Need it looked at this week?')}</h2>
        <p class="sub">${esc(shop.closer?.sub || 'Call now or send a quick request. We answer fast.')}</p>
        <div class="cta-row center">
          <a class="btn big" href="${tel}" data-track="call">${icon.phone}Call ${esc(b.phone)}</a>
          <a class="btn big ghost-dark" href="${esc(second.href)}"${ext(second)}>${second.label}</a>
        </div>
      </div>
    </section>
  </main>

  ${footer(shop)}

  <nav class="dock" aria-label="Quick actions">
    <a href="${tel}" data-track="call">${icon.phone}<span>Call</span></a>
    <a href="${esc(second.href)}"${ext(second)}>${icon.form}<span>${booking ? 'Book' : 'Quote'}</span></a>
    <a href="${esc(directions)}" target="_blank" rel="noopener">${icon.pin}<span>Directions</span></a>
  </nav>

  ${schema(shop)}
  ${has(shop.tracking?.metaPixelId) ? `<script>document.addEventListener('click',function(e){var a=e.target.closest('[data-track="call"]');if(a&&window.fbq)fbq('track','Contact');});</script>` : ''}
</body>
</html>
`;
}

export function renderThanks(shop) {
  const b = shop.business;
  return `${head(shop, { title: `Thanks | ${b.name}`, description: `Your request was sent to ${b.name}.`, path: '/thanks', noindex: true })}
<body>
  <header class="top"><div class="wrap top-row"><a class="logo" href="/">${esc(b.shortName || b.name)}</a><a class="btn call" href="${telHref(b.phone)}">${icon.phone}<span>${esc(b.phone)}</span></a></div></header>
  <main class="thanks wrap">
    <h1>Got it. <em>We'll call you shortly.</em></h1>
    <p class="sub">${esc(shop.form?.thanks || `Your request went straight to ${b.name}. If it's urgent, call us now.`)}</p>
    <div class="cta-row"><a class="btn big" href="${telHref(b.phone)}">${icon.phone}Call ${esc(b.phone)}</a><a class="btn big ghost-dark" href="/">Back to the site</a></div>
  </main>
  ${footer(shop)}
  ${has(shop.tracking?.metaPixelId) ? `<script>window.fbq&&fbq('track','Lead');</script>` : ''}
</body>
</html>
`;
}
