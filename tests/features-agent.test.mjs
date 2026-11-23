import {test} from 'node:test';
import assert from 'node:assert/strict';
import {featureGroups,featureCatalog,featureKey,normalizeFeatures} from '../dist/vehicle-features.js';
import {inventorySnapshot,searchInventory} from '../inventory-agent.mjs';
import {renderVehicleDetail} from '../dist/vehicle-markup.js';
import {parseWooCsv} from '../woo-import.mjs';

test('biblioteca ampla, normalização e proteção dos opcionais',()=>{
 const items=featureGroups.flatMap(group=>group.items);
 assert.ok(items.length>=250);
 assert.equal(new Set(items.map(featureKey)).size,items.length);
 assert.deepEqual(normalizeFeatures(['  Câmera  de ré ','camera de re','Teto solar']),['Câmera de ré','Teto solar']);
 for(const invalid of [null,{},[''],['<script>'],[123],['x'.repeat(101)],Array(251).fill('item')])assert.throws(()=>normalizeFeatures(invalid));
 assert.deepEqual(featureCatalog(['Ar-condicionado','Equipamento extra']).at(-1).items,['Equipamento extra']);
 assert.equal(featureCatalog(Array.from({length:300},(_,i)=>'Extra '+i)).at(-1).items.length,300);
});

test('base JSON só inclui anúncio público e reflete criação, edição e remoção',async()=>{
 const car={id:'1',brand:'Honda',name:'City',version:'Touring',year:2024,price:99000,km:10000,transmission:'Automático',fuel:'Flex',category:'Sedã',features:['Câmera de ré','Teto solar'],images:['assets/car-1-0.png'],source:{private:'secret'},token:'private'};
 let vehicles=[car];const store={listVehicles:async()=>vehicles};
 const first=await inventorySnapshot(store);
 assert.equal(first.total,1);assert.ok(first.vehicles[0].images[0].startsWith('https://gasparmultimarcas.com.br/'));
 assert.equal(first.vehicles[0].availability,'available');assert.equal(first.vehicles[0].currency,'BRL');
 assert.equal(JSON.stringify(first).includes('secret'),false);assert.equal('token' in first.vehicles[0],false);
 assert.equal((await inventorySnapshot(store)).revision,first.revision);
 assert.equal(searchInventory(first.vehicles,{features:['camera de re'],maxPrice:100000}).total,1);
 assert.equal(searchInventory(first.vehicles,{query:'teto solar'}).total,1);
 assert.equal(searchInventory(first.vehicles,{features:['Bancos em couro']}).total,0);
 vehicles=[{...car,price:95000,features:[]}];const edited=await inventorySnapshot(store);
 assert.notEqual(edited.revision,first.revision);assert.equal(edited.vehicles[0].price,95000);assert.deepEqual(edited.vehicles[0].features,[]);
 vehicles=[];const empty=await inventorySnapshot(store);assert.equal(empty.total,0);assert.notEqual(empty.revision,edited.revision);
 const html=renderVehicleDetail({...car,features:['<script>alert(1)</script>']});assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>alert'));
 assert.ok(!renderVehicleDetail({...car,features:[]}).includes('id="vehicle-features-title"'));
});

test('importação reconhece equipamentos informados no WooCommerce',()=>{
 const csv='ID,Nome,Publicado,Imagens,Nome do atributo 1,Valores do atributo 1\n123,Honda City Touring 2024,1,https://gasparmultimarcas.com.br/wp-content/uploads/2026/11/car.jpg,Opcionais,"Ar-condicionado, Câmera de ré; Teto solar"';
 assert.deepEqual(parseWooCsv(csv)[0].candidate.features,['Ar-condicionado','Câmera de ré','Teto solar']);
});
