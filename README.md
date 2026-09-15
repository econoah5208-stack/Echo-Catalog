# Echo Trading 제품 카탈로그

최신 제품 데이터베이스를 반영한 HTML·CSS·순수 JavaScript 기반 정적 웹사이트입니다. 별도 서버나 로그인 없이 `index.html`을 열면 바로 제품 목록을 볼 수 있습니다.

## 최신 데이터 반영 (2026-09-15)

최신 첨부 데이터베이스 (3)을 기준으로 385개 제품을 재생성했습니다. 기존 공개 필드의 값은 동일합니다. 추가된 `효능` 열도 변환·편집·상세보기·PDF 선택 항목에서 지원합니다. 현재 385개 모두 `확인 요망`이므로 공개 데이터에는 빈 값으로 반영하며, 확정된 내용이 있는 제품만 상세보기에 효능을 표시합니다. PDF에서는 효능 항목을 선택한 경우에만 출력합니다.

## 반영 데이터

- 전체 385개 제품, 제품코드 중복 없음
- 일반식품 271개: 일반원료 150개 / 기능성부원료 121개
- 건강기능식품 71개
- 식품첨가물 43개
- 목록 한 페이지당 최대 50개
- 제조사·매입처 및 가격 관련 내부정보는 웹 데이터에서 제외
- 현재 원본의 `Stock 운용` 값은 385개 모두 `미정`

## 실행 방법

ZIP 압축을 풀고 폴더 구조를 유지한 채 `index.html`을 Chrome 또는 Edge로 여세요.

- 검색: 제품명, 지표성분, 제품코드
- 분류: 건강기능식품 / 일반식품 / 식품첨가물
- 일반식품 하위 분류: 일반원료 / 기능성부원료
- 상세 필터: 원료 카테고리, 세부 분류, 어플리케이션
- 모바일: 표를 카드형으로 전환해 가로 스크롤 없이 표시
- 제품 상세: 지표성분, 규격, 포장, 원산지, 주요 특성, 어플리케이션, 공정, Stock 운용

## 공개 범위 안내

로그인과 데이터 암호화는 적용되어 있지 않습니다. GitHub Pages에 게시하면 사이트 주소를 아는 사람이 제품 목록을 열람하고 `data/catalog.js`의 제품 데이터를 확인할 수 있습니다.

내부 전용으로만 사용하려면 GitHub Pages에 공개하지 말고 ZIP을 사내 PC에서 압축 해제해 사용하세요. 외부 서버에 올릴 경우에는 GitHub 저장소 공개 여부와 실제 웹사이트 접근 범위를 별도로 확인하세요.

## GitHub Pages 업로드

1. 저장소를 만들고 압축을 푼 `echo-catalog` 폴더의 **내용물**을 업로드합니다.
2. 저장소 첫 화면에 `index.html`, `assets`, `data`가 바로 보여야 합니다.
3. **Settings → Pages → Build and deployment**에서 **Deploy from a branch**를 선택합니다.
4. Branch는 **main**, 폴더는 **/(root)**로 저장합니다.

원본 Excel과 점검 파일은 GitHub에 올리지 마세요.

## 제품 소개자료 / PDF

목록에서 개별 제품을 체크하거나 **소개자료 / PDF 만들기**에서 다음 범위를 한 번에 선택할 수 있습니다.

- 전체 제품
- 일반식품 전체
- 건강기능식품 전체
- 식품첨가물 전체
- 비타민·미네랄 전체
- 농축액·추출액·퓨레 전체
- 분말 전체
- 효모·유산균 유래 FoodForm 전체
- Stock 운용 제품

`Stock 운용 여부`를 전체 / 운용 / 미운용 / 미정으로 추가 필터링할 수 있습니다. 현재 데이터는 모두 `미정`이므로 Stock 운용 제품만 출력하려면 원본 Excel 또는 편집기에서 해당 값을 `운용`으로 지정해야 합니다.

출력 문서는 Echo Trading 로고와 회사 연락처를 포함한 A4 가로 디자인이며, JavaScript가 제품을 10개씩 나누어 **한 페이지당 최대 10개 제품**을 배치합니다.

