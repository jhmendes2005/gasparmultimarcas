import {featureKey} from './vehicle-features.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export async function initFeatures(api){
 let groups=await api('admin/features'),selected=new Map();
 const list=document.querySelector('#feature-options'),search=document.querySelector('#feature-search');
 const count=document.querySelector('#feature-count'),error=document.querySelector('#feature-error');
 const custom=document.querySelector('#feature-custom'),add=document.querySelector('#feature-add');
 function render(){
  const term=featureKey(search.value),known=new Set(groups.flatMap(group=>group.items.map(featureKey)));
  const extras=[...selected.values()].filter(item=>!known.has(featureKey(item)));
  const display=extras.length?[...groups,{name:'Outros itens deste veículo',items:extras}]:groups;
  count.textContent=`${selected.size} selecionado${selected.size===1?'':'s'}`;
  list.innerHTML=display.map(group=>({...group,items:group.items.filter(item=>featureKey(item).includes(term))})).filter(group=>group.items.length).map((group,i)=>`<details class="feature-group" ${term||i===0?'open':''}><summary>${esc(group.name)} <span>${group.items.filter(item=>selected.has(featureKey(item))).length} / ${group.items.length}</span></summary><div>${group.items.map(item=>`<label class="feature-choice"><input type="checkbox" value="${esc(item)}" ${selected.has(featureKey(item))?'checked':''}><span>${esc(item)}</span></label>`).join('')}</div></details>`).join('')||'<p class="feature-empty">Nenhum opcional encontrado. Cadastre um item extra abaixo.</p>';
  document.querySelector('#feature-selected').innerHTML=[...selected.values()].map(item=>`<button type="button" data-feature-remove="${esc(featureKey(item))}" aria-label="Remover ${esc(item)}">${esc(item)} <span aria-hidden="true">×</span></button>`).join('');
 }
 search.addEventListener('input',render);
 list.addEventListener('change',event=>{
  const input=event.target.closest('input[type="checkbox"]');if(!input)return;
  if(input.checked&&selected.size>=250){input.checked=false;error.textContent='Limite de 250 opcionais por veículo.';return}
  input.checked?selected.set(featureKey(input.value),input.value):selected.delete(featureKey(input.value));
  // Keep the focused checkbox and open categories intact while selecting.
  count.textContent=`${selected.size} selecionado${selected.size===1?'':'s'}`;
  const details=input.closest('details');details.querySelector('summary span').textContent=`${details.querySelectorAll('input:checked').length} / ${details.querySelectorAll('input').length}`;
  document.querySelector('#feature-selected').innerHTML=[...selected.values()].map(item=>`<button type="button" data-feature-remove="${esc(featureKey(item))}" aria-label="Remover ${esc(item)}">${esc(item)} <span aria-hidden="true">×</span></button>`).join('');
 });
 document.querySelector('#feature-selected').addEventListener('click',event=>{const button=event.target.closest('[data-feature-remove]');if(button){selected.delete(button.dataset.featureRemove);render()}});
 add.addEventListener('click',async()=>{
  error.textContent='';if(!custom.value.trim()){error.textContent='Digite o nome do opcional extra.';custom.focus();return}
  add.disabled=true;
  try{
   const {label}=await api('admin/features',{method:'POST',body:JSON.stringify({label:custom.value})});
   groups=await api('admin/features');if(selected.size<250)selected.set(featureKey(label),label);
   custom.value='';search.value='';render();
   error.textContent='Opcional salvo na biblioteca da loja.';
  }catch(err){error.textContent=err.message}finally{add.disabled=false}
 });
 custom.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();add.click()}});
 render();
 return {
  set(values=[]){selected=new Map(values.map(item=>[featureKey(item),item]));search.value='';custom.value='';error.textContent='';render()},
  values(){return [...selected.values()]}
 };
}
