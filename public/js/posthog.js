/* ══ PostHog — autocapture, session replay and the product events the app
   already fires (ADR-3: analytics stays bought, not built).

   The project API key is a PUBLIC, write-only ingestion key — PostHog's own
   install is a client-side snippet — so it lives here rather than behind a
   server injection, and one file is the single source of truth for every
   page. Paste the key from eu.posthog.com → Settings → Project → Project API
   key. Until it is pasted this file is a no-op: nothing loads, nothing fires.

   EVERY app-side call must go through window.__rbPH(fn). The library loads
   async and is blocked outright by most ad blockers, so nothing may assume
   window.posthog exists. Calls made before it lands are queued; calls made
   when it never lands are dropped silently — the same rule the Supabase
   capture plane follows: analytics never surfaces to the user and never
   blocks a flow. */
(function () {
  var KEY = 'phc_Bs8KY64rq6xr7g63sdFJr2y8H6QNyMoqtxUuPbJRJavU';
  var API_HOST = 'https://eu.i.posthog.com';
  var UI_HOST = 'https://eu.posthog.com';

  // Mirrors _RB_ENV in dashboard-personalize.js — beta and production share
  // one PostHog project exactly as they share one Supabase project, so every
  // event carries which one it came from.
  var ENV = (location.hostname === 'www.byrobes.com' || location.hostname === 'byrobes.com')
    ? 'production' : 'beta';

  var ph = null;
  var queue = [];

  window.__rbPH = function (fn) {
    try {
      if (ph) { fn(ph); return; }
      if (queue.length < 40) queue.push(fn);
    } catch (_) {}
  };

  // Identity is the Supabase uid, so one tester is one person across the
  // marketing page, signup, onboarding, the dashboard and style notes.
  window.__rbPHUser = function (session, profile) {
    try {
      var u = session && session.user;
      if (!u || !u.id) return;
      var p = profile || {};
      var props = { email: u.email || undefined, environment: ENV };
      if (p.first_name) props.first_name = p.first_name;
      if (typeof p.wardrobe_items_count === 'number') props.wardrobe_items = p.wardrobe_items_count;
      if (p.onboarded_at !== undefined) props.onboarded = !!p.onboarded_at && p.onboarded_at !== 'unknown';
      window.__rbPH(function (x) { x.identify(u.id, props); });
    } catch (_) {}
  };

  // Called on sign-out: without it the next account signed in on this browser
  // inherits the previous person — the same leak class as the unscoped
  // localStorage keys (rb_onboarded, robes_style_notes__anon).
  window.__rbPHReset = function () {
    window.__rbPH(function (x) { x.reset(); });
  };

  if (KEY.indexOf('phc_') !== 0 || KEY.indexOf('REPLACE') !== -1) return;

  // The dashboard is ONE page that pushes real paths for every overlay
  // (_rbNav → history.pushState: /diary, /lookbook, /piece/:id …), so a
  // load-only pageview would report one screen per session. capture_pageview
  // is therefore off and pageviews are fired here — explicit, and immune to
  // which pageview default the CDN's array.js happens to ship that week.
  var lastPath = null;
  function pageview() {
    var path = location.pathname + location.search;
    if (path === lastPath) return;
    lastPath = path;
    window.__rbPH(function (x) { x.capture('$pageview'); });
  }
  ['pushState', 'replaceState'].forEach(function (m) {
    var orig = history[m];
    history[m] = function () {
      var r = orig.apply(this, arguments);
      try { pageview(); } catch (_) {}
      return r;
    };
  });
  window.addEventListener('popstate', pageview);

  var s = document.createElement('script');
  s.src = 'https://eu-assets.i.posthog.com/static/array.js';
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.onload = function () {
    try {
      window.posthog.init(KEY, {
        api_host: API_HOST,
        ui_host: UI_HOST,
        // Anonymous traffic (the marketing page, a shared /board link) costs
        // nothing until she signs up and __rbPHUser identifies her.
        person_profiles: 'identified_only',
        capture_pageview: false,
        session_recording: {
          // FREE LOVE (2026-09-16, Annie's call): every field records as
          // typed, so replay can be read for what she actually asks Robes
          // for — the prompt box is the point. Passwords stay masked, and
          // BOTH password inputs also carry class="ph-no-capture" because
          // their Show toggle flips type to "text", which would otherwise
          // defeat maskInputOptions at exactly the wrong moment.
          // Add class="ph-no-capture" to mask anything else.
          maskAllInputs: false,
          maskInputOptions: { password: true }
        }
      });
      window.posthog.register({ environment: ENV });
      ph = window.posthog;
      pageview();
      var q = queue.splice(0);
      for (var i = 0; i < q.length; i++) { try { q[i](ph); } catch (_) {} }
    } catch (e) {
      console.warn('[robes] posthog init failed:', e && e.message);
    }
  };
  document.head.appendChild(s);
})();
