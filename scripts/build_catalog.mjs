#!/usr/bin/env node
// Usage: node scripts/build_catalog.mjs input.json data/catalog.js
import { readFile, writeFile } from 'node:fs/promises';

const [input,output]=process.argv.slice(2);
if(!input||!output){console.error('입력 JSON과 출력 catalog.js 경로가 필요합니다.');process.exit(1);}
const products=JSON.parse(await readFile(input,'utf8'));
if(!Array.isArray(products))throw new Error('제품 데이터 배열이 아닙니다.');
const content='// Echo Trading catalog data.\nwindow.ECHO_PRODUCTS = '+JSON.stringify(products,null,2)+';\n';
await writeFile(output,content,'utf8');
console.log(`${products.length}개 제품의 웹용 catalog.js를 만들었습니다.`);
