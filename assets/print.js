/* 제품 소개자료: 빠른 범위 선택, A4 10개 단위 인쇄 / PDF 저장. 외부 전송 없음. */
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
    ['foodform','효모·유산균 유래 FoodForm 전체',p=>String(p.id||'').toUpperCase().startsWith('FM')],
    ['stock','Stock 운용 제품',p=>stockValue(p)==='운용'],
  ];
  const dialog=$('print-dialog');

  const portraitFields=[['name','제품명'],['marker','지표성분'],['efficacy','효능'],['origin','원산지'],['application','어플리케이션']];
  const portrait=()=>$('print-portrait').checked;
  const pageStyle=node('style');document.head.append(pageStyle);
  const fieldMemory={landscape:new Set(defaults),portrait:new Set(portraitFields.map(([key])=>key))};
  let fieldMode='landscape';
  function renderFields(){
  $('print-columns').replaceChildren(node('legend',portrait()?'세로형 출력 항목 · No. 항상 포함 · 아래에서 최소 1개 선택':'출력 항목 · No., 제품명과 제품코드는 항상 포함됩니다'));
  (portrait()?portraitFields:fields).forEach(([key,title])=>{
    const label=node('label'),input=node('input');input.type='checkbox';input.value=key;input.checked=fieldMemory[fieldMode].has(key);
    input.addEventListener('change',()=>{const inputs=[...$('print-columns').querySelectorAll('input')];if(portrait()&&!inputs.some(i=>i.checked)){input.checked=true;return;}fieldMemory[fieldMode]=new Set(inputs.filter(i=>i.checked).map(i=>i.value));buildPreview();});label.append(input,node('span',title));$('print-columns').append(label);
  });
  }
  renderFields();
  $('print-portrait').addEventListener('change',()=>{fieldMode=portrait()?'portrait':'landscape';$('print-page-count-label').hidden=!portrait();renderFields();buildPreview();});
  $('print-page-count').addEventListener('change',buildPreview);
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
    document.querySelectorAll('input[data-product-select]').forEach(input=>{input.checked=chosen.has(input.dataset.productSelect);});
    const count=pageIds.filter(id=>chosen.has(id)).length;
    $('select-page').checked=pageIds.length>0&&count===pageIds.length;$('select-page').indeterminate=count>0&&count<pageIds.length;$('select-page').disabled=!pageIds.length;
  }
  function createCheckbox(p){
    const wrap=node('label',undefined,'product-selection'),input=node('input');input.type='checkbox';input.dataset.productSelect=p.id;input.checked=chosen.has(p.id);
    input.setAttribute('aria-label',`${p.name} (${p.id}) 소개자료에 선택`);
    input.addEventListener('change',()=>{activePreset='';if(input.checked)chosen.add(p.id);else chosen.delete(p.id);sync();updatePresetButtons();buildPreview();});
    wrap.append(input,node('span','자료에 담기'));return wrap;
  }
  function valueFor(p,key){return (['function','efficacy','application','process'].includes(key)?ko(p[key]):p[key])||'문의';}
  function chunks(values,size){const result=[];for(let i=0;i<values.length;i+=size)result.push(values.slice(i,i+size));return result;}
  function buildPage(products,cols,pageNumber,pageTotal,startIndex){
    const page=node('article',undefined,'brochure-page'),header=node('header',undefined,'brochure-header');
    const logo=node('img');logo.src='assets/echo-trading-logo.svg';logo.alt='Echo Trading';logo.className='brochure-logo';
    const titleBox=node('div',undefined,'brochure-title');titleBox.append(node('p','PRODUCT CATALOG','brochure-kicker'),node('h1',$('print-title').value.trim()||'제품 소개자료'));
    const customer=$('print-customer').value.trim();if(customer)titleBox.append(node('p',`${customer} 귀중`,'brochure-customer'));
    const pageMeta=node('div',undefined,'brochure-page-meta');pageMeta.append(node('strong',`${pageNumber}`),node('span',`/ ${pageTotal}`));
    header.append(logo,titleBox,pageMeta);page.append(header);
    if(pageNumber===1&&$('print-memo').value.trim())page.append(node('p',$('print-memo').value.trim(),'brochure-memo'));
    const table=node('table',undefined,'brochure-table'),head=node('thead'),labels=node('tr');
    const numberHeader=node('th','No.','brochure-col-number');numberHeader.scope='col';labels.append(numberHeader);
    const first=node('th','제품명 / 코드');first.scope='col';first.classList.add('brochure-col-name');labels.append(first);
    cols.forEach(([key,label])=>{const th=node('th',label);th.scope='col';th.classList.add(`brochure-col-${key}`);th.dataset.field=key;labels.append(th);});head.append(labels);table.append(head);
    const body=node('tbody');
    products.forEach((p,rowIndex)=>{
      const row=node('tr'),name=node('td');
      row.append(node('td',String(startIndex+rowIndex+1),'brochure-col-number'));
      name.classList.add('brochure-col-name');
      name.append(node('strong',p.name),node('small',`${p.id} · ${p.catalogType}${p.catalogGroup?` / ${p.catalogGroup}`:''}`,'brochure-code'));row.append(name);
      cols.forEach(([key])=>{
        const cell=node('td'),content=node('span',valueFor(p,key),`brochure-cell-text brochure-text-${key}`);
        cell.classList.add(`brochure-col-${key}`);
        cell.dataset.field=key;
        cell.append(content);
        row.append(cell);
      });body.append(row);
    });
    table.append(body);page.append(table);
    const footer=node('footer',undefined,'brochure-footer');footer.append(node('p','제품별 정확한 규격과 적용 조건은 담당자에게 문의해 주세요.'),node('p','Echo Trading Co.,Ltd · +82-70-8652-1774 · www.echotra.com'));
    page.append(footer);return page;
  }
  function buildCompactPage(products,cols,index,total,startIndex){
    const page=node('article',undefined,'compact-page');
    const header=node('header',undefined,'compact-header'),logo=node('img');logo.src='assets/echo-trading-logo.svg';logo.alt='Echo Trading';
    header.append(logo,node('h1',$('print-title').value.trim()||'제품 소개자료'),node('span',`${index} / ${total}`));page.append(header);
    const content=node('div',undefined,'compact-content'),flow=node('div',undefined,'compact-flow');content.append(flow);
    if($('print-customer').value.trim())flow.append(node('p',`${$('print-customer').value.trim()} 귀중`,'compact-customer'));
    if(index===1&&$('print-memo').value.trim())flow.append(node('p',$('print-memo').value.trim(),'compact-memo'));
    const table=node('table',undefined,'compact-table'),group=node('colgroup'),head=node('thead'),labels=node('tr'),body=node('tbody');
    const weights={name:27,marker:15,efficacy:31,origin:8,application:19},sum=cols.reduce((n,[key])=>n+weights[key],0);
    const numberCol=node('col');numberCol.style.width='7mm';group.append(numberCol);
    const numberHeader=node('th','No.','compact-col-number');numberHeader.scope='col';labels.append(numberHeader);
    cols.forEach(([key,label])=>{const col=node('col');col.style.width=`${weights[key]/sum*191}mm`;group.append(col);const th=node('th',label);th.scope='col';labels.append(th);});
    head.append(labels);table.append(group,head,body);
    products.forEach((p,rowIndex)=>{const row=node('tr');row.dataset.productId=p.id;row.append(node('td',String(startIndex+rowIndex+1),'compact-col-number'));cols.forEach(([key])=>{const cell=node('td',key==='name'?p.name:valueFor(p,key));cell.dataset.field=key;row.append(cell);});body.append(row);});
    flow.append(table);page.append(content);
    page.append(node('footer',`Echo Trading · 070-8652-1774 · www.echotra.com | ${products.length}개 제품 | 규격 및 적용 조건은 담당자에게 문의해 주세요.`,'compact-footer'));
    return page;
  }
  // Measure a continuous, fixed-position copy before print pagination begins.
  // Never measure scrollHeight in paged media: Chromium may report a fragment.
  function fitCompact(root){
    const originals=[...root.querySelectorAll('.compact-page')];
    if(!originals.length)return;
    const host=node('div');host.id='print-measure';host.setAttribute('aria-hidden','true');
    document.body.append(host);
    let common=7;
    try{
      originals.forEach(original=>{
        const page=original.cloneNode(true);host.replaceChildren(page);
        const content=page.querySelector('.compact-content'),flow=page.querySelector('.compact-flow');
        const top=page.querySelector('.compact-header').getBoundingClientRect().height+6;
        content.style.top=top+'px';original.querySelector('.compact-content').style.top=top+'px';
        const available=content.getBoundingClientRect().height-8;
        if(available<=0)throw new Error('인쇄 영역을 측정할 수 없습니다. 새로고침 후 다시 시도해 주세요.');
        let low=.5,high=7;
        for(let i=0;i<15;i++){
          const size=(low+high)/2;page.style.setProperty('--compact-font',size+'pt');
          if(flow.getBoundingClientRect().height<=available)low=size;else high=size;
        }
        common=Math.min(common,Math.floor(low*100)/100);
      });
      originals.forEach(page=>page.style.setProperty('--compact-font',common+'pt'));
      // A second check uses the exact final font, including rounding and borders.
      originals.forEach(original=>{
        const page=original.cloneNode(true);host.replaceChildren(page);
        if(page.querySelector('.compact-flow').getBoundingClientRect().height>
           page.querySelector('.compact-content').getBoundingClientRect().height-4){
          throw new Error('선택한 분량에 맞출 수 없습니다. 장수를 늘리거나 출력 항목을 줄여 주세요.');
        }
      });
    }finally{host.remove();}
  }
  function buildSheet(){
    const products=selected(),cols=columns(),sheet=node('div',undefined,'brochure');
    if(!products.length){sheet.append(node('p','출력할 제품 범위를 선택하거나 목록에서 제품을 담아 주세요.','brochure-empty'));return sheet;}
    if(portrait()){sheet.classList.add('compact-brochure');const pages=chunks(products,Math.max(1,Math.ceil(products.length/Number($('print-page-count').value))));let offset=0;pages.forEach((items,i)=>{sheet.append(buildCompactPage(items,cols,i+1,pages.length,offset));offset+=items.length;});return sheet;}
    const pages=chunks(products,10);pages.forEach((products,index)=>sheet.append(buildPage(products,cols,index+1,pages.length,index*10)));return sheet;
  }
  function buildPreview(){
    pageStyle.textContent=portrait()?'@page{size:A4 portrait;margin:6mm}':'@page{size:A4 landscape;margin:10mm}';
    $('print-preview').classList.toggle('portrait-preview',portrait());
    $('print-help').textContent=portrait()?'A4 세로 · 여백 6mm · 배율 100%. PDF로 저장 시 브라우저 머리글·바닥글을 꺼 주세요. 모든 내용이 표시되며 글자 크기는 선택한 분량에 맞춰 조정됩니다.':'A4 가로 · 1페이지당 10개 제품. PDF로 저장 시 배경 그래픽 켜기, 브라우저 머리글·바닥글 끄기를 권장합니다.';
    $('print-chosen').replaceChildren();
    selected().forEach(p=>{const item=node('li');item.append(node('span',`${p.name} · ${p.id}`));const remove=node('button','제외');remove.type='button';remove.setAttribute('aria-label',`${p.name} 선택 제외`);remove.addEventListener('click',()=>{activePreset='';chosen.delete(p.id);sync();updatePresetButtons();buildPreview();});item.append(remove);$('print-chosen').append(item);});
    $('print-preview').replaceChildren(buildSheet());fitCompact($('print-preview'));$('print-now').disabled=!chosen.size;$('print-selection-total').textContent=`출력 제품 ${chosen.size}개 · ${(portrait()?$('print-preview').querySelectorAll('.compact-page').length:Math.ceil(chosen.size/10))}페이지`;
  }
  // Layout uses physical page dimensions; viewport resizing does not change print sizing.
  document.fonts.ready.then(()=>fitCompact($('print-preview')));
  $('select-page').addEventListener('change',e=>{activePreset='';pageIds.forEach(id=>e.target.checked?chosen.add(id):chosen.delete(id));sync();updatePresetButtons();buildPreview();});
  $('clear-selection').addEventListener('click',()=>{activePreset='';chosen.clear();sync();updatePresetButtons();buildPreview();});
  $('open-print').addEventListener('click',()=>{buildPreview();updatePresetButtons();dialog.showModal();fitCompact($('print-preview'));});
  $('close-print').addEventListener('click',()=>dialog.close());
  ['print-title','print-customer','print-memo'].forEach(id=>$(id).addEventListener('input',buildPreview));
  function preparePrint(){
    if(!chosen.size||printPrepared)return;
    const sheet=$('print-preview').firstElementChild.cloneNode(true);
    $('print-sheet').replaceChildren(sheet);printPrepared=true;document.body.classList.add('printing-selection');
    if(dialog.open){returnToPreview=true;dialog.close();}if($('detail').open)$('detail').close();
    if(!oldTitle)oldTitle=document.title;document.title=$('print-title').value.trim()||'Echo Trading 제품 소개자료';
  }
  function finishPrint(){printPrepared=false;document.body.classList.remove('printing-selection');if(oldTitle){document.title=oldTitle;oldTitle='';}if(returnToPreview){returnToPreview=false;dialog.showModal();}}
  $('print-now').addEventListener('click',async()=>{
    if(!chosen.size)return;
    await document.fonts.ready;
    try{buildPreview();preparePrint();requestAnimationFrame(()=>window.print());}
    catch(error){finishPrint();window.alert(error.message);}
  });
  window.addEventListener('beforeprint',preparePrint);window.addEventListener('afterprint',finishPrint);
  window.EchoPrint={createCheckbox,setPage(products){pageIds=products.map(p=>p.id);sync();}};
  updatePresetButtons();buildPreview();sync();
})();
