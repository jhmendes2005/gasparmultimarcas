import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {randomBytes,scryptSync,timingSafeEqual,randomUUID} from 'node:crypto';
import {openStore} from './storage.mjs';
import {createImageStorage,imageType,MAX_IMAGE_BYTES} from './image-storage.mjs';
import {createImporter} from './woo-import.mjs';
import {LeadRepository,parseLeadClick,leadRange} from './whatsapp-leads.mjs';
import {SITE_ORIGIN,seoPages,renderSeoPage,sitemapXml,robotsTxt} from './seo.mjs';
const root=resolve('dist'),dataDir=resolve(process.env.VERCEL?'/tmp/gaspar-multimarcas':(process.env.DATA_DIR||'.data')),uploadDir=resolve(dataDir,'uploads');
mkdirSync(uploadDir,{recursive:true});
if(process.env.NODE_ENV==='production'&&!process.env.DATABASE_URL)throw Error('Configure DATABASE_URL em produção.');
const seed={vehicles:JSON.parse(readFileSync(resolve(root,'vehicles.json'),'utf8')),settings:{gtmId:'',metaPixelId:''}};
let store;
try{store=await openStore({dataDir,seed})}catch(error){console.error('Banco indisponível. Verifique DATABASE_URL e execute npm run db:migrate. Código:',error.code||error.name);process.exit(1)}
let password=process.env.ADMIN_PASSWORD;
if(!password){if(process.env.NODE_ENV==='production')throw Error('Configure ADMIN_PASSWORD antes de iniciar em produção.');const pwFile=resolve(dataDir,'admin-password.txt');password=existsSync(pwFile)?readFileSync(pwFile,'utf8').trim():randomBytes(18).toString('base64url');if(!existsSync(pwFile))writeFileSync(pwFile,password,{mode:0o600});console.log('Senha administrativa local disponível em .data/admin-password.txt');}
if(password.length<12)throw Error('ADMIN_PASSWORD precisa de pelo menos 12 caracteres.');
const salt=randomBytes(16),passwordHash=scryptSync(password,salt,64);password=undefined;
const attempts=new Map();const production=process.env.NODE_ENV==='production';
const images=createImageStorage({uploadDir});
if(process.env.VERCEL&&!images.cloudConfigured)throw Error('Configure o armazenamento de imagens na Vercel.');
function json(res,status,body){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body))}
async function body(req,limit=100000){const parts=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>limit){const e=Error('Arquivo ou solicitação muito grande.');e.status=413;throw e}parts.push(chunk)}return Buffer.concat(parts)}
async function payload(req,limit){try{return JSON.parse((await body(req,limit)).toString())}catch(e){if(e.status)throw e;throw Object.assign(Error('JSON inválido.'),{status:400})}}
function ensure(condition,message){if(!condition)throw Object.assign(Error(message),{status:400})}
const imageUrl=value=>images.acceptsImageUrl(value);
function vehicle(input,id){const v={id};for(const key of ['brand','name','version','transmission','fuel','category','badge','description']){ensure(typeof(input[key]??'')==='string','Campo de texto inválido.');v[key]=String(input[key]??'').trim();ensure(v[key].length<=(key==='description'?3000:120),'Texto longo demais.')}ensure(v.brand&&v.name&&v.version,'Informe marca, modelo e versão.');for(const key of ['price','year','km']){v[key]=Number(input[key]);ensure(Number.isFinite(v[key]),'Valor numérico inválido.')}ensure(v.price>0&&v.price<100000000,'Preço inválido.');ensure(Number.isInteger(v.year)&&v.year>=1900&&v.year<=new Date().getFullYear()+2,'Ano inválido.');ensure(Number.isInteger(v.km)&&v.km>=0&&v.km<=3000000,'Quilometragem inválida.');ensure(['Hatch','SUV','Sedã','Monovolume','Picape','Perua','Cupê','Outro'].includes(v.category),'Categoria inválida.');ensure(['Automático','Manual','Automatizado','CVT'].includes(v.transmission),'Câmbio inválido.');ensure(Array.isArray(input.images)&&input.images.length>0&&input.images.length<=20&&input.images.every(imageUrl),'Adicione de 1 a 20 fotos válidas.');v.images=input.images;return v}
const importer=createImporter({store,images,validate:vehicle});
const leads=new LeadRepository(store);
export async function handler(req,res){res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','SAMEORIGIN');
try{const url=new URL(req.url,'http://localhost'),path=url.pathname;const method=req.method;
const indexableHost=req.headers.host===new URL(SITE_ORIGIN).host;
if(!indexableHost&&req.headers.host!=='www.gasparmultimarcas.com.br')res.setHeader('X-Robots-Tag','noindex, nofollow');
if(['GET','HEAD'].includes(method)){
 if(req.headers.host==='www.gasparmultimarcas.com.br'&&!path.startsWith('/api/')&&path!=='/whatsapp'){res.writeHead(301,{'Location':SITE_ORIGIN+path+url.search,'Cache-Control':'no-cache'});return res.end()}
 let normalized=path.replace(/\/+$/,'')||'/';
 if(normalized==='/index.html')normalized='/';else if(normalized==='/admin.html')normalized='/admin';else if(normalized.endsWith('.html')&&seoPages[normalized.slice(0,-5)])normalized=normalized.slice(0,-5);
 if(normalized!==path){res.writeHead(301,{'Location':normalized+url.search,'Cache-Control':'no-cache'});return res.end()}
 if(path==='/robots.txt'||path==='/sitemap.xml'){
  const data=path==='/robots.txt'?robotsTxt(indexableHost):sitemapXml(await store.listSitemapVehicles());
  res.writeHead(200,{'Content-Type':path==='/robots.txt'?'text/plain; charset=utf-8':'application/xml; charset=utf-8','Cache-Control':'no-cache'});return res.end(method==='HEAD'?undefined:data);
 }
}
if(path==='/whatsapp'&&['GET','HEAD'].includes(method)){
 const {event,destination}=parseLeadClick(url.searchParams);
 const preview=/prefetch|prerender/i.test(String(req.headers['sec-purpose']||req.headers.purpose||''));
 const bot=/bot|crawler|spider|facebookexternalhit|preview/i.test(String(req.headers['user-agent']||''));
 const nonNavigation=!!req.headers['sec-fetch-dest']&&req.headers['sec-fetch-dest']!=='document';
 const crossSite=req.headers['sec-fetch-site']==='cross-site';
 if(method==='GET'&&!preview&&!bot&&!nonNavigation&&!crossSite){
  try{if(event.vehicleId){const car=await store.getVehicle(event.vehicleId);if(car)event.vehicleLabel=`${car.brand} ${car.name} ${car.version} · ${car.year}`}await leads.record(event)}catch{console.error('Não foi possível registrar o clique do WhatsApp. O atendimento foi mantido.')}
 }
 res.writeHead(302,{'Location':destination,'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'});return res.end();
}
if(path.startsWith('/api/')){
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 if(!['GET','HEAD'].includes(method)){const origin=req.headers.origin;const allowed=process.env.APP_ORIGIN;if(origin){ensure(allowed?origin===allowed:new URL(origin).host===req.headers.host,'Origem não autorizada.')}if(req.headers['sec-fetch-site']==='cross-site')return json(res,403,{error:'Origem não autorizada.'})}
 if(path==='/api/vehicles'&&method==='GET')return json(res,200,await store.listVehicles());
 if(path==='/api/settings'&&method==='GET')return json(res,200,await store.getSettings());
 if(path==='/api/admin/login'&&method==='POST'){const key=req.socket.remoteAddress;const attempt=attempts.get(key);if(attempt&&attempt.until>Date.now()&&attempt.count>=8)return json(res,429,{error:'Muitas tentativas. Tente novamente em 15 minutos.'});const input=await payload(req);ensure(typeof input.password==='string'&&input.password.length<=300,'Senha inválida.');const candidate=scryptSync(input.password,salt,64);if(!timingSafeEqual(candidate,passwordHash)){const prev=attempt&&attempt.until>Date.now()?attempt:{count:0,until:Date.now()+900000};prev.count++;attempts.set(key,prev);return json(res,401,{error:'Senha incorreta.'})}attempts.delete(key);const token=randomBytes(32).toString('hex');await store.createSession(token,Date.now()+8*3600000);res.setHeader('Set-Cookie',`gaspar_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${production?'; Secure':''}`);return json(res,200,{ok:true})}
 const token=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('gaspar_admin='))?.split('=')[1];const expires=await store.getSession(token);if(!expires||expires<Date.now())return json(res,401,{error:'Faça login para continuar.'});
 if(path==='/api/admin/session'&&method==='GET')return json(res,200,{ok:true,storage:images.provider,bucketConfigured:images.cloudConfigured,database:store.kind});
 if(path==='/api/admin/leads'&&method==='GET')return json(res,200,await leads.report(leadRange(url.searchParams)));
 if(path==='/api/admin/imports'&&method==='GET')return json(res,200,await importer.latest());
 if(path==='/api/admin/imports'&&method==='POST'){const input=await payload(req,1500000);return json(res,201,await importer.preview(input.csv,input.filename))}
 const importRoute=path.match(/^\/api\/admin\/imports\/([a-f0-9-]{36})\/(start|step)$/);
 if(importRoute&&method==='POST'){const input=await payload(req,1500000);return json(res,200,importRoute[2]==='start'?await importer.review(importRoute[1],input.rows):await importer.step(importRoute[1]))}
 if(path==='/api/admin/logout'&&method==='POST'){await store.deleteSession(token);res.setHeader('Set-Cookie','gaspar_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,{ok:true})}
 if(path==='/api/admin/blob-upload'&&method==='POST')return json(res,200,await images.createUploadToken(req,await payload(req)));
 if(path==='/api/admin/blob-confirm'&&method==='POST'){const input=await payload(req);return json(res,200,await images.confirmImage(input.url))}
 if(path==='/api/admin/upload'&&method==='POST'){const data=await body(req,MAX_IMAGE_BYTES);const type=imageType(data);ensure(type,'Envie uma imagem JPG, PNG ou WebP.');return json(res,201,{url:await images.saveImage(data,type),storage:images.provider})}
 if(path==='/api/admin/settings'&&method==='PUT'){const input=await payload(req);ensure(typeof input.gtmId==='string'&&(!input.gtmId||/^GTM-[A-Z0-9]{4,20}$/.test(input.gtmId)),'ID do Google Tag Manager inválido. Exemplo: GTM-XXXXXXX');ensure(typeof input.metaPixelId==='string'&&(!input.metaPixelId||/^\d{5,25}$/.test(input.metaPixelId)),'ID do Meta Pixel inválido. Use apenas números.');const settings=await store.setSettings({gtmId:input.gtmId,metaPixelId:input.metaPixelId});return json(res,200,settings)}
 if(path==='/api/admin/vehicles'&&method==='POST'){const v=vehicle(await payload(req),randomUUID());await store.createVehicle(v);return json(res,201,v)}
 const match=path.match(/^\/api\/admin\/vehicles\/([\w-]+)$/);if(match){const existing=await store.getVehicle(match[1]);if(!existing)return json(res,404,{error:'Veículo não encontrado.'});if(method==='PUT'){const v=vehicle(await payload(req),match[1]);const updated=await store.updateVehicle(v);return updated?json(res,200,updated):json(res,404,{error:'Veículo não encontrado.'})}if(method==='DELETE'){const removed=await store.deleteVehicle(match[1]);return removed?json(res,200,{ok:true}):json(res,404,{error:'Veículo não encontrado.'})}}
 return json(res,404,{error:'Recurso não encontrado.'});
}
if(!['GET','HEAD'].includes(method))return json(res,405,{error:'Método não permitido.'});
const cleanPath=path.replace(/\/$/,'');
const vehicleRoute=cleanPath.match(/^\/veiculo\/([\w-]+)$/);
if(vehicleRoute||seoPages[path]||path==='/404.html'||path==='/veiculo.html'){
 const needsStock=path==='/'||path==='/estoque'||!!vehicleRoute;
 const cars=needsStock?await store.listVehicles():[];
 const selected=vehicleRoute?cars.find(car=>car.id===vehicleRoute[1]):null;
 const found=!vehicleRoute||!!selected;
 const notFound=!found||path==='/404.html'||path==='/veiculo.html';
 const template=notFound?'404.html':vehicleRoute?'veiculo.html':path==='/'?'index.html':cleanPath.slice(1)+'.html';
 const result=renderSeoPage(readFileSync(resolve(root,template),'utf8'),{path,params:url.searchParams,cars,car:selected,indexableHost,notFound});
 res.setHeader('X-Robots-Tag',result.robots);res.writeHead(notFound?404:200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});return res.end(method==='HEAD'?undefined:result.html);
}
if(path==='/admin')res.setHeader('X-Robots-Tag','noindex, nofollow');
let target;if(path.startsWith('/uploads/')){ensure(/^\/uploads\/[\w-]+\.(png|jpg|webp)$/.test(path),'Imagem inválida.');target=resolve(uploadDir,path.slice(9));}else{const file=resolve(root,'.'+decodeURIComponent(path));if(file!==root&&!file.startsWith(root+sep))return json(res,403,{error:'Acesso negado.'});target=file===root?resolve(root,'index.html'):path==='/admin'||path==='/admin/'?resolve(root,'admin.html'):file;}
const data=readFileSync(target);const mime=({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'})[extname(target)]||'application/octet-stream';res.writeHead(200,{'Content-Type':mime,'Cache-Control':target.includes(uploadDir)?'public, max-age=31536000, immutable':'no-cache'});res.end(method==='HEAD'?undefined:data);
}catch(e){if(e.code==='ENOENT'){if(!req.url.startsWith('/api/')&&!extname(new URL(req.url,'http://localhost').pathname)){const result=renderSeoPage(readFileSync(resolve(root,'404.html'),'utf8'),{path:new URL(req.url,'http://localhost').pathname,notFound:true,indexableHost:false});res.setHeader('X-Robots-Tag','noindex, follow');res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});return res.end(req.method==='HEAD'?undefined:result.html)}return json(res,404,{error:'Não encontrado.'})}if(e.status)return json(res,e.status,{error:e.message});console.error('Falha na solicitação:',e.name);json(res,500,{error:'Não foi possível concluir a solicitação.'})}}
if(!process.env.VERCEL){
 const server=createServer(handler);
server.requestTimeout=30000;
setInterval(()=>{store.pruneSessions().catch(()=>console.error('Não foi possível limpar sessões expiradas.')); for(const[k,v]of attempts)if(v.until<Date.now())attempts.delete(k)},60000).unref();
const port=Number(process.env.PORT)||4173;server.listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Banco: ${store.kind}\nLocal: http://127.0.0.1:${port}\nPainel: http://127.0.0.1:${port}/admin`));

}
