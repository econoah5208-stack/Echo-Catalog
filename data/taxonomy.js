/* Echo Trading 원료 분야(8개 상위 그룹) 매핑 — 공개용 설정 파일
 *
 * 목적
 *  - 회사소개서 2026 p.9의 '8개 원료 포트폴리오'를 웹의 상위 탐색 체계로 사용합니다.
 *  - Excel 제품마스터의 32개 대분류(category)는 그대로 유지하고, 이 파일에서만 상위 그룹으로 연결합니다.
 *  - 제품코드 목록이 아니라 대분류(필요 시 소분류) 이름으로 연결하므로 제품이 추가돼도 자동으로 분류됩니다.
 *
 * 관리 규칙
 *  1) 새 대분류가 Excel에 생기면 아래 groups[].categories 중 한 곳에 반드시 추가하세요.
 *     (scripts/verify_catalog.mjs 가 매핑되지 않은 대분류를 오류로 알려줍니다.)
 *  2) subcategoryRules 는 같은 대분류 안에서 일부 소분류만 다른 그룹으로 보내야 할 때만 사용합니다.
 *     현재 '기타 원료' 중 지질 계열 3개 소분류를 '유지·지질 소재'로 연결해 회사소개서 수치(13건)와 맞춥니다.
 *     이 3줄을 지우면 대분류 단위 매핑만 남으며, 그룹 수치는 식물추출물·기능성 소재 118 / 유지·지질 소재 10 이 됩니다.
 *  3) 대분류·소분류 이름은 Excel 값과 글자 하나까지 같아야 합니다. 이름을 바꾸지 말고 매핑만 수정하세요.
 */
