import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createImageStorage,imageType} from '../image-storage.mjs';

test('valida domínio e caminho das fotos do Blob',async()=>{
 const storage=createImageStorage({env:{BLOB_READ_WRITE_TOKEN:['vercel','blob','rw','unittest','test-only'].join('_'),BLOB_PUBLIC_URL:'https://unittest.public.blob.vercel-storage.com'}});
 const path='/vehicles/12345678-abcd-abcd-abcd-123456789abc.png';
 assert.equal(storage.provider,'Vercel Blob');
 assert.equal(storage.acceptsImageUrl('https://unittest.public.blob.vercel-storage.com'+path),true);
 assert.equal(storage.acceptsImageUrl('https://outro.public.blob.vercel-storage.com'+path),false);
 assert.equal(storage.acceptsImageUrl('https://unittest.public.blob.vercel-storage.com.evil.example'+path),false);
 assert.equal(storage.acceptsImageUrl('https://unittest.public.blob.vercel-storage.com/private.html'),false);
 assert.equal(storage.acceptsImageUrl('javascript:alert(1)'),false);
 await assert.rejects(storage.confirmImage('https://evil.example/file.png'),/armazenamento da loja/);
 await assert.rejects(storage.createUploadToken({}, {type:'blob.generate-client-token',payload:{pathname:'anything.html'}}),/inválida/);
});

test('modo local mantém validação do conteúdo enviado',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'gaspar-image-'));
 try{
  const storage=createImageStorage({env:{},uploadDir:dir});
  const data=await readFile('dist/assets/car-1-0.png');
  const url=await storage.saveImage(data,imageType(data));
  assert.equal(storage.provider,'local');
  assert.deepEqual(await readFile(join(dir,url.split('/').pop())),data);
  await assert.rejects(storage.saveImage(Buffer.from('<svg onload="alert(1)"></svg>'),['png','image/png']),/JPG, PNG ou WebP/);
 }finally{if(dir.startsWith(join(tmpdir(),'gaspar-image-')))await rm(dir,{recursive:true,force:true})}
});

test('Blob real: envio, leitura pública e confirmação da imagem',{skip:process.env.RUN_BLOB_TESTS!=='1'},async()=>{
 const {del}=await import('@vercel/blob');
 const storage=createImageStorage({env:process.env});
 assert.equal(storage.provider,'Vercel Blob');
 let url;
 try{
  const data=await readFile('dist/assets/car-1-0.png');
  url=await storage.saveImage(data,imageType(data));
  assert.equal(storage.acceptsImageUrl(url),true);
  assert.equal((await storage.confirmImage(url)).storage,'Vercel Blob');
  const response=await fetch(url);assert.equal(response.status,200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()),data);
 }finally{if(url)await del(url,{token:process.env.BLOB_READ_WRITE_TOKEN})}
});
