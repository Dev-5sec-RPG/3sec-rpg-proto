/* ====== 全ページ共通(記録の保存、ページの行き先、ドット絵) ====== */
const COMMON = (function () {
  const KEY = 'sansec_rpg_codex_v3';   // 図鑑(到達したエンド)
  const LAST = 'sansec_rpg_last_v3';   // 直近の結果(ステータス・履歴)
  const BKEY = 'sansec_rpg_badges_v1'; // 獲得したバッジ
  const DEV = 'sansec_dev_v1';         // 開発者モード(タブを閉じると解除。sessionStorage)
  const DEVPRESET = 'sansec_dev_preset_v1';
  const DEVTRACE = 'sansec_dev_trace_v1';
  let memCodex = {}, memLast = null, memBadges = {};


  /* --- 旧データの引き継ぎ ---
     エンドを54種から45種へ減らし、番号を振り直した。旧い図鑑(v2)が残っている端末では、
     新しい番号へ読み替えて、新しい図鑑(v3)へ一度だけ移す。まとめたエンドは、回数を足し合わせる。
     削除したエンド(旧No.016・040)の記録は、移せない。バッジは、獲得済みのものをそのまま残す。 */
  const OLD_KEY = 'sansec_rpg_codex_v2', OLD_LAST = 'sansec_rpg_last_v2';
  const LEGACY = {"000": "000", "001": "001", "002": "002", "003": "003", "004": "004", "005": "005", "006": "006", "007": "007", "008": "008", "009": "009", "010": "010", "011": "011", "012": "011", "013": "011", "014": "011", "015": "012", "016": null, "017": "013", "018": "014", "019": "015", "020": "016", "021": "017", "022": "018", "023": "019", "024": "020", "025": "021", "026": "022", "027": "023", "028": "024", "029": "025", "030": "025", "031": "025", "032": "025", "033": "026", "034": "027", "035": "028", "036": "029", "037": "030", "038": "031", "039": "032", "040": null, "041": "029", "042": "033", "043": "034", "044": "035", "045": "036", "046": "037", "047": "038", "048": "039", "049": "040", "050": "041", "051": "042", "052": "043"};
  function migrate() {
    try {
      if (localStorage.getItem(KEY) !== null) return;            // 移行済み、または新規の端末
      const raw = localStorage.getItem(OLD_KEY);
      if (!raw) return;
      const old = JSON.parse(raw), next = {};
      Object.keys(old).forEach(function (k) {
        const to = k === '999' ? '999' : LEGACY[k];
        if (!to || !old[k]) return;
        const cur = next[to];
        next[to] = { n: ((cur && cur.n) || 0) + (old[k].n || 1), t: Math.max((cur && cur.t) || 0, old[k].t || 0) };
      });
      localStorage.setItem(KEY, JSON.stringify(next));
      localStorage.removeItem(OLD_KEY); localStorage.removeItem(OLD_LAST);   // 旧い番号の記録は、使わない
    } catch (e) { /* 保存できない環境では、何もしない */ }
  }
  migrate();

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

  /* --- バッジ --- */
  function loadBadges() { const v = read(BKEY); if (v && typeof v === 'object') memBadges = v; return memBadges; }
  function saveBadges(b) { memBadges = b; write(BKEY, b); }
  /* 収集数に応じて、まだ持っていないバッジを獲得する。新しく獲得したバッジの id を返す */
  function grantBadges(count) {
    const have = loadBadges(), fresh = [];
    GAME.badgesFor(count).forEach(function (id) {
      if (!have[id]) { have[id] = { t: Date.now(), notified: false, seen: false }; fresh.push(id); }
    });
    if (fresh.length) saveBadges(have);
    return fresh;
  }

  /* --- 開発者モード(同じタブの中でだけ有効) --- */
  function sread(key) { try { const raw = sessionStorage.getItem(key); if (raw) return JSON.parse(raw); } catch (e) { /* 使えない環境 */ } return null; }
  function swrite(key, v) { try { if (v == null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* 同上 */ } }
  function devOn() { return sread(DEV) === 1; }
  function setDev(on) { swrite(DEV, on ? 1 : null); if (!on) { swrite(DEVPRESET, null); swrite(DEVTRACE, null); } }
  function devPreset() { return devOn() ? sread(DEVPRESET) : null; }
  function setDevPreset(p) { swrite(DEVPRESET, p); }
  function devTrace() { return devOn() ? (sread(DEVTRACE) || []) : []; }
  function setDevTrace(t) { swrite(DEVTRACE, t); }

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
  function badgeUrl(id) { return root() + 'badge/' + id + '/index.html'; }
  function devUrl() { return root() + 'dev/index.html'; }

  function updateCollect() {
    const el = document.getElementById('collect');
    if (el) el.textContent = tx('収集 {c}/{t}', { c: Object.keys(loadCodex()).length, t: Object.keys(GAME.ENDS).length });
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
    loadBadges: loadBadges, saveBadges: saveBadges, grantBadges: grantBadges,
    devOn: devOn, setDev: setDev, devPreset: devPreset, setDevPreset: setDevPreset, devTrace: devTrace, setDevTrace: setDevTrace,
    badgeUrl: badgeUrl, devUrl: devUrl,
    endUrl: endUrl, homeUrl: homeUrl, codexUrl: codexUrl, updateCollect: updateCollect, pixelSVG: pixelSVG
  };
})();
