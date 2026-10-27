/* ====== データと判定(画面に依存しない部分) ====== */
const GAME = (function () {
  const TIME_LIMIT = 3000;      // 画面に表示する制限時間(ミリ秒)
  const TIME_SCALE = 1.2;       // 実際の制限時間は、表示の1.2倍(3.0秒の表示で、実際は3.6秒)
  const DRAW_COUNT = 3;         // ランダムBで引くカード枚数
  const STORY = [
    tx('世界には、魔王がいる。\n魔王の軍勢は、国々を次々と飲み込んでいった。'),
    tx('ここは、世界の果ての辺境の村。\n魔王の噂は届いても、誰も何もしようとしない。'),
    tx('…それなら、自分が行くしかない。\n「魔王を、倒しに行くぞ」')
  ];
  const SHARE_URL = '';         // 公開後に共有用のURLを入れる

  const STATS = [
    { key: 'courage', label: tx('度胸') },
    { key: 'caution', label: tx('慎重') },
    { key: 'charm', label: tx('愛嬌') },
    { key: 'improv', label: tx('その場しのぎ') }
  ];
  const START_STATS = { courage: 1, caution: 1, charm: 1, improv: 1 };
  const START_MONEY = 10;       // 所持金の初期値(単位は銀貨)

  const PALETTE = {
    k: '#1b1b2f', w: '#ffffff', c: '#f3e3b3', y: '#f2c14e', o: '#d9822b',
    r: '#d6455d', n: '#8a5a3c', b: '#3a6fd8', g: '#4aa564', a: '#a4acc4',
    d: '#5b627c', p: '#e58fb0', s: '#7cc7e8',
    h: '#f2c9a0', v: '#7e57c2', l: '#8bd17c'
  };
  const ART = {
    clock: [
      '...kkkkkk...', '.kkwwwwwwkk.', '.kwwwwkwwwk.', 'kwwwwwkwwwwk', 'kwwwwwkwwwwk',
      'kwwwwwkkkwwk', 'kwwwwwwwwwwk', 'kwwwwwwwwwwk', '.kwwwwrwwwk.', '.kkwwwwwwkk.', '...kkkkkk...'
    ],
    door: [
      '.kkkkkkkkkk.', '.knnnnnnnnk.', '.knnnnnnnnk.', '.knnkkkknnk.', '.knnknnknnk.', '.knnkkkknnk.',
      '.knnnnnnnnk.', '.knnnnnnyyk.', '.knnnnnnyyk.', '.knnnnnnnnk.', '.knnnnnnnnk.', 'kkkkkkkkkkkk'
    ],
    crown: [
      'y.....y.....y', 'yy...yyy...yy', 'yyy.yyyyy.yyy', 'yyyyyyyyyyyyy',
      'yyryyyybyyryy', 'yyyyyyyyyyyyy', 'kkkkkkkkkkkkk'
    ],
    bone: [
      'kkk........kkk', 'kccckkkkkkkccck', 'kcccccccccccck', 'kcccccccccccck', 'kccckkkkkkccck', 'kkk........kkk'
    ].map(function (r) { return r.length === 15 ? r.slice(0, 14) : r; }),
    jar: [
      '...kkkk...', '...knnk...', '..kknnkk..', '.knnnnnnk.', 'knnonnnnnk',
      'knnnnnnnnk', 'knnrrrrnnk', 'knnnnnnnnk', '.knnnnnnk.', '..kkkkkk..'
    ],
    coin: [
      '..kkkkk..', '.kyyyyyk.', 'kyyyoyyyk', 'kyyoooyyk', 'kyyyoyyyk', 'kyyyoyyyk', '.kyyyyyk.', '..kkkkk..'
    ],
    bed: [
      'kk..........kk', 'knwwbbbbbbbbnk', 'knwwbbbbbbbbnk', 'knbbbbbbbbbbnk',
      'kkkkkkkkkkkkkk', 'kn..........nk', 'kn..........nk'
    ],
    gate: [
      'dd.dd..dd.dd', 'dddddddddddd', 'dddddddddddd', 'ddddkkkkdddd', 'dddkknnkkddd', 'dddknnnnkddd',
      'dddknnnnkddd', 'dddknnynkddd', 'dddknnnnkddd', 'dddknnnnkddd', 'kkkkkkkkkkkk'
    ],
    empty: [
      '..kkkkkk..', '.kaaaaaak.', 'kaakkkkaak', 'kakk..kkak', 'kak....kak',
      'kak....kak', 'kakk..kkak', 'kaakkkkaak', '.kaaaaaak.', '..kkkkkk..'
    ],
    flag: [
      'nrrrrrrrr...', 'nrrrrrrrrrr.', 'nrrrrrrrr...', 'nrrrrr......', 'n...........', 'n...........', 'n...........', 'nnn.........'
    ],
    axe: [
      'kkkkk......', 'kyyyyykk...', 'kyyyyyykn..', 'kyyyyyykn..', 'kyyyyykkn..',
      'kkkkk..kn..', '.......kn..', '.......kn..', '.......kn..', '......kkn..'
    ],
    chest: [
      '.kkkkkkkkkk.', 'knnnnnnnnnnk', 'knnnnnnnnnnk', 'kkkkkyykkkkk',
      'knnnnyynnnnk', 'knnnnnnnnnnk', 'knnnnnnnnnnk', 'kkkkkkkkkkkk'
    ],
    horn: [
      'kk.......kk', 'krk.....krk', 'krrkkkkkrrk', 'kdddddddddk', 'kdrrdddrrdk',
      'kdddddddddk', 'kdkkkkkkkdk', 'kdkwkwkwkdk', '.kdddddddk.', '..kkkkkkk..'
    ],
    star: [
      '....y....', '...yyy...', 'yyyyyyyyy', '.yyyyyyy.', '..yyyyy..', '.yyy.yyy.', 'yy.....yy'
    ],
    house: [
      '.....r.....', '....rrr....', '...rrrrr...', '..rrrrrrr..', '.rrrrrrrrr.',
      '..nnnnnnn..', '..nwwnkkn..', '..nwwnkkn..', '..nnnnkkn..', 'kkkkkkkkkkk'
    ],
    moon: [
      '..yyyyy..', '.yyy.....', 'yyy......', 'yyy......', 'yyy......', '.yyy.....', '..yyyyy..'
    ],
    sword: [
      '..kwk..', '..kwk..', '..kwk..', '..kwk..', '..kwk..', '..kwk..', 'kkkykkk', '..knk..', '..knk..', '..kyk..'
    ],
    p_merchant: [
      '...kkkkkk...', '..kyyyyyyk..', '.yyyyyyyyyy.', '..kcccccck..', '..kckcckck..', '..kcccccck..', '...kkkkkk...', '..kggggggk.n', '.kggggggggkn', '.kgggyygggkn', '..kggkkggk.n', '...kk..kk...'
    ],
    p_wsmith: [
      '...kkkkkk..w', '..krrrrrrk.w', '..krrrrrrk.w', '..kcccccck.w', '..kckcckck.w', '..kcccccck.w', '...kkkkkk..w', '..kddddddyyy', '.kddddddddkn', '.kddaaaaddk.', '..kdaaaadk..', '...kk..kk...'
    ],
    p_asmith: [
      '...kkkkkk...', '..kaaaaaak..', '..kaaaaaak..', '..acccccca..', '..kckcckck..', '..kcccccck..', '...kkkkkk...', 'bbbaaaaaak..', 'bybaaaaaaak.', 'bybaaaaaaak.', 'bbbaakkaak..', '...kk..kk...'
    ],
    p_traveler: [
      '...kkkkkk...', '..knnnnnnk..', '..knnnnnnk.n', '..kcccccck.n', '..kckcckck.n', '..kcccccck.n', '...kkkkkk..n', '..kooooook.n', '.kggggggggkn', '.kggggggggkn', '..kggkkggk.n', '...kk..kk...'
    ],
    p_legend: [
      '.y.kkkkkk.y.', '..kwwyywwk..', '..kwwwwwwk..', 'y.kcccccck.y', '..kckcckck..', '..kcccccck..', '...kkkkkk...', '.yybbbbbbyy.', '.kbbbbbbbbk.', '.kbbbbbbbbk.', '..kbbyybbk..', '...kk..kk...'
    ],
    p_rival: [
      '..rkkrrkkr..', '..rrrrrrrr..', 'w.rrrrrrrr..', 'w.wwwwwwww..', 'w.kckcckck..', 'w.kcccccck..', 'w..kkkkkk...', 'w.kbbbbbbk..', 'wkbbbbbbbbk.', '.kbbbbbbbbk.', '..kbbkkbbk..', '...kk..kk...'
    ],
    p_gate: [
      'w..kkrrkk...', 'w.kaarraak..', 'n.kaaaaaak..', 'n.kcccccck..', 'n.kckcckck..', 'n.kcccccck..', 'n..kkkkkk...', 'n.kaaaaaak..', 'nkaaaaaaaak.', 'nkaaaaaaaak.', 'n.kaakkaak..', 'n..kk..kk...'
    ],
    p_king: [
      '..ykkyykky..', '..yyyyyyyy..', '..yyyyyyyy..', '..ccccccck..', '..kckcckck..', '..kwwwwwwk..', '...wwwwww...', '..krrrrrrk..', '.krrrrrrrrk.', '.krrrrrrrrk.', '..krrkkrrk..', '...kk..kk...'
    ],
    p_inn: [
      '...kkkkkk...', '..knnnnnnk..', '..aaaaaaaa..', '..kcccccck..', '..kckcckck..', '..kcnnnnck..', '...kkkkkk...', '..kwwwwwwk..', '.kwwwwwwwwk.', '.kwwwwwwwwk.', '..kwwkkwwk..', '...kk..kk...'
    ],
    p_spring: [
      '...kkwwkk...', '..kssssssk..', '..kssssssk..', '..kwwwwwwk..', '..kwkwwkwk..', 'w.kwwwwwwk.w', 'w..kkkkkk..w', 'w.kssssssk.w', 'wksssssssskw', 'wksssssssskw', '..ksskkssk..', '...kk..kk...'
    ],
    p_bard: [
      '...kkkkkrrr.', '..kyyyyyykr.', '..kyyyyyyk..', '..kcccccck..', '..kckcckck..', 'n.kcccccck..', 'n..kkkkkk...', 'n.kppppppk..', 'nnnnppppppk.', 'nkknppppppk.', 'nnnnpkkppk..', 'nnnnk..kk...'
    ],
    p_changer: [
      '...kkkkkk...', '..kkkkkkkk..', '..kkkkkkkk..', '..kcccccck..', '..wwkkckww..', '..kcccccck..', '...kkkkkk...', '..kyyyyyyyyy', '.kyyyyyyyyoy', '.kyyyyyyyyoy', '..kyykkyyyyy', '...kk..kk...'
    ],
    p_monk: [
      '...kkkkkk...', '..ccccccck..', '..ccccccck..', '..kcccccck..', '..kckcckck..', '..kcccccck..', '...nnnnnn...', '..kooooook..', '.kooooooook.', '.kooooooook.', '..kookkook..', '...kk..kk...'
    ],
    p_child: [
      '............', '............', '...kkkkkk...', '..kyyyyyyk..', '..kyyyyyyk..', '..kcccccck..', '..kckcckck..', '..kcccccck..', '...kkkkkk...', '..kppppppk..', '..kppkkppk..', '...kk..kk...'
    ],
    p_dog: [
      'kk........kk', 'knk......knk', 'knnkkkkkknnk', 'knnnnnnnnnnk', 'knnknnnnknnk', 'knnnnnnnnnnk', '.knnnkknnnk.', '.knnnppnnnk.', '..knnppnnk..', '...kkkkkk...'
    ],
    p_slime: [
      '....kkkk....', '..kkggggkk..', '.kggggggggk.', '.kgwwggwwgk.', 'kggwkggwkggk', 'kggggggggggk', 'kgggkkkkgggk', 'kggggggggggk', '.kkkkkkkkkk.'
    ],
    p_bat: [
      'k....kk....k', 'kk..kddk..kk', 'kdkkddddkkdk', 'kddddddddddk', '.kkddrrddkk.', '..kddddddk..', '...kkwwkk...', '....kkkk....'
    ],
    p_orc: [
      '..kkkkkkkk..', '.kggggggggk.', 'kggggggggggk', 'kgrrggggrrgk', 'kggggggggggk', 'kgkkkkkkkkgk', 'kgwkwwwwkwgk', '.kkggggggkk.', '..kkkkkkkk..'
    ],
    p_skel: [
      '..aaaaaaaa..', '.aaaaaaaaaa.', 'kwwwwwwwwwwk', 'kwkkwwwwkkwk', 'kwkkwwwwkkwk', 'kwwwwkkwwwwk', '.kwwwwwwwwk.', '..kwkwwkwk..', '...kkkkkk...'
    ],
    p_wyvern: [
      'kk.k....k.kk', 'kgkgk..kgkgk', 'kggkggggkggk', 'kgggrggrgggk', 'kggggggggggk', '.kkggggggkk.', '..kgwwwwgk..', '...kkkkkk...'
    ],
    p_general: [
      'r..r.oo.r..r', 'rr.roooor.rr', '.kkkkkkkkkk.', 'kddddddddddk', 'kdrrrrrrrrdk', 'kddddddddddk', 'kdkdkddkdkdk', 'kdkdkddkdkdk', '.kkddddddkk.', '..kkkkkkkk..'
    ],
    ingot: [
      '..kkkkkkkk..', '.kyyyyyyyyk.', 'kyyyyyyyyyyk', 'kooooooooook', 'kkkkkkkkkkkk'
    ]
  };

  /* ---- キャラクターのアイコン(12×12)。人物は共通の型に、髪(帽子)と服の色と、一部の行を差し替えて作る ---- */
  function person(hair, cloth, over) {
    const t = ['....kkkk....', '...kXXXXk...', '..kXXXXXXk..', '..khhhhhhk..', '..khkhhkhk..', '..khhhhhhk..',
      '..khhrrhhk..', '...khhhhk...', '..kkYYYYkk..', '.kYYYYYYYYk.', '.kYYYYYYYYk.', '.kkkkkkkkkk.'];
    const rows = t.map(function (x) { return x.replace(/X/g, hair).replace(/Y/g, cloth); });
    for (const k in over) rows[Number(k)] = over[k];
    return rows;
  }
  Object.assign(ART, {
    p_wsmith: person('r', 'n', { 8: '..kknwwnkk..', 9: '.knnnwwnnnk.', 10: '.knnnaannnk.' }),
    p_asmith: person('a', 'b', { 9: '.kabbbbbbak.', 10: '.kabbddbbak.' }),
    p_traveler: person('g', 'n', { 3: '..kghhhhgk..', 4: '..kgkhhkgk..', 5: '..kghhhhgk..', 6: '..kghrrhgk..' }),
    p_legend: person('y', 'y', { 0: '.y..yyyy..y.', 5: '..khhkhhhk..', 9: '.kyyyryyyyk.' }),
    p_rival: person('r', 'b', { 0: '..k.kkkk.k..', 1: '..krrrrrrk..', 2: '.krrrrrrrrk.', 3: '..kkkhhkkk..', 10: '.kbbyyyybbk.' }),
    p_gate: person('a', 'd', { 3: '..kahhhhak..', 4: '..kakhhkak..', 5: '..kahhhhak..', 6: '..kahhhhak..', 10: '.kdddyydddk.' }),
    p_merchant: person('o', 'g', { 9: '.kggnnnnggk.', 10: '.kggnnnnggk.' }),
    p_monk: person('h', 'o', { 1: '...khhhhk...', 2: '..khhhhhhk..', 9: '.kooonnoook.' }),
    p_child: person('y', 's', { 5: '..kphhhhpk..' }),
    p_king: person('w', 'r', { 0: '..y..yy..y..', 1: '..kyyyyyyk..', 2: '..kwwwwwwk..', 7: '..kwwwwwwk..' }),
    p_inn: person('c', 'n', { 9: '.knnwwwwnnk.', 10: '.knnwwwwnnk.' }),
    p_bard: person('p', 'g', { 0: '....kkkk..p.', 9: '.kgggnnnggk.', 10: '.kgggnnnggk.' }),
    p_changer: person('d', 'y', { 0: '...kkkkkk...', 1: '...kddddk...', 2: '..kddddddk..', 4: '..khkhkyhk..', 9: '.kyyyooyyyk.' }),
    p_spring: person('b', 's', { 0: '....kkkk..w.', 3: '..kbhhhhbk..', 4: '..kbkhhkbk..', 5: '..kbhhhhbk..', 6: '..kbhrrhbk..', 7: '..kbbhhbbk..' }),
    p_dog: [
      '............', '.kk......kk.', '.knk....knk.', '.knnkkkknnk.', '..knnnnnnk..', '..knknnknk..',
      '..knnnnnnk..', '..knwwwwnk..', '..knwkkwnk..', '...knwwnk...', '....kkkk....', '............'
    ],
    p_slime: [
      '............', '............', '....kkkk....', '...kllllk...', '..kwllllllk.', '.kllkllkllk.',
      '.kllllllllk.', '.kllkkkkllk.', '.kllllllllk.', '..kkllllkk..', '...kkkkkk...', '............'
    ],
    p_bat: [
      '............', '.k........k.', '.kk......kk.', '.kdk.kk.kdk.', '.kddkddkddk.', 'kddddddddddk',
      'kdrdddddrddk', '.kddddddddk.', '..kdkddkdk..', '...k.kk.k...', '............', '............'
    ],
    p_orc: [
      '....kkkk....', '...kggggk...', '..kggggggk..', '..kgrggrgk..', '..kggggggk..', '..kgkkkkgk..',
      '..kgwkkwgk..', '...kgggggk..', '..kkddddkk..', '.kddddddddk.', '.kddyddyddk.', '.kkkkkkkkkk.'
    ],
    p_skel: [
      '...kkkkkk...', '..kwwwwwwk..', '.kwwwwwwwwk.', '.kwkkwwkkwk.', '.kwkkwwkkwk.', '.kwwwkkwwwk.',
      '..kwwwwwwk..', '..kwkwkwkwk.', '...kkkkkk...', '..kwwkkwwk..', '..kwkwwkwk..', '...kkkkkk...'
    ],
    p_wyvern: [
      '.k........k.', '.kk.kkkk.kk.', '..kkvvvvkk..', '..kvvvvvvk..', '..kvyvvyvk..', '..kvvvvvvk..',
      '.kvvvvvvvvk.', '.kvvkvvkvvk.', '.kvvvvvvvvk.', '..kvwvvwvk..', '...kkvvkk...', '....kkkk....'
    ],
    p_general: [
      '..r..rr..r..', '..rr.rr.rr..', '...krrrrk...', '..kddddddk..', '..kdyddydk..', '..kddkkddk..',
      '..kdkkkkdk..', '...kddddk...', '..kkrrrrkk..', '.krrrrrrrrk.', '.krryrryrrk.', '.kkkkkkkkkk.'
    ],
    p_demon: [
      'kk........kk', 'krk......krk', 'krrkkkkkkrrk', '.kddddddddk.', '.kdrrddrrdk.', '.kddddddddk.',
      '.kdkkkkkkdk.', '.kdkwkwkwdk.', '..kddddddk..', '.kvvvvvvvvk.', '.kvvvyyvvvk.', '.kkkkkkkkkk.'
    ]
  });

  /* kind: fail=理由を表示 / quit=自分で去った / hidden=隠し / clear=突破 */
  const ENDS = {
    '000': { name: tx('判断が遅い。'), text: tx('ここに来た時点で覚悟は出来ていたんじゃないですか?\n時間は待ってくれませんよ。'), reason: tx('3秒以内に決められなかった。'), img: 'clock', kind: 'fail' },
    '001': { name: tx('壺は弁償です'), text: tx('壺は思ったより割れやすかった。\n商人は思ったより怒っていた。'), reason: tx('度胸が足りなかった。'), img: 'jar', kind: 'fail' },
    '002': { name: tx('犬に負けた'), text: tx('骨を奪おうとして、逆に追いかけ回された。\n犬はとても楽しそうだった。'), reason: tx('度胸が足りなかった。'), img: 'bone', kind: 'fail' },
    '003': { name: tx('にらめっこに負けた'), text: tx('犬と見つめ合っているうちに、日が暮れた。\n犬はまだ見つめている。'), reason: tx('3秒以内に決められなかった。'), img: 'bone', kind: 'fail' },
    '004': { name: tx('子どもにも借金'), text: tx('子どもから借りたお金を、返す当てがない。\n子どもは取り立てが上手い。'), reason: tx('その場しのぎが足りなかった。'), img: 'coin', kind: 'fail' },
    '005': { name: tx('子どもは待ってくれない'), text: tx('「もういい」と言って、子どもは走り去った。\n財布だけが、なぜか軽くなっていた。'), reason: tx('3秒以内に決められなかった。'), img: 'coin', kind: 'fail' },
    '006': { name: tx('幽閉された'), text: tx('王に馴れ馴れしく話しかけた。\n冷たい石の部屋で、言葉遣いを反省している。'), reason: tx('その場しのぎが足りなかった。'), img: 'crown', kind: 'fail' },
    '007': { name: tx('満室だった'), text: tx('迷っているうちに、最後の一部屋が埋まった。\n今夜は星空の下で過ごす。'), reason: tx('3秒以内に決められなかった。'), img: 'bed', kind: 'fail' },
    '008': { name: tx('嘘つきは池の底'), text: tx('「それは嘘ですね」\n精霊は静かに微笑んで、池の底へ案内してくれた。'), reason: tx('愛嬌が足りなかった。'), img: 'axe', kind: 'fail' },
    '009': { name: tx('ミミックだった'), text: tx('宝箱は大きな口を開けた。\n中身は、こちらだった。'), reason: tx('慎重さが足りなかった。'), img: 'chest', kind: 'fail' },
    '010': { name: tx('総合力が足りなかった'), text: tx('力で押し通ろうとしたが、まだ総合的に力不足だった。'), reason: tx('総合的な力が足りなかった。'), img: 'gate', kind: 'fail' },
    '011': { name: tx('関所で追い返された'), text: tx('門番は、首を縦に振ってくれなかった。\nどうやら、何かが足りなかったらしい。'), reason: tx('ステータスが足りなかった。'), img: 'gate', kind: 'fail' },
    '012': { name: tx('私は前科者だった'), text: tx('経歴を語ったとたん、門番の目つきが変わった。\nどうやら自分には、過去に何かあったらしい。'), reason: tx('何をしても通れない身だった。'), img: 'gate', kind: 'fail' },
    '013': { name: tx('全てが足りなかった'), text: tx('度胸も、慎重さも、愛嬌も、その場しのぎも、\n何ひとつ残っていなかった。'), reason: tx('全てのステータスが0以下だった。'), img: 'empty', kind: 'fail' },
    '014': { name: tx('門番の前で固まった'), text: tx('何も言えないまま、後ろの行列に押し出された。'), reason: tx('3秒以内に決められなかった。'), img: 'clock', kind: 'fail' },
    '015': { name: tx('現行犯逮捕'), text: tx('盗もうとした手を、がっちり掴まれた。\n商人は、慣れた手つきで人を呼んだ。'), reason: tx('度胸が足りなかった。'), img: 'gate', kind: 'fail' },
    '016': { name: tx('見る目がなかった'), text: tx('見定めたつもりが、一番の偽物を掴まされた。\n商人は、とても良い笑顔だった。'), reason: tx('慎重さが足りなかった。'), img: 'jar', kind: 'fail' },
    '017': { name: tx('店を追い出された'), text: tx('ねだり続けて、店の外まで運ばれた。\n商人は、塩をまいた。'), reason: tx('愛嬌が足りなかった。'), img: 'door', kind: 'fail' },
    '018': { name: tx('ツケは溜まる一方'), text: tx('「後で払う」と言い続けて、ツケの額が膨らんだ。\n商人は、帳簿を見せてくれた。'), reason: tx('その場しのぎが足りなかった。'), img: 'coin', kind: 'fail' },
    '019': { name: tx('通報された'), text: tx('旅人を連れ去ろうとしたところを、通りがかりに見られていた。\n気づいたときには、兵士に囲まれていた。'), reason: tx('総合的な力が足りなかった。'), img: 'gate', kind: 'fail' },
    '020': { name: tx('怖気づいてしまった。敗北者じゃけぇ。'), text: tx('ライバルに背を向けて、走り出した。\n笑い声だけが、いつまでも追いかけてきた。'), reason: tx('逃げることを選んだ。'), img: 'flag', kind: 'fail' },
    '021': { name: tx('俺には運がない'), text: tx('あいこが続いた末に、最後は負けた。\nライバルは、腹を抱えて笑っている。'), reason: tx('運が悪かった。'), img: 'coin', kind: 'fail' },
    '022': { name: tx('ライバルの前で固まった'), text: tx('何も言えないうちに、ライバルは先に行ってしまった。'), reason: tx('3秒以内に決められなかった。'), img: 'clock', kind: 'fail' },
    '023': { name: tx('ライバルに完敗した'), text: tx('斬りかかったが、ライバルは一歩も動かなかった。\n気がつくと、地面に転がっていた。'), reason: tx('装備が心もとなく、仲間もいなかった。'), img: 'sword', kind: 'fail' },
    '024': { name: tx('ライバルの手下になった'), text: tx('「仲間になろう」と誘ったが、「なら、俺の子分だ」と返された。\n断る間もなく、荷物持ちが決まった。'), reason: tx('装備が貧弱だった。'), img: 'flag', kind: 'fail' },
    '025': { name: tx('モンスターに敗れた。'), text: tx('モンスターの強さに、為す術がなかった。\n意識は、そこで途切れた。'), reason: tx('戦う力が足りなかった。'), img: 'axe', kind: 'fail' },
    '026': { name: tx('受け止めきれなかった'), text: tx('身構えて、攻撃を受けた。\n想像より、ずっと重かった。'), reason: tx('守りが及ばなかった。'), img: 'gate', kind: 'fail' },
    '027': { name: tx('迷っている間に襲われた'), text: tx('迷っているうちに、魔物の爪が届いていた。'), reason: tx('3秒以内に決められなかった。'), img: 'clock', kind: 'fail' },
    '028': { name: tx('夢の中へ'), text: tx('目を閉じると、いつもの布団の中だった。\n全部、夢だったのかもしれない。'), img: 'moon', kind: 'quit' },
    '029': { name: tx('魔王には届かなかった'), text: tx('渾身の一撃は、魔王の指一本で止められた。'), reason: tx('魔王に通用する力がなかった。'), img: 'horn', kind: 'fail' },
    '030': { name: tx('仲間はいなかった'), text: tx('「行け、仲間たちよ!」と叫んだが、後ろには誰もいなかった。\n魔王は、少し気の毒そうな顔をした。'), reason: tx('戦わせる仲間がいなかった。'), img: 'horn', kind: 'fail' },
    '031': { name: tx('世間話は通じなかった'), text: tx('「最近、いい天気ですね」\n魔王は、無表情で玉座の肘掛けを叩いた。'), reason: tx('その場しのぎと愛嬌が足りなかった。'), img: 'horn', kind: 'fail' },
    '032': { name: tx('歌は届かなかった'), text: tx('渾身の歌は、魔王城のコウモリにだけウケた。'), reason: tx('度胸と慎重さが足りなかった。'), img: 'horn', kind: 'fail' },
    '033': { name: tx('土下座は通じなかった'), text: tx('額を床に擦りつけたが、魔王は「それほどでもない」と言った。'), reason: tx('土下座が通じる条件を、満たせなかった。'), img: 'horn', kind: 'fail' },
    '034': { name: tx('助けは来なかった'), text: tx('「誰か、助けてくれ!」\n声は、広い魔王城に虚しく響いた。'), reason: tx('助けを呼べる相手がいなかった。'), img: 'horn', kind: 'fail' },
    '035': { name: tx('魔王を前に固まった'), text: tx('魔王を前に、何も言えず、動けなかった。\n魔王は、そっと玉座に座り直した。'), reason: tx('3秒以内に決められなかった。'), img: 'clock', kind: 'fail' },
    '036': { name: tx('田舎で余生を'), text: tx('魔王に背を向けて、故郷の村へ帰った。\n畑を耕しながら、世界の行く末をぼんやり眺めている。'), img: 'house', kind: 'quit', epilogue: tx('勇者は、故郷の村へ帰った。\n世界の行方は、誰かに任せることにした。') },
    '037': { name: tx('魔王の下僕'), text: tx('土下座を気に入られ、魔王城で働くことになった。\n意外と、居心地は悪くない。'), img: 'horn', kind: 'hidden', epilogue: tx('魔王の下僕は、今日も玉座の間を磨いている。\n世界に、静かな闇が訪れた。') },
    '038': { name: tx('装備が魔王を貫いた'), text: tx('鍛えられた装備が、奥義を支えた。\n魔王は、光の中に消えていった。'), img: 'sword', kind: 'clear', epilogue: tx('魔王は倒れた。\n世界に、平和が訪れた。') },
    '039': { name: tx('己の力で魔王を倒した'), text: tx('積み重ねた力が、奥義となって魔王を貫いた。'), img: 'star', kind: 'clear', epilogue: tx('魔王は倒れた。\n世界に、平和が訪れた。') },
    '040': { name: tx('仲間と共に魔王を倒した'), text: tx('仲間と心を合わせた奥義が、魔王を打ち倒した。'), img: 'star', kind: 'clear', epilogue: tx('魔王は倒れた。\n世界に、平和が訪れた。') },
    '041': { name: tx('俺は最強かもしれない'), text: tx('装備も、力も、仲間も、揃いかけていた。\n奥義は、魔王を一撃で沈めた。\n…もしかして、自分は最強かもしれない。'), img: 'star', kind: 'clear', epilogue: tx('魔王は倒れた。\n世界に、平和が訪れた。') },
    '042': { name: tx('俺は最強だった'), text: tx('全てが揃っていた。\n奥義が放たれる前に、魔王は降参していた。\n自分は、最強だった。'), img: 'crown', kind: 'clear', epilogue: tx('魔王は降参した。\n世界に、平和が訪れた。') },
    '043': { name: tx('最強の旅人'), text: tx('助けを呼ぶと、あの時の旅人が現れた。\n魔王は、旅人の一撃で仕留められた。\n80銀貨は、さすがに払えなかったが。'), img: 'sword', kind: 'clear', epilogue: tx('魔王は倒れた。\n世界に、平和が訪れた。') },
    '999': { name: tx('お疲れ様でした。'), text: tx('お気をつけてお帰り下さい。'), img: 'door', kind: 'quit' }
  };

  /* エンドの種別(効果音と、結果画面の演出を決める)
     mid=途中エンド / defeat=モンスター・魔王敗北 / minion=魔王の手下 / victory=魔王討伐 /
     supreme=最強 / legend=伝説の旅人の助け / retire=逃げて余生
     結果画面を豪華にするのは、LUXURY に入っている種別だけ */
  const LUXURY = { minion: 1, victory: 1, supreme: 1, legend: 1, retire: 1 };
  function sfxKindOf(code) {
    if (code === '037') return 'minion';
    if (code === '036') return 'retire';
    if (code === '043') return 'legend';
    if (code === '042') return 'supreme';
    if (code === '038' || code === '039' || code === '040' || code === '041') return 'victory';
    const n = Number(code);
    if (code !== '999' && n >= 25 && n <= 35 && n !== 28) return 'defeat';
    return 'mid';
  }
  Object.keys(ENDS).forEach(function (k) {
    ENDS[k].sfx = sfxKindOf(k);
    ENDS[k].luxury = !!LUXURY[ENDS[k].sfx];
  });

  /* 図鑑の区切り(エンド番号の範囲) */
  const PHASES = [
    { from: '000', to: '009', extra: ['999'], name: tx('はじまりの村') },
    { from: '010', to: '014', name: tx('関所') },
    { from: '015', to: '019', name: tx('街') },
    { from: '020', to: '024', name: tx('ライバル') },
    { from: '025', to: '028', name: tx('モンスター') },
    { from: '029', to: '043', name: tx('魔王') }
  ];

  /* 図鑑の、未収集エンドのヒント(どこで、どんな状況か) */
  const HINTS = {
    '000': tx('最初の「始めますか。」で、何も選べなかった。'),
    '999': tx('最初の「始めますか。」で、もう一方を選んだ。'),
    '001': tx('行商人。度胸が足りないまま、壺に乱暴をすると。'),
    '002': tx('犬。度胸が足りないまま、骨を狙うと。'),
    '003': tx('犬。見つめ合っているうちに、時間が過ぎると。'),
    '004': tx('子ども。その場しのぎが足りないまま、お金を借りようとすると。'),
    '005': tx('子ども。迷っているうちに、時間が過ぎると。'),
    '006': tx('王様。その場しのぎが足りないまま、馴れ馴れしくすると。'),
    '007': tx('宿の主人。迷っているうちに、時間が過ぎると。'),
    '008': tx('泉の精霊。愛嬌が足りないまま、調子のいい答えをすると。'),
    '009': tx('宝箱。慎重さが足りないまま、手を出すと。'),
    '010': tx('関所。力押しを選んだが、ステータスの合計が足りなかった。'),
    '011': tx('関所。ステータスが足りないまま、その選択肢を選ぶと。'),
    '012': tx('関所。自分の過去を語ると。'),
    '013': tx('関所。全てのステータスが0以下のまま、辿り着くと。'),
    '014': tx('関所。門番の前で、時間が過ぎると。'),
    '015': tx('商人。度胸が大きく足りないまま、盗もうとすると。'),
    '016': tx('商人。慎重さが大きく足りないまま、見定めようとすると。'),
    '017': tx('商人。愛嬌が大きく足りないまま、ねだると。'),
    '018': tx('商人。その場しのぎが大きく足りないまま、後で払うと言うと。'),
    '019': tx('旅人。ステータスの合計が足りないまま、連れ去ろうとすると。'),
    '020': tx('ライバル。ライバルを前に、逃げ出すと。'),
    '021': tx('ライバル。運に任せた勝負をして、負けると。'),
    '022': tx('ライバル。ライバルの前で、時間が過ぎると。'),
    '023': tx('ライバル。装備が頼りないまま、仲間もなく挑むと。'),
    '024': tx('ライバル。貧弱な装備で、仲間に誘うと。'),
    '025': tx('魔物。力が足りないまま、突破しようとすると。'),
    '026': tx('強級の魔物。守りに入ると。'),
    '027': tx('中級以上の魔物。魔物の前で、時間が過ぎると。'),
    '028': tx('魔物。現実から目を背けると。'),
    '029': tx('魔王。力が足りないまま戦う、または、条件が整わないまま奥義を使うと。'),
    '030': tx('魔王。いないはずの仲間に、戦わせようとすると。'),
    '031': tx('魔王。その場しのぎと愛嬌が足りないまま、世間話をすると。'),
    '032': tx('魔王。度胸と慎重さが足りないまま、歌うと。'),
    '033': tx('魔王(2回目)。条件が合わないまま、土下座すると。'),
    '034': tx('魔王(2回目)。助けを呼んだが、誰も来なかった。'),
    '035': tx('魔王。魔王の前で、時間が過ぎると。'),
    '036': tx('魔王(2回目)。戦わずに、逃げ出すと。'),
    '037': tx('魔王(2回目)。何もかも失った状態で、土下座すると。'),
    '038': tx('魔王(2回目)。装備だけが決め手となった状態で、奥義を使うと。'),
    '039': tx('魔王(2回目)。ステータスだけが決め手となった状態で、奥義を使うと。'),
    '040': tx('魔王(2回目)。仲間だけが決め手となった状態で、奥義を使うと。'),
    '041': tx('魔王(2回目)。装備・ステータス・仲間のうち、2つが揃った状態で、奥義を使うと。'),
    '042': tx('魔王(2回目)。装備・ステータス・仲間の3つが揃った状態で、奥義を使うと。'),
    '043': tx('魔王(2回目)。旅の途中で、ある人物と出会った後に、助けを呼ぶと。')
  };
  Object.keys(HINTS).forEach(function (k) { ENDS[k].hint = HINTS[k]; });

  /* ランダムBのカード。w=出やすさ(大きいほど出やすい)。
     choice: fx=ステータス変動 / gold=所持金の増減 / msg=結果文 / end=即エンド / alt=条件を満たすと結果が置き換わる
     timeout: end=時間切れで即エンド / branch=時間切れで別展開(沈黙として数える) */
  const CARDS = [
    {
      id: 'merchant', icon: 'p_merchant', who: tx('行商人'), w: 3, q: tx('「この壺、銀貨三枚でどうだい?」'),
      choices: [
        { label: tx('言い値で買う'), fx: { charm: 1, caution: -1 }, gold: -3, msg: tx('壺を手に入れた。やけに重い。') },
        { label: tx('値切る'), fx: { courage: 1 }, gold: -1, msg: tx('大幅に値引きされた。商人の目が笑っていない。') },
        { label: tx('中を見せてもらう'), fx: { caution: 1 }, gold: 1, msg: tx('底に札が貼ってあった。見なかったことにした。\n壺の中に、銀貨が一枚入っていた。') },
        { label: tx('壺で殴る'), end: '001', alt: { stat: 'courage', min: 2, fx: { courage: 3 }, msg: tx('壺が砕け散り、まばゆい光とともに魔神が現れた。\n「久しく見ぬ豪胆さよ」\n魔神は、力の一端を授けてくれた。') } }
      ],
      timeout: { type: 'branch', msg: tx('「黙っていても、何もわからないぞ」\n商人は壺を抱えて去っていった。'), fx: { charm: -1 } }
    },
    {
      id: 'dog', icon: 'p_dog', who: tx('犬'), w: 3, q: tx('骨をくわえた犬が、\nじっとこちらを見ている。'),
      choices: [
        { label: tx('撫でる'), fx: { charm: 1 }, msg: tx('犬が尻尾を振った。') },
        { label: tx('骨を奪う'), end: '002', alt: { stat: 'courage', min: 2, fx: { courage: 2 }, gold: 2, msg: tx('犬はこちらの目を見て、骨を譲った。\n骨の下に、銀貨が埋まっていた。') } },
        { label: tx('無視する'), fx: {}, gold: 2, msg: tx('犬は、ずっとこちらを見ていた。\n立ち去ると、足元に銀貨が落ちていた。') },
        { label: tx('一緒に吠える'), fx: { charm: -1, caution: -1 }, gold: 2, msg: tx('近所から苦情が来た。\n通行人が、なぜか銀貨を投げてくれた。') }
      ],
      timeout: { type: 'end', end: '003' }
    },
    {
      id: 'monk', icon: 'p_monk', who: tx('旅の僧'), w: 2, q: tx('「迷っておるな。\n道を一つ示そう」'),
      choices: [
        { label: tx('右の道'), fx: { courage: 1 }, msg: tx('右の道には猪がいた。なんとか通り抜けた。') },
        { label: tx('左の道'), fx: { caution: 1 }, gold: 2, msg: tx('左の道は遠回りだったが、静かだった。\n道端に、銀貨が落ちていた。') },
        { label: tx('真ん中の道'), fx: { improv: 3 }, msg: tx('道は、なかった。\nかき分けて進むうちに、不意に視界が開けた。\n悟りを開き、その場しのぎの極意に至った。') },
        { label: tx('どれも怪しい'), fx: { caution: 1, charm: -1 }, msg: tx('僧は静かに笑った。「疑うことも修行だ」') }
      ],
      timeout: { type: 'branch', msg: tx('「黙っていても、何もわからないぞ」\n僧は目を閉じた。「……だが、沈黙もまた答えだ」'), fx: { caution: 2 } }
    },
    {
      id: 'child', icon: 'p_child', who: tx('子ども'), w: 3, q: tx('「おじさん、お金貸して」'),
      choices: [
        { label: tx('貸す'), fx: { charm: 1, caution: -1 }, gold: -2, msg: tx('銀貨は戻らなかった。でも、感謝された。') },
        { label: tx('断る'), fx: { caution: 1 }, msg: tx('子どもは舌を出して去った。') },
        { label: tx('おじさんじゃない'), fx: { courage: 1 }, msg: tx('「じゃあ、お兄さん、貸して」と言われた。') },
        { label: tx('逆に借りる'), end: '004', alt: { stat: 'improv', min: 2, fx: { improv: 2, courage: 1 }, gold: 5, msg: tx('子どもが貸してくれた。出世払いを約束した。') } }
      ],
      timeout: { type: 'end', end: '005' }
    },
    {
      id: 'king', icon: 'p_king', who: tx('王様'), w: 1, q: tx('「ほう、余に何か申すことはあるか?」'),
      choices: [
        { label: tx('馴れ馴れしく話す'), end: '006', alt: { stat: 'improv', min: 2, fx: { improv: 2, charm: 1 }, gold: 5, msg: tx('王は大笑いした。「面白い奴だ」\n褒美の銀貨まで賜った。') } },
        { label: tx('ひざまずく'), fx: { caution: 1 }, msg: tx('王は満足げにうなずいた。') },
        { label: tx('黙って頭を下げる'), fx: { caution: 1, charm: -1 }, msg: tx('王はつまらなそうだった。') },
        { label: tx('褒美を要求する'), fx: { courage: 2, charm: -1 }, gold: 8, msg: tx('王の眉が動いた。命拾いして、褒美の袋まで賜った。') }
      ],
      timeout: { type: 'branch', msg: tx('「黙っていても、何もわからないぞ」\n王はあくびをした。なぜか度胸があると思われた。'), fx: { courage: 1 } }
    },
    {
      id: 'inn', icon: 'p_inn', who: tx('宿の主人'), w: 3, q: tx('「今夜は泊まっていくかい?」'),
      choices: [
        { label: tx('ここで寝る'), fx: { courage: -1, improv: -3 }, gold: -2, msg: tx('深い眠りの底で、何かが零れ落ちていった。\n起きたら、その場しのぎの術まで忘れていた。') },
        { label: tx('通り過ぎる'), fx: { courage: 1 }, gold: 1, msg: tx('夜道は思ったより暗かった。\n暗がりで、銀貨を拾った。') },
        { label: tx('値切って泊まる'), fx: { improv: 1, caution: -1 }, gold: -1, msg: tx('半額になった。主人の笑顔が引きつっていた。') },
        { label: tx('働かせてくれ'), fx: { improv: 1, charm: 1 }, gold: 3, msg: tx('皿洗いを任された。意外と向いていた。') }
      ],
      timeout: { type: 'end', end: '007' }
    },
    {
      id: 'spring', icon: 'p_spring', who: tx('泉の精霊'), w: 3, q: tx('「あなたが落としたのは、\n金の斧ですか?」'),
      choices: [
        { label: tx('はい、金の斧です'), end: '008', alt: { stat: 'charm', min: 2, fx: { charm: 2 }, gold: 10, msg: tx('精霊は笑って、金の斧をくれた。\n売ったら、そこそこの値がついた。') } },
        { label: tx('いいえ、普通の斧です'), fx: { caution: 1 }, gold: 2, msg: tx('正直者だと褒められた。\n銀の斧は、おまけでもらった。') },
        { label: tx('斧は落としていない'), fx: {}, gold: 2, msg: tx('精霊は少し考え込んで、泉に帰っていった。\n泉の縁に、銀貨が光っていた。') },
        { label: tx('泉の水を飲む'), fx: { courage: 5, improv: -5 }, msg: tx('飲んだ瞬間、怖いものがなくなった。\n同時に、口がうまく回らなくなった。') }
      ],
      timeout: { type: 'branch', msg: tx('「……あなたは、何も落としていないのですね」\n精霊は、静かに消えた。'), fx: { caution: 1 } }
    },
    {
      id: 'chest', icon: 'chest', who: tx('宝箱'), w: 2, q: tx('ぽつんと、宝箱が置いてある。'),
      choices: [
        { label: tx('開ける'), end: '009', alt: { stat: 'caution', min: 2, fx: { caution: 2 }, gold: 8, msg: tx('罠を見抜いて、中身だけ頂いた。') } },
        { label: tx('蹴ってみる'), fx: { courage: 1 }, msg: tx('宝箱が、ちょっと動いた。\n見なかったことにした。') },
        { label: tx('そっと立ち去る'), fx: {}, gold: 3, msg: tx('宝箱は、ずっとそこにあった。\n立ち去る途中、近くの銀貨を拾った。') },
        { label: tx('話しかける'), fx: { charm: 1, improv: 1 }, msg: tx('返事はなかったが、なぜか通じ合えた気がする。') }
      ],
      timeout: { type: 'branch', msg: tx('「黙っていても、何もわからないぞ」\n宝箱が、そう言った気がした。'), fx: { improv: 1 } }
    },
    {
      id: 'bard', icon: 'p_bard', who: tx('吟遊詩人'), w: 3, q: tx('「一曲、歌ってくれないか?\n礼は弾むぞ」'),
      choices: [
        { label: tx('全力で歌う'), fx: { charm: -3 }, gold: 4, msg: tx('渾身の歌声が、天に突き抜けた。鳥が落ち、雲が割れた。\n愛嬌と引き換えに、投げ銭は、なぜか多かった。') },
        { label: tx('替え歌にする'), fx: { improv: 2 }, msg: tx('即興の替え歌が、意外とウケた。') },
        { label: tx('断る'), fx: {}, gold: 2, msg: tx('詩人は肩をすくめた。\n代わりに、道端で銀貨を拾った。') },
        { label: tx('伴奏を頼む'), fx: { charm: 1 }, gold: -2, msg: tx('良い伴奏だった。\n伴奏代は、ちゃんと取られた。') }
      ],
      timeout: { type: 'branch', msg: tx('「黙っていても、何もわからないぞ」\n詩人は、勝手に歌い始めた。'), fx: { charm: 1 } }
    },
    {
      id: 'changer', icon: 'p_changer', who: tx('両替商'), w: 3, q: tx('「銀貨を、金貨に替えてやろうか?」'),
      choices: [
        { label: tx('全額替える'), fx: { caution: -1 }, gold: 10, msg: tx('金貨に替えてもらったはずが、銀貨が増えていた。\n何かがおかしい。') },
        { label: tx('半分だけ替える'), fx: { caution: 1 }, gold: 3, msg: tx('慎重に半分だけ替えた。\n手数料を取られたのに、少し得をした。') },
        { label: tx('疑う'), fx: { caution: 1, charm: -1 }, msg: tx('両替商は気を悪くした。') },
        { label: tx('逆に両替してもらう'), fx: { improv: 1 }, gold: -5, msg: tx('「うちは両替専門です」と言いながら、結局替えてくれた。\n手数料は高かった。') }
      ],
      timeout: { type: 'branch', msg: tx('待っているうちに、銀貨が一枚消えた。'), fx: {}, gold: -1 }
    }
  ];

  /* ---- 装備と仲間 ---- */
  const RANK = { 3: tx('上'), 2: tx('中'), 1: tx('下') };
  /* price=買う値段(銀貨) / req=盗む・見定める・ねだる・後で払う で必要なステータス */
  const ITEMS = {
    w3: { key: 'w3', slot: 'weapon', rank: 3, name: tx('銀の剣'), price: 8, req: 4 },
    w2: { key: 'w2', slot: 'weapon', rank: 2, name: tx('鉄の剣'), price: 5, req: 3 },
    w1: { key: 'w1', slot: 'weapon', rank: 1, name: tx('木の棒'), price: 3, req: 2 },
    a3: { key: 'a3', slot: 'armor', rank: 3, name: tx('鋼の鎧'), price: 7, req: 4 },
    a2: { key: 'a2', slot: 'armor', rank: 2, name: tx('鎖かたびら'), price: 3, req: 3 },
    a1: { key: 'a1', slot: 'armor', rank: 1, name: tx('革の服'), price: 2, req: 2 }
  };
  const RANK_SHOP = { 3: '高級', 2: '中級', 1: '低級' };   /*nw*/
  const SLOT_LABEL = { weapon: tx('武器'), armor: tx('防具') };
  function equipLabel(it) { return tx('{n}({r})', { n: it.name, r: RANK[it.rank] }); }

  /* 手に入れる方法ごとの文言と失敗エンド(必要ステータスが3以上不足していると、エンド) */
  const WAYS = {
    steal:    { label: tx('盗む'),     stat: 'courage', end: '015',
      ok: tx('店主の目を盗んで、{n}を懐へ入れた。'), ng: tx('見つかりかけて、慌てて手を引いた。\n度胸が揺らいだ。') },
    appraise: { label: tx('見定める'), stat: 'caution', end: '016',
      ok: tx('品定めの目が光った。\n難癖をつけて、{n}をただ同然で手に入れた。'), ng: tx('見定めたつもりが、判断を誤った。\n慎重さに自信がなくなった。') },
    beg:      { label: tx('ねだる'),   stat: 'charm',   end: '017',
      ok: tx('ねだりにねだると、店主は根負けして{n}をくれた。'), ng: tx('店主は、深いため息をついた。\n愛嬌に自信がなくなった。') },
    later:    { label: tx('後で払う'), stat: 'improv',  end: '018',
      ok: tx('「後で必ず払う」と言い張って、{n}を持ち出した。\n店主は、なぜか信じてくれた。'), ng: tx('「後でって、いつだい?」\nうまい言い訳が出てこなかった。') }
  };

  const ALLIES = {
    weak:   { key: 'weak', name: tx('ひよっこ旅人'), power: 1 },
    strong: { key: 'strong', name: tx('歴戦の旅人'),   power: 3 },
    rival:  { key: 'rival', name: tx('ライバル'),     power: 2 }
  };

  /* ---- カードの定義(ランダムC) ---- */
  function allFx(n) { return { courage: n, caution: n, charm: n, improv: n }; }

  function makeShop(itemKey) {
    const it = ITEMS[itemKey];
    const choices = [
      { label: tx('買う'), fixed: true, act: 'buy', item: it.key },
      { label: tx('諦める'), fixed: true, act: 'giveup', item: it.key }
    ];
    Object.keys(WAYS).forEach(function (w) {
      choices.push({ label: WAYS[w].label, act: 'try', way: w, item: it.key, ends: [WAYS[w].end] });
    });
    return {
      id: 'shop_' + it.key, sec: 'C', kind: 'shop', w: 1, icon: it.slot === 'weapon' ? 'p_wsmith' : 'p_asmith',
      who: tx(RANK_SHOP[it.rank] + (it.slot === 'weapon' ? '武器商人' : '防具商人')),   /*nw*/   // 出会った時に、ランクが分かる
      q: tx('「{n}が{p}銀貨だよ。\n買っていくかい?」', { n: it.name, p: it.price }),
      showCount: 4, choices: choices,
      timeout: { type: 'branch', msg: tx('迷っているうちに、商人は別の客のところへ行ってしまった。'), fx: {} }
    };
  }
  function makeTraveler(allyKey, price, q, who, abductNeed) {
    return {
      id: 'trav_' + allyKey, sec: 'C', kind: 'traveler', w: 1, icon: 'p_traveler', who: who, q: q,
      choices: [
        { label: tx('雇う'), act: 'hire', ally: allyKey, price: price },
        { label: tx('頼み込む'), act: 'plead', ally: allyKey },
        { label: tx('連れ去る'), act: 'abduct', ally: allyKey, need: abductNeed, ends: ['019'] },
        { label: tx('諦める'), act: 'leave' }
      ],
      timeout: { type: 'branch', msg: tx('迷っているうちに、旅人は去っていった。'), fx: {} }
    };
  }
  /* 最強の旅人。雇う値段は80銀貨(払えない)。どの選択肢でも仲間にならず、ペナルティもない。出会うと flag が立つ */
  function makeTravelerMax() {
    return {
      id: 'trav_max', sec: 'C', w: 1, icon: 'p_legend', who: tx('伝説の旅人'), flag: 'metMax',
      q: tx('圧倒的な気配をまとった旅人が、静かに言った。\n「80銀貨で、雇われてやろう」'),
      choices: [
        { label: tx('雇う'), fx: {}, msg: tx('どう数えても、80銀貨には届かなかった。\n旅人は、静かに首を振った。') },
        { label: tx('頼み込む'), fx: {}, msg: tx('頼み込んだが、旅人は微笑むだけだった。\n「また、いつか」') },
        { label: tx('連れ去る'), fx: {}, msg: tx('手を伸ばした瞬間、視界が一回転した。\n気づくと、元の場所に立っていた。') },
        { label: tx('諦める'), fx: {}, msg: tx('旅人は、静かに去っていった。\nなぜか、また会える気がした。') }
      ],
      timeout: { type: 'branch', msg: tx('迷っているうちに、旅人は去っていった。\nなぜか、また会える気がした。'), fx: {} }
    };
  }
  const CARDS_C = [
    makeShop('w1'), makeShop('w2'), makeShop('w3'),
    makeShop('a1'), makeShop('a2'), makeShop('a3'),
    makeTraveler('weak', 4, tx('駆け出しの旅人が、心細そうに言った。\n「4銀貨で、雇ってくれませんか…?」'), tx('弱そうな旅人'), 7),
    makeTraveler('strong', 12, tx('傷だらけの旅人が、静かに言った。\n「12銀貨なら、雇われてやってもいい」'), tx('強そうな旅人'), 9),
    makeTravelerMax()
  ];

  /* ---- イベントB(関所) ----
     gate.type: total=4つのステータスの合計が min 以上で通過 / stat=指定のステータスが min 以上で通過 /
                always=何があっても通れる / never=何があっても通れない / bribe=全財産を渡して通る(所持金が min 以上)
     bonus=通過したときの報酬(fx=ステータス / gold=所持金)。全ステータスが0以下だと、always と never 以外は、どれを選んでもエンド。 */
  const FORCED_B = {
    id: 'B', forced: true, icon: 'p_gate', who: tx('関所の門番'), q: tx('「止まれ。通行の理由を述べよ」'),
    showCount: 4,
    choices: [
      { label: tx('総合力で押し通る'), fixed: true, gate: { type: 'total', min: 6, fail: '010',
        bonus: { fx: { courage: 1 }, gold: 2, msg: tx('総合力で押し通った。\n門番は、何も言えなかった。') } } },
      { label: tx('堂々と通る'), gate: { type: 'stat', stat: 'courage', min: 2, fail: '011',
        bonus: { fx: { courage: 2 }, msg: tx('胸を張って通り抜けた。\n度胸が据わった気がする。') } } },
      { label: tx('丁寧にお願いする'), gate: { type: 'stat', stat: 'charm', min: 2, fail: '011',
        bonus: { fx: { charm: 2 }, msg: tx('丁寧な物腰が、門番の心を動かした。') } } },
      { label: tx('通行証を見せる'), gate: { type: 'stat', stat: 'caution', min: 2, fail: '011',
        bonus: { fx: { caution: 2 }, msg: tx('通行証は本物だった。\n確認を怠らない習慣が身についた。') } } },
      { label: tx('口八丁で押し切る'), gate: { type: 'stat', stat: 'improv', min: 2, fail: '011',
        bonus: { fx: { improv: 2 }, msg: tx('口八丁が見事に決まった。') } } },
      { label: tx('家柄を名乗る'), w: 0.28, gate: { type: 'always',
        bonus: { gold: 10, msg: tx('「ははあ!」\n門番は平伏した。どうやら自分は、皇族だったらしい。\n通行料の代わりに、ご祝儀まで頂いた。') } } },
      { label: tx('経歴を語る'), gate: { type: 'never', end: '012' } },
      { label: tx('全財産を差し出す'), gate: { type: 'bribe', min: 1,
        bonus: { fx: { charm: 1, improv: 1 }, msg: tx('全財産を握らせると、門番は急に親切になった。\n身軽になって、気分まで軽い。') } } }
    ],
    timeout: { type: 'end', end: '014',
      hidden: { silence: 2, bonus: { fx: allFx(1), msg: tx('黙っていると、門番は勝手に何かを察して通してくれた。\nこれまでの沈黙が、いつの間にか貫禄になっていた。') } } },
    allZeroEnd: '013'
  };

  /* 関所のあと、街に入る場面(選択なし) */
  const TOWN = { id: 'town', narr: true, text: tx('街に出た。準備をしよう。') };

  /* ---- イベントC(ライバル戦) ---- */
  const FORCED_C = {
    id: 'C', forced: true, icon: 'p_rival', who: tx('ライバル'), q: tx('「ここは通さないぜ!\n魔王を倒すのは俺だ!」'),
    showCount: 4,
    choices: [
      { label: tx('戦う'), fixed: true, act: 'fight', ends: ['023'] },
      { label: tx('逃げる'), fixed: true, act: 'flee', ends: ['020'] },
      { label: tx('仲間になろうと誘う'), act: 'recruit', ends: ['024'] },
      { label: tx('貫禄を見せつける'), act: 'presence' },
      { label: tx('じゃんけんをする'), act: 'janken', ends: ['021'] },
      { label: tx('有り金を差し出す'), act: 'allin' }
    ],
    timeout: { type: 'end', end: '022' }
  };

  /* ---- ランダムD(魔物) ----
     tier: 1=弱 / 2=中 / 3=強。選択肢はどれも同じ4つ。 */
  const MON_ICON = { m_slime: 'p_slime', m_bat: 'p_bat', m_orc: 'p_orc', m_skel: 'p_skel', m_wyvern: 'p_wyvern', m_general: 'p_general' };
  /* ステータスを参照する選択肢。そのステータス + 装備の数値 + 仲間の数値 が、魔物ごとの基準以上なら突破 */
  const MSTAT = {
    courage: { label: tx('にらみつける'), win: tx('にらみつけると、{w}は後ずさりして、道を空けた。') },
    caution: { label: tx('罠を仕掛ける'), win: tx('罠を仕掛けて待つと、{w}は見事に引っかかった。') },
    charm:   { label: tx('愛想を振りまく'), win: tx('愛想を振りまくと、{w}は毒気を抜かれて去っていった。') },
    improv:  { label: tx('口八丁でごまかす'), win: tx('口八丁でごまかすと、{w}は、なぜか納得して去っていった。') }
  };
  const MTHRESH = { 1: 6, 2: 8, 3: 11 };
  function makeMonster(id, who, tier, q, defeatEnd, intro2) {
    const choices = [
      { label: tx('戦う'), fixed: true, act: 'mfight', ends: defeatEnd ? [defeatEnd] : [] },
      { label: tx('隠れる'), fixed: true, act: 'hide' },
      { label: tx('ガードする'), fixed: true, act: 'guard', ends: tier === 3 ? ['026'] : [] },
      { label: tx('現実から逃げる'), act: 'dream', ends: ['028'] }
    ];
    Object.keys(MSTAT).forEach(function (k) {
      choices.push({ label: MSTAT[k].label, act: 'mstat', stat: k, ends: defeatEnd ? [defeatEnd] : [] });
    });
    return {
      id: id, sec: 'D', tier: tier, w: 1, icon: MON_ICON[id], who: who, q: q, defeatEnd: defeatEnd, intro2: intro2,
      showCount: 4,                 // 固定3つ + 残り5つ(逃げる + ステータス参照4種)からランダムに1つ
      choices: choices,
      timeout: tier === 1
        ? { type: 'branch', msg: tx('迷っているうちに、銀貨を落としてしまった。'), fx: {}, gold: -2 }
        : { type: 'end', end: '027' }
    };
  }
  const CARDS_D = [
    makeMonster('m_slime', tx('スライム'), 1, tx('ぷるぷるしたスライムが、\n飛びかかってきた!'), null, tx('スライムだ。こちらに気づいた!')),
    makeMonster('m_bat', tx('コウモリ'), 1, tx('無数のコウモリが、\n頭上を舞っている!'), null, tx('コウモリだ。こちらに気づいた!')),
    makeMonster('m_orc', tx('オーク'), 2, tx('巨大なオークが、\n棍棒を振り上げた!'), '025', tx('オークだ。こちらに気づいた!')),
    makeMonster('m_skel', tx('骸骨剣士'), 2, tx('骸骨の剣士が、\nカタカタと迫ってくる!'), '025', tx('骸骨剣士だ。こちらに気づいた!')),
    makeMonster('m_wyvern', tx('ワイバーン'), 3, tx('空から、ワイバーンが\n急降下してきた!'), '025', tx('ワイバーンだ。こちらに気づいた!')),
    makeMonster('m_general', tx('獄炎の将軍'), 3, tx('「ここから先は、通さん」\n炎をまとった将軍が立ちはだかる!'), '025', tx('獄炎の将軍だ。こちらに気づいた!')),
    Object.assign(makeTravelerMax(), { sec: 'D', w: 0.3 })     // 低確率。ランダムCで会っていたら、ここには出ない
  ];

  /* ランダムCのあと、魔王城へ向かう場面(選択なし) */
  const ROAD = { id: 'road', narr: true, text: tx('街を出て、魔王城へ向かう。\n道中、魔物が現れた。') };

  /* ---- イベントD(魔王討伐)。2回選ぶ。1回目の結果のあとに、2回目 ---- */
  const FORCED_D = {
    id: 'D', forced: true, icon: 'p_demon', who: tx('魔王'), showCount: 4,
    intro1: tx('玉座に、誰かが座っている…'), intro2: tx('魔王だ。こちらを見ている。'),
    q: tx('「よく来たな、勇者よ。\n…さあ、どうする?」'),
    choices: [
      { label: tx('戦う'), fixed: true, act: 'bfight', ends: ['029'] },
      { label: tx('逃げる'), fixed: true, act: 'bflee' },
      { label: tx('仲間に戦わせる'), fixed: true, act: 'ballies', ends: ['030'] },
      { label: tx('世間話をする'), act: 'bchat', ends: ['031'] },
      { label: tx('歌を歌う'), act: 'bsing', ends: ['032'] },
      { label: tx('カツアゲされる'), act: 'bmug', ends: [] }
    ],
    q2: tx('魔王が、こちらを睨んでいる。\n「次で、決着をつけよう」'),
    choices2: [
      { label: tx('奥義を使う'), act: 'ult', ends: ['029', '038', '039', '040', '041', '042'] },
      { label: tx('逃げる'), act: 'home', ends: ['036'] },
      { label: tx('土下座する'), act: 'bow', ends: ['033', '037'] },
      { label: tx('助けを呼ぶ'), act: 'help', ends: ['034', '043'] }
    ],
    timeout: { type: 'end', end: '035' }
  };

  /* ---- 実行時の状態 ---- */
  function newRun() {
    return { stats: Object.assign({}, START_STATS), money: START_MONEY, equip: [], allies: [], flags: {}, silence: 0, queue: [], i: -1, history: [] };
  }
  function allZero(run) {
    return STATS.every(function (s) { return run.stats[s.key] <= 0; });
  }
  function total(run) {
    return STATS.reduce(function (sum, s) { return sum + run.stats[s.key]; }, 0);
  }
  function slotItem(run, slot) {
    return run.equip.filter(function (e) { return e.slot === slot; })[0] || null;
  }
  function hasRank(run, min) {
    return run.equip.some(function (e) { return e.rank >= min; });
  }
  function rankOf(run, slot) { const it = slotItem(run, slot); return it ? it.rank : 0; }
  function hasAlly(run, key) { return run.allies.some(function (a) { return a.key === key; }); }
  /* 仲間の条件: 強がいる、または、弱とライバルがいる */
  function allyOk(run) { return hasAlly(run, 'strong') || (hasAlly(run, 'weak') && hasAlly(run, 'rival')); }
  function allyPower(run) { return run.allies.reduce(function (s, a) { return s + a.power; }, 0); }
  /* 装備は数値に換算する(無=0 / 下=1 / 中=2 / 上=3)。武器と防具の合計で判定する */
  function equipSum(run) { return rankOf(run, 'weapon') + rankOf(run, 'armor'); }
  function equipMid(run) { return equipSum(run) >= 4; }   // 中+中以上(上+下でも満たす)
  function equipTop(run) { return equipSum(run) >= 5; }   // 上+中以上
  function randStat(rng) { return STATS[Math.floor(rng() * STATS.length)]; }

  /* 重み付きで、重複なく n 枚引く */
  function drawFrom(list, n, rng) {
    const pool = list.map(function (c) { return { c: c, w: c.w || 1 }; });
    const out = [];
    for (let k = 0; k < n && pool.length; k++) {
      const sum = pool.reduce(function (s, p) { return s + p.w; }, 0);
      let r = rng() * sum, j = 0;
      for (; j < pool.length; j++) { r -= pool[j].w; if (r < 0) break; }
      if (j >= pool.length) j = pool.length - 1;
      out.push(pool.splice(j, 1)[0].c);
    }
    return out;
  }
  /* ランダムCの枚数: 2枚15% / 3枚65% / 4枚20% */
  function drawCountC(rng) {
    const r = rng();
    return r < 0.15 ? 2 : r < 0.80 ? 3 : 4;
  }
  /* showCount のあるカードは、fixed の選択肢に、残りからのランダムを足して showCount 個にする */
  function instantiate(card, rng) {
    if (!card.showCount) return card;
    const out = card.choices.filter(function (c) { return c.fixed; });
    const pool = card.choices.filter(function (c) { return !c.fixed; });
    // 選択肢に w があれば、出やすさに反映する(なければ1)
    return Object.assign({}, card, { choices: out.concat(drawFrom(pool, card.showCount - out.length, rng)) });
  }
  /* 1回分の進行表: ランダムB → イベントB → 街 → ランダムC → イベントC → 道中 → ランダムD → イベントD */
  function buildQueue(rng) {
    const q = [];
    const put = function (c) { q.push(instantiate(c, rng)); };
    drawFrom(CARDS, DRAW_COUNT, rng).forEach(put);
    put(FORCED_B);
    q.push(TOWN);
    const cs = drawFrom(CARDS_C, drawCountC(rng), rng);
    cs.forEach(put);
    put(FORCED_C);
    q.push(ROAD);
    const metInC = cs.some(function (c) { return c.id === 'trav_max'; });
    drawFrom(CARDS_D.filter(function (c) { return !(metInC && c.id === 'trav_max'); }), DRAW_COUNT, rng).forEach(put);
    put(FORCED_D);
    return q;
  }
  /* カードに出会った時に、裏でフラグを立てる */
  function encounter(run, card) {
    if (card.flag) run.flags[card.flag] = true;
  }

  /* ---- 判定 ---- */
  function passOf(bonus, extra) {
    return Object.assign({ msg: bonus.msg, fx: bonus.fx, gold: bonus.gold, pass: true }, extra || {});
  }
  function withWeaker(run, it, msg) {
    const cur = slotItem(run, it.slot);
    return (cur && cur.rank > it.rank) ? msg + tx('\n弱くなった気がする。') : msg;
  }
  function gain(run, it, msg, extra) {
    return Object.assign({ msg: withWeaker(run, it, msg), items: [it] }, extra || {});
  }

  /* 関所のステータス不足は、ひとつのエンドにまとめた。結果画面には、足りなかったステータスを出す */
  const STAT_WHY = { courage: tx('度胸が足りなかった。'), caution: tx('慎重さが足りなかった。'), charm: tx('愛嬌が足りなかった。'), improv: tx('その場しのぎが足りなかった。') };
  function resolveForcedB(run, card, choice) {
    const g = choice.gate;
    if (g.type === 'always') return passOf(g.bonus);
    if (g.type === 'never') return { end: g.end };
    if (allZero(run)) return { end: card.allZeroEnd };
    if (g.type === 'bribe') {
      if (run.money >= g.min) return passOf(g.bonus, { gold: -run.money });
      return passOf({ msg: tx('差し出す財産は、何もなかった。\n門番は、何も言わずに道を空けた。') });   // 所持金が0でも、エンドにはしない
    }
    if (g.type === 'total') return total(run) >= g.min ? passOf(g.bonus) : { end: g.fail };
    return run.stats[g.stat] >= g.min ? passOf(g.bonus) : { end: g.fail, why: STAT_WHY[g.stat] };
  }

  function resolveRival(run, card, choice, rng) {
    /* 武器も防具も持っていないと、どの選択肢でも、哀れまれる */
    if (!slotItem(run, 'weapon') && !slotItem(run, 'armor')) {
      return {
        msg: tx('ライバルは、丸腰のこちらを見て、深いため息をついた。\n「これを持っていけ。話はそれからだ」\n下位の装備を押し付けられ、情けなさで気力が下がった。'),
        fx: allFx(-2), items: [ITEMS.w1, ITEMS.a1], pass: true, pity: true
      };
    }
    switch (choice.act) {
      case 'fight':
        if (equipSum(run) >= 2) return { msg: tx('装備を構えて斬り結ぶと、ライバルは尻もちをついた。\n「くそっ…通れ!」'), pass: true };
        if (!run.allies.length) return { end: '023' };      // 装備が弱く、奪われる仲間もいない
        return { msg: tx('装備が心もとなく、あっさり押し負けた。\nライバルは勝ち誇って、仲間を引き抜いて、道を空けた。'),
          loseAlly: true, pass: true };
      case 'flee':
        return { end: '020' };
      case 'recruit':
        if (hasRank(run, 3)) return { msg: tx('上等な装備に、ライバルの目の色が変わった。\n「面白い。俺も行こう」'), ally: ALLIES.rival, pass: true };
        if (hasRank(run, 2)) return { msg: tx('「装備が貧弱だな」と鼻で笑われた。\n自信をなくして、とぼとぼと通り抜けた。'), fx: allFx(-1), pass: true };
        return { end: '024' };                                // 下位の装備だけでは、相手にされない
      case 'presence':
        if (total(run) >= 6) return { msg: tx('全身から漂う貫禄に、ライバルはたじろいだ。\n「…通れ」'), pass: true };
        return { msg: tx('貫禄が足りず、取り囲まれた。\n装備を置いていくことで、通してもらえた。'), loseEquip: true, pass: true };
      case 'janken':
        if (rng() < 0.5) return { msg: tx('じゃんけんぽん。勝った。\n「くそっ、三回勝負だ!」と言われたが、構わず通り抜けた。'), pass: true };
        return { end: '021' };
      case 'allin':
        return { msg: tx('有り金を差し出すと、ライバルは目を丸くして道を空けた。\n(銀貨が0枚でも、気持ちは伝わった。)'), gold: -run.money, pass: true };
    }
    return { end: card.timeout.end };
  }

  function resolveShop(run, card, choice) {
    const it = ITEMS[choice.item];
    if (choice.act === 'buy') {
      if (run.money >= it.price) return gain(run, it, tx('{p}銀貨を支払い、{n}を手に入れた。', { p: it.price, n: it.name }), { gold: -it.price });
      return { msg: tx('銀貨が足りない。\n買えずに、とぼとぼと立ち去った。'), fx: allFx(-1) };
    }
    if (choice.act === 'giveup') {
      if (run.money <= 2) return { msg: tx('諦めて、店を後にした。\n見かねた商人が、銀貨を恵んでくれた。'), gold: 5 - run.money };
      return { msg: tx('諦めて、店を後にした。') };
    }
    const w = WAYS[choice.way], have = run.stats[w.stat], short = it.req - have;
    if (short <= 0) return gain(run, it, w.ok.replace('{n}', it.name));
    if (short >= 3) return { end: w.end };
    const fx = {}; fx[w.stat] = -1;
    return { msg: w.ng, fx: fx };
  }

  function resolveTraveler(run, card, choice) {
    const a = ALLIES[choice.ally];
    switch (choice.act) {
      case 'hire':
        if (run.money >= choice.price) return { msg: tx('{p}銀貨で雇い入れた。', { p: choice.price }), ally: a, gold: -choice.price };
        return { msg: tx('「銀貨が足りないな」と断られた。\n情けなくて、気力が下がった。'), fx: allFx(-1) };
      case 'plead':
        if (STATS.some(function (s) { return run.stats[s.key] > 4; })) return { msg: tx('頼み込むと、{n}は根負けした。\n「…仕方ない、付き合おう」', { n: a.name }), ally: a };
        return { msg: tx('「悪いが、他を当たってくれ」\n特に何も起きなかった。') };
      case 'abduct':
        if (total(run) >= choice.need) return { msg: tx('有無を言わさず連れ去った。\nなぜか、{n}は納得してくれた。', { n: a.name }), ally: a };
        return { end: '019' };
      case 'leave':
        return { msg: tx('旅人を見送った。\nなぜか良い旅になる気がして、気力が湧いた。'), fx: allFx(1) };
    }
    return { msg: '' };
  }

  function resolveMonster(run, card, choice, rng) {
    const t = card.tier;
    switch (choice.act) {
      case 'mfight': {
        const win = t === 1 ? (total(run) >= 6 || run.equip.length >= 1 || run.allies.length >= 1)
          : t === 2 ? (equipSum(run) >= 2 || total(run) >= 9 || allyPower(run) >= 3)
          : (equipSum(run) >= 4 || total(run) >= 11 || allyOk(run));
        if (!win) {
          if (t === 1) return { msg: tx('返り討ちに遭った。\n命からがら、逃げ出した。'), fx: allFx(-1) };
          return { end: card.defeatEnd };
        }
        if (rng() < 0.5) {
          const s = randStat(rng), fx = {};
          fx[s.key] = t;
          return { msg: tx('{w}を倒した!\n戦いの中で、{s}が磨かれた。', { w: card.who, s: s.label }), fx: fx };
        }
        const slot = rng() < 0.5 ? 'weapon' : 'armor';
        const it = ITEMS[(slot === 'weapon' ? 'w' : 'a') + t];
        return gain(run, it, tx('{w}を倒した!\n戦利品として、{n}を手に入れた。', { w: card.who, n: it.name }));
      }
      case 'hide': {
        const s = randStat(rng), fx = {};
        fx[s.key] = 1;
        return { msg: tx('物陰に隠れて、やり過ごした。\n息を潜めるうちに、{s}が研ぎ澄まされた。', { s: s.label }), fx: fx };
      }
      case 'guard': {
        if (t === 3) return { end: '026' };
        const s = randStat(rng), fx = {};
        fx[s.key] = 2;
        return { msg: tx('身を固めて、攻撃を受け止めた。\n{s}が鍛えられた気がする。', { s: s.label }), fx: fx };
      }
      case 'mstat': {
        const power = run.stats[choice.stat] + equipSum(run) + allyPower(run);
        if (power >= MTHRESH[t]) return { msg: MSTAT[choice.stat].win.replace('{w}', card.who) };
        if (t === 1) return { msg: tx('{w}にはまるで通用しなかった。\n逃げ帰る途中で、気力が下がった。', { w: card.who }), fx: allFx(-1) };
        return { end: card.defeatEnd };
      }
      case 'dream':
        return { end: '028' };
    }
    return { end: '027' };
  }

  /* イベントD。stage=1(1回目) / 2(2回目)。next=true なら、結果のあとに2回目へ進む */
  function resolveBoss(run, card, stage, choice, rng) {
    rng = rng || Math.random;
    if (stage === 1) {
      switch (choice.act) {
        case 'bfight':
          if (equipMid(run) || total(run) >= 12 || allyOk(run)) return { msg: tx('渾身の一撃が、魔王に届いた。\n魔王が、わずかによろめいた。'), next: true };
          return { end: '029', why: tx('魔王に通用する力がなかった。') };
        case 'bflee': {
          const o = { msg: tx('背を向けて逃げ出した。\nだが、魔王に回り込まれた。'), fx: allFx(-1), loseAllAllies: true, next: true };
          if (run.equip.length) o.loseSlot = run.equip[Math.floor(rng() * run.equip.length)].slot;   // 装備はランダムで片方を失う
          return o;
        }
        case 'ballies':
          if (run.allies.length) return { msg: tx('「行け、仲間たちよ!」\n仲間は魔王に挑んだが、やられてしまった。'), loseAllAllies: true, next: true };
          return { end: '030' };
        case 'bchat':
          if (run.stats.improv + run.stats.charm >= 6) return { msg: tx('天気の話で、なぜか盛り上がった。\n魔王が、ふと油断した。'), next: true };
          return { end: '031' };
        case 'bsing':
          if (run.stats.courage + run.stats.caution >= 6) return { msg: tx('渾身の歌声が、魔王城に響いた。\n魔王が、耳をふさいでうずくまった。'), next: true };
          return { end: '032' };
        case 'bmug':
          if (run.money >= 5) return { msg: tx('「金を出せ」と、魔王にカツアゲされた。\n財布を差し出すと、魔王は上機嫌になった。'), gold: -run.money, next: true };
          return { msg: tx('「出せ」と言われたが、出せるものがなかった。\n魔王は、深いため息をついた。'), next: true };   // 所持金が足りなくても、エンドにはしない
      }
      return { end: card.timeout.end };
    }
    switch (choice.act) {
      case 'ult': {
        const a = equipTop(run), b = total(run) >= 14, c = allyOk(run);
        const n = (a ? 1 : 0) + (b ? 1 : 0) + (c ? 1 : 0);
        if (n === 0) return { end: '029', why: tx('奥義を使う条件を、満たせなかった。') };
        if (n === 3) return { end: '042' };
        if (n === 2) return { end: '041' };
        return { end: a ? '038' : b ? '039' : '040' };
      }
      case 'home':
        return { end: '036' };
      case 'bow':
        if (run.allies.length === 0 && rankOf(run, 'weapon') + rankOf(run, 'armor') <= 2 && total(run) <= 5) return { end: '037' };
        return { end: '033' };
      case 'help':
        return { end: run.flags.metMax ? '043' : '034' };
    }
    return { end: card.timeout.end };
  }

  function resolveChoice(run, card, choice, rng) {
    rng = rng || Math.random;
    if (card.tier) return resolveMonster(run, card, choice, rng);
    if (card.id === 'B') return resolveForcedB(run, card, choice);
    if (card.id === 'C') return resolveRival(run, card, choice, rng);
    if (card.kind === 'shop') return resolveShop(run, card, choice);
    if (card.kind === 'traveler') return resolveTraveler(run, card, choice);
    if (choice.alt && run.stats[choice.alt.stat] >= choice.alt.min) {
      return { msg: choice.alt.msg, fx: choice.alt.fx, gold: choice.alt.gold, end: choice.alt.end, boosted: true };
    }
    return { msg: choice.msg, fx: choice.fx, gold: choice.gold, end: choice.end };
  }
  function resolveTimeout(run, card) {
    const t = card.timeout;
    if (t.type === 'end') {
      if (t.hidden && run.silence >= t.hidden.silence) return passOf(t.hidden.bonus);
      return { end: t.end };
    }
    return { msg: t.msg, fx: t.fx, gold: t.gold, silence: true };
  }

  function applyOutcome(run, o) {
    o.notes = [];
    if (o.fx) { for (const k in o.fx) run.stats[k] += o.fx[k]; }
    if (o.gold) {
      const before = run.money;
      run.money = Math.max(0, run.money + o.gold);   // 所持金は0未満にならない
      o.goldDelta = run.money - before;
    }
    if (o.items) {
      o.items.forEach(function (it) {
        run.equip = run.equip.filter(function (e) { return e.slot !== it.slot; });   // 同じ部位は、置き換わる
        run.equip.push(it);
        o.notes.push({ t: SLOT_LABEL[it.slot] + ' ' + equipLabel(it), v: 1 });
      });
      run.equip.sort(function (a, b) { return a.slot < b.slot ? 1 : -1; });         // 武器 → 防具の順
    }
    if (o.loseEquip) {
      run.equip.forEach(function (e) { o.notes.push({ t: SLOT_LABEL[e.slot] + ' ' + equipLabel(e), v: -1 }); });
      run.equip = [];
    }
    if (o.loseSlot) {
      run.equip = run.equip.filter(function (e) {
        if (e.slot !== o.loseSlot) return true;
        o.notes.push({ t: SLOT_LABEL[e.slot] + ' ' + equipLabel(e), v: -1 });
        return false;
      });
    }
    if (o.loseAllAllies) {
      run.allies.forEach(function (a) { o.notes.push({ t: tx('仲間 {n}', { n: a.name }), v: -1 }); });
      run.allies = [];
    }
    if (o.ally) { run.allies.push(o.ally); o.notes.push({ t: tx('仲間 {n}', { n: o.ally.name }), v: 1 }); }
    if (o.loseAlly && run.allies.length) {
      run.allies.sort(function (a, b) { return b.power - a.power; });               // 一番強い仲間を取られる
      o.notes.push({ t: tx('仲間 {n}', { n: run.allies.shift().name }), v: -1 });
    }
    if (o.silence) run.silence += 1;
  }

  /* ---- バッジ(エンドの収集数ごとに獲得) ----
     id は、エンドの番号(数字)と区別するため、必ずアルファベットで始める(例: /badge/B05/) */
  const BADGE_TPL = [
    '.RR.......QQ.', '..RR.....QQ..', '...RR...QQ...', '....RR.QQ....',
    '...kkkkkkk...', '..kMMMMMMMk..', '.kMWWMMMMMMk.', '.kMWMMSMMMMk.',
    '.kMMSSSSSMMk.', '.kMMMSSSMMMk.', '.kMMMSMSMMMk.', '.kMMMMMMMMMk.',
    '..kMMMMMMMk..', '...kkkkkkk...'
  ];
  function medal(m) {
    return BADGE_TPL.map(function (row) {
      return row.replace(/[RQMWS]/g, function (c) { return m[c]; });
    });
  }
  ART.badge_B05 = medal({ M: 'o', W: 'c', S: 'n', R: 'r', Q: 'r' });
  ART.badge_B10 = medal({ M: 'a', W: 'w', S: 'd', R: 'b', Q: 'b' });
  ART.badge_B20 = medal({ M: 'y', W: 'c', S: 'o', R: 'r', Q: 'r' });
  ART.badge_B30 = medal({ M: 's', W: 'w', S: 'b', R: 'g', Q: 'g' });
  ART.badge_B40 = medal({ M: 'v', W: 'p', S: 'w', R: 'b', Q: 'b' });
  ART.badge_BALL = medal({ M: 'y', W: 'w', S: 'r', R: 'r', Q: 'b' });
  const TOTAL_ENDS = Object.keys(ENDS).length;
  const BADGES = [
    { id: 'B05', need: 5, name: tx('見習い冒険者'), text: tx('最初の数歩を踏み出した証。\n3秒で決める旅は、まだ始まったばかり。'), art: 'badge_B05' },
    { id: 'B10', need: 10, name: tx('寄り道の名人'), text: tx('正解のない選択を、何度も楽しんだ証。\n寄り道こそ、この旅の醍醐味。'), art: 'badge_B10' },
    { id: 'B20', need: 20, name: tx('結末コレクター'), text: tx('数々の結末を見届けた証。\n成功も失敗も、立派な物語。'), art: 'badge_B20' },
    { id: 'B30', need: 30, name: tx('運命を知る者'), text: tx('分かれ道の先を、ほとんど知り尽くした証。\n選択の重みを、体が覚えている。'), art: 'badge_B30' },
    { id: 'B40', need: 40, name: tx('終焉の語り部'), text: tx('あらゆる終わりを語れる者の証。\n残りは、あとわずか。'), art: 'badge_B40' },
    { id: 'BALL', need: TOTAL_ENDS, name: tx('3秒の覇者'), text: tx('全てのエンドを、集めきった証。\nこの旅の全てを、見届けた。'), art: 'badge_BALL', all: true }
  ];
  function badgesFor(count) {
    return BADGES.filter(function (b) { return count >= b.need; }).map(function (b) { return b.id; });
  }

  /* ---- 開発者モード用の共通部品 ---- */
  function findCard(id) {
    const all = CARDS.concat(CARDS_C, CARDS_D, [FORCED_B, FORCED_C, FORCED_D]);
    return all.filter(function (c) { return c.id === id; })[0] || null;
  }
  /* どのカードでも、同じ呼び方で判定する(stage は、イベントDの 1回目 / 2回目) */
  function resolve(run, card, stage, choice, rng) {
    return card.id === 'D' ? resolveBoss(run, card, stage || 1, choice, rng) : resolveChoice(run, card, choice, rng);
  }

  return {
    TIME_LIMIT: TIME_LIMIT, TIME_SCALE: TIME_SCALE, DRAW_COUNT: DRAW_COUNT, SHARE_URL: SHARE_URL,
    PHASES: PHASES, STATS: STATS, START_STATS: START_STATS, START_MONEY: START_MONEY, PALETTE: PALETTE, ART: ART, ENDS: ENDS,
    CARDS: CARDS.concat(CARDS_C, CARDS_D), CARDS_B: CARDS, CARDS_C: CARDS_C, CARDS_D: CARDS_D, FORCED_D: FORCED_D, ROAD: ROAD, STORY: STORY, FORCED_B: FORCED_B, FORCED_C: FORCED_C, TOWN: TOWN,
    ITEMS: ITEMS, ALLIES: ALLIES, WAYS: WAYS, BADGES: BADGES, badgesFor: badgesFor, findCard: findCard, resolve: resolve, resolveTimeout: resolveTimeout, resolveBoss: resolveBoss,
    newRun: newRun, allZero: allZero, equipLabel: equipLabel, buildQueue: buildQueue, instantiate: instantiate,
    drawCountC: drawCountC, encounter: encounter, resolveBoss: resolveBoss, resolveChoice: resolveChoice, resolveTimeout: resolveTimeout, applyOutcome: applyOutcome
  };
})();
