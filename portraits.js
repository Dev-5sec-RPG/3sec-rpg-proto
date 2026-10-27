/* ====== 立ち絵(イベントB・C・D用のカットイン) ======
   背景が透明な画像(WebP)。門番=p_B / ライバル=p_C / 魔王=p_D。画像は、このスクリプトと同じ階層の img/ に置く。 */
const PORTRAITS = (function () {
  'use strict';
  const base = (document.currentScript && document.currentScript.src) || location.href;
  const url = function (k) { return new URL('img/p_' + k + '.webp', base).href; };
  const out = {};
  ['B', 'C', 'D'].forEach(function (k) { out[k] = '<img src="' + url(k) + '" alt="" decoding="async" draggable="false">'; });
  /* 表示の瞬間に間に合うよう、ページが落ち着いたあとで先に読み込んでおく */
  window.addEventListener('load', function () {
    setTimeout(function () { ['B', 'C', 'D'].forEach(function (k) { const i = new Image(); i.src = url(k); }); }, 800);
  });
  return out;
})();
