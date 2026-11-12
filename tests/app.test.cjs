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
  const fuentes = Array.from({ length: 12 }, (_, i) => ({ id: `f${i}`, nombre: `Estación ${i}`, tipo: 'agua', lat: 8.9, lng: -79.5 }));
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
      from(table) { const q = { select() { return q; }, order() { return q; }, then(resolve, reject) { return Promise.resolve().then(async () => { await pause(); return failed ? { data: null, error: new Error('Failed to fetch') } : { data: ({ fuentes, limites, inspecciones })[table] || [], error: null }; }).then(resolve, reject); } }; return q; }
    };
  } };
  evaluate('const SIDMap = { init(){}, isInitialized:()=>true, invalidateSize(){}, render(){}, focusFuente(id){window.__focused=id;} };');
  for (const file of ['config', 'db', 'auth', 'inspections', 'export', 'ui']) evaluate(fs.readFileSync(`js/${file}.js`, 'utf8'));
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
