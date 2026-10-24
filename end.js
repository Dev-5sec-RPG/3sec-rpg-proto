/* ====== エンドのページ。共通部分は静的に書かれており、ここでは「その人の結果」だけを足す ====== */
(function () {
  'use strict';
  const G = GAME, C = COMMON, STATS = G.STATS;
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

  const gameName = main.getAttribute('data-game') || '3秒即断RPG';
  const endName = main.getAttribute('data-name') || '';
  /* トップページのURL。公開先が決まっていればそれを、未設定なら今開いている場所から割り出す */
  function topUrl() {
    const site = main.getAttribute('data-site');
    if (site) return site;
    if (/^https?:$/.test(location.protocol)) { try { return new URL(main.getAttribute('data-root') || '../../', location.href).href; } catch (e) { return ''; } }
    return '';
  }
  function shareText() {
    return '『' + gameName + '』でNo.' + code + 'のエンドに到達しました！\nエンドタイトルは『' + endName + '』でした！';
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
  const reached = !!cx[code];

  /* 到達済みの人にだけ、エンドの中身を見せる。未到達の人(共有のリンクから来た人)には、ヒントだけが出る */
  if (reached) {
    document.getElementById('lock').hidden = true;
    document.getElementById('reveal').hidden = false;
    document.getElementById('shareBtn').hidden = false;
    document.getElementById('camBtn').hidden = false;
    try { document.title = 'No.' + code + ' ' + main.getAttribute('data-name') + '｜' + document.title.split('｜').pop(); } catch (e) { /* タブの表示だけ */ }
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
      '<summary>この回の記録</summary>' +
      '<h3>終了時ステータス</h3><dl>' + statsHtml + '</dl>' +
      '<h3>終了時装備</h3><p>' + (last.equip.length ? last.equip.join('、') : 'なし') + '</p>' +
      '<h3>仲間</h3><p>' + (last.allies && last.allies.length ? last.allies.join('、') : 'なし') + '</p>' +
      '<h3>終了時所持金</h3><p>' + (typeof last.money === 'number' ? last.money + '銀貨' : '―') + '</p>' +
      '<h3>履歴</h3><ol>' + histHtml + '</ol>';
    mineEl.hidden = false;
    statusLine.hidden = true;
  } else {
    /* 到達済みで、この回の結果ではない場合。未到達の人は、ヒントだけの画面のまま(図鑑にも登録しない) */
    if (reached) { statusLine.textContent = 'このエンドには到達済みです。'; statusLine.hidden = false; }
  }

  /* ====== 結果の画像化(📸)。ブラウザの中で描き、保存と、対応端末では共有ができる ====== */
  const camBtn = document.getElementById('camBtn');
  const FONT = "'DotGothic16','Hiragino Kaku Gothic ProN','Yu Gothic','Noto Sans JP',sans-serif";
  const W = 1080, H = 1350;
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
    ctx.fillStyle = '#dfe4f6'; ctx.fillRect(W / 2 - 150, y, 300, 300);
    ctx.strokeStyle = COL.line; ctx.lineWidth = 4; ctx.strokeRect(W / 2 - 150, y, 300, 300);
    drawArt(ctx, end.img, W / 2 - 138, y + 12, 276);
    y += 300 + 62;

    ctx.fillStyle = COL.ink; ctx.font = '38px ' + FONT;
    wrap(ctx, end.text, W - 180).forEach(function (l) { ctx.fillText(l, W / 2, y); y += 54; });
    if (end.reason) {
      y += 14; ctx.fillStyle = COL.bad; ctx.font = '32px ' + FONT;
      wrap(ctx, '理由: ' + end.reason, W - 180).forEach(function (l) { ctx.fillText(l, W / 2, y); y += 44; });
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
        ['装備', mine.equip && mine.equip.length ? mine.equip.join('、') : 'なし'],
        ['仲間', mine.allies && mine.allies.length ? mine.allies.join('、') : 'なし'],
        ['所持金', typeof mine.money === 'number' ? mine.money + '銀貨' : '―']
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
    ctx.fillText('3秒以内に選び続ける、短いRPG', W / 2, H - 56);
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
    wrapEl.setAttribute('aria-label', '結果の画像');
    wrapEl.innerHTML =
      '<div class="viewer-box"><img alt="結果の画像" src="' + url + '">' +
      '<p class="viewer-note">画像を保存して使えます。スマホでは、画像の長押しでも保存できます。</p>' +
      '<div class="viewer-actions">' +
      '<a class="btn primary" download="sansec-' + code + '.png" href="' + url + '">保存</a>' +
      (canShareFile ? '<button class="btn" id="vShare" type="button">共有</button>' : '') +
      '<button class="btn" id="vClose" type="button">閉じる</button></div></div>';
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
