/* ====== 図鑑のページ ====== */
(function () {
  'use strict';
  const G = GAME, C = COMMON, ENDS = G.ENDS;
  C.updateCollect();
  const cx = C.loadCodex();
  const codes = Object.keys(ENDS).sort();
  document.getElementById('codexCount').textContent = Object.keys(cx).length + ' / ' + codes.length;
  document.getElementById('codexList').innerHTML = codes.map(function (c) {
    const e = ENDS[c];
    if (cx[c]) {
      return '<li><a href="' + C.endUrl(c) + '"><div class="c-art">' + C.pixelSVG(e.img) + '</div>' +
        '<span class="c-code">No.' + c + '</span><span class="c-name">' + e.name + '</span></a></li>';
    }
    return '<li class="locked"><div class="c-art">?</div><span class="c-code">No.???</span><span class="c-name">???</span></li>';
  }).join('');
})();
