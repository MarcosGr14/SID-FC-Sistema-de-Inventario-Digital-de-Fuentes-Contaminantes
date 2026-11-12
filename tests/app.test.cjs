const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('index.html', 'utf8');
const pause = () => new Promise(resolve => setTimeout(resolve, 30));
function app(offline = false, extra = []) {
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
  w.supabase = { createClient() {
    clients++;
    return { auth: { getSession: async () => ({ data: { session: null } }), signOut: async () => ({ error: null }) },
      from(table) { const q = { select() { return q; }, insert(records) { w.__insertPayload=records; w.__insertCalls=(w.__insertCalls||0)+1;return q; }, order() { return q; }, then(resolve, reject) { return Promise.resolve().then(async () => { await pause(); return failed ? { data: null, error: new Error('Failed to fetch') } : { data: ({ fuentes, limites, inspecciones })[table] || [], error: null }; }).then(resolve, reject); } }; return q; }
    };
  } };
  evaluate('const SIDMap = { init(){}, isInitialized:()=>true, invalidateSize(){}, render(){}, focusFuente(id){window.__focused=id;} };');
  for (const file of ['config', 'db', 'auth', 'guide', 'inspections', 'export', 'chart', 'workflows', 'ui']) evaluate(fs.readFileSync(`js/${file}.js`, 'utf8'));
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
