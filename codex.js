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
        '<span class="c-code">No.' + c + '</span><span class="c-name">' + e.name + '</span></a></li>';
    }
    return '<li class="locked"><a href="' + C.endUrl(c) + '"><div class="c-art">?</div><span class="c-code">No.' + c + '</span>' +
      '<span class="c-name">???</span><span class="c-hint">ヒントを見る ▶</span></a></li>';
  }

  document.getElementById('codexList').innerHTML = G.PHASES.map(function (ph) {
    const list = codes.filter(function (c) { return (c >= ph.from && c <= ph.to) || (ph.extra && ph.extra.indexOf(c) >= 0); });
    if (!list.length) return '';
    const n = list.filter(function (c) { return cx[c]; }).length;
    return '<section class="c-sec"><h3 class="c-phase">' + ph.name + '<span>' + n + ' / ' + list.length + '</span></h3>' +
      '<ul class="codex">' + list.map(tile).join('') + '</ul></section>';
  }).join('');
})();
