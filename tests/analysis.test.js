import test from 'node:test';
import assert from 'node:assert/strict';
import {words,concordance,frequency,collocates} from '../src/analysis.js';
const files=[{name:'one.txt',text:'Language shapes language. Languages change.'},{name:'two.txt',text:'We study language and meaning.'}];
test('concordance searches literal text with original context and source positions',()=>{const r=concordance(files,'language',{whole:true});assert.equal(r.length,3);assert.equal(r[0].hit,'Language');assert.equal(r[1].index,16);assert.equal(r[2].file,'two.txt');assert.equal(concordance(files,'language').length,4)});
test('case and regex options constrain matches',()=>{assert.equal(concordance(files,'language',{caseSensitive:true,whole:true}).length,2);assert.equal(concordance(files,'languages?',{regex:true,whole:true}).length,4);assert.throws(()=>concordance(files,'[',{regex:true}));assert.equal(concordance(files,'.').length,3)});
test('unicode word frequency and n-grams stay within document boundaries',()=>{assert.deepEqual(words('Café naïve hello-world'),['café','naïve','hello-world']);assert.deepEqual(frequency(files)[0],{term:'language',count:3});assert.ok(!frequency(files,2).some(x=>x.term==='change we'));assert.equal(frequency(files,2).find(x=>x.term==='language shapes').count,1)});
test('collocates count surrounding tokens and omit the queried position',()=>{const r=collocates([{text:'a b target c d'}],'target');assert.equal(r.length,4);assert.ok(!r.some(x=>x.term==='target'));assert.deepEqual(concordance(files,''),[])});

const {batchCounts, parseTerms, batchCSV} = await import('../src/batch.js');
test('batch terms normalize CRLF, blanks and duplicates; reject non-word patterns',()=>{
 assert.deepEqual(parseTerms(' May\r\n\nmay\nseem*\n SU '),['may','seem*','su']);
 for(const term of ['*','[a-z]','two words','foo?']) assert.throws(()=>parseTerms(term));
});
test('batch gives exact and wildcard raw counts and weighted rates per file and combined',()=>{
 const result=batchCounts([{id:1,name:'same.txt',text:'May may maybe seems seemed su such.'},{id:2,name:'same.txt',text:'may appear appears'}], 'may\nseem*\nsu\nappear*\nwould');
 const combined=result.rows.filter(r=>r.scopeId==='combined');
 assert.deepEqual(combined.map(r=>r.count),[3,2,1,2,0]);
 assert.equal(combined[0].words,10);assert.equal(combined[0].per1000,3/10*1000);assert.equal(combined[0].percent,3/10*100);
 assert.deepEqual(combined[1].forms,['seemed','seems']);
 assert.equal(result.rows.find(r=>r.term==='may'&&r.scopeId===1).count,2);
 assert.equal(result.rows.find(r=>r.term==='may'&&r.scopeId===2).count,1);
 assert.equal(result.totals[0].count,8);
});
test('batch overlapping patterns count unique tokens in totals and handle empty texts',()=>{
 const r=batchCounts([{name:'empty',text:''},{name:'unicode',text:'Café café seems seem seeming'}],'café\nseem\nseem*');
 assert.equal(r.totals[0].count,5);assert.equal(r.rows.filter(x=>x.scopeId==='combined').reduce((s,r)=>s+r.count,0),6);
 assert.equal(r.totals[1].per1000,0);assert.equal(r.totals[1].percent,0);
 assert.deepEqual(batchCounts([], '').rows,[]);
 const csv=batchCSV(r);assert.match(csv,/per_1000_words/);assert.match(csv,/TOTAL \(unique matched tokens\)/);assert.ok(!csv.includes('NaN'));
});
