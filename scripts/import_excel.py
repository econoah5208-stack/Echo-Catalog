"""Local Excel -> public catalog JSON. Usage: python scripts/import_excel.py source.xlsx --output catalog-import.json --review review.json
Requires openpyxl. Original workbook and private review report must remain outside the repository.
"""
import argparse, json, re
from collections import Counter
from pathlib import Path
import openpyxl

FIELDS = {'제품코드':'id','아이템':'name','대분류':'category','소분류':'subcategory','지표성분':'marker','수치':'spec','기능':'function','사용처(Application)':'application','형태':'form','공정':'process','원산지':'origin','포장':'packaging','Stock 운용':'stock'}

# 일반식품 하위 분류 기준은 코드 밖의 설정 파일에서 관리합니다.
# 우선순위: ① Excel '일반식품 하위분류' 열 ② functionalPrefixes ③ functionalIds ④ 일반원료
GROUP_CONFIG = Path(__file__).with_name('general_food_groups.json')
GROUP_COLUMNS = ('일반식품 하위분류', '일반식품 하위 분류')

def load_group_rules(path=GROUP_CONFIG):
    config = json.loads(Path(path).read_text(encoding='utf-8'))
    return tuple(config.get('functionalPrefixes', [])), set(config.get('functionalIds', []))

def convert(source, group_config=GROUP_CONFIG):
    functional_prefixes, functional_ids = load_group_rules(group_config)
    workbook=openpyxl.load_workbook(source,data_only=True,read_only=True)
    sheet=workbook['제품마스터']
    rows=sheet.iter_rows(values_only=True); headers=list(next(rows))
    # Accept the previous template while preferring the current column name.
    if '소분류' not in headers and '상세 분류' in headers:
        headers[headers.index('상세 분류')]='소분류'
    missing=set(FIELDS)-set(headers)
    if missing: raise ValueError('필수 열이 없습니다: '+', '.join(sorted(missing)))
    products=[]; review=[]; ids=set()
    for rownum,row in enumerate(rows,2):
        raw=dict(zip(headers,row))
        if not raw.get('아이템'): continue
        p={key:('' if raw.get(col) is None or str(raw[col]).strip()=='-' else re.sub(r'\s+',' ',str(raw[col])).strip()) for col,key in FIELDS.items()}
        p={k:v.replace('건기식','건강기능식품') for k,v in p.items()}
        # Optional in earlier workbooks; unconfirmed efficacy is not public copy.
        efficacy = re.sub(r'\s+', ' ', str(raw.get('효능') or '')).strip()
        p['efficacy'] = '' if efficacy == '-' or re.search(r'확인|검토|미정', efficacy) else efficacy
        if not p['id'] or p['id'] in ids: raise ValueError(f'{rownum}행 제품코드가 비어 있거나 중복입니다: {p["id"]}')
        ids.add(p['id'])
        def issue(field,reason):
            review.append({'row':rownum,'id':p['id'],'name':p['name'],'field':field,'original':p[field],'reason':reason})
        # Internal commercial notes must never be included in the public export.
        # Keep the package size but remove parenthesized minimum-order conditions,
        # such as "25kg(300kg이상)", from the public value.
        p['packaging'] = re.sub(r'\s*\([^)]*(?:kg\s*이상|kg\s*미만|MOQ)[^)]*\)\s*', '', p['packaging'], flags=re.I)
        if p['packaging'] and (not re.search(r'\d\s*(?:kg|g|ml|l|톤|포|통|박스)',p['packaging'],re.I) or re.search(r'원/|단가|MOQ|냉동차|택배|샘플판매|Air진행|1t 미만',p['packaging'],re.I)):
            issue('packaging','포장단위 외 정보 또는 단위 불명확. 공개값을 비움');p['packaging']=''
        country_tokens=('국산','국내','중국','미국','스페인','인도','폴란드','이스라엘','베트남','터키','브라질','캐나다','뉴질랜드','인도네시아','프랑스','덴마크','대만','네덜란드','독일','이탈리아','칠레','핀란드','멕시코','오스트리아','영국','호주','일본','에스토니아','러시아','페루','필리핀','벨기에','그리스','스웨덴','싱가포르','태국','말레이시아','우즈백','세르비아','헝가리','제주')
        if p['origin'] and not any(token in p['origin'] for token in country_tokens):
            issue('origin','원산지 확인 필요. 공개값을 비움');p['origin']=''
        if re.search(r'확인|지표 여부',p['marker']):
            issue('marker','확정되지 않은 지표성분. 공개값을 비움');p['marker']=''
        if '단위 없음' in p['spec']:
            issue('spec','수치 단위 불명확. 공개값을 비움');p['spec']=''
        if re.search(r'확인 필요|검토 후|확인필요',p['application']):
            issue('application','적용 분야 미확정. 공개값을 비움');p['application']=''
        for field in ['marker','packaging','origin']:
            if not p[field]: review.append({'row':rownum,'id':p['id'],'name':p['name'],'field':field,'original':'','reason':'공개화면에서 문의로 표시'})
        catalog_type=str(raw.get('국내 식품분류') or '').strip().replace('건기식','건강기능식품')
        if catalog_type not in ['건강기능식품','일반식품','식품첨가물']:
            raise ValueError(f'{rownum}행 국내 식품분류 오류: {catalog_type or "빈 값"}')
        group=''
        if catalog_type=='일반식품':
            explicit=next((str(raw.get(col) or '').strip() for col in GROUP_COLUMNS if str(raw.get(col) or '').strip()), '')
            if explicit:
                if explicit not in ('일반원료','기능성부원료'):
                    raise ValueError(f'{rownum}행 일반식품 하위분류 오류: {explicit}')
                group=explicit
            else:
                group='기능성부원료' if p['id'].startswith(functional_prefixes) or p['id'] in functional_ids else '일반원료'
        stock=p['stock'] or '미정'
        if stock not in ['미정','운용','미운용']:
            issue('stock','Stock 운용 값이 미정/운용/미운용이 아님. 미정으로 처리');stock='미정'
        p.update(catalogType=catalog_type,catalogGroup=group,stock=stock,visible=True);products.append(p)
    workbook.close()
    return products,review

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source',type=Path)
    parser.add_argument('--output',type=Path,default=Path.cwd()/'catalog-import.json')
    parser.add_argument('--review',type=Path,help='Private review JSON path outside the public repository')
    parser.add_argument('--groups',type=Path,default=GROUP_CONFIG,help='일반식품 하위 분류 기준 JSON')
    args=parser.parse_args();products,review=convert(args.source,args.groups)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(products,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if args.review:
        args.review.write_text(json.dumps(review,ensure_ascii=False,indent=2),encoding='utf-8')
    types=Counter(p['catalogType'] for p in products)
    groups=Counter(p['catalogGroup'] for p in products if p['catalogType']=='일반식품')
    print(f'{len(products)} products exported; {len(review)} review entries. No manufacturer/supplier fields exported.')
    print('국내 식품분류: '+' / '.join(f'{k} {v}' for k,v in types.items()))
    print('일반식품 하위 분류: '+' / '.join(f'{k} {v}' for k,v in groups.items()))
    print('다음 단계: node scripts/build_catalog.mjs <output.json> data/catalog.js 후 node scripts/verify_catalog.mjs 로 점검하세요.')
