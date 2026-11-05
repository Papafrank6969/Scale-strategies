// Scale Strategies homepage. Vanilla, no dependencies, under 5KB.
(() => {
  const CAL = 'https://calendly.com/frank-tryscalestrategies';
  const PIXEL_ID = ''; // TODO(Frank): your Meta Pixel ID. Empty = no tracking at all.
  const desktop = matchMedia('(min-width: 768px)');
  const $ = (s) => document.querySelector(s);

  // Calendly URL with UTM pass-through from this page's URL.
  const here = new URLSearchParams(location.search);
  const p = new URLSearchParams({ hide_gdpr_banner: '1' });
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((k) => here.get(k) && p.set(k, here.get(k)));
  const calUrl = `${CAL}?${p}`;
  document.querySelectorAll('[data-cal-link]').forEach((a) => { a.href = calUrl; });

  // Load Calendly only when needed.
  let calPromise;
  const loadCal = (css) => {
    if (css && !$('link[data-cal-css]')) {
      const l = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: 'https://assets.calendly.com/assets/external/widget.css' });
      l.dataset.calCss = '';
      document.head.append(l);
    }
    return calPromise ||= new Promise((res, rej) => {
      const s = Object.assign(document.createElement('script'), { src: 'https://assets.calendly.com/assets/external/widget.js', async: true });
      s.onload = () => (window.Calendly ? res(window.Calendly) : rej());
      s.onerror = rej;
      document.head.append(s);
      setTimeout(rej, 6000);
    });
  };

  // Desktop: inline embed, injected when #audit is within ~600px of the viewport.
  const inline = $('#cal-inline');
  if (inline && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting || !desktop.matches) return;
      io.disconnect();
      loadCal(false).then((C) => C.initInlineWidget({ url: calUrl, parentElement: inline })).catch(() => {
        inline.innerHTML = `<p style="padding:24px">Calendar didn't load. <a href="${calUrl}" target="_blank" rel="noopener">Open it on Calendly</a>.</p>`;
      });
    }, { rootMargin: '600px 0px' });
    io.observe(inline);
  }

  // Every CTA: smooth-scroll to #audit on desktop (native anchor), popup on mobile.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-cta]');
    if (!a || desktop.matches) return;
    e.preventDefault();
    loadCal(true).then((C) => C.initPopupWidget({ url: calUrl })).catch(() => { location.href = calUrl; });
  });

  // Sticky bar: after the hero CTA leaves the viewport, hidden while #audit is in view.
  const bar = $('#sticky'), hero = $('#hero-cta'), audit = $('#audit');
  if (bar && hero && audit && 'IntersectionObserver' in window) {
    let past = false, inAudit = false;
    const sync = () => {
      const show = past && !inAudit;
      bar.classList.toggle('show', show);
      bar.inert = !show;
    };
    new IntersectionObserver(([e]) => { past = !e.isIntersecting && e.boundingClientRect.top < 0; sync(); }).observe(hero);
    new IntersectionObserver(([e]) => { inAudit = e.isIntersecting; sync(); }).observe(audit);
    sync();
  }

  // Meta Pixel (only if an ID is set) + "Schedule" event when someone books.
  if (PIXEL_ID) {
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', PIXEL_ID); fbq('track', 'PageView');
  }
  addEventListener('message', (e) => {
    if (e.origin === 'https://calendly.com' && e.data && e.data.event === 'calendly.event_scheduled' && window.fbq) fbq('track', 'Schedule');
  });

  const yr = $('#yr');
  if (yr) yr.textContent = new Date().getFullYear();
})();
