/* Token Radar dashboard (vanilla JS, no network).
 *
 * Model radar-2, stated here so the page shows its own working:
 *   implied = TVL x category multiple x size factor x growth x maturity
 *   category multiple = median market-cap/TVL of the tokenised protocols in the same
 *     category, in this same snapshot (thin categories fall back to the whole-market
 *     median 0.21); clamped to 0.05-1.00.
 *   size factor = (100M / TVL) ^ 0.12, clamped to 0.6-1.4.
 *   growth = 1 + clamp(7d change %, -30..60) / 100 x 0.5.
 *   maturity = 0.65 + 0.35 x ln(1 + age days) / ln(1 + 1095).
 * No protocol name is ever special-cased. Farm plans come from board.json (data.js),
 * generated from each protocol's own category, chains, TVL and age.
 */
(function () {
  'use strict';
  var D = window.RADAR;
  if (!D) { document.getElementById('rows').innerHTML = '<tr><td colspan="8">No data.</td></tr>'; return; }

  var $ = function (id) { return document.getElementById(id); };
  var rowsEl = $('rows'), detailEl = $('detail'), countEl = $('count'), metaEl = $('meta');
  var qEl = $('q'), catEl = $('cat'), chainEl = $('chain'), wlEl = $('wl');

  function money(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
    return '$' + Math.round(n);
  }
  function pct(n) {
    if (n === null || n === undefined) return '—';
    var s = (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
    return '<span class="' + (n >= 0 ? 'up' : 'down') + '">' + s + '</span>';
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function shortChains(r) {
    if (!r.chains.length) return '—';
    if (r.chains.length <= 3) return esc(r.chains.join(', '));
    return esc(r.chains.slice(0, 3).join(', ')) + ' +' + (r.chains.length - 3);
  }

  var watch = {};
  D.rows.forEach(function (r) { watch[r.slug] = !!r.watchlist; });

  metaEl.innerHTML = 'Snapshot <b>' + esc(D.as_of) + '</b> · DefiLlama · ' +
    'watchlist <b>' + D.watchlist_size + '</b> · board <b>' + D.board_size + '</b> rows (' +
    D.early_size + ' early) · floor <b>$50M</b> · model <b>' + esc(D.model_version) + '</b> · ' +
    'market median multiple <b>' + D.global_multiple.toFixed(2) + '</b>';

  var cats = [], chains = [];
  D.rows.forEach(function (r) {
    if (r.category && cats.indexOf(r.category) < 0) cats.push(r.category);
    r.chains.forEach(function (c) { if (chains.indexOf(c) < 0) chains.push(c); });
  });
  cats.sort(); chains.sort();
  cats.forEach(function (c) { catEl.add(new Option(c, c)); });
  chains.forEach(function (c) { chainEl.add(new Option(c, c)); });

  var sortKey = 'rank', sortDir = 1;
  var state = { q: '', cat: '', chain: '', wl: false, detail: null };

  function readHash() {
    var h = location.hash.replace(/^#/, '');
    h.split('&').forEach(function (pair) {
      var kv = pair.split('=');
      if (kv.length !== 2) return;
      var k = decodeURIComponent(kv[0]), v = decodeURIComponent(kv[1]);
      if (k === 'q') state.q = v;
      if (k === 'cat') state.cat = v;
      if (k === 'chain') state.chain = v;
      if (k === 'wl') state.wl = v === '1';
      if (k === 'detail') state.detail = v;
      if (k === 'sort') { var p = v.split('_'); sortKey = p[0]; sortDir = p[1] === 'desc' ? -1 : 1; }
      if (k === 'tab') showTab(v);
    });
    qEl.value = state.q; catEl.value = state.cat; chainEl.value = state.chain; wlEl.checked = state.wl;
  }
  function writeHash() {
    var parts = [];
    if (state.q) parts.push('q=' + encodeURIComponent(state.q));
    if (state.cat) parts.push('cat=' + encodeURIComponent(state.cat));
    if (state.chain) parts.push('chain=' + encodeURIComponent(state.chain));
    if (state.wl) parts.push('wl=1');
    if (state.detail) parts.push('detail=' + encodeURIComponent(state.detail));
    if (sortKey !== 'rank' || sortDir !== 1) parts.push('sort=' + sortKey + '_' + (sortDir === 1 ? 'asc' : 'desc'));
    history.replaceState(null, '', parts.length ? '#' + parts.join('&') : location.pathname + location.search);
  }

  function filtered() {
    var q = state.q.toLowerCase();
    return D.rows.filter(function (r) {
      if (state.wl && !watch[r.slug]) return false;
      if (state.cat && r.category !== state.cat) return false;
      if (state.chain && r.chains.indexOf(state.chain) < 0) return false;
      if (q && (r.name.toLowerCase().indexOf(q) < 0 && r.slug.toLowerCase().indexOf(q) < 0)) return false;
      return true;
    });
  }
  function val(r, k) {
    if (k === 'chains') return r.chains.join(', ');
    if (k === 'age_days') return r.age_days === null ? -1 : r.age_days;
    if (k === 'change_7d') return r.change_7d === null ? -999 : r.change_7d;
    return r[k];
  }
  function render() {
    var list = filtered().slice();
    list.sort(function (a, b) {
      var x = val(a, sortKey), y = val(b, sortKey);
      if (typeof x === 'string') return sortDir * (x < y ? -1 : x > y ? 1 : 0);
      return sortDir * (x - y);
    });
    countEl.textContent = list.length + ' of ' + D.rows.length + ' rows';
    rowsEl.innerHTML = list.map(function (r) {
      return '<tr class="row' + (state.detail === r.slug ? ' sel' : '') + '" data-slug="' + esc(r.slug) + '">' +
        '<td class="num">' + r.rank + '</td>' +
        '<td><span class="sym">' + esc(r.name) + '</span>' +
          (r.watchlist ? '<span class="watch">WATCH</span>' : '') + '</td>' +
        '<td class="cat">' + esc(r.category || '—') + '</td>' +
        '<td class="cat">' + shortChains(r) + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + (r.age_days === null ? '—' : r.age_days + 'd') + '</td>' +
        '<td class="num"><b>' + money(r.implied_value_usd) + '</b></td></tr>';
    }).join('');
    document.querySelectorAll('th[data-sort]').forEach(function (th) {
      th.classList.toggle('sorted', th.getAttribute('data-sort') === sortKey);
    });
    renderDetail();
  }
  function renderDetail() {
    if (!state.detail) { detailEl.hidden = true; detailEl.innerHTML = ''; return; }
    var r = null;
    D.rows.forEach(function (x) { if (x.slug === state.detail) r = x; });
    if (!r) { detailEl.hidden = true; return; }
    var math = money(r.tvl_usd) + ' TVL × ' + r.category_multiple.toFixed(2) + ' category × ' +
      r.size_multiplier.toFixed(2) + ' size × ' + r.growth_multiplier.toFixed(2) + ' growth × ' +
      r.maturity_multiplier.toFixed(2) + ' maturity = <b>' + money(r.implied_value_usd) + '</b>';
    detailEl.innerHTML = '<button class="close" id="detail-close">Close</button>' +
      '<h2><span class="rank">#' + r.rank + '</span> ' + esc(r.name) + '</h2>' +
      '<div class="facts"><span>Category <b>' + esc(r.category || '—') + '</b></span>' +
      '<span>Chains <b>' + esc(r.chains.join(', ') || '—') + '</b></span>' +
      '<span>TVL <b>' + money(r.tvl_usd) + '</b></span>' +
      '<span>7d <b>' + (r.change_7d === null ? '—' : (r.change_7d >= 0 ? '+' : '') + r.change_7d.toFixed(1) + '%') + '</b></span>' +
      '<span>Listed <b>' + esc(r.listed_at || '—') + '</b></span>' +
      '<span>Age <b>' + (r.age_days === null ? '—' : r.age_days + ' days') + '</b></span></div>' +
      '<div class="math">' + math + '</div>' +
      '<h3>Farm plan</h3><ol>' +
      r.farm_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>';
    detailEl.hidden = false;
    var closeBtn = $('detail-close');
    if (closeBtn) closeBtn.addEventListener('click', function () {
      state.detail = null; writeHash(); render();
    });
  }

  // Watchlist membership comes from the data (r.watchlist); the filter uses the same set.
  rowsEl.addEventListener('click', function (ev) {
    var tr = ev.target.closest('tr.row');
    if (!tr) return;
    var slug = tr.getAttribute('data-slug');
    state.detail = state.detail === slug ? null : slug;
    writeHash(); render();
  });
  document.querySelectorAll('th[data-sort]').forEach(function (th) {
    th.addEventListener('click', function () {
      var k = th.getAttribute('data-sort');
      if (sortKey === k) sortDir = -sortDir; else { sortKey = k; sortDir = 1; }
      writeHash(); render();
    });
  });
  qEl.addEventListener('input', function () { state.q = qEl.value; state.detail = null; writeHash(); render(); });
  catEl.addEventListener('change', function () { state.cat = catEl.value; state.detail = null; writeHash(); render(); });
  chainEl.addEventListener('change', function () { state.chain = chainEl.value; state.detail = null; writeHash(); render(); });
  wlEl.addEventListener('change', function () { state.wl = wlEl.checked; state.detail = null; writeHash(); render(); });

  function showTab(tab) {
    ['board', 'live', 'method'].forEach(function (t) {
      $('view-' + t).hidden = t !== tab;
      document.querySelector('[data-tab="' + t + '"]').classList.toggle('on', t === tab);
    });
    $('controls').style.display = tab === 'board' ? '' : 'none';
    if (tab === 'live') renderLive();
  }
  document.querySelectorAll('#tabs button').forEach(function (b) {
    b.addEventListener('click', function () { showTab(b.getAttribute('data-tab')); });
  });
  function renderLive() {
    $('liverows').innerHTML = D.live.map(function (r) {
      return '<tr><td><span class="sym">' + esc(r.name) + '</span></td>' +
        '<td class="cat">' + esc(r.category || '—') + '</td>' +
        '<td class="cat">' + shortChains(r) + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num"><b>' + money(r.mcap_usd) + '</b></td>' +
        '<td class="num">' + pct(r.change_7d) + '</td></tr>';
    }).join('');
  }

  readHash();
  render();
})();
