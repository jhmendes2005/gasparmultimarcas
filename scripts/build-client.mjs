import {build} from 'esbuild';
await build({entryPoints:['client/blob-upload.js'],outfile:'dist/blob-client.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'eof'});
console.log('Cliente de upload Blob compilado.');