(function () {
  'use strict';

  var groups = [
    {
      id: 'yeast-lacto', no: '01', name: '효모·유산균 유래 영양소', en: 'Yeast & Lactobacillus',
      desc: 'Foodform® in Yeast · Lactobacillus 계열 영양소 원료와 프로바이오틱 균주 원료',
      highlights: ['FM0009', 'FM0033', 'FM0034'],
      categories: ['유산균·효모']
    },
    {
      id: 'fruit-veg', no: '02', name: '과일·채소 원료', en: 'Fruit & Vegetable',
      desc: '과즙 농축액·착즙액, 퓨레, 과일·채소 분말',
      highlights: ['PF0048', 'PF0067', 'PF0026'],
      categories: ['과일·채소 원료']
    },
    {
      id: 'botanicals', no: '03', name: '식물추출물·기능성 소재', en: 'Botanicals & Actives',
      desc: '식물 추출분말·농축액, 버섯·차·허브 원료, NAG·히알루론산 등 기능성 소재',
      highlights: ['BE0028', 'BE0054', 'CH0001'],
      categories: ['식물추출물', '기타 원료', '버섯 원료', '차·허브 원료']
    },
    {
      id: 'nutrients', no: '04', name: '아미노산·비타민·미네랄', en: 'Amino Acids · Vitamins · Minerals',
      desc: 'L-아르지닌·L-테아닌·타우린 등 아미노산, 비타민, 칼슘 등 미네랄',
      highlights: ['PR0003', 'VI0001', 'MI0003'],
      categories: ['아미노산', '비타민', '미네랄', '비타민·미네랄 프리믹스']
    },
    {
      id: 'proteins', no: '05', name: '단백질·콜라겐·펩타이드', en: 'Proteins · Collagen · Peptides',
      desc: '저분자 피쉬콜라겐, 산양유·초유·귀리 단백',
      highlights: ['PR0022', 'PR0014', 'PR0010'],
      categories: ['단백질 원료', '콜라겐·펩타이드']
    },
    {
      id: 'lipids', no: '06', name: '유지·지질 소재', en: 'Oils & Lipids',
      desc: '정제어유, 레시틴, 식물성 유지와 지질 계열 소재',
      highlights: ['LI0007', 'LI0012', 'LI0009'],
      categories: ['유지류', '유화제']
    },
    {
      id: 'sweeteners', no: '07', name: '감미료·식이섬유·첨가물', en: 'Sweeteners · Fibers · Additives',
      desc: '당알코올·올리고당, 식이섬유, 산미료·보존료·향료',
      highlights: ['CH0019', 'CH0016', 'OA0002'],
      categories: ['당류·감미료', '식이섬유', '산미료', '보존료', '향료', '전분·덱스트린']
    },
    {
      id: 'others', no: '08', name: '곡물·난·유가공 등 기타', en: 'Other Food Ingredients',
      desc: '난황·난백, 크리머, 곡물·조미 원료와 기타 식품 원료',
      highlights: ['AF0009', 'MX0032', 'PF0099'],
      categories: ['곡물·두류 원료', '난가공 원료', '유가공 원료', '조미 원료', '음료·디저트 원료', '식초', '견과 원료', '수산 원료', '동물성 추출물', '효소 원료', '완제품', '미분류']
    }
  ];

  /* 같은 대분류 안의 일부 소분류만 다른 그룹으로 연결하는 예외 규칙 */
  var subcategoryRules = [
    { category: '기타 원료', subcategory: '스테아린산', group: 'lipids' },
    { category: '기타 원료', subcategory: '옥타코사놀', group: 'lipids' },
    { category: '기타 원료', subcategory: '포스파티딜세린', group: 'lipids' }
  ];

  /* 원산지 표기 → 국가·지역. 공개 데이터의 '원산지' 값에서 해외 원산지 국가 수를 자동 집계할 때 사용합니다.
     key: 데이터에 쓰인 표기, name: 화면 표시명. 긴 표기부터 먼저 찾습니다(인도네시아 → 인도 순서 보장). */
  var regions = [
    { id: 'asia', name: '아시아', en: 'Asia', countries: { '중국': '중국', '인도네시아': '인도네시아', '인도': '인도', '인디아': '인도', '베트남': '베트남', '대만': '대만', '일본': '일본', '우즈벡': '우즈베키스탄', '우즈백': '우즈베키스탄', '필리핀': '필리핀', '싱가포르': '싱가포르', '태국': '태국', '말레이시아': '말레이시아' } },
    { id: 'europe', name: '유럽', en: 'Europe', countries: { '스페인': '스페인', '폴란드': '폴란드', '덴마크': '덴마크', '이탈리아': '이탈리아', '이태리': '이탈리아', '독일': '독일', '프랑스': '프랑스', '네덜란드': '네덜란드', '핀란드': '핀란드', '오스트리아': '오스트리아', '영국': '영국', '세르비아': '세르비아', '러시아': '러시아', '헝가리': '헝가리', '에스토니아': '에스토니아', '벨기에': '벨기에', '그리스': '그리스', '스웨덴': '스웨덴' } },
    { id: 'north-america', name: '북미', en: 'North America', countries: { '미국': '미국', '캐나다': '캐나다' } },
    { id: 'middle-east', name: '중동', en: 'Middle East', countries: { '이스라엘': '이스라엘', '터키': '튀르키예', '튀르키예': '튀르키예' } },
    { id: 'latin-america', name: '중남미', en: 'Latin America', countries: { '브라질': '브라질', '칠레': '칠레', '멕시코': '멕시코', '페루': '페루' } },
    { id: 'oceania', name: '오세아니아', en: 'Oceania', countries: { '뉴질랜드': '뉴질랜드', '호주': '호주' } }
  ];

  var categoryToGroup = {};
  groups.forEach(function (g) { g.categories.forEach(function (c) { categoryToGroup[c] = g.id; }); });
  var ruleKey = function (category, subcategory) { return category + '\u0000' + subcategory; };
  var ruleMap = {};
  subcategoryRules.forEach(function (r) { ruleMap[ruleKey(r.category, r.subcategory)] = r.group; });
  var byId = {};
  groups.forEach(function (g) { byId[g.id] = g; });

  var countryIndex = [];
  regions.forEach(function (r) { Object.keys(r.countries).forEach(function (k) { countryIndex.push({ key: k, name: r.countries[k], region: r.id }); }); });
  countryIndex.sort(function (a, b) { return b.key.length - a.key.length; });

  /* 제품 → 원료 분야 id. 매핑되지 않은 대분류는 '' 를 돌려줍니다(검증 스크립트가 오류로 표시). */
  function groupOf(product) {
    if (!product) return '';
    var category = String(product.category || '').trim();
    var sub = String(product.subcategory || '').trim();
    return ruleMap[ruleKey(category, sub)] || categoryToGroup[category] || '';
  }

  /* 원산지 문자열 → [{name, region}] (해외 국가만, 중복 제거) */
  function countriesOf(origin) {
    var text = String(origin || '');
    var found = [];
    countryIndex.forEach(function (c) {
      if (text.indexOf(c.key) !== -1) {
        text = text.split(c.key).join(' ');
        if (!found.some(function (f) { return f.name === c.name; })) found.push({ name: c.name, region: c.region });
      }
    });
    return found;
  }

  window.ECHO_TAXONOMY = {
    version: '2026-10-23',
    source: '에코트레이딩 회사소개서 2026 p.9 · 회사제품_데이터베이스_분류개선(5).xlsx 32개 대분류',
    groups: groups,
    subcategoryRules: subcategoryRules,
    regions: regions
  };
  window.EchoTaxonomy = {
    groups: groups,
    group: function (id) { return byId[id] || null; },
    groupOf: groupOf,
    countriesOf: countriesOf,
    regions: regions
  };
})();
