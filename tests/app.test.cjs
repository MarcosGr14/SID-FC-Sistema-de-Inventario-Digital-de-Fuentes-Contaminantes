const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('index.html', 'utf8');
const pause = () => new Promise(resolve => setTimeout(resolve, 30));
function app(offline = false, extra = [], options = {}) {
  const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  const evaluate = code => vm.runInContext(code, dom.getInternalVMContext());
  let failed = offline, clients = 0, focused;
  const fuentes = Array.from({ length: 12 }, (_, i) => ({ id: `f${i}`, nombre: i === 0 ? `[DEMO] Estación ${i}` : `Estación ${i}`, tipo: 'agua', lat: 8.9, lng: -79.5 }));
  const limites = [{ matriz: 'agua', parametro: 'DBO5', limite: 50, umbral_aviso: 40, unidad: 'mg/L' }, { matriz: 'suelo', parametro: 'pH', limite: null, unidad: 'pH' }];
  const inspecciones = Array.from({ length: 15 }, (_, i) => ({ id: `i${i}`, fuente_id: 'f0', fecha: new Date(2026, 8, i + 1).toISOString(), matriz: 'agua', parametro: 'DBO5', valor: i + 20, unidad: 'mg/L', estado: 'bueno', cumple: true, inspector: 'Responsable técnico' }));
  w.matchMedia = () => ({ matches: true });
  inspecciones.push(...extra);
  w.scrollTo = () => {};
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.console.error = () => {};
  w.supabase = { createClient(_url,_key,settings) {
    w.__sdkFetch=settings.global.fetch;
    clients++;
    return { auth: { getSession: async () => ({ data: { session: options.user ? { user:options.user } : null } }), onAuthStateChange(callback) { w.__emitAuth=(event,user)=>callback(event,user?{user}:null);return {data:{subscription:{unsubscribe(){}}}}; }, signOut: async () => ({ error: null }) },
      from(table) { let first=0,last=Infinity;const filters=[];const q = { select() { return q; }, range(from,to) { first=from;last=to;return q; }, eq(column,value) { filters.push(r=>r[column]===value);return q; }, in(column,values) { filters.push(r=>values.includes(r[column]));return q; }, insert(records) { w.__insertPayload=records; w.__insertCalls=(w.__insertCalls||0)+1;return q; }, order() { return q; }, then(resolve, reject) { return Promise.resolve().then(async () => { await pause(); return failed ? { data: null, error: new Error('Failed to fetch') } : { data: (({ fuentes, limites, inspecciones, evidencias_fuente:options.evidence||[] })[table] || []).filter(r=>filters.every(f=>f(r))).slice(first,last+1), error: null }; }).then(resolve, reject); } }; return q; }
    };
  } };
  evaluate('const SIDMap = { init(){}, isInitialized:()=>true, invalidateSize(){}, render(sources){window.__mapSources=sources;}, focusFuente(id){window.__focused=id;} };');
  for (const file of [...w.document.scripts].map(script=>script.getAttribute('src')?.split('?')[0]).filter(file=>file?.startsWith('js/')&&!['js/map.js','js/main.js'].includes(file))) evaluate(fs.readFileSync(file,'utf8'));
  if(options.beforeInit)evaluate(options.beforeInit);
  const init = evaluate('UI.init()');
  return { dom, w, evaluate, init, recover: () => { failed = false; }, clients: () => clients };
}
test('navigation remains available before and after database failure; retry restores records', async () => {
  const a = app(true), d = a.w.document;
  d.querySelector('[data-page="inventario"]').click();
  assert.equal(d.getElementById('page-inventario').hidden, false);
  await a.init;
  assert.match(d.getElementById('connectionTitle').textContent, /no disponible/);
  assert.equal(d.getElementById('statTotal').textContent, '—');
  assert.equal(d.getElementById('btnGuardarInspeccion').disabled, true);
  d.querySelector('[data-page="contacto"]').click();
  assert.equal(d.getElementById('page-contacto').hidden, false);
  a.recover(); d.getElementById('btnRetryConnection').click(); await pause(); await pause(); await pause();
  assert.equal(d.getElementById('connectionNotice').hidden, true);
  assert.equal(d.getElementById('statTotal').textContent, '12');
  assert.equal(a.clients(), 1);
  a.dom.window.close();
});
test('history, pagination, source map action, and profile preserve every measurement', async () => {
  const a = app(), d = a.w.document; await a.init;
  assert.equal(d.querySelectorAll('#tablaHistorico tbody tr').length, 6);
  d.querySelector('[data-history-page="2"]').click();
  assert.equal(d.querySelectorAll('#tablaHistorico tbody tr').length, 6);
  d.querySelector('[data-view-map]').click(); await pause();
  assert.equal(a.w.__focused, 'f0');
  d.querySelector('[data-open-profile="f0"]').click(); await pause();
  assert.equal(d.getElementById('modalExpediente').hidden, false);
  assert.equal(d.querySelectorAll('#profileHistory tbody tr').length, 5);
  const first = d.querySelector('#profileHistory tbody tr').textContent;
  d.querySelector('#paginacionProfileHistory [aria-label="Página 2"]').click(); await pause();
  assert.notEqual(d.querySelector('#profileHistory tbody tr').textContent, first);
  a.dom.window.close();
});
test('criteria distinguish no reference, preventive range and exceedance', async () => {
  const a = app(); await a.init;
  assert.equal(a.evaluate('Inspections.evaluar("agua","DBO5",39).estado'), 'bueno');
  assert.equal(a.evaluate('Inspections.evaluar("agua","DBO5",40).estado'), 'intermedio');
  assert.equal(a.evaluate('Inspections.evaluar("agua","DBO5",51).estado'), 'alerta');
  assert.equal(a.evaluate('Inspections.evaluar("suelo","pH",7).estado'), 'sin_referencia');
  a.dom.window.close();
});
test('contact validation recovers after correcting a full name without sending a message', async () => {
  const a = app(true), d = a.w.document; await a.init;
  const form = d.getElementById('contactForm');
  const name = form.elements.namedItem('nombre');
  name.value = 'Marcos';
  form.dispatchEvent(new a.w.Event('submit', { cancelable: true }));
  assert.equal(name.validity.customError, true);
  name.value = 'Marcos Gaitan';
  name.dispatchEvent(new a.w.Event('input', { bubbles: true }));
  assert.equal(name.validity.customError, false);
  a.dom.window.close();
});

