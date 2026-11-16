import {test} from 'node:test';
import assert from 'node:assert/strict';
import {matchesVehicle,normalizeSearch} from '../dist/vehicle-search.js';

const car={brand:'Honda',name:'HR-V',version:'EXL Sensing 1.5',year:2023,category:'SUV',transmission:'Automático',fuel:'Flex'};
test('busca por marca, modelo, ano e termos combinados',()=>{
 for(const query of ['honda','hrv','HR-V','Honda HRV 2023','suv automático','sensing 1.5','  HONDA  '])assert.equal(matchesVehicle(car,query),true,query);
 for(const query of ['Honda 2025','Polo','SUV manual'])assert.equal(matchesVehicle(car,query),false,query);
});
test('busca ignora acentos e preserva o estoque quando vazia',()=>{
 assert.equal(normalizeSearch('  Câmbio AUTOMÁTICO! '),'cambio automatico');
 assert.equal(matchesVehicle(car,''),true);
 assert.equal(matchesVehicle({...car,brand:'Citroën'},'citroen'),true);
});
