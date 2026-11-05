// Scale Strategies homepage. Vanilla, no dependencies.
(() => {
  const CAL = 'https://calendly.com/frank-tryscalestrategies';
  const PIXEL_ID = ''; // TODO(Frank): your Meta Pixel ID. Empty = no tracking at all.
  const desktop = matchMedia('(min-width: 768px)');
  const $ = (s) => document.querySelector(s);
  const store = { get: (k) => { try { return JSON.parse(sessionStorage.getItem(k)); } catch { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch {} } };

  // Calendly URL: UTMs from this page + the qualifying answers as a1-a3 (match the Calendly question order).
  const here = new URLSearchParams(location.search);
  const calUrl = (answers) => {
    const p = new URLSearchParams({ hide_gdpr_banner: '1' });
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((k) => here.get(k) && p.set(k, here.get(k)));
    (answers || []).forEach((a, i) => p.set(`a${i + 1}`, a));
    return `${CAL}?${p}`;
  };
  const setLinks = (answers) => document.querySelectorAll('[data-cal-link]').forEach((a) => { a.href = calUrl(answers); });
  setLinks();

  let calPromise;
  const loadCal = (css) => {
    if (css && !$('link[data-cal-css]')) {
      const l = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: 'https://assets.calendly.com/assets/external/widget.css' });
      l.dataset.calCss = '';
      document.head.append(l);
    }
    return calPromise ||= new Promise((res, rej) => {
      const s = Object.assign(document.createElement('script'), { src: 'https://assets.calendly.com/assets/external/widget.js', async: true });
      const t = setTimeout(rej, 6000);
      s.onload = () => { clearTimeout(t); window.Calendly ? res(window.Calendly) : rej(); };
      s.onerror = () => { clearTimeout(t); rej(); };
      document.head.append(s);
    });
  };
  const popup = (answers) => loadCal(true).then((C) => C.initPopupWidget({ url: calUrl(answers) })).catch(() => { location.href = calUrl(answers); });

  // Qualifying form
  const form = $('#qualify'), yes = $('#q-yes'), no = $('#q-no'), later = $('#later'), inline = $('#cal-inline'), err = form && form.querySelector('.q-error');
  const QUESTIONS = ['li', 'speed', 'budget'];
  const LABELS = { yes: 'Yes', no: 'No' };
  let inlineDone = false;

  const showYes = (answers, open, focus = true) => {
    form.hidden = true; no.hidden = true; yes.hidden = false;
    setLinks(answers);
    if (focus) yes.querySelector('h3').focus();
    if (desktop.matches && !inlineDone) {
      inlineDone = true;
      loadCal(false).then((C) => C.initInlineWidget({ url: calUrl(answers), parentElement: inline })).catch(() => {
        inline.innerHTML = `<p style="padding:24px">Calendar didn't load. <a href="${calUrl(answers)}" target="_blank" rel="noopener">Open it on Calendly</a>.</p>`;
      });
    } else if (open && !desktop.matches) popup(answers);
  };

  if (form) {
    form.addEventListener('change', () => { err.hidden = true; form.querySelectorAll('fieldset').forEach((f) => { f.classList.remove('missing'); f.removeAttribute('aria-describedby'); }); });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const missing = QUESTIONS.filter((q) => !data.get(q));
      if (missing.length) {
        missing.forEach((q) => { const f = form.querySelector(`[name="${q}"]`).closest('fieldset'); f.classList.add('missing'); f.setAttribute('aria-describedby', 'q-error'); });
        err.textContent = `Answer all ${QUESTIONS.length} to see open times (${missing.length} left).`;
        err.hidden = false;
        form.querySelector(`[name="${missing[0]}"]`).focus();
        return;
      }
      const fail = [...form.querySelectorAll('[data-need]')].find((f) => f.querySelector('input:checked').value !== f.dataset.need);
      if (fail) {
        form.hidden = true; no.hidden = false;
        no.querySelectorAll('[data-msg]').forEach((p) => { p.hidden = p.dataset.msg !== fail.dataset.no; });
        later.elements.reason.value = fail.dataset.no;
        no.querySelector('h3').focus();
        return;
      }
      const answers = QUESTIONS.map((q) => LABELS[data.get(q)] || data.get(q));
      store.set('ss-qualified', answers);
      if (window.fbq) fbq('track', 'Lead');
      showYes(answers, true);
    });
    $('#q-back').addEventListener('click', () => { no.hidden = true; form.hidden = false; form.querySelector('input').focus(); });

    // "Not a fit" isn't a dead end: capture a phone/email via Netlify Forms.
    later.addEventListener('submit', (e) => {
      e.preventDefault();
      const done = $('#later-done'), btn = later.querySelector('button');
      if (!later.elements.contact.value.trim()) return later.elements.contact.focus();
      btn.disabled = true;
      fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(later)) })
        .then((r) => { if (!r.ok) throw 0; later.hidden = true; done.hidden = false; })
        .catch(() => { btn.disabled = false; done.hidden = false; done.textContent = "That didn't send. Email frank@tryscalestrategies.com instead."; });
    });
    const saved = store.get('ss-qualified');
    if (Array.isArray(saved)) { form.hidden = true; yes.hidden = false; setLinks(saved); if (desktop.matches) showYes(saved, false, false); }
  }

  // Desktop: warm up Calendly's script when #audit gets close, so the calendar appears fast after the check.
  const audit = $('#audit');
  if (audit && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((en) => { if (en[0].isIntersecting && desktop.matches) { io.disconnect(); loadCal(false).catch(() => {}); } }, { rootMargin: '600px 0px' });
    io.observe(audit);
  }

  // CTAs scroll to the check at #audit. Already qualified on a phone: straight to the calendar popup.
  document.addEventListener('click', (e) => {
    const pop = e.target.closest('[data-popup]');
    const cta = e.target.closest('[data-cta]');
    const saved = store.get('ss-qualified');
    if (pop || (cta && saved && !desktop.matches)) { e.preventDefault(); popup(saved); }
  });

  // Sticky bar: after the hero CTA leaves the viewport, hidden while #audit is in view.
  const bar = $('#sticky'), hero = $('#hero-cta');
  if (bar && hero && audit && 'IntersectionObserver' in window) {
    let past = false, inAudit = false;
    const sync = () => { const show = past && !inAudit; bar.classList.toggle('show', show); bar.inert = !show; };
    new IntersectionObserver(([e]) => { past = !e.isIntersecting && e.boundingClientRect.top < 0; sync(); }).observe(hero);
    new IntersectionObserver(([e]) => { inAudit = e.isIntersecting; sync(); }).observe(audit);
    sync();
  }

  // Meta Pixel (only if an ID is set) + "Schedule" when someone books.
  if (PIXEL_ID) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', PIXEL_ID); fbq('track', 'PageView');
  }
  addEventListener('message', (e) => {
    if (e.origin === 'https://calendly.com' && e.data && e.data.event === 'calendly.event_scheduled' && window.fbq) fbq('track', 'Schedule');
  });

  const yr = $('#yr');
  if (yr) yr.textContent = new Date().getFullYear();
})();
