import {parse} from 'csv-parse/sync';
import {decode} from 'he';
import {createHash,randomUUID} from 'node:crypto';
import {imageType,MAX_IMAGE_BYTES} from './image-storage.mjs';

export const categories=['Hatch','SUV','Sedã','Monovolume','Picape','Perua','Cupê','Outro'];
export const transmissions=['Automático','Manual','Automatizado','CVT'];
const norm=s=>String(s??'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const fail=message=>Object.assign(Error(message),{status:400});
export function plainText(value){return decode(String(value||'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<(br|\/p|\/div|\/li)\b[^>]*>/gi,'\n').replace(/<[^>]*>/g,'')).replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/\n\s*\n/g,'\n').trim().slice(0,3000)}
export function numberValue(value){let s=String(value??'').replace(/R\$|\s|\\/g,'');if(!s)return null;if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');else if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');return /^\d+(\.\d+)?$/.test(s)?Number(s):null}
export function kilometers(value){const s=String(value??'').toLowerCase().replace(/\\/g,'').trim();const mil=/\bmil\b/.test(s);const raw=s.replace(/km|mil|\s/g,'');let n=/^\d{1,3}([.,]\d{3})+$/.test(raw)?Number(raw.replace(/[.,]/g,'')):numberValue(raw);if(n===null)return null;if(mil){if(n>=1000)return null;n*=1000}return Number.isInteger(n)&&n<=3000000?n:null}
export function sourceImage(value){
 let u;try{u=new URL(value)}catch{throw fail('URL de foto inválida no CSV.')}
 if(u.protocol!=='https:'||!['gasparmultimarcas.com.br','www.gasparmultimarcas.com.br'].includes(u.hostname)||u.port||u.username||u.password||u.search||u.hash||!/^\/wp-content\/uploads\/[\w%./-]+\.(png|jpe?g|webp)$/i.test(u.pathname)||u.pathname.includes('..'))throw fail('Fotos do CSV devem ser arquivos HTTPS da pasta de uploads da loja.');
 return u.href;
}
export async function downloadImage(url,{fetcher=fetch}={}){
 const signal=AbortSignal.timeout(12000);let current=sourceImage(url);
 for(let redirects=0;redirects<=3;redirects++){
  const response=await fetcher(current,{redirect:'manual',signal,headers:{Accept:'image/png,image/jpeg,image/webp'}});
  if([301,302,303,307,308].includes(response.status)){await response.body?.cancel();current=sourceImage(new URL(response.headers.get('location'),current).href);continue}
  if(!response.ok||!response.body)throw fail('Não foi possível baixar a foto. Verifique se o WordPress ainda está disponível.');
  if(Number(response.headers.get('content-length'))>MAX_IMAGE_BYTES){await response.body.cancel();throw fail('Foto acima do limite de 8 MB.')}
  const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>MAX_IMAGE_BYTES)throw fail('Foto acima do limite de 8 MB.');chunks.push(chunk)}
  const bytes=Buffer.concat(chunks),type=imageType(bytes);if(!type)throw fail('O endereço da foto não retornou um JPG, PNG ou WebP válido.');return {bytes,type};
 }
 throw fail('A foto redirecionou muitas vezes.');
}
const categoryFor=name=>{
 const model=norm(name);if(['hrv','sportage','taos','ecosport','tracker','duster','aircross','kicks','tcross'].includes(model))return 'SUV';
 if(['city','virtus','voyage','grandsiena','cronos','408','320i','corsa'].includes(model))return 'Sedã';if(model==='meriva')return 'Monovolume';if(model==='saveiro')return 'Picape';
 if(['polo','cityhatchback','kwid','sandero','argo','onix','fit','focus','c3','hb20'].includes(model))return 'Hatch';return 'Outro';
};
export function parseWooCsv(csv,existing=[],links={}){
 if(typeof csv!=='string'||Buffer.byteLength(csv)>1024*1024)throw fail('Envie um CSV de até 1 MB.');
 let rows;try{rows=parse(csv,{bom:true,columns:headers=>{const h=headers.map(norm);if(new Set(h).size!==h.length)throw Error();return h},delimiter:csv.split(/\r?\n/)[0].includes(';')?';':',',skip_empty_lines:true,max_record_size:100000,to:1002})}catch{throw fail('CSV inválido. Exporte os produtos pelo WooCommerce em UTF-8, com cabeçalho.')}
 if(!rows.length||rows.length>500)throw fail('O CSV deve conter de 1 a 500 produtos.');
 if(!Object.hasOwn(rows[0],'nome')||!Object.hasOwn(rows[0],'id')||!Object.hasOwn(rows[0],'imagens'))throw fail('O CSV precisa das colunas ID, Nome e Imagens do WooCommerce.');
 const seen=new Set();return rows.map((r,index)=>{
  const warnings=[],attributes={};for(let i=1;i<=50;i++){const key=r['nomedoatributo'+i];if(key)attributes[norm(key)]=r['valoresdoatributo'+i]||''}
  const title=plainText(r.nome),sourceId=String(r.id||'').trim(),sourceKey='woocommerce:'+sourceId;
  const published=r.publicado==='1'&&r.emestoque!=='0'&&(!r.tipo||r.tipo==='simple');
  if(!published)warnings.push('Produto não publicado, sem estoque ou tipo não suportado; não pode ser importado.');
  if(!/^\d+$/.test(sourceId)||seen.has(sourceId))throw fail(`ID ausente, inválido ou repetido na linha ${index+2}.`);seen.add(sourceId);
  const brand=plainText(attributes.marca)||['Volkswagen','Chevrolet','Renault','Honda','Fiat','Ford','BMW','Kia','Peugeot','Citroën','Nissan','Hyundai'].find(b=>norm(title).startsWith(norm(b)))||'';
  let trimmed=title.replace(/\s+(?:ano\s+)?(?:19|20)\d{2}\b/gi,'').trim();const first=trimmed.split(/\s+/)[0];if(norm(first)===norm(brand))trimmed=trimmed.slice(first.length).trim();
  const match=trimmed.match(/^(City Hatchback|Grand Siena|\S+)(?:\s+(.*))?$/i);
  const name=match?.[1]||'',version=match?.[2]||'';
  const year=numberValue(attributes.anodomodelo),km=kilometers(attributes.kilometragem||attributes.km);
  const rawTransmission=norm(attributes.cambio);const transmission=/,/.test(attributes.cambio||'')?'':rawTransmission.includes('automatizado')?'Automatizado':rawTransmission.includes('automatico')?'Automático':rawTransmission.includes('manual')?'Manual':rawTransmission.includes('cvt')?'CVT':'';
  const rawFuel=norm(attributes.tipodecombustivel),fuel=rawFuel.includes('alcool')&&rawFuel.includes('gasolina')?'Flex':rawFuel==='gasolina'?'Gasolina':rawFuel==='diesel'?'Diesel':rawFuel==='eletrico'?'Elétrico':'Consultar';
  if(fuel==='Consultar')warnings.push('Combustível ausente ou não reconhecido; confirmar.');
  if(km===null)warnings.push(`Quilometragem ambígua ou ausente: ${attributes.kilometragem||attributes.km||'não informada'}.`);
  if(!transmission)warnings.push('Câmbio ausente ou com mais de uma opção; escolher.');
  const titleYear=title.match(/\b(19\d{2}|20\d{2})\b/);if(titleYear&&Number(titleYear[1])!==year)warnings.push(`Ano no título (${titleYear[1]}) difere do atributo (${year}); confirmar.`);
  const price=numberValue(r.preco||r.preconormal||r.regularprice);if(r.precopromocional)warnings.push('Preço promocional ignorado; usando preço regular.');
  let sources=[];try{sources=[...new Set(String(r.imagens||'').split(',').map(s=>s.trim()).filter(Boolean).map(sourceImage))]}catch(e){warnings.push(e.message)}
  if(sources.length>20)warnings.push('Mais de 20 fotos: ajuste o CSV para preservar todas as imagens.');
  const candidate={brand,name,version,year,km,price,transmission,fuel,category:categoryFor(name),badge:'',description:plainText(r.descricao||r.descricaocurta),images:[]};
  const matches=existing.filter(c=>norm(c.brand)===norm(brand)&&norm(c.name)===norm(name)&&c.year===year&&c.km===km);
  const targetId=links[sourceKey]||(matches.length===1?matches[0].id:null);
  if(candidate.category==='Outro')warnings.push('Categoria não reconhecida; revisar.');
  return {sourceId,sourceKey,title,candidate,sources,warnings,eligible:published&&sources.length>0&&sources.length<=20,targetId,selected:published&&!targetId,status:'review',copied:[],error:''};
 });
}

// Jobs and links are private to the admin. Only copied image URLs enter the catalog.
export class ImportRepository{
 constructor(store){this.store=store;this.busy=new Set()}
 async create(job){
  const matched=job.rows.filter(row=>row.targetId);
  if(this.store.pool){
   const client=await this.store.pool.connect();
   try{
    await client.query('BEGIN');
    await client.query(`INSERT INTO ${this.store.table('import_jobs')} (id,data) VALUES($1,$2::jsonb)`,[job.id,JSON.stringify(job)]);
    if(matched.length)await client.query(`INSERT INTO ${this.store.table('import_links')} (source_key,vehicle_id) SELECT * FROM unnest($1::text[],$2::text[]) ON CONFLICT(source_key) DO NOTHING`,[matched.map(r=>r.sourceKey),matched.map(r=>r.targetId)]);
    await client.query('COMMIT');
   }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
  }else{
   this.store.data.importJobs??={};this.store.data.importJobs[job.id]=job;
   this.store.data.importLinks??={};for(const row of matched)this.store.data.importLinks[row.sourceKey]??=row.targetId;
   this.store.save();
  }
  return job;
 }
 async latest(){if(this.store.pool)return (await this.store.pool.query(`SELECT data FROM ${this.store.table('import_jobs')} ORDER BY created_at DESC LIMIT 1`)).rows[0]?.data||null;return Object.values(this.store.data.importJobs||{}).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0]||null}
 async links(){if(this.store.pool)return Object.fromEntries((await this.store.pool.query(`SELECT source_key,vehicle_id FROM ${this.store.table('import_links')}`)).rows.map(r=>[r.source_key,r.vehicle_id]));return this.store.data.importLinks||{}}
 async edit(id,action){
  if(this.busy.has(id))throw Object.assign(Error('Esta importação já está sendo processada. Tente novamente.'),{status:409});this.busy.add(id);
  let client=null,snapshot;
  try{
   if(this.store.pool)client=await this.store.pool.connect();
   if(client)await client.query('BEGIN');else snapshot=structuredClone(this.store.data);
   const job=client?(await client.query(`SELECT data FROM ${this.store.table('import_jobs')} WHERE id=$1 FOR UPDATE NOWAIT`,[id])).rows[0]?.data:structuredClone(this.store.data.importJobs?.[id]);
   if(!job)throw Object.assign(Error('Importação não encontrada.'),{status:404});
   const context={
    cached:async key=>client?(await client.query(`SELECT url FROM ${this.store.table('import_images')} WHERE source_hash=$1`,[key])).rows[0]?.url:this.store.data.importImages?.[key],
    cache:async(key,url)=>{if(client)await client.query(`INSERT INTO ${this.store.table('import_images')} VALUES($1,$2) ON CONFLICT(source_hash) DO UPDATE SET url=EXCLUDED.url`,[key,url]);else{this.store.data.importImages??={};this.store.data.importImages[key]=url}},
    publish:async(row,car)=>{
     if(client){await client.query(`INSERT INTO ${this.store.table('vehicles')} (id,data) VALUES($1,$2::jsonb) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data,updated_at=now()`,[car.id,JSON.stringify(car)]);await client.query(`INSERT INTO ${this.store.table('import_links')} VALUES($1,$2) ON CONFLICT(source_key) DO UPDATE SET vehicle_id=EXCLUDED.vehicle_id`,[row.sourceKey,car.id])}
     else{this.store.data.vehicles=this.store.data.vehicles.filter(c=>c.id!==car.id);this.store.data.vehicles.unshift(car);this.store.data.importLinks??={};this.store.data.importLinks[row.sourceKey]=car.id}
    }
   };
   await action(job,context);
   if(client){await client.query(`UPDATE ${this.store.table('import_jobs')} SET data=$2::jsonb WHERE id=$1`,[id,JSON.stringify(job)]);await client.query('COMMIT')}else{this.store.data.importJobs[id]=job;this.store.save()}return job;
  }catch(error){if(client)await client.query('ROLLBACK');else if(snapshot)this.store.data=snapshot;if(error.code==='55P03')throw Object.assign(Error('Importação em processamento. Tente novamente.'),{status:409});throw error}finally{client?.release();this.busy.delete(id)}
 }
}
export function createImporter({store,images,validate,download=downloadImage}){
 const repo=new ImportRepository(store);
 const publicJob=job=>job?{...job,rows:job.rows.map(({sources,sourceKey,...row})=>({...row,photoCount:sources.length}))}:null;
 const check=row=>{if(!row.eligible)throw fail('Produto não elegível para importação.');if(row.candidate.km===null||row.candidate.year===null||row.candidate.price===null)throw fail('Preencha ano, preço e quilometragem.');return validate({...row.candidate,images:['/assets/car-import-validation.png']},row.targetId||'wc-'+row.sourceId)};
 return {
  latest:async()=>publicJob(await repo.latest()),
  preview:async(csv,filename)=>{const rows=parseWooCsv(csv,await store.listVehicles(),await repo.links());return publicJob(await repo.create({id:randomUUID(),filename:String(filename||'WooCommerce.csv').slice(0,180),createdAt:new Date().toISOString(),status:'review',rows}))},
  review:async(id,updates)=>publicJob(await repo.edit(id,async job=>{
   if(job.status!=='review')throw fail('Esta importação já foi iniciada.');
   if(!Array.isArray(updates)||updates.length!==job.rows.length)throw fail('Revisão incompleta.');
   for(const row of job.rows){
    const u=updates.find(x=>x.sourceId===row.sourceId);
    if(!u||typeof u.selected!=='boolean')throw fail('Seleção inválida.');
    row.selected=u.selected;
    if(!row.selected)continue;
    try{
     if(u.candidate){
      if(['year','km','price'].some(key=>u.candidate[key]===null||u.candidate[key]===''))throw fail('Preencha ano, preço e quilometragem.');
      const safe=validate({...u.candidate,images:['/assets/car-import-validation.png']},row.targetId||'wc-'+row.sourceId);delete safe.id;safe.images=[];row.candidate=safe;
     }
     check(row);
    }catch(error){throw fail(`${row.title} (ID ${row.sourceId}): ${error.message}`)}
   }
   if(!job.rows.some(r=>r.selected))throw fail('Selecione pelo menos um veículo.');
   job.status='running';for(const row of job.rows)row.status=row.selected?'pending':'skipped';
  })),
  step:async id=>publicJob(await repo.edit(id,async(job,context)=>{
   if(job.status==='review')throw fail('Revise os dados antes de iniciar.');
   const row=job.rows.find(r=>['pending','copying','error'].includes(r.status));if(!row){job.status='completed';return}
   row.error='';row.status='copying';
   try{
    check(row);
    if(row.copied.length<row.sources.length){const source=row.sources[row.copied.length],key=createHash('sha256').update(source).digest('hex');let url=await context.cached(key);if(!url||!images.acceptsImageUrl(url)){const {bytes,type}=await download(source);url=await images.saveImage(bytes,type,{signal:AbortSignal.timeout(12000)});if(!images.acceptsImageUrl(url))throw fail('Armazenamento retornou uma URL de imagem inválida.');await context.cache(key,url)}row.copied.push(url)}
    if(row.copied.length===row.sources.length){const car=validate({...row.candidate,images:row.copied},row.targetId||'wc-'+row.sourceId);await context.publish(row,car);row.status='completed';row.targetId=car.id}
    job.status=job.rows.some(r=>['pending','copying','error'].includes(r.status))?'running':'completed';
   }catch(error){row.status='error';row.error=error.status?error.message:'Falha ao copiar a foto. Tente novamente; as fotos já copiadas foram preservadas.';job.status='paused'}
  })),
 };
}
