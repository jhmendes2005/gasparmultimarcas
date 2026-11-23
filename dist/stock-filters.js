import {featureKey,groupVehicleFeatures} from './vehicle-features.js';
import {matchesVehicle} from './vehicle-search.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const selectedStockFeatures=params=>[...new Map(params.getAll('opcional').slice(0,250).filter(item=>item.trim()&&item.length<=100).map(item=>[featureKey(item),item])).values()];
export function renderStockCategories(cars,params){
 const categories=[...new Set(cars.map(car=>car.category))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
 return ['',...categories].map(category=>`<button class="${(params.get('categoria')||'')===category?'selected':''}" data-category="${esc(category)}" aria-pressed="${(params.get('categoria')||'')===category}">${esc(category||'Todos')}${!category?` <span>${cars.length}</span>`:''}</button>`).join('');
}
export function matchesStock(car,params,{ignoreFeatures=false}={}){
 const features=new Set((car.features||[]).map(featureKey));
 return (!params.get('marca')||car.brand===params.get('marca'))&&
  (!params.get('preco')||car.price<=Number(params.get('preco')))&&
  (!params.get('categoria')||car.category===params.get('categoria'))&&
  matchesVehicle(car,params.get('q')||'')&&
  (ignoreFeatures||selectedStockFeatures(params).every(item=>features.has(featureKey(item))));
}
export function stockFeatureFacets(cars,params){
 const selected=new Set(selectedStockFeatures(params).map(featureKey)),available=new Map();
 for(const car of cars){
  if(!matchesStock(car,params,{ignoreFeatures:true}))continue;
  const items=new Map((car.features||[]).map(label=>[featureKey(label),label]));
  for(const [key,label]of items){
   if(![...selected].every(other=>other===key||items.has(other)))continue;
   const current=available.get(key)||{label,count:0};current.count++;available.set(key,current);
  }
 }
 // A checked option remains removable when another filter produces zero matches.
 for(const car of cars)for(const label of car.features||[]){const key=featureKey(label);if(selected.has(key)&&!available.has(key))available.set(key,{label,count:0})}
 return [...available.values()].sort((a,b)=>a.label.localeCompare(b.label,'pt-BR'));
}
export function renderStockFeatures(cars,params){
 const facets=stockFeatureFacets(cars,params),selected=selectedStockFeatures(params),keys=new Set(selected.map(featureKey));
 if(!facets.length&&!selected.length)return '';
 const counts=new Map(facets.map(item=>[featureKey(item.label),item.count]));
 return `<details class="stock-feature-disclosure" ${selected.length?'open':''}><summary><span>Opcionais e equipamentos</span><span class="stock-feature-total">${selected.length?selected.length+' selecionado'+(selected.length===1?'':'s'):facets.length+' disponíveis'}</span></summary><div class="stock-feature-content"><div class="stock-feature-intro"><p>Encontre veículos com os equipamentos que você procura.</p><label class="stock-feature-search"><span class="sr-only">Buscar opcional disponível</span><input type="search" data-feature-search placeholder="Buscar opcional…" autocomplete="off"></label></div><div class="stock-feature-groups">${groupVehicleFeatures(facets.map(item=>item.label)).map(group=>`<fieldset class="stock-feature-group"><legend>${esc(group.name)}</legend><div>${group.items.map(label=>`<label class="stock-feature-choice" data-feature-option><input type="checkbox" name="opcional" form="search-form" value="${esc(label)}" ${keys.has(featureKey(label))?'checked':''}><span>${esc(label)}</span><small>${counts.get(featureKey(label))}</small></label>`).join('')}</div></fieldset>`).join('')}</div><p class="stock-feature-no-match" hidden>Nenhum opcional com esse nome nos filtros atuais.</p></div></details>${selected.length?`<div class="stock-feature-selected" aria-label="Filtros de opcionais ativos">${selected.map(label=>`<button type="button" data-remove-feature="${esc(featureKey(label))}" aria-label="Remover filtro ${esc(label)}">${esc(label)} <span aria-hidden="true">×</span></button>`).join('')}<button type="button" data-clear-features>Limpar opcionais</button></div>`:''}`;
}
export function setupStockFeatureControl(host,onChange){
 let params=new URLSearchParams();
 const change=values=>onChange(values);
 function search(){
  const term=featureKey(host.querySelector('[data-feature-search]')?.value||'');let visible=0;
  host.querySelectorAll('.stock-feature-group').forEach(group=>{
   let count=0;group.querySelectorAll('[data-feature-option]').forEach(label=>{label.hidden=!featureKey(label.querySelector('input').value).includes(term);if(!label.hidden)count++});
   group.hidden=count===0;visible+=count;
  });
  const message=host.querySelector('.stock-feature-no-match');if(message)message.hidden=visible>0;
 }
 host.addEventListener('input',event=>{if(event.target.matches('[data-feature-search]'))search()});
 host.addEventListener('keydown',event=>{if(event.target.matches('[data-feature-search]')&&event.key==='Enter')event.preventDefault()});
 host.addEventListener('change',event=>{
  if(!event.target.matches('input[name="opcional"]'))return;
  const selected=new Map(selectedStockFeatures(params).map(label=>[featureKey(label),label])),label=event.target.value;
  event.target.checked?selected.set(featureKey(label),label):selected.delete(featureKey(label));change([...selected.values()]);
 });
 host.addEventListener('click',event=>{
  const remove=event.target.closest('[data-remove-feature]');
  if(remove)change(selectedStockFeatures(params).filter(label=>featureKey(label)!==remove.dataset.removeFeature));
  if(event.target.closest('[data-clear-features]'))change([]);
 });
 return {update(cars,next){
  const old=host.querySelector('details'),open=old?.open,term=host.querySelector('[data-feature-search]')?.value||'',focused=host.contains(document.activeElement)?document.activeElement:null;
  const focusValue=focused?.matches('input[name="opcional"]')?focused.value:null;
  params=new URLSearchParams(next);host.innerHTML=renderStockFeatures(cars,params);
  const details=host.querySelector('details');if(details&&old)details.open=open;
  const input=host.querySelector('[data-feature-search]');if(input){input.value=term;search()}
  if(focusValue)[...host.querySelectorAll('input[name="opcional"]')].find(input=>input.value===focusValue)?.focus({preventScroll:true});
 }};
}
