/* www.byrobes.com/support — question search. */
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
})();
