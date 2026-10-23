#!/usr/bin/env node
// 공개용 제품 데이터 점검 스크립트 (외부 전송 없음)
//
// 사용법
//   node scripts/verify_catalog.mjs
//   node scripts/verify_catalog.mjs --compare catalog-import.json      # Excel 변환 결과와 필드 단위 비교
//   node scripts/verify_catalog.mjs --expect 일반식품=300,건강기능식품=42,식품첨가물=43,일반원료=179,기능성부원료=121
//
// 점검 항목: 제품 수·코드 중복, 공개 필드 화이트리스트(제조사·가격 등 비공개 필드 차단),
// 국내 식품분류·일반식품 하위 분류 수치, 32개 대분류 → 8개 원료 분야 매핑 누락, 원산지 국가 수,
// 공개값 안의 내부 메모 의심 문구.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };

const context = { window: {} };
vm.createContext(context);
for (const file of ['data/catalog.js', 'data/taxonomy.js', 'data/site-config.js']) {
  vm.runInContext(await readFile(path.join(root, file), 'utf8'), context, { filename: file });
}
const products = context.window.ECHO_PRODUCTS;
const tax = context.window.EchoTaxonomy;
const errors = [], warnings = [];
const count = (list, fn) => list.reduce((m, p) => { const k = fn(p); m[k] = (m[k] || 0) + 1; return m; }, {});
const line = (label, value) => console.log(`  ${label.padEnd(22, ' ')} ${value}`);

if (!Array.isArray(products)) { console.error('data/catalog.js 에 window.ECHO_PRODUCTS 배열이 없습니다.'); process.exit(1); }

// 1. 제품 수·코드
const ids = products.map(p => p.id);
const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
if (duplicates.length) errors.push(`제품코드 중복: ${[...new Set(duplicates)].join(', ')}`);
products.forEach((p, i) => { if (!p.id || !p.name || !p.category) errors.push(`${i + 1}번째 제품에 제품코드·제품명·대분류 중 빈 값이 있습니다 (${p.id || '-'})`); });

// 2. 공개 필드 화이트리스트
const allowed = new Set(['id', 'name', 'category', 'subcategory', 'marker', 'spec', 'function', 'application', 'form', 'process', 'origin', 'packaging', 'stock', 'efficacy', 'catalogType', 'catalogGroup', 'visible']);
const extraKeys = [...new Set(products.flatMap(p => Object.keys(p)).filter(k => !allowed.has(k)))];
if (extraKeys.length) errors.push(`공개 데이터에 허용되지 않은 필드가 있습니다: ${extraKeys.join(', ')} (제조사·매입처·가격 등 비공개 필드 여부 확인)`);

// 3. 분류 값
const typeCounts = count(products, p => p.catalogType || '(미지정)');
const groupCounts = count(products.filter(p => p.catalogType === '일반식품'), p => p.catalogGroup || '(미지정)');
products.forEach(p => {
  if (!['건강기능식품', '일반식품', '식품첨가물'].includes(p.catalogType)) errors.push(`${p.id} 국내 식품분류 값 오류: ${p.catalogType || '빈 값'}`);
  if (p.catalogType === '일반식품' && !['일반원료', '기능성부원료'].includes(p.catalogGroup)) errors.push(`${p.id} 일반식품 하위 분류 값 오류: ${p.catalogGroup || '빈 값'}`);
  if (p.catalogType !== '일반식품' && p.catalogGroup) errors.push(`${p.id} 일반식품이 아닌데 하위 분류가 있습니다: ${p.catalogGroup}`);
  if (!['미정', '운용', '미운용'].includes(p.stock)) errors.push(`${p.id} Stock 운용 값 오류: ${p.stock}`);
});

