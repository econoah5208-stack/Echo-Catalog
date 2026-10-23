/* Echo Trading 인체 기능 분류 — 「A4 세로 · 인체 기능형 카탈로그」 출력 전용 설정 파일
 *
 * 원본 제품 데이터(data/catalog.js)는 바꾸지 않고, 제품코드별 대표 기능 분류와 보조 태그만 이 파일에서 관리합니다.
 *
 * 분류 기준 (2026-10-23 · v9.2 · 회사 검토 전 초안)
 *  1. 01~10 인체 기능: 대표 분류 = 제품 DB '효능'에 명시된 첫 번째 구체적 인체 기능(장 건강, 간 건강, 수면, 혈행, 혈당, 면역, 뼈, 피부 등).
 *     '항산화', '영양 공급', '에너지 공급', '풍미'처럼 특정 부위를 가리키지 않는 표현은 인체 부위에 연결하지 않습니다.
 *  2. 11~20 일반 식품원료는 원료 종류·제조 역할로 나눕니다. 효능 문구에 건강 표현이 있어도 언급된 기능은 보조 태그로만 표시합니다.
 *     겹칠 때의 우선순위: ① 조미·산미·향미·감미료·당류(대분류가 조미 원료·식초·산미료·향료·당류·감미료인 원료)
 *     ② 곡류·두류(형태와 관계없이: 곡물 농축액·페이스트·발효분말 포함) ③ 농축액·퓨레·페이스트(과일·채소·견과·식물)
 *     ④ 나머지 과일 원료(분말·농축분말·착즙액·건조 과일·과일 추출물) → 과실류 유래, 채소·서류 분말 → 채소·서류.
 *     18번 감미료는 고감미도 감미료, 19번 당류는 당알코올·벌꿀·시럽·이당류입니다.
 *     장 건강 근거가 있는 올리고당·락추로스, 인체 기능 근거가 있는 과일·곡물 추출물은 01~10에 그대로 둡니다.
 *  3. 효능 정보가 없거나, 규격서 확인이 필요하거나, 질병 관련 표현이 있는 제품은 21번 '기타 · 분류 확인 필요'.
 *  4. 같은 원료(성분)의 제품은 같은 대표 분류를 사용합니다.
 *  5. 한 제품은 대표 분류 하나에만 출력됩니다. 다른 관련 기능은 tags 로 표시합니다.
 *  6. 이 파일에 없는 제품(새로 추가한 제품 등)은 자동으로 '기타 · 분류 확인 필요'로 출력되어 누락되지 않습니다.
 *
 * 수정 방법: products 의 값 ['대표 분류', '보조 태그', ...] 를 고치고, 필요하면 notes 에 근거를 적으세요.
 *            분류 id 는 아래 areas 의 id 만 사용할 수 있습니다. 수정 후 node scripts/verify_catalog.mjs 로 점검하세요.
 * 주의: 이 분류는 원료 탐색을 위한 참고용이며, 제품별 표시 가능한 기능성(건강기능식품 인정 내용 등)을 뜻하지 않습니다.
 */
