/* www.byrobes.com home — the waitlist. */
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
      node.id = form.id; // keeps the header's #waitlist link pointing somewhere
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
})();
