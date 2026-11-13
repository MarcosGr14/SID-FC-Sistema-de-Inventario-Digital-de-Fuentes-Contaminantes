const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');

test('loading marker photos preserves the open popup, button and its click handler',()=>{
  const dom=new JSDOM('<div id="map" style="width:600px;height:400px"></div>',{url:'http://localhost/',runScripts:'outside-only',pretendToBeVisual:true});
  const context=dom.getInternalVMContext(),d=dom.window.document;
  vm.runInContext(fs.readFileSync('assets/vendor/leaflet/leaflet.js','utf8'),context);
  vm.runInContext('const SID_CONFIG={MAP_CENTER:[8.99,-79.55],MAP_ZOOM:11};',context);
  vm.runInContext(fs.readFileSync('js/map.js','utf8'),context);
  vm.runInContext('SIDMap.init();SIDMap.render([{id:"f0",nombre:"Río Juan Díaz",tipo:"agua",lat:8.99,lng:-79.55,estado:"alerta"}],"todas",()=>{window.__opened=true})',context);
  const marker=d.querySelector('.leaflet-marker-icon');
  marker.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true}));
  const button=d.querySelector('.map-profile-link');assert.ok(button);
  vm.runInContext('SIDMap.updatePhotos([{id:"f0",nombre:"Río Juan Díaz",_fotoMapa:"https://example.org/photo.jpg"}])',context);
  assert.equal(d.querySelector('.map-profile-link'),button);assert.equal(d.querySelector('.leaflet-marker-icon'),marker);
  assert.equal(d.querySelector('.map-source-photo').src,'https://example.org/photo.jpg');
  button.click();assert.equal(dom.window.__opened,true);dom.window.close();
});
