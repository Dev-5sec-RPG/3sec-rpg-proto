/* ====== 開発者モードの共通部品(結果の説明、状態の記録、各エンド直前の場面) ======
   ゲームの判定そのもの(engine.js)を使う。ここに判定の複製は持たない。 */
const DEVLIB = (function () {
  'use strict';
  const G = GAME, STATS = G.STATS;

  /* 判定結果(outcome)を、人が読める短い文にする */
  function describe(o) {
    const out = [];
    if (o.end) out.push('エンド No.' + o.end + '「' + G.ENDS[o.end].name + '」');
    if (o.pass) out.push('通過');
    STATS.forEach(function (s) {
      const v = o.fx && o.fx[s.key];
      if (v) out.push(s.label + (v > 0 ? '+' : '') + v);
    });
    const gold = (typeof o.goldDelta === 'number') ? o.goldDelta : o.gold;
    if (gold) out.push('所持金' + (gold > 0 ? '+' : '') + gold);
    if (o.items) out.push('装備獲得: ' + o.items.map(G.equipLabel).join('・'));
    if (o.ally) out.push('仲間加入: ' + o.ally.name);
    if (o.loseAlly) out.push('仲間を1人奪われる');
    if (o.loseAllAllies) out.push('仲間を全て失う');
    if (o.loseEquip) out.push('装備を全て失う');
    if (o.loseSlot) out.push((o.loseSlot === 'weapon' ? '武器' : '防具') + 'を失う(装備があれば)');
    if (o.silence) out.push('沈黙+1');
    if (o.next) out.push('→ 2回目の選択へ');
    if (!out.length) out.push('変化なし');
    return out;
  }

  /* 実行中の状態の写し */
  function snap(run) {
    return {
      stats: Object.assign({}, run.stats), money: run.money,
      equip: run.equip.map(G.equipLabel), allies: run.allies.map(function (a) { return a.name; }),
      flags: Object.assign({}, run.flags), silence: run.silence
    };
  }
  /* 2つの状態の差 */
  function diff(a, b) {
    const out = [];
    STATS.forEach(function (s) { if (a.stats[s.key] !== b.stats[s.key]) out.push(s.label + ' ' + a.stats[s.key] + '→' + b.stats[s.key]); });
    if (a.money !== b.money) out.push('所持金 ' + a.money + '→' + b.money);
    if (a.equip.join() !== b.equip.join()) out.push('装備 [' + (a.equip.join('・') || 'なし') + ']→[' + (b.equip.join('・') || 'なし') + ']');
    if (a.allies.join() !== b.allies.join()) out.push('仲間 [' + (a.allies.join('・') || 'なし') + ']→[' + (b.allies.join('・') || 'なし') + ']');
    return out;
  }

  /* --- 各エンドの「直前」の場面 ---
     card=カード id / stage=イベントDの回 / pick=選ぶ選択肢(印が付く) / timeout=時間切れで到達 / rng=乱数を固定する値
     state=開始時の状態(stats / money / equip / allies / flags) */
  const Z = { courage: 0, caution: 0, charm: 0, improv: 0 };
  const SC = {};
  function put(code, card, pick, state, extra) {
    SC[code] = Object.assign({ code: code, card: card, pick: pick || null, state: state || {} }, extra || {});
  }
  put('000', null, null, {}, { kind: 'start', timeout: true });
  put('999', null, '始めない', {}, { kind: 'start' });
  put('001', 'merchant', '壺で殴る');
  put('002', 'dog', '骨を奪う');
  put('003', 'dog', null, {}, { timeout: true });
  put('004', 'child', '逆に借りる');
  put('005', 'child', null, {}, { timeout: true });
  put('006', 'king', '馴れ馴れしく話す');
  put('007', 'inn', null, {}, { timeout: true });
  put('008', 'spring', 'はい、金の斧です');
  put('009', 'chest', '開ける');
  put('010', 'B', '総合力で押し通る');
  put('011', 'B', '堂々と通る');
  put('012', 'B', '経歴を語る');
  put('013', 'B', '総合力で押し通る', { stats: Z });
  put('014', 'B', null, {}, { timeout: true });
  put('015', 'shop_w3', '盗む');
  put('016', 'shop_w3', '見定める');
  put('017', 'shop_w3', 'ねだる');
  put('018', 'shop_w3', '後で払う');
  put('019', 'trav_weak', '連れ去る');
  put('020', 'C', '逃げる', { equip: ['w1'] });
  put('021', 'C', 'じゃんけんをする', { equip: ['w1'] }, { rng: 0.99 });
  put('022', 'C', null, { equip: ['w1'] }, { timeout: true });
  put('023', 'C', '戦う', { equip: ['w1'] });
  put('024', 'C', '仲間になろうと誘う', { equip: ['w1'] });
  put('025', 'm_orc', '戦う');
  put('026', 'm_wyvern', 'ガードする');
  put('027', 'm_orc', null, {}, { timeout: true });
  put('028', 'm_slime', '現実から逃げる');
  put('029', 'D', '戦う');
  put('030', 'D', '仲間に戦わせる');
  put('031', 'D', '世間話をする');
  put('032', 'D', '歌を歌う');
  put('033', 'D', '土下座する', { allies: ['weak'] }, { stage: 2 });
  put('034', 'D', '助けを呼ぶ', {}, { stage: 2 });
  put('035', 'D', null, {}, { timeout: true });
  put('036', 'D', '逃げる', {}, { stage: 2 });
  put('037', 'D', '土下座する', {}, { stage: 2 });
  const STRONG = { courage: 4, caution: 4, charm: 3, improv: 3 };    // 合計14
  put('038', 'D', '奥義を使う', { equip: ['w3', 'a2'] }, { stage: 2 });
  put('039', 'D', '奥義を使う', { stats: STRONG }, { stage: 2 });
  put('040', 'D', '奥義を使う', { allies: ['strong'] }, { stage: 2 });
  put('041', 'D', '奥義を使う', { equip: ['w3', 'a2'], stats: STRONG }, { stage: 2 });
  put('042', 'D', '奥義を使う', { equip: ['w3', 'a2'], stats: STRONG, allies: ['strong'] }, { stage: 2 });
  put('043', 'D', '助けを呼ぶ', { flags: { metMax: true } }, { stage: 2 });

  /* 場面の「初期状態」を、短い文にする */
  function stateText(sc) {
    const st = sc.state || {}, parts = [];
    const stats = Object.assign({ courage: 1, caution: 1, charm: 1, improv: 1 }, st.stats || {});
    parts.push(STATS.map(function (s) { return s.label + stats[s.key]; }).join(' '));
    parts.push('所持金' + (typeof st.money === 'number' ? st.money : G.START_MONEY));
    parts.push('装備:' + ((st.equip || []).map(function (k) { return G.equipLabel(G.ITEMS[k]); }).join('・') || 'なし'));
    parts.push('仲間:' + ((st.allies || []).map(function (k) { return G.ALLIES[k].name; }).join('・') || 'なし'));
    if (st.flags && st.flags.metMax) parts.push('伝説の旅人に会っている');
    return parts.join(' / ');
  }

  return { describe: describe, snap: snap, diff: diff, SCENES: SC, stateText: stateText };
})();
