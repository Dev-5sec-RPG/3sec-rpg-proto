/* ====== エンドのページ。共通部分は静的に書かれており、ここでは「その人の結果」だけを足す ====== */
(function () {
  'use strict';
  const G = GAME, C = COMMON, STATS = G.STATS;
  const main = document.querySelector('[data-code]');
  const code = main.getAttribute('data-code');

  /* 公開先では、アドレス欄の index.html を消してすっきり見せる */
  try {
    if (location.protocol !== 'file:' && /index\.html$/.test(location.pathname)) {
      history.replaceState(null, '', location.pathname.replace(/index\.html$/, '') + location.search + location.hash);
    }
  } catch (e) { /* 見た目だけの処理なので、失敗しても問題ない */ }

  /* ゲームのページから直接渡された記録があれば、保存し直してから使う */
  const h = C.takeHandoff();
  if (h && h.codex && h.last) { C.saveCodex(h.codex); C.saveLast(h.last); }

  C.updateCollect();
  const cx = C.loadCodex(), last = C.loadLast();
  const statusLine = document.getElementById('statusLine');
  const mineEl = document.getElementById('mine');
  const badge = document.getElementById('newBadge');

  if (last && last.code === code) {
    /* 直前にこのエンドへ到達した人。結果を表示する */
    if (last.isNew) { badge.hidden = false; last.isNew = false; C.saveLast(last); }
    const statsHtml = STATS.map(function (s) {
      return '<div><dt>' + s.label + '</dt><dd>' + last.stats[s.key] + '</dd></div>';
    }).join('');
    const histHtml = last.history.map(function (h) {
      return '<li><span class="h-who">' + h.who + '</span>' + h.text + '</li>';
    }).join('');
    mineEl.innerHTML =
      '<summary>この回の記録</summary>' +
      '<h3>終了時ステータス</h3><dl>' + statsHtml + '</dl>' +
      '<h3>終了時装備</h3><p>' + (last.equip.length ? last.equip.join('、') : 'なし') + '</p>' +
      '<h3>仲間</h3><p>' + (last.allies && last.allies.length ? last.allies.join('、') : 'なし') + '</p>' +
      '<h3>終了時所持金</h3><p>' + (typeof last.money === 'number' ? last.money + '銀貨' : '―') + '</p>' +
      '<h3>履歴</h3><ol>' + histHtml + '</ol>';
    mineEl.hidden = false;
    statusLine.hidden = true;
  } else {
    /* 共有のリンクから直接来た人。結果は出さず、図鑑にも登録しない */
    statusLine.textContent = cx[code] ? 'このエンドには到達済みです。' : 'このエンドには、まだ到達していません。';
  }
})();