test('source summary uses the most critical reading of the latest visit', async () => {
  const a = app(false, [{ id: 'tie', fuente_id: 'f0', fecha: new Date(2026,8,15).toISOString(), matriz: 'agua', parametro: 'DQO', valor: 200, unidad: 'mg/L', estado: 'alerta', cumple: false, inspector: 'Responsable técnico' }]);
  await a.init;
  const row = a.w.document.querySelector('#tablaResumenFuentes tbody tr');
  assert.match(row.textContent, /Alerta/);
  a.dom.window.close();
});

test('source names omit the demo prefix and photo inputs switch exclusively', async () => {
  const a = app(), d = a.w.document; await a.init;
  assert.match(d.querySelector('#tablaResumenFuentes tbody tr').textContent, /Estación 0/);
  assert.doesNotMatch(d.querySelector('#tablaResumenFuentes tbody tr').textContent, /\[DEMO\]/);
  d.querySelector('[data-open-profile="f0"]').click(); await pause();
  assert.equal(d.getElementById('profileTitle').textContent, 'Estación 0');
  assert.match(d.getElementById('profileChartNote').textContent, /académic/);
  const url = d.querySelector('[name="photoInputMode"][value="url"]');
  url.checked = true; url.dispatchEvent(new a.w.Event('change'));
  assert.equal(d.getElementById('profilePhotoFileField').hidden, true);
  assert.equal(d.getElementById('profilePhotoUrlField').hidden, false);
  d.getElementById('profilePhotoUrl').value = 'https://example.org/photo.jpg';
  const file = d.querySelector('[name="photoInputMode"][value="file"]');
  file.checked = true; file.dispatchEvent(new a.w.Event('change'));
  assert.equal(d.getElementById('profilePhotoUrl').value, '');
  assert.equal(d.getElementById('profilePhotoUrlField').hidden, true);
  a.dom.window.close();
});

