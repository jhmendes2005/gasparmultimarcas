import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {put,head} from '@vercel/blob';
import {handleUpload} from '@vercel/blob/client';

export const MAX_IMAGE_BYTES=8*1024*1024;
const types=['image/jpeg','image/png','image/webp'];
const blobPath=/^vehicles\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(jpg|png|webp)$/;
function ensure(value,message){if(!value)throw Object.assign(Error(message),{status:400})}
export function imageType(buf){if(buf.length>=8&&buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return ['png','image/png'];if(buf.length>=3&&buf[0]===255&&buf[1]===216&&buf[2]===255)return ['jpg','image/jpeg'];if(buf.length>=12&&buf.toString('ascii',0,4)==='RIFF'&&buf.toString('ascii',8,12)==='WEBP')return ['webp','image/webp'];return null}

export function createImageStorage({env=process.env,uploadDir}={}){
 const token=env.BLOB_READ_WRITE_TOKEN;
 const blobId=(env.BLOB_STORE_ID||'').replace(/^store_/,'')||token?.split('_')[3];
 const blobOrigin=token?(env.BLOB_PUBLIC_URL||`https://${String(blobId).toLowerCase()}.public.blob.vercel-storage.com`):null;
 const s3Configured=!!(env.S3_BUCKET&&env.S3_ACCESS_KEY_ID&&env.S3_SECRET_ACCESS_KEY&&env.S3_PUBLIC_URL);
 const provider=token?'Vercel Blob':s3Configured?'S3 compatível':'local';
 const cloudConfigured=provider!=='local';
 let bucket;
 function isBlobUrl(value){try{const url=new URL(value);return !!blobOrigin&&url.protocol==='https:'&&url.origin===new URL(blobOrigin).origin&&!url.search&&!url.hash&&blobPath.test(url.pathname.slice(1))}catch{return false}}
 function acceptsImageUrl(value){if(typeof value!=='string'||value.length>1500)return false;if(/^\/?(?:assets\/car-[\w.-]+|uploads\/[\w.-]+)$/.test(value))return true;if(isBlobUrl(value))return true;try{const url=new URL(value),base=new URL(env.S3_PUBLIC_URL);return url.protocol==='https:'&&url.origin===base.origin&&url.pathname.startsWith(base.pathname.replace(/\/$/,'')+'/')}catch{return false}}
 async function saveImage(data,type,{signal}={}){
  ensure(data.length<=MAX_IMAGE_BYTES&&imageType(data),'Envie uma imagem JPG, PNG ou WebP de até 8 MB.');
  const name=randomUUID()+'.'+type[0],pathname='vehicles/'+name;
  if(token){const blob=await put(pathname,data,{access:'public',token,contentType:type[1],addRandomSuffix:false,cacheControlMaxAge:31536000,abortSignal:signal});return blob.url}
  if(s3Configured){if(!bucket){const {S3Client,PutObjectCommand}=await import('@aws-sdk/client-s3');bucket={client:new S3Client({region:env.S3_REGION||'auto',endpoint:env.S3_ENDPOINT||undefined,forcePathStyle:env.S3_FORCE_PATH_STYLE==='true',credentials:{accessKeyId:env.S3_ACCESS_KEY_ID,secretAccessKey:env.S3_SECRET_ACCESS_KEY}}),PutObjectCommand}}await bucket.client.send(new bucket.PutObjectCommand({Bucket:env.S3_BUCKET,Key:pathname,Body:data,ContentType:type[1],CacheControl:'public, max-age=31536000, immutable'}));return env.S3_PUBLIC_URL.replace(/\/$/,'')+'/'+pathname}
  writeFileSync(resolve(uploadDir,name),data);return '/uploads/'+name;
 }
 async function createUploadToken(request,body){
  ensure(token,'Vercel Blob não configurado.');
  ensure(body?.type==='blob.generate-client-token'&&blobPath.test(body?.payload?.pathname||''),'Solicitação de upload inválida.');
  return handleUpload({request,body,token,onBeforeGenerateToken:async()=>({allowedContentTypes:types,maximumSizeInBytes:MAX_IMAGE_BYTES,addRandomSuffix:false,allowOverwrite:false,validUntil:Date.now()+5*60000})});
 }
 async function confirmImage(url){
  ensure(isBlobUrl(url),'A foto precisa pertencer ao armazenamento da loja.');
  const info=await head(url,{token});
  ensure(info.size>0&&info.size<=MAX_IMAGE_BYTES&&types.includes(info.contentType),'Formato ou tamanho de foto inválido.');
  const response=await fetch(url,{headers:{Range:'bytes=0-15'},redirect:'error',signal:AbortSignal.timeout(15000)});
  ensure(response.ok&&response.body,'Não foi possível verificar a imagem enviada.');
  const reader=response.body.getReader();const first=await reader.read();await reader.cancel();
  const detected=imageType(Buffer.from(first.value||[]));
  ensure(detected&&detected[1]===info.contentType,'O arquivo enviado não contém uma imagem válida.');
  return {url,storage:provider};
 }
 return {provider,cloudConfigured,acceptsImageUrl,saveImage,createUploadToken,confirmImage};
}
