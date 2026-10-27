/* ====== 効果音(Web Audio で合成する。音声ファイルは使わない) ======
   種類: mid=途中エンド / defeat=敗北 / minion=魔王の手下 / victory=魔王討伐 / supreme=最強 / legend=伝説の旅人 / retire=余生
   長さ: mid と defeat は1秒未満。他は 3〜5秒。 */
const SFX = (function () {
  'use strict';
  const KEY = 'sansec_rpg_sound_v1';
  let ctx = null, master = null, on = true, noiseBuf = null;
  try { on = localStorage.getItem(KEY) !== 'off'; } catch (e) { /* 保存できない環境では、常に入り */ }

  /* 音名 → 周波数。例: f('C5') */
  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function f(name) {
    const m = /^([A-G])([#b]?)(\d)$/.exec(name);
    const n = SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + 1) * 12;
    return 440 * Math.pow(2, (n - 69) / 12);
  }

  function make(target) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const c = target || new AC();
    const g = c.createGain();
    g.gain.value = 0.55;
    const comp = c.createDynamicsCompressor();
    g.connect(comp); comp.connect(c.destination);
    return { c: c, out: g };
  }
  function ensure() {
    if (ctx) { if (ctx.c.state === 'suspended') { try { ctx.c.resume(); } catch (e) { /* 再生できない */ } } return ctx; }
    try { ctx = make(); } catch (e) { ctx = null; }
    return ctx;
  }

  function noise(c) {
    if (c.__noise) return c.__noise;
    const len = c.sampleRate;
    const b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    c.__noise = b;
    return b;
  }

  /* 1音: 立ち上がり→減衰。o = { type, vol, a(立ち上がり), r(余韻), to(終わりの周波数), lp(ローパス), vib(ビブラート深さHz), det(うなり) } */
  function tone(S, freq, t0, dur, o) {
    o = o || {};
    const c = S.c, t = (S.base != null ? S.base : c.currentTime + 0.03) + t0;
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    if (o.det) osc.detune.value = o.det;
    const a = o.a == null ? 0.012 : o.a, r = o.r == null ? 0.08 : o.r, v = (o.vol == null ? 0.2 : o.vol);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + a);
    g.gain.setValueAtTime(v, t + Math.max(a, dur - r));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + r);
    let tail = osc;
    if (o.lp) {
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = o.lp; lp.Q.value = 0.7;
      osc.connect(lp); tail = lp;
    }
    tail.connect(g); g.connect(S.out);
    if (o.vib) {
      const l = c.createOscillator(), lg = c.createGain();
      l.frequency.value = o.vibRate || 5.5; lg.gain.value = o.vib;
      l.connect(lg); lg.connect(osc.frequency);
      l.start(t); l.stop(t + dur + r + 0.05);
    }
    osc.start(t); osc.stop(t + dur + r + 0.05);
  }
  /* 和音 */
  function chord(S, names, t0, dur, o) {
    names.forEach(function (n, i) { tone(S, f(n), t0, dur, Object.assign({}, o, { vol: (o.vol || 0.15) / Math.sqrt(names.length) * 1.4 })); });
  }
  /* 雑音(ドン、シャラ、など) */
  function burst(S, t0, dur, o) {
    o = o || {};
    const c = S.c, t = (S.base != null ? S.base : c.currentTime + 0.03) + t0;
    const src = c.createBufferSource(), g = c.createGain(), flt = c.createBiquadFilter();
    src.buffer = noise(c);
    flt.type = o.type || 'lowpass'; flt.frequency.setValueAtTime(o.f0 || 800, t);
    if (o.f1) flt.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
    g.gain.setValueAtTime(o.vol || 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt); flt.connect(g); g.connect(S.out);
    src.start(t); src.stop(t + dur + 0.05);
  }
  /* きらきら(高い音の連なり) */
  function sparkle(S, t0, span, count, base) {
    const pent = ['C6', 'D6', 'E6', 'G6', 'A6', 'C7', 'D7', 'E7'];
    for (let i = 0; i < count; i++) {
      const n = pent[(base + i * 3) % pent.length];
      tone(S, f(n), t0 + (span / count) * i, 0.06, { type: 'sine', vol: 0.07, a: 0.004, r: 0.35 });
    }
  }
  const brass = { type: 'sawtooth', lp: 2400, a: 0.02, r: 0.12, vol: 0.2 };

  const SONGS = {
    /* 途中エンド: 5音で、すとんと下がる(約0.7秒) */
    mid: function (S) {
      ['A4', 'G4', 'E4', 'D4'].forEach(function (n, i) { tone(S, f(n), i * 0.1, 0.08, { type: 'triangle', vol: 0.4, r: 0.03 }); });
      tone(S, f('C4'), 0.40, 0.2, { type: 'triangle', vol: 0.42, r: 0.1, to: f('B3') });
    },
    /* 敗北: 5音で、少し激しく崩れ落ちる(約0.95秒) */
    defeat: function (S) {
      burst(S, 0.00, 0.12, { f0: 1800, f1: 200, vol: 0.3 });
      ['E4', 'D4', 'B3', 'A3'].forEach(function (n, i) {
        tone(S, f(n), i * 0.1, 0.1, { type: 'sawtooth', lp: 1500, vol: 0.26, r: 0.03 });
        tone(S, f(n) * 0.5, i * 0.1, 0.1, { type: 'square', lp: 700, vol: 0.14, r: 0.03 });
      });
      tone(S, f('E3'), 0.40, 0.4, { type: 'sawtooth', lp: 900, vol: 0.28, to: f('E2'), r: 0.12 });
      burst(S, 0.40, 0.3, { f0: 420, f1: 60, vol: 0.5 });
      tone(S, 150, 0.40, 0.3, { type: 'sine', vol: 0.5, to: 46, r: 0.05 });
    },
    /* 選択(いい効果が多い): 3音で、階段を上がる(約0.3秒) */
    rise: function (S) {
      ['E5', 'G5', 'C6'].forEach(function (n, i) { tone(S, f(n), i * 0.075, 0.07, { type: 'square', lp: 3200, vol: 0.14, a: 0.004, r: 0.04 }); });
    },
    /* 選択(悪い効果が多い・効果なし・時間切れ): 3音で、階段を下がる(約0.3秒) */
    fall: function (S) {
      ['G5', 'E5', 'C5'].forEach(function (n, i) { tone(S, f(n), i * 0.075, 0.07, { type: 'square', lp: 1800, vol: 0.14, a: 0.004, r: 0.05 }); });
    },
    /* 伝説の旅人への選択: 「下がる3音」の音色を、少しだけ変えたもの(約0.45秒) */
    legendPick: function (S) {
      ['G5', 'E5', 'C5'].forEach(function (n, i) {
        tone(S, f(n), i * 0.075, 0.09, { type: 'triangle', lp: 2600, vol: 0.15, a: 0.004, r: 0.12 });
        tone(S, f(n) * 2, i * 0.075 + 0.02, 0.06, { type: 'sine', vol: 0.04, a: 0.004, r: 0.2 });
      });
    },
    /* 和平条約エンド: 硬貨の音と、はずむ金管(約4.2秒) */
    peace: function (S) {
      const b = Object.assign({}, brass, { lp: 2200, vol: 0.2 });
      ['B6', 'E7', 'B6', 'E7'].forEach(function (n, i) { tone(S, f(n), i * 0.11, 0.05, { type: 'sine', vol: 0.09, a: 0.003, r: 0.35 }); });
      [['C4', 'E4', 'G4'], ['G3', 'B3', 'D4'], ['A3', 'C4', 'E4'], ['F3', 'A3', 'C4']].forEach(function (c, i) {
        chord(S, c, 0.6 + i * 0.4, 0.22, b);
        tone(S, f(c[0]) / 2, 0.6 + i * 0.4, 0.22, { type: 'triangle', vol: 0.22, r: 0.06 });
      });
      tone(S, f('C5'), 2.3, 0.15, b); tone(S, f('E5'), 2.5, 0.15, b); tone(S, f('G5'), 2.7, 0.15, b);
      chord(S, ['C4', 'E4', 'G4', 'C5', 'E5'], 2.95, 1.2, Object.assign({}, b, { vol: 0.24, r: 0.35 }));
      tone(S, f('C3'), 2.95, 1.2, { type: 'triangle', vol: 0.26, r: 0.3 });
      ['E6', 'G6', 'B6', 'E7', 'G7'].forEach(function (n, i) { tone(S, f(n), 3.0 + i * 0.16, 0.06, { type: 'sine', vol: 0.07, a: 0.003, r: 0.4 }); });
    },
    /* 遭遇: ザッ、ザッ、という足音(約0.4秒) */
    steps: function (S) {
      [0, 0.17].forEach(function (t, i) {
        burst(S, t, 0.1, { type: 'bandpass', f0: i ? 650 : 800, f1: 300, vol: 0.8 });
        tone(S, i ? 90 : 105, t, 0.08, { type: 'sine', to: 55, vol: 0.28, a: 0.003, r: 0.04 });
      });
    },
    /* モンスターとの遭遇: 低く不協和な一撃と、迫る音(約0.7秒) */
    alert: function (S) {
      tone(S, f('D3'), 0.00, 0.5, { type: 'sawtooth', lp: 900, vol: 0.24, a: 0.01, r: 0.15, to: f('D3') * 0.97 });
      tone(S, f('Ab3'), 0.00, 0.5, { type: 'sawtooth', lp: 800, vol: 0.2, a: 0.01, r: 0.15, to: f('Ab3') * 0.97 });
      burst(S, 0.00, 0.3, { type: 'lowpass', f0: 300, f1: 80, vol: 0.45 });
      tone(S, f('E5'), 0.30, 0.08, { type: 'square', lp: 2400, vol: 0.12, a: 0.003, r: 0.04 });
      tone(S, f('Bb5'), 0.40, 0.08, { type: 'square', lp: 2400, vol: 0.12, a: 0.003, r: 0.04 });
      burst(S, 0.30, 0.35, { type: 'highpass', f0: 1500, f1: 6000, vol: 0.12 });
    },
    /* バッジ(全エンド収集): 明るいファンファーレ(約4.2秒) */
    badgeAll: function (S) {
      const b = Object.assign({}, brass, { vol: 0.2 });
      ['G4', 'C5', 'E5', 'G5'].forEach(function (n, i) { tone(S, f(n), i * 0.12, 0.12, b); });
      chord(S, ['C5', 'E5', 'G5', 'C6'], 0.52, 0.5, b);
      ['A5', 'B5', 'C6'].forEach(function (n, i) { tone(S, f(n), 1.1 + i * 0.18, 0.15, b); });
      chord(S, ['D5', 'G5', 'B5', 'D6'], 1.7, 0.45, b);
      chord(S, ['C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'C6'], 2.3, 1.7, Object.assign({}, b, { vol: 0.26, r: 0.4 }));
      tone(S, f('C3'), 2.3, 1.7, { type: 'triangle', vol: 0.26, r: 0.3 });
      sparkle(S, 2.4, 1.7, 14, 0);
      ['E6', 'G6', 'C7'].forEach(function (n, i) { tone(S, f(n), 3.0 + i * 0.2, 0.3, { type: 'sine', vol: 0.06, a: 0.004, r: 0.5 }); });
    },
    /* 魔王の手下: 不穏な行進曲 → 間の抜けた「ぽよん」(約4秒) */
    minion: function (S) {
      const b = Object.assign({}, brass, { lp: 1500, vol: 0.22 });
      tone(S, f('D3'), 0.00, 0.22, b);
      tone(S, f('D3'), 0.30, 0.22, b);
      tone(S, f('F3'), 0.60, 0.22, b);
      tone(S, f('E3'), 0.90, 0.22, b);
      chord(S, ['D3', 'F3', 'A3'], 1.25, 0.8, Object.assign({}, b, { vol: 0.2 }));
      tone(S, f('A2'), 2.25, 0.9, { type: 'sawtooth', lp: 500, vol: 0.2, vib: 6, vibRate: 7, r: 0.2 });
      tone(S, f('Eb4'), 2.35, 0.8, { type: 'triangle', vol: 0.1, vib: 5, vibRate: 6, r: 0.2 });
      tone(S, 320, 3.35, 0.2, { type: 'sine', vol: 0.35, to: 640, r: 0.04 });
      tone(S, 640, 3.58, 0.2, { type: 'sine', vol: 0.3, to: 380, r: 0.15 });
    },
    /* 魔王討伐: 勝利のファンファーレ(約4秒) */
    victory: function (S) {
      const b = Object.assign({}, brass);
      tone(S, f('C5'), 0.00, 0.14, b); tone(S, f('C5'), 0.18, 0.14, b); tone(S, f('C5'), 0.36, 0.14, b);
      chord(S, ['C5', 'E5', 'G5'], 0.58, 0.55, b);
      tone(S, f('Bb4'), 1.25, 0.2, b);
      tone(S, f('C5'), 1.50, 0.2, b);
      tone(S, f('D5'), 1.75, 0.2, b);
      chord(S, ['E5', 'G5', 'C6'], 2.05, 0.35, b);
      chord(S, ['C4', 'E4', 'G4', 'C5', 'E5', 'G5'], 2.55, 1.35, Object.assign({}, b, { vol: 0.24, r: 0.35 }));
      tone(S, f('C3'), 2.55, 1.35, { type: 'triangle', vol: 0.25, r: 0.3 });
      sparkle(S, 2.7, 1.1, 9, 0);
    },
    /* 最強: 太鼓 → ハープ → 荘厳な和音(約5秒) */
    supreme: function (S) {
      for (let i = 0; i < 8; i++) burst(S, i * 0.07, 0.12, { f0: 260, f1: 90, vol: 0.28 + i * 0.03 });
      burst(S, 0.6, 0.5, { f0: 500, f1: 50, vol: 0.55 });
      tone(S, 90, 0.6, 0.5, { type: 'sine', vol: 0.5, to: 40, r: 0.1 });
      const harp = ['C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'C6', 'E6'];
      harp.forEach(function (n, i) { tone(S, f(n), 0.75 + i * 0.09, 0.2, { type: 'triangle', vol: 0.2, r: 0.4 }); });
      const b = Object.assign({}, brass, { vol: 0.26 });
      chord(S, ['G3', 'B3', 'D4', 'G4'], 1.6, 0.45, b);
      chord(S, ['A3', 'C4', 'E4', 'A4'], 2.1, 0.45, b);
      chord(S, ['C3', 'G3', 'C4', 'E4', 'G4', 'C5', 'E5'], 2.6, 2.2, Object.assign({}, b, { vol: 0.3, r: 0.5, a: 0.05 }));
      tone(S, f('C6'), 2.7, 2.1, { type: 'sine', vol: 0.12, vib: 4, vibRate: 5.5, r: 0.4 });
      sparkle(S, 2.7, 2.2, 16, 1);
    },
    /* 伝説の旅人: 静かな鐘 → 光が満ちる(約4.6秒) */
    legend: function (S) {
      const bell = { type: 'sine', vol: 0.22, a: 0.004, r: 1.2 };
      tone(S, f('D5'), 0.00, 0.25, bell);
      tone(S, f('A4'), 0.60, 0.25, bell);
      tone(S, f('F#5'), 1.20, 0.25, bell);
      tone(S, f('E5'), 1.80, 0.25, bell);
      tone(S, f('D3'), 0.0, 2.8, { type: 'sawtooth', lp: 380, vol: 0.12, a: 1.2, r: 0.5, det: -6 });
      tone(S, f('A3'), 0.4, 2.4, { type: 'sawtooth', lp: 420, vol: 0.1, a: 1.2, r: 0.5, det: 6 });
      chord(S, ['D4', 'F#4', 'A4', 'D5', 'F#5'], 2.7, 1.7, { type: 'triangle', vol: 0.3, a: 0.25, r: 0.6 });
      tone(S, f('A5'), 2.8, 1.6, { type: 'sine', vol: 0.12, vib: 3, vibRate: 5, r: 0.5 });
      sparkle(S, 2.9, 1.5, 10, 2);
    },
    /* 逃げて余生: やさしい笛と、爪弾き(約4.2秒) */
    retire: function (S) {
      const mel = [['G4', 0.0, 0.5], ['A4', 0.55, 0.3], ['B4', 0.9, 0.5], ['D5', 1.45, 0.7], ['B4', 2.2, 0.4], ['A4', 2.65, 0.4], ['G4', 3.1, 0.9]];
      mel.forEach(function (m) {
        tone(S, f(m[0]), m[1], m[2], { type: 'sine', vol: 0.26, a: 0.06, r: 0.2, vib: 3, vibRate: 5 });
        tone(S, f(m[0]) * 2, m[1], m[2], { type: 'sine', vol: 0.04, a: 0.06, r: 0.2 });
      });
      const arp = ['G3', 'D4', 'B3', 'D4'];
      for (let i = 0; i < 8; i++) tone(S, f(arp[i % 4]), 0.05 + i * 0.5, 0.18, { type: 'triangle', vol: 0.16, a: 0.005, r: 0.45 });
      chord(S, ['G3', 'D4', 'G4', 'B4'], 3.1, 0.9, { type: 'triangle', vol: 0.2, a: 0.08, r: 0.6 });
    }
  };

  /* --- BGM(短い曲を繰り返す。立ち絵から選択までの間だけ鳴る) ---
     { len: 1周の秒数, pat: function (S) } 。pat は S.base を起点に音を並べる */
  const BGMS = {
    /* はじまり〜関所: 晴れやか、少しゆっくり(C長調。90拍/分、4小節で約10.7秒) */
    field: { len: 10.667, pat: function (S) {
      const b = 0.6667;
      const ch = [['C3', 'E3', 'G3', 'C4'], ['G2', 'B2', 'D3', 'G3'], ['A2', 'C3', 'E3', 'A3'], ['F2', 'A2', 'C3', 'F3']];
      ch.forEach(function (c, bar) {
        const t = bar * 4 * b;
        chord(S, c, t, 3.8 * b, { type: 'triangle', vol: 0.12, a: 0.06, r: 0.3 });
        [0, 2].forEach(function (k) { tone(S, f(c[0]) / 2, t + k * b, 1.8 * b, { type: 'triangle', vol: 0.2, a: 0.01, r: 0.1 }); });
        [0, 1, 2, 3, 2, 1, 2, 3].forEach(function (ix, i) {
          tone(S, f(c[ix]) * 2, t + i * b / 2, b * 0.4, { type: 'triangle', vol: 0.06, a: 0.005, r: 0.08 });
          burst(S, t + i * b / 2, 0.03, { type: 'highpass', f0: 7000, vol: 0.04 });
        });
      });
      [['E5', 0, 1], ['G5', 1, 1], ['E5', 2, 0.5], ['D5', 2.5, 0.5], ['C5', 3, 1],
        ['D5', 4, 1], ['G5', 5, 1], ['B4', 6, 1], ['D5', 7, 1],
        ['E5', 8, 1], ['C6', 9, 1], ['A5', 10, 0.5], ['G5', 10.5, 0.5], ['E5', 11, 1],
        ['F5', 12, 1], ['A5', 13, 1], ['G5', 14, 2]].forEach(function (n) {
        tone(S, f(n[0]), n[1] * b, n[2] * b * 0.95, { type: 'triangle', lp: 3200, vol: 0.15, a: 0.02, r: 0.12, vib: 3, vibRate: 5 });
      });
    } },
    /* 関所のあと〜ライバル: 明るい城下町(G長調。100拍/分、4小節で9.6秒) */
    town: { len: 9.6, pat: function (S) {
      const b = 0.6;
      const ch = [[['G2', 'D3'], ['B3', 'D4', 'G4']], [['C3', 'G3'], ['C4', 'E4', 'G4']], [['D3', 'A3'], ['D4', 'F#4', 'A4']], [['G2', 'D3'], ['B3', 'D4', 'G4']]];
      ch.forEach(function (c, bar) {
        const t = bar * 4 * b;
        tone(S, f(c[0][0]), t, b * 0.8, { type: 'triangle', vol: 0.24, a: 0.008, r: 0.06 });
        tone(S, f(c[0][1]), t + 2 * b, b * 0.8, { type: 'triangle', vol: 0.22, a: 0.008, r: 0.06 });
        [1, 3].forEach(function (k) {
          chord(S, c[1], t + k * b, b * 0.4, { type: 'square', lp: 1800, vol: 0.12, a: 0.004, r: 0.04 });
          burst(S, t + k * b, 0.1, { type: 'highpass', f0: 3000, vol: 0.09 });
        });
        for (let i = 0; i < 8; i++) burst(S, t + i * b / 2, 0.025, { type: 'highpass', f0: 8000, vol: 0.035 });
      });
      [['B4', 0, 0.5], ['D5', 0.5, 0.5], ['G5', 1, 1], ['F#5', 2, 0.5], ['E5', 2.5, 0.5], ['D5', 3, 1],
        ['E5', 4, 0.5], ['G5', 4.5, 0.5], ['C6', 5, 1], ['B5', 6, 0.5], ['A5', 6.5, 0.5], ['G5', 7, 1],
        ['F#5', 8, 0.5], ['A5', 8.5, 0.5], ['D6', 9, 1], ['C6', 10, 0.5], ['B5', 10.5, 0.5], ['A5', 11, 1],
        ['B5', 12, 0.5], ['A5', 12.5, 0.5], ['G5', 13, 0.5], ['E5', 13.5, 0.5], ['D5', 14, 1], ['G5', 15, 1]].forEach(function (n) {
        tone(S, f(n[0]), n[1] * b, n[2] * b * 0.85, { type: 'square', lp: 2600, vol: 0.1, a: 0.008, r: 0.05 });
      });
    } },
    /* ライバルのあと〜魔王の前(モンスターの区間): 暗く、速い。魔王の曲より、音数を抑えた(イ短調。120拍/分、5小節で10秒) */
    dusk: { len: 10, pat: function (S) {
      const b = 0.5;
      const bars = [
        { r: 'A1', arp: ['A3', 'C4', 'E4', 'C4'] },
        { r: 'A1', arp: ['A3', 'C4', 'E4', 'C4'] },
        { r: 'Bb1', arp: ['Bb2', 'D3', 'F3', 'D3'] },
        { r: 'G2', arp: ['G3', 'B3', 'D4', 'B3'] },
        { r: 'E2', arp: ['E3', 'G#3', 'B3', 'G#3'] }
      ];
      bars.forEach(function (bar, i) {
        const t = i * 4 * b;
        tone(S, f(bar.r), t, 4 * b * 0.98, { type: 'sawtooth', lp: 260, vol: 0.26, a: 0.12, r: 0.2 });
        for (let k = 0; k < 8; k++) tone(S, f(bar.arp[k % 4]) * (k >= 4 ? 2 : 1), t + k * b / 2, b * 0.4, { type: 'sawtooth', lp: 900, vol: 0.07, a: 0.004, r: 0.04 });
        for (let k = 0; k < 4; k++) tone(S, 105, t + k * b, 0.13, { type: 'sine', to: 42, vol: 0.4, a: 0.003, r: 0.06 });
        [1, 3].forEach(function (k) { burst(S, t + k * b, 0.13, { type: 'bandpass', f0: 1000, vol: 0.2 }); });
        for (let k = 0; k < 8; k++) burst(S, t + k * b / 2, 0.02, { type: 'highpass', f0: 7500, vol: 0.03 });
      });
      [['E5', 0, 2], ['D5', 2, 1], ['C5', 3, 1], ['Bb4', 4, 2], ['A4', 6, 2], ['D5', 8, 2], ['C5', 10, 1], ['Bb4', 11, 1],
        ['B4', 12, 2], ['D5', 14, 1], ['E5', 15, 1], ['G#4', 16, 2], ['B4', 18, 2]].forEach(function (n) {
        tone(S, f(n[0]), n[1] * b, n[2] * b * 0.95, { type: 'triangle', lp: 2600, vol: 0.1, a: 0.01, r: 0.1, vib: 4, vibRate: 5.5 });
      });
    } },
    /* 関所の門番: 行進曲風、重く、規則的 */
    gate: { len: 7.68, pat: function (S) {
      const b = 0.48;
      const bass = ['D2', 'D2', 'A1', 'A1', 'Bb1', 'Bb1', 'A1', 'A1'];
      for (let i = 0; i < 16; i++) {
        tone(S, f(bass[(i >> 1) % 8]), i * b, b * 0.8, { type: 'triangle', vol: 0.22, a: 0.01, r: 0.08 });
        if (i % 2 === 1) burst(S, i * b, 0.09, { type: 'highpass', f0: 2500, vol: 0.12 });
        if (i % 4 === 0) tone(S, 70, i * b, 0.12, { type: 'sine', to: 40, vol: 0.3, a: 0.003, r: 0.05 });
      }
      const mel = [['D4', 0], ['F4', 1], ['A4', 2], ['F4', 3], ['E4', 4], ['G4', 5], ['A4', 6], ['G4', 7],
        ['F4', 8], ['A4', 9], ['C5', 10], ['A4', 11], ['A4', 12], ['G4', 13], ['F4', 14], ['E4', 15]];
      mel.forEach(function (m) { tone(S, f(m[0]), m[1] * b, b * 0.5, { type: 'square', lp: 1800, vol: 0.1, a: 0.01, r: 0.06 }); });
    } },
    /* ライバル: ロック風。ドラム、パワーコード、短いリフ */
    rival: { len: 6.4, pat: function (S) {
      const b = 0.4;
      const roots = ['E2', 'E2', 'G2', 'A2'];
      for (let bar = 0; bar < 4; bar++) {
        const r = roots[bar], fifth = f(r) * 1.5, oct = f(r) * 2;
        for (let i = 0; i < 8; i++) {
          const t = bar * 4 * b + i * b / 2, o = { type: 'sawtooth', lp: 1500, a: 0.004, r: 0.03, vol: 0.13 };
          const d = (i % 4 === 3) ? b * 0.45 : b * 0.2;     // 休符まじりの刻み
          tone(S, f(r), t, d, o); tone(S, fifth, t, d, o); tone(S, oct, t, d, o);
        }
        for (let k = 0; k < 4; k++) {
          const t = bar * 4 * b + k * b;
          if (k % 2 === 0) tone(S, 120, t, 0.14, { type: 'sine', to: 45, vol: 0.5, a: 0.002, r: 0.05 });
          else burst(S, t, 0.16, { type: 'bandpass', f0: 1800, vol: 0.28 });
          burst(S, t, 0.04, { type: 'highpass', f0: 6000, vol: 0.1 });
          burst(S, t + b / 2, 0.04, { type: 'highpass', f0: 6000, vol: 0.08 });
        }
      }
      const riff = [['E4', 0], ['G4', 0.5], ['B4', 1], ['A4', 1.5], ['G4', 2], ['E4', 3], ['G4', 4], ['B4', 4.5], ['D5', 5], ['C5', 5.5], ['B4', 6], ['G4', 7]];
      riff.forEach(function (n) { tone(S, f(n[0]), n[1] * b * 2, b * 0.9, { type: 'sawtooth', lp: 2600, vol: 0.09, a: 0.01, r: 0.08, vib: 4 }); });
    } },
    /* 魔王: 少し遅いが、音数が多く、重い(二短調。100拍/分、4小節で9.6秒) */
    demon: { len: 9.6, pat: function (S) {
      const b = 0.6, s16 = b / 4;
      const bars = [
        { r: 'D2', arp: ['D3', 'F3', 'A3', 'F3'] },
        { r: 'Bb1', arp: ['Bb2', 'D3', 'F3', 'D3'] },
        { r: 'G2', arp: ['G3', 'Bb3', 'Eb4', 'Bb3'] },
        { r: 'A1', arp: ['A2', 'C#3', 'E3', 'G3'] }
      ];
      bars.forEach(function (bar, i) {
        const t = i * 4 * b;
        tone(S, f(bar.r), t, 4 * b * 0.98, { type: 'sawtooth', lp: 260, vol: 0.26, a: 0.15, r: 0.2 });
        for (let k = 0; k < 16; k++) tone(S, f(bar.arp[k % 4]) * (k % 8 >= 4 ? 2 : 1), t + k * s16, s16 * 0.8, { type: 'sawtooth', lp: 1000, vol: 0.06, a: 0.004, r: 0.03 });
        for (let k = 0; k < 4; k++) {
          tone(S, 100, t + k * b, 0.14, { type: 'sine', to: 40, vol: 0.42, a: 0.003, r: 0.06 });
          tone(S, 100, t + k * b + 0.2, 0.1, { type: 'sine', to: 40, vol: 0.2, a: 0.003, r: 0.05 });
        }
        [1, 3].forEach(function (k) { burst(S, t + k * b, 0.14, { type: 'bandpass', f0: 900, vol: 0.2 }); });
        [0, 2.5].forEach(function (k) { chord(S, [bar.arp[0], bar.arp[1], bar.arp[2]].map(function (n) { return n.replace(/(\d)$/, function (m, d) { return String(Number(d) + 1); }); }), t + k * b, b * 0.35, { type: 'sawtooth', lp: 1500, vol: 0.2, a: 0.01, r: 0.05 }); });
        for (let k = 0; k < 8; k++) burst(S, t + k * b / 2, 0.02, { type: 'highpass', f0: 7500, vol: 0.035 });
      });
      [['A5', 0, 1], ['Ab5', 1, 1], ['G5', 2, 2], ['F5', 4, 1], ['E5', 5, 1], ['F5', 6, 2],
        ['Eb5', 8, 1], ['D5', 9, 1], ['Eb5', 10, 1], ['G5', 11, 1], ['A5', 12, 1], ['Bb5', 13, 1], ['A5', 14, 1], ['C#6', 15, 1]].forEach(function (n) {
        tone(S, f(n[0]), n[1] * b, n[2] * b * 0.9, { type: 'triangle', lp: 3000, vol: 0.1, a: 0.01, r: 0.1, vib: 4, vibRate: 5.5 });
      });
    } }
  };
  let bgm = null, want = null;
  function bgmStop(keep) {
    if (!keep) want = null;
    if (!bgm) return;
    const b = bgm; bgm = null;
    clearInterval(b.timer);
    try {
      const t = b.S.c.currentTime;
      b.gain.gain.cancelScheduledValues(t);
      b.gain.gain.setValueAtTime(b.gain.gain.value, t);
      b.gain.gain.linearRampToValueAtTime(0.0001, t + 0.15);
      setTimeout(function () { try { b.gain.disconnect(); } catch (e) { /* すでに切れている */ } }, 400);
    } catch (e) { /* 止められなくても、ゲームは続ける */ }
  }
  function bgmStart(kind, force) {
    if (bgm && bgm.kind === kind && !force) return;          // すでに同じ曲が鳴っているなら、そのまま続ける
    bgmStop();
    if (!BGMS[kind]) return;
    want = kind;
    if (!on && !force) return;
    const S0 = ensure();
    if (!S0) return;
    try {
      const c = S0.c, gain = c.createGain();
      gain.gain.setValueAtTime(0.0001, c.currentTime);
      gain.gain.linearRampToValueAtTime(0.6, c.currentTime + 0.08);
      gain.connect(S0.out);
      const S = { c: c, out: gain, base: null }, def = BGMS[kind];
      let next = c.currentTime + 0.05;
      const sched = function () { while (next < c.currentTime + 1.2) { S.base = next; def.pat(S); next += def.len; } };
      sched();
      bgm = { kind: kind, S: S, gain: gain, timer: setInterval(sched, 250) };
    } catch (e) { bgm = null; }
  }
  const LENGTH = { mid: 0.7, defeat: 0.95, rise: 0.3, fall: 0.3, steps: 0.4, alert: 0.7, peace: 4.2, legendPick: 0.45, badgeAll: 4.2, minion: 4.0, victory: 4.1, supreme: 5.0, legend: 4.6, retire: 4.2 };

  return {
    kinds: Object.keys(SONGS),
    length: function (k) { return LENGTH[k] || 0; },
    isOn: function () { return on; },
    /* 「ピッ」: エンドにならない選択と、メッセージを先へ送る時の音 */
    beep: function (force) {
      if (!on && !force) return;
      const S = ensure();
      if (!S) return;
      try { tone(S, f('A6'), 0, 0.045, { type: 'square', vol: 0.09, a: 0.002, r: 0.025 }); } catch (e) { /* 鳴らなくても続ける */ }
    },
    bgm: bgmStart,
    bgmWanted: function () { return want; },
    bgmStop: bgmStop,
    bgmKinds: Object.keys(BGMS),
    bgmLength: function (k) { return BGMS[k] ? BGMS[k].len : 0; },
    _renderBgm: function (kind, seconds) {
      const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      const oc = new OAC(1, 44100 * seconds, 44100);
      const S = make(oc); S.base = 0.03;
      BGMS[kind].pat(S);
      return oc.startRendering();
    },
    setOn: function (v) {
      on = !!v;
      if (!on) bgmStop(true);
      else if (want) bgmStart(want);
      try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) { /* 保存できなくても動く */ }
      if (on) ensure();
    },
    /* 最初のタップで呼ぶ。ブラウザは、操作の後でないと音を出せないため */
    unlock: function () { if (on) ensure(); },
    play: function (kind, force) {
      if (!on && !force) return;
      const S = ensure();
      if (!S || !SONGS[kind]) return;
      try { SONGS[kind](S); } catch (e) { /* 音が鳴らなくても、ゲームは続ける */ }
    },
    /* 書き出し用(検証): 指定の種類を OfflineAudioContext に描く */
    _render: function (kind, seconds) {
      const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      const oc = new OAC(1, 44100 * seconds, 44100);
      const S = make(oc);
      SONGS[kind](S);
      return oc.startRendering();
    }
  };
})();