test('source picker filters short options and selects the matching site', async () => {
  const a=app(),d=a.w.document;await a.init;
  const picker=d.getElementById('sourcePicker');picker.open=true;picker.dispatchEvent(new a.w.Event('toggle'));
  const search=d.getElementById('sourceSearch');search.value='Estación 10';search.dispatchEvent(new a.w.Event('input'));
  const buttons=d.querySelectorAll('#sourceOptions button');assert.equal(buttons.length,1);
  buttons[0].click();assert.equal(d.getElementById('fFuente').value,'f10');assert.equal(picker.open,false);
  assert.equal(d.getElementById('sourcePickerLabel').textContent,'Estación 10');
  a.dom.window.close();
});
test('chart points expose and update a readable measurement detail', async () => {
  const a=app(),d=a.w.document;await a.init;d.querySelector('[data-open-profile="f0"]').click();await pause();
  const circles=d.querySelectorAll('#profileChart circle');assert.equal(circles.length,15);
  circles[0].dispatchEvent(new a.w.Event('click',{bubbles:true}));
  assert.match(d.querySelector('.chart-readout').textContent,/20 mg\/L/);
  assert.equal(circles[0].getAttribute('aria-pressed'),'true');
  a.dom.window.close();
});
test('CSV parser supports quoted names, separators and validation before insert', async () => {
  const a=app();await a.init;
  const parsed=a.evaluate(`SIDWorkflows.parseCSV('fuente;medio;parametro;valor;unidad;fecha;responsable;referencia\\n"Estación; uno";agua;Turbidez;12;NTU;2026-11-12T09:00:00-05:00;Laboratorio;https://example.org/informe')`);
  assert.equal(parsed[0].fuente,'Estación; uno');
  a.w.__importRows=[{fuente:'Estación 0',medio:'agua',parametro:'Turbidez',valor:'12',unidad:'NTU',fecha:'2026-11-12T09:00:00-05:00',responsable:'Laboratorio',referencia:'https://example.org/informe'}];
  const result=a.evaluate('SIDWorkflows.prepareImport(window.__importRows,[{id:"f0",nombre:"Estación 0"}],[])');
  assert.equal(result.validos.length,1);assert.equal(result.validos[0].origen_dato,'oficial');assert.equal(result.validos[0].fecha,'2026-11-12T14:00:00.000Z');
  a.w.__existing=result.validos;
  assert.equal(a.evaluate('SIDWorkflows.prepareImport(window.__importRows,[{id:"f0",nombre:"Estación 0"}],window.__existing).duplicados'),1);
  a.w.__importRows[0].valor='no-numérico';
  assert.throws(()=>a.evaluate('SIDWorkflows.prepareImport(window.__importRows,[{id:"f0",nombre:"Estación 0"}],[])'),/numérico/);
  a.dom.window.close();
});
test('dialog arrow keys scroll only its internal surface', async () => {
  const a=app(),d=a.w.document;await a.init;d.querySelector('[data-open-profile="f0"]').click();await pause();
  let moved=0;d.querySelector('#modalExpediente .modal').scrollBy=({top})=>{moved+=top;};
  const event=new a.w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true});d.getElementById('btnCloseProfile').dispatchEvent(event);
  assert.equal(event.defaultPrevented,true);assert.equal(moved,48);
  a.dom.window.close();
});
test('guide covers all three media and distinguishes external guidance from project criteria', async () => {
  const a=app();await a.init;
  assert.equal(a.evaluate('MeasurementGuide.items.some(i=>i.matriz==="suelo")'),true);
  assert.equal(a.evaluate('MeasurementGuide.find("aire","PM2.5 (promedio 24 h)").max'),15);
  assert.equal(a.evaluate('MeasurementGuide.find("agua","Oxígeno disuelto").max'),null);
  assert.equal(a.evaluate('Inspections.porMatriz("suelo").some(i=>i.parametro==="Materia orgánica")'),true);
  a.dom.window.close();
});

