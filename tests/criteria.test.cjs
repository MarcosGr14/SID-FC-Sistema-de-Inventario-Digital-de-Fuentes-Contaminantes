const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const context=vm.createContext({});
vm.runInContext(fs.readFileSync('js/guide.js','utf8'),context);
const guide=vm.runInContext('MeasurementGuide',context);
const profile=(key,param)=>guide.items.find(p=>p.key===key&&p.parametro===param);
const state=(p,value,extra={})=>guide.evaluateSnapshot(p,value,{matriz:p.matriz,parametro:p.parametro,unidad:p.unidad,fecha:'2026-11-13T09:00:00-05:00',...extra}).estado;
test('Panama effluent values are 100 mg/L DQO and 35 mg/L SST with no fictitious preventive band',()=>{
 for(const [param,max] of [['DQO',100],['Sólidos Suspendidos Totales',35]]){
  const p=profile('pa-efluente-2019-2025',param);assert.equal(p.max,max);assert.equal(state(p,max),'bueno');assert.equal(state(p,max+.01),'alerta');assert.equal(state(p,max*.8),'bueno');
 }
 const p=profile('pa-efluente-2019-2025','Diferencia de temperatura');assert.equal(state(p,-3),'bueno');assert.equal(state(p,-3.1),'alerta');assert.equal(state(p,27),'alerta');
});
test('recreation bands respect both edges and direction of dissolved oxygen',()=>{
 const turb=profile('pa-recreacion-2008','Turbidez'),oxygen=profile('pa-recreacion-2008','Oxígeno disuelto'),dbo=profile('pa-recreacion-2008','DBO5');
 for(const [value,expected] of [[49.999,'bueno'],[50,'intermedio'],[100,'intermedio'],[100.001,'alerta']])assert.equal(state(turb,value),expected);
 for(const [value,expected] of [[7.01,'bueno'],[7,'intermedio'],[6,'intermedio'],[5.99,'alerta']])assert.equal(state(oxygen,value),expected);
 assert.equal(state(dbo,3),'intermedio');assert.equal(state(dbo,5.01),'alerta');
 assert.equal(state(profile('pa-recreacion-2008','Sólidos Suspendidos Totales'),50),'alerta');
});
test('WHO and EPA are distinct references and AQI uses the current truncated breakpoints',()=>{
 const who=profile('oms-aire-2021','PM2.5 (promedio 24 h)'),epa=profile('epa-aqi-pm-2026','PM2.5 (promedio 24 h)');
 assert.equal(state(who,20),'alerta');assert.equal(state(epa,20),'intermedio');
 for(const [value,expected] of [[9.09,'bueno'],[9.1,'intermedio'],[35.49,'intermedio'],[35.5,'alerta'],[225.5,'alerta']])assert.equal(state(epa,value),expected);
 const pm10=profile('epa-aqi-pm-2026','PM10 (promedio 24 h)');assert.equal(state(pm10,54.99),'bueno');assert.equal(state(pm10,55),'intermedio');
 assert.equal(state(who,20,{unidad:'mg/Nm³'}),'sin_referencia');
});
test('soil values require land use and exposure; total hydrocarbons have no generic limit',()=>{
 assert.equal(profile('ccme-pb-2025-agricola-suelo','Plomo total').max,70);
 assert.equal(profile('ccme-pb-2025-agricola-multimedio','Plomo total').max,61);
 assert.equal(profile('ccme-pb-2025-residencial-parques-suelo','Plomo total').max,113);
 assert.equal(profile('ccme-cd-1999-agricola','Cadmio total').max,1.4);
 assert.equal(profile('ccme-cd-1999-residencial-parques','Cadmio total').max,10);
 assert.equal(state(profile('sitio-suelo','Hidrocarburos totales'),160),'sin_referencia');
 assert.equal(state(profile('sitio-suelo','pH'),5),'sin_referencia');
});
test('exclusive operational turbidity goal, date, matrix and missing value checks prevent false green results',()=>{
 const water=profile('oms-abastecimiento-2024','Turbidez');assert.equal(state(water,.99),'bueno');assert.equal(state(water,1),'alerta');
 const p=profile('pa-efluente-2019-2025','DBO5');assert.equal(state(p,20,{matriz:'suelo'}),'sin_referencia');assert.equal(state(p,20,{fecha:'2018-01-01'}),'sin_referencia');
 for(const value of [null,'',NaN,Infinity,-1])assert.equal(state(p,value),'sin_referencia');
});
test('saved criteria snapshots retain the original reference when the catalog changes',()=>{
 const p=profile('pa-efluente-2019-2025','DBO5'),snapshot=guide.snapshot(p),old=p.max;p.max=5;
 try{assert.equal(state(snapshot,20),'bueno');assert.equal(state(p,20),'alerta');}finally{p.max=old;}
 const ids=guide.items.map(p=>p.id);assert.equal(new Set(ids).size,ids.length);
});

test('malformed saved criteria cannot crash history rendering or yield a green result',()=>{
 const p=profile('oms-aire-2021','PM2.5 (promedio 24 h)');
 for(const patch of [{bands:{}},{bands:[null]},{bands:[{estado:'bueno',max:'15'}]},{max:'15'}])assert.equal(state({...p,...patch},10),'sin_referencia');
});
