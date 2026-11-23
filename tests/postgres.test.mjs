import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {PostgresStore} from '../storage.mjs';

test('Neon: migração, CRUD e sessões compartilhadas entre instâncias', {skip:process.env.RUN_NEON_TESTS!=='1'},async()=>{
 assert.ok(process.env.DATABASE_URL,'Defina DATABASE_URL para o teste de integração.');
 const schema='gaspar_site_test_'+randomBytes(8).toString('hex');
 const first=new PostgresStore(process.env.DATABASE_URL,schema);
 const second=new PostgresStore(process.env.DATABASE_URL,schema);
 const seed={vehicles:[{id:'test-car',brand:'Teste',name:'Temporário',price:50000,images:['/assets/car-1-0.png']}],settings:{gtmId:'',metaPixelId:''}};
 try{
  await first.migrate(seed);await first.ready();await first.addCustomFeature('Equipamento exclusivo');await second.addCustomFeature('equipamento exclusivo');assert.deepEqual(await first.listCustomFeatures(),['Equipamento exclusivo']);
  assert.equal((await second.listVehicles()).length,1);
  const sitemap=await second.listSitemapVehicles();assert.equal(sitemap[0].id,'test-car');assert.ok(sitemap[0].lastModified instanceof Date);assert.deepEqual(sitemap[0].images,['/assets/car-1-0.png']);
  const car=await first.getVehicle('test-car');
  await first.updateVehicle({...car,price:60000,features:['Equipamento exclusivo','Teto solar']});
  assert.deepEqual((await second.getVehicle('test-car')).features,['Equipamento exclusivo','Teto solar']);
  assert.equal((await second.getVehicle('test-car')).price,60000);
  await first.createVehicle({...car,id:'second-test'});
  assert.ok(await second.getVehicle('second-test'));
  await second.setSettings({gtmId:'GTM-TEST123',metaPixelId:''});
  assert.equal((await first.getSettings()).gtmId,'GTM-TEST123');
  const token=randomBytes(32).toString('hex');
  await first.createSession(token,Date.now()+60000);
  assert.ok((await second.getSession(token))>Date.now());
  const hashes=await first.pool.query(`SELECT token_hash FROM "${schema}".sessions`);
  assert.notEqual(hashes.rows[0].token_hash,token);
  await second.deleteSession(token);assert.equal(await first.getSession(token),null);
  await first.createSession(token,Date.now()-60000);assert.equal(await second.getSession(token),null);
  await first.pruneSessions();
  assert.equal((await first.pool.query(`SELECT count(*)::int AS count FROM "${schema}".sessions`)).rows[0].count,0);
  assert.equal(await first.deleteVehicle('test-car'),true);
  assert.equal(await first.deleteVehicle('second-test'),true);
  await first.migrate(seed);
  assert.equal((await second.listVehicles()).length,0,'A migração não pode recriar veículos removidos.');
  assert.equal((await second.listSitemapVehicles()).length,0);
  assert.equal((await second.getSettings()).gtmId,'GTM-TEST123');
  const client=await first.pool.connect();assert.equal(client.connection.stream.encrypted,true);client.release();
 }finally{
  await second.close();
  // O nome gerado e validado pertence exclusivamente a esta execução de teste.
  if(/^gaspar_site_test_[a-f0-9]{16}$/.test(schema))await first.pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await first.close();
 }
});