권장 인쇄 설정:

- 대상: PDF로 저장 또는 프린터
- 용지: A4 / 가로
- 배율: 100%
- 배경 그래픽: 켜기
- 브라우저 머리글·바닥글: 끄기

## 제품 수정·추가

1. `manage.html`을 엽니다.
2. 제품을 선택하거나 **새 제품 추가**를 누릅니다.
3. 정보를 수정한 뒤 **목록에 반영**을 누릅니다.
4. **웹용 데이터 다운로드**를 누릅니다.
5. 내려받은 `catalog.js`를 프로젝트의 `data/catalog.js`와 교체합니다.

관리 페이지는 서버에 직접 저장하지 않습니다. 브라우저를 닫기 전에 반드시 웹용 데이터 또는 JSON 백업을 다운로드하세요.

## Excel 일괄 반영

원본 Excel을 기준 데이터로 관리하는 것을 권장합니다. Python과 `openpyxl` 설치 후 다음 순서로 갱신할 수 있습니다.

```bash
python scripts/import_excel.py "원본엑셀의 전체경로.xlsx" --output "catalog-import.json" --review "review.json"
node scripts/build_catalog.mjs "catalog-import.json" "data/catalog.js"
```

`catalog-import.json`과 `review.json`은 GitHub에 올리지 마세요. 일괄 변환은 기존 웹 목록 전체를 교체하므로 실행 전 백업하세요.

| Excel 열 | 데이터 키 | 표시 용도 |
|---|---|---|
| 제품코드 | id | 제품 식별 코드 |
| 아이템 | name | 제품명 |
| 국내 식품분류 | catalogType | 건강기능식품 / 일반식품 / 식품첨가물 |
| 대분류 | category | 원료 카테고리 |
| 상세 분류 | subcategory | 세부 분류 |
| 지표성분 | marker | 지표성분 |
| 수치 | spec | 규격 / 함량 |
| 기능 | function | 주요 특성 |
| 효능 | efficacy | 확정된 효능 (확인·검토·미정 값 제외) |
| 사용처(Application) | application | 어플리케이션 |
| 형태 | form | 형태 및 분말 출력 범위 |
| 공정 | process | 농축·추출 등 공정 및 출력 범위 |
| 원산지 | origin | 원산지 |
| 포장 | packaging | 포장단위 |
| Stock 운용 | stock | 미정 / 운용 / 미운용 |

`제조사·매입처` 열은 변환하지 않습니다. 포장란에 포함된 업체명·가격·MOQ·운송 메모와 미확정 값도 고객 표시값에서 제거하고 점검 파일에 기록합니다.

## 주요 파일

| 파일 | 역할 |
|---|---|
| `index.html` | 카탈로그와 출력 설정 화면 |
| `assets/echo-trading-logo.svg` | 웹 헤더 및 PDF 공용 로고 |
| `assets/styles.css` | 웹·모바일 디자인 |
| `assets/app.js` | 검색, 분류, 50개 페이지, 상세보기 |
| `assets/print.js` | 범위 선택, 10개 단위 페이지 생성, 인쇄 |
| `assets/print.css` | A4 가로 출력 디자인 |
| `data/catalog.js` | 웹에서 바로 읽는 제품 데이터 |
| `manage.html`, `assets/manage.js` | 제품 편집과 데이터 다운로드 |
| `scripts/import_excel.py` | Excel → JSON 변환 |
| `scripts/build_catalog.mjs` | JSON → 웹용 `catalog.js` 변환 |

회사 정보는 `index.html`, 대표 색상은 `assets/styles.css`, 로고는 `assets/echo-trading-logo.svg`에서 수정할 수 있습니다.

## 캐시 갱신 방식

`assets/bootstrap.js`가 제품 데이터와 JavaScript 파일을 매 페이지 로드 시 고유 쿼리값으로 불러오도록 구성되어 있습니다. 따라서 GitHub Pages에서 `data/catalog.js`를 교체한 뒤 예전 데이터가 브라우저 캐시에 남아 `문의`로 표시되는 문제를 방지합니다.
