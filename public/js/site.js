/* www.byrobes.com home — waitlist + the typed prompt card. */
(function () {
  'use strict';

  // ── Waitlist ─────────────────────────────────────────────────────
  // Posts to /api/waitlist, which upserts the email into Airtable "Contacts"
  // (server.js). Both forms share one state: join in one, both show it.
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var NOTE = 'Be the first to know when Robes launches.';
  var forms = [].slice.call(document.querySelectorAll('form.waitlist'));
  var busy = false;

  function setNote(form, text, isErr) {
    form.classList.toggle('err', !!isErr);
    form.querySelector('.wl-note').textContent = text;
  }

  function showJoined(email) {
    var tpl = document.getElementById('wl-joined');
    forms.forEach(function (form) {
      var node = tpl.content.firstElementChild.cloneNode(true);
      node.querySelector('.wl-email').textContent = email;
      form.replaceWith(node);
    });
  }

  function join(form) {
    if (busy) return;
    var input = form.querySelector('input[type=email]');
    var email = (input.value || '').trim();
    if (!EMAIL_RE.test(email)) {
      setNote(form, 'Please enter a valid email address.', true);
      input.focus();
      return;
    }
    busy = true;
    forms.forEach(function (f) { f.querySelector('button').disabled = true; });
    fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email })
    }).then(function (res) {
      if (res.ok) return showJoined(email);
      setNote(form, res.status === 400 ? 'Please enter a valid email address.' : 'Something went wrong. Please try again.', true);
    }).catch(function () {
      setNote(form, 'Something went wrong. Please try again.', true);
    }).then(function () {
      busy = false;
      forms.forEach(function (f) { var b = f.querySelector('button'); if (b) b.disabled = false; });
    });
  }

  forms.forEach(function (form) {
    form.addEventListener('submit', function (e) { e.preventDefault(); join(form); });
    form.querySelector('input').addEventListener('input', function () {
      if (form.classList.contains('err')) setNote(form, NOTE, false);
    });
  });

  // ── Typed prompt card ────────────────────────────────────────────
  var PROMPTS = [
    { t: 'What should I wear today — smart but effortless.', c: ['Dublin · 11°'] },
    { t: 'Plan my outfits for the week — three office days and a client dinner.', c: ['Mon – Fri'] },
    { t: 'Help me pack for a long weekend in Paris. One bag.', c: ['Paris · 3 nights'] },
    { t: 'Build me a summer capsule from what I own, with shopping suggestions for what I’m missing.', c: [] }
  ];
  var PIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z"/><circle cx="12" cy="11" r="2"/></svg>';
  var typed = document.getElementById('pc-typed');
  var chips = document.getElementById('pc-chips');
  var dots = [].slice.call(document.querySelectorAll('#pc-dots span'));
  if (!typed) return;

  var i = 0, n = 0, dir = 1, shownChips = -1;
  function paint() {
    var p = PROMPTS[i];
    typed.textContent = p.t.slice(0, n);
    var want = n > 0 ? i : -1;
    if (want !== shownChips) {
      shownChips = want;
      chips.innerHTML = '';
      if (want >= 0) p.c.forEach(function (c) {
        var s = document.createElement('span');
        s.className = 'chip';
        s.innerHTML = PIN;
        s.appendChild(document.createTextNode(c));
        chips.appendChild(s);
      });
    }
    dots.forEach(function (d, k) { d.classList.toggle('on', k === i); });
  }

  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  if (reduce) {
    n = PROMPTS[0].t.length; paint();
    setInterval(function () { i = (i + 1) % PROMPTS.length; n = PROMPTS[i].t.length; paint(); }, 4000);
    return;
  }

  n = 0; paint();
  function tick() {
    var len = PROMPTS[i].t.length;
    if (dir === 1) {
      if (n < len) { n++; paint(); setTimeout(tick, 38 + Math.random() * 46); }
      else { dir = -1; setTimeout(tick, 2200); }
    } else {
      if (n > 0) { n--; paint(); setTimeout(tick, 16); }
      else { dir = 1; i = (i + 1) % PROMPTS.length; paint(); setTimeout(tick, 420); }
    }
  }
  setTimeout(tick, 600);
})();
