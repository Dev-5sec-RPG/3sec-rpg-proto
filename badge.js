/* ====== バッジのページ。獲得した人にだけ、中身を見せる ====== */
(function () {
  'use strict';
  const G = GAME, C = COMMON;
  const main = document.querySelector('[data-badge]');
  const id = main.getAttribute('data-badge');
  const b = G.BADGES.filter(function (x) { return x.id === id; })[0];
  C.updateCollect();
  const bd = C.loadBadges();
  const count = Object.keys(C.loadCodex()).length;
  const have = !!bd[id];

  /* 公開先では、アドレス欄の index.html を消してすっきり見せる */
  try {
    if (location.protocol !== 'file:' && /index\.html$/.test(location.pathname)) {
      history.replaceState(null, '', location.pathname.replace(/index\.html$/, '') + location.search + location.hash);
    }
  } catch (e) { /* 見た目だけの処理 */ }

  if (have) {
    document.getElementById('lock').hidden = true;
    document.getElementById('reveal').hidden = false;
    document.getElementById('shareBtn').hidden = false;
    try { document.title = 'Badge ' + id + ' ' + b.name + '｜' + document.title.split('｜').pop(); } catch (e) { /* タブの表示だけ */ }
    if (!bd[id].seen) {
      document.getElementById('newBadge').hidden = false;
      bd[id].seen = true; bd[id].notified = true; C.saveBadges(bd);      // 見たら、NEW を外す
    }
  } else {
    document.getElementById('prog').textContent = tx('現在の収集数: {c} / {n}', { c: count, n: b.need });
  }
})();
