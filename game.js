/* ====== ゲーム本体のページ(A〜B)。エンドに着いたら、エンドのページへ移る ====== */
(function () {
  'use strict';
  const G = GAME, C = COMMON, STATS = G.STATS, ENDS = G.ENDS;
  const DEV = (typeof DEVPLAY !== 'undefined' && DEVPLAY.active) ? DEVPLAY : null;   // 開発者モード(パスワードで入った時だけ)
  const FREEZE_MS = 200;                                       // 選んだあと、「選べた」ことを確認させる間
  const rng = function () { return DEV ? DEV.rng() : Math.random(); };
  const SHOWN = G.TIME_LIMIT;                                  // 画面に出る秒数(3.0)
  const LIMIT = (typeof window.__LIMIT === 'number') ? window.__LIMIT : G.TIME_LIMIT * ((typeof I18N !== 'undefined' && I18N.lang === 'en') ? 1.25 : G.TIME_SCALE);   // 実際の制限(日本語3.6秒/英語3.75秒。表示はどちらも3.0秒)
  const SCALE = LIMIT / SHOWN;                                  // 表示の進みは、実時間より少しゆっくり
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
      numEl.textContent = (rem / SCALE / 1000).toFixed(1);
      fillEl.style.transform = 'scaleX(' + (rem / LIMIT) + ')';
      fillEl.classList.toggle('hot', rem / SCALE < 1000);
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
      '<div class="clock" aria-hidden="true"><div class="clock-num" id="clockNum">' + (SHOWN / 1000).toFixed(1) + '</div>' +
      '<div class="clock-bar"><i id="clockFill"></i></div></div>' +
      '<div class="choices">' + order.map(function (idx, n) {
        return '<button class="btn choice" data-i="' + idx + '"><span class="key">' + (n + 1) + '</span><span class="txt">' + o.labels[idx] + '</span></button>';
      }).join('') + '</div>';
    let done = false;
    readyAt = performance.now() + 150;            // 直前のタップの誤爆を防ぐ
    const buttons = stage.querySelectorAll('.choice');
    function lock() { buttons.forEach(function (b) { b.disabled = true; }); }
    /* 選んだ選択肢の色を変え、ほかを沈ませる(エンドへ向かう時は、すぐ戻す) */
    function mark(b, on) {
      buttons.forEach(function (x) { x.classList.toggle('picked', on && x === b); x.classList.toggle('dim', on && x !== b); });
    }
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        if (done || performance.now() < readyAt) return;
        done = true; stopTimer(); lock();
        mark(b, true);
        /* onPick は、エンドにならない時だけ「次の処理」を返す。その場合は、少し止めてから進む */
        const next = o.onPick(Number(b.getAttribute('data-i')));
        if (typeof next === 'function') setTimeout(next, FREEZE_MS); else mark(b, false);
      });
    });
    function expire() {
      if (done) return;
      done = true; lock();
      o.onTimeout();
    }
    if (o.mark != null && o.mark >= 0) {
      const t = stage.querySelector('.choice[data-i="' + o.mark + '"]');
      if (t) t.classList.add('dev-target');
    }
    if (DEV) DEV.setExpire(expire);
    if (DEV && DEV.noTimer) { $('#clockNum').textContent = '∞'; return; }   // 開発者モード: 時間を止めておける
    startTimer(expire);
  }

  /* --- タップで進む画面 --- */
  function showTap(html, label, onNext) {
    phase = 'tap';
    stage.innerHTML = html + '<button class="btn next" id="nextBtn">' + label + '</button>';
    readyAt = performance.now() + 180;
    function go() {
      if (cutLock || performance.now() < readyAt) return;     // カットイン中は、先へ進めない
      SFX.beep();
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
      '<div class="portrait" aria-hidden="true">' + (first ? '？' : (card.icon ? C.pixelSVG(card.icon) : '！')) + '</div>' +
      '<div class="window tappable">' + (first ? '' : '<div class="plate">' + card.who + '</div>') +
      '<p class="line">' + (first ? (card.intro1 || tx('あれ、あそこにいるのは…')) : (card.intro2 || tx('{w}だ。何か用があるみたいだ。', { w: card.who }))) + '</p>' +
      '<span class="more" aria-hidden="true">▼</span></div>';
    function open() {
      showTap(html, tx('次へ'), function () {
        if (first) showIntro(card, 2); else showQuestion(card);
      });
    }
    /* 門番・ライバル・魔王は、「〇〇〇だ」の直前に立ち絵をカットインさせる */
    if (!first && typeof PORTRAITS !== 'undefined' && PORTRAITS[card.id]) cutIn(PORTRAITS[card.id], open, card.id);
    else { if (!first) SFX.play(card.tier ? 'alert' : 'steps'); open(); }     // 立ち絵のない相手は、足音(モンスターだけは、緊張する音)
  }

  /* カットイン: 0.1秒でフェードインしながら右から入り、表示したあと、0.1秒でフェードアウトしながら左へ抜ける。
     表示時間は、関所・ライバルが0.5秒(計0.7秒)、魔王が0.8秒(計1.0秒)。立ち絵以外は透明 */
  let cutLock = false;
  const CUT_IN_MS = 100, CUT_OUT_MS = 100, CUT_HOLD_MS = { B: 500, C: 500, D: 800 };
  function cutIn(svg, done, id) {
    cutLock = true;
    SFX.bgm({ B: 'gate', C: 'rival', D: 'demon' }[id]);
    const hold = CUT_HOLD_MS[id] || 500;
    const el = document.createElement('div');
    el.className = 'cutin';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = svg;
    document.body.appendChild(el);
    let finished = false;
    function end() { if (finished) return; finished = true; cutLock = false; if (el.parentNode) el.parentNode.removeChild(el); done(); }
    requestAnimationFrame(function () { el.classList.add('on'); });
    setTimeout(function () { el.classList.remove('on'); el.classList.add('out'); }, CUT_IN_MS + hold);
    setTimeout(end, CUT_IN_MS + hold + CUT_OUT_MS);
  }

  function showQuestion(card, stage) {
    stage = stage || 1;
    curCard = card;
    const boss = card.id === 'D';
    const list = stage === 2 ? card.choices2 : card.choices;   // ランダムに選ばれた選択肢は、進行表を作る時に決まっている
    const who = boss ? tx('{w}({n}回目)', { w: card.who, n: stage }) : card.who;
    const preset = DEV ? C.devPreset() : null;
    showChoice({
      who: card.who, q: stage === 2 ? card.q2 : card.q, shuffle: true,
      labels: list.map(function (c) { return c.label; }),
      mark: preset && preset.pick ? list.map(function (c) { return c.label; }).indexOf(preset.pick) : -1,
      onPick: function (i) {
        const choice = list[i];
        run.history.push({ who: who, text: choice.label });
        const used = [];                                        // 判定で使った乱数(開発者モードの記録用)
        const rr = function () { const v = rng(); used.push(v); return v; };
        const out = boss ? G.resolveBoss(run, card, stage, choice, rr) : G.resolveChoice(run, card, choice, rr);
        const meta = { who: who, label: choice.label, rng: used };
        const after = out.next ? function () { showQuestion(card, 2); } : null;
        feedback(out);
        if (out.end) { finishStep(out, after, meta); return; }          // エンドへは、止めずに進む
        return function () { finishStep(out, after, meta); };            // それ以外は、選べたことを確認させてから進む
      },
      onTimeout: function () {
        run.history.push({ who: who, text: tx('(時間切れ)') });
        const out = G.resolveTimeout(run, card);
        feedback(out, true);
        finishStep(out, null, { who: who, label: tx('(時間切れ)') });
      }
    });
  }

  /* 選択の直後の音: いい効果が多ければ「上がる3音」。悪い効果が多い・効果なし・時間切れは「下がる3音」。エンドへ向かう時は鳴らさない */
  function feedback(out, timedOut) {
    if (out.end) return;
    if (curCard && curCard.id === 'trav_max') { SFX.play('legendPick'); return; }   // 伝説の旅人だけは、専用の音
    /* 関所・ライバルを抜けたら「いい音」。ただし、ステータスが下がる・装備や仲間を奪われる突破は、悪い音 */
    if (out.pass) {
      const lost = out.loseEquip || out.loseAlly || (out.fx && Object.keys(out.fx).some(function (k) { return out.fx[k] < 0; }));
      SFX.play(lost ? 'fall' : 'rise');
      return;
    }
    /* 装備・仲間が増えるのは、所持金を失っても「いいこと」。ただし、今より弱い装備に替えてしまう時は悪い方 */
    const weaker = (out.items || []).some(function (it) {
      const cur = run.equip.filter(function (e) { return e.slot === it.slot; })[0];
      return cur && cur.rank > it.rank;
    });
    if (weaker) { SFX.play('fall'); return; }
    if (!timedOut && ((out.items && out.items.length) || out.ally)) { SFX.play('rise'); return; }
    let good = 0, bad = 0;
    if (out.fx) Object.keys(out.fx).forEach(function (k) { if (out.fx[k] > 0) good += out.fx[k]; else bad -= out.fx[k]; });
    const gold = (typeof out.gold === 'number') ? out.gold : 0;
    if (gold > 0) good += 1; else if (gold < 0) bad += 1;
    if (out.loseAlly || out.loseAllAllies || out.loseEquip || out.loseSlot) bad += 1;
    SFX.play(!timedOut && good > bad ? 'rise' : 'fall');
  }

  /* 場面とBGM: 関所のあとは城下町、ライバルのあとは暗い曲(次の立ち絵で、その場面の曲に替わる) */
  let curCard = null;
  function finishStep(out, after, meta) {
    const before = DEV ? DEV.snap(run) : null;
    G.applyOutcome(run, out);
    if (DEV) DEV.log(before, DEV.snap(run), out, meta);
    setStatus(run.stats, out.fx);
    setPurse(run.money, out.goldDelta);
    setGear();
    if (out.end) { leave(out.end, out.why); return; }
    /* 関所・ライバルを抜けた結果の画面は、無音。次の画面へ進む時に、次の曲を流し始める */
    const nextBgm = curCard && curCard.id === 'B' ? 'town' : curCard && curCard.id === 'C' ? 'dusk' : null;
    if (nextBgm) SFX.bgmStop();
    const parts = STATS.filter(function (s) { return out.fx && out.fx[s.key]; }).map(function (s) {
      return [s.label, out.fx[s.key]];
    });
    if (out.goldDelta) parts.push([tx('所持金'), out.goldDelta]);
    let chips = parts.map(function (p) {
      const v = p[1];
      return '<span class="chip ' + (v > 0 ? 'plus' : 'minus') + '">' + p[0] + ' ' + (v > 0 ? '+' : '−') + Math.abs(v) + '</span>';
    }).join('');
    chips += (out.notes || []).map(function (n) {
      return '<span class="chip ' + (n.v > 0 ? 'plus' : 'minus') + '">' + n.t + (n.s || (n.v > 0 ? tx(' 獲得') : tx(' 喪失'))) + '</span>';
    }).join('');
    showTap(
      '<div class="window tappable"><p class="line">' + out.msg + '</p><span class="more" aria-hidden="true">▼</span></div>' +
      '<div class="deltas">' + chips + '</div>',
      tx('次へ'), nextBgm ? function () { SFX.bgm(nextBgm); (after || nextCard)(); } : (after || nextCard)
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
      tx('次へ'), nextCard
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
    run.queue = G.buildQueue(rng);
    buildPips();
    run.i = -1;
    nextCard();
  }
  /* 冒頭のストーリー(タップで進む) */
  function showStory(n) {
    if (n >= G.STORY.length) { startRun(); return; }
    showTap(
      '<div class="window tappable story"><p class="line">' + G.STORY[n] + '</p><span class="more" aria-hidden="true">▼</span></div>',
      tx('次へ'), function () { showStory(n + 1); }
    );
  }
  /* 「始める」のあと: 効果音の長さの半分で暗転、残り半分で次の画面を出し、終わってから曲を流す(効果音と曲を重ねない) */
  function fadeSwap(render, done) {
    const half = Math.round(SFX.length('rise') * 1000 / 2);
    stage.style.transition = 'opacity ' + half + 'ms linear';
    stage.style.opacity = '0';
    setTimeout(function () {
      render();
      stage.style.opacity = '0';
      void stage.offsetWidth;
      stage.style.opacity = '1';
      setTimeout(function () { stage.style.transition = ''; stage.style.opacity = ''; done(); }, half);
    }, half);
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
      who: null, q: tx('始めますか。'), shuffle: false, labels: [tx('始める'), tx('始めない')],
      mark: (DEV && C.devPreset() && C.devPreset().pick) ? ['始める', '始めない'].indexOf(C.devPreset().pick) : -1,
      onPick: function (i) {
        if (i === 0) { run.history.push({ who: 'A', text: tx('始める') }); SFX.play('rise'); return function () { fadeSwap(function () { showStory(0); }, function () { SFX.bgm('field'); }); }; }
        run.history.push({ who: 'A', text: tx('始めない') });
        leave('999');
      },
      onTimeout: function () {
        run.history.push({ who: 'A', text: tx('(時間切れ)') });
        leave('000');
      }
    });
  }

  /* --- エンドのページへ移る。暗転は挟まず、点滅と揺れで切る --- */
  function leave(code, why) {
    if (leaving) return;
    leaving = true;
    stopTimer();
    SFX.bgmStop();
    const e = ENDS[code];
    const record = !(DEV && !DEV.record);          // 開発者モードでは、図鑑に記録しないことも選べる
    let cx = C.loadCodex(), isNew = false, fresh = [];
    if (record) {
      isNew = !cx[code];
      cx[code] = { n: ((cx[code] && cx[code].n) || 0) + 1, t: Date.now() };
      C.saveCodex(cx);
      fresh = C.grantBadges(Object.keys(cx).length);   // 収集数がバッジの条件に届いたら獲得(通知は結果画面の3秒後)
    }
    if (DEV) DEV.logEnd(code, run);
    const last = {
      code: code, why: why || '', isNew: isNew, t: Date.now(), badges: fresh, dev: !!DEV && !record,
      stats: Object.assign({}, run.stats), money: run.money, history: run.history.slice(),
      equip: run.equip.map(G.equipLabel), allies: run.allies.map(function (a) { return a.name; })
    };
    C.saveLast(last);
    C.handoff({ codex: cx, last: last });         // 移動先へ直接も渡す
    const go = function () { location.replace(C.endUrl(code)); };   // 履歴に残さない(戻るでプレイの途中に戻らないため)
    if (e.epilogue) { showEpilogue(e, go); return; }
    SFX.play(e.sfx);                                                    // 途中エンド・敗北は、1秒未満の短い音
    const kind = e.kind;
    if (kind === 'fail') document.body.classList.add('hit-fail');       // 赤い点滅(0.56秒)
    else if (kind !== 'quit') document.body.classList.add('hit-ok');
    setTimeout(go, kind === 'quit' ? 500 : 1060);                       // 点滅(0.56秒)のあと、0.5秒置いて結果へ
  }

  /* 長めのエンド(討伐・最強・伝説・手下・余生): 長めのフェードアウト → 一文 → エンドのページへ(タップで飛ばせる) */
  function showEpilogue(e, go) {
    const v = document.createElement('div');
    v.className = 'veil fx-' + e.sfx;
    v.innerHTML = '<p class="veil-text"></p>';
    v.firstChild.textContent = e.epilogue;
    document.body.appendChild(v);
    void v.offsetWidth;
    v.classList.add('on');
    SFX.play(e.sfx);                                                    // 3〜5秒の音。暗転と同時に鳴らす
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

  /* --- 音: 最初の操作で使えるようにする。右上のボタンで切り替え --- */
  const sndBtn = document.getElementById('sndBtn');
  function paintSnd() {
    if (!sndBtn) return;
    sndBtn.textContent = SFX.isOn() ? '♪ ON' : '♪ OFF';
    sndBtn.setAttribute('aria-pressed', SFX.isOn() ? 'true' : 'false');
    sndBtn.setAttribute('aria-label', SFX.isOn() ? tx('効果音: オン(押すとオフ)') : tx('効果音: オフ(押すとオン)'));
  }
  document.addEventListener('pointerdown', function () { SFX.unlock(); }, true);
  document.addEventListener('keydown', function () { SFX.unlock(); }, true);
  if (sndBtn) sndBtn.addEventListener('click', function () {
    SFX.setOn(!SFX.isOn());
    paintSnd();
    if (SFX.isOn()) SFX.play('mid');                  // 鳴ることの確認
  });
  paintSnd();

  /* --- 開発者モード: エンドの直前から始める --- */
  function startPreset(p) {
    run = G.newRun();
    const st = p.state || {};
    Object.keys(st.stats || {}).forEach(function (k) { run.stats[k] = st.stats[k]; });
    if (typeof st.money === 'number') run.money = st.money;
    run.equip = (st.equip || []).map(function (k) { return G.ITEMS[k]; }).sort(function (a, b) { return a.slot < b.slot ? 1 : -1; });
    run.allies = (st.allies || []).map(function (k) { return G.ALLIES[k]; });
    run.flags = Object.assign({}, st.flags || {});
    run.silence = st.silence || 0;
    setGear(); setStatus(run.stats); setPurse(run.money);
    pipLabels = ['DEV']; setPips(0);
    run.history.push({ who: 'DEV', text: '開発者モード: No.' + p.code + ' の直前から開始' });
    if (p.kind === 'start') { showStart(); return; }
    const card = G.findCard(p.card);
    run.queue = [card]; run.i = 0; pipOf = [0];
    G.encounter(run, card);
    showQuestion(card, p.stage || 1);
  }

  /* --- 起動 --- */
  buildStatus();
  C.updateCollect();
  setStatus(G.START_STATS);
  setPurse(G.START_MONEY);
  setPips(0);
  let started = false;
  function boot() {
    if (started) return; started = true;
    if (DEV) DEV.mount();
    const preset = DEV ? C.devPreset() : null;
    if (preset) startPreset(preset); else showStart();
  }
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 700); })]).then(boot);
  } else {
    boot();
  }
})();
