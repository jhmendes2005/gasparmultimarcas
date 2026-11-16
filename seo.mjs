import {renderVehicleCards,renderVehicleDetail} from './dist/vehicle-markup.js';
import {matchesVehicle} from './dist/vehicle-search.js';

export const SITE_ORIGIN='https://gasparmultimarcas.com.br';
export const seoPages={
 '/':{title:'Gaspar Multimarcas | Carros usados e seminovos em Gaspar, SC',description:'Encontre carros usados e seminovos na Gaspar Multimarcas, em Gaspar, SC. Consulte preços, fotos e fichas dos veículos e fale com a equipe pelo WhatsApp.',name:'Início'},
 '/estoque':{title:'Carros usados e seminovos em Gaspar, SC | Estoque Gaspar Multimarcas',description:'Veja o estoque de carros usados e seminovos da Gaspar Multimarcas em Gaspar, SC. Compare modelos, anos, preços e quilometragem e confira todas as fotos.',name:'Estoque'},
 '/sobre':{title:'Sobre a Gaspar Multimarcas | Loja de veículos em Gaspar, SC',description:'Conheça a Gaspar Multimarcas, loja de veículos em Gaspar, Santa Catarina. Veja nossa localização, horários e como encontrar seu próximo carro com a equipe.',name:'Sobre a Gaspar'},
 '/contato':{title:'Contato e WhatsApp | Gaspar Multimarcas em Gaspar, SC',description:'Fale com a Gaspar Multimarcas pelos WhatsApps (47) 99619-0693, (47) 98823-7774 e (47) 3318-0795. Visite a loja na Rua Anfilóquio Nunes Pires, 351, Gaspar, SC.',name:'Contato'},
 '/encontre-seu-carro':{title:'Encontre seu carro por perfil e orçamento | Gaspar Multimarcas',description:'Descubra carros do estoque da Gaspar Multimarcas que combinam com seu perfil, orçamento e câmbio preferido. Compare suas opções e converse com a equipe.',name:'Encontre seu carro'},
 '/privacidade':{title:'Privacidade e cookies | Gaspar Multimarcas',description:'Saiba como funcionam os favoritos, a contagem de cliques no WhatsApp e as preferências de cookies e privacidade do site da Gaspar Multimarcas.',name:'Privacidade'},
 '/comparar':{title:'Compare veículos | Gaspar Multimarcas',description:'Compare preço, ano, quilometragem e ficha técnica dos seus veículos selecionados na Gaspar Multimarcas.',name:'Comparar veículos',noindex:true},
};
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const safeJson=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
const absolute=value=>new URL(value.startsWith('assets/')?'/'+value:value,SITE_ORIGIN).href;
const carPath=car=>'/veiculo/'+encodeURIComponent(car.id);
const carName=car=>`${car.brand} ${car.name} ${car.version} ${car.year}`.replace(/\s+/g,' ').trim();
const money=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(value);
const km=value=>new Intl.NumberFormat('pt-BR').format(value);
export function filterStock(cars,params){
 let list=cars.filter(c=>(!params.get('marca')||c.brand===params.get('marca'))&&(!params.get('preco')||c.price<=Number(params.get('preco')))&&(!params.get('categoria')||c.category===params.get('categoria'))&&matchesVehicle(c,params.get('q')||''));
 if(params.get('favoritos')==='1')return [];
 if(params.get('ordem')==='low')list.sort((a,b)=>a.price-b.price);if(params.get('ordem')==='high')list.sort((a,b)=>b.price-a.price);if(params.get('ordem')==='new')list.sort((a,b)=>b.year-a.year);return list;
}
function dealer(){return {'@type':'AutoDealer','@id':SITE_ORIGIN+'/#loja',name:'Gaspar Multimarcas',url:SITE_ORIGIN+'/',logo:SITE_ORIGIN+'/assets/logo.png',image:SITE_ORIGIN+'/assets/store.png',telephone:'+5547996190693',address:{'@type':'PostalAddress',streetAddress:'Rua Anfilóquio Nunes Pires, 351, Figueira',addressLocality:'Gaspar',addressRegion:'SC',addressCountry:'BR'},contactPoint:['+5547996190693','+5547988237774','+554733180795'].map(telephone=>({'@type':'ContactPoint',telephone,contactType:'Atendimento',availableLanguage:'pt-BR'})),openingHoursSpecification:[{'@type':'OpeningHoursSpecification',dayOfWeek:['Monday','Tuesday','Wednesday','Thursday','Friday'],opens:'09:00',closes:'18:00'},{'@type':'OpeningHoursSpecification',dayOfWeek:'Saturday',opens:'08:00',closes:'12:00'}]}}
export function renderSeoPage(template,{path='/',params=new URLSearchParams(),cars=[],car=null,indexableHost=true,notFound=false}={}){
 const similar=car&&cars.filter(item=>carName(item).toLocaleLowerCase('pt-BR')===carName(car).toLocaleLowerCase('pt-BR')).length>1;
 const config=notFound?{title:'Página não encontrada | Gaspar Multimarcas',description:'Esta página ou veículo não está disponível. Explore o estoque atual da Gaspar Multimarcas em Gaspar, SC.',name:'Página não encontrada',noindex:true}:car?{title:`${carName(car)}${similar?' · '+km(car.km)+' km':''} em Gaspar | Gaspar Multimarcas`,description:`${carName(car)} por ${money(car.price)}, com ${km(car.km)} km e câmbio ${car.transmission.toLowerCase()}. Veja fotos e detalhes na Gaspar Multimarcas, Gaspar, SC.`,name:carName(car)}:seoPages[path];
 if(!config)throw Error('Página SEO desconhecida.');
 const canonical=SITE_ORIGIN+(car?carPath(car):notFound?'/':path);
 const filtered=path==='/estoque'&&['marca','preco','categoria','ordem','q','favoritos'].some(key=>params.get(key));
 const noindex=notFound||config.noindex||filtered||!indexableHost;
 const robots=noindex?'noindex,follow':'index,follow,max-image-preview:large';
 const image=car?absolute(car.images[0]):SITE_ORIGIN+'/assets/hero.jpg';
 const graph=[dealer(),{'@type':'WebSite','@id':SITE_ORIGIN+'/#website',url:SITE_ORIGIN+'/',name:'Gaspar Multimarcas',inLanguage:'pt-BR',publisher:{'@id':SITE_ORIGIN+'/#loja'}},{'@type':car?'ItemPage':path==='/estoque'?'CollectionPage':'WebPage','@id':canonical+'#pagina',url:canonical,name:config.title,description:config.description,inLanguage:'pt-BR',isPartOf:{'@id':SITE_ORIGIN+'/#website'},about:{'@id':SITE_ORIGIN+'/#loja'},...(car?{mainEntity:{'@id':canonical+'#veiculo'}}:{})}];
 if(!notFound&&path!=='/'){
  const crumbs=[{name:'Início',url:SITE_ORIGIN+'/'}];if(car)crumbs.push({name:'Estoque',url:SITE_ORIGIN+'/estoque'});crumbs.push({name:config.name,url:canonical});
  graph.push({'@type':'BreadcrumbList','@id':canonical+'#breadcrumb',itemListElement:crumbs.map((item,i)=>({'@type':'ListItem',position:i+1,name:item.name,item:item.url}))});
 }
 if(car)graph.push({'@type':['Car','Product'],'@id':canonical+'#veiculo',name:carName(car),url:canonical,description:car.description||config.description,image:car.images.map(absolute),brand:{'@type':'Brand',name:car.brand},model:car.name,vehicleConfiguration:car.version,additionalProperty:{'@type':'PropertyValue',name:'Ano do modelo',value:car.year},vehicleTransmission:car.transmission,fuelType:car.fuel,mileageFromOdometer:{'@type':'QuantitativeValue',value:car.km,unitCode:'KMT'},itemCondition:'https://schema.org/UsedCondition',offers:{'@type':'Offer',url:canonical,price:car.price,priceCurrency:'BRL',availability:'https://schema.org/InStock',itemCondition:'https://schema.org/UsedCondition',seller:{'@id':SITE_ORIGIN+'/#loja'}}});
 const list=path==='/estoque'?filterStock(cars,params):path==='/'?cars.slice(0,3):[];
 if(list.length)graph.push({'@type':'ItemList','@id':canonical+'#estoque',numberOfItems:list.length,itemListElement:list.map((item,i)=>({'@type':'ListItem',position:i+1,url:SITE_ORIGIN+carPath(item),name:carName(item)}))});
 let html=template.replace(/<title>[\s\S]*?<\/title>/i,()=>`<title>${esc(config.title)}</title>`).replace(/<meta\s+name="description"[^>]*>/i,()=>`<meta name="description" content="${esc(config.description)}">`).replace(/<meta\s+name="robots"[^>]*>/gi,'');
 const head=`${notFound?'':`<link rel="canonical" href="${esc(canonical)}">`}<meta name="robots" content="${robots}"><meta property="og:locale" content="pt_BR"><meta property="og:type" content="website"><meta property="og:site_name" content="Gaspar Multimarcas"><meta property="og:title" content="${esc(config.title)}"><meta property="og:description" content="${esc(config.description)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:image" content="${esc(image)}"><meta property="og:image:alt" content="${esc(car?carName(car):'Imagem ilustrativa do site da Gaspar Multimarcas')}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(config.title)}"><meta name="twitter:description" content="${esc(config.description)}"><meta name="twitter:image" content="${esc(image)}">${car?`<link rel="preload" as="image" href="${esc(image)}" fetchpriority="high">`:''}<script type="application/ld+json">${safeJson({'@context':'https://schema.org','@graph':notFound?[]:graph})}</script>`;
 html=html.replace('</head>',()=>head+'</head>');
 if(car)html=html.replace('<div id="vehicle-detail" aria-live="polite"><p>Carregando veículo…</p></div>',()=>`<div id="vehicle-detail" aria-live="polite">${renderVehicleDetail(car,cars)}</div>`);
 if(path==='/'||path==='/estoque'){
  const empty=params.get('favoritos')==='1'?'Seus favoritos aparecerão neste navegador.':'Nenhum veículo com esses filtros. Explore outras opções no estoque.';
  html=html.replace('<div id="vehicles" class="vehicle-grid"></div>',()=>`<div id="vehicles" class="vehicle-grid">${list.length?renderVehicleCards(list):`<div class="empty-state"><p>${empty}</p></div>`}</div>`);
  html=html.replace(/(<div id="results-summary"[^>]*>)[\s\S]*?<\/div>/,(_,open)=>`${open}${list.length} veículos ${path==='/'?'em destaque':'encontrados'}.</div>`);
 }
 if(car||path==='/'||path==='/estoque'){
  const bootstrap=cars.map(item=>item.id===car?.id?item:{...item,images:item.images.slice(0,1),description:''});
  html=html.replace('</body>',()=>`<script type="application/json" id="initial-vehicles">${safeJson(bootstrap)}</script></body>`);
 }
 return {html,robots};
}
export function sitemapXml(vehicles){
 const pages=Object.keys(seoPages).filter(path=>!seoPages[path].noindex).map(path=>`<url><loc>${esc(SITE_ORIGIN+path)}</loc></url>`);
 for(const car of vehicles){const lastmod=car.lastModified&&Number.isFinite(new Date(car.lastModified).getTime())?`<lastmod>${new Date(car.lastModified).toISOString()}</lastmod>`:'';pages.push(`<url><loc>${esc(SITE_ORIGIN+carPath(car))}</loc>${lastmod}${(car.images||[]).map(image=>`<image:image><image:loc>${esc(absolute(image))}</image:loc></image:image>`).join('')}</url>`)}
 return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${pages.join('')}</urlset>`;
}
export function robotsTxt(indexableHost=true){return indexableHost?`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/admin/\nDisallow: /whatsapp\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n'}
