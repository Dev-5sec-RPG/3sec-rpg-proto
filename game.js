/* ====== ゲーム本体のページ(A〜B)。エンドに着いたら、エンドのページへ移る ====== */
(function () {
  'use strict';
  const G = GAME, C = COMMON, STATS = G.STATS, ENDS = G.ENDS;
  const LIMIT = (typeof window.__LIMIT === 'number') ? window.__LIMIT : G.TIME_LIMIT;
  let pipLabels = ['A'], pipOf = [];
  const $ = function (s) { return document.querySelector(s); };
  const stage = $('#stage'), statusEl = $('#status'), pipsEl = $('#pips');

  let run = null, phase = 'boot', timer = null, readyAt = 0, leaving = false;
  const prefetched = {};

  /* --- 行き先になり得るエンドのページを、先に読み込んでおく --- */
  function prefetch(codes) {
    codes.forEach(function (code) {
      if (prefetched[code]) return;
      prefetched[code] = true;
      const l = document.createElement('link');
      l.rel = 'prefetch';
      l.href = C.endUrl(code);
      document.head.appendChild(l);
    });
  }
  function candidates(card) {
    const s = {};
    const t = card.timeout;
    if (t && t.type === 'end') { s[t.end] = 1; if (t.hidden) s[t.hidden.end] = 1; }
    card.choices.concat(card.choices2 || []).forEach(function (c) {
      if (c.end) s[c.end] = 1;
      if (c.alt && c.alt.end) s[c.alt.end] = 1;
      if (c.gate) { if (c.gate.fail) s[c.gate.fail] = 1; if (c.gate.end) s[c.gate.end] = 1; }
      if (c.ends) c.ends.forEach(function (e) { s[e] = 1; });
    });
    if (card.forced) { if (card.clearEnd) s[card.clearEnd] = 1; if (card.allZeroEnd) s[card.allZeroEnd] = 1; }
    return Object.keys(s);
  }

  /* --- ステータスと進行表示 --- */
  function buildStatus() {
    statusEl.innerHTML = STATS.map(function (s) {
      return '<div class="stat" data-k="' + s.key + '"><span class="stat-l">' + s.label + '</span><span class="stat-v">0</span></div>';
    }).join('');
  }
  function setStatus(stats, deltas) {
    STATS.forEach(function (s) {
      const cell = statusEl.querySelector('[data-k="' + s.key + '"]');
      cell.querySelector('.stat-v').textContent = String(stats[s.key]);
      cell.classList.remove('up', 'down');
      if (deltas && deltas[s.key]) {
        void cell.offsetWidth;
        cell.classList.add(deltas[s.key] > 0 ? 'up' : 'down');
      }
      cell.classList.toggle('neg', stats[s.key] <= 0);
    });
  }
  function setPips(i) {
    pipsEl.innerHTML = pipLabels.map(function (l, n) {
      return '<li class="' + (n < i ? 'done' : n === i ? 'now' : '') + '">' + l + '</li>';
    }).join('');
  }

  function setGear() {
    const w = run.equip.filter(function (e) { return e.slot === 'weapon'; })[0];
    const a = run.equip.filter(function (e) { return e.slot === 'armor'; })[0];
    $('#gearW').textContent = w ? G.equipLabel(w) : '―';
    $('#gearA').textContent = a ? G.equipLabel(a) : '―';
    $('#gearF').textContent = run.allies.length ? run.allies.map(function (x) { return x.name; }).join('、') : '―';
  }
  function setPurse(money, delta) {
    const el = $('#purse');
    $('#purseV').textContent = String(money);
    el.classList.remove('up', 'down');
    if (delta) { void el.offsetWidth; el.classList.add(delta > 0 ? 'up' : 'down'); }
  }

  /* --- カウントダウン --- */
  function stopTimer() {
    if (timer) { cancelAnimationFrame(timer.raf); timer = null; }
  }
  function startTimer(onExpire) {
    stopTimer();
    const numEl = $('#clockNum'), fillEl = $('#clockFill');
    const t = { deadline: 0, last: 0, raf: 0 };
    timer = t;
    function tick(now) {
      if (timer !== t) return;
      if (!t.last) { t.last = now; t.deadline = now + LIMIT; }
      const gap = now - t.last;
      t.last = now;
      if (gap > 300) t.deadline += gap;           // 画面が隠れていた間は止める
      const rem = t.deadline - now;
      if (rem <= 0) {
        numEl.textContent = '0.0';
        fillEl.style.transform = 'scaleX(0)';
        stopTimer();
        onExpire();
        return;
      }
      numEl.textContent = (rem / 1000).toFixed(1);
      fillEl.style.transform = 'scaleX(' + (rem / LIMIT) + ')';
      fillEl.classList.toggle('hot', rem < 1000);
      t.raf = requestAnimationFrame(tick);
    }
    t.raf = requestAnimationFrame(tick);
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  /* --- 選択画面(カウントダウン付き) --- */
  function showChoice(o) {
    phase = 'choice';
    const order = o.labels.map(function (_, i) { return i; });
    if (o.shuffle) shuffle(order);
    stage.innerHTML =
      '<div class="window">' + (o.who ? '<div class="plate">' + o.who + '</div>' : '') + '<p class="line">' + o.q + '</p></div>' +
      '<div class="clock" aria-hidden="true"><div class="clock-num" id="clockNum">' + (LIMIT / 1000).toFixed(1) + '</div>' +
      '<div class="clock-bar"><i id="clockFill"></i></div></div>' +
      '<div class="choices">' + order.map(function (idx, n) {
        return '<button class="btn choice" data-i="' + idx + '"><span class="key">' + (n + 1) + '</span><span class="txt">' + o.labels[idx] + '</span></button>';
      }).join('') + '</div>';
    let done = false;
    readyAt = performance.now() + 150;            // 直前のタップの誤爆を防ぐ
    const buttons = stage.querySelectorAll('.choice');
    function lock() { buttons.forEach(function (b) { b.disabled = true; }); }
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        if (done || performance.now() < readyAt) return;
        done = true; stopTimer(); lock();
        o.onPick(Number(b.getAttribute('data-i')));
      });
    });
    startTimer(function () {
      if (done) return;
      done = true; lock();
      o.onTimeout();
    });
  }

  /* --- タップで進む画面 --- */
  function showTap(html, label, onNext) {
    phase = 'tap';
    stage.innerHTML = html + '<button class="btn next" id="nextBtn">' + label + '</button>';
    readyAt = performance.now() + 180;
    function go() {
      if (performance.now() < readyAt) return;
      onNext();
    }
    const btn = $('#nextBtn'), win = stage.querySelector('.window');
    btn.addEventListener('click', go);
    if (win) win.addEventListener('click', go);
    btn.focus({ preventScroll: true });
  }

  function showIntro(card, step) {
    const first = step === 1;
    if (first) prefetch(candidates(card));        // 物語を読んでいる間に、行き先を読み込む
    const html =
      '<div class="portrait" aria-hidden="true">' + (first ? '？' : '！') + '</div>' +
      '<div class="window tappable">' + (first ? '' : '<div class="plate">' + card.who + '</div>') +
      '<p class="line">' + (first ? (card.intro1 || 'あれ、あそこにいるのは…') : (card.intro2 || card.who + 'だ。何か用があるみたいだ。')) + '</p>' +
      '<span class="more" aria-hidden="true">▼</span></div>';
    showTap(html, '次へ', function () {
      if (first) showIntro(card, 2); else showQuestion(card);
    });
  }

  function showQuestion(card, stage) {
    stage = stage || 1;
    const boss = card.id === 'D';
    const list = stage === 2 ? card.choices2 : card.choices;   // ランダムに選ばれた選択肢は、進行表を作る時に決まっている
    showChoice({
      who: card.who, q: stage === 2 ? card.q2 : card.q, shuffle: true,
      labels: list.map(function (c) { return c.label; }),
      onPick: function (i) {
        const choice = list[i];
        run.history.push({ who: card.who + (boss ? '(' + stage + '回目)' : ''), text: choice.label });
        const out = boss ? G.resolveBoss(run, card, stage, choice, Math.random) : G.resolveChoice(run, card, choice);
        finishStep(out, out.next ? function () { showQuestion(card, 2); } : null);
      },
      onTimeout: function () {
        run.history.push({ who: card.who + (boss ? '(' + stage + '回目)' : ''), text: '(時間切れ)' });
        finishStep(G.resolveTimeout(run, card));
      }
    });
  }

  function finishStep(out, after) {
    G.applyOutcome(run, out);
    setStatus(run.stats, out.fx);
    setPurse(run.money, out.goldDelta);
    setGear();
    if (out.end) { leave(out.end); return; }
    const parts = STATS.filter(function (s) { return out.fx && out.fx[s.key]; }).map(function (s) {
      return [s.label, out.fx[s.key]];
    });
    if (out.goldDelta) parts.push(['所持金', out.goldDelta]);
    let chips = parts.map(function (p) {
      const v = p[1];
      return '<span class="chip ' + (v > 0 ? 'plus' : 'minus') + '">' + p[0] + ' ' + (v > 0 ? '+' : '−') + Math.abs(v) + '</span>';
    }).join('');
    chips += (out.notes || []).map(function (n) {
      return '<span class="chip ' + (n.v > 0 ? 'plus' : 'minus') + '">' + n.t + (n.v > 0 ? ' 獲得' : ' 喪失') + '</span>';
    }).join('');
    showTap(
      '<div class="window tappable"><p class="line">' + out.msg + '</p><span class="more" aria-hidden="true">▼</span></div>' +
      '<div class="deltas">' + chips + '</div>',
      '次へ', after || nextCard
    );
  }

  /* --- 進行 --- */
  function nextCard() {
    run.i += 1;
    if (run.i >= run.queue.length) { leave('999'); return; }   // 通常は、イベントDで必ずエンドに着く
    const card = run.queue[run.i];
    G.encounter(run, card);
    setPips(pipOf[run.i]);
    if (card.narr) { showNarration(card); return; }
    showIntro(card, 1);
  }
  /* 場面の切り替え(選択なし)。次の場面の行き先も、先に読み込んでおく */
  function showNarration(card) {
    const nxt = run.queue[run.i + 1];
    if (nxt) prefetch(candidates(nxt));
    showTap(
      '<div class="window tappable"><p class="line">' + card.text + '</p><span class="more" aria-hidden="true">▼</span></div>',
      '次へ', nextCard
    );
  }
  /* 進行表から、進行表示(A / 1 2 3 / B / 1 2 … / C)を作る */
  function buildPips() {
    pipLabels = ['A']; pipOf = [];
    let n = 0, idx = 0;
    run.queue.forEach(function (c, k) {
      if (c.narr) { pipOf[k] = idx; return; }       // 場面の切り替えでは、進行表示を動かさない
      if (c.forced) { n = 0; pipLabels.push(c.id); } else { pipLabels.push(String(++n)); }
      idx += 1; pipOf[k] = idx;
    });
  }
  function startRun() {
    run.queue = G.buildQueue(Math.random);
    buildPips();
    run.i = -1;
    nextCard();
  }
  /* 冒頭のストーリー(タップで進む) */
  function showStory(n) {
    if (n >= G.STORY.length) { startRun(); return; }
    showTap(
      '<div class="window tappable story"><p class="line">' + G.STORY[n] + '</p><span class="more" aria-hidden="true">▼</span></div>',
      '次へ', function () { showStory(n + 1); }
    );
  }
  function showStart() {
    run = G.newRun();
    pipLabels = ['A'];
    setGear();
    setStatus(run.stats);
    setPurse(run.money);
    setPips(0);
    prefetch(['000', '999']);
    showChoice({
      who: null, q: '始めますか。', shuffle: false, labels: ['始める', '始めない'],
      onPick: function (i) {
        if (i === 0) { run.history.push({ who: 'A', text: '始める' }); showStory(0); }
        else { run.history.push({ who: 'A', text: '始めない' }); leave('999'); }
      },
      onTimeout: function () {
        run.history.push({ who: 'A', text: '(時間切れ)' });
        leave('000');
      }
    });
  }

  /* --- エンドのページへ移る。暗転は挟まず、点滅と揺れで切る --- */
  function leave(code) {
    if (leaving) return;
    leaving = true;
    stopTimer();
    const cx = C.loadCodex();
    const isNew = !cx[code];
    cx[code] = { n: ((cx[code] && cx[code].n) || 0) + 1, t: Date.now() };
    C.saveCodex(cx);
    const last = {
      code: code, isNew: isNew, t: Date.now(),
      stats: Object.assign({}, run.stats), money: run.money, history: run.history.slice(),
      equip: run.equip.map(G.equipLabel), allies: run.allies.map(function (a) { return a.name; })
    };
    C.saveLast(last);
    C.handoff({ codex: cx, last: last });         // 移動先へ直接も渡す
    const go = function () { location.replace(C.endUrl(code)); };   // 履歴に残さない(戻るでプレイの途中に戻らないため)
    if (ENDS[code].epilogue) { showEpilogue(ENDS[code].epilogue, go); return; }
    const kind = ENDS[code].kind;
    if (kind === 'fail') document.body.classList.add('hit-fail');
    else if (kind !== 'quit') document.body.classList.add('hit-ok');
    go();
  }

  /* 勝利エンド: 長めのフェードアウト → 一文 → エンドのページへ(タップで飛ばせる) */
  function showEpilogue(text, go) {
    const v = document.createElement('div');
    v.className = 'veil';
    v.innerHTML = '<p class="veil-text"></p>';
    v.firstChild.textContent = text;
    document.body.appendChild(v);
    void v.offsetWidth;
    v.classList.add('on');
    let moved = false;
    const next = function () { if (moved) return; moved = true; go(); };
    setTimeout(function () { v.addEventListener('click', next); }, 3200);
    setTimeout(next, 5600);
  }

  document.addEventListener('keydown', function (ev) {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (phase === 'choice' && /^[1-4]$/.test(ev.key)) {
      const b = stage.querySelectorAll('.choice')[Number(ev.key) - 1];
      if (b && !b.disabled) { ev.preventDefault(); b.click(); }
    }
  });
  window.addEventListener('pageshow', function (e) { if (e.persisted) location.reload(); });

  /* --- 起動 --- */
  buildStatus();
  C.updateCollect();
  setStatus(G.START_STATS);
  setPurse(G.START_MONEY);
  setPips(0);
  let started = false;
  function boot() { if (started) return; started = true; showStart(); }
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 700); })]).then(boot);
  } else {
    boot();
  }
})();
