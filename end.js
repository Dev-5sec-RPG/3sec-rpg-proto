/* ====== エンドのページ。共通部分は静的に書かれており、ここでは「その人の結果」だけを足す ====== */
(function () {
  'use strict';
  const G = GAME, C = COMMON, STATS = G.STATS;
  const SEP = tx('、');
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

  const gameName = main.getAttribute('data-game') || tx('3秒即断RPG');
  const endName = main.getAttribute('data-name') || '';
  /* トップページのURL。公開先が決まっていればそれを、未設定なら今開いている場所から割り出す */
  function topUrl() {
    const site = main.getAttribute('data-site');
    if (site) return site;
    if (/^https?:$/.test(location.protocol)) { try { return new URL(main.getAttribute('data-root') || '../../', location.href).href; } catch (e) { return ''; } }
    return '';
  }
  function shareText() {
    return tx('『{g}』でNo.{c}のエンドに到達しました！\nエンドタイトルは『{n}』でした！', { g: gameName, c: code, n: endName });
  }
  const shareBtn = document.getElementById('shareBtn');
  if (shareBtn && !main.getAttribute('data-site')) {
    const u = topUrl();
    if (u) shareBtn.href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(shareText()) + '&url=' + encodeURIComponent(u);
  }

  C.updateCollect();
  const cx = C.loadCodex(), last = C.loadLast();
  const statusLine = document.getElementById('statusLine');
  const mineEl = document.getElementById('mine');
  const badge = document.getElementById('newBadge');
  const lastRun = (last && last.code === code) ? last : null;
  const devOn = C.devOn();
  /* 開発者モードの確認用の回(図鑑に記録しない回)と、開発者モードでの閲覧は、中身を見せる */
  const reasonNow = (lastRun && lastRun.why) || '';
  if (reasonNow) { const rs = document.querySelector('.reason span'); if (rs) rs.textContent = reasonNow; }   // まとめたエンドは、今回の理由を出す
  const reached = !!cx[code] || !!(lastRun && lastRun.dev) || devOn;

  /* 到達済みの人にだけ、エンドの中身を見せる。未到達の人(共有のリンクから来た人)には、ヒントだけが出る */
  if (reached) {
    document.getElementById('lock').hidden = true;
    document.getElementById('reveal').hidden = false;
    document.getElementById('shareBtn').hidden = false;
    document.getElementById('camBtn').hidden = false;
    const fx = document.getElementById('fxLayer');
    if (fx) fx.hidden = false;                       // 豪華な演出は、到達した人にだけ
    try { document.title = 'No.' + code + ' ' + main.getAttribute('data-name') + '｜' + document.title.split(/｜| \| /).pop(); } catch (e) { /* タブの表示だけ */ }
  }

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
      '<summary>' + tx('この回の記録') + '</summary>' +
      '<h3>' + tx('終了時ステータス') + '</h3><dl>' + statsHtml + '</dl>' +
      '<h3>' + tx('終了時装備') + '</h3><p>' + (last.equip.length ? last.equip.join(SEP) : tx('なし')) + '</p>' +
      '<h3>' + tx('仲間') + '</h3><p>' + (last.allies && last.allies.length ? last.allies.join(SEP) : tx('なし')) + '</p>' +
      '<h3>' + tx('終了時所持金') + '</h3><p>' + (typeof last.money === 'number' ? tx('{m}銀貨', { m: last.money }) : '―') + '</p>' +
      '<h3>' + tx('履歴') + '</h3><ol>' + histHtml + '</ol>';
    mineEl.hidden = false;
    statusLine.hidden = true;
  } else {
    /* 到達済みで、この回の結果ではない場合。未到達の人は、ヒントだけの画面のまま(図鑑にも登録しない) */
    if (reached) { statusLine.textContent = tx('このエンドには到達済みです。'); statusLine.hidden = false; }
  }

  /* このエンドへの到達回数(この端末の記録) */
  if (reached && cx[code]) {
    const cl = document.createElement('p');
    cl.className = 'status-line count-line';
    cl.textContent = tx('このエンドへの到達回数: {n}回', { n: cx[code].n || 1 });
    statusLine.parentNode.insertBefore(cl, statusLine.nextSibling);
  }

  /* ====== 開発者モード: この回の判定の記録 ====== */
  if (devOn) {
    const tr = C.devTrace();
    const box = document.createElement('details');
    box.className = 'detail dev-trace';
    box.open = true;
    const e2 = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
    box.innerHTML = '<summary>開発者モード: 判定の記録</summary>' + (tr.length ?
      '<table class="dev-table"><thead><tr><th>#</th><th>場面 / 選択</th><th>結果</th><th>増減</th></tr></thead><tbody>' + tr.map(function (t) {
        return '<tr' + (t.end ? ' class="end"' : '') + '><td>' + t.n + '</td><td>' + e2(t.who) + '<br><b>' + e2(t.label) + '</b></td><td>' + t.res.map(e2).join('<br>') +
          '</td><td>' + (t.diff.length ? t.diff.map(e2).join('<br>') : '―') + '</td></tr>';
      }).join('') + '</tbody></table>' : '<p class="dev-empty">この回の記録はありません(ゲームを開発者モードで遊ぶと残ります)。</p>') +
      '<p class="dev-links"><a class="btn small" href="' + C.devUrl() + '">開発者ページ</a></p>';
    document.querySelector('.actions').before(box);
  }

  /* ====== バッジの獲得(結果が出てから3秒後に知らせる) ====== */
  function badgePrompt() {
    const ids = (lastRun.badges || []).filter(function (id) { return G.BADGES.some(function (b) { return b.id === id; }); });
    if (!ids.length) return;
    lastRun.badgePrompted = true; C.saveLast(lastRun);
    const bd = C.loadBadges();
    ids.forEach(function (id) { if (bd[id]) bd[id].notified = true; });
    C.saveBadges(bd);
    const list = ids.map(function (id) { return G.BADGES.filter(function (b) { return b.id === id; })[0]; });
    const wrapEl = document.createElement('div');
    wrapEl.className = 'modal';
    wrapEl.setAttribute('role', 'dialog');
    wrapEl.setAttribute('aria-modal', 'true');
    wrapEl.setAttribute('aria-label', tx('バッジの獲得'));
    wrapEl.innerHTML =
      '<div class="modal-box"><div class="modal-badges">' + list.map(function (b) { return '<div class="mb"><div class="mb-art">' + C.pixelSVG(b.art) + '</div><span>' + b.name + '</span></div>'; }).join('') + '</div>' +
      '<p class="modal-q">' + tx('バッジを獲得しました。') + '<br>' + tx('確認しますか?') + '</p>' +
      '<div class="modal-act"><button class="btn primary" id="bdYes" type="button" disabled>Yes</button><button class="btn" id="bdNo" type="button" disabled>No</button></div></div>';
    document.body.appendChild(wrapEl);
    const yes = wrapEl.querySelector('#bdYes'), no = wrapEl.querySelector('#bdNo');
    /* 出た瞬間に、結果画面のボタンを押そうとしていた指が当たらないよう、少し待つ */
    setTimeout(function () { yes.disabled = false; no.disabled = false; yes.focus({ preventScroll: true }); }, 600);
    function close() { wrapEl.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(ev) { if (ev.key === 'Escape' && !no.disabled) close(); }
    document.addEventListener('keydown', onKey);
    no.addEventListener('click', close);
    yes.addEventListener('click', function () {
      location.href = ids.length === 1 ? C.badgeUrl(ids[0]) : C.codexUrl() + '#badges';
    });
  }
  if (lastRun && !lastRun.dev && lastRun.badges && lastRun.badges.length && !lastRun.badgePrompted) {
    setTimeout(badgePrompt, 3000);
  }

  /* ====== 結果の画像化(📸)。ブラウザの中で描き、保存と、対応端末では共有ができる ====== */
  const camBtn = document.getElementById('camBtn');
  const FONT = "'DotGothic16','Hiragino Kaku Gothic ProN','Yu Gothic','Noto Sans JP',sans-serif";
  const W = 1080, H = 1350;
  const FXCOL = { victory: '240,192,80', supreme: '255,214,102', legend: '127,216,255', minion: '200,60,90', retire: '255,178,107' };
  const COL = { bg: '#0e1124', panel: '#171b3a', line: '#4a5399', ink: '#e9ecfb', soft: '#98a2d2', gold: '#f0c050', bad: '#ff7a8e' };

  function wrap(ctx, text, maxW) {
    const out = [];
    String(text).split('\n').forEach(function (para) {
      let line = '';
      Array.from(para).forEach(function (ch) {
        if (ctx.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; } else line += ch;
      });
      out.push(line);
    });
    return out;
  }

  function drawArt(ctx, key, x, y, size) {
    const rows = G.ART[key];
    if (!rows) return;
    const cell = Math.floor(size / Math.max(rows.length, rows[0].length));
    const ox = x + Math.floor((size - cell * rows[0].length) / 2), oy = y + Math.floor((size - cell * rows.length) / 2);
    rows.forEach(function (row, ry) {
      Array.from(row).forEach(function (ch, rx) {
        if (ch === '.') return;
        ctx.fillStyle = G.PALETTE[ch];
        ctx.fillRect(ox + rx * cell, oy + ry * cell, cell, cell);
      });
    });
  }

  function render() {
    const end = G.ENDS[code];
    const mine = last && last.code === code ? last : null;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = COL.line; ctx.lineWidth = 6; ctx.strokeRect(24, 24, W - 48, H - 48);

    ctx.textAlign = 'center';
    ctx.fillStyle = COL.soft; ctx.font = '36px ' + FONT;
    ctx.fillText(gameName, W / 2, 92);
    ctx.fillStyle = COL.gold; ctx.font = '52px ' + FONT;
    ctx.fillText('No.' + code, W / 2, 168);

    ctx.fillStyle = (end.kind === 'fail') ? COL.bad : (end.kind === 'quit' ? COL.ink : COL.gold);
    ctx.font = '64px ' + FONT;
    let y = 258;
    wrap(ctx, end.name, W - 160).forEach(function (l) { ctx.fillText(l, W / 2, y); y += 78; });

    y += 6;
    if (end.luxury) {                                   // 豪華なエンドは、画像にも光と星を足す
      const fxc = FXCOL[end.sfx] || FXCOL.victory;
      const gl = ctx.createRadialGradient(W / 2, y + 150, 40, W / 2, y + 150, 330);
      gl.addColorStop(0, 'rgba(' + fxc + ',.55)'); gl.addColorStop(1, 'rgba(' + fxc + ',0)');
      ctx.fillStyle = gl; ctx.fillRect(40, y - 120, W - 80, 540);
      ctx.fillStyle = 'rgba(' + fxc + ',.95)';
      [[210, 0, 5], [860, 40, 4], [150, 200, 3], [930, 230, 5], [300, 330, 4], [790, 340, 3], [90, 90, 3], [980, 120, 3]].forEach(function (p) {
        const sx = p[0], sy = y + p[1] - 20, r = p[2] * 3;
        ctx.fillRect(sx - 1.5, sy - r, 3, r * 2); ctx.fillRect(sx - r, sy - 1.5, r * 2, 3);
      });
    }
    ctx.fillStyle = '#dfe4f6'; ctx.fillRect(W / 2 - 150, y, 300, 300);
    ctx.strokeStyle = COL.line; ctx.lineWidth = 4; ctx.strokeRect(W / 2 - 150, y, 300, 300);
    drawArt(ctx, end.img, W / 2 - 138, y + 12, 276);
    y += 300 + 62;

    ctx.fillStyle = COL.ink; ctx.font = '38px ' + FONT;
    wrap(ctx, end.text, W - 180).forEach(function (l) { ctx.fillText(l, W / 2, y); y += 54; });
    const reasonText = (mine && mine.why) || end.reason;
    if (reasonText) {
      y += 14; ctx.fillStyle = COL.bad; ctx.font = '32px ' + FONT;
      wrap(ctx, tx('理由: {r}', { r: reasonText }), W - 180).forEach(function (l) { ctx.fillText(l, W / 2, y); y += 44; });
    }

    if (mine) {
      y = Math.max(y + 24, 930);
      ctx.strokeStyle = COL.line; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(90, y); ctx.lineTo(W - 90, y); ctx.stroke();
      y += 58;
      ctx.font = '36px ' + FONT;
      const colW = (W - 180) / STATS.length;
      STATS.forEach(function (s, i) {
        const cx0 = 90 + colW * i + colW / 2;
        ctx.fillStyle = COL.soft; ctx.fillText(s.label, cx0, y);
        ctx.fillStyle = COL.gold; ctx.font = '48px ' + FONT; ctx.fillText(String(mine.stats[s.key]), cx0, y + 56); ctx.font = '36px ' + FONT;
      });
      y += 130;
      ctx.textAlign = 'left'; ctx.font = '32px ' + FONT;
      const rows = [
        [tx('装備'), mine.equip && mine.equip.length ? mine.equip.join(SEP) : tx('なし')],
        [tx('仲間'), mine.allies && mine.allies.length ? mine.allies.join(SEP) : tx('なし')],
        [tx('所持金'), typeof mine.money === 'number' ? tx('{m}銀貨', { m: mine.money }) : '―']
      ];
      rows.forEach(function (r) {
        ctx.fillStyle = COL.soft; ctx.fillText(r[0], 110, y);
        ctx.fillStyle = COL.ink;
        const lines = wrap(ctx, r[1], W - 380);
        lines.slice(0, 2).forEach(function (l, i) { ctx.fillText(l, 270, y + i * 40); });
        y += 44 + Math.min(lines.length - 1, 1) * 40;
      });
    }

    ctx.textAlign = 'center'; ctx.fillStyle = COL.soft; ctx.font = '30px ' + FONT;
    ctx.fillText(tx('3秒以内に選び続ける、短いRPG'), W / 2, H - 56);
    return cv;
  }

  function toBlob(cv) {
    return new Promise(function (res) { cv.toBlob(function (b) { res(b); }, 'image/png'); });
  }

  function openViewer(blob) {
    const url = URL.createObjectURL(blob);
    const file = (typeof File === 'function') ? new File([blob], 'sansec-' + code + '.png', { type: 'image/png' }) : null;
    const canShareFile = !!(file && navigator.canShare && navigator.canShare({ files: [file] }));
    const wrapEl = document.createElement('div');
    wrapEl.className = 'viewer';
    wrapEl.setAttribute('role', 'dialog');
    wrapEl.setAttribute('aria-label', tx('結果の画像'));
    wrapEl.innerHTML =
      '<div class="viewer-box"><img alt="' + tx('結果の画像') + '" src="' + url + '">' +
      '<p class="viewer-note">' + tx('画像を保存して使えます。スマホでは、画像の長押しでも保存できます。') + '</p>' +
      '<div class="viewer-actions">' +
      '<a class="btn primary" download="sansec-' + code + '.png" href="' + url + '">' + tx('保存') + '</a>' +
      (canShareFile ? '<button class="btn" id="vShare" type="button">' + tx('共有') + '</button>' : '') +
      '<button class="btn" id="vClose" type="button">' + tx('閉じる') + '</button></div></div>';
    document.body.appendChild(wrapEl);
    function close() { wrapEl.remove(); URL.revokeObjectURL(url); document.removeEventListener('keydown', onKey); camBtn.focus(); }
    function onKey(ev) { if (ev.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    wrapEl.addEventListener('click', function (ev) { if (ev.target === wrapEl) close(); });
    wrapEl.querySelector('#vClose').addEventListener('click', close);
    const vs = wrapEl.querySelector('#vShare');
    if (vs) vs.addEventListener('click', function () {
      const u = topUrl();
      const data = { files: [file], text: shareText() + (u ? '\n' + u : '') };
      navigator.share(data).catch(function () { /* 取り消しは何もしない */ });
    });
    wrapEl.querySelector('.btn').focus();
  }

  if (camBtn) camBtn.addEventListener('click', function () {
    camBtn.disabled = true;
    const ready = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    ready.catch(function () {}).then(function () { return toBlob(render()); }).then(function (blob) {
      camBtn.disabled = false;
      if (blob) openViewer(blob);
    }).catch(function () { camBtn.disabled = false; });
  });
})();
