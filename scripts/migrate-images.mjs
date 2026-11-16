import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,sep} from 'node:path';
import {openStore} from '../storage.mjs';
import {createImageStorage,imageType} from '../image-storage.mjs';
const dataDir=resolve(process.env.DATA_DIR||'.data');mkdirSync(dataDir,{recursive:true});
const images=createImageStorage({uploadDir:resolve(dataDir,'uploads')});
if(images.provider!=='Vercel Blob')throw Error('Configure BLOB_READ_WRITE_TOKEN antes da migração.');
const store=await openStore({dataDir,seed:{vehicles:[],settings:{gtmId:'',metaPixelId:''}}});
let uploaded=0,updated=0;
try{
 for(const car of await store.listVehicles()){
  const replacements=new Map();
  for(const url of car.images){
   if(images.acceptsImageUrl(url)&&url.startsWith('https:'))continue;
   let file;
   if(/^\/?assets\/car-[\w.-]+$/.test(url))file=resolve('dist','.'+('/'+url.replace(/^\//,'')));
   else if(/^\/uploads\/[\w.-]+$/.test(url))file=resolve(dataDir,'.'+url);
   else throw Error('Referência de foto não suportada.');
   const allowed=file.startsWith(resolve('dist','assets')+sep)||file.startsWith(resolve(dataDir,'uploads')+sep);
   if(!allowed)throw Error('Caminho de foto inválido.');
   const bytes=readFileSync(file),type=imageType(bytes);
   if(!type)throw Error('Formato de foto inválido.');
   replacements.set(url,await images.saveImage(bytes,type));uploaded++;
  }
  if(replacements.size){const current=await store.getVehicle(car.id);if(current){await store.updateVehicle({...current,images:current.images.map(url=>replacements.get(url)||url)});updated++}}
 }
 console.log(JSON.stringify({ok:true,storage:images.provider,uploaded,vehiclesUpdated:updated}));
}catch(error){console.error('Migração de fotos não concluída. Código:',error.code||error.name);process.exitCode=1}finally{await store.close()}