test('custom minimum criterion is stored with its supporting document', async () => {
  const a=app(),d=a.w.document;await a.init;
  a.evaluate('Auth.user=()=>({id:"inspector"});DB.addInspeccion=async record=>{window.__saved=record;return record;}');
  d.getElementById('fFuente').value='f0';d.getElementById('fFuente').dispatchEvent(new a.w.Event('change'));
  d.getElementById('fParametro').value='Oxígeno disuelto';d.getElementById('fParametro').onchange();
  d.getElementById('fInspector').value='Responsable';d.getElementById('fValor').value='3';d.getElementById('fCriterioMin').value='5';d.getElementById('fCriterioRef').value='https://example.org/criterio';
  d.getElementById('formInspeccion').dispatchEvent(new a.w.Event('submit',{cancelable:true}));
  while(d.getElementById('btnGuardarInspeccion').disabled) await pause();
  assert.equal(a.w.__saved.estado,'alerta');assert.equal(a.w.__saved.criterio_minimo,5);assert.equal(a.w.__saved.criterio_maximo,null);assert.equal(a.w.__saved.unidad,'mg/L');
  a.dom.window.close();
});
test('external batch is sent as one insert with its authenticated author', async () => {
  const a=app();await a.init;a.evaluate('Auth.user=()=>({id:"inspector"})');
  await a.evaluate('DB.addInspeccionesExternas([{fuente_id:"f0",valor:10},{fuente_id:"f0",valor:12}])');
  assert.equal(a.w.__insertCalls,1);assert.equal(a.w.__insertPayload.length,2);assert.ok(a.w.__insertPayload.every(r=>r.creado_por==='inspector'));
  a.dom.window.close();
});

test('measurement guard prevents duplicate submits while a write is in progress', async () => {
  const a=app(),d=a.w.document;await a.init;
  a.evaluate('Auth.user=()=>({id:"inspector"});window.__writes=0;DB.addInspeccion=async record=>{window.__writes++;await new Promise(resolve=>{window.__resolveWrite=resolve});return record;}');
  d.getElementById('fFuente').value='f0';d.getElementById('fFuente').dispatchEvent(new a.w.Event('change'));
  d.getElementById('fInspector').value='Responsable';d.getElementById('fValor').value='20';
  const form=d.getElementById('formInspeccion');
  form.dispatchEvent(new a.w.Event('submit',{cancelable:true}));form.dispatchEvent(new a.w.Event('submit',{cancelable:true}));
  assert.equal(a.w.__writes,1);a.w.__resolveWrite();
  while(d.getElementById('btnGuardarInspeccion').disabled) await pause();
  a.dom.window.close();
});

test('profile opens on the first click before photos resolve and shares repeated requests', async () => {
  const a=app(),d=a.w.document;await a.init;
  a.evaluate('Auth.user=()=>({id:"inspector"});DB.hasEvidenceStorage=()=>true;window.__photoCalls=0;DB.getEvidencias=()=>{window.__photoCalls++;return new Promise(resolve=>{window.__resolvePhotos=resolve;});}');
  const open=d.querySelector('[data-open-profile="f0"]');open.click();
  assert.equal(d.getElementById('modalExpediente').hidden,false);
  assert.equal(d.getElementById('profileEvidenceGallery').getAttribute('aria-busy'),'true');
  open.click();await pause();assert.equal(a.w.__photoCalls,1);
  d.getElementById('btnCloseProfile').click();
  a.w.__resolvePhotos([{url:'https://example.org/old.jpg',creado_en:'2026-11-13T10:00:00Z'}]);await pause();
  assert.equal(d.getElementById('modalExpediente').hidden,true);
  assert.equal(d.querySelector('#profileEvidenceGallery img'),null);
  a.dom.window.close();
});

test('late photos from another source cannot overwrite the active profile', async () => {
  const a=app(),d=a.w.document;await a.init;
  a.evaluate('Auth.user=()=>({id:"inspector"});DB.hasEvidenceStorage=()=>true;window.__photos={};DB.getEvidencias=id=>new Promise(resolve=>{window.__photos[id]=resolve;})');
  d.querySelector('[data-open-profile="f0"]').click();await pause();
  d.querySelector('[data-open-profile="f1"]').click();await pause();
  a.w.__photos.f1([{url:'https://example.org/current.jpg',creado_en:'2026-11-13T10:00:00Z'}]);await pause();
  a.w.__photos.f0([{url:'https://example.org/stale.jpg',creado_en:'2026-11-13T10:00:00Z'}]);await pause();
  assert.equal(d.getElementById('profileTitle').textContent,'Estación 1');
  assert.equal(d.querySelector('#profileEvidenceGallery img').src,'https://example.org/current.jpg');
  assert.equal(d.getElementById('profileEvidenceGallery').getAttribute('aria-busy'),'false');
  a.dom.window.close();
});

