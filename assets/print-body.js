/* A4 세로 · 인체 기능형 카탈로그 (v9.1)
 * - 기존 가로형·세로 압축형 인쇄 코드(print.js)와 분리된 모듈입니다. print.js 가 이 모듈의 build() 를 호출합니다.
 * - 분류는 data/body-functions.js, 회사 정보는 data/site-config.js 를 사용합니다.
 * - 페이지 분할: 별도 측정 영역(#print-measure-body)에서 실제 행 높이를 재며 채우고, 넘치면 다음 페이지로 넘깁니다.
 *   글자 크기는 줄이지 않고(고정), 페이지당 최대 22개입니다.
 */
(() => {
  'use strict';
  const BF = window.EchoBodyFunctions;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const ROW_CAP = 22;
  const SAFETY_PX = 6; // 표 아래 약 1.6mm 여유: 인쇄 엔진의 줄바꿈 차이 대비
  const PX_PER_MM = 96 / 25.4;
  const DEFAULT_TITLE = '기능별 원료 포트폴리오';

  /* 출력 항목: sub = 제품명 아래 보조 줄, feature = 기능/특징 열, col = 별도 열(최대 2개) */
  const FIELDS = [
    ['code', '제품코드', 'sub'],
    ['catalogType', '국내 식품분류', 'sub'],
    ['efficacy', '효능·기능 설명', 'feature'],
    ['function', '주요 특성', 'feature'],
    ['tags', '관련 기능 태그', 'feature'],
    ['marker', '지표성분', 'col'],
    ['origin', '원산지', 'col'],
    ['packaging', '포장단위', 'col']
  ];
  const DEFAULTS = ['code', 'catalogType', 'efficacy', 'function', 'tags'];
  const MAX_COLS = 2;
  const COL_WIDTH = { marker: 30, origin: 16, packaging: 16 };

  const node = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined && text !== null) n.textContent = text; if (cls) n.className = cls; return n; };
  const svg = (tag, attrs) => { const n = document.createElementNS(SVG_NS, tag); Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, String(v))); return n; };
  const ko = text => String(text || '').split(';').map(s => s.includes(' / ') ? s.split(' / ').slice(1).join(' / ').trim() : s.trim()).filter(Boolean);
  const pad = n => String(n).padStart(2, '0');

  /* ---------- 인체 그래픽 (단색 벡터 · viewBox 100×200) ---------- */
  function bodyMap(area) {
    const anchors = (BF && BF.anchors) || {};
    const active = area && area.kind === 'body' ? anchors[area.anchor] : null;
    const map = svg('svg', { viewBox: '0 0 100 200', class: 'body-map' + (active && active.whole ? ' is-whole' : ''), 'aria-hidden': 'true', focusable: 'false' });
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
      const on = area && area.id === a.id;
      if (on) map.append(svg('circle', { class: 'bm-halo', cx: pt.x, cy: pt.y, r: 8.5 }));
      const dot = svg('circle', { class: 'bm-marker' + (on ? ' is-active' : ''), cx: pt.x, cy: pt.y, r: on ? 5.2 : 4.2 });
      dot.dataset.area = a.id;
      map.append(dot);
    });
    if (active && active.whole) {
      const dot = svg('circle', { class: 'bm-anchor', cx: active.x, cy: active.y, r: 0.1 });
      dot.dataset.area = area.id; map.append(dot);
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
    const tr = node('tr'); tr.dataset.productId = p.id;
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
  function makePage(o) {
    const area = o.area, kind = area.kind;
    const page = node('article', undefined, 'body-page'); page.dataset.area = area.id;
    // header
    const header = node('header', undefined, 'body-header');
    const logo = node('img'); logo.src = 'assets/echo-trading-logo.svg'; logo.alt = 'Echo Trading'; logo.className = 'body-logo';
    const title = node('div', undefined, 'body-title');
    const kicker = node('p', 'FUNCTIONAL INGREDIENT PORTFOLIO', 'body-kicker'); kicker.lang = 'en';
    title.append(kicker, node('h1', o.title || DEFAULT_TITLE), node('p', o.customer ? `${o.customer} 귀중` : '인체 기능 영역에 따른 식품원료 분류 · 제품 리스트', 'body-sub'));
    const meta = node('div', undefined, 'body-meta');
    meta.append(node('span', `${area.no} ${area.name}`, 'body-meta__area'));
    const pageNo = node('span', undefined, 'body-meta__page'); pageNo.append(node('strong', pad(o.pageNumber)), document.createTextNode(` / ${pad(o.pageTotal)}`));
    meta.append(pageNo);
    header.append(logo, title, meta); page.append(header);
    if (o.memo) page.append(node('p', o.memo, 'body-memo'));
    // main
    const main = node('div', undefined, 'body-main');
    const nav = node('aside', undefined, 'body-nav');
    const mapLabel = node('p', 'BODY MAP', 'body-nav__label'); mapLabel.lang = 'en';
    nav.append(mapLabel, bodyMap(area));
    if (kind !== 'body') nav.append(node('p', '이 분류는 특정 인체 부위와 연결하지 않습니다.', 'body-map__caption'));
    const indexBlock = (label, list) => {
      nav.append(node('p', label, 'body-nav__label body-nav__label--index'));
      const ol = node('ol', undefined, 'body-index');
      list.forEach(a => {
        const li = node('li'); if (a.id === area.id) li.classList.add('is-active');
        const start = o.startPages && o.startPages[a.id];
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
    const list = node('section', undefined, 'body-list');
    const band = node('div', undefined, 'body-band' + (kind === 'body' ? '' : kind === 'review' ? ' body-band--review' : ' body-band--general'));
    const bandText = node('div');
    const en = node('p', `${area.no} · ${area.en}`, 'body-band__en'); en.lang = 'en';
    bandText.append(en, node('h2', area.title));
    band.append(bandText, node('p', o.parts > 1 ? `${o.groupCount}개 원료 · ${o.part} / ${o.parts}` : `${o.groupCount}개 원료`, 'body-band__count'));
    list.append(band, makeTable(o.cols));
    main.append(nav, list);
    page.append(main);
    // footer
    const footer = node('footer', undefined, 'body-footer');
    const left = node('p'); left.append(node('strong', 'ECHO TRADING'), document.createTextNode(` | ${[o.companyName, o.contactLine].filter(Boolean).join(' · ')}`));
    footer.append(left, node('p', '기능 분류는 제품 DB의 효능·기능 정보를 바탕으로 한 참고 분류이며, 제품별 표시 가능한 기능성을 뜻하지 않습니다. 규격·적용 조건은 문의해 주세요.', 'body-footer__note'),
      node('p', `출력일 ${o.printDate} · ${pad(o.pageNumber)} / ${pad(o.pageTotal)}`, 'body-footer__page'));
    page.append(footer);
    return page;
  }

  /* 연결선: 활성 부위 → 오른쪽 패널 경계 → 패널 사이 여백(세로) → 표 머리띠. 측정값(mm)으로 그립니다. */
  function connectorGeometry(page) {
    const main = page.querySelector('.body-main'), nav = page.querySelector('.body-nav'), band = page.querySelector('.body-band');
    const active = page.querySelector('.bm-marker.is-active, .bm-anchor');
    if (!main || !active || !band) return null;
    const m = main.getBoundingClientRect(), a = active.getBoundingClientRect(), n = nav.getBoundingClientRect(), b = band.getBoundingClientRect();
    const mm = v => Math.round(v / PX_PER_MM * 100) / 100;
    return {
      sx: mm(a.right - m.left), sy: mm(a.top + a.height / 2 - m.top),
      gx: mm((n.right + b.left) / 2 - m.left), by: mm(b.top + b.height / 2 - m.top), bx: mm(b.left - m.left)
    };
  }
  function drawConnector(page, g) {
    if (!g) return;
    const w = Math.ceil(g.bx + 2), h = Math.ceil(Math.max(g.sy, g.by) + 2);
    const c = svg('svg', { class: 'body-connector', width: `${w}mm`, height: `${h}mm`, viewBox: `0 0 ${w} ${h}`, 'aria-hidden': 'true', focusable: 'false' });
    c.append(svg('path', { d: `M${g.sx} ${g.sy} H${g.gx} V${g.by} H${g.bx}` }), svg('circle', { cx: g.bx, cy: g.by, r: 0.7 }));
    page.querySelector('.body-main').append(c);
  }

  function overflows(page) {
    const list = page.querySelector('.body-list'), table = page.querySelector('.body-table');
    return table.getBoundingClientRect().bottom > list.getBoundingClientRect().bottom - SAFETY_PX;
  }

  /* products: 선택 제품 / opts: { fields:Set, title, customer, memo, companyName, contactLine, printDate } */
  function build(products, opts) {
    const sheet = node('div', undefined, 'body-catalog');
    if (!BF) { sheet.append(node('p', 'data/body-functions.js 를 불러오지 못했습니다.', 'brochure-empty')); return sheet; }
    const fields = opts.fields instanceof Set ? opts.fields : new Set(DEFAULTS);
    const cols = columnsFor(fields);
    // 1) 분류별 묶기 — 각 제품은 대표 분류 한 곳에만 들어갑니다(중복 출력 없음). 분류 안에서는 제품명 가나다순.
    const groups = BF.areas.map(area => ({ area, items: [] }));
    const byArea = new Map(groups.map(g => [g.area.id, g]));
    products.forEach(p => byArea.get(BF.classify(p).primary).items.push(p));
    groups.forEach(g => g.items.sort((a, b) => a.name.localeCompare(b.name, 'ko') || a.id.localeCompare(b.id)));
    const used = groups.filter(g => g.items.length);
    if (!used.length) { sheet.append(node('p', '출력할 제품 범위를 선택하거나 목록에서 제품을 담아 주세요.', 'brochure-empty')); return sheet; }

    const host = node('div'); host.id = 'print-measure-body'; host.className = 'body-catalog'; host.setAttribute('aria-hidden', 'true');
    document.body.append(host);
    const common = { cols, title: opts.title, customer: opts.customer, companyName: opts.companyName, contactLine: opts.contactLine, printDate: opts.printDate };
    const plan = [], geometry = {};
    try {
      // 2) 실측 분할: 한 행씩 넣어 보고 넘치면 다음 페이지로(greedy). 여러 페이지가 되면 행 수를 고르게 나눈 뒤
      //    각 페이지가 실제로 들어가는지 다시 측정합니다(마지막 페이지에 1~2개만 남는 현상 방지).
      //    고르게 나눈 결과가 넘치면 마지막 두 페이지만 실측으로 다시 나눕니다.
      const trial = (g, items, first, start) => {
        const page = makePage({ ...common, area: g.area, memo: first ? opts.memo : '', pageNumber: 99, pageTotal: 99, part: 9, parts: 9, groupCount: g.items.length });
        host.replaceChildren(page);
        const body = page.querySelector('tbody');
        items.forEach((p, i) => body.append(makeRow(p, start + i + 1, cols, fields, g.area.id)));
        return page;
      };
      let number = 0, first = true;
      used.forEach(g => {
        const greedy = [];
        let rest = g.items.slice(), n = number, isFirst = first;
        while (rest.length) {
          const page = trial(g, [], isFirst, n), body = page.querySelector('tbody');
          let count = 0;
          for (const p of rest) {
            if (count >= ROW_CAP) break;
            const row = makeRow(p, n + count + 1, cols, fields, g.area.id);
            body.append(row);
            if (overflows(page)) { if (count > 0) row.remove(); else count++; break; }
            count++;
          }
          if (!geometry[g.area.id] && g.area.kind === 'body') geometry[g.area.id] = connectorGeometry(page);
          greedy.push(rest.slice(0, count)); n += count; rest = rest.slice(count); isFirst = false;
        }
        let chunks = greedy;
        if (greedy.length > 1) {
          const k = greedy.length, total = g.items.length, base = Math.floor(total / k), extra = total % k;
          const balanced = []; let offset = 0;
          for (let i = 0; i < k; i++) { const size = base + (i < extra ? 1 : 0); balanced.push(g.items.slice(offset, offset + size)); offset += size; }
          let ok = true, start = number;
          balanced.forEach((items, i) => { if (!ok) return; ok = items.length <= ROW_CAP && !overflows(trial(g, items, first && i === 0, start)); start += items.length; });
          if (ok) chunks = balanced;
          else {
            // 고르게 나눈 결과가 넘치면(긴 설명이 몰린 경우) 마지막 두 페이지만 다시 나눕니다.
            // 앞 페이지 끝의 행을 마지막 페이지로 옮겨 보고, 마지막 페이지가 실제로 들어가는 가장 고른 분할을 씁니다.
            const prev = greedy[k - 2], last = greedy[k - 1];
            const prevStart = number + greedy.slice(0, k - 2).reduce((s, c) => s + c.length, 0);
            for (let m = Math.floor((prev.length - last.length) / 2); m >= 1; m--) {
              const moved = prev.slice(prev.length - m).concat(last);
              if (moved.length > ROW_CAP) continue;
              if (!overflows(trial(g, moved, false, prevStart + prev.length - m))) {
                chunks = greedy.slice(0, k - 2).concat([prev.slice(0, prev.length - m), moved]);
                break;
              }
            }
          }
        }
        chunks.forEach((items, i) => plan.push({ group: g, items, first: first && i === 0 }));
        number += g.items.length; first = false;
      });
    } finally { host.remove(); }

    // 3) 페이지 번호·분류별 시작 페이지·분할 표시를 확정해 최종 페이지 생성
    const total = plan.length, startPages = {}, parts = {};
    plan.forEach((pl, i) => { const id = pl.group.area.id; if (!startPages[id]) startPages[id] = i + 1; parts[id] = (parts[id] || 0) + 1; });
    const seen = {};
    let number = 0;
    plan.forEach((pl, i) => {
      const id = pl.group.area.id; seen[id] = (seen[id] || 0) + 1;
      const page = makePage({ ...common, area: pl.group.area, memo: pl.first ? opts.memo : '', pageNumber: i + 1, pageTotal: total, part: seen[id], parts: parts[id], groupCount: pl.group.items.length, startPages });
      const body = page.querySelector('tbody');
      pl.items.forEach(p => { number++; body.append(makeRow(p, number, cols, fields, id)); });
      drawConnector(page, geometry[id]);
      sheet.append(page);
    });
    return sheet;
  }

  window.EchoBodyPrint = { FIELDS, DEFAULTS, MAX_COLS, ROW_CAP, DEFAULT_TITLE, build, pageSelector: '.body-page' };
})();
