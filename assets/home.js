/* 메인 화면: 헤더 메뉴, 회사 정보 바인딩, 핵심 지표, 대표 원료, 포트폴리오, 글로벌 네트워크.
 * 수치는 data/catalog.js 에서 자동 집계하고, 회사 정보는 data/site-config.js 에서만 읽습니다. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const site = window.ECHO_SITE || {};
  const tax = window.EchoTaxonomy || { groups: [], countriesOf: () => [], regions: [] };
  const catalog = window.EchoCatalog;
  const items = catalog ? catalog.products : (window.ECHO_PRODUCTS || []).filter(p => p.visible !== false);
  const byId = new Map(items.map(p => [p.id, p]));
  const el = (tag, text, cls) => { const node = document.createElement(tag); if (text !== undefined && text !== null) node.textContent = text; if (cls) node.className = cls; return node; };
  const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

  /* ---------- 회사 정보 바인딩 ---------- */
  document.querySelectorAll('[data-site]').forEach(node => {
    const value = get(site, node.dataset.site);
    if (value) { node.textContent = value; node.hidden = false; } else if (!node.textContent.trim()) node.hidden = true;
  });
  document.querySelectorAll('[data-site-href]').forEach(node => { const value = get(site, node.dataset.siteHref); if (value) node.href = value; });
  const contact = site.contact || {};
  const contactRows = [
    ['TEL', contact.tel], ['FAX', contact.fax], ['E-MAIL', contact.email], ['WEB', contact.web]
  ].filter(([, v]) => v);
  const list = $('contact-list');
  if (list) {
    contactRows.forEach(([label, v]) => {
      const dd = el('dd'), a = el('a', v.label);
      a.href = v.href; if (/^https?:/.test(v.href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      if (label === 'FAX') dd.textContent = v.label; else dd.append(a);
      list.append(el('dt', label), dd);
    });
    const address = contact.addressKo || contact.addressEn;
    if (address) list.append(el('dt', 'ADDRESS'), el('dd', address));
  }
  const footer = $('footer-contact');
  if (footer) contactRows.forEach(([label, v]) => {
    const li = el('li'); li.append(el('span', label));
    if (label === 'FAX') li.append(document.createTextNode(v.intl || v.label));
    else { const a = el('a', label === 'TEL' ? (v.intl || v.label) : v.label); a.href = v.href; if (/^https?:/.test(v.href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; } li.append(a); }
    footer.append(li);
  });

  /* ---------- 헤더: 모바일 메뉴 · 현재 위치 ---------- */
  const nav = $('site-nav'), toggle = document.querySelector('.menu-toggle');
  const setMenu = open => { nav.classList.toggle('is-open', open); toggle.setAttribute('aria-expanded', String(open)); toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기'); };
  toggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); toggle.focus(); } });
  document.addEventListener('click', e => { if (nav.classList.contains('is-open') && !e.target.closest('.site-header')) setMenu(false); });
  document.querySelectorAll('[data-focus-search]').forEach(a => a.addEventListener('click', () => setTimeout(() => { const s = $('search'); if (s) s.focus({ preventScroll: true }); }, 0)));
  const sectionToNav = { about: 'about', signature: 'catalog', portfolio: 'catalog', catalog: 'catalog', expertise: 'expertise', network: 'network', contact: 'contact' };
  if ('IntersectionObserver' in window) {
    const visible = new Map();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0));
      let best = '', ratio = 0; visible.forEach((r, id) => { if (r > ratio) { ratio = r; best = id; } });
      const current = sectionToNav[best] || '';
      nav.querySelectorAll('a[data-nav]').forEach(a => { if (a.dataset.nav === current) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    }, { rootMargin: '-72px 0px -45% 0px', threshold: [0, .1, .25, .5] });
    Object.keys(sectionToNav).forEach(id => { const s = $(id); if (s) observer.observe(s); });
  }

  /* ---------- 히어로 검색 ---------- */
  const heroSearch = $('hero-search');
  if (heroSearch && catalog) heroSearch.addEventListener('submit', e => { e.preventDefault(); catalog.apply({ query: $('hero-search-input').value.trim() }, { focusSearch: true }); });

  /* ---------- 핵심 지표 ---------- */
  const countries = new Map();
  items.forEach(p => tax.countriesOf(p.origin).forEach(c => countries.set(c.name, c.region)));
  const factsBox = $('facts');
  if (factsBox) (site.facts || []).forEach(f => {
    const value = f.auto === 'products' ? items.length : f.auto === 'originCountries' ? countries.size : f.value;
    if (value === undefined || value === null || value === '') return;
    const wrap = el('div', undefined, 'fact'), dd = el('dd');
    dd.append(el('span', String(value), 'fact__value'), el('span', f.unit || '', 'fact__unit'));
    wrap.append(el('dt', f.label), dd); factsBox.append(wrap);
  });

  /* ---------- 대표 원료: Foodform® ---------- */
  const symbols = { Iron: 'Fe', Zinc: 'Zn', Copper: 'Cu', Magnesium: 'Mg', Iodine: 'I', Calcium: 'Ca', Selenium: 'Se', Manganese: 'Mn', Molybdenum: 'Mo', Chromium: 'Cr', 'GTF Chromium': 'Cr', Boron: 'B', Silicon: 'Si', Vanadium: 'V' };
  function nutrient(p) {
    const marker = String(p.marker || '').trim();
    const base = marker.replace(/\s*\(.*$/, '').trim();
    if (symbols[base]) return { symbol: symbols[base], name: base, type: '미네랄' };
    if (/^biotin/i.test(base)) return { symbol: 'B7', name: 'Biotin', type: '비타민' };
    const vitamin = base.match(/^Vitamin\s+([A-Z]\d*)/i);
    if (vitamin) return { symbol: vitamin[1].toUpperCase(), name: `Vitamin ${vitamin[1].toUpperCase()}`, type: '비타민' };
    return { symbol: base.slice(0, 2), name: base || p.name, type: '' };
  }
  const shortName = p => { const n = nutrient(p); return n.name.replace(/^Vitamin /, n.type === '비타민' ? 'Vitamin ' : ''); };
  const ff = site.foodform || {};
  const seriesGrid = $('series-grid');
  if (seriesGrid && catalog) {
    const series = [['yeast', 'series--yeast'], ['lactobacillus', 'series--lacto']];
    let total = 0;
    series.forEach(([key, cls]) => {
      const conf = ff[key]; if (!conf) return;
      const members = items.filter(p => p.subcategory === conf.subcategory);
      total += members.length;
      const featured = (conf.featured || []).map(id => byId.get(id)).filter(p => p && p.subcategory === conf.subcategory);
      const article = el('article', undefined, 'series ' + cls);
      const head = el('div', undefined, 'series__head'), headText = el('div');
      const en = el('p', conf.en, 'series__en'); en.lang = 'en';
      headText.append(en, el('h3', conf.title), el('p', conf.desc, 'series__desc'));
      const count = el('p', undefined, 'series__count'); count.append(el('strong', String(members.length)), document.createTextNode('건 등록'));
      head.append(headText, count); article.append(head);
      const grid = el('ul', undefined, 'element-grid');
      featured.forEach(p => {
        const n = nutrient(p), li = el('li'), b = el('button', undefined, 'element');
        b.type = 'button'; b.setAttribute('aria-label', `${p.name} 상세 정보 보기`);
        const symbol = el('span', n.symbol, 'element__symbol'); symbol.setAttribute('aria-hidden', 'true');
        const name = el('span', n.name, 'element__name'); if (n.type) name.append(el('small', n.type));
        const spec = el('span', undefined, 'element__spec'); spec.append(el('span', '지표성분 함량'), el('strong', p.spec || '문의'));
        b.append(symbol, name, el('span', p.name, 'element__product'), spec);
        b.addEventListener('click', () => catalog.showProduct(p.id));
        li.append(b); grid.append(li);
      });
      article.append(grid);
      const rest = members.filter(p => !featured.includes(p));
      const foot = el('div', undefined, 'series__foot');
      if (rest.length) foot.append(el('p', `그 밖의 등록 품목: ${rest.map(shortName).join(' · ')}`, 'series__more'));
      const all = el('button', `${conf.title} ${members.length}건 모두 보기`, 'button button--secondary button--small'); all.type = 'button';
      all.addEventListener('click', () => catalog.apply({ subcategory: conf.subcategory }));
      foot.append(all); article.append(foot);
      seriesGrid.append(article);
    });
    const others = $('series-others');
    (ff.others || []).forEach(o => {
      const members = items.filter(p => p.subcategory === o.subcategory); if (!members.length) return;
      total += members.length;
      const box = el('div', undefined, 'series-other');
      const h = el('h3', o.name); const small = el('small', o.en); small.lang = 'en'; h.append(small);
      const names = members.map(p => String(p.marker || p.name).replace(/\s*\(.*$/, '')).filter((v, i, a) => a.indexOf(v) === i);
      const b = el('button', `${members.length}건 보기`, 'button button--secondary button--small'); b.type = 'button'; b.setAttribute('aria-label', `${o.name} ${members.length}건 카탈로그에서 보기`);
      b.addEventListener('click', () => catalog.apply({ subcategory: o.subcategory }));
      box.append(h, b, el('p', names.join(' · ')));
      others.append(box);
    });
    const desc = $('signature-desc');
    const maker = ff.manufacturer && ff.manufacturer.public ? `${ff.manufacturer.region === 'North America' ? '북미' : ''} 파트너 ${ff.manufacturer.name}의 ` : '';
    if (desc && total) desc.textContent = `비타민·미네랄을 효모 또는 유산균 배양물 형태로 공급하는 ${maker}Foodform® 원료입니다. 4개 계열 ${total}건을 영양소별 함량 규격과 함께 등록·관리하고 있습니다.`;
  }

  /* ---------- 원료 포트폴리오 ---------- */
  const portfolio = $('portfolio-grid');
  if (portfolio && catalog) tax.groups.forEach(g => {
    const count = items.filter(p => catalog.areaOf(p) === g.id).length;
    const li = el('li', undefined, 'area-card');
    const top = el('div', undefined, 'area-card__top'), counter = el('span', undefined, 'area-card__count');
    counter.append(el('strong', String(count)), document.createTextNode('건'));
    top.append(el('span', g.no, 'area-card__no'), counter);
    const h = el('h3'), a = el('a', g.name); a.href = `?area=${encodeURIComponent(g.id)}#catalog`;
    a.setAttribute('aria-label', `${g.name} ${count}건 카탈로그에서 보기`);
    a.addEventListener('click', e => { e.preventDefault(); catalog.apply({ area: g.id }); });
    h.append(a);
    const en = el('p', g.en, 'area-card__en'); en.lang = 'en';
    li.append(top, h, en, el('p', g.desc, 'area-card__desc'));
    const highlights = (g.highlights || []).map(id => byId.get(id)).filter(Boolean);
    if (highlights.length) {
      const ul = el('ul', undefined, 'area-card__items'); ul.setAttribute('aria-label', `${g.name} 대표 원료`);
      highlights.forEach(p => { const item = el('li'), b = el('button', p.name); b.type = 'button'; b.addEventListener('click', () => catalog.showProduct(p.id)); item.append(b); ul.append(item); });
      li.append(ul);
    }
    portfolio.append(li);
  });

  /* ---------- 글로벌 네트워크 ---------- */
  const partners = site.partners || {};
  const pins = { 'north-america': [19.0, 22.7], 'south-america': [30.7, 65.8], europe: [50.8, 19.6], asia: [74.3, 22.7], oceania: [84.4, 76.3] };
  const labels = $('map-labels');
  if (labels) (partners.regions || []).forEach(r => {
    const pos = pins[r.id]; if (!pos) return;
    const li = el('li', undefined, 'map-label'); li.style.left = pos[0] + '%'; li.style.top = pos[1] + '%';
    li.append(el('span', undefined, 'map-label__dot'), el('span', `${r.name} ${r.count}개사`, 'map-label__badge'));
    labels.append(li);
  });
  const map = $('world-map');
  if (map) { const legend = el('p', undefined, 'map-legend'); const a = el('span'), b = el('span'); a.append(el('i'), document.createTextNode('파트너가 있는 지역')); const ni = el('i'); ni.className = 'none'; b.append(ni, document.createTextNode('게시 파트너 없음')); legend.append(a, b); map.append(legend); }
  const summary = $('partner-summary');
  if (summary && partners.total) {
    const total = el('p', undefined, 'partner-summary__total'); total.append(document.createTextNode(String(partners.total)), el('small', '개사'));
    const dl = el('dl');
    (partners.regions || []).forEach(r => { const row = el('div'); row.append(el('dt', r.name), el('dd', String(r.count))); dl.append(row); });
    summary.append(el('p', '해외 파트너', 'partner-summary__label'), total, el('p', `${partners.basis || ''} · ${(partners.regions || []).length}개 대륙`, 'partner-summary__basis'), dl);
  }
  const originsList = $('origins-list');
  if (originsList) {
    const regionCount = new Map(), regionCountries = new Map();
    let foreign = 0;
    items.forEach(p => {
      const found = tax.countriesOf(p.origin); if (!found.length) return;
      foreign++;
      [...new Set(found.map(c => c.region))].forEach(r => regionCount.set(r, (regionCount.get(r) || 0) + 1));
      found.forEach(c => { const m = regionCountries.get(c.region) || new Map(); m.set(c.name, (m.get(c.name) || 0) + 1); regionCountries.set(c.region, m); });
    });
    const max = Math.max(1, ...regionCount.values());
    tax.regions.slice().sort((a, b) => (regionCount.get(b.id) || 0) - (regionCount.get(a.id) || 0)).forEach(r => {
      const n = regionCount.get(r.id) || 0; if (!n) return;
      const names = [...(regionCountries.get(r.id) || new Map()).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko')).map(([name]) => name);
      const li = el('li', undefined, 'origin-row');
      const name = el('p', r.name, 'origin-row__name'); const en = el('small', r.en); en.lang = 'en'; name.append(en);
      const bar = el('span', undefined, 'origin-row__bar'); const fill = el('span'); fill.style.width = `${(n / max) * 100}%`; bar.append(fill); bar.setAttribute('aria-hidden', 'true');
      li.append(name, bar, el('p', `${n}건`, 'origin-row__count'), el('p', `${names.length}개국 · ${names.join(' · ')}`, 'origin-row__countries'));
      originsList.append(li);
    });
    const s = $('origins-summary');
    s.append(el('strong', String(countries.size)), document.createTextNode('개국 · 해외 원산지 원료 '), el('strong', String(foreign)), document.createTextNode('건 (전체 등록 제품 ' + items.length + '건 기준)'));
  }
  const clients = site.domesticClients;
  if (clients && clients.show && $('clients')) {
    const ul = $('clients-list');
    clients.segments.forEach(seg => {
      const li = el('li'), name = el('span', seg.name), en = el('small', seg.en); en.lang = 'en'; name.append(en);
      const n = el('strong', String(seg.count)); n.append(el('small', '개사'));
      li.append(name, n); ul.append(li);
    });
    $('clients').hidden = false;
  }
})();
