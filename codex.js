/* ====== 図鑑のページ。未収集のエンドには、ヒントを出す ====== */
(function () {
  'use strict';
  const G = GAME, C = COMMON, ENDS = G.ENDS;
  C.updateCollect();
  const cx = C.loadCodex();
  const codes = Object.keys(ENDS).sort();
  let got = 0;
  codes.forEach(function (c) { if (cx[c]) got += 1; });
  document.getElementById('codexCount').textContent = got + ' / ' + codes.length;

  function tile(c) {
    const e = ENDS[c];
    if (cx[c]) {
      return '<li><a href="' + C.endUrl(c) + '"><div class="c-art">' + C.pixelSVG(e.img) + '</div>' +
        '<span class="c-code">No.' + c + '</span><span class="c-name">' + e.name + '</span>' +
        '<span class="c-count">' + tx('{n}回', { n: cx[c].n || 1 }) + '</span></a></li>';
    }
    return '<li class="locked"><a href="' + C.endUrl(c) + '"><div class="c-art">?</div><span class="c-code">No.' + c + '</span>' +
      '<span class="c-name">???</span><span class="c-hint">' + tx('ヒントを見る ▶') + '</span></a></li>';
  }

  /* バッジ(エンドの収集数ごとに獲得)。エンドの番号と区別するため、アドレスは /badge/B05/ のように、アルファベットで始める */
  const bd = C.loadBadges();
  function badgeTile(b) {
    const have = !!bd[b.id];
    if (have) {
      return '<li><a href="' + C.badgeUrl(b.id) + '"><div class="c-art">' + C.pixelSVG(b.art) + '</div>' +
        '<span class="c-code">Badge ' + b.id + '</span><span class="c-name">' + b.name + '</span>' +
        (bd[b.id].seen ? '' : '<span class="tag-new">NEW</span>') + '</a></li>';
    }
    return '<li class="locked"><a href="' + C.badgeUrl(b.id) + '"><div class="c-art">?</div><span class="c-code">Badge ' + b.id + '</span>' +
      '<span class="c-name">???</span><span class="c-hint">' + tx(b.all ? 'エンド{n}(全て)で獲得' : 'エンド{n}種で獲得', { n: b.need }) + '</span></a></li>';
  }
  const gotB = G.BADGES.filter(function (b) { return bd[b.id]; }).length;
  const badgeHtml = '<section class="c-sec" id="badges"><h3 class="c-phase">' + tx('バッジ') + '<span>' + gotB + ' / ' + G.BADGES.length + '</span></h3>' +
    '<ul class="codex badges">' + G.BADGES.map(badgeTile).join('') + '</ul></section>';

  let plays = 0;
  codes.forEach(function (c) { if (cx[c]) plays += cx[c].n || 1; });
  const playHtml = '<p class="c-total">' + tx('総プレイ回数: {n}回', { n: plays }) + '</p>';
  document.getElementById('codexList').innerHTML = playHtml + badgeHtml + G.PHASES.map(function (ph) {
    const list = codes.filter(function (c) { return (c >= ph.from && c <= ph.to) || (ph.extra && ph.extra.indexOf(c) >= 0); });
    if (!list.length) return '';
    const n = list.filter(function (c) { return cx[c]; }).length;
    return '<section class="c-sec"><h3 class="c-phase">' + ph.name + '<span>' + n + ' / ' + list.length + '</span></h3>' +
      '<ul class="codex">' + list.map(tile).join('') + '</ul></section>';
  }).join('');
  if (location.hash === '#badges') { const el = document.getElementById('badges'); if (el) el.scrollIntoView(); }
})();
