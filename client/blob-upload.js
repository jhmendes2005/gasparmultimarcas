import {upload} from '@vercel/blob/client';

export async function uploadPhoto(file){
 const extensions={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
 const extension=extensions[file.type];
 if(!extension||file.size>8*1024*1024)throw Error('Envie JPG, PNG ou WebP de até 8 MB.');
 return upload(`vehicles/${crypto.randomUUID()}.${extension}`,file,{
  access:'public',contentType:file.type,handleUploadUrl:'/api/admin/blob-upload',
  multipart:false,
 });
}
