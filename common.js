/* ====== 全ページ共通(記録の保存、ページの行き先、ドット絵) ====== */
const COMMON = (function () {
  const KEY = 'sansec_rpg_codex_v1';   // 図鑑(到達したエンド)
  const LAST = 'sansec_rpg_last_v1';   // 直近の結果(ステータス・履歴)
  let memCodex = {}, memLast = null;

  function read(key) {
    try { const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw); } catch (e) { /* 保存できない環境 */ }
    return null;
  }
  function write(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* 同上 */ }
  }
  function loadCodex() { const v = read(KEY); if (v && typeof v === 'object') memCodex = v; return memCodex; }
  function saveCodex(c) { memCodex = c; write(KEY, c); }
  function loadLast() { return read(LAST) || memLast; }
  function saveLast(v) { memLast = v; write(LAST, v); }

  /* ページを移る瞬間は、保存の反映が間に合わないことがあるため、
     移動先へ直接も渡す(window.name は、同じタブの移動で残る) */
  const HAND = 'sansec1:';
  function handoff(obj) { try { window.name = HAND + JSON.stringify(obj); } catch (e) { /* 渡せなくても保存側で補う */ } }
  function takeHandoff() {
    try {
      if (typeof window.name === 'string' && window.name.indexOf(HAND) === 0) {
        const v = JSON.parse(window.name.slice(HAND.length));
        window.name = '';
        return v;
      }
    } catch (e) { /* 壊れていたら無視する */ }
    return null;
  }

  /* 行き先は、ファイル名まで書く(ローカルで開いても、公開先でも動かすため) */
  function root() {
    const el = document.querySelector('[data-root]');
    return el ? el.getAttribute('data-root') : './';
  }
  function endUrl(code) { return root() + 'end/' + code + '/index.html'; }
  function homeUrl() { return root() + 'index.html'; }
  function codexUrl() { return root() + 'codex/index.html'; }

  function updateCollect() {
    const el = document.getElementById('collect');
    if (el) el.textContent = '収集 ' + Object.keys(loadCodex()).length + '/' + Object.keys(GAME.ENDS).length;
  }

  function pixelSVG(key) {
    const rows = GAME.ART[key];
    if (!rows) return '';
    const h = rows.length, w = rows[0].length;
    let rects = '';
    rows.forEach(function (row, y) {
      let x = 0;
      while (x < w) {
        const ch = row[x];
        if (ch === '.') { x++; continue; }
        let x2 = x;
        while (x2 < w && row[x2] === ch) x2++;
        rects += '<rect x="' + x + '" y="' + y + '" width="' + (x2 - x) + '" height="1" fill="' + GAME.PALETTE[ch] + '"/>';
        x = x2;
      }
    });
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" shape-rendering="crispEdges" aria-hidden="true">' + rects + '</svg>';
  }

  return {
    loadCodex: loadCodex, saveCodex: saveCodex, loadLast: loadLast, saveLast: saveLast,
    handoff: handoff, takeHandoff: takeHandoff,
    endUrl: endUrl, homeUrl: homeUrl, codexUrl: codexUrl, updateCollect: updateCollect, pixelSVG: pixelSVG
  };
})();
