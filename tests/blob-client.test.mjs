import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {readFile} from 'node:fs/promises';
import {uploadPhoto} from '../client/blob-upload.js';
import {createImageStorage} from '../image-storage.mjs';

test('cliente aceita fotos e solicita autorização sem opções proibidas pelo SDK',async()=>{
 let request;
 const server=createServer(async(req,res)=>{
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  request={path:req.url,body:JSON.parse(Buffer.concat(chunks))};
  res.writeHead(403);res.end('{}');
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const previous=globalThis.location;
 globalThis.location={href:`http://127.0.0.1:${server.address().port}/admin`};
 try{
  const file=new File(['photo'],'photo.jpg',{type:'image/jpeg'});
  await assert.rejects(uploadPhoto(file),/retrieve the client token/);
  assert.equal(request.path,'/api/admin/blob-upload');
  assert.equal(request.body.type,'blob.generate-client-token');
  assert.match(request.body.payload.pathname,/^vehicles\/[a-f0-9-]+\.jpg$/);
  await assert.rejects(uploadPhoto(new File(['bad'],'bad.svg',{type:'image/svg+xml'})),/JPG, PNG ou WebP/);
 }finally{globalThis.location=previous;await new Promise(resolve=>server.close(resolve))}
});

test('Blob real: fluxo do cliente, autorização e confirmação da foto',{skip:process.env.RUN_BLOB_TESTS!=='1'},async()=>{
 const storage=createImageStorage({env:process.env});
 const {del}=await import('@vercel/blob');
 const server=createServer(async(req,res)=>{
  try{
   const chunks=[];for await(const chunk of req)chunks.push(chunk);
   const result=await storage.createUploadToken(req,JSON.parse(Buffer.concat(chunks)));
   res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(result));
  }catch{res.writeHead(500);res.end('{}')}
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const previous=globalThis.location;let url;
 globalThis.location={href:`http://127.0.0.1:${server.address().port}/admin`};
 try{
  const photo=new File([await readFile('dist/assets/car-1-0.png')],'vehicle.png',{type:'image/png'});
  const blob=await uploadPhoto(photo);url=blob.url;
  assert.equal((await storage.confirmImage(url)).url,url);
 }finally{
  globalThis.location=previous;
  await new Promise(resolve=>server.close(resolve));
  if(url)await del(url,{token:process.env.BLOB_READ_WRITE_TOKEN});
 }
});
