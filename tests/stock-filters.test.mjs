import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {matchesStock,stockFeatureFacets,renderStockFeatures,setupStockFeatureControl} from '../dist/stock-filters.js';
import {renderVehicleFeatures} from '../dist/vehicle-markup.js';
import {filterStock,renderSeoPage} from '../seo.mjs';

const base={name:'City',version:'Touring',year:2024,km:10000,transmission:'Automático',fuel:'Flex',category:'Sedã',images:['/assets/car-1-0.png']};
const cars=[
 {...base,id:'1',brand:'Honda',price:90000,features:['Teto solar','Câmera de ré','Item exclusivo']},
 {...base,id:'2',brand:'Honda',price:70000,features:['Câmera de ré']},
 {...base,id:'3',brand:'Fiat',category:'Hatch',price:60000,features:['Bancos em couro']}
];
test('filtros dinâmicos incluem só equipamentos existentes e contam sem duplicar',()=>{
 let params=new URLSearchParams();let facets=stockFeatureFacets(cars,params);
 assert.equal(facets.length,4);assert.equal(facets.find(item=>item.label==='Câmera de ré').count,2);
 assert.equal(facets.some(item=>item.label==='Ar-condicionado'),false);
 params=new URLSearchParams({marca:'Honda',preco:'80000'});facets=stockFeatureFacets(cars,params);
 assert.deepEqual(facets,[{label:'Câmera de ré',count:1}]);
 params=new URLSearchParams('opcional=Teto+solar&opcional=camera+de+re');
 assert.deepEqual(cars.filter(car=>matchesStock(car,params)).map(car=>car.id),['1']);
 assert.deepEqual(filterStock(cars,params).map(car=>car.id),['1']);
 assert.equal(stockFeatureFacets(cars,params).some(item=>item.label==='Bancos em couro'),false);
 params.set('marca','Fiat');assert.equal(cars.filter(car=>matchesStock(car,params)).length,0);
 assert.equal(stockFeatureFacets(cars,params).find(item=>item.label==='Teto solar').count,0);
 assert.equal(renderStockFeatures([],new URLSearchParams()),'');
 assert.equal(stockFeatureFacets([cars[1]],new URLSearchParams()).some(item=>item.label==='Teto solar'),false);
});

test('SSR respeita opcionais na URL, categorias existentes e noindex',async()=>{
 const template=await readFile('dist/estoque.html','utf8'),params=new URLSearchParams('opcional=Teto+solar');
 const page=renderSeoPage(template,{path:'/estoque',cars,params});
 const dom=new JSDOM(page.html),doc=dom.window.document;
 assert.match(page.robots,/noindex/);assert.equal(doc.querySelectorAll('#vehicles .vehicle-card').length,1);
 assert.ok(doc.querySelector('input[value="Teto solar"]').checked);
 assert.equal(doc.querySelector('button[data-category="SUV"]'),null);
 assert.ok(doc.querySelector('button[data-category="Hatch"]'));
 assert.ok(!page.html.includes('<!-- stock:features -->'));
 dom.window.close();
});

test('checkbox mantém painel aberto, busca itens e permite limpar seleção',()=>{
 const dom=new JSDOM('<div id="filters"></div>'),previous=globalThis.document;globalThis.document=dom.window.document;
 try{
  const host=document.querySelector('#filters');let params=new URLSearchParams('marca=Honda');
  const control=setupStockFeatureControl(host,values=>{params.delete('opcional');for(const value of values)params.append('opcional',value);control.update(cars,params)});
  control.update(cars,params);host.querySelector('details').open=true;
  const input=[...host.querySelectorAll('input[name="opcional"]')].find(input=>input.value==='Teto solar');input.click();
  assert.equal(params.get('marca'),'Honda');assert.deepEqual(params.getAll('opcional'),['Teto solar']);assert.ok(host.querySelector('details').open);
  const search=host.querySelector('[data-feature-search]');search.value='camera';search.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
  const visible=[...host.querySelectorAll('[data-feature-option]')].filter(label=>!label.hidden);assert.equal(visible.length,1);assert.equal(visible[0].querySelector('input').value,'Câmera de ré');
  host.querySelector('[data-clear-features]').click();assert.deepEqual(params.getAll('opcional'),[]);assert.equal(params.get('marca'),'Honda');
 }finally{globalThis.document=previous;dom.window.close()}
});

test('anúncio agrupa equipamentos reais e mantém extras seguros',()=>{
 const dom=new JSDOM(renderVehicleFeatures({...cars[0],features:['Teto solar','Câmera de ré','Item exclusivo','<img src=x onerror=alert(1)>']}));
 const groups=[...dom.window.document.querySelectorAll('.equipment-group')];assert.equal(groups.length,3);
 assert.ok(groups.some(group=>group.querySelector('h3').textContent.includes('Exterior e iluminação')));
 assert.ok(groups.some(group=>group.querySelector('h3').textContent.includes('Outros equipamentos')));
 assert.equal(dom.window.document.querySelectorAll('li').length,4);assert.equal(dom.window.document.querySelector('img'),null);
 assert.equal(renderVehicleFeatures({...base,features:[]}), '');dom.window.close();
});
