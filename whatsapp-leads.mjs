import {randomUUID} from 'node:crypto';
import {whatsappNumbers} from './dist/contact-routing.js';

export const leadPlacements=['cabecalho','rodape','flutuante','veiculo','contato','outro'];
const bad=message=>Object.assign(Error(message),{status:400});
const localDate=date=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
function validDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number(value.slice(0,4))===0)return false;const date=new Date(value+'T12:00:00Z');return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value}
export function leadRange(params,now=new Date()){
 const today=localDate(now);let from=params.get('from')||null,to=params.get('to')||null;
 if(!from&&!to){const period=params.get('period')||'30';if(!['1','7','30','all'].includes(period))throw bad('Período inválido.');if(period!=='all'){to=today;const start=new Date(today+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-Number(period)+1);from=start.toISOString().slice(0,10)}}
 if((from&&!validDate(from))||(to&&!validDate(to))||(from&&to&&from>to))throw bad('Informe um intervalo de datas válido.');
 return {from,to};
}
export function parseLeadClick(params){
 const number=params.get('number');if(!whatsappNumbers.includes(number))throw bad('Número de WhatsApp inválido.');
 const id=params.get('event')||randomUUID();if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id))throw bad('Identificador de clique inválido.');
 const placement=params.get('placement')||'outro';if(!leadPlacements.includes(placement))throw bad('Origem do clique inválida.');
 const page=params.get('page')||'/';if(!/^\/(?:estoque|sobre|contato|comparar|encontre-seu-carro|privacidade|veiculo\/[\w-]{1,100})?$/.test(page))throw bad('Página de origem inválida.');
 const vehicleId=params.get('vehicle')||null;if(vehicleId&&!/^[\w-]{1,100}$/.test(vehicleId))throw bad('Veículo inválido.');
 const text=params.get('text')||'';if(text.length>1800)throw bad('Mensagem longa demais.');
 const destination=new URL('https://wa.me/'+number);if(text)destination.searchParams.set('text',text);
 return {event:{id:id.toLowerCase(),number,placement,page,vehicleId,vehicleLabel:null,createdAt:new Date().toISOString()},destination:destination.href};
}
export function summarizeLeads(events,range){
 const selected=events.filter(e=>{const day=localDate(new Date(e.createdAt));return (!range.from||day>=range.from)&&(!range.to||day<=range.to)});
 const byNumber=whatsappNumbers.map(number=>({number,count:selected.filter(e=>e.number===number).length}));
 const vehicles=new Map(),placements=new Map();
 for(const e of selected){placements.set(e.placement,(placements.get(e.placement)||0)+1);if(e.vehicleId){const previous=vehicles.get(e.vehicleId);vehicles.set(e.vehicleId,{id:e.vehicleId,label:e.vehicleLabel||e.vehicleId,count:(previous?.count||0)+1})}}
 return {range,total:selected.length,byNumber,vehicleCount:vehicles.size,byVehicle:[...vehicles.values()].sort((a,b)=>b.count-a.count).slice(0,10),byPlacement:[...placements].map(([placement,count])=>({placement,count})).sort((a,b)=>b.count-a.count),recent:[...selected].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,50),trackingSince:events.length?events.reduce((a,e)=>e.createdAt<a?e.createdAt:a,events[0].createdAt):null};
}
export class LeadRepository{
 constructor(store){this.store=store}
 async record(event){
  if(this.store.pool){const result=await this.store.pool.query(`INSERT INTO ${this.store.table('whatsapp_clicks')} (id,number,placement,page,vehicle_id,vehicle_label,created_at) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO NOTHING`,[event.id,event.number,event.placement,event.page,event.vehicleId,event.vehicleLabel,event.createdAt]);return result.rowCount>0}
  this.store.data.whatsappClicks??={};if(this.store.data.whatsappClicks[event.id])return false;this.store.data.whatsappClicks[event.id]=event;this.store.save();return true;
 }
 async report(range){
  if(!this.store.pool)return summarizeLeads(Object.values(this.store.data.whatsappClicks||{}),range);
  const table=this.store.table('whatsapp_clicks'),where=`WHERE ($1::date IS NULL OR created_at >= ($1::date::timestamp AT TIME ZONE 'America/Sao_Paulo')) AND ($2::date IS NULL OR created_at < (($2::date+1)::timestamp AT TIME ZONE 'America/Sao_Paulo'))`,values=[range.from,range.to];
  // Uma única transação mantém totais e tabelas coerentes durante novos cliques.
  const client=await this.store.pool.connect();
  try{
   await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
   const counts=await client.query(`SELECT number,count(*)::int AS count FROM ${table} ${where} GROUP BY number`,values);
   const vehicles=await client.query(`SELECT vehicle_id AS id,(array_agg(vehicle_label ORDER BY created_at DESC))[1] AS label,count(*)::int AS count FROM ${table} ${where} AND vehicle_id IS NOT NULL GROUP BY vehicle_id ORDER BY count(*) DESC,vehicle_id LIMIT 10`,values);
   const distinct=await client.query(`SELECT count(DISTINCT vehicle_id)::int AS count FROM ${table} ${where}`,values);
   const placements=await client.query(`SELECT placement,count(*)::int AS count FROM ${table} ${where} GROUP BY placement ORDER BY count(*) DESC`,values);
   const recent=await client.query(`SELECT id,number,placement,page,vehicle_id AS "vehicleId",vehicle_label AS "vehicleLabel",created_at AS "createdAt" FROM ${table} ${where} ORDER BY created_at DESC,id LIMIT 50`,values);
   const since=await client.query(`SELECT created_at FROM ${table} ORDER BY created_at ASC LIMIT 1`);
   await client.query('COMMIT');
   const byNumber=whatsappNumbers.map(number=>({number,count:counts.rows.find(r=>r.number===number)?.count||0}));
   return {range,total:byNumber.reduce((n,r)=>n+r.count,0),byNumber,vehicleCount:distinct.rows[0].count,byVehicle:vehicles.rows,byPlacement:placements.rows,recent:recent.rows.map(r=>({...r,createdAt:r.createdAt.toISOString()})),trackingSince:since.rows[0]?.created_at.toISOString()||null};
  }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
 }
}