test('photo failure keeps profile usable and offers a working retry', async () => {
  const a=app(),d=a.w.document;await a.init;
  a.evaluate('Auth.user=()=>({id:"inspector"});DB.hasEvidenceStorage=()=>true;DB.getEvidencias=async()=>{throw Error("Timeout")}');
  d.querySelector('[data-open-profile="f0"]').click();await pause();
  assert.equal(d.getElementById('modalExpediente').hidden,false);
  assert.equal(d.querySelectorAll('#profileHistory tbody tr').length,5);
  const retry=d.querySelector('#profileEvidenceGallery button');assert.match(retry.textContent,/Reintentar/);
  a.evaluate('DB.getEvidencias=async()=>[{url:"https://example.org/recovered.jpg",creado_en:"2026-11-13T10:00:00Z"}]');
  retry.click();await pause();
  assert.equal(d.querySelector('#profileEvidenceGallery img').src,'https://example.org/recovered.jpg');
  a.dom.window.close();
});


test('slow map photos do not hold the signed-in inventory in loading state', {timeout:1500}, async () => {
  const a=app(false,[],{user:{id:'inspector',email:'inspector@example.org'},beforeInit:'DB.getEvidenciasMapa=()=>new Promise(resolve=>{window.__mapPhotos=resolve;})'});
  await a.init;
  assert.equal(a.w.document.getElementById('connectionNotice').hidden,true);
  assert.equal(a.w.document.getElementById('statTotal').textContent,'12');
  a.w.__mapPhotos({f0:'https://example.org/photo.jpg'});await pause();
  assert.equal(a.w.__mapSources[0]._fotoMapa,'https://example.org/photo.jpg');
  a.dom.window.close();
});

test('refresh preserves the selected source and analytical parameter', async () => {
  const a=app(),d=a.w.document;await a.init;
  d.getElementById('fFuente').value='f2';d.getElementById('fFuente').dispatchEvent(new a.w.Event('change'));
  d.getElementById('fParametro').value='Turbidez';d.getElementById('fParametro').onchange();
  a.w.dispatchEvent(new a.w.Event('online'));await pause();await pause();await pause();await pause();
  assert.equal(d.getElementById('fFuente').value,'f2');assert.equal(d.getElementById('fParametro').value,'Turbidez');
  a.dom.window.close();
});

test('session changes disable writes and discard late private map thumbnails', async () => {
  const a=app(false,[],{user:{id:'inspector',email:'inspector@example.org'},beforeInit:'DB.getEvidenciasMapa=()=>new Promise(resolve=>{window.__mapPhotos=resolve;});DB.getEvidencias=async()=>[]'}),d=a.w.document;await a.init;
  d.querySelector('[data-open-profile="f0"]').click();await pause();
  a.w.__emitAuth('SIGNED_OUT',null);await pause();
  assert.equal(d.getElementById('modalExpediente').hidden,true);
  assert.equal(d.getElementById('btnGuardarInspeccion').disabled,true);
  assert.equal(d.getElementById('profileEvidenceGallery').children.length,0);
  a.w.__mapPhotos({f0:'https://example.org/private.jpg'});await pause();
  assert.ok(a.w.__mapSources.every(f=>!f._fotoMapa));a.dom.window.close();
});

test('paginated reads retain every inspection beyond the first API response', async () => {
  const extra=Array.from({length:1100},(_,n)=>({id:'large'+n,fuente_id:'f0',fecha:'2026-11-13T10:00:00Z',parametro:'DBO5',matriz:'agua',unidad:'mg/L',valor:20,estado:'bueno'}));
  const a=app(false,extra);await a.init;
  assert.equal((await a.evaluate('DB.getInspecciones()')).length,1115);
  assert.match(a.w.document.getElementById('paginacionHistorico').textContent,/1115/);
  a.dom.window.close();
});

