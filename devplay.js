/* ====== 開発者モード(ゲーム画面側) ======
   パスワードを通った同じタブでだけ有効。通常の利用者には、何も表示されず、何も変わらない。
   役割: 乱数・タイマー・図鑑記録の切り替え、判定の記録(ステータス・所持金・装備・仲間の増減)を一覧で見せる。 */
const DEVPLAY = (function () {
  'use strict';
  if (typeof COMMON === 'undefined' || !COMMON.devOn()) return { active: false };
  const C = COMMON, G = GAME, L = DEVLIB;
  const OPT = 'sansec_dev_opt_v1';
  let opt = { noTimer: false, rng: 'scene', record: false };
  try { const v = JSON.parse(sessionStorage.getItem(OPT) || 'null'); if (v) opt = Object.assign(opt, v); } catch (e) { /* 既定値のまま */ }
  function saveOpt() { try { sessionStorage.setItem(OPT, JSON.stringify(opt)); } catch (e) { /* 保存できなくても動く */ } }

  let expire = null, trace = [];
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };

  const api = {
    active: true,
    get noTimer() { return opt.noTimer; },
    get record() { return opt.record; },
    /* 判定に使う乱数。場面ごとの固定値があれば、それに従う */
    rng: function () {
      const p = C.devPreset();
      if (opt.rng === 'low') return 0.01;
      if (opt.rng === 'high') return 0.99;
      if (opt.rng === 'scene' && p && typeof p.rng === 'number') return p.rng;
      return Math.random();
    },
    setExpire: function (fn) { expire = fn; },
    snap: L.snap,
    log: function (before, after, out, meta) {
      trace.push({
        n: trace.length + 1, who: meta ? meta.who : '', label: meta ? meta.label : '', rng: meta && meta.rng ? meta.rng.map(function (v) { return Math.round(v * 100) / 100; }) : [],
        res: L.describe(out), msg: (out.msg || '').split('\n')[0], diff: L.diff(before, after)
      });
      C.setDevTrace(trace); render();
    },
    logEnd: function (code, run) {
      trace.push({ n: trace.length + 1, who: '到達', label: 'No.' + code, rng: [], res: ['エンド No.' + code + '「' + G.ENDS[code].name + '」(' + G.ENDS[code].sfx + ')'], msg: '', diff: [], end: true });
      C.setDevTrace(trace);
    },
    mount: function () {
      trace = []; C.setDevTrace(trace);
      const app = document.querySelector('.app');
      const anchor = document.querySelector('.about') || document.querySelector('.foot');
      const p = C.devPreset();
      const sc = p ? L.SCENES[p.code] : null;
      const sec = document.createElement('section');
      sec.className = 'dev';
      sec.id = 'devPanel';
      sec.innerHTML =
        '<h2 class="dev-h">開発者モード</h2>' +
        (sc ? '<p class="dev-scene"><b>No.' + sc.code + '「' + esc(G.ENDS[sc.code].name) + '」の直前</b><br>' +
          (sc.timeout ? '到達方法: 時間切れ(タイマーを動かすか、下のボタンで時間切れにする)' : '到達方法: 「' + esc(sc.pick) + '」を選ぶ(印の付いた選択肢)') +
          '<br><small>' + esc(L.stateText(sc)) + '</small></p>' : '<p class="dev-scene">通常のプレイです(判定の記録のみ)。</p>') +
        '<div class="dev-row">' +
        '<label><input type="checkbox" id="dvNoTimer"> タイマーを止める</label>' +
        '<label>乱数 <select id="dvRng"><option value="scene">場面に合わせる</option><option value="normal">通常</option><option value="low">常に低い(0.01)</option><option value="high">常に高い(0.99)</option></select></label>' +
        '<label><input type="checkbox" id="dvRec"> 図鑑に記録する</label></div>' +
        '<div class="dev-row"><button class="btn small" id="dvTimeout" type="button">時間切れにする</button>' +
        '<a class="btn small" href="' + C.devUrl() + '">開発者ページ</a>' +
        '<button class="btn small" id="dvExit" type="button">開発者モードを終了</button></div>' +
        '<details open><summary>判定の記録</summary><div id="dvLog" class="dev-log"></div></details>';
      app.insertBefore(sec, anchor);
      const q = function (s) { return sec.querySelector(s); };
      q('#dvNoTimer').checked = opt.noTimer;
      q('#dvRng').value = opt.rng;
      q('#dvRec').checked = opt.record;
      q('#dvNoTimer').addEventListener('change', function (e) { opt.noTimer = e.target.checked; saveOpt(); });
      q('#dvRng').addEventListener('change', function (e) { opt.rng = e.target.value; saveOpt(); });
      q('#dvRec').addEventListener('change', function (e) { opt.record = e.target.checked; saveOpt(); });
      q('#dvTimeout').addEventListener('click', function () { if (expire) expire(); });
      q('#dvExit').addEventListener('click', function () { C.setDev(false); location.href = C.homeUrl(); });
      render();
    }
  };

  function render() {
    const el = document.getElementById('dvLog');
    if (!el) return;
    if (!trace.length) { el.innerHTML = '<p class="dev-empty">まだ記録はありません。</p>'; return; }
    el.innerHTML = '<table class="dev-table"><thead><tr><th>#</th><th>場面 / 選択</th><th>結果</th><th>増減</th></tr></thead><tbody>' +
      trace.map(function (t) {
        return '<tr' + (t.end ? ' class="end"' : '') + '><td>' + t.n + '</td><td>' + esc(t.who) + '<br><b>' + esc(t.label) + '</b>' +
          (t.rng.length ? '<br><small>乱数 ' + t.rng.join(', ') + '</small>' : '') + '</td><td>' + t.res.map(esc).join('<br>') +
          (t.msg ? '<br><small>' + esc(t.msg) + '</small>' : '') + '</td><td>' + (t.diff.length ? t.diff.map(esc).join('<br>') : '―') + '</td></tr>';
      }).join('') + '</tbody></table>';
  }
  return api;
})();
