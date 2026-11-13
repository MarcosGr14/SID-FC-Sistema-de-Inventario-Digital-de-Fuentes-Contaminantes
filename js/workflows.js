const SIDWorkflows = (() => {
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const compact = (f) => String(f.ubicacion || '').split(';')[0].split('. ')[0].slice(0,100);
  function parseCSV(text) {
    const first = text.replace(/^\uFEFF/,'').split(/\r?\n/)[0];
    const delimiter = first.includes(';') ? ';' : ',';
    const rows=[]; let row=[], field='', quoted=false;
    const input=text.replace(/^\uFEFF/,'');
    for(let i=0;i<input.length;i++) {
      const c=input[i];
      if(c==='"') { if(quoted&&input[i+1]==='"'){field+='"';i++;} else quoted=!quoted; }
      else if(c===delimiter&&!quoted){row.push(field.trim());field='';}
      else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&input[i+1]==='\n')i++;row.push(field.trim());if(row.some(Boolean))rows.push(row);row=[];field='';}
      else field+=c;
    }
    if(quoted) throw Error('Hay comillas sin cerrar en el CSV.');
    row.push(field.trim());if(row.some(Boolean))rows.push(row);
    if(rows.length<2)throw Error('El archivo necesita una cabecera y al menos una medición.');
    const headers=rows.shift().map(h=>h.toLowerCase());
    if(new Set(headers).size!==headers.length)throw Error("La cabecera contiene columnas duplicadas.");
    const required=['fuente','medio','parametro','valor','unidad','fecha','responsable','referencia'];
    if(required.some(h=>!headers.includes(h)))throw Error('Columnas requeridas: '+required.join(', '));
    if(rows.length>100)throw Error('Importa un máximo de 100 mediciones por archivo.');
    return rows.map((r,index)=>{if(r.length!==headers.length)throw Error(`Fila ${index+2}: número de columnas incorrecto.`);return Object.fromEntries(headers.map((h,n)=>[h,r[n]]));});
  }
  function prepareImport(rows, fuentes, inspecciones) {
    const key=i=>[i.fuente_id,new Date(i.fecha).toISOString(),i.matriz,i.parametro,Number(i.valor),i.unidad,i.referencia_dato].join('|');
    const seen=new Set(inspecciones.map(key));let duplicados=0;
    const validos=[];
    rows.forEach((r,n)=>{
      const fail=(m)=>{throw Error(`Fila ${n+2}: ${m}`);};
      const f=fuentes.find(f=>f.id===r.fuente||f.nombre.toLocaleLowerCase()===r.fuente.toLocaleLowerCase());
      if(!f)fail('registra primero la fuente «'+r.fuente+'».');
      if(!['agua','aire','suelo'].includes(r.medio))fail('medio válido: agua, aire o suelo.');
      if(!r.valor||!Number.isFinite(Number(r.valor)))fail('valor numérico inválido.');
      if(!r.parametro||!r.unidad||!r.responsable)fail('completa parámetro, unidad y responsable.');
      const known=Inspections.limiteDe(r.medio,r.parametro);
      const normalizeUnit=u=>u.replaceAll('μ','µ').replaceAll('³','3').replaceAll(' ','');
      if(known&&normalizeUnit(known.unidad)!==normalizeUnit(r.unidad))fail('la unidad de '+r.parametro+' debe ser '+known.unidad+'. Convierte el resultado antes de importarlo.');
      if(Number(r.valor)<0&&r.unidad!=='°C')fail('una concentración no puede ser negativa.');
      if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}.*(?:Z|[+-]\d{2}:\d{2})$/.test(r.fecha)||!Number.isFinite(Date.parse(r.fecha)))fail('usa una fecha ISO con zona horaria, por ejemplo 2026-11-12T09:00:00-05:00.');
      try{const u=new URL(r.referencia);if(u.protocol!=='https:')fail('la referencia debe ser HTTPS.');}catch{fail('enlace de referencia inválido.');}
      const i={fuente_id:f.id,matriz:r.medio,parametro:r.parametro,valor:Number(r.valor),unidad:r.unidad,fecha:new Date(r.fecha).toISOString(),inspector:r.responsable,referencia_dato:r.referencia,metodo_muestreo:r.metodo||'Transcripción de informe externo',observaciones:r.observaciones||'',origen_dato:'oficial',estado:'sin_referencia',cumple:true};
      const k=key(i);if(seen.has(k)){duplicados++;return;}seen.add(k);validos.push(i);
    });
    return {validos,duplicados};
  }
  function init(api) {
    const picker=document.getElementById('sourcePicker'), search=document.getElementById('sourceSearch'),options=document.getElementById('sourceOptions');
    function renderSources() {
      const term=search.value.trim().toLocaleLowerCase();const selected=document.getElementById('fFuente').value;
      const rows=api.getFuentes().filter(f=>(f.nombre+' '+f.ubicacion).toLocaleLowerCase().includes(term));
      options.innerHTML=rows.map(f=>`<button type="button" role="option" aria-selected="${f.id===selected}" data-source-choice="${esc(f.id)}"><span class="source-medium source-medium--${esc(f.tipo)}">${esc(f.tipo)}</span><span><strong>${esc(f.nombre)}</strong><small>${esc(compact(f))}</small></span></button>`).join('')||'<p class="field-help">No hay fuentes que coincidan.</p>';
    }
    picker.addEventListener('toggle',()=>{if(picker.open){renderSources();search.focus();}});search.addEventListener('input',renderSources);
    search.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();options.querySelector('button')?.focus();}if(e.key==='Escape'){picker.open=false;picker.querySelector('summary').focus();}});
    options.addEventListener('click',e=>{const b=e.target.closest('[data-source-choice]');if(!b)return;document.getElementById('fFuente').value=b.dataset.sourceChoice;document.getElementById('fFuente').dispatchEvent(new Event('change',{bubbles:true}));picker.open=false;picker.querySelector('summary').focus();});
    options.addEventListener('keydown',e=>{const buttons=[...options.querySelectorAll('button')],n=buttons.indexOf(document.activeElement);if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();buttons[(n+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}if(e.key==='Escape')picker.open=false;});
    const guide=document.getElementById('measurementGuide');
    function renderGuide(){const matrix=document.getElementById('guideMatrix').value;guide.innerHTML=MeasurementGuide.items.filter(g=>g.matriz===matrix).map(g=>`<article class="guide-card"><h4>${esc(g.parametro)}</h4><strong>${esc(MeasurementGuide.range(g))}</strong><dl class="guide-ranges"><div><dt>Mínimo</dt><dd>${g.min==null?"No establecido":esc(g.min+" "+g.unidad)}</dd></div><div><dt>Máximo</dt><dd>${g.max==null?"Según sitio y uso":esc(g.max+" "+g.unidad)}</dd></div></dl><small>${esc(g.contexto)}</small><p>${esc(g.metodo)}</p><p>${esc(g.nota)}</p>${g.fuente?`<a href="${esc(g.fuente)}" target="_blank" rel="noopener noreferrer">Consultar referencia</a>`:''}</article>`).join('');}
    document.getElementById('guideMatrix').addEventListener('change',renderGuide);renderGuide();
    const help=document.getElementById('externalRecordHelp');
    help.insertAdjacentHTML('beforeend',`<details class="csv-import"><summary>Importar un CSV de mediciones</summary><p>Columnas: fuente, medio, parametro, valor, unidad, fecha, responsable, referencia. Registra antes los sitios que no existan.</p><button id="csvTemplate" type="button" class="btn btn--ghost">Descargar plantilla</button><label class="field"><span>Archivo CSV · hasta 100 filas</span><input id="csvFile" type="file" accept=".csv,text/csv"></label><div id="csvPreview" aria-live="polite"></div><button id="csvCommit" type="button" class="btn btn--accent" disabled>Guardar registros revisados</button><p id="csvStatus" role="status"></p></details>`);
    document.getElementById('btnDatoExterno').addEventListener('click',()=>{help.hidden=false;document.getElementById('fOrigenDato').value='oficial';document.getElementById('fReferenciaDato').required=true;document.getElementById('fReferenciaDato').placeholder='https://institucion.gob.pa/informe';});
    document.getElementById('csvTemplate').onclick=()=>{const blob=new Blob(['fuente,medio,parametro,valor,unidad,fecha,responsable,referencia\n"Nombre del sitio",agua,Turbidez,12,NTU,2026-11-12T09:00:00-05:00,"Institución responsable",https://institucion.gob.pa/informe\n'],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='plantilla-mediciones.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
    let pending=[], reading=0, saving=false;
    const commit=document.getElementById('csvCommit'),status=document.getElementById('csvStatus'),fileInput=document.getElementById('csvFile'),preview=document.getElementById('csvPreview');
    const updateCommit=()=>{commit.disabled=saving||!pending.length||!Auth.user();};
    document.addEventListener('sidfc:sessionchange',updateCommit);
    fileInput.addEventListener('change',async e=>{
      if(saving)return;
      const version=++reading,file=e.target.files[0];pending=[];updateCommit();preview.replaceChildren();status.textContent='';
      if(!file)return;
      try{
        if(file.size>1048576)throw Error('El CSV supera 1 MB.');
        const text=await file.text();if(version!==reading)return;
        const result=prepareImport(parseCSV(text),api.getFuentes(),api.getInspecciones());pending=result.validos;
        preview.innerHTML=`<p>${pending.length} registros válidos · ${result.duplicados} duplicados omitidos.</p><div class="table-scroll"><table class="data-table"><thead><tr><th>Sitio</th><th>Parámetro</th><th>Valor</th></tr></thead><tbody>${pending.slice(0,5).map(i=>`<tr><td>${esc(api.getFuentes().find(f=>f.id===i.fuente_id).nombre)}</td><td>${esc(i.parametro)}</td><td>${esc(i.valor)} ${esc(i.unidad)}</td></tr>`).join('')}</tbody></table></div>`;
        status.textContent=pending.length>5?'Vista previa de las primeras 5 filas.':'';updateCommit();
      }catch(error){if(version!==reading)return;pending=[];preview.replaceChildren();status.textContent=error.message;updateCommit();}
    });
    commit.onclick=async()=>{
      if(saving||!Auth.user()||!pending.length)return;
      saving=true;fileInput.disabled=true;updateCommit();
      try{
        const checked=prepareImport(pending.map(i=>({fuente:i.fuente_id,medio:i.matriz,parametro:i.parametro,valor:String(i.valor),unidad:i.unidad,fecha:i.fecha,responsable:i.inspector,referencia:i.referencia_dato,metodo:i.metodo_muestreo,observaciones:i.observaciones})),api.getFuentes(),api.getInspecciones());
        if(!checked.validos.length){status.textContent='Los registros ya existen.';pending=[];return;}
        await DB.addInspeccionesExternas(checked.validos);pending=[];status.textContent='Importación guardada.';
        try{await api.refresh();}catch{status.textContent='Importación guardada. Recarga el inventario para consultar los resultados.';}
      }catch(error){status.textContent='No se guardó la importación: '+error.message;}
      finally{saving=false;fileInput.disabled=false;updateCommit();}
    };
  }
  return {init,parseCSV,prepareImport,compact};
})();
