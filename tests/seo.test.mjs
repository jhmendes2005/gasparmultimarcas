import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SITE_ORIGIN,seoPages,renderSeoPage,sitemapXml,robotsTxt,filterStock} from '../seo.mjs';

const cars=[{id:'test-polo',brand:'Volkswagen',name:'Polo',version:'Comfortline 1.0 TSI',year:2025,price:99900,km:38000,transmission:'Automático',fuel:'Flex',category:'Hatch',description:'Descrição completa do veículo.',images:['/assets/car-1-0.png','/assets/car-1-1.png']},{id:'test-honda',brand:'Honda',name:'City',version:'Touring',year:2024,price:114900,km:47000,transmission:'Automático',fuel:'Flex',category:'Sedã',description:'Texto do segundo carro.',images:['/assets/car-2-0.png']}];
const jsonLd=html=>JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
const bootstrap=html=>JSON.parse(html.match(/<script type="application\/json" id="initial-vehicles">([\s\S]*?)<\/script>/)[1]);
test('cada página tem metadados locais únicos, canonical e compartilhamento',async()=>{
 const titles=new Set();for(const [path,config]of Object.entries(seoPages)){
  const template=await readFile('dist/'+(path==='/'?'index':path.slice(1))+'.html','utf8');const result=renderSeoPage(template,{path,cars});
  assert.ok(result.html.includes(`<title>${config.title}</title>`));assert.ok(!titles.has(config.title));titles.add(config.title);
  assert.ok(result.html.includes(`rel="canonical" href="${SITE_ORIGIN+path}"`));assert.ok(result.html.includes('property="og:image"'));assert.ok(result.html.includes('name="twitter:card"'));assert.equal((result.html.match(/name="description"/g)||[]).length,1);
  const dealer=jsonLd(result.html)['@graph'].find(item=>item['@type']==='AutoDealer');assert.equal(dealer.address.addressLocality,'Gaspar');assert.equal(dealer.contactPoint.length,3);assert.equal(dealer.openingHoursSpecification.length,2);
 }
});
test('estoque e ficha chegam no HTML sem depender de JavaScript',async()=>{
 const stock=renderSeoPage(await readFile('dist/estoque.html','utf8'),{path:'/estoque',cars});assert.ok(stock.html.includes('Volkswagen Polo 2025'));assert.ok(stock.html.includes('/veiculo/test-honda'));assert.equal(bootstrap(stock.html).length,2);assert.equal(bootstrap(stock.html)[0].images.length,1);
 const detail=renderSeoPage(await readFile('dist/veiculo.html','utf8'),{path:'/veiculo/test-polo',car:cars[0],cars});assert.ok(!detail.html.includes('Carregando veículo'));assert.ok(detail.html.includes('<h1>Polo</h1>'));assert.ok(detail.html.includes('Descrição completa do veículo.'));assert.ok(detail.html.includes('38.000'));assert.ok(detail.html.includes('Ver foto 2'));assert.equal(bootstrap(detail.html)[0].images.length,2);
 const graph=jsonLd(detail.html)['@graph'],car=graph.find(item=>Array.isArray(item['@type'])&&item['@type'].includes('Car'));assert.equal(car.offers.price,99900);assert.equal(car.offers.priceCurrency,'BRL');assert.equal(car.offers.url,SITE_ORIGIN+'/veiculo/test-polo');assert.equal(car.mileageFromOdometer.value,38000);assert.equal(car.image[0],SITE_ORIGIN+'/assets/car-1-0.png');assert.equal(graph.find(item=>item['@type']==='BreadcrumbList').itemListElement.length,3);
});
test('buscas, favoritos e comparações não criam páginas indexáveis duplicadas',async()=>{
 const template=await readFile('dist/estoque.html','utf8');
 for(const query of ['q=honda','marca=Honda','favoritos=1','ordem=low']){const {html,robots}=renderSeoPage(template,{path:'/estoque',cars,params:new URLSearchParams(query)});assert.match(robots,/noindex/);assert.ok(html.includes(`rel="canonical" href="${SITE_ORIGIN}/estoque"`))}
 const selected=filterStock(cars,new URLSearchParams({q:'honda',preco:'120000'}));assert.deepEqual(selected.map(c=>c.id),['test-honda']);
 const normal=renderSeoPage(template,{path:'/estoque',cars,params:new URLSearchParams({utm_source:'instagram'})});assert.match(normal.robots,/^index/);assert.ok(!normal.html.match(/rel="canonical"[^>]*utm_source/));
 assert.match(renderSeoPage(await readFile('dist/comparar.html','utf8'),{path:'/comparar'}).robots,/noindex/);
 assert.match(renderSeoPage(template,{path:'/estoque',cars,indexableHost:false}).robots,/noindex/);
});
test('dados cadastrados não podem injetar HTML, scripts ou JSON-LD',async()=>{
 const malicious={...cars[0],brand:'</script><img src=x onerror=alert(1)>',description:'</script><script>alert("x")</script>'};
 const {html}=renderSeoPage(await readFile('dist/veiculo.html','utf8'),{path:'/veiculo/test-polo',car:malicious,cars:[malicious]});
 assert.ok(!html.includes('<script>alert('));assert.ok(!html.includes('<img src=x onerror'));assert.equal(bootstrap(html)[0].brand,malicious.brand);assert.equal(jsonLd(html)['@graph'].find(item=>Array.isArray(item['@type'])).description,malicious.description);
});
test('sitemap usa domínio canônico, fotos e somente datas reais; robots preserva recursos públicos',()=>{
 const xml=sitemapXml(cars.map((car,i)=>({...car,lastModified:i===0?'2026-11-16T13:00:00Z':undefined})));assert.ok(xml.startsWith('<?xml'));assert.ok(xml.includes(SITE_ORIGIN+'/veiculo/test-polo'));assert.ok(xml.includes('<lastmod>2026-11-16T13:00:00.000Z</lastmod>'));assert.equal((xml.match(/<lastmod>/g)||[]).length,1);assert.equal((xml.match(/<image:image>/g)||[]).length,3);assert.ok(!xml.includes('/comparar'));assert.ok(!xml.includes('/admin'));assert.ok(!xml.includes('vercel.app'));
 const robots=robotsTxt();assert.ok(robots.includes(SITE_ORIGIN+'/sitemap.xml'));assert.ok(robots.includes('Disallow: /admin'));assert.ok(!robots.includes('Disallow: /assets'));assert.ok(!robots.includes('Disallow: /api/\n'));assert.equal(robotsTxt(false),'User-agent: *\nDisallow: /\n');
});
