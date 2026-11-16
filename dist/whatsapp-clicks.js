import {createWhatsAppUrl,whatsappNumbers} from './contact-routing.js';

export function buildWhatsAppRedirect({href,base='https://gasparmultimarcas.com.br',randomize=false,placement='outro',page='/',vehicleId='',eventId=globalThis.crypto?.randomUUID?.()},random=Math.random){
 const original=new URL(href,base);
 if(!(original.hostname==='wa.me'||(original.origin===new URL(base).origin&&original.pathname==='/whatsapp')))return null;
 const message=original.searchParams.get('text')||'';
 const number=randomize?new URL(createWhatsAppUrl('',random)).pathname.slice(1):original.hostname==='wa.me'?original.pathname.slice(1):original.searchParams.get('number');
 if(!whatsappNumbers.includes(number))return null;
 const query=new URLSearchParams({number,placement,page});if(eventId)query.set('event',eventId);if(vehicleId)query.set('vehicle',vehicleId);if(message)query.set('text',message);
 return '/whatsapp?'+query.toString();
}
export function setupWhatsAppClicks(){
 const handle=event=>{
  if(event.defaultPrevented||(event.type==='auxclick'&&event.button!==1))return;
  const link=event.target.closest('a[href]');if(!link)return;
  let page=location.pathname.replace(/\/$/,'')||'/';
  if(!/^\/(?:estoque|sobre|contato|comparar|encontre-seu-carro|privacidade|veiculo\/[\w-]{1,100})?$/.test(page))page='/';
  const vehicleId=link.dataset.lead||(page.startsWith('/veiculo/')?page.split('/')[2]:'');
  const placement=link.matches('.floating-chat')?'flutuante':link.closest('header,.topbar')?'cabecalho':link.closest('footer')?'rodape':link.dataset.lead?'veiculo':page==='/contato'?'contato':'outro';
  try{const href=buildWhatsAppRedirect({href:link.href,base:location.origin,randomize:link.hasAttribute('data-whatsapp-random'),placement,page,vehicleId});if(href){link.href=href;link.rel='noopener nofollow'}}catch{/* A navegação original permanece disponível. */}
 };
 document.addEventListener('click',handle);document.addEventListener('auxclick',handle);
}