test('one unavailable private photo does not hide the rest of the evidence', async () => {
  const a=app(false,[],{evidence:[{id:'photo1',fuente_id:'f0',photo_url:'https://example.org/valid.jpg'},{id:'photo2',fuente_id:'f0',ruta_archivo:'missing.jpg'}]});await a.init;
  a.evaluate('DB.client().storage={from:()=>({createSignedUrl:async()=>{throw Error("Unavailable")}})}');
  const photos=await a.evaluate('DB.getEvidencias("f0")');assert.equal(photos.length,2);assert.equal(photos[0].url,'https://example.org/valid.jpg');assert.equal(photos[1].url,null);
  a.dom.window.close();
});

test('closing a profile during photo upload cannot reopen it or submit twice', async () => {
  const a=app(),d=a.w.document;await a.init;
  a.evaluate('Auth.user=()=>({id:"inspector"});DB.getEvidencias=async()=>[];DB.getEvidenciasMapa=async()=>({});window.__uploads=0;DB.addEvidencia=()=>{window.__uploads++;return new Promise(resolve=>{window.__finishUpload=resolve;})}');
  d.querySelector('[data-open-profile="f0"]').click();await pause();
  d.getElementById('profilePhotoUrl').value='https://example.org/photo.jpg';
  const form=d.getElementById('profileEvidenceForm');form.dispatchEvent(new a.w.Event('submit',{cancelable:true}));form.dispatchEvent(new a.w.Event('submit',{cancelable:true}));
  assert.equal(a.w.__uploads,1);d.getElementById('btnCloseProfile').click();a.w.__finishUpload();await pause();await pause();await pause();
  assert.equal(d.getElementById('modalExpediente').hidden,true);a.dom.window.close();
});

test('CSV keeps the newest file and enables save after signing in', async () => {
  const a=app(),d=a.w.document;await a.init;
  const input=d.getElementById('csvFile');let oldResolve;
  const csv=name=>'fuente,medio,parametro,valor,unidad,fecha,responsable,referencia\n'+name+',agua,Turbidez,12,NTU,2026-11-13T09:00:00-05:00,Laboratorio,https://example.org/informe';
  Object.defineProperty(input,'files',{configurable:true,value:[{size:100,text:()=>new Promise(resolve=>{oldResolve=resolve;})}]});input.dispatchEvent(new a.w.Event('change'));
  Object.defineProperty(input,'files',{configurable:true,value:[{size:100,text:async()=>csv('Estación 1')}]});input.dispatchEvent(new a.w.Event('change'));await pause();
  oldResolve(csv('Estación 0'));await pause();
  assert.match(d.getElementById('csvPreview').textContent,/Estación 1/);assert.doesNotMatch(d.getElementById('csvPreview').textContent,/Estación 0/);
  assert.equal(d.getElementById('csvCommit').disabled,true);a.w.__emitAuth('SIGNED_IN',{id:'inspector'});await pause();
  assert.equal(d.getElementById('csvCommit').disabled,false);a.dom.window.close();
});

test('failed logout reports failure and preserves the session for retry', async () => {
  const a=app(false,[],{user:{id:'inspector'},beforeInit:'DB.getEvidenciasMapa=async()=>({})'});await a.init;
  a.evaluate('DB.client().auth.signOut=async()=>({error:Error("Network error")})');
  await assert.rejects(a.evaluate('Auth.logout()'),/No se pudo cerrar/);
  assert.equal(a.evaluate('Auth.user().id'),'inspector');a.dom.window.close();
});

test('data request timeout still applies while the response body is loading', async () => {
  const a=app();await a.init;let abort;
  const original=a.w.setTimeout;
  a.w.setTimeout=(fn,delay,...args)=>delay===10000?(abort=fn,0):original(fn,delay,...args);
  a.w.fetch=async(_input,{signal})=>({body:{},arrayBuffer:()=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new a.w.DOMException('Timeout','AbortError')),{once:true}))});
  const request=a.w.__sdkFetch('https://example.org/slow');await pause();abort();
  await assert.rejects(request,/Timeout/);a.w.setTimeout=original;a.dom.window.close();
});

