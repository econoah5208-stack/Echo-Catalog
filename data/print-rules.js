/* Echo Trading 제품 출력 정리 규칙 — 「인쇄 / PDF 저장」 전용 (v9.4)
 *
 * 원본 제품 데이터(data/catalog.js)와 웹 카탈로그 화면은 바꾸지 않고, 제품 소개자료를 출력할 때만 적용합니다.
 * 세 가지 출력 레이아웃(A4 가로 상세 · A4 세로 압축 · A4 세로 인체 기능형)에 모두 적용되며,
 * 출력 설정 창의 「제품 정리」에서 켜고 끌 수 있습니다(기본: 모두 켜짐).
 *
 * 1. Foodform® 별도 페이지
 *    제품명에 'Foodform'이 들어간 제품(띄어쓰기·대소문자 무시: Food Form, FOODFORM 도 포함)을 한데 모아
 *    다른 제품과 섞지 않고 별도 페이지에 출력합니다. 위치(맨 앞 / 맨 뒤)는 출력 설정 창에서 고릅니다.
 *
 * 2. 같은 제품명은 한 번만 출력
 *    국내 식품분류 · 제품명 · 규격/함량(수치)이 모두 같으면 같은 제품으로 보고 한 개만 출력합니다.
 *    - 제품명을 비교할 때 띄어쓰기·줄바꿈·대소문자·전각/반각 차이와 '함량' 글자는 무시합니다.
 *      예) '세인트존스워트 추출분말(멜라토닌함량 2%)' = '세인트존스워트추출분말(멜라토닌2%)'
 *    - 규격/함량이 다르면 제품명이 같아도 각각 출력합니다.
 *      예) Foodform® Selenium 1,400-1,650 ㎍/g · 950㎍/g → 2개 모두 출력
 *          알로에베라겔파우더 100:1 · 200:1, 도라지농축액 · 도라지농축액 90% → 각각 출력
 *    - 규격/함량 칸이 비어 있는 제품은 '미입력'으로 봅니다. 같은 이름의 제품들 중 입력된 규격이 한 가지뿐이면
 *      그 제품과 같은 것으로 보고 하나만 출력합니다(v9.4 · 2026-11-10).
 *      예) 정제어유 (Refined Fish oil 18/12 TG) — LI0007 규격 빈칸 · LI0008 '18/12 TG' → 1개만 출력
 *      같은 이름에 입력된 규격이 두 가지 이상이면 빈칸 제품은 어느 쪽인지 알 수 없으므로 따로 출력합니다.
 *    - 대표로 출력하는 제품: 공개 항목(원산지·포장단위·지표성분 등)이 가장 많이 채워진 제품,
 *      같으면 제품코드가 빠른 제품. 다른 제품의 값을 섞지 않습니다.
 *    - 출력 목록에서 일부만 골랐다면 고른 제품 안에서만 비교합니다.
 *
 * 3. sameProduct — 표기만 다르고 같은 제품(직접 지정)
 *    위 자동 비교로는 잡히지 않지만 같은 제품인 묶음입니다. 묶음 안에서 대표 1개만 출력됩니다.
 *
 * 4. keepSeparate — 이름이 같아도 따로 출력할 제품코드(직접 지정)
 *    같은 이름이지만 실제로 다른 제품이라 각각 보여야 하는 경우 제품코드를 적습니다.
 *
 * 수정 후 node scripts/verify_catalog.mjs 로 점검하세요(없는 제품코드·중복 지정은 오류로 알려 줍니다).
 */
