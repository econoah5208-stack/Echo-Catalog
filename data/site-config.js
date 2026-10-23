/* Echo Trading 공통 회사 정보 — 헤더·본문·푸터·PDF 출력물이 모두 이 파일을 읽습니다.
 *
 * - 값을 바꾸면 웹 화면과 인쇄/PDF 자료에 함께 반영됩니다.
 * - 확인되지 않은 정보는 null 로 두세요. null 인 항목은 화면과 출력물에 표시되지 않습니다.
 * - 각 항목의 source 는 값의 출처 메모이며 화면에는 표시되지 않습니다.
 *
 * ⚠ 2026-10-23 기준 확인 필요 사항
 *   회사소개서(2026)와 기존 웹사이트(v8.4)의 연락처가 다릅니다. 확인 전까지 기존 웹사이트 값을 유지합니다.
 *   - 전화: 소개서 070-4410-0473 / 웹 070-8652-1774 (현재 표시: 웹 값)
 *   - 이메일: 소개서 info@echot.com (웹 도메인 echotra.com 과 다름) → 확인 전 비공개(null)
 *   - 주소: 소개서 '경기도 성남시 분당구 백현로 100, 정자아이파크 1401호'
 *           웹 '# 1401 Jeongja I’PARK 27, Jeongja-dong, Bundang-gu, ...' (현재 표시: 웹 값, 국문 주소는 확인 후 입력)
 */
window.ECHO_SITE = {
  company: {
    nameKo: '에코트레이딩',
    nameEn: 'Echo Trading Co.,Ltd',
    brand: 'ECHO TRADING',
    philosophy: '건강한 원료, 건강한 사회',
    slogan: 'Global Ingredients. Reliable Solutions.',
    closing: 'Better Ingredients. Better Partnerships.'
  },

  contact: {
    tel: { label: '070-8652-1774', intl: '+82-70-8652-1774', href: 'tel:+827086521774', source: '기존 웹사이트 v8.4' },
    fax: { label: '031-742-0474', intl: '+82-31-742-0474', href: 'tel:+82317420474', source: '기존 웹사이트 v8.4' },
    email: null, /* 소개서 표기 info@echot.com — 도메인 확인 후 { label: '...', href: 'mailto:...' } 형태로 입력 */
    web: { label: 'www.echotra.com', href: 'https://www.echotra.com', source: '기존 웹사이트 v8.4 · 회사소개서 2026' },
    addressKo: null, /* 소개서 표기: 경기도 성남시 분당구 백현로 100, 정자아이파크 1401호 — 확인 후 입력 */
    addressEn: '# 1401 Jeongja I’PARK 27, Jeongja-dong, Bundang-gu, Seongnam-City, Gyeonggi-do, 13596, South Korea'
  },

  /* 기업 핵심 지표. auto 항목은 data/catalog.js 에서 자동 집계합니다.
     매출액 등 공개 승인되지 않은 정보는 넣지 마세요. */
  facts: [
    { value: '2010', unit: '년', label: '식품원료 사업 시작', source: '회사소개서 2026 p.4 (2010.09)' },
    { auto: 'products', unit: '개', label: '등록 제품', source: 'data/catalog.js 자동 집계' },
    { auto: 'originCountries', unit: '개국', label: '등록 원료의 해외 원산지', source: 'data/catalog.js 원산지 자동 집계' },
    { value: '65', unit: '개사', label: '홈페이지 게시 해외 파트너', source: '회사소개서 2026 p.5·p.19 (2026-10-23 갱신)' }
  ],

  /* 해외 파트너 지역 분포(회사소개서 2026 p.19). 업체명은 공개 승인 전까지 표시하지 않습니다. */
  partners: {
    total: 65,
    basis: '홈페이지 게시 해외 파트너 기준',
    source: '회사소개서 2026 p.19 (2026-10-23 갱신: 4개사 추가, Briess 제외·Senson Oy 추가)',
    regions: [
      { id: 'asia', name: '아시아', en: 'Asia', count: 24 },
      { id: 'europe', name: '유럽', en: 'Europe', count: 21 },
      { id: 'north-america', name: '북미', en: 'North America', count: 13 },
      { id: 'south-america', name: '남미', en: 'South America', count: 4 },
      { id: 'oceania', name: '오세아니아', en: 'Oceania', count: 3 }
    ]
  },

  /* 국내 고객사 분포(회사소개서 2026 p.18). 고객사명·로고는 사용 승인 전까지 표시하지 않습니다.
     표시하지 않으려면 show 를 false 로 바꾸세요. */
  domesticClients: {
    show: true,
    source: '회사소개서 2026 p.18 (2026-10-23 갱신: 판매 거래처 반영, 동진제약 제외)',
    segments: [
      { name: '일반식품 고객사', en: 'Food & Beverage', count: 37 },
      { name: '건강기능식품 고객사', en: 'Health Functional Food', count: 36 },
      { name: 'OEM·ODM 고객사', en: 'OEM · ODM', count: 14 }
    ]
  },

  /* Foodform® 대표 원료 영역. 제조사명은 공개 승인 후 public 을 true 로 바꾸면 표시됩니다. */
  foodform: {
    manufacturer: { name: 'Intracell Nutrition Inc.', region: 'North America', public: false, source: '회사소개서 2026 p.6' },
    /* 계열 설명은 회사소개서 p.7·p.8 문구를 사용합니다. 효능·흡수율 등 일반화된 기능 표현은 넣지 마세요.
       featured: 대표로 보여줄 제품코드(같은 소분류 안에서 선택). 함량은 data/catalog.js 의 '규격 / 함량' 값을 그대로 표시합니다. */
    yeast: { subcategory: '영양효모', en: 'Foodform® in Yeast', title: '효모 유래 영양소', desc: '비타민·미네랄을 효모(in Yeast) 형태로 공급하는 원료 계열입니다.', featured: ['FM0009', 'FM0032', 'FM0005', 'FM0021'] },
    lactobacillus: { subcategory: '유산균 배양물', en: 'Foodform® Lactobacillus', title: '유산균 배양 유래 영양소', desc: '비타민·미네랄을 유산균(Lactobacillus) 배양물 형태로 공급하는 원료 계열입니다.', featured: ['FM0010', 'FM0011', 'FM0033', 'FM0020'] },
    others: [
      { subcategory: '영양성분 함유 배양물', name: '영양성분 함유 배양물', en: 'Cultured Nutrients' },
      { subcategory: '식물농축물', name: '식물 농축물', en: 'In Plant Concentrate' }
    ]
  }
};
