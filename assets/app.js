/* 고객 화면: 제품 검색·분류·목록·상세보기.
 * data/catalog.js(제품), data/taxonomy.js(원료 분야 매핑), data/site-config.js(연락처)를 사용합니다.
 * 원료 분야(8개)와 국내 식품분류(건강기능식품·일반식품·식품첨가물)는 서로 다른 탐색 축입니다. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const items = Array.isArray(window.ECHO_PRODUCTS) ? window.ECHO_PRODUCTS.filter(p => p.visible !== false) : [];
  const tax = window.EchoTaxonomy || { groups: [], group: () => null, groupOf: () => '' };
  const site = window.ECHO_SITE || {};
  const pageSize = 50;
  const blank = { catalogType: '', catalogGroup: '', area: '', category: '', subcategory: '', application: '', query: '', sort: 'name', page: 1 };
  const state = { ...blank };
  const types = ['', '건강기능식품', '일반식품', '식품첨가물'];
  const generalGroups = ['일반원료', '기능성부원료'];

  const ko = text => String(text || '').split(';').map(s => s.includes(' / ') ? s.split(' / ').slice(1).join(' / ').trim() : s.trim()).filter(Boolean).join('; ');
  const tokens = value => ko(value).split(';').map(s => s.trim()).filter(Boolean);
  const normalized = value => String(value).normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, '');
  const el = (tag, text, cls) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (cls) node.className = cls; return node; };
  const icon = path => { const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'), p = document.createElementNS(ns, 'path'); svg.setAttribute('width', '14'); svg.setAttribute('height', '14'); svg.setAttribute('viewBox', '0 0 16 16'); svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '1.8'); svg.setAttribute('aria-hidden', 'true'); p.setAttribute('d', path); svg.append(p); return svg; };
  const areaById = new Map(items.map(p => [p.id, tax.groupOf(p)]));
  const corpus = new Map(items.map(p => [p.id, normalized(Object.values(p).join(' '))]));
  const areaOf = p => areaById.get(p.id) || '';
  const areaName = id => (tax.group(id) || {}).name || '';
  const isMobile = () => window.matchMedia('(max-width: 960px)').matches;

  /* ---------- 필터 ---------- */
  const inScope = (p, s = state) => (!s.catalogType || p.catalogType === s.catalogType) && (!s.catalogGroup || p.catalogGroup === s.catalogGroup);
  const scope = (s = state) => items.filter(p => inScope(p, s));
  function matches(p, s = state) {
    if (!inScope(p, s)) return false;
    if (s.area && areaOf(p) !== s.area) return false;
    if (s.category && p.category !== s.category) return false;
    if (s.subcategory && ko(p.subcategory) !== s.subcategory) return false;
    if (s.application && !tokens(p.application).includes(s.application)) return false;
    const queries = s.query.trim().split(/\s+/).filter(Boolean).map(normalized);
    return queries.every(q => corpus.get(p.id).includes(q));
  }
  const results = (s = state) => items.filter(p => matches(p, s));
  const hasDetailFilters = (s = state) => Boolean(s.area || s.category || s.subcategory || s.application);

  function selectOptions(id, values, first, current) {
    const select = $(id); select.replaceChildren(new Option(first, ''));
    const unique = [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));
    unique.forEach(v => select.add(new Option(v, v)));
    select.value = unique.includes(current) ? current : '';
    return select.value;
  }
  function refreshOptions() {
    const pool = scope().filter(p => (!state.area || areaOf(p) === state.area) && (!state.category || p.category === state.category));
    state.subcategory = selectOptions('subcategory', pool.map(p => ko(p.subcategory)), '전체 소분류', state.subcategory);
    state.application = selectOptions('application', pool.flatMap(p => tokens(p.application)), '전체 적용 분야', state.application);
    $('sort').value = state.sort;
  }

  /* ---------- 상단: 국내 식품분류 ---------- */
  function topNavigation() {
    const tabs = $('catalog-tabs'); tabs.replaceChildren();
    types.forEach(type => {
      const active = state.catalogType === type;
      const b = el('button', undefined, 'catalog-tab' + (active ? ' active' : ''));
      b.type = 'button'; b.dataset.focusKey = 'type-' + (type || 'all'); b.setAttribute('aria-pressed', String(active));
      b.append(el('span', type || '전체 제품'), el('small', String(items.filter(p => !type || p.catalogType === type).length)));
      b.addEventListener('click', () => update({ catalogType: type, catalogGroup: '', area: '', category: '', subcategory: '', application: '' }));
      tabs.append(b);
    });
    const groups = $('general-groups');
    groups.hidden = state.catalogType !== '일반식품';
    groups.replaceChildren();
    ['', ...generalGroups].forEach(group => {
      const active = state.catalogGroup === group;
      const b = el('button', undefined, 'group-tab' + (active ? ' active' : ''));
      b.type = 'button'; b.dataset.focusKey = 'tgroup-' + (group || 'all'); b.setAttribute('aria-pressed', String(active));
      b.append(document.createTextNode((group || '일반식품 전체') + ' '), el('small', String(items.filter(p => p.catalogType === '일반식품' && (!group || p.catalogGroup === group)).length)));
      b.addEventListener('click', () => update({ catalogType: '일반식품', catalogGroup: group, area: '', category: '', subcategory: '', application: '' }));
      groups.append(b);
    });
  }

  /* ---------- 좌측: 원료 분야 → 대분류 ---------- */
  function areaNavigation() {
    const pool = scope(), wrap = $('categories');
    wrap.replaceChildren();
    const all = el('button', undefined, 'area-all');
    all.type = 'button'; all.dataset.focusKey = 'area-all'; all.setAttribute('aria-current', String(!state.area));
    all.append(el('span', '전체 원료', 'area-head__name'), el('small', String(pool.length)));
    all.addEventListener('click', () => { update({ area: '', category: '', subcategory: '' }); closeAreaPanel(); });
    wrap.append(all);
    tax.groups.forEach(g => {
      const inGroup = pool.filter(p => areaOf(p) === g.id), selected = state.area === g.id;
      const box = el('div', undefined, 'area-group');
      const head = el('button', undefined, 'area-head');
      head.type = 'button'; head.dataset.focusKey = 'area-' + g.id;
      head.setAttribute('aria-current', String(selected && !state.category)); head.setAttribute('aria-expanded', String(selected));
      head.disabled = !inGroup.length && !selected;
      head.append(el('span', g.no, 'area-head__no'), el('span', g.name, 'area-head__name'), el('small', String(inGroup.length)));
      head.addEventListener('click', () => update({ area: g.id, category: '', subcategory: '' }));
      box.append(head);
      if (selected) {
        const list = el('ul', undefined, 'area-cats'); list.id = 'area-cats-' + g.id; head.setAttribute('aria-controls', list.id);
        const present = new Set(inGroup.map(p => p.category));
        // taxonomy 순서 → 소분류 예외 규칙으로 들어온 대분류(예: 유지·지질의 '기타 원료') 순서로 표시
        [...g.categories.filter(c => present.has(c)), ...[...present].filter(c => !g.categories.includes(c))].forEach(c => {
          const li = el('li'), b = el('button', undefined, 'area-cat');
          b.type = 'button'; b.dataset.focusKey = 'cat-' + c; b.setAttribute('aria-current', String(state.category === c));
          b.append(el('span', ko(c)), el('small', String(inGroup.filter(p => p.category === c).length)));
          b.addEventListener('click', () => { update({ category: state.category === c ? '' : c, subcategory: '' }); closeAreaPanel(); });
          li.append(b); list.append(li);
        });
        box.append(list);
      }
      wrap.append(box);
    });
    const label = state.category ? `${areaName(state.area)} › ${ko(state.category)}` : (areaName(state.area) || '전체');
    $('area-toggle-value').textContent = label;
  }
  function closeAreaPanel() { if (!isMobile()) return; $('area-panel').classList.remove('is-open'); $('area-toggle').setAttribute('aria-expanded', 'false'); }
  $('area-toggle').addEventListener('click', () => { const open = !$('area-panel').classList.contains('is-open'); $('area-panel').classList.toggle('is-open', open); $('area-toggle').setAttribute('aria-expanded', String(open)); });

  /* ---------- 적용된 필터 칩 ---------- */
  function chips() {
    const box = $('active-filters'); box.replaceChildren();
    const list = [];
    if (state.query.trim()) list.push(['query', '검색어', `‘${state.query.trim()}’`, { query: '' }]);
    if (state.catalogType) list.push(['type', '국내 식품분류', state.catalogType, { catalogType: '', catalogGroup: '' }]);
    if (state.catalogGroup) list.push(['tgroup', '일반식품 하위', state.catalogGroup, { catalogGroup: '' }]);
    if (state.area) list.push(['area', '원료 분야', areaName(state.area), { area: '', category: '', subcategory: '' }]);
    if (state.category) list.push(['category', '대분류', ko(state.category), { category: '', subcategory: '' }]);
    if (state.subcategory) list.push(['subcategory', '소분류', state.subcategory, { subcategory: '' }]);
    if (state.application) list.push(['application', '어플리케이션', state.application, { application: '' }]);
    if (!list.length) return;
    list.forEach(([key, label, value, patch], index) => {
      const chip = el('span', undefined, 'chip');
      const remove = el('button'); remove.type = 'button'; remove.dataset.focusKey = 'chip-' + key; remove.setAttribute('aria-label', `${label} ${value} 해제`); remove.append(icon('m4 4 8 8M12 4l-8 8'));
      remove.addEventListener('click', () => {
        const next = list[index + 1] || list[index - 1];
        update(patch, { focus: next ? 'chip-' + next[0] : 'search' });
      });
      chip.append(el('span', label, 'chip__key'), el('span', value, 'chip__value'), remove);
      box.append(chip);
    });
    const actions = el('span', undefined, 'chip-actions');
    if (hasDetailFilters()) { const b = el('button', '필터 초기화', 'text-button'); b.type = 'button'; b.title = '원료 분야·대분류·소분류·어플리케이션 해제 (검색어와 국내 식품분류는 유지)'; b.addEventListener('click', resetFilters); actions.append(b); }
    if (list.length > 1 || !hasDetailFilters()) { const b = el('button', '전체 제품 보기', 'text-button'); b.type = 'button'; b.title = '검색어와 모든 분류·필터 해제'; b.addEventListener('click', showAll); actions.append(b); }
    box.append(actions);
  }
  function resetFilters() { update({ area: '', category: '', subcategory: '', application: '' }, { focus: 'search' }); }
  function showAll() { $('search').value = ''; update({ ...blank, sort: state.sort }, { focus: 'search' }); }

  /* ---------- 상세보기 ---------- */
  let detailProduct = null;
  function field(label, value, options = {}) {
    const row = el('div'), dd = el('dd');
    if (options.node) dd.append(options.node);
    else if (value) dd.textContent = value;
    else { dd.textContent = '문의'; dd.classList.add('is-empty'); }
    row.append(el('dt', label), dd); return row;
  }
  function stockNode(value) {
    const wrap = el('span'), badge = el('span', value || '미정', 'stock-badge' + (value === '운용' ? ' stock-badge--active' : ''));
    wrap.append(badge);
    if (value !== '운용') wrap.append(el('span', value === '미운용' ? '재고를 운용하지 않는 품목입니다. 공급 조건은 문의해 주세요.' : '재고 운용 여부가 확정되지 않았습니다. 공급 가능 여부는 문의해 주세요.', 'stock-note'));
    return wrap;
  }
  function detailSelectLabel() {
    const button = $('detail-select'), on = window.EchoPrint && detailProduct ? window.EchoPrint.isChosen(detailProduct.id) : false;
    button.textContent = on ? '자료에 담김 · 빼기' : '소개자료에 담기';
    button.setAttribute('aria-pressed', String(on));
  }
  function detail(p) {
    detailProduct = p;
    $('detail-code').textContent = p.id;
    $('detail-title').textContent = p.name;
    const path = $('detail-category'); path.replaceChildren();
    [areaName(areaOf(p)), ko(p.category), ko(p.subcategory)].filter(Boolean).forEach((t, i) => path.append(el('li', t, i === 0 ? 'is-type' : '')));
    const fields = $('detail-fields'); fields.replaceChildren();
    const tags = tokens(p.function);
    const tagNode = tags.length ? (() => { const f = document.createDocumentFragment(); tags.forEach(t => f.append(el('span', t, 'tag'))); return f; })() : null;
    const formProcess = [ko(p.form), ko(p.process)].filter(Boolean).join(' · ');
    [
      field('국내 식품분류', [p.catalogType, p.catalogGroup].filter(Boolean).join(' · ')),
      field('대분류 / 소분류', [ko(p.category), ko(p.subcategory)].filter(Boolean).join(' / ')),
      field('지표성분', p.marker),
      field('규격 / 함량', p.spec),
      field('원산지', p.origin),
      field('포장단위', p.packaging),
      field('주요 특성', '', tagNode ? { node: tagNode } : {}),
      p.efficacy ? field('효능', ko(p.efficacy)) : null,
      field('적용 분야', tokens(p.application).join(' · ')),
      field('형태 · 공정', formProcess),
      field('Stock 운용', '', { node: stockNode(p.stock) })
    ].filter(Boolean).forEach(row => fields.append(row));
    const related = items.filter(x => x.category === p.category && x.subcategory === p.subcategory);
    const relatedButton = $('detail-related');
    relatedButton.hidden = related.length < 2;
    relatedButton.textContent = `같은 소분류 제품 보기 (${related.length}개)`;
    detailSelectLabel();
    if (!$('detail').open) $('detail').showModal();
    $('detail').scrollTop = 0;
  }
  $('detail-select').addEventListener('click', () => { if (!detailProduct || !window.EchoPrint) return; window.EchoPrint.setChosen(detailProduct.id, !window.EchoPrint.isChosen(detailProduct.id)); detailSelectLabel(); });
  $('detail-related').addEventListener('click', () => {
    const p = detailProduct; if (!p) return;
    $('detail').close();
    $('search').value = '';
    update({ ...blank, sort: state.sort, area: areaOf(p), category: p.category, subcategory: ko(p.subcategory) });
    scrollToResults();
  });
  document.querySelector('.close-dialog').addEventListener('click', () => $('detail').close());
  $('detail').addEventListener('click', e => { if (e.target === $('detail')) { const r = $('detail').getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) $('detail').close(); } });

  /* ---------- 목록 ---------- */
  function row(p) {
    const tr = el('tr'); tr.dataset.productId = p.id;
    const select = el('td', undefined, 'cell-select'); select.append(window.EchoPrint.createCheckbox(p));
    const name = el('td', undefined, 'cell-name');
    const button = el('button', p.name, 'product-name'); button.type = 'button'; button.addEventListener('click', () => detail(p));
    name.append(el('span', p.id, 'product-code'), button);
    if (p.marker) { const marker = el('span', undefined, 'marker'); marker.append(el('b', '지표성분'), document.createTextNode(p.marker)); name.append(marker); }
    const pack = el('td', p.packaging || '문의', 'cell-pack' + (p.packaging ? '' : ' muted')); pack.dataset.label = '포장단위';
    const origin = el('td', p.origin || '문의', 'cell-origin' + (p.origin ? '' : ' muted')); origin.dataset.label = '원산지';
    const features = el('td', undefined, 'cell-feature'); features.dataset.label = '주요 특성';
    const ft = tokens(p.function);
    if (ft.length) ft.forEach(t => features.append(el('span', t, 'tag'))); else features.append(el('span', '문의', 'muted'));
    const apps = el('td', tokens(p.application).join(' · ') || '문의', 'cell-app'); apps.dataset.label = '어플리케이션';
    tr.append(select, name, pack, origin, features, apps);
    return tr;
  }
  function pagination(total, pages) {
    const box = $('page-number'); box.replaceChildren();
    const numbers = [];
    if (pages <= 9) for (let i = 1; i <= pages; i++) numbers.push(i);
    else { const set = new Set([1, pages, state.page - 1, state.page, state.page + 1].filter(n => n >= 1 && n <= pages)); [...set].sort((a, b) => a - b).forEach((n, i, arr) => { if (i && n - arr[i - 1] > 1) numbers.push('…'); numbers.push(n); }); }
    numbers.forEach(n => {
      if (n === '…') { box.append(el('span', '…', 'page-ellipsis')); return; }
      const b = el('button', String(n)); b.type = 'button'; b.dataset.focusKey = 'page-' + n; b.setAttribute('aria-label', `${n}페이지`);
      if (Math.abs(n - state.page) > 1 && n !== 1 && n !== pages) b.classList.add('page-far');
      if (n === state.page) b.setAttribute('aria-current', 'page');
      b.addEventListener('click', () => goPage(n));
      box.append(b);
    });
    $('prev').disabled = state.page <= 1; $('next').disabled = state.page >= pages;
    $('page-info').textContent = total ? `${total}개 중 ${(state.page - 1) * pageSize + 1}–${Math.min(state.page * pageSize, total)}번째 표시 · ${state.page} / ${pages}페이지` : '0개 제품';
  }
  function emptyState() {
    const q = state.query.trim();
    $('empty-title').textContent = q ? `‘${q}’에 해당하는 제품이 없습니다.` : '선택한 조건에 맞는 제품이 없습니다.';
    $('empty-text').textContent = '철자나 띄어쓰기를 확인하거나 아래에서 조건을 줄여 보세요. 목록에 없는 원료도 문의하시면 소싱 가능 여부를 확인해 드립니다.';
    const actions = $('empty-actions'); actions.replaceChildren();
    const add = (label, patch, primary) => { const b = el('button', label, 'button ' + (primary ? 'button--primary' : 'button--secondary')); b.type = 'button'; b.addEventListener('click', () => { if ('query' in patch) $('search').value = patch.query; update(patch, { focus: 'search' }); }); actions.append(b); };
    if (q) { const n = results({ ...state, query: '' }).length; if (n) add(`검색어 지우기 (${n}개)`, { query: '' }, true); }
    if (hasDetailFilters()) { const n = results({ ...state, area: '', category: '', subcategory: '', application: '' }).length; if (n) add(`필터 초기화 (${n}개)`, { area: '', category: '', subcategory: '', application: '' }, !q); }
    if (state.catalogType) { const n = results({ ...state, catalogType: '', catalogGroup: '' }).length; if (n) add(`모든 국내 식품분류에서 보기 (${n}개)`, { catalogType: '', catalogGroup: '' }); }
    add(`전체 제품 보기 (${items.length}개)`, { ...blank, sort: state.sort });
    const tel = site.contact && site.contact.tel;
    if (tel) { const a = el('a', `원료 문의 ${tel.label}`, 'button button--secondary'); a.href = tel.href; actions.append(a); }
  }
  function render() {
    const filtered = results();
    filtered.sort((a, b) => (state.sort === 'code' ? a.id.localeCompare(b.id) : a.name.localeCompare(b.name, 'ko')) || a.id.localeCompare(b.id));
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    state.page = Math.min(Math.max(1, state.page), pages);
    const title = state.category ? ko(state.category) : state.area ? areaName(state.area) : (state.catalogGroup || state.catalogType || '전체 제품');
    $('category-title').textContent = title;
    const count = $('result-count'); count.replaceChildren();
    const q = state.query.trim();
    if (q) count.append(document.createTextNode(`‘${q}’ 검색 결과 `));
    count.append(el('strong', String(filtered.length)), document.createTextNode('개 제품'));
    const pageItems = filtered.slice((state.page - 1) * pageSize, state.page * pageSize);
    const body = $('products'); body.replaceChildren(...pageItems.map(row));
    window.EchoPrint.setPage(pageItems);
    $('empty').hidden = filtered.length > 0;
    if (!filtered.length) emptyState();
    document.querySelector('.table-wrap').hidden = filtered.length === 0;
    document.querySelector('.pagination').hidden = filtered.length === 0;
    pagination(filtered.length, pages);
    $('search-clear').hidden = !state.query;
  }

  /* ---------- 상태 갱신 · 주소 저장 ---------- */
  const params = { q: 'query', type: 'catalogType', tgroup: 'catalogGroup', area: 'area', cat: 'category', sub: 'subcategory', app: 'application', sort: 'sort', page: 'page' };
  let urlWritable = true;
  function writeUrl() {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([key, prop]) => { if (state[prop] !== blank[prop] && state[prop] !== '') sp.set(key, String(state[prop])); });
    const qs = sp.toString();
    try { history.replaceState(history.state, '', `${location.pathname}${qs ? '?' + qs : ''}${location.hash}`); }
    catch { urlWritable = false; }
    if (!urlWritable) { try { sessionStorage.setItem('echo-catalog-state', qs); } catch { /* 저장 불가 환경 */ } }
  }
  function readUrl() {
    let qs = '';
    try { qs = location.search.slice(1); if (!qs && location.protocol === 'file:') qs = sessionStorage.getItem('echo-catalog-state') || ''; } catch { qs = ''; }
    const sp = new URLSearchParams(qs), next = {};
    Object.entries(params).forEach(([key, prop]) => { if (sp.has(key)) next[prop] = sp.get(key); });
    if (!types.includes(next.catalogType || '')) next.catalogType = '';
    if (next.catalogType !== '일반식품' || !generalGroups.includes(next.catalogGroup)) next.catalogGroup = '';
    if (next.area && !tax.group(next.area)) next.area = '';
    if (next.category && !items.some(p => p.category === next.category)) next.category = '';
    if (!['name', 'code'].includes(next.sort)) next.sort = 'name';
    next.page = Math.max(1, parseInt(next.page, 10) || 1);
    Object.assign(state, next);
    $('search').value = state.query || '';
  }
  let urlTimer = 0;
  function update(patch = {}, options = {}) {
    const focusKey = options.focus !== undefined ? options.focus : (document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.focusKey : '');
    const keepPage = 'page' in patch;
    Object.assign(state, patch);
    if (!keepPage) state.page = 1;
    if (state.catalogType !== '일반식품') state.catalogGroup = '';
    refreshOptions(); topNavigation(); areaNavigation(); chips(); render();
    clearTimeout(urlTimer); urlTimer = setTimeout(writeUrl, 250);
    if (focusKey === 'search') $('search').focus({ preventScroll: true });
    else if (focusKey) { const target = document.querySelector(`[data-focus-key="${CSS.escape(focusKey)}"]`); if (target && !target.disabled) target.focus({ preventScroll: true }); }
  }
  function scrollToResults() { document.querySelector('.results-bar').scrollIntoView({ block: 'start', behavior: 'auto' }); }
  function goPage(n) { update({ page: n }, { focus: 'page-' + n }); scrollToResults(); }

  $('search').addEventListener('input', e => update({ query: e.target.value }, { focus: '' }));
  $('search').addEventListener('keydown', e => { if (e.key === 'Escape' && $('search').value) { $('search').value = ''; update({ query: '' }, { focus: 'search' }); } });
  $('search-clear').addEventListener('click', () => { $('search').value = ''; update({ query: '' }, { focus: 'search' }); });
  ['subcategory', 'application', 'sort'].forEach(id => $(id).addEventListener('change', e => update({ [id]: e.target.value }, { focus: '' })));
  $('prev').addEventListener('click', () => goPage(state.page - 1));
  $('next').addEventListener('click', () => goPage(state.page + 1));

  /* 메인 화면 섹션(대표 원료·포트폴리오·히어로 검색)에서 사용하는 공개 함수 */
  window.EchoCatalog = {
    products: items,
    areaOf,
    apply(filters = {}, options = {}) {
      const next = { ...blank, sort: state.sort, ...filters };
      if (next.subcategory && !next.category) { const cats = [...new Set(items.filter(p => ko(p.subcategory) === next.subcategory).map(p => p.category))]; if (cats.length === 1) next.category = cats[0]; }
      if (next.category && !next.area) { const areas = [...new Set(items.filter(p => p.category === next.category && (!next.subcategory || ko(p.subcategory) === next.subcategory)).map(areaOf))]; if (areas.length === 1) next.area = areas[0]; }
      $('search').value = next.query || '';
      update(next, { focus: '' });
      if (options.scroll !== false) document.getElementById('catalog').scrollIntoView({ block: 'start', behavior: 'auto' });
      if (options.focusSearch) $('search').focus({ preventScroll: true });
    },
    showProduct(id) { const p = items.find(x => x.id === id); if (p) detail(p); },
    count(filters = {}) { return results({ ...blank, ...filters }).length; }
  };

  $('total').textContent = items.length;
  if (window.EchoPrint && window.EchoPrint.onChange) window.EchoPrint.onChange(() => { if ($('detail').open) detailSelectLabel(); });
  readUrl();
  update({ page: state.page }, { focus: '' });
  if (location.search && location.hash === '#catalog') requestAnimationFrame(() => document.getElementById('catalog').scrollIntoView({ block: 'start' }));
  if (!Array.isArray(window.ECHO_PRODUCTS)) { $('empty').hidden = false; $('empty-title').textContent = '제품 데이터를 불러오지 못했습니다.'; $('empty-text').textContent = '페이지를 새로고침해 주세요. 문제가 계속되면 담당자에게 문의해 주세요.'; $('empty-actions').replaceChildren(); }
})();
