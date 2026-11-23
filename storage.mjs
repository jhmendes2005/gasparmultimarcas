import {readFileSync,writeFileSync,existsSync,renameSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import pg from 'pg';
import {featureKey,normalizeFeatures} from './dist/vehicle-features.js';

const sessionHash=token=>createHash('sha256').update(token).digest('hex');
export function createPool(connectionString){
 const url=new URL(connectionString);
 // Verifica certificado e hostname, mantendo o tráfego do cliente criptografado.
 url.searchParams.set('sslmode','verify-full');
 const pool=new pg.Pool({connectionString:url.toString(),enableChannelBinding:true,max:5,connectionTimeoutMillis:15000,idleTimeoutMillis:10000});
 pool.on('error',()=>console.error('Conexão PostgreSQL interrompida. A próxima solicitação tentará reconectar.'));
 return pool;
}
function schemaName(value='gaspar_site'){
 if(!/^gaspar_site(?:_test_[a-z0-9]+)?$/.test(value))throw Error('Schema de banco inválido.');
 return value;
}
function cleanVehicle(car){const value={...car};delete value.source;return value}

export class PostgresStore {
 constructor(connectionString,schema='gaspar_site'){this.kind='PostgreSQL / Neon';this.schema=schemaName(schema);this.pool=createPool(connectionString)}
 table(name){return `"${this.schema}".${name}`}
 async migrate(seed){
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[this.schema+':migrate']);
   await client.query(`CREATE SCHEMA IF NOT EXISTS "${this.schema}"`);
   await client.query(`CREATE TABLE IF NOT EXISTS ${this.table('migrations')} (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
   await client.query(`CREATE TABLE IF NOT EXISTS ${this.table('vehicles')} (id text PRIMARY KEY, data jsonb NOT NULL CHECK(jsonb_typeof(data)='object'), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`);
   await client.query(`CREATE TABLE IF NOT EXISTS ${this.table('settings')} (id integer PRIMARY KEY CHECK(id=1), data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`);
   await client.query(`CREATE TABLE IF NOT EXISTS ${this.table('feature_catalog')} (key text PRIMARY KEY, label text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`);
   await client.query(`CREATE TABLE IF NOT EXISTS ${this.table('sessions')} (token_hash text PRIMARY KEY, expires_at timestamptz NOT NULL)`);
   await client.query(`CREATE INDEX IF NOT EXISTS sessions_expires_at ON ${this.table('sessions')} (expires_at)`);
   await client.query(`CREATE TABLE IF NOT EXISTS ${this.table('import_jobs')} (id text PRIMARY KEY, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`);
   await client.query(`CREATE TABLE IF NOT EXISTS ${this.table('import_links')} (source_key text PRIMARY KEY, vehicle_id text NOT NULL)`);
   await client.query(`CREATE TABLE IF NOT EXISTS ${this.table('import_images')} (source_hash text PRIMARY KEY, url text NOT NULL)`);
   await client.query(`CREATE TABLE IF NOT EXISTS ${this.table('whatsapp_clicks')} (id uuid PRIMARY KEY, number text NOT NULL CHECK(number IN ('5547996190693','5547988237774','554733180795')), placement text NOT NULL, page text NOT NULL, vehicle_id text, vehicle_label text, created_at timestamptz NOT NULL DEFAULT now())`);
   await client.query(`CREATE INDEX IF NOT EXISTS whatsapp_clicks_created_at ON ${this.table('whatsapp_clicks')} (created_at)`);
   const applied=await client.query(`SELECT id FROM ${this.table('migrations')} WHERE id=$1`,['001-initial-import']);
   if(!applied.rowCount){
    const count=await client.query(`SELECT count(*)::int AS count FROM ${this.table('vehicles')}`);
    if(count.rows[0].count===0)for(const car of seed.vehicles){const value=cleanVehicle(car);await client.query(`INSERT INTO ${this.table('vehicles')} (id,data) VALUES ($1,$2::jsonb) ON CONFLICT(id) DO NOTHING`,[value.id,JSON.stringify(value)])}
    await client.query(`INSERT INTO ${this.table('settings')} (id,data) VALUES (1,$1::jsonb) ON CONFLICT(id) DO NOTHING`,[JSON.stringify(seed.settings)]);
    await client.query(`INSERT INTO ${this.table('migrations')} (id) VALUES ($1)`,['001-initial-import']);
   }
   await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
 }
 async ready(){await this.pool.query(`SELECT id FROM ${this.table('migrations')} WHERE id='001-initial-import'`)}
 async listVehicles(){return (await this.pool.query(`SELECT data FROM ${this.table('vehicles')} ORDER BY created_at DESC,id`)).rows.map(row=>row.data)}
 async listSitemapVehicles(){return (await this.pool.query(`SELECT id,data->'images' AS images,updated_at AS "lastModified" FROM ${this.table('vehicles')} ORDER BY created_at DESC,id`)).rows}
 async getVehicle(id){return (await this.pool.query(`SELECT data FROM ${this.table('vehicles')} WHERE id=$1`,[id])).rows[0]?.data||null}
 async listCustomFeatures(){return (await this.pool.query(`SELECT label FROM ${this.table('feature_catalog')} ORDER BY label`)).rows.map(row=>row.label)}
 async addCustomFeature(label){const value=normalizeFeatures([label])[0];return (await this.pool.query(`INSERT INTO ${this.table('feature_catalog')} (key,label) VALUES ($1,$2) ON CONFLICT(key) DO UPDATE SET key=EXCLUDED.key RETURNING label`,[featureKey(value),value])).rows[0].label}
 async createVehicle(car){await this.pool.query(`INSERT INTO ${this.table('vehicles')} (id,data) VALUES ($1,$2::jsonb)`,[car.id,JSON.stringify(car)]);return car}
 async updateVehicle(car){const result=await this.pool.query(`UPDATE ${this.table('vehicles')} SET data=$2::jsonb,updated_at=now() WHERE id=$1`,[car.id,JSON.stringify(car)]);return result.rowCount?car:null}
 async deleteVehicle(id){return !!(await this.pool.query(`DELETE FROM ${this.table('vehicles')} WHERE id=$1`,[id])).rowCount}
 async getSettings(){return (await this.pool.query(`SELECT data FROM ${this.table('settings')} WHERE id=1`)).rows[0]?.data||{gtmId:'',metaPixelId:''}}
 async setSettings(settings){await this.pool.query(`INSERT INTO ${this.table('settings')} (id,data) VALUES(1,$1::jsonb) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data,updated_at=now()`,[JSON.stringify(settings)]);return settings}
 async createSession(token,expires){await this.pool.query(`INSERT INTO ${this.table('sessions')} (token_hash,expires_at) VALUES ($1,$2)`,[sessionHash(token),new Date(expires)])}
 async getSession(token){if(!token||!/^[a-f0-9]{64}$/.test(token))return null;const row=(await this.pool.query(`SELECT expires_at FROM ${this.table('sessions')} WHERE token_hash=$1 AND expires_at>now()`,[sessionHash(token)])).rows[0];return row?new Date(row.expires_at).getTime():null}
 async deleteSession(token){if(token)await this.pool.query(`DELETE FROM ${this.table('sessions')} WHERE token_hash=$1`,[sessionHash(token)])}
 async pruneSessions(){await this.pool.query(`DELETE FROM ${this.table('sessions')} WHERE expires_at<=now()`)}
 async close(){await this.pool.end()}
}

export class LocalStore {
 constructor(dataDir,seed){
  this.kind='Local';this.file=resolve(dataDir,'database.json');this.sessions=new Map();
  this.data=existsSync(this.file)?JSON.parse(readFileSync(this.file,'utf8')):seed;
  this.data.vehicles=this.data.vehicles.map(cleanVehicle);this.save();
 }
 save(){writeFileSync(this.file+'.tmp',JSON.stringify(this.data,null,2));renameSync(this.file+'.tmp',this.file)}
 async ready(){}
 async listVehicles(){return this.data.vehicles}
 async listSitemapVehicles(){return this.data.vehicles.map(({id,images})=>({id,images}))}
 async getVehicle(id){return this.data.vehicles.find(c=>c.id===id)||null}
 async listCustomFeatures(){return this.data.featureCatalog||[]}
 async addCustomFeature(label){const value=normalizeFeatures([label])[0];this.data.featureCatalog||=[];const existing=this.data.featureCatalog.find(item=>featureKey(item)===featureKey(value));if(existing)return existing;this.data.featureCatalog.push(value);this.save();return value}
 async createVehicle(car){this.data.vehicles.unshift(car);this.save();return car}
 async updateVehicle(car){const i=this.data.vehicles.findIndex(c=>c.id===car.id);if(i<0)return null;this.data.vehicles[i]=car;this.save();return car}
 async deleteVehicle(id){const i=this.data.vehicles.findIndex(c=>c.id===id);if(i<0)return false;this.data.vehicles.splice(i,1);this.save();return true}
 async getSettings(){return this.data.settings}
 async setSettings(settings){this.data.settings=settings;this.save();return settings}
 async createSession(token,expires){this.sessions.set(sessionHash(token),expires)}
 async getSession(token){return token?this.sessions.get(sessionHash(token)):null}
 async deleteSession(token){if(token)this.sessions.delete(sessionHash(token))}
 async pruneSessions(){for(const[k,v]of this.sessions)if(v<Date.now())this.sessions.delete(k)}
 async close(){}
}

export async function openStore({connectionString=process.env.DATABASE_URL,dataDir,seed,schema=process.env.DATABASE_SCHEMA}={}){
 const store=connectionString?new PostgresStore(connectionString,schema):new LocalStore(dataDir,seed);
 try{await store.ready();return store}catch(error){await store.close();throw error}
}
