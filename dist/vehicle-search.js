import {icon} from './ui-icons.js';
export function normalizeSearch(value){
 return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}

export function matchesVehicle(vehicle,query){
 const terms=normalizeSearch(query).split(' ').filter(Boolean);
 const text=normalizeSearch([vehicle.brand,vehicle.name,vehicle.version,vehicle.year,vehicle.category,vehicle.transmission,vehicle.fuel].join(' '));
 const compact=text.replace(/ /g,'');
 return terms.every(term=>text.includes(term)||compact.includes(term));
}

export function setupLiveSearch(vehicles){
 const form=document.querySelector('#live-search-form');
 if(!form)return;
 const input=form.querySelector('input'),panel=document.querySelector('#live-search-results');
 const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(value);
 const stockUrl=query=>{const params=location.pathname==='/estoque'?new URLSearchParams(location.search):new URLSearchParams();const value=query.trim().slice(0,120);if(value)params.set('q',value);else params.delete('q');return '/estoque'+(params.size?'?'+params.toString():'')};
 if(!input.value)input.value=new URLSearchParams(location.search).get('q')||'';
 function close(){panel.hidden=true;input.setAttribute('aria-expanded','false')}
 function suggest(){
  const query=input.value.trim();
  if(!query){close();return}
  const matches=vehicles.filter(car=>matchesVehicle(car,query));
  panel.innerHTML=`<div class="suggestion-heading"><span>${matches.length?'ENCONTRAMOS PARA VOCÊ':'VAMOS ENCONTRAR OUTRO CAMINHO'}</span><small>${matches.length} veículo${matches.length===1?'':'s'}</small></div>`+(matches.length?`<ul>${matches.slice(0,5).map(car=>`<li><a href="/veiculo/${encodeURIComponent(car.id)}"><img src="${escape(car.images[0].startsWith('assets/')?'/'+car.images[0]:car.images[0])}" alt="" width="80" height="56"><span><strong>${escape(car.brand+' '+car.name)}</strong><small>${car.year} · ${escape(car.version)}</small></span><b>${money(car.price)}</b><span aria-hidden="true">${icon('arrow-up-right')}</span></a></li>`).join('')}</ul>`:'<p class="suggestion-empty">Nenhum veículo com esse termo. Experimente a marca, o modelo ou o ano.</p>')+`<a class="suggestion-all" href="${escape(stockUrl(query))}">${matches.length?'Ver todos os resultados':'Buscar no estoque'} <span>Enter ↵</span></a>`;
  panel.hidden=false;input.setAttribute('aria-expanded','true');
 }
 input.addEventListener('input',suggest);
 input.addEventListener('focus',()=>{if(input.value.trim())suggest()});
 form.addEventListener('submit',event=>{event.preventDefault();location.href=stockUrl(input.value)});
 input.addEventListener('keydown',event=>{if(event.key==='Escape')close();if(event.key==='ArrowDown'&&!panel.hidden){event.preventDefault();panel.querySelector('a')?.focus()}});
 panel.addEventListener('keydown',event=>{if(event.key==='Escape'){close();input.focus();close()}});
 document.addEventListener('click',event=>{if(!form.contains(event.target))close()});
 form.addEventListener('focusout',event=>{if(!form.contains(event.relatedTarget))close()});
 if(document.activeElement===input&&input.value.trim())suggest();
}
