/* Echo Trading 제품 정리 규칙 — 홈페이지 제품 목록 · 인쇄 / PDF 공통 (v9.4)
 *
 * 원본 제품 데이터(data/catalog.js)는 바꾸지 않습니다. 화면에 보여 주거나 출력할 때 이 규칙을 적용합니다.
 * 제품 편집기(manage.html)는 원본 그대로 모든 제품을 보여 줍니다.
 *
 * 1. 같은 제품명 중복 제거 — 홈페이지 제품 목록과 인쇄 / PDF 모두 (HIDE_DUPLICATES_ON_SITE)
 *    국내 식품분류 · 제품명 · 규격/함량(Excel '수치' 열)이 모두 같으면 같은 제품으로 보고 1개만 보여 줍니다.
 *    - 제품명·규격을 비교할 때 띄어쓰기·줄바꿈·대소문자·전각/반각 차이, '함량' 글자, brix/bx 표기 차이는 무시합니다.
 *      예) '세인트존스워트 추출분말(멜라토닌함량 2%)' = '세인트존스워트추출분말(멜라토닌2%)', 규격 '65bx' = '65brix'
 *    - 규격/함량이 다르면 제품명이 같아도 각각 보여 줍니다.
 *      예) Foodform® Selenium 1,400-1,650 ㎍/g · 950㎍/g → 2개 모두
 *          알로에베라겔파우더 100:1 · 200:1, 도라지농축액 · 도라지농축액 90% → 각각
 *    - 규격/함량 칸이 비어 있으면 '미입력'으로 봅니다. 같은 이름 제품들에 입력된 규격이 한 가지뿐이면 그 제품과 같은 것으로 봅니다.
 *      예) 정제어유 (Refined Fish oil 18/12 TG) — LI0007 빈칸 · LI0008 '18/12 TG' → 1개
 *      입력된 규격이 두 가지 이상이면 빈칸 제품은 어느 쪽인지 알 수 없으므로 따로 보여 줍니다.
 *    - 대표로 보여 주는 제품: 공개 항목(원산지·포장단위·지표성분 등)이 가장 많이 채워진 제품, 같으면 제품코드가 빠른 제품.
 *      다른 제품의 값을 섞지 않습니다.
 *    - 숨겨진 제품의 제품코드로 검색하거나 그 코드의 상세 주소(?product=코드)로 들어오면 대표 제품을 보여 줍니다.
 *    - HIDE_DUPLICATES_ON_SITE 를 false 로 바꾸면 홈페이지에는 모든 제품을 보여 주고,
 *      인쇄 / PDF 에서만 출력 설정 창의 「같은 제품명은 한 번만 출력」으로 중복을 뺍니다.
 *
 * 2. Foodform® 별도 페이지 — 인쇄 / PDF
 *    제품명에 'Foodform'이 들어간 제품(띄어쓰기·대소문자 무시: Food Form, FOODFORM 도 포함)을 한데 모아
 *    다른 제품과 섞지 않고 별도 페이지에 출력합니다. 위치(맨 앞 / 맨 뒤)는 출력 설정 창에서 고릅니다.
 *    출력물에서는 효모 유래 / 유산균 유래 / 배양·식물농축 3개로 나눠 이 순서로 싣습니다(FOODFORM_GROUPS).
 *
 * 3. sameProduct — 이름 표기가 달라도 같은 제품(직접 지정). 묶음 안에서 대표 1개만 보여 줍니다.
 *    가능하면 Excel 제품명을 같게 고치는 것을 권장합니다(2026-11-10 Excel 수정으로 기존 지정 3묶음 중 2묶음이 자동 처리됨).
 *
 * 4. keepSeparate — 이름이 같아도 따로 보여 줄 제품코드(직접 지정).
 *
 * 수정 후 node scripts/verify_catalog.mjs --duplicates 로 점검하세요(없는 제품코드·중복 지정은 오류로 알려 줍니다).
 */
(function () {
  'use strict';

  /* true: 홈페이지 제품 목록에서도 중복 제품을 숨깁니다(인쇄 / PDF 는 항상 홈페이지 목록 기준). */
  var HIDE_DUPLICATES_ON_SITE = true;

  /* 예) ['BE0001', 'BE0002'] — 이름 표기가 달라도 같은 제품일 때만 사용. 가능하면 Excel 제품명을 같게 고치세요. */
  var sameProduct = [];

  var keepSeparate = [];

  /* 대표 제품을 고를 때 채워진 정도를 세는 공개 항목 */
  var COMPLETENESS = ['marker', 'spec', 'function', 'efficacy', 'application', 'form', 'process', 'origin', 'packaging'];

  var compact = function (value) { return String(value || '').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ''); };
  var tidy = function (value) { return compact(value).replace(/함량/g, '').replace(/(\d)bx(?![a-z])/g, '$1brix'); };
  var nameKey = function (p) { return tidy(p.name); };
  var specKey = function (p) { return tidy(p.spec); };
  var isFoodform = function (p) { return /foodform/.test(compact(p && p.name)); };

  /* Foodform® 출력 구분(v9.5): 제품명 기준 3개. 순서대로 출력합니다.
     - 효모 유래: 이름에 'in Yeast'        (소분류 영양효모)
     - 유산균 유래: 이름에 'Lactobacillus'  (소분류 유산균 배양물)
     - 배양·식물농축: 그 밖의 Foodform®     (소분류 영양성분 함유 배양물 · 식물농축물) */
  var FOODFORM_GROUPS = [
    { id: 'yeast', no: 'FF1', label: '효모 유래', title: 'Foodform® 효모 유래 원료', en: 'FOODFORM® IN YEAST' },
    { id: 'lactobacillus', no: 'FF2', label: '유산균 유래', title: 'Foodform® 유산균 유래 원료', en: 'FOODFORM® LACTOBACILLUS' },
    { id: 'other', no: 'FF3', label: '배양·식물농축', title: 'Foodform® 배양 영양소 · 식물농축물', en: 'FOODFORM® CULTURED & PLANT CONCENTRATE' }
  ];
  function foodformGroup(p) {
    var n = compact(p && p.name);
    var id = /inyeast/.test(n) ? 'yeast' : /lactobacillus/.test(n) ? 'lactobacillus' : 'other';
    for (var i = 0; i < FOODFORM_GROUPS.length; i++) if (FOODFORM_GROUPS[i].id === id) return { id: id, order: i, group: FOODFORM_GROUPS[i], label: FOODFORM_GROUPS[i].label };
  }

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

  /* 홈페이지에 보여 줄 제품 목록. aliasOf: 숨긴 제품코드 → 대표 제품코드 */
  function siteProducts(products) {
    var list = (products || []).filter(function (p) { return p && p.visible !== false; });
    var result = HIDE_DUPLICATES_ON_SITE ? dedupe(list) : { items: list, removed: [], groups: [] };
    var aliasOf = {};
    result.removed.forEach(function (r) { aliasOf[r.product.id] = r.keptAs.id; });
    result.aliasOf = aliasOf;
    return result;
  }

  var api = {
    version: '2026-11-10-v9.4',
    HIDE_DUPLICATES_ON_SITE: HIDE_DUPLICATES_ON_SITE,
    FOODFORM_LABEL: 'Foodform®',
    isFoodform: isFoodform,
    FOODFORM_GROUPS: FOODFORM_GROUPS,
    foodformGroup: foodformGroup,
    dedupe: dedupe,
    siteProducts: siteProducts,
    sameProduct: sameProduct,
    keepSeparate: keepSeparate
  };
  window.EchoCatalogRules = api;
  window.EchoPrintRules = api; // 이전 이름 호환
})();