(function () {
  'use strict';

  var areas = [
    { id: 'brain', no: '01', kind: 'body', name: '뇌 · 신경', title: '뇌 · 신경 기능 관련 원료', en: 'BRAIN & NERVES', hint: '인지 · 수면 · 스트레스', anchor: 'head' },
    { id: 'resp', no: '02', kind: 'body', name: '호흡기', title: '호흡기 · 목 관련 원료', en: 'RESPIRATORY', hint: '기관지 · 목', anchor: 'throat' },
    { id: 'circ', no: '03', kind: 'body', name: '심혈관 · 혈액', title: '심혈관 · 혈액 순환 관련 원료', en: 'CARDIOVASCULAR & BLOOD', hint: '혈행 · 혈중 지질 · 혈액 생성', anchor: 'heart' },
    { id: 'liver', no: '04', kind: 'body', name: '간', title: '간 건강 관련 원료', en: 'LIVER', hint: '간 건강 · 숙취', anchor: 'liver' },
    { id: 'gut', no: '05', kind: 'body', name: '장 · 소화', title: '장 건강 · 소화 관련 원료', en: 'DIGESTIVE HEALTH', hint: '장 환경 · 배변 · 소화', anchor: 'gut' },
    { id: 'meta', no: '06', kind: 'body', name: '대사 · 활력', title: '대사 · 활력 관련 원료', en: 'METABOLISM & VITALITY', hint: '혈당 · 체지방 · 에너지 대사 · 피로', anchor: 'abdomen' },
    { id: 'immune', no: '07', kind: 'body', name: '면역', title: '면역 관련 원료', en: 'IMMUNE', hint: '전신', anchor: 'whole' },
    { id: 'muscle', no: '08', kind: 'body', name: '근육 · 운동', title: '근육 · 운동 관련 원료', en: 'MUSCLE & EXERCISE', hint: '지구력 · 운동 회복', anchor: 'thigh' },
    { id: 'bone', no: '09', kind: 'body', name: '뼈 · 관절', title: '뼈 · 관절 관련 원료', en: 'BONE & JOINT', hint: '뼈 · 연골 · 칼슘', anchor: 'knee' },
    { id: 'skin', no: '10', kind: 'body', name: '피부 · 모발', title: '피부 · 모발 관련 원료', en: 'SKIN & HAIR', hint: '보습 · 탄력', anchor: 'shin' },
    { id: 'nutrition', no: '11', kind: 'general', name: '일반 영양 원료', title: '일반 영양 원료', en: 'GENERAL NUTRITION', hint: '단백질 · 비타민 · 영양 보충' },
    { id: 'grain', no: '12', kind: 'general', name: '곡류 · 두류', title: '곡류 · 두류 원료', en: 'GRAINS & LEGUMES', hint: '곡물 분말 · 귀리 · 곡물 농축액' },
    { id: 'fruit', no: '13', kind: 'general', name: '과실류 유래', title: '과실류 유래 원료 · 추출물', en: 'FRUIT-DERIVED', hint: '과일 분말 · 착즙액 · 건조 과일 · 추출물' },
    { id: 'veg', no: '14', kind: 'general', name: '채소 · 서류', title: '채소 · 서류 원료', en: 'VEGETABLES & TUBERS', hint: '채소 분말 · 고구마 · 타로' },
    { id: 'concentrate', no: '15', kind: 'general', name: '농축액 · 퓨레 · 페이스트', title: '농축액 · 퓨레 · 페이스트', en: 'CONCENTRATES · PUREES · PASTES', hint: '과즙·채소 농축액 · 퓨레 · 페이스트' },
    { id: 'flavor', no: '16', kind: 'general', name: '향미', title: '향미 원료', en: 'FLAVORINGS', hint: '식품향료 · 풍미 베이스' },
    { id: 'seasoning', no: '17', kind: 'general', name: '조미 · 산미', title: '조미 · 산미 원료', en: 'SEASONINGS & ACIDULANTS', hint: '엑기스 · 식초 · 산미료' },
    { id: 'sweetener', no: '18', kind: 'general', name: '감미료', title: '감미료', en: 'SWEETENERS', hint: '고감미도 감미료' },
    { id: 'sugar', no: '19', kind: 'general', name: '당류', title: '당류 원료', en: 'SUGARS & POLYOLS', hint: '당알코올 · 벌꿀 · 시럽 · 이당류' },
    { id: 'processing', no: '20', kind: 'general', name: '식품 가공 · 물성', title: '식품 가공 · 물성 원료', en: 'FOOD PROCESSING & TEXTURE', hint: '유화 · 보존 · 물성' },
    { id: 'check', no: '21', kind: 'review', name: '기타 · 분류 확인 필요', title: '기타 · 분류 확인 필요 원료', en: 'OTHERS · TO BE CONFIRMED', hint: '근거·규격 확인 후 분류' }
  ];

  /* 제품코드: [대표 분류, 보조 태그...]  — 분류별로 묶어 두었습니다(주석은 DB 대분류 · 제품명). */
  var products = {
    /* 01 뇌 · 신경 — 19개 */
    'BE0031': ['brain'], // 식물추출물 · 미배아발효추출분말 (GABA 15%)
    'BE0050': ['brain'], // 식물추출물 · 세인트존스워트 추출분말(멜라토닌1%)
    'BE0051': ['brain'], // 식물추출물 · 세인트존스워트 추출분말(멜라토닌함량 2%)
    'BE0052': ['brain'], // 식물추출물 · 세인트존스워트추출분말(멜라토닌2%)
    'BE0066': ['brain'], // 식물추출물 · 원지추출분말 SR-24367
    'BE0070': ['brain', 'gut'], // 식물추출물 · 캐모마일추출분말
    'BE0071': ['brain'], // 식물추출물 · 타트체리추출분말(멜라토닌 함량 2%)
    'BE0072': ['brain'], // 식물추출물 · 포도추출분말(멜라토닌 1%)
    'BE0074': ['brain'], // 식물추출물 · 피스타치오추출분말(멜라토닌 3.2%)
    'BE0079': ['brain', 'skin'], // 식물추출물 · 화이트토마토추출분말 (멜라토닌 함량 2%)
    'DC0007': ['brain', 'meta'], // 기타 원료 · 주석산수소콜린
    'FM0004': ['brain'], // 유산균·효모 · Foodform® Choline
    'LI0011': ['brain'], // 기타 원료 · 포스파티딜세린20F
    'PF0058': ['brain'], // 차·허브 원료 · 세인트존스워트분말(멜라토닌1%)
    'PF0059': ['brain'], // 차·허브 원료 · 세인트존스워트분말(멜라토닌3%)
    'PR0002': ['brain'], // 아미노산 · GABA-A (90%)
    'PR0006': ['brain'], // 아미노산 · L-테아닌(식첨)
    'PR0007': ['brain'], // 아미노산 · L-트립토판
    'PR0008': ['brain'], // 아미노산 · L-트립토판
    /* 02 호흡기 — 3개 */
    'BE0019': ['resp'], // 식물추출물 · 도라지농축액
    'BE0020': ['resp'], // 식물추출물 · 도라지농축액
    'BE0021': ['resp'], // 식물추출물 · 도라지농축액 90%
    /* 03 심혈관 · 혈액 — 18개 */
    'BE0004': ['circ', 'bone'], // 식물추출물 · Vitamin K1 in Alfalfa Concentrate
    'BE0053': ['circ', 'muscle'], // 식물추출물 · 수박과피추출물분말
    'BE0055': ['circ'], // 식물추출물 · 시트러스추출분말
    'BE0056': ['circ'], // 식물추출물 · 시트러스추출분말
    'BE0067': ['circ', 'brain'], // 식물추출물 · 은행잎추출분말
    'DC0008': ['circ'], // 기타 원료 · 효소처리 헤스페리딘
    'FM0006': ['circ'], // 유산균·효모 · Foodform® Folic acid
    'FM0009': ['circ'], // 유산균·효모 · Foodform® Iron in Yeast
    'FM0010': ['circ'], // 유산균·효모 · Foodform® Iron Lactobacillus
    'FM0021': ['circ', 'brain', 'meta'], // 유산균·효모 · Foodform® Vitamin B12(Cyanocobalmin) in Yeast
    'FM0029': ['circ'], // 유산균·효모 · Foodform® Vitamin B9 (Folic acid) Lactobacillus
    'LI0006': ['circ'], // 유지류 · 유기농 엑스트라버진 올리브오일
    'LI0007': ['circ'], // 유지류 · 정제어유
    'LI0008': ['circ'], // 유지류 · 정제어유 (Refined Fish oil 18/12 TG)
    'LI0010': ['circ'], // 유지류 · 치아씨드오일
    'MI0002': ['circ'], // 미네랄 · 글루콘산동
    'PR0003': ['circ', 'muscle'], // 아미노산 · L-아르지닌
    'UN0010': ['circ'], // 기타 원료 · 용성비타민P
    /* 04 간 — 7개 */
    'BE0033': ['liver'], // 식물추출물 · 밀크시슬
    'BE0034': ['liver'], // 식물추출물 · 밀크시슬
    'BE0035': ['liver'], // 식물추출물 · 밀크시슬
    'BE0036': ['liver'], // 식물추출물 · 밀크시슬추출분말(수용성)
    'BE0054': ['liver'], // 식물추출물 · 수용성밀크씨슬
    'BE0075': ['liver'], // 식물추출물 · 헛개나무열매농축액
    'BE0076': ['liver'], // 식물추출물 · 헛개나무열매농축액 52brix
    /* 05 장 · 소화 — 34개 */
    'BE0002': ['gut'], // 식물추출물 · Foodform® Vitamin U in Cabbage Concentrate
    'BE0022': ['gut', 'meta'], // 식물추출물 · 돼지감자추출분말
    'BE0023': ['gut'], // 식물추출물 · 레몬그라스추출분말
    'BE0025': ['gut'], // 식물추출물 · 매스틱파우더
    'BE0026': ['gut', 'meta'], // 식물추출물 · 매실추출농축액
    'BE0027': ['gut', 'meta'], // 식물추출물 · 매실추출물
    'BE0028': ['gut'], // 식물추출물 · 맥아추출분말
    'BE0029': ['gut'], // 식물추출물 · 맥아추출분말
    'BE0048': ['gut', 'circ'], // 식물추출물 · 생강추출농축액 52Brix 이상
    'BE0065': ['gut'], // 식물추출물 · 엿기름추출액
    'BE0069': ['gut'], // 식물추출물 · 치커리추출분말
    'CH0002': ['gut', 'meta', 'circ'], // 식이섬유 · 난소화성말토덱스트린 (화이버솔-2)
    'CH0003': ['gut'], // 당류·감미료 · 락추로스리퀴드
    'CH0004': ['gut'], // 당류·감미료 · 락추로스솔루션
    'CH0013': ['gut', 'meta', 'circ'], // 식이섬유 · 옥수수식이섬유(난소화성말토덱스트린)
    'CH0014': ['gut', 'meta', 'circ'], // 식이섬유 · 옥수수식이섬유(난소화성말토덱스트린)
    'CH0015': ['gut'], // 식이섬유 · 유기농 아가베 이눌린
    'CH0016': ['gut'], // 당류·감미료 · 자일로올리고당분말
    'CH0021': ['gut'], // 당류·감미료 · 프락토올리고당 (GOFOS P95 GL)
    'EN0001': ['gut'], // 효소 원료 · 엔자임믹스파우더
    'FM0034': ['gut'], // 유산균·효모 · R-11 (L.rhamnosus)
    'FM0035': ['gut', 'brain'], // 유산균·효모 · R-175(L.longum)
    'FM0036': ['gut', 'brain'], // 유산균·효모 · R-52 (L.helviticus)
    'FM0039': ['gut', 'immune'], // 버섯 원료 · 버섯건조분말
    'FM0040': ['gut'], // 유산균·효모 · 식물성유산균사균체분말(10억)
    'MX0028': ['gut', 'immune'], // 완제품 · 유산균 완제품 (=17종 100억 프로바이오틱스, 아연 )
    'MX0029': ['gut', 'immune'], // 완제품 · 유산균 완제품 (=17종 100억 프로바이오틱스, 아연 ,셀레늄)
    'PF0022': ['gut'], // 과일·채소 원료 · 매실농축액
    'PF0028': ['gut'], // 과일·채소 원료 · 무화과농축액
    'PF0029': ['gut'], // 과일·채소 원료 · 무화과다이스
    'PF0065': ['gut', 'skin'], // 식물추출물 · 알로에베라겔파우더 100:1
    'PF0066': ['gut', 'skin'], // 식물추출물 · 알로에베라겔파우더 200:1
    'PF0092': ['gut'], // 과일·채소 원료 · 일반푸룬농축액
    'PF0097': ['gut'], // 식이섬유 · 차전자피분말
    /* 06 대사 · 활력 — 49개 */
    'BE0005': ['meta'], // 식물추출물 · 가르시니아 캄보지아추출분말(수용성)
    'BE0006': ['meta'], // 식물추출물 · 가시오가피농축액 65brix
    'BE0007': ['meta'], // 식물추출물 · 가시오가피농축액 65bx
    'BE0010': ['meta', 'brain'], // 식물추출물 · 과라나추출분말 (1%) - 일반식 사용가능
    'BE0011': ['meta', 'brain'], // 식물추출물 · 과라나추출분말 (1%) - 일반식 사용가능
    'BE0012': ['meta', 'brain'], // 식물추출물 · 과라나추출분말 (1%) - 일반식 사용가능
    'BE0013': ['meta', 'brain'], // 식물추출물 · 과라나추출분말 (20%이상)
    'BE0014': ['meta', 'brain'], // 식물추출물 · 과라나추출분말 (20%이상)
    'BE0015': ['meta', 'immune'], // 식물추출물 · 납작복숭아 추출분말
    'BE0016': ['meta', 'immune'], // 식물추출물 · 납작복숭아 추출분말
    'BE0017': ['meta'], // 식물추출물 · 녹차추출분말H
    'BE0037': ['meta'], // 식물추출물 · 바나바잎추출분말(코르솔산1%)
    'BE0040': ['meta'], // 식물추출물 · 브로콜리추출분말(NMN 10%)
    'BE0041': ['meta'], // 식물추출물 · 브로콜리추출분말(NMN 12%)
    'BE0042': ['meta'], // 식물추출물 · 브로콜리추출분말(NMN 3%)
    'BE0043': ['meta'], // 식물추출물 · 브로콜리추출분말(NMN 5%)
    'BE0044': ['meta'], // 식물추출물 · 브로콜리추출분말(NMN 50%)
    'BE0046': ['meta'], // 식물추출물 · 뽕잎추출분말
    'BE0047': ['meta', 'immune'], // 식물추출물 · 산삼배양근추출액
    'BE0061': ['meta'], // 식물추출물 · 여주추출물분말
    'BE0062': ['meta'], // 식물추출물 · 여주추출분말
    'BE0063': ['meta'], // 식물추출물 · 여주추출분말
    'BE0064': ['meta'], // 식물추출물 · 여주추출액
    'DC0001': ['meta', 'brain'], // 기타 원료 · (리포좀) 이노시톨
    'DC0003': ['meta', 'liver', 'brain'], // 기타 원료 · 염화콜린
    'DC0004': ['meta', 'liver', 'brain'], // 기타 원료 · 염화콜린
    'DC0005': ['meta', 'liver', 'brain'], // 기타 원료 · 염화콜린
    'DC0006': ['meta', 'brain'], // 기타 원료 · 이노시톨
    'FM0001': ['meta', 'skin'], // 유산균·효모 · Foodform® Biotin in Yeast
    'FM0005': ['meta'], // 유산균·효모 · Foodform® Copper in Yeast
    'FM0007': ['meta'], // 유산균·효모 · Foodform® GTF Chromium 10-20kg/15kg
    'FM0008': ['meta'], // 유산균·효모 · Foodform® Iodine in Yeast
    'FM0011': ['meta', 'muscle', 'bone'], // 유산균·효모 · Foodform® Magnesium Lactobacillus
    'FM0012': ['meta', 'muscle', 'bone'], // 유산균·효모 · Foodform® Manganese
    'FM0013': ['meta'], // 유산균·효모 · Foodform® Molybdenum
    'FM0014': ['meta', 'skin', 'brain'], // 유산균·효모 · Foodform® Niacinamide
    'FM0018': ['meta'], // 유산균·효모 · Foodform® Vanadium
    'FM0019': ['meta', 'brain'], // 유산균·효모 · Foodform® Vitamin B1(Thiamin) in Yeast
    'FM0020': ['meta', 'brain'], // 유산균·효모 · Foodform® Vitamin B1(Thiamin) Lactobacillus
    'FM0022': ['meta'], // 유산균·효모 · Foodform® Vitamin B2(Riboflavin) in Yeast
    'FM0023': ['meta'], // 유산균·효모 · Foodform® Vitamin B2(Riboflavin) Lactobacillus
    'FM0024': ['meta', 'skin', 'brain'], // 유산균·효모 · Foodform® Vitamin B3(Niacin) in Yeast
    'FM0025': ['meta'], // 유산균·효모 · Foodform® Vitamin B5(Pantothenic Acid) Lactobacillus
    'FM0026': ['meta'], // 유산균·효모 · Foodform® Vitamin B5(Pantothenic) in Yeast
    'FM0027': ['meta', 'brain', 'circ'], // 유산균·효모 · Foodform® Vitamin B6(Pyridoxine) in Yeast
    'FM0028': ['meta', 'brain', 'circ'], // 유산균·효모 · Foodform® Vitamin B6(Pyridoxine) Lactobacillus
    'MX0018': ['meta'], // 비타민 · 비타민복합mb
    'MX0024': ['meta'], // 식물추출물 · 오자추출분말
    'PF0040': ['meta'], // 차·허브 원료 · 보이차(PU-ERH FANNING TEA)
    /* 07 면역 — 12개 */
    'BE0024': ['immune', 'skin'], // 식물추출물 · 로즈힙추출분말
    'BE0038': ['immune', 'meta', 'circ'], // 식물추출물 · 발효홍삼농축액
    'BE0057': ['immune', 'skin'], // 식물추출물 · 아세로라추출분말
    'BE0060': ['immune'], // 식물추출물 · 엘더베리추출분말
    'BE0078': ['immune', 'meta', 'circ'], // 식물추출물 · 홍삼농축액
    'CH0023': ['immune', 'gut'], // 기타 원료 · 흑효모베타글루칸
    'FM0032': ['immune'], // 유산균·효모 · Foodform® Zinc in Yeast
    'FM0033': ['immune'], // 유산균·효모 · Foodform® Zinc Lactobacillus
    'FM0042': ['immune'], // 버섯 원료 · 영지농축액
    'FM0043': ['immune'], // 버섯 원료 · 차가버섯
    'FM0044': ['immune'], // 버섯 원료 · 차가버섯농축액
    'FM0045': ['immune', 'gut'], // 유산균·효모 · 흑효모배양액분말
    /* 08 근육 · 운동 — 9개 */
    'LI0004': ['muscle'], // 기타 원료 · 옥타코사놀 60%
    'MX0022': ['muscle'], // 아미노산 · 아미노믹스
    'PF0026': ['muscle', 'brain'], // 과일·채소 원료 · 몽모랑시타트체리분말
    'PF0089': ['muscle', 'brain'], // 과일·채소 원료 · 유기농타트체리주스분말
    'PR0005': ['muscle', 'meta'], // 아미노산 · L-오르니틴염산염
    'PR0009': ['muscle'], // 단백질 원료 · WPC 8000(유청단백)
    'PR0028': ['muscle', 'meta'], // 아미노산 · 타우린
    'PR0029': ['muscle', 'meta'], // 아미노산 · 타우린
    'PR0030': ['muscle', 'meta'], // 아미노산 · 타우린
    /* 09 뼈 · 관절 — 17개 */
    'AF0014': ['bone'], // 동물성 추출물 · 상어연골추출분말(20%)
    'BE0018': ['bone', 'circ'], // 식물추출물 · 대두추출분말
    'CH0001': ['bone'], // 기타 원료 · NAG(N-아세틸글루코사민)
    'DC0002': ['bone'], // 기타 원료 · MSM
    'FM0002': ['bone'], // 유산균·효모 · Foodform® Boron
    'FM0003': ['bone'], // 유산균·효모 · Foodform® Calcium
    'FM0017': ['bone', 'skin'], // 유산균·효모 · Foodform® Silicon
    'FM0030': ['bone', 'immune'], // 유산균·효모 · Foodform® Vitamin D3 in Yeast
    'MI0001': ['bone'], // 미네랄 · 구연산칼슘
    'MI0003': ['bone'], // 미네랄 · 밀크칼슘 (=유청칼슘)
    'MX0016': ['bone'], // 비타민 · 비타민D혼합제제 (비건)
    'MX0030': ['bone'], // 미네랄 · 칼슘혼합제제 (Solfa-Ca1000S)
    'PF0064': ['bone'], // 미네랄 · 아쿠아민F(식용해조분말-F)
    'PR0032': ['bone'], // 기타 원료 · 폴리감마글루탐산
    'PR0033': ['bone'], // 기타 원료 · 폴리감마글루탐산 (PGA)
    'PR0034': ['bone'], // 기타 원료 · 폴리감마글루탐산 (수용성 70%, Na form)
    'UN0009': ['bone'], // 미네랄 · 액상칼슘
    /* 10 피부 · 모발 — 15개 */
    'BE0039': ['skin'], // 식물추출물 · 벚꽃추출분말
    'BE0049': ['skin'], // 식물추출물 · 석류추출분말
    'BE0058': ['skin'], // 식물추출물 · 어성초추출분말
    'BE0059': ['skin'], // 식물추출물 · 어성초추출분말
    'BE0068': ['skin', 'immune'], // 식물추출물 · 인디언구스베리(암라)추출분말
    'PR0017': ['skin'], // 콜라겐·펩타이드 · 엘라스틴
    'PR0018': ['skin'], // 콜라겐·펩타이드 · 엘라스틴 (=프로라스틴)
    'PR0019': ['skin'], // 콜라겐·펩타이드 · 엘라스틴 (Nutraceuticals)
    'PR0020': ['skin'], // 콜라겐·펩타이드 · 저분자콜라겐펩타이드 AG(개별인정형)
    'PR0021': ['skin'], // 콜라겐·펩타이드 · 저분자피쉬콜라겐(3000D->2000D)
    'PR0022': ['skin'], // 콜라겐·펩타이드 · 저분자피쉬콜라겐P(500D)
    'PR0023': ['skin'], // 콜라겐·펩타이드 · 저분자피쉬콜라겐P(500D)
    'PR0027': ['skin'], // 콜라겐·펩타이드 · 초저분자마린콜라겐P(300D)
    'PR0035': ['skin'], // 콜라겐·펩타이드 · 피쉬콜라겐파우더(태국)
    'UN0006': ['skin'], // 유가공 원료 · 밀크세라마이드분말
    /* 11 일반 영양 원료 — 38개 */
    'AF0001': ['nutrition'], // 유가공 원료 · 가당연유
    'AF0008': ['nutrition'], // 기타 원료 · 난각막콜라겐
    'AF0009': ['nutrition'], // 난가공 원료 · 난황파우더
    'AF0010': ['nutrition'], // 동물성 추출물 · 녹용추출분말
    'AF0011': ['nutrition'], // 동물성 추출물 · 녹용추출액(1brix)
    'AF0012': ['nutrition'], // 기타 원료 · 동결건조로얄젤리분말
    'AF0013': ['nutrition'], // 난가공 원료 · 동결난백
    'AF0016': ['nutrition'], // 난가공 원료 · 전란액
    'AF0017': ['nutrition', 'skin'], // 동물성 추출물 · 제비집추출분말
    'BE0001': ['nutrition'], // 식물추출물 · Foodform® Vitamin C in Citrus Concentrate
    'BE0003': ['nutrition'], // 식물추출물 · Foodform® β-Carotene in Carrot Concentrate
    'BE0030': ['nutrition'], // 식물추출물 · 모링가잎추출분말
    'BE0045': ['nutrition'], // 식물추출물 · 비수리추출분말
    'FM0015': ['nutrition'], // 유산균·효모 · Foodform® Selenium
    'FM0016': ['nutrition'], // 유산균·효모 · Foodform® Selenium
    'FM0031': ['nutrition'], // 유산균·효모 · Foodform® Vitamin E (D-ALPHA TOCOPHERYL ACETATE) Lactobacillus
    'FM0041': ['nutrition'], // 유산균·효모 · 엥게비타 지에스에이치(Engevita gsh)
    'LI0005': ['nutrition'], // 유지류 · 유기농 엑스트라버진 코코넛오일
    'LI0009': ['nutrition'], // 유지류 · 정제올리브유
    'MX0017': ['nutrition'], // 비타민·미네랄 프리믹스 · 비타민미네랄믹스-AK
    'PR0001': ['nutrition'], // 아미노산 · DL-알라닌
    'PR0004': ['nutrition', 'meta'], // 아미노산 · L-아스파트산
    'PR0010': ['nutrition'], // 단백질 원료 · 귀리단백
    'PR0011': ['nutrition'], // 아미노산 · 글리신
    'PR0012': ['nutrition'], // 단백질 원료 · 분리대두단백분말(newpro680)
    'PR0013': ['nutrition'], // 단백질 원료 · 산양유단백분말
    'PR0014': ['nutrition'], // 단백질 원료 · 산양유단백분말(MPC 80)
    'PR0015': ['nutrition'], // 단백질 원료 · 산양유단백분말55
    'PR0016': ['nutrition'], // 단백질 원료 · 알파락트알부민
    'PR0024': ['nutrition'], // 단백질 원료 · 초유농축단백분말
    'PR0025': ['nutrition'], // 단백질 원료 · 초유단백분말
    'PR0026': ['nutrition'], // 단백질 원료 · 초유단백분말 1080
    'PR0031': ['nutrition'], // 콜라겐·펩타이드 · 탈지대두단백펩타이드
    'UN0003': ['nutrition', 'skin'], // 기타 원료 · L-글루타치온 3%
    'UN0004': ['nutrition', 'skin'], // 기타 원료 · L-글루타치온 60%
    'VI0001': ['nutrition'], // 비타민 · 리포조말 비타민C
    'VI0002': ['nutrition'], // 비타민 · 비타민C
    'VI0003': ['nutrition'], // 비타민 · 비타민소다(L-아스코르빈산나트륨)
    /* 12 곡류 · 두류 — 12개 */
    'BE0032': ['grain'], // 식물추출물 · 미배아추출분말
    'BE0077': ['grain'], // 식물추출물 · 현미추출물(시럽)
    'MX0001': ['grain'], // 곡물·두류 원료 · 10곡통곡물발효효소분말2x
    'MX0002': ['grain'], // 곡물·두류 원료 · 15곡 혼합분말
    'PF0004': ['grain'], // 곡물·두류 원료 · 귀리페이스트
    'PF0018': ['grain'], // 곡물·두류 원료 · 롤드 오트
    'PF0043': ['grain'], // 곡물·두류 원료 · 볶은콩분말
    'PF0060': ['grain'], // 곡물·두류 원료 · 쌀농축액
    'PF0061': ['grain'], // 곡물·두류 원료 · 쌀발효분말
    'PF0088': ['grain'], // 곡물·두류 원료 · 유기농오르조
    'PF0099': ['grain'], // 곡물·두류 원료 · 크리스피오트 (=귀리)
    'PF0104': ['grain'], // 곡물·두류 원료 · 현미농축액
    /* 13 과실류 유래 — 27개 */
    'BE0073': ['fruit'], // 식물추출물 · 피세틴 라임추출물분말(피세틴 10%)
    'MX0010': ['fruit'], // 과일·채소 원료 · 믹스과일분말(베리믹스과일혼합분말 원료2)
    'MX0011': ['fruit'], // 과일·채소 원료 · 믹스드베리쥬스파우더
    'MX0012': ['fruit'], // 과일·채소 원료 · 믹스베리분말((베리믹스과일혼합분말 원료3)
    'MX0013': ['fruit'], // 과일·채소 원료 · 베리믹스과일혼합분말
    'MX0014': ['fruit'], // 과일·채소 원료 · 베리믹스과일혼합분말(프락토올리고당 0.1% 포함, 그래뉼X)
    'MX0026': ['fruit'], // 과일·채소 원료 · 유기농혼합베리
    'PF0002': ['fruit'], // 과일·채소 원료 · 감귤농축분말
    'PF0003': ['fruit'], // 과일·채소 원료 · 건대추분태
    'PF0013': ['fruit'], // 과일·채소 원료 · 딸기분말(베리믹스과일혼합분말 원료1)
    'PF0016': ['fruit'], // 과일·채소 원료 · 레몬과즙분말 SR-24247
    'PF0017': ['fruit'], // 과일·채소 원료 · 레몬주스분말
    'PF0035': ['fruit'], // 과일·채소 원료 · 배착즙액 / 9brix
    'PF0037': ['fruit'], // 식물추출물 · 백년초농축분말
    'PF0039': ['fruit'], // 과일·채소 원료 · 보이즌베리농축분말
    'PF0048': ['fruit'], // 과일·채소 원료 · 빌베리농축분말
    'PF0052': ['fruit'], // 과일·채소 원료 · 사과주스분말
    'PF0053': ['fruit'], // 과일·채소 원료 · 사과착즙액
    'PF0054': ['fruit'], // 과일·채소 원료 · 사과착즙액
    'PF0073': ['fruit'], // 과일·채소 원료 · 오렌지분말
    'PF0079': ['fruit'], // 과일·채소 원료 · 유기농레몬착즙액
    'PF0080': ['fruit'], // 과일·채소 원료 · 유기농레몬착즙액
    'PF0081': ['fruit'], // 과일·채소 원료 · 유기농빌베리쥬스분말
    'PF0084': ['fruit'], // 과일·채소 원료 · 유기농아사이베리동결건조분말
    'PF0091': ['fruit'], // 과일·채소 원료 · 인디언구스(암라)베리
    'PF0094': ['fruit'], // 과일·채소 원료 · 자몽착즙분말
    'PF0103': ['fruit'], // 과일·채소 원료 · 패션후르츠쥬스분말
    /* 14 채소 · 서류 — 8개 */
    'MX0027': ['veg'], // 과일·채소 원료 · 유기야채혼합분말
    'PF0044': ['veg'], // 과일·채소 원료 · 부추농축분말 24017
    'PF0045': ['veg'], // 과일·채소 원료 · 부추착즙액분말
    'PF0068': ['veg'], // 과일·채소 원료 · 양배추농축분말
    'PF0070': ['veg'], // 과일·채소 원료 · 양파분말
    'PF0076': ['veg'], // 과일·채소 원료 · 우베파우더
    'PF0095': ['veg'], // 과일·채소 원료 · 자색고구마분말
    'PF0100': ['veg'], // 과일·채소 원료 · 타로분말
    /* 15 농축액 · 퓨레 · 페이스트 — 56개 */
    'BE0008': ['concentrate'], // 식물추출물 · 감초농축액
    'BE0009': ['concentrate'], // 식물추출물 · 계피농축액F
    'MX0003': ['concentrate'], // 과일·채소 원료 · ABC농축액
    'MX0009': ['concentrate'], // 과일·채소 원료 · 매실혼합농축액
    'MX0021': ['concentrate'], // 식물추출물 · 식물혼합농축액72
    'PF0001': ['concentrate'], // 과일·채소 원료 · DI사과농축액
    'PF0006': ['concentrate'], // 과일·채소 원료 · 당근혼탁농축액
    'PF0007': ['concentrate'], // 과일·채소 원료 · 대추농축액 65brix
    'PF0008': ['concentrate'], // 과일·채소 원료 · 대파농축액
    'PF0009': ['concentrate'], // 과일·채소 원료 · 두리안퓨레
    'PF0010': ['concentrate'], // 과일·채소 원료 · 딸기농축과즙
    'PF0011': ['concentrate'], // 과일·채소 원료 · 딸기농축액
    'PF0012': ['concentrate'], // 과일·채소 원료 · 딸기농축액s
    'PF0014': ['concentrate'], // 과일·채소 원료 · 레드비트농축액
    'PF0015': ['concentrate'], // 과일·채소 원료 · 레드자몽농축액
    'PF0019': ['concentrate'], // 과일·채소 원료 · 망고농축액(클라우드타입)
    'PF0020': ['concentrate'], // 과일·채소 원료 · 망고농축액(클라우드타입)
    'PF0021': ['concentrate'], // 과일·채소 원료 · 망고농축액(클리어타입)
    'PF0023': ['concentrate', 'resp'], // 과일·채소 원료 · 모과농축액
    'PF0024': ['concentrate', 'resp'], // 과일·채소 원료 · 모과농축액
    'PF0025': ['concentrate', 'resp'], // 과일·채소 원료 · 모과농축액
    'PF0027': ['concentrate'], // 과일·채소 원료 · 무가당딸기퓨레
    'PF0030': ['concentrate'], // 과일·채소 원료 · 바나나농축과즙
    'PF0031': ['concentrate'], // 과일·채소 원료 · 바나나농축액
    'PF0032': ['concentrate'], // 과일·채소 원료 · 바나나퓨레
    'PF0034': ['concentrate'], // 과일·채소 원료 · 배농축액
    'PF0036': ['concentrate'], // 과일·채소 원료 · 배퓨레
    'PF0038': ['concentrate'], // 과일·채소 원료 · 백포도농축액 68brix
    'PF0041': ['concentrate'], // 과일·채소 원료 · 복숭아농축액
    'PF0042': ['concentrate'], // 과일·채소 원료 · 복숭아농축액(Clear type)
    'PF0046': ['concentrate'], // 과일·채소 원료 · 블랙사파이어농축액 40brix
    'PF0047': ['concentrate'], // 과일·채소 원료 · 블루베리농축액
    'PF0049': ['concentrate'], // 과일·채소 원료 · 사과농축액
    'PF0050': ['concentrate'], // 과일·채소 원료 · 사과주스농축액
    'PF0051': ['concentrate'], // 과일·채소 원료 · 사과주스농축액
    'PF0055': ['concentrate'], // 과일·채소 원료 · 석류농축액
    'PF0056': ['concentrate'], // 과일·채소 원료 · 석류농축액
    'PF0057': ['concentrate'], // 과일·채소 원료 · 석류농축액
    'PF0062': ['concentrate'], // 견과 원료 · 아몬드페이스트
    'PF0063': ['concentrate'], // 과일·채소 원료 · 아세로라농축액
    'PF0067': ['concentrate'], // 과일·채소 원료 · 애플망고퓨레
    'PF0069': ['concentrate'], // 과일·채소 원료 · 양파농축액s
    'PF0071': ['concentrate'], // 과일·채소 원료 · 오렌지농축액
    'PF0072': ['concentrate'], // 과일·채소 원료 · 오렌지농축액
    'PF0074': ['concentrate'], // 과일·채소 원료 · 오매농축액
    'PF0077': ['concentrate'], // 과일·채소 원료 · 유기농농축딸기즙
    'PF0082': ['concentrate'], // 과일·채소 원료 · 유기농사과주스농축액
    'PF0085': ['concentrate'], // 과일·채소 원료 · 유기농오렌지농축액
    'PF0086': ['concentrate'], // 과일·채소 원료 · 유기농오렌지농축액
    'PF0087': ['concentrate'], // 과일·채소 원료 · 유기농오렌지농축액
    'PF0090': ['concentrate'], // 과일·채소 원료 · 유기농호박농축액
    'PF0093': ['concentrate'], // 과일·채소 원료 · 자두농축액
    'PF0096': ['concentrate'], // 과일·채소 원료 · 적포도농축액
    'PF0098': ['concentrate'], // 과일·채소 원료 · 칸탈루프멜론농축액
    'PF0101': ['concentrate'], // 과일·채소 원료 · 파인애플농축액 72brix
    'PF0102': ['concentrate'], // 과일·채소 원료 · 파인애플농축액 72brix
    /* 16 향미 — 9개 */
    'MX0005': ['flavor'], // 향료 · 레몬향분말M
    'MX0006': ['flavor'], // 향료 · 레몬향분말SG
    'MX0007': ['flavor'], // 향료 · 레몬향분말SH (SD제품)
    'MX0008': ['flavor'], // 향료 · 레몬향분말SR
    'MX0019': ['flavor'], // 음료·디저트 원료 · 샷 솔티드 카라멜향 시럽
    'MX0020': ['flavor'], // 음료·디저트 원료 · 슈크림파우더
    'MX0025': ['flavor'], // 유가공 원료 · 요거트혼합분말100L
    'MX0031': ['flavor'], // 향료 · 타로향
    'PF0075': ['flavor'], // 차·허브 원료 · 옥수수수염차
    /* 17 조미 · 산미 — 13개 */
    'AF0002': ['seasoning'], // 조미 원료 · 게엑기스-100
    'AF0003': ['seasoning'], // 조미 원료 · 게엑기스DW
    'AF0004': ['seasoning'], // 조미 원료 · 게엑기스-디
    'AF0005': ['seasoning'], // 조미 원료 · 꽃게농축액-에스
    'AF0006': ['seasoning'], // 조미 원료 · 꽃게엑기스
    'AF0018': ['seasoning'], // 조미 원료 · 조개농축액
    'MX0023': ['seasoning'], // 조미 원료 · 야채엑기스
    'OA0001': ['seasoning'], // 산미료 · DL-사과산
    'OA0002': ['seasoning'], // 산미료 · 무수구연산
    'PF0005': ['seasoning', 'meta', 'gut'], // 조미 원료 · 다시마엑기스
    'PF0033': ['seasoning', 'meta'], // 식초 · 발효식초
    'PF0078': ['seasoning'], // 식초 · 유기농레드와인비니거 8%
    'PF0083': ['seasoning'], // 식초 · 유기농사과초모식초분말
    /* 18 감미료 — 2개 */
    'CH0010': ['sweetener'], // 당류·감미료 · 수크랄로스
    'UN0007': ['sweetener'], // 당류·감미료 · 스테비텐 후레쉬(효소처리스테비아)
    /* 19 당류 — 13개 */
    'AF0007': ['sugar'], // 당류·감미료 · 꿀분말20
    'AF0015': ['sugar'], // 당류·감미료 · 아카시아꿀
    'CH0006': ['sugar'], // 당류·감미료 · 맥아당
    'CH0007': ['sugar'], // 당류·감미료 · 소비톨 파우더(D-소비톨)
    'CH0008': ['sugar'], // 당류·감미료 · 소비톨 파우더(D-소비톨)
    'CH0009': ['sugar'], // 당류·감미료 · 소비톨 파우더(D-소비톨)
    'CH0011': ['sugar'], // 당류·감미료 · 에리스리톨
    'CH0012': ['sugar'], // 당류·감미료 · 에리스리톨
    'CH0017': ['sugar'], // 당류·감미료 · 자일리톨
    'CH0018': ['sugar'], // 당류·감미료 · 자일리톨 분말
    'CH0019': ['sugar'], // 당류·감미료 · 자일리톨 크리스탈
    'CH0020': ['sugar'], // 당류·감미료 · 트레할로스
    'CH0022': ['sugar'], // 당류·감미료 · 흑당밀시럽
    /* 20 식품 가공 · 물성 — 17개 */
    'CH0005': ['processing'], // 전분·덱스트린 · 말토덱스트린(액상)
    'CH0024': ['processing'], // 기타 원료 · 히알루론산(첨가물)
    'CH0025': ['processing'], // 기타 원료 · 히알루론산(첨가물)
    'CH0026': ['processing'], // 기타 원료 · 히알루론산(첨가물)
    'FM0037': ['processing'], // 음료·디저트 원료 · 나타데코코(10X10X5)
    'FM0038': ['processing'], // 음료·디저트 원료 · 나타데코코(2X3X3)
    'LI0001': ['processing', 'meta', 'brain'], // 유화제 · 대두레시틴(포스파티딜콜린35)
    'LI0002': ['processing', 'meta', 'brain'], // 유화제 · 레시틴분말(해바라기유래) INNO PCP 20 SUN
    'LI0003': ['processing'], // 기타 원료 · 스테아린산
    'LI0012': ['processing'], // 유화제 · 해바라기레시틴 분말(Nulec©-P SUN 700)
    'LI0013': ['processing'], // 유화제 · 해바라기레시틴액상(Nulec©-F SUN200)
    'MX0004': ['processing'], // 음료·디저트 원료 · 당류제로크리머
    'MX0015': ['processing'], // 식물추출물 · 복합겨자무추출물(HAS-BST)
    'MX0032': ['processing'], // 음료·디저트 원료 · 파이버크림(FC01)
    'MX0033': ['processing'], // 음료·디저트 원료 · 파이버크림(FC10)
    'OA0003': ['processing'], // 보존료 · 소브산칼륨
    'OA0004': ['processing'], // 보존료 · 소브산칼륨
    /* 21 기타 · 분류 확인 필요 — 7개 */
    'AF0019': ['check', 'bone'], // 수산 원료 · 초록입홍합분말
    'UN0001': ['check'], // 미분류 · DF-100
    'UN0002': ['check'], // 미분류 · DPO
    'UN0005': ['check'], // 미분류 · MASK-A
    'UN0008': ['check', 'skin'], // 미분류 · 식물성케라틴부스터
    'UN0011': ['check', 'gut'], // 미분류 · 프락토화이버
    'UN0012': ['check'] // 기타 원료 · 하이드로커큐민(HC50NF)
  };

  /* 분류 판단 메모: 검토가 필요한 제품과 보조 태그로 처리한 이유 */
  var notes = {
    'AF0017': '효능 문구의 ‘뷰티’ 표현은 보조 태그로만 표시',
    'AF0019': '효능 문구에 질병(천식·관절염) 개선 표현 — 문구 검토 후 분류',
    'BE0018': '여성·갱년기 건강 표현 포함',
    'LI0001': '유화제 — 지방대사·신경 표현은 보조 태그로만 표시',
    'LI0002': '유화제 — 지방대사·신경 표현은 보조 태그로만 표시',
    'MX0001': '효능·주요 특성 정보 없음 — 원료 종류(곡물 발효분말)로만 분류',
    'MX0015': '효능: 미생물 증식 억제·보존성 향상',
    'PF0005': '조미 원료 — 효능 문구의 갑상선·장 건강 표현은 보조 태그로만 표시',
    'PF0023': '‘목 웰니스 전통 컨셉’ 표현 — 보조 태그로만 표시',
    'PF0024': '‘목 웰니스 전통 컨셉’ 표현 — 보조 태그로만 표시',
    'PF0025': '‘목 웰니스 전통 컨셉’ 표현 — 보조 태그로만 표시',
    'PF0033': '식초 — 식후·대사 표현은 보조 태그로만 표시',
    'PF0068': 'DB 효능 문구가 배 제품 문구와 동일 — 원본 확인 필요',
    'UN0001': '효능 정보 없음 · 규격서 확인 필요',
    'UN0002': '효능 정보 없음 · 규격서 확인 필요',
    'UN0003': '효능 문구의 ‘뷰티’ 표현은 보조 태그로만 표시',
    'UN0004': '효능 문구의 ‘뷰티’ 표현은 보조 태그로만 표시',
    'UN0005': '효능 정보 없음 · 규격서 확인 필요',
    'UN0008': '규격서 확인 필요 원료',
    'UN0011': '규격서 확인 필요 원료',
    'UN0012': '‘염증 밸런스 개선’ 표현 — 문구·분류 확인 필요'
  };

  /* 인체 그래픽(가로 100 × 세로 200 좌표)의 기능 부위 표시 위치. 좌우는 그림을 바라보는 방향 기준입니다.
     - 각 표시점에서 오른쪽으로 그리는 연결선이 다른 표시점을 지나지 않도록 배치했습니다.
     - 01→10 분류 순서대로 위에서 아래로 놓여 있어, 한 페이지에 여러 분류가 함께 나와도 연결선이 서로 교차하지 않습니다.
       위치를 옮길 때도 이 순서(세로 좌표가 분류 번호 순으로 커짐)를 지켜 주세요.
     - 'whole' 은 실루엣 전체 강조(07 면역)이며, 좌표는 연결선이 시작되는 점입니다. */
  var anchors = {
    head: { x: 50, y: 14 }, throat: { x: 50, y: 37 }, heart: { x: 57, y: 48 }, liver: { x: 42, y: 60 },
    gut: { x: 50, y: 72 }, abdomen: { x: 60, y: 84 }, whole: { x: 64, y: 100, whole: true }, thigh: { x: 60, y: 112 },
    knee: { x: 41, y: 142 }, shin: { x: 60, y: 168 }
  };

  var byId = {};
  areas.forEach(function (a) { byId[a.id] = a; });

  /* 제품 → { primary, tags, mapped } . 매핑이 없거나 잘못된 분류 id 는 'check' 로 돌려 누락 없이 출력합니다. */
  function classify(product) {
    var entry = product && products[product.id];
    if (!entry || !byId[entry[0]]) return { primary: 'check', tags: [], mapped: false };
    return {
      primary: entry[0],
      tags: entry.slice(1).filter(function (t) { return byId[t] && t !== entry[0]; }),
      mapped: true
    };
  }

  window.ECHO_BODY_FUNCTIONS = { version: '2026-10-23-v9.2', status: 'draft', areas: areas, anchors: anchors, products: products, notes: notes };
  window.EchoBodyFunctions = {
    areas: areas,
    anchors: anchors,
    area: function (id) { return byId[id] || null; },
    classify: classify,
    note: function (id) { return notes[id] || ''; }
  };
})();
