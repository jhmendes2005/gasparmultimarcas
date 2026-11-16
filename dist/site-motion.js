// Animações progressivas: nenhum conteúdo depende delas para ficar visível.
export function initMotion(){
 const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
 const animations=new Set(),prepared=new WeakSet(),seenVehicles=new Set(),pending=new Set();
 const selector='.section-heading,.vehicle-card,.match-section,.home-story>h2,.benefits article,.store-photo,.store-copy,.contact-card,.visit-photo,.quiz-form,.vehicle-media,.detail-copy,.related-vehicles>h2,.footer-top>*,.footer-contact-card,.page-heading>*,.closing>*';
 const animate=(element,frames,options)=>{
  if(preference.matches||!element?.isConnected||typeof element.animate!=='function')return;
  const animation=element.animate(frames,options);animations.add(animation);
  const cleanup=()=>animations.delete(animation);
  animation.addEventListener('finish',cleanup,{once:true});animation.addEventListener('cancel',cleanup,{once:true});
  return animation;
 };
 const reveal=entries=>{
  for(const entry of entries){
   if(!entry.isIntersecting)continue;
   const el=entry.target;observer.unobserve(el);pending.delete(el);
   if(!el.isConnected)continue;
   const key=el.dataset.motionKey;if(key&&seenVehicles.has(key))continue;
   if(key)seenVehicles.add(key);
   // Conteúdo em foco deve permanecer imediatamente visível para o teclado.
   if(el.contains(document.activeElement))continue;
   const siblings=[...el.parentElement.children],index=Math.max(0,siblings.indexOf(el));
   animate(el,[{opacity:0,transform:'translateY(20px)'},{opacity:1,transform:'translateY(0)'}],{duration:560,delay:Math.min(index%3*65,130),easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'});
  }
 };
 const observer='IntersectionObserver' in window?new IntersectionObserver(reveal,{threshold:0.08}):null;
 function scan(root){
  if(!observer||preference.matches||!(root instanceof Element||root instanceof Document))return;
  const elements=[...(root instanceof Element&&root.matches(selector)?[root]:[]),...root.querySelectorAll(selector)];
  for(const el of elements){if(prepared.has(el))continue;prepared.add(el);if(!seenVehicles.has(el.dataset.motionKey)){pending.add(el);observer.observe(el)}}
 }
 scan(document);
 // Atualizações do estoque, filtros e perfil usam o mesmo observador.
 const mutation=new MutationObserver(records=>{
  for(const record of records){
   for(const node of record.removedNodes)if(node instanceof Element){observer?.unobserve(node);pending.delete(node);node.querySelectorAll(selector).forEach(el=>{observer?.unobserve(el);pending.delete(el)})}
   for(const node of record.addedNodes)scan(node);
  }
 });
 const main=document.querySelector('main');if(main)mutation.observe(main,{childList:true,subtree:true});
 preference.addEventListener('change',()=>{
  if(preference.matches){observer?.disconnect();for(const animation of animations)animation.cancel()}
  else{for(const el of pending)observer?.observe(el);scan(document)}
 });
 document.addEventListener('focusin',event=>{
  for(const animation of animations)if(animation.effect?.target?.contains(event.target))animation.cancel();
 });
 document.addEventListener('click',event=>{
  const save=event.target.closest('[data-save]');
  if(save){
   const id=save.dataset.save;
   queueMicrotask(()=>{
    const current=document.querySelector(`[data-save="${CSS.escape(id)}"]`);
    animate(current,[{scale:1},{scale:1.18,offset:0.45},{scale:1}],{duration:280,easing:'ease-out'});
   });
  }
 });
 // A sombra acompanha o estado sticky sem escutar cada evento de rolagem.
 const header=document.querySelector('body>header');
 let headerObserver;
 if(header&&'IntersectionObserver' in window){
  const sentinel=document.createElement('span');sentinel.className='header-sentinel';sentinel.setAttribute('aria-hidden','true');document.body.prepend(sentinel);
  headerObserver=new IntersectionObserver(([entry])=>header.classList.toggle('is-scrolled',!entry.isIntersecting));headerObserver.observe(sentinel);
 }
 window.addEventListener('pagehide',()=>{observer?.disconnect();headerObserver?.disconnect();mutation.disconnect();for(const animation of animations)animation.cancel()});
 window.addEventListener('pageshow',event=>{if(event.persisted){if(!preference.matches)for(const el of pending)observer?.observe(el);scan(document);if(main)mutation.observe(main,{childList:true,subtree:true});const sentinel=document.querySelector('.header-sentinel');if(sentinel)headerObserver?.observe(sentinel)}});
}
