import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {PostgresStore} from '../storage.mjs';
if(!process.env.DATABASE_URL)throw Error('Configure DATABASE_URL no .env.');
const file=resolve(process.env.DATA_DIR||'.data','database.json');
const seed=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{vehicles:JSON.parse(readFileSync('dist/vehicles.json','utf8')),settings:{gtmId:'',metaPixelId:''}};
const store=new PostgresStore(process.env.DATABASE_URL,process.env.DATABASE_SCHEMA);
try{
 await store.migrate(seed);
 const count=(await store.listVehicles()).length;
 const client=await store.pool.connect();const encrypted=client.connection.stream.encrypted===true;client.release();
 console.log(JSON.stringify({ok:true,database:'PostgreSQL / Neon',schema:store.schema,vehicles:count,tls:encrypted}));
}catch(error){console.error('Migração não concluída. Código:',error.code||error.name);process.exitCode=1}finally{await store.close()}