test('contact does not submit twice and recovers after a network failure', async () => {
  const a=app(),d=a.w.document;await a.init;let calls=0,reject;
  a.w.fetch=()=>{calls++;return new Promise((_resolve,fail)=>{reject=fail;});};
  const form=d.getElementById('contactForm');
  for(const [field,value] of Object.entries({nombre:'Persona Apellido',email:'persona@example.org',tipo:'Comentario',celular:'60001234',comentario:'Comentario de revisión del sitio.'})){
    const el=form.elements.namedItem(field);if(el)el.value=value;
  }
  const email=form.querySelector('[type="email"]');email.value='persona@example.org';
  form.dispatchEvent(new a.w.Event('submit',{cancelable:true}));form.dispatchEvent(new a.w.Event('submit',{cancelable:true}));
  assert.equal(calls,1);reject(Error('Offline'));await pause();
  assert.equal(form.querySelector('[type="submit"]').disabled,false);
  assert.match(d.getElementById('contactFormStatus').textContent,/No pudimos/);
  assert.equal(form.elements.namedItem('nombre').value,'Persona Apellido');a.dom.window.close();
});


test('criteria stay outside source tabs and show only the chosen parameter', async () => {
  const a=app(),d=a.w.document;await a.init;
  assert.equal(d.querySelector('.criteria-panel').parentElement.className,'workspace');
  assert.equal(d.getElementById('tab-resumen').contains(d.getElementById('measurementGuide')),false);
  d.getElementById('guideParameter').value='DBO5';d.getElementById('guideParameter').dispatchEvent(new a.w.Event('change'));
  assert.match(d.getElementById('measurementGuide').textContent,/50 mg\/L/);
  assert.doesNotMatch(d.getElementById('measurementGuide').textContent,/Potenciometría/);
  d.getElementById('guideMatrix').value='aire';d.getElementById('guideMatrix').dispatchEvent(new a.w.Event('change'));
  d.getElementById('guideParameter').value='PM2.5 (promedio 24 h)';d.getElementById('guideParameter').dispatchEvent(new a.w.Event('change'));
  assert.match(d.getElementById('measurementGuide').textContent,/15 µg\/m³/);
  assert.match(d.getElementById('measurementGuide').textContent,/Sin umbral configurado/);
  assert.match(d.getElementById('measurementGuide').textContent,/no se aplica automáticamente/);
  assert.equal(d.getElementById('fMatriz').value,'agua');a.dom.window.close();
});

test('expanded source and history views preserve paging and return to the map for entry', async () => {
  const a=app(),d=a.w.document;await a.init;
  d.querySelector('[data-tab="historico"]').click();
  d.querySelector('#tab-historico [data-expand-workspace]').click();
  assert.equal(d.querySelector('.workspace').classList.contains('workspace--expanded'),true);
  assert.equal(d.querySelector('#tab-historico [data-expand-workspace]').getAttribute('aria-pressed'),'true');
  d.querySelector('[data-history-page="2"]').click();assert.equal(d.querySelectorAll('#tablaHistorico tbody tr').length,6);
  d.querySelector('[data-view-map]').click();await pause();
  assert.equal(d.querySelector('.workspace').classList.contains('workspace--expanded'),false);
  d.querySelector('#tab-historico [data-expand-workspace]').click();
  d.querySelector('[data-tab="resumen"]').click();assert.equal(d.getElementById('tab-resumen').classList.contains('is-active'),true);
  d.querySelector('[data-tab="inspeccion"]').click();
  assert.equal(d.querySelector('.workspace').classList.contains('workspace--expanded'),false);
  assert.equal(d.querySelector('#tab-historico [data-expand-workspace]').getAttribute('aria-pressed'),'false');a.dom.window.close();
});

test('technical guidance remains readable when configured criteria fail to load', async () => {
  const a=app(true),d=a.w.document;await a.init;
  assert.match(d.getElementById('measurementGuide').textContent,/No se pudieron consultar/);
  assert.match(d.getElementById('measurementGuide').textContent,/Guía técnica de referencia/);
  a.recover();d.getElementById('btnRetryConnection').click();await pause();await pause();await pause();
  assert.doesNotMatch(d.getElementById('measurementGuide').textContent,/No se pudieron consultar/);a.dom.window.close();
});
