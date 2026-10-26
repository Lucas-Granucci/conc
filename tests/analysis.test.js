import test from 'node:test';
import assert from 'node:assert/strict';
import {words,concordance,frequency,collocates} from '../src/analysis.js';
const files=[{name:'one.txt',text:'Language shapes language. Languages change.'},{name:'two.txt',text:'We study language and meaning.'}];
test('concordance searches literal text with original context and source positions',()=>{const r=concordance(files,'language',{whole:true});assert.equal(r.length,3);assert.equal(r[0].hit,'Language');assert.equal(r[1].index,16);assert.equal(r[2].file,'two.txt');assert.equal(concordance(files,'language').length,4)});
test('case and regex options constrain matches',()=>{assert.equal(concordance(files,'language',{caseSensitive:true,whole:true}).length,2);assert.equal(concordance(files,'languages?',{regex:true,whole:true}).length,4);assert.throws(()=>concordance(files,'[',{regex:true}));assert.equal(concordance(files,'.').length,3)});
test('unicode word frequency and n-grams stay within document boundaries',()=>{assert.deepEqual(words('Café naïve hello-world'),['café','naïve','hello-world']);assert.deepEqual(frequency(files)[0],{term:'language',count:3});assert.ok(!frequency(files,2).some(x=>x.term==='change we'));assert.equal(frequency(files,2).find(x=>x.term==='language shapes').count,1)});
test('collocates count surrounding tokens and omit the queried position',()=>{const r=collocates([{text:'a b target c d'}],'target');assert.equal(r.length,4);assert.ok(!r.some(x=>x.term==='target'));assert.deepEqual(concordance(files,''),[])});
