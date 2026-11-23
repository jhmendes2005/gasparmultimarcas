import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {initFeatures} from '../dist/admin-features.js';
import {featureCatalog,featureKey} from '../dist/vehicle-features.js';

test('checkboxes preservam a seleção, permitem buscar e reutilizar extras na edição',async()=>{
 const dom=new JSDOM(await readFile('dist/admin.html','utf8'));
 const previous=globalThis.document;globalThis.document=dom.window.document;
 const custom=[];const api=async(path,options)=>{
  assert.equal(path,'admin/features');
  if(options?.method==='POST'){const {label}=JSON.parse(options.body);custom.push(label);return {label}}
  return featureCatalog(custom);
 };
 try{
  const editor=await initFeatures(api),doc=dom.window.document;
  const check=label=>[...doc.querySelectorAll('#feature-options input')].find(input=>input.value===label);
  editor.set(['Teto solar','Câmera de ré']);
  assert.equal(check('Teto solar').checked,true);assert.equal(check('Câmera de ré').checked,true);
  assert.equal(doc.querySelector('#feature-count').textContent,'2 selecionados');
  const search=doc.querySelector('#feature-search');search.value='couro';search.dispatchEvent(new dom.window.Event('input'));
  assert.equal(check('Teto solar'),undefined);check('Bancos em couro').click();
  assert.deepEqual(editor.values(),['Teto solar','Câmera de ré','Bancos em couro']);
  search.value='';search.dispatchEvent(new dom.window.Event('input'));assert.equal(check('Teto solar').checked,true);
  doc.querySelector('#feature-custom').value='Equipamento exclusivo';doc.querySelector('#feature-add').click();
  for(let i=0;i<20&&doc.querySelector('#feature-add').disabled;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(check('Equipamento exclusivo').checked,true);assert.ok(editor.values().includes('Equipamento exclusivo'));
  doc.querySelector(`[data-feature-remove="${featureKey('Teto solar')}"]`).click();assert.equal(check('Teto solar').checked,false);
  const saved=editor.values();editor.set([]);assert.equal(check('Equipamento exclusivo').checked,false);
  editor.set(saved);assert.equal(check('Equipamento exclusivo').checked,true);assert.equal(check('Bancos em couro').checked,true);
  editor.set(['Extra de anúncio antigo']);assert.equal(check('Extra de anúncio antigo').checked,true);
  assert.equal(doc.querySelectorAll('.agent-integration').length,1);
 }finally{globalThis.document=previous;dom.window.close()}
});
