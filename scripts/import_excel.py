"""Local Excel -> public products.js. Usage: python scripts/import_excel.py source.xlsx
Requires openpyxl. Original workbook and private review report must remain outside the repository.
"""
import argparse, json, re
from pathlib import Path
import openpyxl

FIELDS = {'제품코드':'id','아이템':'name','대분류':'category','상세 분류':'subcategory','지표성분':'marker','수치':'spec','기능':'function','사용처(Application)':'application','형태':'form','원산지':'origin','포장':'packaging'}

def convert(source):
    workbook=openpyxl.load_workbook(source,data_only=True,read_only=True)
    sheet=workbook['제품마스터']
    rows=sheet.iter_rows(values_only=True); headers=next(rows)
    missing=set(FIELDS)-set(headers)
    if missing: raise ValueError('필수 열이 없습니다: '+', '.join(sorted(missing)))
    products=[]; review=[]; ids=set()
    for rownum,row in enumerate(rows,2):
        raw=dict(zip(headers,row))
        if not raw.get('아이템'): continue
        p={key:('' if raw.get(col) is None or str(raw[col]).strip()=='-' else re.sub(r'\s+',' ',str(raw[col])).strip()) for col,key in FIELDS.items()}
        p={k:v.replace('건기식','건강기능식품') for k,v in p.items()}
        if not p['id'] or p['id'] in ids: raise ValueError(f'{rownum}행 제품코드가 비어 있거나 중복입니다: {p["id"]}')
        ids.add(p['id'])
        def issue(field,reason):
            review.append({'row':rownum,'id':p['id'],'name':p['name'],'field':field,'original':p[field],'reason':reason})
        # Internal commercial notes must never be included in the public export.
        if p['packaging'] and (not re.search(r'\d\s*(?:kg|g|ml|l|톤|포|통|박스)',p['packaging'],re.I) or re.search(r'원/|단가|MOQ|냉동차|택배|이상\(|샘플판매|Air진행|1t 미만',p['packaging'],re.I)):
            issue('packaging','포장단위 외 정보 또는 단위 불명확. 공개값을 비움');p['packaging']=''
        if p['origin'] in {'FHDIF','에코','매입/미국'}:
            issue('origin','원산지 확인 필요. 공개값을 비움');p['origin']=''
        if re.search(r'확인|지표 여부',p['marker']):
            issue('marker','확정되지 않은 지표성분. 공개값을 비움');p['marker']=''
        if '단위 없음' in p['spec']:
            issue('spec','수치 단위 불명확. 공개값을 비움');p['spec']=''
        if re.search(r'확인 필요|검토 후|확인필요',p['application']):
            issue('application','적용 분야 미확정. 공개값을 비움');p['application']=''
        for field in ['marker','packaging','origin']:
            if not p[field]: review.append({'row':rownum,'id':p['id'],'name':p['name'],'field':field,'original':'','reason':'공개화면에서 문의로 표시'})
        domestic=str(raw.get('국내분류(일반/건기/첨가물)') or '')
        catalog_type=str(raw.get('상위분류') or '').strip().replace('건기식','건강기능식품')
        if not catalog_type:
            catalog_type='식품첨가물' if '식품첨가물' in domestic else '건강기능식품' if '개별인정형 등재 확인' in domestic else '일반식품' if '일반식 사용가능' in domestic or '식품유형 액상차' in domestic else ''
        if p['id']=='BE0072' and not raw.get('상위분류'): catalog_type='일반식품'
        if catalog_type not in ['', '건강기능식품','일반식품','식품첨가물']: raise ValueError(f'{rownum}행 상위분류 오류')
        group=str(raw.get('일반식품 하위분류') or '').strip()
        if catalog_type=='일반식품' and not group: group='기능성부원료' if p['id']=='BE0072' else '일반원료'
        if catalog_type!='일반식품': group=''
        if group not in ['', '일반원료','기능성부원료']: raise ValueError(f'{rownum}행 일반식품 하위분류 오류')
        p.update(catalogType=catalog_type,catalogGroup=group,visible=True);products.append(p)
    workbook.close()
    return products,review

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source',type=Path)
    parser.add_argument('--output',type=Path,default=Path(__file__).resolve().parents[1]/'data/products.js')
    parser.add_argument('--review',type=Path,help='Private review JSON path outside the public repository')
    args=parser.parse_args();products,review=convert(args.source)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text('// Public catalog data. Edit with manage.html or import_excel.py.\nwindow.ECHO_PRODUCTS = '+json.dumps(products,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
    if args.review:
        args.review.write_text(json.dumps(review,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'{len(products)} products exported; {len(review)} review entries. No manufacturer/supplier fields exported.')
