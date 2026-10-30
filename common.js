/* ====== 全ページ共通(記録の保存、ページの行き先、ドット絵) ====== */
const COMMON = (function () {
  const BASE = (typeof document !== 'undefined' && document.currentScript && document.currentScript.src) || (typeof location !== 'undefined' ? location.href : '');
  const KEY = 'sansec_rpg_codex_v3';   // 図鑑(到達したエンド)
  const LAST = 'sansec_rpg_last_v3';   // 直近の結果(ステータス・履歴)
  const BKEY = 'sansec_rpg_badges_v1'; // 獲得したバッジ
  const SKINKEY = 'sansec_rpg_skin_v1'; // バッジ特典(見た目)の選択
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

  /* 「遊ぶ」を押したら、開発者モードを解除する(直前の動作確認の場面へ飛ばないように) */
  if (typeof document.addEventListener === 'function') document.addEventListener('click', function (ev) {
    try {
      if (!devOn()) return;
      const a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
      if (!a) return;
      const u = new URL(a.getAttribute('href'), location.href), home = new URL(homeUrl(), location.href);
      const norm = function (x) { return x.pathname.replace(/index\.html$/, ''); };
      if (u.origin === home.origin && norm(u) === norm(home)) setDev(false);
    } catch (e) { /* 判定できなければ、何もしない */ }
  }, true);

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


  /* --- バッジ特典(見た目の切り替え) ---
     bg: 背景色(B05) / frame: 窓と選択肢の枠(B10) / scene: 背景の絵(B20) / chara: キャラクターの絵(B30: 細密なドット絵 / B40: イラスト)
     獲得していないバッジの特典は、選んであっても、使われない */
  const SKIN_DEFAULT = { bg: 'default', frame: 'default', scene: 'off', chara: 'dot' };
  const SKIN_NEED = { bg: 'B05', frame: 'B10', scene: 'B20', chara: 'B30' };
  const SKIN_OPTS = { bg: ['default', 'yellow', 'red', 'green'], frame: ['default', 'silver'], scene: ['off', 'on'], chara: ['dot', 'fine', 'art'] };
  const SKIN_NEED_VAL = { fine: 'B30', art: 'B40' };      // 選択肢ごとに必要なバッジ(ここに無いものは、SKIN_NEED)
  function loadSkin() {
    const v = read(SKINKEY), out = Object.assign({}, SKIN_DEFAULT);
    if (v && typeof v === 'object') Object.keys(SKIN_DEFAULT).forEach(function (k) { if (SKIN_OPTS[k].indexOf(v[k]) >= 0) out[k] = v[k]; });
    return out;
  }
  function saveSkin(v) { write(SKINKEY, v); }
  function skinValue(kind) {
    const v = loadSkin()[kind], bd = loadBadges();
    if (v === SKIN_DEFAULT[kind]) return v;
    if (bd[SKIN_NEED_VAL[v] || SKIN_NEED[kind]]) return v;
    if (kind === 'chara' && v === 'art' && bd[SKIN_NEED.chara]) return 'fine';      // B40が無い時は、B30の絵にとどめる
    return SKIN_DEFAULT[kind];
  }
  function applySkin() {
    if (typeof document === 'undefined' || !document.body || !document.body.setAttribute) return;
    Object.keys(SKIN_DEFAULT).forEach(function (k) { document.body.setAttribute('data-' + k, skinValue(k)); });
    document.documentElement.setAttribute('data-bg', skinValue('bg'));      // 画面の端まで同じ色にするため、html にも付ける
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

  function drawRows(rows, colorOf) {
    const h = rows.length, w = rows[0].length;
    let rects = '';
    rows.forEach(function (row, y) {
      let x = 0;
      while (x < w) {
        const ch = row[x];
        if (ch === '.') { x++; continue; }
        let x2 = x;
        while (x2 < w && row[x2] === ch) x2++;
        rects += '<rect x="' + x + '" y="' + y + '" width="' + (x2 - x) + '" height="1" fill="' + colorOf(ch) + '"/>';
        x = x2;
      }
    });
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" shape-rendering="crispEdges" aria-hidden="true">' + rects + '</svg>';
  }
  /* イラスト(B40の特典)。背景が透明のWebP。img/c/ に置く */
  const ART_IMG = ['p_merchant', 'p_dog', 'p_traveler', 'p_traveler2', 'p_monk', 'p_child', 'p_king', 'p_inn', 'p_spring', 'p_bard', 'p_changer', 'p_wsmith', 'p_asmith', 'p_legend', 'p_gate', 'p_rival', 'p_demon', 'p_general', 'p_slime', 'p_bat', 'p_orc', 'p_skel', 'p_wyvern', 'chest'];
  const artUrl = function (k) { return new URL('img/c/' + (k === 'p_traveler' ? 'p_traveler1' : k) + '.webp', BASE).href; };
  function preloadArt() {
    if (typeof Image === 'undefined' || skinValue('chara') !== 'art') return;
    ART_IMG.forEach(function (k) { const i = new Image(); i.src = artUrl(k); });
  }
  function pixelSVG(key) {
    if (ART_IMG.indexOf(key) >= 0 && skinValue('chara') === 'art') {
      return '<img class="art-img" src="' + artUrl(key) + '" alt="" decoding="async" draggable="false">';
    }
    if (typeof SPR24 !== 'undefined' && SPR24[key] && skinValue('chara') === 'fine') {     // 細密な絵(B30の特典)
      return drawRows(SPR24[key].r, function (ch) { return SPR24[key].p[ch]; });
    }
    const rows = GAME.ART[key];
    if (!rows) return '';
    return drawRows(rows, function (ch) { return GAME.PALETTE[ch]; });
  }

  applySkin();
  if (typeof window !== 'undefined') window.addEventListener('load', function () { setTimeout(preloadArt, 600); });

  return {
    loadCodex: loadCodex, saveCodex: saveCodex, loadLast: loadLast, saveLast: saveLast,
    handoff: handoff, takeHandoff: takeHandoff,
    loadBadges: loadBadges, saveBadges: saveBadges, grantBadges: grantBadges,
    devOn: devOn, setDev: setDev, devPreset: devPreset, setDevPreset: setDevPreset, devTrace: devTrace, setDevTrace: setDevTrace,
    badgeUrl: badgeUrl, devUrl: devUrl,
    endUrl: endUrl, homeUrl: homeUrl, codexUrl: codexUrl, updateCollect: updateCollect, pixelSVG: pixelSVG,
    loadSkin: loadSkin, saveSkin: saveSkin, skinValue: skinValue, applySkin: applySkin, SKIN_OPTS: SKIN_OPTS
  };
})();
