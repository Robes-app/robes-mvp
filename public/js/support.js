/* www.byrobes.com/support — question search + "Write to Robes". */
(function () {
  'use strict';

  // ── Search: show the questions whose words match, open the first ──
  var input = document.getElementById('faq-search');
  var items = [].slice.call(document.querySelectorAll('#faq-list details'));
  var none = document.getElementById('faq-none');
  function norm(s) { return s.toLowerCase().replace(/[’']/g, "'"); }
  input.addEventListener('input', function () {
    var words = norm(input.value).split(/\s+/).filter(Boolean);
    var first = null;
    items.forEach(function (d) {
      var text = norm(d.textContent);
      var hit = words.every(function (w) { return text.indexOf(w) !== -1; });
      d.hidden = !hit;
      if (hit && !first) first = d;
    });
    none.hidden = !!first;
    if (words.length && first) items.forEach(function (d) { d.open = d === first; });
  });

  // ── Write to Robes: opens her email app, addressed to hello@byrobes.com ──
  var form = document.getElementById('write-form');
  var note = document.getElementById('write-note');
  function say(text, err) { note.textContent = text; note.classList.toggle('err', !!err); }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = form.email.value.trim(), topic = form.topic.value, msg = form.message.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { say('Please enter a valid email address.', true); form.email.focus(); return; }
    if (!topic) { say('Choose what it’s about.', true); form.topic.focus(); return; }
    if (!msg) { say('Tell Robes what happened.', true); form.message.focus(); return; }
    var body = msg + '\n\n— ' + email;
    window.location.href = 'mailto:hello@byrobes.com?subject=' + encodeURIComponent('Support · ' + topic) + '&body=' + encodeURIComponent(body);
    say('Your email app is opening with your message.');
  });
})();
