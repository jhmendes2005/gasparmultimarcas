import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {renderVehicleDetail} from '../dist/vehicle-markup.js';
import {setupVehicleGallery,shareVehicle,vehicleShareData} from '../dist/vehicle-gallery.js';

const car={id:'car-123',brand:'Honda',name:'City',version:'Touring',year:2024,price:99000,km:10000,transmission:'Automático',fuel:'Flex',category:'Sedã',images:['/assets/car-1-0.png','/assets/car-1-1.png','/assets/car-1-2.png']};
function setup(vehicle=car){
 const dom=new JSDOM('<body><main id="vehicle-detail">'+renderVehicleDetail(vehicle)+'</main></body>',{url:'https://gasparmultimarcas.com.br/veiculo/car-123'});
 const doc=dom.window.document,container=doc.querySelector('main'),dialog=doc.querySelector('dialog'),stage=doc.querySelector('.lightbox-stage');
 dialog.showModal=function(){this.open=true};dialog.close=function(){this.open=false;this.dispatchEvent(new dom.window.Event('close'))};
 stage.getBoundingClientRect=()=>({left:0,top:0,width:800,height:600});
 Object.defineProperties(stage.querySelector('img'),{naturalWidth:{value:1600},naturalHeight:{value:1200}});
 const messages=[],controller=setupVehicleGallery(container,vehicle,message=>messages.push(message));
 const pointer=(target,type,id,x,y)=>{const event=new dom.window.Event(type,{bubbles:true,cancelable:true});Object.assign(event,{pointerId:id,clientX:x,clientY:y,button:0,isPrimary:true});target.dispatchEvent(event)};
 return {dom,doc,container,dialog,stage,messages,controller,pointer,cleanup(){controller.destroy();dom.window.close()}};
}

test('galeria navega pelas setas, miniaturas e teclado; modal devolve foco e rolagem',()=>{
 const qa=setup();try{
  const {doc,controller,dialog,dom}=qa;
  doc.querySelector('.detail-photo [data-gallery-step="1"]').click();assert.equal(controller.getState().index,1);assert.equal(doc.querySelector('#photo-count').textContent,'2 / 3');
  doc.querySelector('[data-photo-index="2"]').click();assert.equal(controller.getState().index,2);
  const open=doc.querySelector('[data-gallery-open]');open.focus();open.click();assert.ok(dialog.open);assert.equal(doc.body.style.overflow,'hidden');assert.ok(dialog.querySelector('img').src.endsWith('car-1-2.png'));
  dialog.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(controller.getState().index,0);assert.ok(dialog.querySelector('img').src.endsWith('car-1-0.png'));
  dialog.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(dialog.open,false);assert.equal(doc.body.style.overflow,'');assert.equal(doc.activeElement,open);
  const before=controller.getState().index;controller.destroy();doc.querySelector('.detail-photo [data-gallery-step="1"]').click();assert.equal(controller.getState().index,before);
 }finally{qa.cleanup()}
});

test('zoom limita escala e movimento; roda do mouse e gestos de dois dedos funcionam',()=>{
 const qa=setup();try{
  const {controller,stage,pointer,doc,dom}=qa;controller.open();
  doc.querySelector('[data-zoom-in]').click();assert.equal(controller.getState().scale,1.5);
  controller.zoom(2);pointer(stage,'pointerdown',1,400,300);pointer(stage,'pointermove',1,1400,1300);assert.equal(controller.getState().x,400);assert.equal(controller.getState().y,300);pointer(stage,'pointerup',1,1400,1300);
  controller.zoom(99);assert.equal(controller.getState().scale,4);assert.ok(doc.querySelector('[data-zoom-in]').disabled);
  doc.querySelector('[data-zoom-reset]').click();assert.equal(controller.getState().scale,1);assert.ok(doc.querySelector('[data-zoom-out]').disabled);
  pointer(stage,'pointerdown',1,200,300);pointer(stage,'pointerdown',2,600,300);pointer(stage,'pointermove',1,0,300);pointer(stage,'pointermove',2,800,300);assert.equal(controller.getState().scale,2);pointer(stage,'pointerup',1,0,300);pointer(stage,'pointerup',2,800,300);
  stage.dispatchEvent(new dom.window.WheelEvent('wheel',{deltaY:-100,clientX:400,clientY:300,bubbles:true,cancelable:true}));assert.ok(controller.getState().scale>2);
  controller.go(1);assert.equal(controller.getState().scale,1);assert.equal(controller.getState().x,0);
 }finally{qa.cleanup()}
});

test('deslizar troca foto sem abrir o modal; uma foto funciona sem setas',()=>{
 const qa=setup();try{
  const open=qa.doc.querySelector('[data-gallery-open]');qa.pointer(open,'pointerdown',1,300,200);qa.pointer(open,'pointerup',1,100,205);open.click();
  assert.equal(qa.controller.getState().index,1);assert.equal(qa.dialog.open,false);
  qa.controller.open();qa.pointer(qa.stage,'pointerdown',2,300,200);qa.pointer(qa.stage,'pointerup',2,100,205);assert.equal(qa.controller.getState().index,2);
 }finally{qa.cleanup()}
 const single=setup({...car,images:[car.images[0]]});try{assert.equal(single.doc.querySelector('[data-gallery-step]'),null);single.controller.go(1);assert.equal(single.controller.getState().index,0);single.controller.open();assert.ok(single.dialog.open)}finally{single.cleanup()}
});

test('compartilhamento usa link canônico, respeita cancelamento e oferece cópia manual',async()=>{
 const expected='https://gasparmultimarcas.com.br/veiculo/car-123';assert.equal(vehicleShareData(car).url,expected);
 let shared,copied,manual;const notices=[];
 assert.equal(await shareVehicle(car,{navigator:{share:async data=>{shared=data}},notify:message=>notices.push(message)}),'shared');assert.equal(shared.url,expected);
 assert.equal(await shareVehicle(car,{navigator:{clipboard:{writeText:async text=>{copied=text}}},notify:message=>notices.push(message)}),'copied');assert.equal(copied,expected);
 copied=null;
 assert.equal(await shareVehicle(car,{navigator:{share:async()=>{throw Object.assign(Error(),{name:'AbortError'})},clipboard:{writeText:async text=>{copied=text}}}}),'cancelled');assert.equal(copied,null);
 assert.equal(await shareVehicle(car,{navigator:{clipboard:{writeText:async()=>{throw Error('Permissão negada')}}},fallback:url=>{manual=url}}),'manual');assert.equal(manual,expected);
 const qa=setup();try{
  qa.controller.open();qa.dialog.querySelector('[data-share-vehicle]').click();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(qa.dialog.querySelector('.share-link-fallback input').value,expected);assert.equal(qa.doc.activeElement,qa.dialog.querySelector('.share-link-fallback input'));
  assert.ok(qa.doc.querySelector('.detail-copy [data-share-vehicle]'));
 }finally{qa.cleanup()}
});
