/* ====== 言語(日本語 / 英語) ======
   文章は、日本語を「キー」として書いておく。英語のページでだけ en.js(辞書 EN_DICT)を読み込み、tx() が英語に置き換える。
   日本語のページでは、辞書がないので、そのまま日本語が出る。
   {名前} の形の穴は、第2引数で埋める。例: tx('{n}を手に入れた。', { n: '銀の剣' }) */
const I18N = (function () {
  let lang = 'ja';
  if (typeof __LANG === 'string') lang = __LANG;                                  // ビルド時(Node)の指定
  else if (typeof document !== 'undefined' && document.documentElement && document.documentElement.lang === 'en') lang = 'en';
  const dict = (typeof EN_DICT !== 'undefined') ? EN_DICT : null;
  const missing = {};                                                              // 英語なのに、辞書に無かった日本語(検査用)
  return { lang: lang, dict: dict, missing: missing };
})();
function tx(s, p) {
  let out = s;
  if (I18N.lang === 'en') {
    const v = I18N.dict && Object.prototype.hasOwnProperty.call(I18N.dict, s) ? I18N.dict[s] : undefined;
    if (v !== undefined) out = v;
    else if (/[぀-ヿ一-鿿]/.test(s)) I18N.missing[s] = 1;
  }
  if (p) out = out.replace(/\{(\w+)\}/g, function (m, k) { return Object.prototype.hasOwnProperty.call(p, k) ? p[k] : m; });
  return out;
}
