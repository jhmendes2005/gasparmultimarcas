import {createHash} from 'node:crypto';
import {SITE_ORIGIN} from './seo.mjs';
import {featureKey} from './dist/vehicle-features.js';
import {matchesVehicle} from './dist/vehicle-search.js';

const absolute=value=>new URL(value.startsWith('assets/')?'/'+value:value,SITE_ORIGIN).href;
export function publicVehicle(car){
 return {
  id:car.id,brand:car.brand,name:car.name,version:car.version,year:car.year,
  price:car.price,currency:'BRL',km:car.km,transmission:car.transmission,
  fuel:car.fuel,category:car.category,badge:car.badge||'',description:car.description||'',
  features:car.features||[],images:(car.images||[]).map(absolute),
  url:SITE_ORIGIN+'/veiculo/'+encodeURIComponent(car.id),availability:'available'
 };
}
export async function inventorySnapshot(store){
 const vehicles=(await store.listVehicles()).map(publicVehicle).sort((a,b)=>a.id.localeCompare(b.id));
 const revision=createHash('sha256').update(JSON.stringify(vehicles)).digest('hex');
 return {schemaVersion:'1.0',generatedAt:new Date().toISOString(),revision,
  dealer:{name:'Gaspar Multimarcas',url:SITE_ORIGIN,city:'Gaspar',state:'SC',whatsapp:['5547996190693','5547988237774','554733180795']},
  total:vehicles.length,vehicles};
}
export function searchInventory(vehicles,{query='',brand,category,transmission,fuel,minPrice,maxPrice,minYear,maxYear,features=[],offset=0,limit=20}={}){
 const same=(actual,wanted)=>!wanted||featureKey(actual)===featureKey(wanted);
 const matches=vehicles.filter(car=>matchesVehicle(car,query)&&same(car.brand,brand)&&same(car.category,category)&&same(car.transmission,transmission)&&same(car.fuel,fuel)&&
  (minPrice===undefined||car.price>=minPrice)&&(maxPrice===undefined||car.price<=maxPrice)&&
  (minYear===undefined||car.year>=minYear)&&(maxYear===undefined||car.year<=maxYear)&&
  features.every(label=>(car.features||[]).some(item=>featureKey(item)===featureKey(label))));
 return {total:matches.length,offset,limit,vehicles:matches.slice(offset,offset+limit)};
}
