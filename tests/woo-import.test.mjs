import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {LocalStore,PostgresStore} from '../storage.mjs';
import {randomBytes} from 'node:crypto';
import {parseWooCsv,kilometers,numberValue,plainText,sourceImage,downloadImage,createImporter} from '../woo-import.mjs';

const image=n=>`https://gasparmultimarcas.com.br/wp-content/uploads/2026/11/photo-${n}.png`;
const csv=(overrides={})=>{
 const row={ID:'100',Tipo:'simple',Nome:'Honda City Touring 1.5 ano 2024',Publicado:'1','Em estoque?':'1',Preço:'109900',Imagens:`${image(1)}, ${image(2)}`,'Nome do atributo 1':'Marca','Valores do atributo 1':'Honda','Nome do atributo 2':'Ano do Modelo','Valores do atributo 2':'2024','Nome do atributo 3':'KILOMETRAGEM','Valores do atributo 3':'60 Mil km','Nome do atributo 4':'Câmbio','Valores do atributo 4':'Câmbio automático','Nome do atributo 5':'Tipo de Combustível','Valores do atributo 5':'Álcool/Gasolina',...overrides};
 const quote=s=>'"'+String(s).replace(/"/g,'""')+'"';return '\uFEFF'+Object.keys(row).map(quote).join(',')+'\r\n'+Object.values(row).map(quote).join(',');
};
const validate=(car,id)=>{assert.ok(car.brand&&car.name&&car.version);assert.ok(car.images.length);return {...car,id}};
test('CSV WooCommerce: BOM, vírgulas, HTML, atributos e moeda brasileira',()=>{
 const [row]=parseWooCsv(csv({Descrição:'<p>Bom &amp; completo.</p><script>não importar</script><p>Revisado.</p>',Preço:'R$ 109.900,00'}));
 assert.equal(row.candidate.brand,'Honda');assert.equal(row.candidate.name,'City');assert.equal(row.candidate.version,'Touring 1.5');assert.equal(row.candidate.year,2024);assert.equal(row.candidate.km,60000);assert.equal(row.candidate.price,109900);assert.equal(row.candidate.fuel,'Flex');assert.equal(row.candidate.transmission,'Automático');assert.equal(row.sources.length,2);assert.equal(row.candidate.description,'Bom & completo.\nRevisado.');
 assert.equal(numberValue('99500.50'),99500.5);assert.equal(kilometers('283\\,000 km'),283000);assert.equal(kilometers('210 mil'),210000);assert.equal(kilometers('58000 Mil km'),null);assert.equal(kilometers(''),null);assert.equal(plainText('<b>Seguro</b>'),'Seguro');
 const [semi]=parseWooCsv(csv().replace(/,/g,';').replace('photo-1.png; ','photo-1.png, '));assert.equal(semi.sourceId,'100');
});
test('revisão aponta ambiguidades e preserva ano do atributo',()=>{
 const [row]=parseWooCsv(csv({'Nome':'Honda City Touring ano 2025','Valores do atributo 3':'58000 Mil km','Valores do atributo 4':'Câmbio automático, Câmbio manual'}));
 assert.equal(row.candidate.year,2024);assert.equal(row.candidate.km,null);assert.equal(row.candidate.transmission,'');assert.equal(row.warnings.length,3);
 const [old]=parseWooCsv(csv(),[{id:'city',brand:'Honda',name:'City',year:2024,km:60000}]);assert.equal(old.targetId,'city');assert.equal(old.selected,false);
 assert.equal(parseWooCsv(csv({Publicado:'0'}))[0].eligible,false);
 assert.throws(()=>parseWooCsv('Nome,Imagens\nTeste,foto'),/colunas/);
 assert.throws(()=>parseWooCsv(csv({ID:''})),/ID/);
 assert.throws(()=>parseWooCsv('"ID","ID","Nome","Imagens"\n1,1,teste,foto'),/CSV inválido/);
});
test('download bloqueia URLs arbitrárias, redirecionamentos externos, HTML e fotos grandes',async()=>{
 for(const u of ['http://gasparmultimarcas.com.br/wp-content/uploads/a.png','https://localhost/a.png','https://gasparmultimarcas.com.br.evil.test/wp-content/uploads/a.png','https://gasparmultimarcas.com.br/wp-admin/a.png','https://gasparmultimarcas.com.br:4430/wp-content/uploads/a.png'])assert.throws(()=>sourceImage(u));
 await assert.rejects(downloadImage(image(1),{fetcher:async()=>new Response(null,{status:302,headers:{Location:'https://127.0.0.1/a.png'}})}));
 await assert.rejects(downloadImage(image(1),{fetcher:async()=>new Response('<html>new site</html>')}),/válido/);
 await assert.rejects(downloadImage(image(1),{fetcher:async()=>new Response('x',{headers:{'Content-Length':String(9*1024*1024)}})}),/8 MB/);
 const bytes=await readFile('dist/assets/car-1-0.png');const copied=await downloadImage(image(1),{fetcher:async()=>new Response(bytes)});assert.deepEqual(copied.bytes,bytes);
 const invalid=parseWooCsv(csv({Imagens:'http://127.0.0.1/private.png'}))[0];assert.equal(invalid.eligible,false);
});
async function exercise(store,other=store){
 let downloads=0,uploads=0,fail=true;
 const images={acceptsImageUrl:u=>u.startsWith('/uploads/')||u.startsWith('/assets/'),saveImage:async()=>'/uploads/copied-'+(++uploads)+'.png'};
 const importer=createImporter({store,images,validate,download:async()=>{downloads++;if(downloads===2&&fail)throw Error('simulated network failure');return {bytes:Buffer.from('test'),type:['png','image/png']}}});
 let job=await importer.preview(csv(),'sample.csv');assert.ok(!JSON.stringify(job).includes('gasparmultimarcas.com.br'));
 assert.equal((await store.listVehicles()).length,0);job=await importer.review(job.id,job.rows.map(r=>({sourceId:r.sourceId,selected:true,candidate:r.candidate})));
 job=await importer.step(job.id);assert.equal(job.rows[0].copied.length,1);assert.equal((await store.listVehicles()).length,0);
 job=await importer.step(job.id);assert.equal(job.status,'paused');assert.equal(job.rows[0].status,'error');assert.equal(job.rows[0].copied.length,1);
 fail=false;const resumed=createImporter({store:other,images,validate,download:async()=>({bytes:Buffer.from('test'),type:['png','image/png']})});
 assert.equal((await resumed.latest()).id,job.id);job=await resumed.step(job.id);assert.equal(job.status,'completed');assert.equal((await store.listVehicles()).length,1);assert.equal(uploads,2);
 const [car]=await store.listVehicles();assert.equal(car.id,'wc-100');assert.ok(car.images.every(u=>u.startsWith('/uploads/')));assert.ok(!JSON.stringify(car).includes('wp-content'));
 await resumed.step(job.id);assert.equal((await store.listVehicles()).length,1);
 const repeat=await resumed.preview(csv({Nome:'Honda City Touring atualizado ano 2024','Valores do atributo 3':'61 mil'}),'repeat.csv');assert.equal(repeat.rows[0].targetId,'wc-100');assert.equal(repeat.rows[0].selected,false);
 await resumed.review(repeat.id,repeat.rows.map(r=>({sourceId:r.sourceId,selected:true,candidate:r.candidate})));await resumed.step(repeat.id);await resumed.step(repeat.id);assert.equal(uploads,2,'fotos já copiadas são reutilizadas do armazenamento próprio');assert.equal((await store.listVehicles()).length,1);assert.equal((await store.listVehicles())[0].km,61000);
 const invalid=await resumed.preview(csv(),'invalid.csv');await assert.rejects(resumed.review(invalid.id,[{sourceId:'100',selected:true,candidate:{...invalid.rows[0].candidate,km:null}}]),/Preencha/);assert.equal((await resumed.latest()).status,'review');
}
test('importação retoma após falha e não publica fotos externas nem duplica anúncios',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'gaspar-woo-'));
 try{const store=new LocalStore(dir,{vehicles:[],settings:{}});await exercise(store);const reopened=new LocalStore(dir,{vehicles:[],settings:{}});assert.equal((await reopened.listVehicles()).length,1);assert.ok((await createImporter({store:reopened}).latest()).id)}finally{if(dir.startsWith(join(tmpdir(),'gaspar-woo-')))await rm(dir,{recursive:true,force:true})}
});
test('Neon: importação persiste entre instâncias e transações',{skip:process.env.RUN_NEON_TESTS!=='1'},async()=>{
 const schema='gaspar_site_test_'+randomBytes(8).toString('hex'),a=new PostgresStore(process.env.DATABASE_URL,schema),b=new PostgresStore(process.env.DATABASE_URL,schema);
 try{
  await a.migrate({vehicles:[],settings:{}});await exercise(a,b);
  let entered,release;const ready=new Promise(resolve=>entered=resolve),hold=new Promise(resolve=>release=resolve);
  const images={acceptsImageUrl:()=>true,saveImage:async()=>'/uploads/test.png'};
  const first=createImporter({store:a,images,validate,download:async()=>{entered();await hold;return {bytes:Buffer.from('test'),type:['png','image/png']}}});
  const second=createImporter({store:b,images,validate});const job=await first.preview(csv({ID:'200',Imagens:image(99)}),'concurrent.csv');
  await first.review(job.id,job.rows.map(r=>({sourceId:r.sourceId,selected:true,candidate:r.candidate})));
  const processing=first.step(job.id);await ready;
  try{await assert.rejects(second.step(job.id),e=>e.status===409)}finally{release();await processing}
  assert.equal((await second.latest()).status,'completed');
 }finally{await b.close();if(/^gaspar_site_test_[a-f0-9]{16}$/.test(schema))await a.pool.query(`DROP SCHEMA "${schema}" CASCADE`);await a.close()}
});
