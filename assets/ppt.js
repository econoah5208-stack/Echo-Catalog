/* Company PPT builder. All generation is local; the public company profile is fixed. */
(() => {
  'use strict';
  const C=window.ECHO_COMPANY;
  const fields=[['subcategory','소분류'],['marker','지표성분'],['spec','규격 / 함량'],['origin','원산지'],['packaging','포장단위'],['application','어플리케이션'],['function','주요 특성'],['efficacy','효능'],['form','형태'],['process','공정'],['stock','Stock 운용']];
  const ko=v=>String(v||'').split(';').map(s=>s.includes(' / ')?s.split(' / ').slice(1).join(' / ').trim():s.trim()).filter(Boolean).join(' · ');
  const $=id=>document.getElementById(id);
  const theme={navy:'153D55',white:'FFFFFF',mint:'C6DFA9',muted:'BBD0D7',line:'416476',row:'214A60'};
  const font='Malgun Gothic';
  const groupSize=3,bodyFont=17,lineH=0.30,maxLines=12;
  // Conservative explicit wrapping preserves all values, even long custom entries.
  function wrap(value,width,size=bodyFont){
    const capacity=Math.max(1,(width-0.28)*72/size),lines=[];
    for(const paragraph of String(value||'문의').split('\n')){
      const weight=ch=>/[\u2e80-\uffff]/.test(ch)?1.04:/[MW@%]/.test(ch)?0.86:/[il., :;|]/.test(ch)?0.30:0.60;
      let remaining=paragraph;
      while(remaining){
        let used=0,end=0,lastBreak=0;
        for(const ch of remaining){
          if(used+weight(ch)>capacity&&end)break;
          used+=weight(ch);end+=ch.length;
          if(/\s|·/.test(ch))lastBreak=end;
        }
        if(end<remaining.length&&lastBreak>0&&lastBreak>=end*0.35)end=lastBreak;
        lines.push(remaining.slice(0,end).trimEnd());
        remaining=remaining.slice(end).trimStart();
      }
      if(!paragraph)lines.push('');
    }
    return lines;
  }
  function productPages(products,keys){
    const valid=fields.filter(([k])=>keys.includes(k));
    const blocks=[];
    for(let i=0;i<valid.length;i+=groupSize)blocks.push(valid.slice(i,i+groupSize));
    if(!blocks.length)blocks.push([]);
    const groups=new Map();
    products.forEach(p=>{const k=p.catalogType+'\u0000'+p.category;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(p);});
    const pages=[];
    for(const list of groups.values())for(let block=0;block<blocks.length;block++){
      const cols=[['name','제품명 / 코드'],...blocks[block]],widths=cols.length===1?[11.85]:[3.60,...blocks[block].map(()=>8.25/blocks[block].length)];
      let rows=[],heights=[],ids=[],height=0;
      const flush=()=>{if(rows.length)pages.push({kind:'products',title:ko(list[0].category),type:list[0].catalogType,cols,widths,rows,heights,ids,block:block+1,blocks:blocks.length});rows=[];heights=[];ids=[];height=0;};
      for(const p of list){
        const cells=cols.map(([key],i)=>wrap(key==='name'?p.name+'\n'+p.id:ko(p[key])||'문의',widths[i]));
        const parts=Math.max(...cells.map(c=>Math.ceil(c.length/maxLines)));
        for(let part=0;part<parts;part++){
          const row=cells.map((lines,i)=>i===0&&part>0&&lines.length<=maxLines?wrap(p.name+' (계속)\n'+p.id,widths[0]).slice(0,maxLines).join('\n'):lines.slice(part*maxLines,(part+1)*maxLines).join('\n'));
          const h=Math.max(0.78,Math.max(...row.map(v=>v.split('\n').length))*lineH+0.24);
          if(rows.length&&(height+h>3.9||rows.length===3))flush();
          rows.push(row);heights.push(h);ids.push(p.id);height+=h;
        }
      }
      flush();
    }
    return pages;
  }
  function plan(products,options={}){
    const rank={'건강기능식품':0,'일반식품':1,'식품첨가물':2};
    const sorted=[...products].sort((a,b)=>(rank[a.catalogType]??9)-(rank[b.catalogType]??9)||ko(a.category).localeCompare(ko(b.category),'ko')||a.name.localeCompare(b.name,'ko')||a.id.localeCompare(b.id));
    return [{kind:'cover'},{kind:'values'},{kind:'business'},{kind:'network'},{kind:'domestic'},
      ...productPages(sorted,options.fields||['marker','origin','application']),{kind:'closing'}];
  }
  function build(products,options={}){
    if(!window.PptxGenJS)throw Error('PPT 구성 파일을 불러오지 못했습니다. assets/vendor 폴더를 확인해 주세요.');
    if(!C)throw Error('회사소개 정보를 불러오지 못했습니다.');
    const ppt=new window.PptxGenJS();ppt.layout='LAYOUT_WIDE';ppt.author=C.englishName;ppt.subject='회사소개 및 선택 제품 안내';ppt.title=options.title||'에코트레이딩 회사소개';ppt.company=C.englishName;ppt.lang='ko-KR';
    ppt.theme={headFontFace:font,bodyFontFace:font,lang:'ko-KR'};
    const slides=plan(products,options),total=slides.length;
    const text=(s,value,x,y,w,h,size=20,extra={})=>s.addText(String(value),{x,y,w,h,fontFace:font,fontSize:size,color:theme.white,margin:0,breakLine:false,valign:'top',paraSpaceAfterPt:0,...extra});
    const logo=s=>s.addImage({data:C.assets.logo,x:11.63,y:0.43,w:0.95,h:0.95*34/81,altText:'에코트레이딩 공식 로고'});
    const header=(s,title,section,num)=>{logo(s);text(s,section,0.75,0.45,9.8,0.26,11,{color:theme.mint,charSpacing:1.5});text(s,title,0.75,1.0,11.5,0.68,32,{bold:true});text(s,C.englishName,0.75,7.05,9.0,0.18,9,{color:theme.muted});text(s,`${num} / ${total}`,11.6,7.04,0.98,0.2,9,{align:'right',color:theme.muted});};
    for(const [i,p] of slides.entries()){
      const s=ppt.addSlide();s.background={color:theme.navy};
      if(p.kind==='cover'){
        s.addImage({data:C.assets.cover,x:0,y:0,w:13.333333,h:7.5,altText:'공식 홈페이지의 녹색 잎 이미지'});logo(s);
        text(s,'ECHO TRADING',0.85,0.65,9.6,0.3,14,{charSpacing:3});
        text(s,'에코트레이딩',0.82,1.8,11.3,0.92,44,{bold:true});
        text(s,C.message,0.85,3.03,10.8,1.38,29,{bold:true,breakLine:false});
        text(s,options.title||'회사소개 및 제품 안내',0.85,5.33,11.4,0.90,20);
        if(options.customer)text(s,options.customer+' 귀중',0.85,6.38,11.3,0.62,16);
        s.addNotes(`회사 철학: ${C.sources.greeting}\n이미지: http://www.echotra.com/img/main_visual01.jpg\n로고: 사용자 제공 원본\n기준일: ${C.sources.checked}${options.memo?'\n고객 전달 메모: '+options.memo:''}`);
      }else if(p.kind==='values'){
        header(s,'안전과 건강','OUR VALUES',i+1);
        s.addImage({data:C.assets.ingredient,x:8.35,y:1.95,w:4.22,h:4.73,sizing:{type:'crop',w:4.22,h:4.73},altText:'홈페이지 식품원료 이미지'});
        C.values.forEach(([title,body],j)=>{text(s,title,0.78,2.15+j*2.15,6.8,0.57,30,{bold:true,color:theme.mint});text(s,body,0.78,2.92+j*2.15,6.9,1.15,22);});
        s.addNotes(`내용: ${C.sources.greeting}\n핵심 가치: 사용자 제공 안전·건강 철학\n이미지: http://www.echotra.com/img/main_con02_img.jpg`);
      }else if(p.kind==='business'){
        header(s,'식품원료 전문 무역기업','ABOUT ECHO',i+1);
        text(s,C.intro,0.78,1.96,11.8,0.8,24);
        C.business.forEach(([title,body],j)=>{const y=3.08+j*1.08;text(s,String(j+1).padStart(2,'0'),0.78,y,0.6,0.42,20,{color:theme.mint});text(s,title,1.65,y,4.1,0.48,24,{bold:true});text(s,body,6.15,y+0.02,6.2,0.82,18);});
        s.addNotes(`회사 소개: ${C.sources.greeting}\n제품 분야: http://www.echotra.com/products/index.jsp`);
      }else if(p.kind==='network'){
        header(s,'글로벌 원료 네트워크','GLOBAL NETWORK',i+1);
        text(s,'세계 각국의 원료기업과 국내 식품시장을 연결합니다',0.78,1.95,11.8,0.48,22);
        const rows=C.networks.map(([region,names])=>[{text:region,options:{bold:true,color:theme.mint}},names]);
        s.addTable(rows,{x:0.78,y:2.8,w:11.8,colW:[2.45,9.35],rowH:0.66,fontFace:font,fontSize:18,color:theme.white,fill:theme.navy,border:{type:'solid',color:theme.line,pt:0.5},margin:[12,12,12,12],autoPage:false,valign:'mid'});
        text(s,'공식 홈페이지 해외 파트너 목록 중 일부',0.78,6.46,11.8,0.25,11,{color:theme.muted});
        s.addNotes(`출처: ${C.sources.overseas}\n기준일: ${C.sources.checked}\n홈페이지 지역별 목록에서 발췌. 홈페이지의 호주 그룹은 오세아니아로 표기. 특정 제품의 공급처 또는 독점 관계를 의미하지 않습니다.`);
      }else if(p.kind==='domestic'){
        header(s,'국내 식품기업과의 협업','DOMESTIC PARTNERS',i+1);
        text(s,'공식 홈페이지에 소개된 주요 국내 파트너',0.78,1.95,11.7,0.4,21,{color:theme.muted});
        C.domestic.forEach((name,j)=>text(s,name,0.82+(j%3)*4.0,2.80+Math.floor(j/3)*0.60,3.8,0.42,22,{bold:true}));
        s.addNotes(`출처: ${C.sources.domestic}\n기준일: ${C.sources.checked}\n공식 홈페이지 공개 목록 중 일부. 거래 규모나 현재 계약 조건은 기재하지 않습니다.`);
      }else if(p.kind==='products'){
        header(s,p.title,'PRODUCT SELECTION',i+1);
        text(s,`${p.type}${p.blocks>1?'   정보 '+p.block+' / '+p.blocks:''}`,0.78,1.88,11.8,0.34,17,{color:theme.mint});
        const rows=[p.cols.map(([,label])=>({text:label,options:{bold:true,fill:theme.row,color:theme.mint}})),...p.rows];
        s.addTable(rows,{x:0.75,y:2.4,w:11.85,colW:p.widths,rowH:[0.52,...p.heights],fontFace:font,fontSize:bodyFont,color:theme.white,fill:theme.navy,border:{type:'solid',color:theme.line,pt:0.6},margin:[6,9,6,9],autoPage:false,valign:'top',paraSpaceAfterPt:0,breakLine:false});
        text(s,'제품별 규격 및 적용 조건은 담당자에게 문의해 주세요.',0.78,6.86,11.7,0.20,10,{color:theme.muted});
        s.addNotes('출처: 에코트레이딩 제품 데이터베이스\n제품코드: '+[...new Set(p.ids)].join(', ')+'\n선택한 필드만 표시하며 긴 내용은 이어지는 슬라이드에 표시합니다.');
      }else{
        header(s,'건강한 식품을 위한 파트너','CONTACT',i+1);
        text(s,'안전한 원료에 대한 고민을\n에코트레이딩과 함께 나누세요.',0.78,2.03,11.8,1.36,32,{bold:true});
        text(s,C.englishName,0.78,4.11,11.7,0.43,24,{color:theme.mint,bold:true});
        text(s,C.contact.address,0.78,4.87,6.6,1.02,19);
        text(s,'TEL  '+C.contact.tel+'\nFAX  '+C.contact.fax+'\nWEB  www.echotra.com',8.0,4.87,4.55,1.28,18);
        s.addNotes(`주소: ${C.sources.contact}\n전화·팩스: 기존 사용자 제공 카탈로그 연락처 유지\n웹사이트: ${C.contact.web}`);
      }
    }
    return {ppt,slides};
  }
  function setup(){
    if(!$('ppt-fields'))return;
    const defaults=new Set(['marker','origin','application']);
    fields.forEach(([key,label])=>{const l=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=key;input.checked=defaults.has(key);l.append(input,document.createTextNode(label));$('ppt-fields').append(l);});
    function settings(){return {title:$('print-title').value.trim(),customer:$('print-customer').value.trim(),memo:$('print-memo').value.trim(),fields:[...document.querySelectorAll('#ppt-fields input:checked')].map(x=>x.value)};}
    function refresh(){
      const products=window.EchoPrint?.getSelection()||[],opts=settings(),slides=plan(products,opts);
      $('ppt-status').textContent=`회사소개 5장 + 제품 ${slides.length-6}장 + 마무리 1장 = 총 ${slides.length}장 · 선택 제품 ${products.length}개`;
      $('ppt-outline').replaceChildren();
      slides.forEach((p,i)=>{const li=document.createElement('li');li.textContent=({cover:'표지',values:'안전과 건강',business:'회사소개',network:'글로벌 네트워크',domestic:'국내 협업사',closing:'마무리 / 연락처'})[p.kind]||`${p.title} · ${p.type}${p.blocks>1?' · 정보 '+p.block+'/'+p.blocks:''}`;$('ppt-outline').append(li);});
    }
    $('ppt-fields').addEventListener('change',refresh);
    $('ppt-copy-fields').addEventListener('click',()=>{const selected=new Set(window.EchoPrint.getColumns().map(([k])=>k));document.querySelectorAll('#ppt-fields input').forEach(input=>input.checked=selected.has(input.value));refresh();});
    window.addEventListener('echo:selectionchange',refresh);
    ['print-title','print-customer','print-memo'].forEach(id=>$(id).addEventListener('input',refresh));
    $('download-ppt').addEventListener('click',async()=>{
      const button=$('download-ppt'),label=button.textContent;button.disabled=true;button.textContent='PPT 생성 중…';$('ppt-download-status').textContent='선택 내용을 PPT로 구성하고 있습니다.';
      try{
        await new Promise(resolve=>setTimeout(resolve,30));
        const products=window.EchoPrint.getSelection(),opts=settings(),{ppt,slides}=build(products,opts);
        const filename=('에코트레이딩_'+(opts.customer||'회사소개')).replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_').slice(0,75)+'.pptx';
        await ppt.writeFile({fileName:filename,compression:true});
        $('ppt-download-status').textContent=`${slides.length}장 PPT 다운로드를 시작했습니다. 텍스트와 표는 PowerPoint에서 편집할 수 있습니다.`;
      }catch(error){$('ppt-download-status').textContent='다운로드 실패: '+error.message;console.error(error);}
      finally{button.disabled=false;button.textContent=label;}
    });
    refresh();
  }
  window.EchoPpt={build,plan,fields};setup();
})();
