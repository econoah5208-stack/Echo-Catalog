/* 제품 소개자료: 빠른 범위 선택, 자동 분류 정렬, A4 인쇄 / PDF 저장. 외부 전송 없음. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const all=(window.ECHO_PRODUCTS||[]).filter(p=>p.visible!==false);
  const byId=new Map(all.map(p=>[p.id,p]));
  const chosen=new Set();
  let pageIds=[],returnToPreview=false,oldTitle='',activePreset='',printPrepared=false;
  const fields=[['marker','지표성분'],['spec','규격 / 함량'],['packaging','포장단위'],['origin','원산지'],['function','주요 특성'],['efficacy','효능'],['application','어플리케이션'],['process','공정'],['stock','Stock 운용']];
  const defaults=new Set(['marker','packaging','origin','function','application']);
  const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  const ko=text=>String(text||'').split(';').map(s=>s.includes(' / ')?s.split(' / ').slice(1).join(' / ').trim():s.trim()).filter(Boolean).join(' · ');
  const normalized=value=>String(value||'').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,'');
  const corpus=p=>normalized([p.name,p.category,p.subcategory,p.marker,p.form,p.process,p.function].join(' '));
  const stockValue=p=>['운용','미운용'].includes(p.stock)?p.stock:'미정';
  const presets=[
    ['all','전체 제품',()=>true],
    ['general','일반식품 전체',p=>p.catalogType==='일반식품'],
    ['health','건강기능식품 전체',p=>p.catalogType==='건강기능식품'],
    ['additive','식품첨가물 전체',p=>p.catalogType==='식품첨가물'],
    ['vitamin-mineral','비타민·미네랄 전체',p=>/(vitamin|비타민|mineral|미네랄|칼슘|calcium|마그네슘|magnesium|아연|zinc|셀레늄|selenium|철분|iron|구리|copper|망간|manganese|몰리브덴|molybdenum|크롬|chromium|요오드|iodine|엽산|folic)/i.test(corpus(p))],
    ['liquid-process','농축액·추출액·퓨레 전체',p=>/(concentrated|농축|extracted|추출|puree|퓨레)/i.test(corpus(p))],
    ['powder','분말 전체',p=>/(powder|분말|파우더)/i.test(corpus(p))],
    ['foodform','효모,유산균 유래 전체',p=>p.category==='유산균·효모'||/효모/.test(p.name||'')],
    ['stock','Stock 운용 제품',p=>stockValue(p)==='운용'],
  ];
  const dialog=$('print-dialog');
  // 회사 정보는 data/site-config.js 에서만 관리합니다(헤더·푸터·PDF 공통).
  const site=window.ECHO_SITE||{},contact=site.contact||{},company=site.company||{};
  const companyName=company.nameEn||'Echo Trading Co.,Ltd';
  const contactLine=[contact.tel&&`TEL ${contact.tel.label}`,contact.email&&contact.email.label,contact.web&&contact.web.label].filter(Boolean).join(' · ');
  const printDate=()=>{const d=new Date();return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;};
  const changeListeners=new Set();
  const notify=()=>changeListeners.forEach(fn=>{try{fn(chosen);}catch(error){console.error(error);}});

  const portraitFields=[['name','제품명'],['subcategory','소분류'],['marker','지표성분'],['origin','원산지'],['application','어플리케이션']];
  // 출력 레이아웃: landscape(A4 가로 상세) · compact(A4 세로 압축) · body(A4 세로 인체 기능형, assets/print-body.js)
  const layoutRadios=[...document.querySelectorAll('input[name="print-layout"]')];
  const BodyPrint=window.EchoBodyPrint||null;
  if(!BodyPrint){const r=layoutRadios.find(x=>x.value==='body');if(r){r.disabled=true;r.closest('label').hidden=true;}}
  const layoutMode=()=>{const r=layoutRadios.find(x=>x.checked);return r?r.value:'landscape';};
  const portrait=()=>layoutMode()==='compact';
  const bodyMode=()=>layoutMode()==='body'&&!!BodyPrint;
  const pageStyle=node('style');document.head.append(pageStyle);
  const fieldMemory={landscape:new Set(defaults),portrait:new Set(portraitFields.map(([key])=>key)),body:new Set(BodyPrint?BodyPrint.DEFAULTS:[])};
  const typeRank={'건강기능식품':0,'일반식품':1,'식품첨가물':2};
  let fieldMode='landscape';
  function printSort(a,b){
    return (typeRank[a.catalogType]??9)-(typeRank[b.catalogType]??9)
      ||ko(a.category).localeCompare(ko(b.category),'ko')
      ||a.name.localeCompare(b.name,'ko')
      ||a.id.localeCompare(b.id);
  }
  // 제품 정리(v9.4): Foodform® 별도 페이지 · 같은 제품명 한 번만 출력. 규칙은 data/print-rules.js 에서 관리합니다.
  const Rules=window.EchoPrintRules||null;
  if(!Rules&&$('print-arrange'))$('print-arrange').hidden=true;
  const foodformOn=()=>!!Rules&&!!$('print-foodform')&&$('print-foodform').checked;
  const foodformEnd=()=>!!$('print-foodform-position')&&$('print-foodform-position').value==='end';
  const dedupeOn=()=>!!Rules&&!!$('print-dedupe')&&$('print-dedupe').checked;
  function printable(){const list=selected();return dedupeOn()?Rules.dedupe(list):{items:list,removed:[],groups:[]};}
  /* 출력 구역: Foodform® 제품은 다른 제품과 섞지 않고 별도 페이지에 모읍니다(위치: 맨 앞 / 맨 뒤). */
  function printSections(items){
    const sorted=items.slice().sort(printSort);
    if(!foodformOn())return [{key:'main',label:'',products:sorted}];
    const foodform={key:'foodform',label:`${Rules.FOODFORM_LABEL} 제품`,products:sorted.filter(Rules.isFoodform)};
    const main={key:'main',label:'',products:sorted.filter(p=>!Rules.isFoodform(p))};
    return (foodformEnd()?[main,foodform]:[foodform,main]).filter(s=>s.products.length);
  }
  function renderBodyFields(){
    const note=node('p','','print-field-note');
    $('print-columns').replaceChildren(node('legend','인체 기능형 출력 항목 · NO. / 제품명은 고정 · 아래 항목은 선택'));
    const groups=[['sub','제품명 아래 표시'],['feature','기능 / 특징 열'],['col',`추가 열 (최대 ${BodyPrint.MAX_COLS}개)`],['page','페이지 구성']];
    groups.forEach(([kind,title])=>{
      $('print-columns').append(node('p',title,'print-field-group'));
      BodyPrint.FIELDS.filter(f=>f[2]===kind).forEach(([key,label])=>{
        const wrap=node('label'),input=node('input');input.type='checkbox';input.value=key;input.checked=fieldMemory.body.has(key);
        input.addEventListener('change',()=>{
          const inputs=[...$('print-columns').querySelectorAll('input')];
          const extra=inputs.filter(i=>i.checked&&BodyPrint.FIELDS.some(f=>f[0]===i.value&&f[2]==='col'));
          if(kind==='col'&&input.checked&&extra.length>BodyPrint.MAX_COLS){input.checked=false;note.textContent=`세로형 표의 가독성을 위해 추가 열은 최대 ${BodyPrint.MAX_COLS}개까지 선택할 수 있습니다.`;note.classList.add('is-warning');return;}
          note.textContent='';note.classList.remove('is-warning');
          fieldMemory.body=new Set(inputs.filter(i=>i.checked).map(i=>i.value));buildPreview();
        });
        wrap.append(input,node('span',label));$('print-columns').append(wrap);
      });
    });
    $('print-columns').append(note);
  }
  function renderFields(){
    if(bodyMode()){renderBodyFields();return;}
    const legend=portrait()
      ?'세로형 출력 항목 · No. / 국내 식품분류 / 대분류는 고정 · 아래 항목은 선택'
      :'가로형 출력 항목 · No. / 국내 식품분류 / 대분류 / 제품명·코드는 고정 · 아래 항목은 선택';
    $('print-columns').replaceChildren(node('legend',legend));
    (portrait()?portraitFields:fields).forEach(([key,title])=>{
      const label=node('label'),input=node('input');input.type='checkbox';input.value=key;input.checked=fieldMemory[fieldMode].has(key);
      input.addEventListener('change',()=>{const inputs=[...$('print-columns').querySelectorAll('input')];if(portrait()&&!inputs.some(i=>i.checked)){input.checked=true;return;}fieldMemory[fieldMode]=new Set(inputs.filter(i=>i.checked).map(i=>i.value));buildPreview();});label.append(input,node('span',title));$('print-columns').append(label);
    });
  }
  renderFields();
  $('print-page-count-label').hidden=false;
  layoutRadios.forEach(radio=>radio.addEventListener('change',()=>{
    if(!radio.checked)return;
    fieldMode=bodyMode()?'body':portrait()?'portrait':'landscape';
    // 자료 제목: 기본값을 쓰는 중이면 레이아웃에 맞는 기본 제목으로 바꿉니다(직접 입력한 제목은 유지).
    const title=$('print-title'),bodyTitle=BodyPrint?BodyPrint.DEFAULT_TITLE:'';
    if(bodyMode()&&title.value.trim()==='제품 소개자료')title.value=bodyTitle;
    else if(!bodyMode()&&bodyTitle&&title.value.trim()===bodyTitle)title.value='제품 소개자료';
    renderFields();buildPreview();
  }));
  function selected(){return [...chosen].map(id=>byId.get(id)).filter(Boolean);}
  function columns(){return (portrait()?portraitFields:fields).filter(([key])=>[...$('print-columns').querySelectorAll('input')].some(input=>input.value===key&&input.checked));}
  function stockMatches(p){const value=$('print-stock').value;return !value||stockValue(p)===value;}
  function presetById(id){return presets.find(([key])=>key===id)||presets[0];}
  function updatePresetButtons(){
    document.querySelectorAll('[data-print-preset]').forEach(button=>{
      const [id,label,match]=presetById(button.dataset.printPreset),count=all.filter(p=>match(p)&&stockMatches(p)).length;
      button.textContent=`${label} · ${count}`;button.classList.toggle('active',id===activePreset);button.setAttribute('aria-pressed',String(id===activePreset));
    });
  }
  function applyPreset(id){
    const [,label,match]=presetById(id);activePreset=id;chosen.clear();all.filter(p=>match(p)&&stockMatches(p)).forEach(p=>chosen.add(p.id));
    $('print-range-note').textContent=`${label}: ${chosen.size}개 제품이 선택되었습니다.`;sync();buildPreview();updatePresetButtons();
  }
  presets.forEach(([id,label])=>{
    const button=node('button',label,'print-preset');button.type='button';button.dataset.printPreset=id;button.setAttribute('aria-pressed','false');button.addEventListener('click',()=>applyPreset(id));$('print-preset-buttons').append(button);
  });
  $('print-stock').addEventListener('change',()=>{if(activePreset)applyPreset(activePreset);else{updatePresetButtons();buildPreview();}});
  function sync(){
    $('selection-count').textContent=`${chosen.size}개 선택`;$('clear-selection').disabled=!chosen.size;
    document.querySelectorAll('input[data-product-select]').forEach(input=>{const on=chosen.has(input.dataset.productSelect);input.checked=on;const row=input.closest('tr');if(row)row.classList.toggle('is-selected',on);});
    const count=pageIds.filter(id=>chosen.has(id)).length;
    $('select-page').checked=pageIds.length>0&&count===pageIds.length;$('select-page').indeterminate=count>0&&count<pageIds.length;$('select-page').disabled=!pageIds.length;
    notify();
  }
  function createCheckbox(p){
    const wrap=node('label',undefined,'product-selection'),input=node('input');input.type='checkbox';input.dataset.productSelect=p.id;input.checked=chosen.has(p.id);
    input.setAttribute('aria-label',`${p.name} (${p.id}) 소개자료에 선택`);
    input.addEventListener('change',()=>{activePreset='';if(input.checked)chosen.add(p.id);else chosen.delete(p.id);sync();updatePresetButtons();buildPreview();});
    wrap.append(input,node('span','자료에 담기'));return wrap;
  }
  function valueFor(p,key){return (['category','subcategory','function','efficacy','application','process'].includes(key)?ko(p[key]):p[key])||'문의';}
  function chunks(values,size){const result=[];for(let i=0;i<values.length;i+=size)result.push(values.slice(i,i+size));return result;}
  function balancedChunks(values,pageCount){
    const count=Math.max(1,Math.min(pageCount,values.length||1)),base=Math.floor(values.length/count),extra=values.length%count,result=[];
    let offset=0;
    for(let i=0;i<count;i++){const size=base+(i<extra?1:0);result.push(values.slice(offset,offset+size));offset+=size;}
    return result;
  }
  function buildPage(products,cols,pageNumber,pageTotal,startIndex,section){
    const page=node('article',undefined,'brochure-page landscape-auto'),header=node('header',undefined,'brochure-header');
    if(section){page.dataset.fitGroup=section.key;if(section.key!=='main')page.classList.add(`brochure-page--${section.key}`);}
    const logo=node('img');logo.src='assets/echo-trading-logo.svg';logo.alt='Echo Trading';logo.className='brochure-logo';
    const titleBox=node('div',undefined,'brochure-title'),titleRow=node('div',undefined,'brochure-title-row');
    titleRow.append(node('h1',$('print-title').value.trim()||'제품 소개자료'));
    if(section&&section.label)titleRow.append(node('span',`${section.label} · ${section.products.length}개`,'brochure-section'));
    titleBox.append(node('p',company.slogan||'Global Ingredients. Reliable Solutions.','brochure-kicker'),titleRow);
    const customer=$('print-customer').value.trim();if(customer)titleBox.append(node('p',`${customer} 귀중`,'brochure-customer'));
    const pageMeta=node('div',undefined,'brochure-page-meta');pageMeta.append(node('strong',`${pageNumber}`),node('span',`/ ${pageTotal}`));
    header.append(logo,titleBox,pageMeta);page.append(header);
    if(pageNumber===1&&$('print-memo').value.trim())page.append(node('p',$('print-memo').value.trim(),'brochure-memo'));

    const table=node('table',undefined,'brochure-table'),group=node('colgroup'),head=node('thead'),labels=node('tr'),body=node('tbody');
    const weights={catalogType:9,category:13,name:18,marker:14,spec:14,packaging:8,origin:8,function:16,efficacy:16,application:16,process:12,stock:7};
    const numberCol=node('col');numberCol.style.width='8mm';group.append(numberCol);
    const fixedCols=[['catalogType','국내 식품분류'],['category','대분류'],['name','제품명 / 코드']];
    const totalWeight=fixedCols.concat(cols).reduce((n,[key])=>n+(weights[key]||12),0);
    const availableWidth=251;
    const numberHeader=node('th','No.','brochure-col-number');numberHeader.scope='col';labels.append(numberHeader);
    fixedCols.concat(cols).forEach(([key,label])=>{
      const col=node('col');col.style.width=`${(weights[key]||12)/totalWeight*availableWidth}mm`;group.append(col);
      const th=node('th',label);th.scope='col';th.dataset.field=key;th.classList.add(`brochure-col-${key}`);labels.append(th);
    });
    head.append(labels);table.append(group,head,body);

    products.forEach((p,rowIndex)=>{
      const row=node('tr');row.dataset.productId=p.id;row.append(node('td',String(startIndex+rowIndex+1),'brochure-col-number'));
      const prev=products[rowIndex-1];
      if(!prev||prev.catalogType!==p.catalogType){
        let span=1;while(rowIndex+span<products.length&&products[rowIndex+span].catalogType===p.catalogType)span++;
        const cell=node('td',p.catalogType||'문의','brochure-group brochure-catalog-type');cell.rowSpan=span;cell.dataset.field='catalogType';row.append(cell);
      }
      if(!prev||prev.catalogType!==p.catalogType||prev.category!==p.category){
        let span=1;while(rowIndex+span<products.length&&products[rowIndex+span].catalogType===p.catalogType&&products[rowIndex+span].category===p.category)span++;
        const cell=node('td',ko(p.category)||'문의','brochure-group brochure-category');cell.rowSpan=span;cell.dataset.field='category';row.append(cell);
      }
      const name=node('td');name.classList.add('brochure-col-name');name.dataset.field='name';
      name.append(node('strong',p.name),node('small',p.id,'brochure-code'));row.append(name);
      cols.forEach(([key])=>{
        const cell=node('td'),content=node('span',valueFor(p,key),`brochure-cell-text brochure-text-${key}`);
        cell.classList.add(`brochure-col-${key}`);cell.dataset.field=key;cell.append(content);row.append(cell);
      });
      body.append(row);
    });
    page.append(table);
    const footer=node('footer',undefined,'brochure-footer');footer.append(node('p',`제품별 정확한 규격과 적용 조건은 담당자에게 문의해 주세요. · 출력일 ${printDate()}`),node('p',[companyName,contactLine,`${products.length}개 제품`].filter(Boolean).join(' · ')));
    page.append(footer);return page;
  }
  function landscapeAvailableHeight(page,table){
    table.style.setProperty('height','auto','important');
    table.style.setProperty('align-self','start','important');
    const footer=page.querySelector('.brochure-footer');
    if(!footer)return 0;
    return Math.max(0,footer.getBoundingClientRect().top-table.getBoundingClientRect().top);
  }
  /* 페이지 묶음(data-fit-group: foodform / main)마다 따로 글자 크기를 맞춥니다. 반환: 맞추지 못한 묶음 이름 Set */
  function fitGroups(root,selector){
    const groups=new Map();
    root.querySelectorAll(selector).forEach(page=>{const key=page.dataset.fitGroup||'main';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(page);});
    return groups;
  }
  function fitLandscape(root){
    const failed=new Set(),groups=fitGroups(root,'.landscape-auto');
    if(!groups.size)return failed;
    const host=node('div');host.id='print-measure-landscape';host.setAttribute('aria-hidden','true');document.body.append(host);
    // safety: 실제 인쇄 엔진의 줄바꿈 차이로 마지막 행이 잘리지 않도록 표 아래에 약 1.6mm 여유를 둡니다.
    const minFont=4.4,maxFont=6.65,safety=6;
    try{
      groups.forEach((originals,key)=>{
        let common=maxFont,fits=true;
        for(const original of originals){
          const page=original.cloneNode(true);host.replaceChildren(page);
          const table=page.querySelector('.brochure-table');
          page.style.setProperty('--landscape-font',minFont+'pt');
          page.style.setProperty('--landscape-head-font',Math.max(4.4,minFont-.05)+'pt');
          let available=landscapeAvailableHeight(page,table);
          if(available<=safety||table.getBoundingClientRect().height>available-safety){fits=false;break;}
          let low=minFont,high=maxFont;
          for(let i=0;i<14;i++){
            const size=(low+high)/2;page.style.setProperty('--landscape-font',size+'pt');page.style.setProperty('--landscape-head-font',Math.max(4.4,size-.05)+'pt');
            available=landscapeAvailableHeight(page,table);
            if(table.getBoundingClientRect().height<=available-safety)low=size;else high=size;
          }
          common=Math.min(common,Math.floor(low*100)/100);
        }
        if(!fits){failed.add(key);return;}
        originals.forEach(page=>{
          page.style.setProperty('--landscape-font',common+'pt');page.style.setProperty('--landscape-head-font',Math.max(4.4,common-.05)+'pt');
          const table=page.querySelector('.brochure-table');
          table.style.setProperty('height','auto','important');
          table.style.setProperty('align-self','stretch','important');
        });
      });
      return failed;
    }finally{host.remove();}
  }
  function buildCompactPage(products,cols,index,total,startIndex,section){
    const page=node('article',undefined,'compact-page');
    if(section){page.dataset.fitGroup=section.key;if(section.key!=='main')page.classList.add(`compact-page--${section.key}`);}
    const header=node('header',undefined,'compact-header'),logo=node('img');logo.src='assets/echo-trading-logo.svg';logo.alt='Echo Trading';
    header.append(logo,node('h1',$('print-title').value.trim()||'제품 소개자료'));
    if(section&&section.label)header.append(node('span',`${section.label} · ${section.products.length}개`,'compact-section'));
    header.append(node('span',`${index} / ${total}`,'compact-page-no'));page.append(header);
    const content=node('div',undefined,'compact-content'),flow=node('div',undefined,'compact-flow');content.append(flow);
    if($('print-customer').value.trim())flow.append(node('p',`${$('print-customer').value.trim()} 귀중`,'compact-customer'));
    if(index===1&&$('print-memo').value.trim())flow.append(node('p',$('print-memo').value.trim(),'compact-memo'));
    const table=node('table',undefined,'compact-table'),group=node('colgroup'),head=node('thead'),labels=node('tr'),body=node('tbody');
    const weights={catalogType:11,category:17,name:20,subcategory:16,marker:18,origin:8,application:20};
    const numberCol=node('col');numberCol.style.width='7mm';group.append(numberCol);
    const fixedCols=[['catalogType','국내 식품분류'],['category','대분류']];
    const totalWeight=fixedCols.concat(cols).reduce((n,[key])=>n+(weights[key]||14),0);
    const numberHeader=node('th','No.','compact-col-number');numberHeader.scope='col';labels.append(numberHeader);
    fixedCols.concat(cols).forEach(([key,label])=>{
      const col=node('col');col.style.width=`${(weights[key]||14)/totalWeight*191}mm`;group.append(col);
      const th=node('th',label);th.scope='col';th.dataset.field=key;labels.append(th);
    });
    head.append(labels);table.append(group,head,body);
    products.forEach((p,rowIndex)=>{
      const row=node('tr');row.dataset.productId=p.id;row.append(node('td',String(startIndex+rowIndex+1),'compact-col-number'));
      const prev=products[rowIndex-1];
      if(!prev||prev.catalogType!==p.catalogType){
        let span=1;while(rowIndex+span<products.length&&products[rowIndex+span].catalogType===p.catalogType)span++;
        const cell=node('td',p.catalogType,'compact-group compact-catalog-type');cell.rowSpan=span;cell.dataset.field='catalogType';row.append(cell);
      }
      if(!prev||prev.catalogType!==p.catalogType||prev.category!==p.category){
        let span=1;while(rowIndex+span<products.length&&products[rowIndex+span].catalogType===p.catalogType&&products[rowIndex+span].category===p.category)span++;
        const cell=node('td',ko(p.category)||'문의','compact-group compact-category');cell.rowSpan=span;cell.dataset.field='category';row.append(cell);
      }
      cols.forEach(([key])=>{const cell=node('td',key==='name'?p.name:valueFor(p,key));cell.dataset.field=key;row.append(cell);});body.append(row);
    });
    flow.append(table);page.append(content);
    page.append(node('footer',`${[companyName,contactLine].filter(Boolean).join(' · ')} | ${products.length}개 제품 | 출력일 ${printDate()} | 규격 및 적용 조건은 담당자에게 문의해 주세요.`,'compact-footer'));
    return page;
  }
  function fitCompact(root){
    const failed=new Set(),groups=fitGroups(root,'.compact-page');
    if(!groups.size)return failed;
    const host=node('div');host.id='print-measure';host.setAttribute('aria-hidden','true');document.body.append(host);
    const minFont=4.2,maxFont=7.2;
    try{
      groups.forEach((originals,key)=>{
        let common=maxFont,fits=true;
        for(const original of originals){
          const page=original.cloneNode(true);host.replaceChildren(page);
          const content=page.querySelector('.compact-content'),flow=page.querySelector('.compact-flow'),table=page.querySelector('.compact-table');
          table.style.height='auto';
          const top=page.querySelector('.compact-header').getBoundingClientRect().height+6;
          content.style.top=top+'px';original.querySelector('.compact-content').style.top=top+'px';
          const available=content.getBoundingClientRect().height-4;
          if(available<=0){fits=false;break;}
          page.style.setProperty('--compact-font',minFont+'pt');
          if(flow.getBoundingClientRect().height>available){fits=false;break;}
          let low=minFont,high=maxFont;
          for(let i=0;i<14;i++){
            const size=(low+high)/2;page.style.setProperty('--compact-font',size+'pt');
            if(flow.getBoundingClientRect().height<=available)low=size;else high=size;
          }
          common=Math.min(common,Math.floor(low*100)/100);
        }
        if(!fits){failed.add(key);return;}
        originals.forEach(page=>page.style.setProperty('--compact-font',common+'pt'));
        originals.forEach(page=>{
          const content=page.querySelector('.compact-content'),table=page.querySelector('.compact-table');
          table.style.height='auto';
          const tableTop=table.offsetTop;
          // offsetHeight 는 미리보기 확대·축소(transform)의 영향을 받지 않습니다.
          const target=Math.max(table.offsetHeight,content.clientHeight-tableTop);
          table.style.height=Math.floor(target)+'px';
        });
      });
      return failed;
    }finally{host.remove();}
  }
  function buildBodySheet(){
    const foodform=foodformOn()?{position:foodformEnd()?'end':'start',label:Rules.FOODFORM_LABEL,match:Rules.isFoodform}:null;
    return BodyPrint.build(printable().items,{fields:fieldMemory.body,title:$('print-title').value.trim()||BodyPrint.DEFAULT_TITLE,customer:$('print-customer').value.trim(),memo:$('print-memo').value.trim(),companyName,contactLine,printDate:printDate(),foodform});
  }
  const maxPerPage=()=>portrait()?50:25;
  // Foodform® 구역은 한 장에 모으는 것부터 시도합니다(넘치면 자동으로 장수를 늘림). 나머지는 페이지당 최대 개수 기준.
  const firstPageCount=section=>section.key==='foodform'?1:Math.max(1,Math.ceil(section.products.length/maxPerPage()));
  function buildSheet(sections=[],counts=new Map()){
    if(bodyMode())return buildBodySheet();
    const cols=columns(),sheet=node('div',undefined,'brochure');
    if(!sections.some(s=>s.products.length)){sheet.append(node('p','출력할 제품 범위를 선택하거나 목록에서 제품을 담아 주세요.','brochure-empty'));return sheet;}
    if(portrait())sheet.classList.add('compact-brochure');
    const plan=[];
    sections.forEach(section=>balancedChunks(section.products,counts.get(section.key)||firstPageCount(section)).forEach(items=>plan.push({section,items})));
    let offset=0;
    plan.forEach(({section,items},i)=>{sheet.append(portrait()?buildCompactPage(items,cols,i+1,plan.length,offset,section):buildPage(items,cols,i+1,plan.length,offset,section));offset+=items.length;});
    return sheet;
  }
  function buildPreview(){
    resetZoom();
    const body=bodyMode();
    pageStyle.textContent=body?'@page{size:A4 portrait;margin:0}':portrait()?'@page{size:A4 portrait;margin:6mm}':'@page{size:A4 landscape;margin:10mm}';
    $('print-preview').classList.toggle('portrait-preview',portrait()||body);
    $('print-preview').classList.toggle('body-preview',body);
    if($('print-layout-note'))$('print-layout-note').textContent=body
      ?'인체 기능·원료 종류 분류별로 묶어 출력합니다. Foodform® 별도 페이지를 켜면 Foodform® 제품은 기능 분류 대신 전용 구역(FF)에 모이고 각 제품의 기능 분류는 「관련」 태그로 표시합니다. 한 분류가 끝나고 여백이 남으면 다음 분류를 같은 페이지에 이어 배치해 종이를 아낍니다(분류마다 새 페이지는 아래 「페이지 구성」에서 선택). 실제 행 높이를 측정해 페이지당 최대 22개까지 배치하며 글자 크기는 줄이지 않습니다. 분류는 원료 탐색용 참고 분류입니다.'
      :'가로형은 페이지당 최대 25개, 세로형은 최대 50개까지 배치합니다. 두 방향 모두 필요한 최소 장수를 자동 계산하고 각 페이지 표 높이를 인쇄영역에 맞춰 자동 확장합니다. Foodform® 별도 페이지는 개수 제한 없이 한 장에 모으는 것을 먼저 시도하고(그 페이지만 글자 크기를 따로 맞춤), 넘칠 때만 장수를 늘립니다.';
    $('print-help').textContent=body
      ?'A4 세로 · 분류별 배치(여백이 남으면 여러 분류를 한 페이지에) · 페이지당 최대 22개 · 순번은 출력 목록 기준 1부터 연속. 인쇄창에서 용지 A4, 배율 100%(기본), 배경 그래픽 켜기를 선택해 주세요.'
      :portrait()
      ?'A4 세로 · 페이지당 최대 50개 · 최소 장수 자동 계산 · No./국내 식품분류/대분류 고정. PDF 저장 시 브라우저 머리글·바닥글을 꺼 주세요.'
      :'A4 가로 · 페이지당 최대 25개 · 최소 장수 자동 계산 · No./국내 식품분류/대분류/제품명·코드 고정 · 분류 셀 자동 병합. PDF 저장 시 배경 그래픽을 켜고 브라우저 머리글·바닥글을 꺼 주세요.';
    const result=printable(),dropped=new Map(result.removed.map(r=>[r.product.id,r.keptAs]));
    const sections=printSections(result.items);
    $('print-chosen').replaceChildren();
    selected().sort(printSort).forEach(p=>{
      const item=node('li'),kept=dropped.get(p.id);item.append(node('span',`${p.name} · ${p.id}`));
      if(kept){item.classList.add('is-duplicate');item.append(node('small',`같은 제품명 · ${kept.id}로 1개만 출력`,'print-chosen-note'));}
      const remove=node('button','제외');remove.type='button';remove.setAttribute('aria-label',`${p.name} 선택 제외`);remove.addEventListener('click',()=>{activePreset='';chosen.delete(p.id);sync();updatePresetButtons();buildPreview();});item.append(remove);$('print-chosen').append(item);
    });
    if(chosen.size&&body)$('print-preview').replaceChildren(buildBodySheet());
    else if(chosen.size){
      const fit=portrait()?fitCompact:fitLandscape;
      const counts=new Map(sections.map(section=>[section.key,firstPageCount(section)]));
      // 구역마다 넘치면 그 구역의 장수만 하나씩 늘려 다시 맞춥니다.
      for(let guard=0;guard<1000;guard++){
        $('print-preview').replaceChildren(buildSheet(sections,counts));
        const failed=fit($('print-preview'));
        if(!failed.size)break;
        let grew=false;
        sections.forEach(section=>{const n=counts.get(section.key);if(failed.has(section.key)&&n<section.products.length){counts.set(section.key,n+1);grew=true;}});
        if(!grew)break;
      }
    }else $('print-preview').replaceChildren(buildSheet());
    $('print-now').disabled=!chosen.size;
    const pageNodes=[...$('print-preview').querySelectorAll(body?BodyPrint.pageSelector:portrait()?'.compact-page':'.brochure-page')],pages=pageNodes.length;
    const outCount=result.items.length;
    $('print-selection-total').textContent=`출력 제품 ${outCount}개 · ${pages}페이지`+(result.removed.length?` · 같은 제품명 ${result.removed.length}개 제외 (선택 ${chosen.size}개)`:'');
    if($('print-arrange-note')){
      const notes=[];
      const ffCount=Rules?result.items.filter(Rules.isFoodform).length:0;
      if(foodformOn()&&ffCount){
        const ffPages=pageNodes.filter(page=>page.dataset.fitGroup==='foodform'||page.dataset.section==='foodform').length;
        notes.push(`${Rules.FOODFORM_LABEL} ${ffCount}개 → 별도 ${ffPages}페이지(${foodformEnd()?'맨 뒤':'맨 앞'})`);
      }else if(foodformOn()&&chosen.size)notes.push(`선택한 제품 중 ${Rules.FOODFORM_LABEL} 제품이 없습니다`);
      if(dedupeOn()&&chosen.size)notes.push(result.removed.length?`같은 제품명 ${result.removed.length}개 제외(제외 제품은 아래 「출력 제품」 목록에 표시)`:'같은 제품명 중복 없음');
      $('print-arrange-note').textContent=notes.join(' · ');
    }
    $('print-page-count-label').textContent=`전체 분량 · ${pages}장 자동`;
    if(dialog.open)applyZoom();
  }
  // 미리보기 배율: 화면 표시용 transform 만 바꾸며 A4 페이지의 실제 크기(mm)는 그대로 둡니다.
  let zoom=1,zoomMode='fit';
  function resetZoom(){
    const sizer=$('print-preview-sizer'),preview=$('print-preview');if(!sizer)return;
    sizer.classList.remove('is-scaled');sizer.style.width='';sizer.style.height='';preview.style.transform='';preview.style.width='';
  }
  function applyZoom(){
    const sizer=$('print-preview-sizer'),preview=$('print-preview'),scroll=$('print-preview-scroll');if(!sizer)return;
    resetZoom();
    const w=preview.offsetWidth,h=preview.offsetHeight;if(!w||!h)return;
    if(zoomMode==='fit'){const style=getComputedStyle(scroll),available=scroll.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);zoom=Math.min(1,Math.max(.3,available/w));}
    if(Math.abs(zoom-1)>.005){sizer.classList.add('is-scaled');sizer.style.width=`${Math.ceil(w*zoom)}px`;sizer.style.height=`${Math.ceil(h*zoom)}px`;preview.style.width=`${w}px`;preview.style.transform=`scale(${zoom})`;}
    $('preview-zoom-value').textContent=`${Math.round(zoom*100)}%`;
    $('preview-zoom-fit').setAttribute('aria-pressed',String(zoomMode==='fit'));
  }
  function stepZoom(delta){zoomMode='manual';zoom=Math.min(1.5,Math.max(.3,Math.round((zoom+delta)*10)/10));applyZoom();}
  if($('preview-zoom-in')){
    $('preview-zoom-in').addEventListener('click',()=>stepZoom(.1));
    $('preview-zoom-out').addEventListener('click',()=>stepZoom(-.1));
    $('preview-zoom-fit').addEventListener('click',()=>{zoomMode='fit';applyZoom();});
    let resizeTimer=0;window.addEventListener('resize',()=>{if(!dialog.open||zoomMode!=='fit')return;clearTimeout(resizeTimer);resizeTimer=setTimeout(applyZoom,150);});
  }
  // Layout uses physical page dimensions; viewport resizing does not change print sizing.
  document.fonts.ready.then(()=>{if(bodyMode()){if(chosen.size)buildPreview();}else if(portrait())fitCompact($('print-preview'));else fitLandscape($('print-preview'));});
  $('select-page').addEventListener('change',e=>{activePreset='';pageIds.forEach(id=>e.target.checked?chosen.add(id):chosen.delete(id));sync();updatePresetButtons();buildPreview();});
  $('clear-selection').addEventListener('click',()=>{activePreset='';chosen.clear();sync();updatePresetButtons();buildPreview();});
  function openDialog(){resetZoom();buildPreview();updatePresetButtons();dialog.showModal();if(bodyMode()){/* 측정은 build 단계에서 완료 */}else if(portrait())fitCompact($('print-preview'));else fitLandscape($('print-preview'));zoomMode='fit';applyZoom();}
  $('open-print').addEventListener('click',openDialog);
  document.querySelectorAll('[data-open-print]').forEach(button=>button.addEventListener('click',openDialog));
  $('close-print').addEventListener('click',()=>dialog.close());
  ['print-title','print-customer','print-memo'].forEach(id=>$(id).addEventListener('input',buildPreview));
  ['print-foodform','print-foodform-position','print-dedupe'].forEach(id=>{if($(id))$(id).addEventListener('change',()=>{if(id==='print-foodform'&&$('print-foodform-position'))$('print-foodform-position').disabled=!$('print-foodform').checked;buildPreview();});});
  function preparePrint(){
    if(!chosen.size||printPrepared)return;
    const sheet=$('print-preview').firstElementChild.cloneNode(true);
    $('print-sheet').replaceChildren(sheet);printPrepared=true;document.body.classList.add('printing-selection');
    if(dialog.open){returnToPreview=true;dialog.close();}if($('detail').open)$('detail').close();
    if(!oldTitle)oldTitle=document.title;document.title=$('print-title').value.trim()||'Echo Trading 제품 소개자료';
    document.body.classList.toggle('printing-body-catalog',bodyMode());
  }
  function finishPrint(){printPrepared=false;document.body.classList.remove('printing-selection','printing-body-catalog');if(oldTitle){document.title=oldTitle;oldTitle='';}if(returnToPreview){returnToPreview=false;dialog.showModal();}}
  $('print-now').addEventListener('click',async()=>{
    if(!chosen.size)return;
    await document.fonts.ready;
    try{buildPreview();preparePrint();requestAnimationFrame(()=>window.print());}
    catch(error){finishPrint();window.alert(error.message);}
  });
  window.addEventListener('beforeprint',preparePrint);window.addEventListener('afterprint',finishPrint);
  function setChosen(id,on){if(!byId.has(id))return;activePreset='';if(on)chosen.add(id);else chosen.delete(id);sync();updatePresetButtons();buildPreview();}
  window.EchoPrint={createCheckbox,setPage(products){pageIds=products.map(p=>p.id);sync();},isChosen:id=>chosen.has(id),setChosen,open:openDialog,onChange(fn){changeListeners.add(fn);return()=>changeListeners.delete(fn);}};
  updatePresetButtons();buildPreview();sync();
})();