(function () {
  'use strict';

  var sameProduct = [
    ['BE0006', 'BE0007'],           // 가시오가피농축액 65brix = 가시오가피농축액 65bx (brix 표기 차이)
    ['BE0061', 'BE0062', 'BE0063'], // 여주추출물분말 = 여주추출분말
    ['PR0032', 'PR0033']            // 폴리감마글루탐산 = 폴리감마글루탐산 (PGA)
  ];

  var keepSeparate = [];

  /* 대표 제품을 고를 때 채워진 정도를 세는 공개 항목 */
  var COMPLETENESS = ['marker', 'spec', 'function', 'efficacy', 'application', 'form', 'process', 'origin', 'packaging'];

  var compact = function (value) { return String(value || '').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ''); };
  var nameKey = function (p) { return compact(p.name).replace(/함량/g, ''); };
  var specKey = function (p) { return compact(p.spec).replace(/함량/g, ''); };
  var isFoodform = function (p) { return /foodform/.test(compact(p && p.name)); };

  var manual = {};
  sameProduct.forEach(function (group, i) { group.forEach(function (id) { manual[id] = 'same:' + i; }); });
  var separate = {};
  keepSeparate.forEach(function (id) { separate[id] = true; });

  /* 1차 묶음: 직접 지정 → 국내 식품분류 + 제품명. 규격/함량은 dedupe() 에서 2차로 나눕니다. */
  function groupKey(p) {
    if (separate[p.id]) return 'id:' + p.id;
    if (manual[p.id]) return manual[p.id];
    return [p.catalogType || '', nameKey(p)].join('|');
  }
  /* 2차 묶음: 규격/함량별. 빈칸은 입력된 규격이 한 가지뿐일 때만 그 규격과 같은 제품으로 봅니다. */
  function splitBySpec(list) {
    var specs = [];
    list.forEach(function (p) { var s = specKey(p); if (s && specs.indexOf(s) < 0) specs.push(s); });
    var fallback = specs.length === 1 ? specs[0] : '';
    var out = {}, order = [];
    list.forEach(function (p) {
      var s = specKey(p) || fallback;
      if (!out[s]) { out[s] = []; order.push(s); }
      out[s].push(p);
    });
    return order.map(function (s) { return out[s]; });
  }
  function filled(p) { return COMPLETENESS.reduce(function (n, k) { var v = String(p[k] || '').trim(); return n + (v && v !== '-' ? 1 : 0); }, 0); }
  function pick(group) {
    return group.slice().sort(function (a, b) { return filled(b) - filled(a) || String(a.id).localeCompare(String(b.id)); })[0];
  }

  /* products 중 같은 제품을 하나로 줄입니다.
     반환: { items: 출력할 제품(입력 순서 유지), removed: [{ product, keptAs }] , groups: [[대표, 제외…], …] } */
  function dedupe(products) {
    var groups = {}, order = [];
    (products || []).forEach(function (p) {
      var k = groupKey(p);
      if (!groups[k]) { groups[k] = []; order.push(k); }
      groups[k].push(p);
    });
    var final = [];
    order.forEach(function (k) {
      if (/^(id|same):/.test(k)) final.push(groups[k]);          // 직접 지정 묶음은 규격과 관계없이 하나
      else splitBySpec(groups[k]).forEach(function (g) { final.push(g); });
    });
    var keep = {}, removed = [], multi = [];
    final.forEach(function (g) {
      var rep = pick(g);
      keep[rep.id] = true;
      if (g.length > 1) {
        multi.push([rep].concat(g.filter(function (p) { return p !== rep; })));
        g.forEach(function (p) { if (p !== rep) removed.push({ product: p, keptAs: rep }); });
      }
    });
    return { items: (products || []).filter(function (p) { return keep[p.id]; }), removed: removed, groups: multi };
  }

  window.ECHO_PRINT_RULES = { version: '2026-11-10-v9.4', sameProduct: sameProduct, keepSeparate: keepSeparate };
  window.EchoPrintRules = {
    FOODFORM_LABEL: 'Foodform®',
    isFoodform: isFoodform,
    dedupe: dedupe,
    groupKey: groupKey,
    sameProduct: sameProduct,
    keepSeparate: keepSeparate
  };
})();
