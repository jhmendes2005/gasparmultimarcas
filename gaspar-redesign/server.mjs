import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,existsSync,renameSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {randomBytes,scryptSync,timingSafeEqual,randomUUID} from 'node:crypto';
const root=resolve('dist'),dataDir=resolve(process.env.DATA_DIR||'.data'),uploadDir=resolve(dataDir,'uploads');
mkdirSync(uploadDir,{recursive:true});
const dbFile=resolve(dataDir,'database.json');
const saveDb=()=>{writeFileSync(dbFile+'.tmp',JSON.stringify(db,null,2));renameSync(dbFile+'.tmp',dbFile)};
let db=existsSync(dbFile)?JSON.parse(readFileSync(dbFile,'utf8')):{vehicles:JSON.parse(readFileSync(resolve(root,'vehicles.json'),'utf8')),settings:{gtmId:'',metaPixelId:''}};
if(!existsSync(dbFile))saveDb();
let password=process.env.ADMIN_PASSWORD;
if(!password){if(process.env.NODE_ENV==='production')throw Error('Configure ADMIN_PASSWORD antes de iniciar em produção.');const pwFile=resolve(dataDir,'admin-password.txt');password=existsSync(pwFile)?readFileSync(pwFile,'utf8').trim():randomBytes(18).toString('base64url');if(!existsSync(pwFile))writeFileSync(pwFile,password,{mode:0o600});console.log('Senha administrativa local disponível em .data/admin-password.txt');}
if(password.length<12)throw Error('ADMIN_PASSWORD precisa de pelo menos 12 caracteres.');
const salt=randomBytes(16),passwordHash=scryptSync(password,salt,64);password=undefined;
const sessions=new Map(),attempts=new Map();const production=process.env.NODE_ENV==='production';
const bucketConfigured=!!(process.env.S3_BUCKET&&process.env.S3_ACCESS_KEY_ID&&process.env.S3_SECRET_ACCESS_KEY&&process.env.S3_PUBLIC_URL);
let bucket;
async function uploadToBucket(key,body,type){if(!bucket){const {S3Client,PutObjectCommand}=await import('@aws-sdk/client-s3');bucket={client:new S3Client({region:process.env.S3_REGION||'auto',endpoint:process.env.S3_ENDPOINT||undefined,forcePathStyle:process.env.S3_FORCE_PATH_STYLE==='true',credentials:{accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY}}),PutObjectCommand}}await bucket.client.send(new bucket.PutObjectCommand({Bucket:process.env.S3_BUCKET,Key:key,Body:body,ContentType:type,CacheControl:'public, max-age=31536000, immutable'}));return process.env.S3_PUBLIC_URL.replace(/\/$/,'')+'/'+key}
function json(res,status,body){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body))}
async function body(req,limit=100000){const parts=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>limit){const e=Error('Arquivo ou solicitação muito grande.');e.status=413;throw e}parts.push(chunk)}return Buffer.concat(parts)}
async function payload(req){try{return JSON.parse((await body(req)).toString())}catch(e){if(e.status)throw e;throw Object.assign(Error('JSON inválido.'),{status:400})}}
function ensure(condition,message){if(!condition)throw Object.assign(Error(message),{status:400})}
function imageUrl(v){if(typeof v!=='string'||v.length>1500)return false;if(/^\/?(?:assets\/car-[\w.-]+|uploads\/[\w.-]+)$/.test(v))return true;try{const u=new URL(v);const base=new URL(process.env.S3_PUBLIC_URL);return u.protocol==='https:'&&u.origin===base.origin&&u.pathname.startsWith(base.pathname.replace(/\/$/,'')+'/')}catch{return false}}
function vehicle(input,id){const v={id};for(const key of ['brand','name','version','transmission','fuel','category','badge','description']){ensure(typeof(input[key]??'')==='string','Campo de texto inválido.');v[key]=String(input[key]??'').trim();ensure(v[key].length<=(key==='description'?3000:120),'Texto longo demais.')}ensure(v.brand&&v.name&&v.version,'Informe marca, modelo e versão.');for(const key of ['price','year','km']){v[key]=Number(input[key]);ensure(Number.isFinite(v[key]),'Valor numérico inválido.')}ensure(v.price>0&&v.price<100000000,'Preço inválido.');ensure(Number.isInteger(v.year)&&v.year>=1900&&v.year<=new Date().getFullYear()+2,'Ano inválido.');ensure(Number.isInteger(v.km)&&v.km>=0&&v.km<=3000000,'Quilometragem inválida.');ensure(['Hatch','SUV','Sedã','Monovolume','Picape','Perua','Cupê','Outro'].includes(v.category),'Categoria inválida.');ensure(['Automático','Manual','Automatizado','CVT'].includes(v.transmission),'Câmbio inválido.');ensure(Array.isArray(input.images)&&input.images.length>0&&input.images.length<=20&&input.images.every(imageUrl),'Adicione de 1 a 20 fotos válidas.');v.images=input.images;return v}
function imageType(buf){if(buf.length>=8&&buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return ['png','image/png'];if(buf.length>=3&&buf[0]===255&&buf[1]===216&&buf[2]===255)return ['jpg','image/jpeg'];if(buf.length>=12&&buf.toString('ascii',0,4)==='RIFF'&&buf.toString('ascii',8,12)==='WEBP')return ['webp','image/webp'];return null}
const server=createServer(async(req,res)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','SAMEORIGIN');
try{const url=new URL(req.url,'http://localhost'),path=url.pathname;const method=req.method;
if(path.startsWith('/api/')){
 if(!['GET','HEAD'].includes(method)){const origin=req.headers.origin;const allowed=process.env.APP_ORIGIN;if(origin){ensure(allowed?origin===allowed:new URL(origin).host===req.headers.host,'Origem não autorizada.')}if(req.headers['sec-fetch-site']==='cross-site')return json(res,403,{error:'Origem não autorizada.'})}
 if(path==='/api/vehicles'&&method==='GET')return json(res,200,db.vehicles);
 if(path==='/api/settings'&&method==='GET')return json(res,200,db.settings);
 if(path==='/api/admin/login'&&method==='POST'){const key=req.socket.remoteAddress;const attempt=attempts.get(key);if(attempt&&attempt.until>Date.now()&&attempt.count>=8)return json(res,429,{error:'Muitas tentativas. Tente novamente em 15 minutos.'});const input=await payload(req);ensure(typeof input.password==='string'&&input.password.length<=300,'Senha inválida.');const candidate=scryptSync(input.password,salt,64);if(!timingSafeEqual(candidate,passwordHash)){const prev=attempt&&attempt.until>Date.now()?attempt:{count:0,until:Date.now()+900000};prev.count++;attempts.set(key,prev);return json(res,401,{error:'Senha incorreta.'})}attempts.delete(key);const token=randomBytes(32).toString('hex');sessions.set(token,Date.now()+8*3600000);res.setHeader('Set-Cookie',`gaspar_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${production?'; Secure':''}`);return json(res,200,{ok:true})}
 const token=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('gaspar_admin='))?.split('=')[1];const expires=sessions.get(token);if(!expires||expires<Date.now())return json(res,401,{error:'Faça login para continuar.'});
 if(path==='/api/admin/session'&&method==='GET')return json(res,200,{ok:true,storage:bucketConfigured?'S3/R2':'local',bucketConfigured});
 if(path==='/api/admin/logout'&&method==='POST'){sessions.delete(token);res.setHeader('Set-Cookie','gaspar_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,{ok:true})}
 if(path==='/api/admin/upload'&&method==='POST'){const data=await body(req,8*1024*1024);const type=imageType(data);ensure(type,'Envie uma imagem JPG, PNG ou WebP.');const name=randomUUID()+'.'+type[0];let image;if(bucketConfigured)image=await uploadToBucket('vehicles/'+name,data,type[1]);else{writeFileSync(resolve(uploadDir,name),data);image='/uploads/'+name}return json(res,201,{url:image,storage:bucketConfigured?'S3/R2':'local'})}
 if(path==='/api/admin/settings'&&method==='PUT'){const input=await payload(req);ensure(typeof input.gtmId==='string'&&(!input.gtmId||/^GTM-[A-Z0-9]{4,20}$/.test(input.gtmId)),'ID do Google Tag Manager inválido. Exemplo: GTM-XXXXXXX');ensure(typeof input.metaPixelId==='string'&&(!input.metaPixelId||/^\d{5,25}$/.test(input.metaPixelId)),'ID do Meta Pixel inválido. Use apenas números.');db.settings={gtmId:input.gtmId,metaPixelId:input.metaPixelId};saveDb();return json(res,200,db.settings)}
 if(path==='/api/admin/vehicles'&&method==='POST'){const v=vehicle(await payload(req),randomUUID());db.vehicles.unshift(v);saveDb();return json(res,201,v)}
 const match=path.match(/^\/api\/admin\/vehicles\/([\w-]+)$/);if(match){const index=db.vehicles.findIndex(c=>c.id===match[1]);if(index<0)return json(res,404,{error:'Veículo não encontrado.'});if(method==='PUT'){const v=vehicle(await payload(req),match[1]);db.vehicles[index]=v;saveDb();return json(res,200,v)}if(method==='DELETE'){db.vehicles.splice(index,1);saveDb();return json(res,200,{ok:true})}}
 return json(res,404,{error:'Recurso não encontrado.'});
}
if(!['GET','HEAD'].includes(method))return json(res,405,{error:'Método não permitido.'});
const publicPages=new Set(['estoque','sobre','contato','comparar','encontre-seu-carro','privacidade']);
const cleanPath=path.replace(/\/$/,'');
const vehicleRoute=cleanPath.match(/^\/veiculo\/([\w-]+)$/);
if(vehicleRoute||publicPages.has(cleanPath.slice(1))){
 const selected=vehicleRoute?db.vehicles.find(c=>c.id===vehicleRoute[1]):null;
 const found=!vehicleRoute||!!selected;
 const template=vehicleRoute?(found?'veiculo.html':'404.html'):cleanPath.slice(1)+'.html';
 let html=readFileSync(resolve(root,template),'utf8');
 if(selected){const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));html=html.replace(/<title>.*?<\/title>/,()=>`<title>${escape(selected.brand+' '+selected.name+' '+selected.year)} | Gaspar Multimarcas</title>`)}
 res.writeHead(found?200:404,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});return res.end(method==='HEAD'?undefined:html);
}
let target;if(path.startsWith('/uploads/')){ensure(/^\/uploads\/[\w-]+\.(png|jpg|webp)$/.test(path),'Imagem inválida.');target=resolve(uploadDir,path.slice(9));}else{const file=resolve(root,'.'+decodeURIComponent(path));if(file!==root&&!file.startsWith(root+sep))return json(res,403,{error:'Acesso negado.'});target=file===root?resolve(root,'index.html'):path==='/admin'||path==='/admin/'?resolve(root,'admin.html'):file;}
const data=readFileSync(target);const mime=({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'})[extname(target)]||'application/octet-stream';res.writeHead(200,{'Content-Type':mime,'Cache-Control':target.includes(uploadDir)?'public, max-age=31536000, immutable':'no-cache'});res.end(method==='HEAD'?undefined:data);
}catch(e){if(e.code==='ENOENT'){if(!req.url.startsWith('/api/')&&!extname(new URL(req.url,'http://localhost').pathname)){res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});return res.end(req.method==='HEAD'?undefined:readFileSync(resolve(root,'404.html')))}return json(res,404,{error:'Não encontrado.'})}if(e.status)return json(res,e.status,{error:e.message});console.error('Falha na solicitação:',e.name);json(res,500,{error:'Não foi possível concluir a solicitação.'})}});
server.requestTimeout=30000;
setInterval(()=>{for(const [k,v]of sessions)if(v<Date.now())sessions.delete(k);for(const[k,v]of attempts)if(v.until<Date.now())attempts.delete(k)},60000).unref();
const port=Number(process.env.PORT)||4173;server.listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}\nPainel: http://127.0.0.1:${port}/admin`));
