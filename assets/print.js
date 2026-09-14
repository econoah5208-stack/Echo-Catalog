/* 선택 제품 소개자료: 브라우저 인쇄 / PDF 저장. 외부 전송 없음. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const all=(window.ECHO_PRODUCTS||[]).filter(p=>p.visible!==false);
  const byId=new Map(all.map(p=>[p.id,p]));
  const chosen=new Set(); let pageIds=[], returnToPreview=false, oldTitle='';
  const fields=[['marker','지표성분'],['spec','규격 / 함량'],['packaging','포장단위'],['origin','원산지'],['function','주요 특성'],['application','어플리케이션']];
  const defaults=new Set(['marker','packaging','origin','function','application']);
  const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  const ko=text=>String(text||'').split(';').map(s=>s.includes(' / ')?s.split(' / ').slice(1).join(' / ').trim():s.trim()).filter(Boolean).join(' · ');
  const dialog=$('print-dialog');
  fields.forEach(([key,title])=>{const label=node('label');const input=node('input');input.type='checkbox';input.value=key;input.checked=defaults.has(key);input.addEventListener('change',buildPreview);label.append(input,node('span',title));$('print-columns').append(label);});
  function selected(){return [...chosen].map(id=>byId.get(id)).filter(Boolean);}
  function columns(){return fields.filter(([key])=>[...$('print-columns').querySelectorAll('input')].some(input=>input.value===key&&input.checked));}
  function sync(){
    $('selection-count').textContent=`${chosen.size}개 선택`;
    $('open-print').disabled=!chosen.size;$('clear-selection').disabled=!chosen.size;
    document.querySelectorAll('input[data-product-select]').forEach(input=>{input.checked=chosen.has(input.dataset.productSelect);});
    const count=pageIds.filter(id=>chosen.has(id)).length;
    $('select-page').checked=pageIds.length>0&&count===pageIds.length;
    $('select-page').indeterminate=count>0&&count<pageIds.length;
    $('select-page').disabled=!pageIds.length;
  }
  function createCheckbox(p){
    const wrap=node('label',undefined,'product-selection');const input=node('input');input.type='checkbox';input.dataset.productSelect=p.id;input.checked=chosen.has(p.id);
    input.setAttribute('aria-label',`${p.name} (${p.id}) 소개자료에 선택`);
    input.addEventListener('change',()=>{if(input.checked)chosen.add(p.id);else chosen.delete(p.id);sync();});
    wrap.append(input,node('span','자료에 담기'));return wrap;
  }
  function buildSheet(){
    const products=selected(), cols=columns();
    const sheet=node('div',undefined,'brochure');
    const table=node('table',undefined,'brochure-table');const head=node('thead');const headingRow=node('tr');const heading=node('th');heading.colSpan=cols.length+1;heading.className='brochure-heading';
    const banner=node('div',undefined,'brochure-banner');
    banner.append(node('h1',$('print-title').value.trim()||'제품 소개자료'),node('div','Echo Trading Co.,Ltd','brochure-brand'));
    const meta=node('div',undefined,'brochure-meta');const customer=$('print-customer').value.trim();meta.append(node('span',customer?`${customer} 귀중`:''),node('span',`선정 제품 ${products.length}종`));
    heading.append(banner,meta);headingRow.append(heading);head.append(headingRow);
    const labels=node('tr',undefined,'brochure-labels');const first=node('th','제품명');first.scope='col';labels.append(first);
    cols.forEach(([,label])=>{const th=node('th',label);th.scope='col';labels.append(th);});head.append(labels);table.append(head);
    const body=node('tbody');
    products.forEach(p=>{
      const row=node('tr');const name=node('td');name.append(node('strong',p.name),node('small',p.id,'brochure-code'));row.append(name);
      cols.forEach(([key])=>row.append(node('td',(key==='function'||key==='application'?ko(p[key]):p[key])||'문의')));body.append(row);
    });table.append(body);
    const foot=node('tfoot');const footrow=node('tr');const footcell=node('td');footcell.colSpan=cols.length+1;
    footcell.append(node('div','Echo Trading Co.,Ltd  |  Tel +82-70-8652-1774  |  Fax +82 31 742 0474  |  www.echotra.com','brochure-contact'));
    footrow.append(footcell);foot.append(footrow);table.append(foot);sheet.append(table);
    const memo=$('print-memo').value.trim();if(memo)sheet.append(node('p',memo,'brochure-memo'));
    sheet.append(node('p','제품별 정확한 규격과 적용 조건은 담당자에게 문의해 주세요.','brochure-note'));
    return sheet;
  }
  function buildPreview(){
    $('print-chosen').replaceChildren();
    selected().forEach(p=>{const item=node('li');item.append(node('span',`${p.name} · ${p.id}`));const remove=node('button','제외');remove.type='button';remove.setAttribute('aria-label',`${p.name} 선택 제외`);remove.addEventListener('click',()=>{chosen.delete(p.id);sync();buildPreview();});item.append(remove);$('print-chosen').append(item);});
    $('print-preview').replaceChildren(buildSheet());$('print-now').disabled=!chosen.size;
    $('print-selection-total').textContent=`출력 제품 ${chosen.size}개`;
  }
  $('select-page').addEventListener('change',e=>{pageIds.forEach(id=>e.target.checked?chosen.add(id):chosen.delete(id));sync();});
  $('clear-selection').addEventListener('click',()=>{chosen.clear();sync();});
  $('open-print').addEventListener('click',()=>{if(!chosen.size)return;buildPreview();dialog.showModal();});
  $('close-print').addEventListener('click',()=>dialog.close());
  ['print-title','print-customer','print-memo'].forEach(id=>$(id).addEventListener('input',buildPreview));
  function preparePrint(){
    if(!chosen.size)return;
    $('print-sheet').replaceChildren(buildSheet());document.body.classList.add('printing-selection');
    if(dialog.open){returnToPreview=true;dialog.close();}
    if($('detail').open)$('detail').close();
    if(!oldTitle)oldTitle=document.title;document.title=$('print-title').value.trim()||'Echo Trading 제품 소개자료';
  }
  function finishPrint(){
    document.body.classList.remove('printing-selection');if(oldTitle){document.title=oldTitle;oldTitle='';}
    if(returnToPreview){returnToPreview=false;dialog.showModal();}
  }
  $('print-now').addEventListener('click',()=>{if(!chosen.size)return;preparePrint();requestAnimationFrame(()=>window.print());});
  window.addEventListener('beforeprint',preparePrint);window.addEventListener('afterprint',finishPrint);
  window.EchoPrint={createCheckbox,setPage(products){pageIds=products.map(p=>p.id);sync();}};
  sync();
})();
