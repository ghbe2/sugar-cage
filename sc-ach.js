/* ============================================================
   しゅがけ共通アチーブメント — ゲーム内通知
   https://ghbe2.github.io/sugar-cage/sc-ach.js

   各ゲームは <script src> で読み込み、状態が動いた場所で
   SC.check() を呼ぶだけ。条件も名前もここが持つので、
   ゲーム側に定義を配らない（3か所に散らすと必ずずれる）。

   ※ メニュー本体（/sugar-cage/index.html）の ACH_DEFS と
     名前・条件を揃えること。変更したら両方直す。

   localStorage はパスではなくオリジン単位。全ゲームが
   ghbe2.github.io にいるので、どのゲームからでも全部読める。
   ============================================================ */
(function () {
  'use strict';
  if (window.SC) return;                     // 二重読み込みでも壊れない

  var FLAG_KEY = 'sugar_cage_flags';         // 各ゲームが立てる旗
  var SEEN_KEY = 'sugar_cage_seen';          // 通知済み。二度は出さない

  function readJSON(k, def) {
    try { var r = localStorage.getItem(k); return r ? JSON.parse(r) : def; }
    catch (e) { return def; }
  }
  function readNum(k) { try { return Number(localStorage.getItem(k)) || 0; } catch (e) { return 0; } }
  function readStr(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* ---- 糖度（格付け）。数字は出さず、絵だけ使う ---- */
  var CUBE = 'https://ghbe2.github.io/sugar-cage/images/rank_sugarcube.png';
  var RANKS = {
    1: { ic: '🍓', name: 'フルーツ', col: '#d94f6a' },
    2: { ic: '🍮', name: 'プリン',   col: '#c9881e' },
    3: { ic: '🍰', name: 'ケーキ',   col: '#b8437e' },
    4: { ic: null, name: '角砂糖',   col: '#5e2340' }   // 絵文字が無いので画像
  };

  /* ---- 保存されているものを読む ---- */
  function snap() {
    var viewed = readJSON('sugar_cage_viewed', []) || [];
    var best   = readJSON('sugar_cage_best_match', {}) || {};
    var rates  = Object.keys(best).map(function (k) { return Number(best[k]); })
                       .filter(function (n) { return !isNaN(n); });
    var rating = readJSON('sugarcage_rating_v5', { rako: 0, ou: 0 }) || {};
    var reach  = readJSON('sugarcage_rating_reached', {}) || {};
    /* ストーキングは最高得点しか持っていなかったので、段になる数
       （到達ステージ・トウカを凌いだ回数）を別の入れ物で足してもらった。
       既存の sugake_alley_best は名前も形もそのまま */
    var alley  = readJSON('sugake_alley_stats', {}) || {};
    var ids = {}; viewed.forEach(function (v) { ids[Number(v)] = 1; });
    return {
      ids: ids,
      viewed: viewed.length,
      voted: !!readStr('sugar_cage_my_vote'),
      top: rates.length ? Math.max.apply(null, rates) : 0,
      cBest: readNum('sugake-curling.bestScore'),
      cNamed: !!readStr('sugake-curling.playerName'),
      rRako: Number(rating.rako) || 0,
      rOu: Number(rating.ou) || 0,
      reachedRako: !!reach.rako,
      reachedOu: !!reach.ou,
      sBest: readNum('sugake_alley_best'),
      sStage: Number(alley.stage) || 0,
      sEsc: Number(alley.escapes) || 0,
      sCheese: Number(alley.cheese) || 0,
      f: readJSON(FLAG_KEY, {}) || {}
    };
  }
  function hasAll(ids, from, to) {
    for (var i = from; i <= to; i++) if (!ids[i]) return false;
    return true;
  }

  /* ---- 定義。game を見て、そのゲームのぶんだけ判定する ---- */
  var DEFS = [
    { g:'matching', r:1, name:'はじめての出会い', desc:'ひとり診断した',   on:function(s){return s.viewed>=1;} },
    { g:'matching', r:1, name:'推し活',           desc:'キャラに投票した', on:function(s){return s.voted;} },
    { g:'matching', r:1, name:'推し変',           desc:'推しを乗り換えた', on:function(s){return !!s.f['m.revote'];} },
    { g:'matching', r:2, name:'伸びて縮んで',     desc:'つながりを見た',   on:function(s){return !!s.f['m.relations'];} },
    { g:'matching', r:3, name:'THE ORDINARY ZODIACS',        desc:'ある12人に出会った', on:function(s){return hasAll(s.ids,1,12);} },
    { g:'matching', r:3, name:'THE ALGORITHM SACRED BEASTS', desc:'ある6人に出会った',  on:function(s){return hasAll(s.ids,13,18);} },
    { g:'matching', r:4, name:'THE INDUSTRY OLD ONES',       desc:'ある4人に出会った',  on:function(s){return hasAll(s.ids,19,22);} },
    { g:'matching', r:2, name:'開示請求',         desc:'相性90%以上を出した',  on:function(s){return s.top>=90;} },
    { g:'matching', r:4, name:'月がきれいですね', desc:'相性100%を引き当てた', on:function(s){return s.top>=100;} },

    { g:'curling', r:1, name:'選手登録',       desc:'プレイヤー名を登録した', on:function(s){return s.cNamed;} },
    { g:'curling', r:1, name:'そだ↑ね～↓？',  desc:'1,500点',  on:function(s){return s.cBest>=1500;} },
    { g:'curling', r:2, name:'ヤップ？',       desc:'5,000点',  on:function(s){return s.cBest>=5000;} },
    { g:'curling', r:2, name:'ウォー？',       desc:'12,000点', on:function(s){return s.cBest>=12000;} },
    { g:'curling', r:3, name:'ナイス～？',     desc:'25,000点', on:function(s){return s.cBest>=25000;} },
    { g:'curling', r:3, name:'オリンピック出れる', desc:'トリプルテイクを成功', on:function(s){return !!s.f['c.triple'];} },
    { g:'curling', r:4, name:'ワイルドエンド', desc:'50,000点', on:function(s){return s.cBest>=50000;} },

    { g:'rating', r:1, name:'初勝利',           desc:'1勝した', on:function(s){return s.rRako+s.rOu>=1;} },
    { g:'rating', r:2, name:'ワサンボン・ラコ', desc:'ラコで最上位クラスへ', on:function(s){return s.reachedRako;} },
    { g:'rating', r:2, name:'ワサンボン・オウ', desc:'オウで最上位クラスへ', on:function(s){return s.reachedOu;} },
    { g:'rating', r:2, name:'指何本つかった？', desc:'1回の対戦で100回タップした', on:function(s){return !!s.f['r.tap100'];} },
    { g:'rating', r:3, name:'二人とも登らせた', desc:'ラコもオウも最上位へ', on:function(s){return s.reachedRako&&s.reachedOu;} },
    { g:'rating', r:4, name:'途中突き指しなかった？', desc:'通算300勝した', on:function(s){return s.rRako+s.rOu>=300;} },

    /* ストーキングは得点の目安が無いので、しきい値をこちらで作らない。
       路地の3人（man / kid / woman）にぶつかる、あみだで外れを引く、といった
       出来事は記録に残らないので、ゲーム側から旗を立ててもらう */
    { g:'stalking', r:1, name:'穴があったら入りたい', desc:'はじめて下水に入った', on:function(s){return !!s.f['s.sewer'];} },
    { g:'stalking', r:1, name:'ぶつかりおじさん',     desc:'路地で大きな男にぶつかった', on:function(s){return !!s.f['s.man'];} },
    { g:'stalking', r:1, name:'ヒステリックおばさん', desc:'路地で横切る女にぶつかった', on:function(s){return !!s.f['s.woman'];} },
    { g:'stalking', r:1, name:'路地裏キッズ',         desc:'路地で子供にぶつかった', on:function(s){return !!s.f['s.kid'];} },
    { g:'stalking', r:1, name:'また同じ路地',   desc:'ステージ2に到達',  on:function(s){return s.sStage>=2;} },
    { g:'stalking', r:2, name:'網が足りない',   desc:'はじめてトウカから逃げ切った', on:function(s){return s.sEsc>=1;} },
    { g:'stalking', r:2, name:'運にも見放された', desc:'あみだくじで外れを引いた', on:function(s){return !!s.f['s.amida'];} },
    { g:'stalking', r:3, name:'濡れずに済んだ', desc:'水たまりを踏まずに下水を抜けた', on:function(s){return !!s.f['s.dry'];} },
    { g:'stalking', r:3, name:'っぱチーズだね', desc:'チーズを50個とった', on:function(s){return s.sCheese>=50;} },
    { g:'stalking', r:4, name:'ゆるせない',     desc:'トウカから10回逃げ切った', on:function(s){return s.sEsc>=10;} }
  ];

  /* ---- 通知の見た目。ゲーム側のCSSに触られないよう全部ここで持つ ---- */
  var CSS =
    '.sc-toasts{position:fixed;left:0;right:0;bottom:16px;z-index:2147483000;' +
      'display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;' +
      'padding:0 12px;font-family:"Noto Sans JP",system-ui,sans-serif}' +
    '.sc-toast{display:flex;align-items:center;gap:11px;max-width:340px;width:100%;' +
      'background:#fdf7ea;color:#4a1f30;border-radius:14px;padding:11px 15px 11px 11px;' +
      'box-shadow:0 0 0 2px var(--sc-c),0 8px 22px rgba(52,18,31,.3);' +
      'transform:translateY(14px) scale(.96);opacity:0;' +
      'transition:transform .34s cubic-bezier(.2,1.3,.4,1),opacity .34s}' +
    '.sc-toast.in{transform:none;opacity:1}' +
    '.sc-ic{width:34px;height:34px;flex:0 0 34px;border-radius:50%;background:#fff;' +
      'display:flex;align-items:center;justify-content:center;font-size:1rem;' +
      'box-shadow:inset 0 0 0 2px var(--sc-c)}' +
    '.sc-ic img{width:22px;height:22px;display:block}' +
    '.sc-tx{min-width:0}' +
    '.sc-k{font-size:.52rem;letter-spacing:.14em;color:var(--sc-c);font-weight:700}' +
    '.sc-n{font-size:.8rem;font-weight:700;line-height:1.35;margin-top:1px}' +
    '.sc-d{font-size:.58rem;opacity:.6;margin-top:2px}';

  var wrap = null;
  function ensure() {
    if (wrap) return wrap;
    var st = document.createElement('style'); st.textContent = CSS;
    document.head.appendChild(st);
    wrap = document.createElement('div'); wrap.className = 'sc-toasts';
    document.body.appendChild(wrap);
    return wrap;
  }
  /* 通知はゲームのUIに重なってよい。避けさせない。
     4秒で消えるもののために画面が上下に2回動くほうが不自然だし、
     .sc-toasts は pointer-events:none なので、重なっても下の要素は
     そのまま押せる。読めない時間がわずかにあるだけで、実害はない。
     （下部UIを持ち上げるフックを一度入れたが、この理由で取り下げた） */
  function toast(def) {
    var R = RANKS[def.r] || RANKS[1];
    var el = document.createElement('div');
    el.className = 'sc-toast';
    el.style.setProperty('--sc-c', R.col);
    el.innerHTML =
      '<div class="sc-ic">' + (R.ic ? R.ic : '<img src="' + CUBE + '" alt="">') + '</div>' +
      '<div class="sc-tx"><div class="sc-k">ACHIEVEMENT</div>' +
      '<div class="sc-n"></div><div class="sc-d"></div></div>';
    el.querySelector('.sc-n').textContent = def.name;   // 名前は textContent で入れる
    el.querySelector('.sc-d').textContent = def.desc;
    ensure().appendChild(el);
    requestAnimationFrame(function () { el.classList.add('in'); });
    setTimeout(function () {
      el.classList.remove('in');
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 400);
    }, 4200);
  }

  /* ---- 判定して、初めて満たしたものだけ出す ---- */
  var game = null;
  function check() {
    var s = snap(), seen = readJSON(SEEN_KEY, {}) || {}, fresh = [], i;
    for (i = 0; i < DEFS.length; i++) {
      var d = DEFS[i];
      if (game && d.g !== game) continue;        // 自分のゲームのぶんだけ見る
      var key = d.g + '.' + d.name;
      /* 値ではなくキーの有無で見る。prime() が遡って既読にしたものは
         値が 0 で入っており、真偽で見ると「未読」に化けて全部流れる */
      if (Object.prototype.hasOwnProperty.call(seen, key)) continue;
      var ok = false; try { ok = !!d.on(s); } catch (e) {}
      if (!ok) continue;
      seen[key] = Date.now();
      fresh.push(d);
    }
    if (!fresh.length) return 0;
    write(SEEN_KEY, seen);
    /* まとめて満たしたときは、軽いものから順に少しずつ出す */
    fresh.sort(function (a, b) { return a.r - b.r; });
    fresh.forEach(function (d, n) { setTimeout(function () { toast(d); }, n * 550); });
    return fresh.length;
  }

  /* 旗を立てて、そのまま判定まで走らせる */
  function flag(id) {
    var f = readJSON(FLAG_KEY, {}) || {};
    if (!f[id]) { f[id] = Date.now(); write(FLAG_KEY, f); }
    check();
  }

  /* 初回訪問で過去ぶんが一気に出るのを防ぐ。
     まだ一度も通知したことがない端末では、いま満たしているものを
     「通知済み」として黙って記録するだけにする */
  function prime() {
    if (localStorage.getItem(SEEN_KEY) !== null) return false;
    var s = snap(), seen = {};
    DEFS.forEach(function (d) {
      var ok = false; try { ok = !!d.on(s); } catch (e) {}
      if (ok) seen[d.g + '.' + d.name] = 0;      // 0 = 遡って既読
    });
    write(SEEN_KEY, seen);
    return true;
  }

  window.SC = {
    init: function (name) { game = name || null; prime(); check(); return window.SC; },
    check: check,
    flag: flag,
    _defs: DEFS, _snap: snap, _toast: toast       // 動作確認用
  };
})();
