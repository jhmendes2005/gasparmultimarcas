export function vehicleShareData(vehicle){
 return {title:`${vehicle.brand} ${vehicle.name} ${vehicle.version} · ${vehicle.year}`,text:`Veja este ${vehicle.brand} ${vehicle.name} na Gaspar Multimarcas.`,url:'https://gasparmultimarcas.com.br/veiculo/'+encodeURIComponent(vehicle.id)};
}
export async function shareVehicle(vehicle,{navigator,notify=()=>{},fallback=()=>{}}){
 const data=vehicleShareData(vehicle);
 if(typeof navigator.share==='function'){
  try{await navigator.share(data);return 'shared'}catch(error){if(error.name==='AbortError')return 'cancelled'}
 }
 try{
  if(!navigator.clipboard?.writeText)throw Error('Clipboard indisponível');
  await navigator.clipboard.writeText(data.url);notify('Link do veículo copiado!');return 'copied';
 }catch{fallback(data.url);notify('Selecione e copie o link do veículo.');return 'manual'}
}

export function setupVehicleGallery(container,vehicle,notify=()=>{}){
 const root=container.querySelector('[data-vehicle-gallery]');if(!root)return null;
 const doc=container.ownerDocument,win=doc.defaultView,life=new win.AbortController();
 const on=(target,event,handler,options={})=>target.addEventListener(event,handler,{...options,signal:life.signal});
 const dialog=root.querySelector('dialog'),stage=root.querySelector('.lightbox-stage'),large=stage.querySelector('img'),main=root.querySelector('#detail-image');
 const thumbs=[...root.querySelectorAll('[data-photo-index]')],openButton=root.querySelector('[data-gallery-open]');
 let index=0,scale=1,x=0,y=0,previousFocus,overflow,locked=false,sharing=false,inlineStart,suppressOpenUntil=0,pinch,swipe;
 const points=new Map();
 const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
 function bounds(){
  const {width,height}=stage.getBoundingClientRect(),nw=large.naturalWidth||width,nh=large.naturalHeight||height;
  const fit=nw&&nh?Math.min(width/nw,height/nh):1;
  return {maxX:Math.max(0,(nw*fit*scale-width)/2),maxY:Math.max(0,(nh*fit*scale-height)/2)};
 }
 function paint(){
  const {maxX,maxY}=bounds();x=clamp(x,-maxX,maxX);y=clamp(y,-maxY,maxY);
  large.style.transform=`translate(${x}px, ${y}px) scale(${scale})`;
  stage.classList.toggle('is-zoomed',scale>1);
  root.querySelector('[data-zoom-reset]').textContent=Math.round(scale*100)+'%';
  root.querySelector('[data-zoom-out]').disabled=scale<=1;
  root.querySelector('[data-zoom-in]').disabled=scale>=4;
 }
 function resetZoom(){scale=1;x=0;y=0;points.clear();pinch=null;swipe=null;paint()}
 function zoom(value,clientX,clientY){
  const next=clamp(value,1,4),rect=stage.getBoundingClientRect();
  const px=clientX===undefined?0:clientX-rect.left-rect.width/2,py=clientY===undefined?0:clientY-rect.top-rect.height/2;
  x=px-(px-x)*(next/scale);y=py-(py-y)*(next/scale);scale=next;paint();
 }
 function go(value){
  index=(value%thumbs.length+thumbs.length)%thumbs.length;resetZoom();
  const thumb=thumbs[index],alt=thumb.dataset.imageAlt,count=`${index+1} / ${thumbs.length}`;
  main.src=thumb.dataset.gallery;main.alt=alt;
  if(dialog.open){large.src=main.src;large.alt=alt}
  root.querySelector('#photo-count').textContent=count;root.querySelector('[data-lightbox-count]').textContent=count;
  openButton.setAttribute('aria-label',`Ampliar foto ${index+1} de ${thumbs.length}`);
  thumbs.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
  const strip=root.querySelector('.gallery');
  strip.scrollTo?.({left:thumb.offsetLeft-strip.offsetLeft-strip.clientWidth/2+thumb.clientWidth/2,behavior:win.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 }
 function restore(){
  if(!locked)return;locked=false;doc.body.style.overflow=overflow;resetZoom();previousFocus?.focus?.({preventScroll:true});
 }
 function open(){
  if(dialog.open)return;
  previousFocus=doc.activeElement;overflow=doc.body.style.overflow;locked=true;doc.body.style.overflow='hidden';
  large.src=main.src;large.alt=main.alt;
  if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
  resetZoom();dialog.querySelector('[data-gallery-close]').focus({preventScroll:true});
 }
 function close(){
  if(dialog.open){if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open')}
  restore();
 }
 function manualLink(url){
  const parent=dialog.open?dialog:container.querySelector('.detail-copy');
  let panel=parent.querySelector('.share-link-fallback');
  if(!panel){panel=doc.createElement('div');panel.className='share-link-fallback';const label=doc.createElement('label');label.textContent='Copie o link deste veículo';const input=doc.createElement('input');input.type='url';input.readOnly=true;label.append(input);panel.append(label);parent.append(panel)}
  const input=panel.querySelector('input');input.value=url;input.focus();input.select();
 }
 on(container,'click',async event=>{
  const target=event.target.closest('button');if(!target)return;
  if(target.matches('[data-gallery-open]')){if(Date.now()>=suppressOpenUntil)open()}
  else if(target.matches('[data-gallery-close]'))close();
  else if(target.matches('[data-gallery-step]'))go(index+Number(target.dataset.galleryStep));
  else if(target.matches('[data-photo-index]'))go(Number(target.dataset.photoIndex));
  else if(target.matches('[data-zoom-in]'))zoom(scale+.5);
  else if(target.matches('[data-zoom-out]'))zoom(scale-.5);
  else if(target.matches('[data-zoom-reset]'))resetZoom();
  else if(target.matches('[data-share-vehicle]')&&!sharing){
   sharing=true;container.querySelectorAll('[data-share-vehicle]').forEach(button=>button.disabled=true);
   try{await shareVehicle(vehicle,{navigator:win.navigator,notify:message=>{notify(message);if(dialog.open)dialog.querySelector('.lightbox-help').textContent=message},fallback:manualLink})}
   finally{sharing=false;container.querySelectorAll('[data-share-vehicle]').forEach(button=>button.disabled=false)}
  }
 });
 on(root,'keydown',event=>{
  if(event.target.matches('input'))return;
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();go(index+(event.key==='ArrowRight'?1:-1))}
  if(!dialog.open)return;
  if(event.key==='Escape'){event.preventDefault();close()}
  if(['+','=','-','0'].includes(event.key)){event.preventDefault();event.key==='0'?resetZoom():zoom(scale+(event.key==='-'?-.5:.5))}
 });
 on(dialog,'close',restore);
 on(large,'load',paint);on(win,'resize',paint);
 on(stage,'wheel',event=>{if(!dialog.open)return;event.preventDefault();zoom(scale*Math.exp(-event.deltaY*.0015),event.clientX,event.clientY)},{passive:false});
 on(stage,'dblclick',event=>{if(!event.target.closest('button'))zoom(scale>1?1:2,event.clientX,event.clientY)});
 on(stage,'pointerdown',event=>{
  if(event.target.closest('button')||event.button>0)return;
  stage.setPointerCapture?.(event.pointerId);points.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(points.size===1)swipe={x:event.clientX,y:event.clientY};
  if(points.size===2){const [a,b]=[...points.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y)||1,scale,x,y,cx:(a.x+b.x)/2,cy:(a.y+b.y)/2};swipe=null}
 });
 on(stage,'pointermove',event=>{
  const previous=points.get(event.pointerId);if(!previous)return;
  points.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(points.size===2&&pinch){
   const [a,b]=[...points.values()],rect=stage.getBoundingClientRect(),next=clamp(pinch.scale*Math.hypot(a.x-b.x,a.y-b.y)/pinch.distance,1,4);
   x=(a.x+b.x)/2-rect.left-rect.width/2-(pinch.cx-rect.left-rect.width/2-pinch.x)*(next/pinch.scale);
   y=(a.y+b.y)/2-rect.top-rect.height/2-(pinch.cy-rect.top-rect.height/2-pinch.y)*(next/pinch.scale);scale=next;paint();
  }else if(scale>1){x+=event.clientX-previous.x;y+=event.clientY-previous.y;paint()}
 });
 const release=event=>{
  if(!points.has(event.pointerId))return;
  const start=swipe;points.delete(event.pointerId);pinch=null;swipe=null;
  if(event.type!=='pointercancel'&&scale===1&&start){const dx=event.clientX-start.x,dy=event.clientY-start.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy))go(index+(dx<0?1:-1))}
 };
 on(stage,'pointerup',release);on(stage,'pointercancel',release);
 on(openButton,'pointerdown',event=>{inlineStart=event.isPrimary===false?null:{id:event.pointerId,x:event.clientX,y:event.clientY}});
 on(openButton,'pointercancel',()=>{inlineStart=null});
 on(openButton,'pointerup',event=>{
  if(!inlineStart||inlineStart.id!==event.pointerId)return;
  const dx=event.clientX-inlineStart.x,dy=event.clientY-inlineStart.y;inlineStart=null;
  if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)){suppressOpenUntil=Date.now()+400;go(index+(dx<0?1:-1))}
 });
 paint();
 return {open,close,go,zoom,getState:()=>({index,scale,x,y,open:dialog.open}),destroy(){close();life.abort()}};
}
