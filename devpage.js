/* ====== 開発者ページ(パスワード付き) ======
   注意: これは公開サイトの静的ページなので、パスワードは「見えなくするための鍵」にすぎない。
   ゲームのデータ自体は、誰でも読める。ページには、パスワードそのものではなく、ハッシュだけを埋め込んである。 */
(function () {
  'use strict';
  const G = GAME, C = COMMON, L = DEVLIB, STATS = G.STATS;
  const $ = function (s, r) { return (r || document).querySelector(s); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  const root = document.querySelector('[data-root]').getAttribute('data-root');
  const HASH = document.querySelector('[data-h]').getAttribute('data-h');

  /* --- SHA-256(外部に頼らず、どの環境でも動くように) --- */
  function sha256(str) {
    const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    const bytes = Array.from(unescape(encodeURIComponent(str))).map(function (c) { return c.charCodeAt(0); });
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (bitLen >>> (i * 8)) & 0xff);
    let h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const rotr = function (x, n) { return (x >>> n) | (x << (32 - n)); };
    for (let off = 0; off < bytes.length; off += 64) {
      const w = new Array(64);
      for (let i = 0; i < 16; i++) w[i] = (bytes[off + i * 4] << 24) | (bytes[off + i * 4 + 1] << 16) | (bytes[off + i * 4 + 2] << 8) | bytes[off + i * 4 + 3];
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
      for (let i = 0; i < 64; i++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25), ch = (e & f) ^ (~e & g);
        const t1 = (hh + S1 + ch + K[i] + w[i]) | 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22), mj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + mj) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h = [(h[0] + a) | 0, (h[1] + b) | 0, (h[2] + c) | 0, (h[3] + d) | 0, (h[4] + e) | 0, (h[5] + f) | 0, (h[6] + g) | 0, (h[7] + hh) | 0];
    }
    return h.map(function (x) { return ('00000000' + (x >>> 0).toString(16)).slice(-8); }).join('');
  }

  /* --- 入口 --- */
  const gate = $('#gate'), tools = $('#tools');
  function open() { C.setDev(true); gate.hidden = true; tools.hidden = false; init(); }
  $('#gateForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    const msg = $('#gateMsg');
    const ok = sha256('sansec-dev:' + $('#gatePw').value) === HASH;
    if (ok) { open(); return; }
    msg.textContent = 'パスワードが違います。';
    msg.hidden = false;
    $('#gatePw').value = '';
  });

  let inited = false;
  function init() {
    if (inited) return; inited = true;
    initTabs(); initEnds(); initSim(); initTrace(); initSound(); initData();
    $('#devLogout').addEventListener('click', function () { C.setDev(false); location.reload(); });
  }

  function initTabs() {
    const btns = tools.querySelectorAll('.tab'), panes = tools.querySelectorAll('.pane');
    function show(id) {
      btns.forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-t') === id ? 'true' : 'false'); });
      panes.forEach(function (p) { p.hidden = p.id !== 'pane-' + id; });
      if (id === 'trace') initTrace();
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-t')); }); });
    show('ends');
  }

  /* --- ① 各エンドの直前から始める --- */
  function optGet() { try { return JSON.parse(sessionStorage.getItem('sansec_dev_opt_v1') || '{}'); } catch (e) { return {}; } }
  function optSet(o) { try { sessionStorage.setItem('sansec_dev_opt_v1', JSON.stringify(Object.assign(optGet(), o))); } catch (e) { /* 保存できない環境 */ } }
  const KIND = { mid: '途中', defeat: '敗北', minion: '手下', victory: '討伐', supreme: '最強', legend: '伝説', retire: '余生' };
  function initEnds() {
    const o = optGet();
    const rec = $('#optRec');
    rec.checked = !!o.record;
    rec.addEventListener('change', function () { optSet({ record: rec.checked }); });
    const nt = $('#optNoTimer');
    nt.checked = !!o.noTimer;
    nt.addEventListener('change', function () { optSet({ noTimer: nt.checked }); });
    const codes = Object.keys(G.ENDS).sort();
    $('#endList').innerHTML = G.PHASES.map(function (ph) {
      const list = codes.filter(function (c) { return (c >= ph.from && c <= ph.to) || (ph.extra && ph.extra.indexOf(c) >= 0); });
      return '<h3 class="c-phase">' + ph.name + '<span>' + list.length + '</span></h3><ul class="dev-ends">' + list.map(function (c) {
        const e = G.ENDS[c], sc = L.SCENES[c];
        return '<li><div class="de-main"><span class="de-no">No.' + c + '</span><span class="de-name">' + esc(e.name) + '</span><span class="de-kind k-' + e.sfx + '">' + KIND[e.sfx] + '</span></div>' +
          '<div class="de-how">' + (sc.timeout ? '時間切れで到達' : '「' + esc(sc.pick) + '」') + ' ／ ' + esc(L.stateText(sc)) + '</div>' +
          '<div class="de-act"><button class="btn small primary" data-go="' + c + '" type="button">直前から</button><a class="btn small" href="' + root + 'end/' + c + '/index.html">結果画面</a></div></li>';
      }).join('') + '</ul>';
    }).join('');
    $('#endList').addEventListener('click', function (ev) {
      const b = ev.target.closest('[data-go]');
      if (!b) return;
      const code = b.getAttribute('data-go'), sc = L.SCENES[code];
      C.setDevPreset({ code: code, kind: sc.kind || 'card', card: sc.card, stage: sc.stage || 1, pick: sc.pick, state: sc.state, rng: sc.rng, timeout: !!sc.timeout });
      location.href = root + 'index.html';
    });
  }

  /* --- ② 判定シミュレータ --- */
  const CARD_LIST = [].concat(
    G.CARDS_B.map(function (c) { return { g: 'ランダムB', c: c, stage: 1 }; }),
    [{ g: 'イベントB', c: G.FORCED_B, stage: 1 }],
    G.CARDS_C.map(function (c) { return { g: 'ランダムC', c: c, stage: 1 }; }),
    [{ g: 'イベントC', c: G.FORCED_C, stage: 1 }],
    G.CARDS_D.filter(function (c) { return c.id !== 'trav_max'; }).map(function (c) { return { g: 'ランダムD', c: c, stage: 1 }; }),
    [{ g: 'イベントD 1回目', c: G.FORCED_D, stage: 1 }, { g: 'イベントD 2回目', c: G.FORCED_D, stage: 2 }]
  );

  function mkRun() {
    const r = G.newRun();
    STATS.forEach(function (s) { r.stats[s.key] = Number($('#sm-' + s.key).value) || 0; });
    r.money = Math.max(0, Number($('#sm-money').value) || 0);
    const w = Number($('#sm-w').value), a = Number($('#sm-a').value);
    if (w) r.equip.push(G.ITEMS['w' + w]);
    if (a) r.equip.push(G.ITEMS['a' + a]);
    ['weak', 'strong', 'rival'].forEach(function (k) { if ($('#sm-al-' + k).checked) r.allies.push(G.ALLIES[k]); });
    r.flags.metMax = $('#sm-max').checked;
    r.silence = Number($('#sm-sil').value) || 0;
    return r;
  }
  function initSim() {
    $('#simState').innerHTML =
      STATS.map(function (s) { return '<label>' + s.label + '<input type="number" id="sm-' + s.key + '" value="' + G.START_STATS[s.key] + '"></label>'; }).join('') +
      '<label>所持金<input type="number" id="sm-money" min="0" value="' + G.START_MONEY + '"></label>' +
      '<label>武器<select id="sm-w"><option value="0">なし</option><option value="1">下</option><option value="2">中</option><option value="3">上</option></select></label>' +
      '<label>防具<select id="sm-a"><option value="0">なし</option><option value="1">下</option><option value="2">中</option><option value="3">上</option></select></label>' +
      '<label>沈黙の回数<input type="number" id="sm-sil" min="0" value="0"></label>' +
      '<fieldset><legend>仲間</legend><label><input type="checkbox" id="sm-al-weak">ひよっこ</label><label><input type="checkbox" id="sm-al-strong">歴戦</label><label><input type="checkbox" id="sm-al-rival">ライバル</label></fieldset>' +
      '<label><input type="checkbox" id="sm-max">伝説の旅人に会った</label>';
    const sel = $('#simCard');
    sel.innerHTML = CARD_LIST.map(function (x, i) { return '<option value="' + i + '">[' + x.g + '] ' + esc(x.c.who) + '</option>'; }).join('');
    $('#simBox').addEventListener('input', runSim);
    $('#simBox').addEventListener('change', runSim);
    runSim();
  }
  function runSim() {
    const x = CARD_LIST[Number($('#simCard').value)];
    const card = x.c, stage = x.stage;
    const list = stage === 2 ? card.choices2 : card.choices;
    const rows = list.map(function (ch) {
      const res = [0.01, 0.99].map(function (v) { return G.resolve(mkRun(), card, stage, ch, function () { return v; }); });
      const a = L.describe(res[0]).join(' / '), b = L.describe(res[1]).join(' / ');
      return '<tr><td><b>' + esc(ch.label) + '</b>' + (ch.fixed ? '<br><small>固定</small>' : '') + '</td><td>' +
        (a === b ? esc(a) : '乱数が低い時: ' + esc(a) + '<br>乱数が高い時: ' + esc(b)) + '</td></tr>';
    });
    const t = G.resolveTimeout(mkRun(), card);
    rows.push('<tr class="end"><td><b>(時間切れ)</b></td><td>' + esc(L.describe(t).join(' / ')) + '</td></tr>');
    $('#simOut').innerHTML = '<p class="dev-q">' + esc(stage === 2 ? card.q2 : card.q).replace(/\n/g, ' ') + '</p><table class="dev-table"><thead><tr><th>選択肢</th><th>結果</th></tr></thead><tbody>' + rows.join('') + '</tbody></table>' +
      (card.showCount ? '<p class="dev-note">本番では、この中から ' + card.showCount + ' 個が出ます(固定の選択肢は、必ず出ます)。</p>' : '');
  }

  /* --- ③ 判定の記録 --- */
  function initTrace() {
    const tr = C.devTrace();
    $('#traceOut').innerHTML = tr.length ?
      '<table class="dev-table"><thead><tr><th>#</th><th>場面 / 選択</th><th>結果</th><th>増減</th></tr></thead><tbody>' + tr.map(function (t) {
        return '<tr' + (t.end ? ' class="end"' : '') + '><td>' + t.n + '</td><td>' + esc(t.who) + '<br><b>' + esc(t.label) + '</b>' + (t.rng && t.rng.length ? '<br><small>乱数 ' + t.rng.join(', ') + '</small>' : '') +
          '</td><td>' + t.res.map(esc).join('<br>') + '</td><td>' + (t.diff.length ? t.diff.map(esc).join('<br>') : '―') + '</td></tr>';
      }).join('') + '</tbody></table>' : '<p class="dev-empty">記録はありません。ゲームを開発者モードで遊ぶと、ここにも残ります。</p>';
  }

  /* --- ④ 効果音の試聴 --- */
  function initSound() {
    $('#soundList').innerHTML = SFX.kinds.map(function (k) {
      const names = Object.keys(G.ENDS).filter(function (c) { return G.ENDS[c].sfx === k; });
      return '<li><button class="btn small" data-snd="' + k + '" type="button">▶ ' + KIND[k] + '</button><span>約' + SFX.length(k) + '秒 ／ No.' + names.join('・') + '</span></li>';
    }).join('');
    $('#soundList').addEventListener('click', function (ev) {
      const b = ev.target.closest('[data-snd]');
      if (b) { SFX.unlock(); SFX.play(b.getAttribute('data-snd'), true); }
    });
  }

  /* --- ⑤ 図鑑・バッジの確認用 --- */
  const BK = 'sansec_dev_backup_v1';
  function initData() {
    function paint() {
      const cx = C.loadCodex(), bd = C.loadBadges();
      $('#dataNow').innerHTML = '収集 <b>' + Object.keys(cx).length + ' / ' + Object.keys(G.ENDS).length + '</b> ／ バッジ ' +
        (G.BADGES.map(function (b) { return '<span class="bd ' + (bd[b.id] ? 'on' : '') + '">' + b.id + '</span>'; }).join('')) +
        (localStorage.getItem(BK) ? ' ／ バックアップあり' : '');
    }
    function backup() { try { if (!localStorage.getItem(BK)) localStorage.setItem(BK, JSON.stringify({ c: C.loadCodex(), b: C.loadBadges() })); } catch (e) { /* 保存できない環境 */ } }
    $('#dataSet').addEventListener('click', function () {
      const n = Math.max(0, Math.min(Object.keys(G.ENDS).length - 1, Number($('#dataN').value) || 0));
      backup();
      /* 先頭から n 件(ただし、検証に使う No.038 は、最後まで残す) */
      const codes = Object.keys(G.ENDS).sort().filter(function (c) { return c !== '038'; });
      const cx = {};
      codes.slice(0, n).forEach(function (c) { cx[c] = { n: 1, t: Date.now() }; });
      C.saveCodex(cx); C.saveBadges({});
      C.grantBadges(n);                                   // すでに条件を満たすバッジは、獲得済みにしておく
      const bd = C.loadBadges(); Object.keys(bd).forEach(function (k) { bd[k].notified = true; bd[k].seen = true; }); C.saveBadges(bd);
      paint();
    });
    $('#dataAll').addEventListener('click', function () {
      backup();
      const cx = {};
      Object.keys(G.ENDS).forEach(function (c) { cx[c] = { n: 1, t: Date.now() }; });
      C.saveCodex(cx); C.saveBadges({}); C.grantBadges(Object.keys(cx).length);
      paint();
    });
    $('#dataClear').addEventListener('click', function () {
      if (!confirm('この端末の、図鑑とバッジを全て消します。よろしいですか?(バックアップから戻せます)')) return;
      backup(); C.saveCodex({}); C.saveBadges({}); paint();
    });
    $('#dataRestore').addEventListener('click', function () {
      try {
        const v = JSON.parse(localStorage.getItem(BK) || 'null');
        if (!v) { alert('バックアップがありません。'); return; }
        C.saveCodex(v.c || {}); C.saveBadges(v.b || {});
        localStorage.removeItem(BK);
      } catch (e) { /* 失敗しても何もしない */ }
      paint();
    });
    paint();
  }
  /* 変数の準備が全て終わってから、すでにパスワードを通っていれば開く */
  if (C.devOn()) open();
})();
