/* A4 세로 · 인체 기능형 카탈로그 (v9.1 · v9.2 여러 분류 한 페이지 배치)
 * - 기존 가로형·세로 압축형 인쇄 코드(print.js)와 분리된 모듈입니다. print.js 가 이 모듈의 build() 를 호출합니다.
 * - 분류는 data/body-functions.js, 회사 정보는 data/site-config.js 를 사용합니다.
 * - 페이지 분할: 별도 측정 영역(#print-measure-body)에서 실제 행 높이를 재며 채우고, 넘치면 다음 페이지로 넘깁니다.
 *   글자 크기는 줄이지 않고(고정), 페이지당 최대 22개입니다.
 * - v9.2: 한 분류가 끝나고 페이지에 여백이 남으면 다음 분류를 같은 페이지에 이어서 배치합니다(분류마다 머리띠·표 머리글).
 *   제품 6개 미만인 분류는 나누지 않고, 나눌 때는 앞·뒤 조각이 각각 3행 이상이 되도록 합니다.
 *   '분류마다 새 페이지에서 시작' 항목을 켜면 v9.1처럼 분류마다 새 페이지를 씁니다.
 */
(() => {
  'use strict';
  const BF = window.EchoBodyFunctions;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const ROW_CAP = 22;
  const SAFETY_PX = 6; // 표 아래 약 1.6mm 여유: 인쇄 엔진의 줄바꿈 차이 대비
  const PX_PER_MM = 96 / 25.4;
  const DEFAULT_TITLE = '기능별 원료 포트폴리오';
  const MIN_START = 3; // 페이지 아래쪽에서 새 분류를 시작할 때 최소 행 수
  const MIN_TAIL = 3;  // 다음 페이지로 이어지는 조각의 최소 행 수

  /* 출력 항목: sub = 제품명 아래 보조 줄, feature = 기능/특징 열, col = 별도 열(최대 2개) */
  const FIELDS = [
    ['code', '제품코드', 'sub'],
    ['catalogType', '국내 식품분류', 'sub'],
    ['efficacy', '효능·기능 설명', 'feature'],
    ['function', '주요 특성', 'feature'],
    ['tags', '관련 기능 태그', 'feature'],
    ['marker', '지표성분', 'col'],
    ['origin', '원산지', 'col'],
    ['packaging', '포장단위', 'col'],
    ['pagebreak', '분류마다 새 페이지에서 시작 (종이 더 사용)', 'page']
  ];
  const DEFAULTS = ['code', 'catalogType', 'efficacy', 'function', 'tags'];
  const MAX_COLS = 2;
  const COL_WIDTH = { marker: 30, origin: 16, packaging: 16 };

  const node = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined && text !== null) n.textContent = text; if (cls) n.className = cls; return n; };
  const svg = (tag, attrs) => { const n = document.createElementNS(SVG_NS, tag); Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, String(v))); return n; };
  const ko = text => String(text || '').split(';').map(s => s.includes(' / ') ? s.split(' / ').slice(1).join(' / ').trim() : s.trim()).filter(Boolean);
  const pad = n => String(n).padStart(2, '0');

  /* ---------- 인체 그래픽 (단색 벡터 · viewBox 100×200) ---------- */
  function bodyMap(areas) {
    const anchors = (BF && BF.anchors) || {};
    const on = new Set(areas.filter(a => a.kind === 'body').map(a => a.id));
    const wholeArea = areas.find(a => a.kind === 'body' && anchors[a.anchor] && anchors[a.anchor].whole);
    const map = svg('svg', { viewBox: '0 0 100 200', class: 'body-map' + (wholeArea ? ' is-whole' : ''), 'aria-hidden': 'true', focusable: 'false' });
    map.append(
      svg('circle', { class: 'bm-shape', cx: 50, cy: 16, r: 10.5 }),
      svg('rect', { class: 'bm-shape', x: 45.5, y: 24, width: 9, height: 10, rx: 2 }),
      svg('path', { class: 'bm-shape', d: 'M33 34 C40 31 60 31 67 34 C70 35 71 38 71 42 L68 92 C62 97 38 97 32 92 L29 42 C29 38 30 35 33 34 Z' }),
      svg('path', { class: 'bm-limb', d: 'M31.5 39 L22 68 L18.5 101', 'stroke-width': 8.5 }),
      svg('path', { class: 'bm-limb', d: 'M68.5 39 L78 68 L81.5 101', 'stroke-width': 8.5 }),
      svg('path', { class: 'bm-limb', d: 'M41 92 L40.5 140 L39.5 188', 'stroke-width': 11.5 }),
      svg('path', { class: 'bm-limb', d: 'M59 92 L59.5 140 L60.5 188', 'stroke-width': 11.5 })
    );
    BF.areas.filter(a => a.kind === 'body').forEach(a => {
      const pt = anchors[a.anchor]; if (!pt || pt.whole) return;
      const isOn = on.has(a.id);
      if (isOn) map.append(svg('circle', { class: 'bm-halo', cx: pt.x, cy: pt.y, r: 8.5 }));
      const dot = svg('circle', { class: 'bm-marker' + (isOn ? ' is-active' : ''), cx: pt.x, cy: pt.y, r: isOn ? 5.2 : 4.2 });
      dot.dataset.area = a.id;
      map.append(dot);
    });
    if (wholeArea) {
      const pt = anchors[wholeArea.anchor];
      const dot = svg('circle', { class: 'bm-anchor', cx: pt.x, cy: pt.y, r: 0.1 });
      dot.dataset.area = wholeArea.id; map.append(dot);
    }
    return map;
  }

  /* ---------- 표 ---------- */
  function columnsFor(fields) {
    const cols = [['no', 'NO.', 9], ['name', '제품명', null]];
    const feature = ['efficacy', 'function', 'tags'].some(k => fields.has(k));
    const extra = FIELDS.filter(([k, , kind]) => kind === 'col' && fields.has(k)).slice(0, MAX_COLS);
    if (feature) cols.push(['feature', '기능 / 특징', null]);
    extra.forEach(([k, label]) => cols.push([k, label, COL_WIDTH[k]]));
    return cols;
  }
  const TABLE_MM = 147; // print.css 의 .body-list 폭(190mm - 좌측 38mm - 간격 5mm)과 같아야 합니다.
  function makeTable(cols) {
    const table = node('table', undefined, 'body-table'), group = node('colgroup'), head = node('thead'), tr = node('tr');
    const fixed = cols.reduce((n, c) => n + (c[2] || 0), 0);
    const flexible = cols.filter(c => !c[2]);
    // 제품명 : 기능/특징 = 0.42 : 0.58 (기능 열이 없으면 제품명이 남은 폭 전부). 비율(%)로 지정해 표 폭이 바뀌어도 함께 조정됩니다.
    const ratio = { name: flexible.length > 1 ? 0.42 : 1, feature: 0.58 };
    cols.forEach(([key, label, width]) => {
      const col = node('col');
      const mm = width || (TABLE_MM - fixed) * (ratio[key] || 0.5);
      col.style.width = `${(mm / TABLE_MM * 100).toFixed(3)}%`;
      group.append(col);
      const th = node('th', label); th.scope = 'col'; th.className = `body-col-${key}`; tr.append(th);
    });
    head.append(tr); table.append(group, head, node('tbody'));
    return table;
  }
  function makeRow(p, number, cols, fields, primary) {
    const tr = node('tr'); tr.dataset.productId = p.id; tr.dataset.area = primary;
    cols.forEach(([key]) => {
      const td = node('td', undefined, `body-col-${key}`);
      if (key === 'no') td.textContent = String(number);
      else if (key === 'name') {
        td.append(node('span', p.name, 'body-name'));
        const sub = [fields.has('code') ? p.id : '', fields.has('catalogType') ? [p.catalogType, p.catalogGroup].filter(Boolean).join(' · ') : ''].filter(Boolean).join(' · ');
        if (sub) td.append(node('span', sub, 'body-sub-line'));
      } else if (key === 'feature') {
        if (fields.has('efficacy')) td.append(node('span', p.efficacy || (ko(p.function).join(' · ') || '효능 정보 문의'), 'body-feature-main' + (p.efficacy ? '' : ' is-empty')));
        const chips = node('span', undefined, 'body-feature-tags');
        if (fields.has('function')) ko(p.function).forEach(t => chips.append(node('span', t, 'body-tag')));
        if (fields.has('tags')) {
          const c = BF.classify(p);
          const related = c.tags.map(id => BF.area(id)).filter(Boolean);
          if (related.length) { chips.append(node('span', '관련', 'body-tag-label')); related.forEach(a => chips.append(node('span', `${a.no} ${a.name}`, 'body-tag body-tag--area'))); }
        }
        if (chips.childNodes.length) td.append(chips);
        if (!td.childNodes.length) td.append(node('span', '문의', 'body-feature-main is-empty'));
      } else {
        const value = p[key] || '';
        td.textContent = value || '문의'; if (!value) td.classList.add('is-empty');
      }
      tr.append(td);
    });
    return tr;
  }

  /* ---------- 페이지 ---------- */
  const areaLabel = areas => areas.map(a => `${a.no} ${a.name}`).join(' · ');
  function buildNav(areas, startPages) {
    const ids = new Set(areas.map(a => a.id));
    const nav = node('aside', undefined, 'body-nav');
    const mapLabel = node('p', 'BODY MAP', 'body-nav__label'); mapLabel.lang = 'en';
    nav.append(mapLabel, bodyMap(areas));
    if (areas.length && !areas.some(a => a.kind === 'body')) nav.append(node('p', '이 분류는 특정 인체 부위와 연결하지 않습니다.', 'body-map__caption'));
    const indexBlock = (label, list) => {
      nav.append(node('p', label, 'body-nav__label body-nav__label--index'));
      const ol = node('ol', undefined, 'body-index');
      list.forEach(a => {
        const li = node('li'); if (ids.has(a.id)) li.classList.add('is-active');
        const start = startPages && startPages[a.id];
        if (!start) li.classList.add('is-empty');
        li.append(node('span', a.no, 'no'), node('span', a.name, 'nm'), node('span', start ? `p.${start}` : '—', 'pg'));
        ol.append(li);
      });
      nav.append(ol);
    };
    indexBlock('기능 인덱스', BF.areas.filter(a => a.kind === 'body'));
    indexBlock('식품 원료 분류', BF.areas.filter(a => a.kind !== 'body'));
    const legend = node('div', undefined, 'body-legend');
    const l1 = node('p'); l1.append(node('span', undefined, 'dot dot--on'), document.createTextNode('이 페이지의 기능 부위'));
    const l2 = node('p'); l2.append(node('span', undefined, 'dot dot--off'), document.createTextNode('다른 기능 부위 · 07 면역은 전신'));
    legend.append(l1, l2, node('p', '원료 탐색을 위한 참고 분류입니다.', 'body-legend__note'));
    nav.append(legend);
    return nav;
  }
  /* 페이지에 놓인 분류가 바뀌면 머리글의 분류명·인체 그래픽·인덱스 강조를 다시 그립니다. */
  function setAreas(page, areas, startPages) {
    page.dataset.area = areas.length ? areas[0].id : '';
    page.dataset.areas = areas.map(a => a.id).join(' ');
    page.querySelector('.body-meta__area').textContent = areaLabel(areas);
    page.querySelector('.body-nav').replaceWith(buildNav(areas, startPages));
  }
  function makePage(o) {
    const areas = o.areas || [];
    const page = node('article', undefined, 'body-page');
    // header
    const header = node('header', undefined, 'body-header');
    const logo = node('img'); logo.src = 'assets/echo-trading-logo.svg'; logo.alt = 'Echo Trading'; logo.className = 'body-logo';
    const title = node('div', undefined, 'body-title');
    const kicker = node('p', 'FUNCTIONAL INGREDIENT PORTFOLIO', 'body-kicker'); kicker.lang = 'en';
    title.append(kicker, node('h1', o.title || DEFAULT_TITLE), node('p', o.customer ? `${o.customer} 귀중` : '인체 기능 영역에 따른 식품원료 분류 · 제품 리스트', 'body-sub'));
    const meta = node('div', undefined, 'body-meta');
    meta.append(node('span', '', 'body-meta__area'));
    const pageNo = node('span', undefined, 'body-meta__page'); pageNo.append(node('strong', pad(o.pageNumber)), document.createTextNode(` / ${pad(o.pageTotal)}`));
    meta.append(pageNo);
    header.append(logo, title, meta); page.append(header);
    if (o.memo) page.append(node('p', o.memo, 'body-memo'));
    // main: 왼쪽 탐색 패널 + 오른쪽 분류별 표(여러 개 가능)
    const main = node('div', undefined, 'body-main');
    main.append(node('aside', undefined, 'body-nav'), node('section', undefined, 'body-list'));
    page.append(main);
    setAreas(page, areas, o.startPages);
    // footer
    const footer = node('footer', undefined, 'body-footer');
    const left = node('p'); left.append(node('strong', 'ECHO TRADING'), document.createTextNode(` | ${[o.companyName, o.contactLine].filter(Boolean).join(' · ')}`));
    footer.append(left, node('p', '기능 분류는 제품 DB의 효능·기능 정보를 바탕으로 한 참고 분류이며, 제품별 표시 가능한 기능성을 뜻하지 않습니다. 규격·적용 조건은 문의해 주세요.', 'body-footer__note'),
      node('p', `출력일 ${o.printDate} · ${pad(o.pageNumber)} / ${pad(o.pageTotal)}`, 'body-footer__page'));
    page.append(footer);
    return page;
  }
  /* 분류 한 조각(머리띠 + 표)을 페이지 오른쪽 목록에 붙이고 tbody 를 돌려줍니다. */
  function addSection(page, s) {
    const area = s.area, kind = area.kind;
    const sec = node('div', undefined, 'body-section'); sec.dataset.area = area.id; sec.dataset.kind = kind;
    const band = node('div', undefined, 'body-band' + (kind === 'body' ? '' : kind === 'review' ? ' body-band--review' : ' body-band--general'));
    const bandText = node('div');
    const en = node('p', `${area.no} · ${area.en}`, 'body-band__en'); en.lang = 'en';
    bandText.append(en, node('h2', area.title));
    band.append(bandText, node('p', s.parts > 1 ? `${s.groupCount}개 원료 · ${s.part} / ${s.parts}` : `${s.groupCount}개 원료`, 'body-band__count'));
    const table = makeTable(s.cols);
    sec.append(band, table);
    page.querySelector('.body-list').append(sec);
    return table.querySelector('tbody');
  }

  /* 연결선: 인체 기능 분류 조각마다 1개. 부위 표시점 → 왼쪽 패널 경계 → 두 패널 사이 여백(세로) → 해당 머리띠.
     한 페이지에 인체 기능 분류가 여럿이면 여백 안에 세로선 자리를 나눠 주고, 선끼리 교차하지 않는 배치를 고릅니다.
     좌표는 렌더링된 위치를 mm 로 측정해 그립니다(미리보기 배율·인쇄와 무관). */
  const EPS = 0.2;
  const between = (v, a, b) => v > Math.min(a, b) + EPS && v < Math.max(a, b) - EPS;
  const within = (v, a, b) => v >= Math.min(a, b) - EPS && v <= Math.max(a, b) + EPS;
  function crossing(list) {
    for (let i = 0; i < list.length; i++) for (let j = 0; j < list.length; j++) {
      if (i === j) continue;
      const h = list[i], v = list[j];
      const hs = [[h.sy, h.sx, h.gx], [h.by, h.gx, h.bx]];
      if (hs.some(([y, x1, x2]) => between(v.gx, x1, x2) && within(y, v.sy, v.by))) return true;
    }
    return false;
  }
  function permutations(n) {
    if (n <= 1) return [[0].slice(0, n)];
    const out = [];
    permutations(n - 1).forEach(p => { for (let i = 0; i <= p.length; i++) out.push(p.slice(0, i).concat(n - 1, p.slice(i))); });
    return out;
  }
  function drawConnectors(page) {
    const main = page.querySelector('.body-main'), nav = page.querySelector('.body-nav');
    const sections = [...page.querySelectorAll('.body-section')].filter(sec => sec.dataset.kind === 'body');
    if (!main || !nav || !sections.length) return;
    const mm = v => Math.round(v / PX_PER_MM * 100) / 100;
    const m = main.getBoundingClientRect(), n = nav.getBoundingClientRect();
    const items = sections.map(sec => {
      const id = sec.dataset.area;
      const mark = page.querySelector(`.bm-marker.is-active[data-area="${id}"], .bm-anchor[data-area="${id}"]`);
      const band = sec.querySelector('.body-band');
      if (!mark || !band) return null;
      const a = mark.getBoundingClientRect(), b = band.getBoundingClientRect();
      return { id, sx: mm(a.right - m.left), sy: mm(a.top + a.height / 2 - m.top), by: mm(b.top + b.height / 2 - m.top), bx: mm(b.left - m.left) };
    }).filter(Boolean);
    if (!items.length) return;
    const left = mm(n.right - m.left), right = items[0].bx, k = items.length;
    const lanes = items.map((_, j) => Math.round((left + (right - left) * (j + 1) / (k + 1)) * 100) / 100);
    const order = permutations(k).find(perm => !crossing(items.map((it, i) => ({ ...it, gx: lanes[perm[i]] })))) || items.map((_, i) => i);
    const segs = items.map((it, i) => ({ ...it, gx: lanes[order[i]] }));
    const w = Math.ceil(right + 2), h = Math.ceil(Math.max(...segs.map(g => Math.max(g.sy, g.by))) + 2);
    const c = svg('svg', { class: 'body-connector', width: `${w}mm`, height: `${h}mm`, viewBox: `0 0 ${w} ${h}`, 'aria-hidden': 'true', focusable: 'false' });
    segs.forEach(g => {
      const path = svg('path', { d: `M${g.sx} ${g.sy} H${g.gx} V${g.by} H${g.bx}` }); path.dataset.area = g.id;
      c.append(path, svg('circle', { cx: g.bx, cy: g.by, r: 0.7 }));
    });
    main.append(c);
  }

  function overflows(page) {
    const list = page.querySelector('.body-list'), tables = page.querySelectorAll('.body-table');
    const table = tables[tables.length - 1];
    if (!table) return false;
    return table.getBoundingClientRect().bottom > list.getBoundingClientRect().bottom - SAFETY_PX;
  }

  /* products: 선택 제품 / opts: { fields:Set, title, customer, memo, companyName, contactLine, printDate } */
  function build(products, opts) {
    const sheet = node('div', undefined, 'body-catalog');
    if (!BF) { sheet.append(node('p', 'data/body-functions.js 를 불러오지 못했습니다.', 'brochure-empty')); return sheet; }
    const fields = opts.fields instanceof Set ? opts.fields : new Set(DEFAULTS);
    const cols = columnsFor(fields);
    const breakEach = fields.has('pagebreak');
    // 1) 분류별 묶기 — 각 제품은 대표 분류 한 곳에만 들어갑니다(중복 출력 없음). 분류 안에서는 제품명 가나다순.
    const groups = BF.areas.map(area => ({ area, items: [] }));
    const byArea = new Map(groups.map(g => [g.area.id, g]));
    products.forEach(p => byArea.get(BF.classify(p).primary).items.push(p));
    groups.forEach(g => g.items.sort((a, b) => a.name.localeCompare(b.name, 'ko') || a.id.localeCompare(b.id)));
    const used = groups.filter(g => g.items.length);
    if (!used.length) { sheet.append(node('p', '출력할 제품 범위를 선택하거나 목록에서 제품을 담아 주세요.', 'brochure-empty')); return sheet; }

    const host = node('div'); host.id = 'print-measure-body'; host.className = 'body-catalog'; host.setAttribute('aria-hidden', 'true');
    document.body.append(host);
    const common = { title: opts.title, customer: opts.customer, companyName: opts.companyName, contactLine: opts.contactLine, printDate: opts.printDate };
    const plan = []; // [{ memo:boolean, sections:[{ group, items }] }]
    try {
      // 2) 실측 배치: 분류 순서대로 한 행씩 넣어 보며 표가 목록 영역 아래 안전 여유를 넘기 직전까지 채웁니다.
      let cur = null;
      const open = () => {
        const spec = { memo: plan.length === 0, sections: [] }; plan.push(spec);
        const page = makePage({ ...common, areas: [], memo: spec.memo ? opts.memo : '', pageNumber: 99, pageTotal: 99 });
        host.replaceChildren(page); cur = { spec, page };
      };
      const rowsOnPage = () => cur.spec.sections.reduce((n, s) => n + s.items.length, 0);
      const startSection = g => {
        setAreas(cur.page, cur.spec.sections.map(s => s.group.area).concat(g.area));
        return addSection(cur.page, { area: g.area, cols, groupCount: g.items.length, part: 9, parts: 9 });
      };
      const dropSection = () => { cur.page.querySelector('.body-list').lastElementChild.remove(); setAreas(cur.page, cur.spec.sections.map(s => s.group.area)); };
      const fill = (tbody, rest, start, g, force) => {
        const capLeft = ROW_CAP - rowsOnPage();
        let count = 0;
        if (!overflows(cur.page)) for (const p of rest) {
          if (count >= capLeft) break;
          const row = makeRow(p, start + count + 1, cols, fields, g.area.id);
          tbody.append(row);
          if (overflows(cur.page)) { row.remove(); break; }
          count++;
        }
        if (!count && force) { tbody.append(makeRow(rest[0], start + 1, cols, fields, g.area.id)); count = 1; } // 한 행이 페이지보다 큰 예외
        return count;
      };
      const trim = (tbody, keep) => { while (tbody.children.length > keep) tbody.lastElementChild.remove(); };
      let number = 0;
      used.forEach(g => {
        let rest = g.items.slice();
        // 2-1) 앞 분류가 끝난 페이지에 여백이 있으면 이어서 시작(종이 절약)
        if (cur && cur.spec.sections.length && !breakEach) {
          const tbody = startSection(g);
          let count = fill(tbody, rest, number, g, false);
          if (count < rest.length) {
            if (rest.length < MIN_START + MIN_TAIL) count = 0;                 // 작은 분류는 나누지 않음
            else if (rest.length - count < MIN_TAIL) count = rest.length - MIN_TAIL;
            if (count < MIN_START) count = 0;
          }
          if (count) { trim(tbody, count); cur.spec.sections.push({ group: g, items: rest.slice(0, count) }); number += count; rest = rest.slice(count); }
          else dropSection();
        }
        // 2-2) 새 페이지에서 시작하거나 이어서 채우기
        while (rest.length) {
          open();
          const tbody = startSection(g);
          let count = fill(tbody, rest, number, g, true);
          const left = rest.length - count;
          if (left > 0 && left < MIN_TAIL && count - (MIN_TAIL - left) >= MIN_START) count = rest.length - MIN_TAIL; // 다음 페이지에 1~2행만 남지 않게
          trim(tbody, count);
          cur.spec.sections.push({ group: g, items: rest.slice(0, count) });
          number += count; rest = rest.slice(count);
        }
      });

      // 3) 페이지 번호·분류별 시작 페이지·분할 표시를 확정해 최종 페이지 생성(연결선은 측정 영역에서 그린 뒤 옮김)
      const total = plan.length, startPages = {}, parts = {}, seen = {};
      plan.forEach((pg, i) => pg.sections.forEach(s => { const id = s.group.area.id; if (!startPages[id]) startPages[id] = i + 1; parts[id] = (parts[id] || 0) + 1; }));
      let n = 0;
      plan.forEach((pg, i) => {
        const page = makePage({ ...common, areas: pg.sections.map(s => s.group.area), memo: pg.memo ? opts.memo : '', pageNumber: i + 1, pageTotal: total, startPages });
        pg.sections.forEach(s => {
          const id = s.group.area.id; seen[id] = (seen[id] || 0) + 1;
          const tbody = addSection(page, { area: s.group.area, cols, groupCount: s.group.items.length, part: seen[id], parts: parts[id] });
          s.items.forEach(p => { n++; tbody.append(makeRow(p, n, cols, fields, id)); });
        });
        host.replaceChildren(page);
        drawConnectors(page);
        sheet.append(page);
      });
    } finally { host.remove(); }
    return sheet;
  }

  window.EchoBodyPrint = { FIELDS, DEFAULTS, MAX_COLS, ROW_CAP, DEFAULT_TITLE, build, pageSelector: '.body-page' };
})();