// 4. 8개 원료 분야 매핑
const categories = [...new Set(products.map(p => p.category))];
const unmappedCategories = categories.filter(c => !tax.groups.some(g => g.categories.includes(c)));
if (unmappedCategories.length) errors.push(`원료 분야에 연결되지 않은 대분류: ${unmappedCategories.join(', ')} → data/taxonomy.js 에 추가하세요`);
const doubleMapped = categories.filter(c => tax.groups.filter(g => g.categories.includes(c)).length > 1);
if (doubleMapped.length) errors.push(`두 개 이상의 원료 분야에 연결된 대분류: ${doubleMapped.join(', ')}`);
const staleCategories = tax.groups.flatMap(g => g.categories).filter(c => !categories.includes(c));
if (staleCategories.length) warnings.push(`taxonomy.js 에만 있고 데이터에는 없는 대분류: ${staleCategories.join(', ')}`);
context.window.ECHO_TAXONOMY.subcategoryRules.forEach(r => {
  if (!products.some(p => p.category === r.category && p.subcategory === r.subcategory)) warnings.push(`예외 규칙에 해당하는 제품이 없습니다: ${r.category} / ${r.subcategory}`);
});
const areaCounts = {};
tax.groups.forEach(g => { areaCounts[g.id] = 0; });
products.forEach(p => { const g = tax.groupOf(p); if (!g) errors.push(`${p.id} 원료 분야 미지정 (${p.category})`); else areaCounts[g]++; });
const areaTotal = Object.values(areaCounts).reduce((a, b) => a + b, 0);
if (areaTotal !== products.length) errors.push(`원료 분야별 합계(${areaTotal})가 전체 제품 수(${products.length})와 다릅니다`);
tax.groups.forEach(g => (g.highlights || []).forEach(id => { const p = products.find(x => x.id === id); if (!p) warnings.push(`${g.name} 대표 제품 ${id} 가 데이터에 없습니다`); else if (tax.groupOf(p) !== g.id) warnings.push(`${g.name} 대표 제품 ${id} 가 다른 원료 분야에 속합니다`); }));
const site = context.window.ECHO_SITE;
['yeast', 'lactobacillus'].forEach(key => (site.foodform[key].featured || []).forEach(id => { const p = products.find(x => x.id === id); if (!p) warnings.push(`Foodform 대표 제품 ${id} 가 데이터에 없습니다`); else if (p.subcategory !== site.foodform[key].subcategory) warnings.push(`Foodform 대표 제품 ${id} 의 소분류(${p.subcategory})가 ${site.foodform[key].subcategory} 와 다릅니다`); }));

// 5. 원산지
const countries = new Map();
products.forEach(p => tax.countriesOf(p.origin).forEach(c => countries.set(c.name, c.region)));

// 6. 공개값 안의 내부 메모 의심 문구
const suspicious = /(원\s*\/|단가|견적|MOQ|매입|제조사|공급사|택배|냉동차|면세|샘플판매|kg\s*이상|확인\s*필요|검토\s*후)/i;
products.forEach(p => ['name', 'marker', 'spec', 'packaging', 'origin', 'application', 'function', 'efficacy'].forEach(field => {
  if (suspicious.test(String(p[field] || ''))) warnings.push(`${p.id} ${field} 공개값 확인: "${p[field]}"`);
}));

// 7. Excel 변환 결과와 비교
const compareFile = option('--compare');
if (compareFile) {
  const source = JSON.parse(await readFile(path.resolve(compareFile), 'utf8'));
  const sourceMap = new Map(source.map(p => [p.id, p]));
  const webIds = new Set(ids);
  const onlyWeb = ids.filter(id => !sourceMap.has(id)), onlyExcel = source.map(p => p.id).filter(id => !webIds.has(id));
  if (onlyWeb.length) errors.push(`Excel 에 없는 웹 제품: ${onlyWeb.join(', ')}`);
  if (onlyExcel.length) errors.push(`웹에 없는 Excel 제품: ${onlyExcel.join(', ')}`);
  let diffCount = 0;
  products.forEach(p => { const s = sourceMap.get(p.id); if (!s) return; for (const k of allowed) { if ((p[k] ?? '') !== (s[k] ?? '')) { diffCount++; if (diffCount <= 20) warnings.push(`Excel 차이 ${p.id}.${k}: 웹 "${p[k]}" / Excel "${s[k]}"`); } } });
  console.log(`\nExcel 비교: ${compareFile} · 필드 차이 ${diffCount}건`);
}

// 8. 기대 수치
const expect = option('--expect');
if (expect) {
  const actual = { ...typeCounts, ...groupCounts, 전체: products.length };
  expect.split(',').map(s => s.split('=')).forEach(([k, v]) => { if (String(actual[k] ?? 0) !== String(v)) errors.push(`기대 수치 불일치: ${k} 기대 ${v} / 실제 ${actual[k] ?? 0}`); });
}

console.log('\nEcho Trading 공개 데이터 점검');
line('전체 제품', `${products.length}개 (고객 표시 ${products.filter(p => p.visible !== false).length}개)`);
line('제품코드 중복', duplicates.length ? `${duplicates.length}건` : '없음');
line('국내 식품분류', Object.entries(typeCounts).map(([k, v]) => `${k} ${v}`).join(' / '));
line('일반식품 하위 분류', Object.entries(groupCounts).map(([k, v]) => `${k} ${v}`).join(' / '));
line('대분류', `${categories.length}개`);
line('원료 분야(8)', tax.groups.map(g => `${g.no} ${g.name} ${areaCounts[g.id]}`).join(' · '));
line('원료 분야 합계', `${areaTotal}개`);
line('해외 원산지 국가', `${countries.size}개국`);
line('Stock 운용', Object.entries(count(products, p => p.stock)).map(([k, v]) => `${k} ${v}`).join(' / '));
if (warnings.length) { console.log(`\n확인 필요 ${warnings.length}건`); warnings.forEach(w => console.log('  - ' + w)); }
if (errors.length) { console.log(`\n오류 ${errors.length}건`); errors.forEach(e => console.log('  ✕ ' + e)); process.exit(1); }
console.log('\n오류 없음');
