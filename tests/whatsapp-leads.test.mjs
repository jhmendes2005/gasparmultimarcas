import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {LeadRepository,parseLeadClick,leadRange,summarizeLeads} from '../whatsapp-leads.mjs';
import {LocalStore,PostgresStore} from '../storage.mjs';
import {buildWhatsAppRedirect} from '../dist/whatsapp-clicks.js';
import {whatsappNumbers} from '../dist/contact-routing.js';

test('sorteio registra exatamente o destinatário escolhido e preserva a mensagem',()=>{
 const message='Olá! Interesse no Polo 1.0, R$ 99.900.';
 for(let i=0;i<3;i++){
  const redirect=buildWhatsAppRedirect({href:'https://wa.me/'+whatsappNumbers[0]+'?text='+encodeURIComponent(message),randomize:true,placement:'veiculo',page:'/veiculo/polo',vehicleId:'polo'},()=> (i+0.5)/3);
  const {event,destination}=parseLeadClick(new URL(redirect,'https://gasparmultimarcas.com.br').searchParams);
  assert.equal(event.number,whatsappNumbers[i]);assert.equal(event.vehicleId,'polo');assert.equal(event.page,'/veiculo/polo');assert.equal(event.placement,'veiculo');assert.equal(new URL(destination).pathname,'/'+whatsappNumbers[i]);assert.equal(new URL(destination).searchParams.get('text'),message);assert.ok(!JSON.stringify(event).includes(message));
 }
 for(const number of whatsappNumbers){const redirect=buildWhatsAppRedirect({href:'/whatsapp?number='+number,placement:'rodape'});assert.equal(parseLeadClick(new URL(redirect,'https://gasparmultimarcas.com.br').searchParams).event.number,number)}
 assert.equal(buildWhatsAppRedirect({href:'https://evil.example/whatsapp?number='+whatsappNumbers[0]}),null);
 assert.equal(buildWhatsAppRedirect({href:'https://wa.me/5511999999999'}),null);
 const a=buildWhatsAppRedirect({href:'https://wa.me/'+whatsappNumbers[0]}),b=buildWhatsAppRedirect({href:a});assert.notEqual(new URL(a,'https://gasparmultimarcas.com.br').searchParams.get('event'),new URL(b,'https://gasparmultimarcas.com.br').searchParams.get('event'),'cada novo clique tem seu próprio identificador');
});
test('rejeita destinos e campos inválidos; datas respeitam Brasília',()=>{
 for(const extra of [{number:'5511999999999'},{event:'<script>'},{placement:'invalido'},{page:'https://evil.example'},{vehicle:'../secrets'},{text:'a'.repeat(1801)}])assert.throws(()=>parseLeadClick(new URLSearchParams({number:whatsappNumbers[0],...extra})),e=>e.status===400);
 const now=new Date('2026-11-16T02:30:00Z');assert.deepEqual(leadRange(new URLSearchParams({period:'1'}),now),{from:'2026-11-15',to:'2026-11-15'});assert.deepEqual(leadRange(new URLSearchParams({period:'7'}),now),{from:'2026-11-09',to:'2026-11-15'});
 assert.throws(()=>leadRange(new URLSearchParams({from:'2026-02-30'})));assert.throws(()=>leadRange(new URLSearchParams({from:'2026-11-17',to:'2026-11-16'})));assert.throws(()=>leadRange(new URLSearchParams({period:'8000'})));
});
async function verifyRepository(first,second=first){
 const repo=new LeadRepository(first),other=new LeadRepository(second),range={from:null,to:null};assert.equal((await repo.report(range)).total,0);
 const event={id:randomUUID(),number:whatsappNumbers[0],placement:'veiculo',page:'/veiculo/polo',vehicleId:'polo',vehicleLabel:'Volkswagen Polo Comfortline · 2025',createdAt:'2026-11-16T02:59:59.999Z'};
 const inserted=await Promise.all([repo.record(event),other.record(event)]);assert.equal(inserted.filter(Boolean).length,1);
 await other.record({...event,id:randomUUID(),number:whatsappNumbers[1],createdAt:'2026-11-16T03:00:00.000Z'});
 await repo.record({...event,id:randomUUID(),number:whatsappNumbers[2],placement:'rodape',page:'/',vehicleId:null,vehicleLabel:null,createdAt:'2026-11-17T02:59:59.999Z'});
 await repo.record({...event,id:randomUUID(),number:whatsappNumbers[0],createdAt:'2026-11-17T03:00:00.000Z'});
 const all=await other.report(range);assert.equal(all.total,4);assert.deepEqual(all.byNumber.map(r=>r.count),[2,1,1]);assert.equal(all.byVehicle[0].count,3);assert.equal(all.vehicleCount,1);assert.equal(all.trackingSince,event.createdAt);
 const day=await repo.report({from:'2026-11-16',to:'2026-11-16'});assert.equal(day.total,2);assert.deepEqual(day.byNumber.map(r=>r.count),[0,1,1]);assert.equal(day.byVehicle[0].label,event.vehicleLabel);assert.equal(day.recent.length,2);
 assert.equal((await other.report({from:'2026-11-18',to:null})).total,0);
}
test('contadores persistem, deduplicam retries e filtram o dia local',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'gaspar-leads-'));
 try{const store=new LocalStore(dir,{vehicles:[],settings:{}});await verifyRepository(store);const reopened=new LocalStore(dir,{vehicles:[],settings:{}});assert.equal((await new LeadRepository(reopened).report({from:null,to:null})).total,4)}finally{if(dir.startsWith(join(tmpdir(),'gaspar-leads-')))await rm(dir,{recursive:true,force:true})}
 const sample=Array.from({length:60},(_,i)=>({id:randomUUID(),number:whatsappNumbers[0],placement:'cabecalho',page:'/',vehicleId:null,createdAt:new Date(Date.UTC(2026,10,16,12,i)).toISOString()}));const summary=summarizeLeads(sample,{from:null,to:null});assert.equal(summary.total,60);assert.equal(summary.recent.length,50);
});
test('Neon: cliques atômicos entre instâncias e relatório por número',{skip:process.env.RUN_NEON_TESTS!=='1'},async()=>{
 const schema='gaspar_site_test_'+randomBytes(8).toString('hex'),first=new PostgresStore(process.env.DATABASE_URL,schema),second=new PostgresStore(process.env.DATABASE_URL,schema);
 try{await first.migrate({vehicles:[],settings:{}});await verifyRepository(first,second)}finally{await second.close();if(/^gaspar_site_test_[a-f0-9]{16}$/.test(schema))await first.pool.query(`DROP SCHEMA "${schema}" CASCADE`);await first.close()}
});
