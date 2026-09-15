/* 고객 화면. data/catalog.js의 제품 데이터를 사용합니다. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const items = Array.isArray(window.ECHO_PRODUCTS) ? window.ECHO_PRODUCTS.filter(p => p.visible !== false) : [];
  const state = { catalogType: '', catalogGroup: '', category: '', query: '', subcategory: '', application: '', sort: 'name', page: 1 };
  const pageSize = 50;
  const ko = text => String(text || '').split(';').map(s => s.includes(' / ') ? s.split(' / ').slice(1).join(' / ').trim() : s.trim()).filter(Boolean).join('; ');
  const tokens = value => ko(value).split(';').map(s => s.trim()).filter(Boolean);
  const normalized = value => String(value).normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, '');
  const el = (tag, text, cls) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (cls) node.className = cls; return node; };
  const types = ['건강기능식품', '일반식품', '식품첨가물', ''];
  const inType = p => !state.catalogType || p.catalogType === state.catalogType;
  const inGroup = p => !state.catalogGroup || p.catalogGroup === state.catalogGroup;
  const scope = () => items.filter(p => inType(p) && inGroup(p));
  function navigate(type, group = '') {
    Object.assign(state, {catalogType:type, catalogGroup:group, category:'', subcategory:'', application:'', page:1});
    $('application').value='';
    selectOptions('application',scope().flatMap(p=>tokens(p.application)),'전체 적용 분야');
    refreshSubcategories(); topNavigation(); categories(); render();
  }
  function topNavigation() {
    $('catalog-tabs').replaceChildren();
    types.forEach(type => {
      const b=el('button',undefined,'catalog-tab'+(state.catalogType===type?' active':''));
      b.type='button';b.setAttribute('aria-pressed',String(state.catalogType===type));
      b.append(el('span',type||'전체 제품'),el('small',items.filter(p=>!type||p.catalogType===type).length));
      b.addEventListener('click',()=>navigate(type));$('catalog-tabs').append(b);
    });
    $('general-groups').hidden=state.catalogType!=='일반식품';
    $('general-groups').replaceChildren();
    ['', '일반원료','기능성부원료'].forEach(group=>{
      const b=el('button',group||'일반식품 전체','group-tab'+(state.catalogGroup===group?' active':''));
      b.type='button';b.setAttribute('aria-pressed',String(state.catalogGroup===group));
      b.addEventListener('click',()=>navigate('일반식품',group));$('general-groups').append(b);
    });
  }
  $('total').textContent = items.length;
  function selectOptions(id, values, first) {
    const select = $(id); select.replaceChildren(new Option(first, ''));
    [...new Set(values.filter(Boolean))].sort((a,b) => a.localeCompare(b,'ko')).forEach(v => select.add(new Option(v,v)));
  }
  selectOptions('application', items.flatMap(p => tokens(p.application)), '전체 적용 분야');
  function refreshSubcategories() {
    selectOptions('subcategory', scope().filter(p => !state.category || p.category === state.category).map(p => ko(p.subcategory)), '전체 세부 분류');
  }
  function categories() {
    $('categories').replaceChildren();
    const pool=scope();
    const names=[...new Set(pool.map(p=>p.category))];
    ['', ...names].forEach(name => {
      const button = el('button', undefined, 'category' + (name === state.category ? ' active' : ''));
      button.type = 'button'; button.setAttribute('aria-pressed', String(name === state.category));
      button.append(el('span', name ? ko(name) : '전체 원료'), el('small', name ? pool.filter(p => p.category === name).length : pool.length));
      button.addEventListener('click', () => { state.category = name; state.subcategory = ''; state.page = 1; refreshSubcategories(); categories(); render(); });
      $('categories').append(button);
    });
  }
  function detail(p) {
    $('detail-code').textContent = p.id; $('detail-title').textContent = p.name;
    $('detail-category').textContent = [p.catalogType,p.catalogGroup,ko(p.category),ko(p.subcategory)].filter(Boolean).join(' / ');
    const fields = [['지표성분',p.marker],['규격 / 함량',p.spec],['포장단위',p.packaging],['원산지',p.origin],['주요 특성',ko(p.function)],['어플리케이션',tokens(p.application).join(' · ')],['형태',ko(p.form)],['공정',ko(p.process)],['Stock 운용',p.stock]];
    $('detail-fields').replaceChildren();
    if (p.efficacy) fields.splice(5,0,['효능',ko(p.efficacy)]);
    fields.forEach(([label,value]) => { const row = el('div'); row.append(el('dt',label),el('dd',value || '문의')); $('detail-fields').append(row); });
    $('detail').showModal();
  }
  function render() {
    const queries = state.query.trim().split(/\s+/).filter(Boolean).map(normalized);
    const filtered = scope().filter(p => (!state.category || p.category === state.category) && (!state.subcategory || ko(p.subcategory) === state.subcategory) && (!state.application || tokens(p.application).includes(state.application)) && queries.every(q => normalized(Object.values(p).join(' ')).includes(q)));
    filtered.sort((a,b) => (state.sort === 'code' ? a.id.localeCompare(b.id) : a.name.localeCompare(b.name,'ko')) || a.id.localeCompare(b.id));
    const pages = Math.max(1,Math.ceil(filtered.length/pageSize)); state.page = Math.min(state.page,pages);
    $('category-title').textContent = state.category ? ko(state.category) : (state.catalogGroup || state.catalogType || '전체 제품');
    $('result-count').textContent = `${filtered.length}개 제품`;
    $('products').replaceChildren();
    filtered.slice((state.page-1)*pageSize,state.page*pageSize).forEach(p => {
      const row = el('tr'); const name = el('td'); const button = el('button',p.name,'product-name'); button.addEventListener('click',()=>detail(p));
      name.append(window.EchoPrint.createCheckbox(p),el('span',p.id,'product-code'),button,el('span',p.marker || '지표성분 문의','marker'));
      const pack = el('td',p.packaging || '문의'); pack.dataset.label = '포장단위';
      const origin = el('td',p.origin || '문의'); origin.dataset.label = '원산지';
      const features = el('td'); features.dataset.label = '주요 특성';
      if (p.function) tokens(p.function).forEach(t=>features.append(el('span',t,'tag'))); else features.append(el('span','문의','muted'));
      const apps = el('td',tokens(p.application).join(' · ') || '문의','applications'); apps.dataset.label='어플리케이션';
      row.append(name,pack,origin,features,apps); $('products').append(row);
    });
    window.EchoPrint.setPage(filtered.slice((state.page-1)*pageSize,state.page*pageSize));
    $('empty').hidden = filtered.length > 0;
    document.querySelector('.table-wrap').hidden = filtered.length === 0;
    $('page-info').textContent = filtered.length ? `${filtered.length}개 중 ${(state.page-1)*pageSize+1}–${Math.min(state.page*pageSize,filtered.length)}개 표시` : '0개 제품';
    $('page-number').textContent = `${state.page} / ${pages}`;
    $('prev').disabled = state.page <= 1; $('next').disabled = state.page >= pages;
  }
  function reset() { Object.assign(state,{catalogGroup:'',category:'',query:'',subcategory:'',application:'',page:1}); ['search','application'].forEach(id=>$(id).value=''); selectOptions('application',scope().flatMap(p=>tokens(p.application)),'전체 적용 분야'); refreshSubcategories();topNavigation();categories();render(); }
  $('search').addEventListener('input', e => {state.query=e.target.value;state.page=1;render();});
  ['subcategory','application','sort'].forEach(id=>$(id).addEventListener('change',e=>{state[id]=e.target.value;state.page=1;render();}));
  ['reset','empty-reset'].forEach(id=>$(id).addEventListener('click',reset));
  ['prev','next'].forEach(id=>$(id).addEventListener('click',()=>{state.page+=id==='next'?1:-1;render();document.querySelector('.results-bar').scrollIntoView({block:'start',behavior:'instant'});}));
  document.querySelector('.close-dialog').addEventListener('click',()=>$('detail').close());
  $('detail').addEventListener('click',e=>{if(e.target===$('detail')){const r=$('detail').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('detail').close();}});
  refreshSubcategories(); topNavigation(); categories(); render();
  if (!Array.isArray(window.ECHO_PRODUCTS)) { $('empty').hidden=false; $('empty').replaceChildren(el('h3','제품 데이터를 불러오지 못했습니다.'),el('p','페이지를 새로고침해 주세요. 문제가 계속되면 담당자에게 문의해 주세요.')); }
})();
