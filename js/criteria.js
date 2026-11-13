const SIDCriteria = (() => {
  let status='loading';
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const number=value=>Number(value).toLocaleString('es-PA',{maximumFractionDigits:6});
  function interval(profile){
    const min=profile.min==null?'Sin mínimo publicado':`${profile.minExclusive?'>':'≥'} ${number(profile.min)} ${esc(profile.unidad)}`;
    const max=profile.max==null?'Sin máximo publicado':`${profile.maxExclusive?'<':'≤'} ${number(profile.max)} ${esc(profile.unidad)}`;
    return `<dl class="criteria-range"><div><dt>Mínimo</dt><dd>${min}</dd></div><div><dt>Máximo</dt><dd>${max}</dd></div></dl>`;
  }
  function bandRange(band,unit){
    if(band.min==null)return `${band.maxExclusive?'<':'≤'} ${number(band.max)} ${esc(unit)}`;
    if(band.max==null)return `${band.minExclusive?'>':'≥'} ${number(band.min)} ${esc(unit)}`;
    return `${number(band.min)}–${number(band.max)} ${esc(unit)}`;
  }
  function render(){
    const profile=MeasurementGuide.byId(document.getElementById('guideContext').value);
    const holder=document.getElementById('measurementGuide');
    if(!profile){holder.innerHTML='<p class="criteria-empty">No hay un criterio verificado para este parámetro. Documenta el uso, método y referencia del sitio.</p>';return;}
    const numeric=profile.min!=null||profile.max!=null||profile.bands;
    const title=({norma:'Norma panameña · ámbito específico',guia:'Guía internacional · ámbito específico',indice:'Categorías de referencia internacional',contextual:'Requiere información del sitio'})[profile.tipo];
    holder.innerHTML=`<section class="criteria-applied"><h3>${esc(title)}</h3><p class="criteria-context">${esc(profile.norma)}</p>${status==='error'?'<p class="criteria-empty">No se pudieron consultar los parámetros del servidor; se muestra el catálogo de referencia incluido en la aplicación.</p>':''}${profile.bands?`<div class="table-scroll"><table class="data-table criteria-bands"><thead><tr><th>Categoría</th><th>Concentración</th></tr></thead><tbody>${profile.bands.map(band=>`<tr><td><span class="status-pill ${band.estado==='bueno'?'status-pill--ok':band.estado==='intermedio'?'status-pill--mid':'status-pill--alert'}">${esc(band.label)}</span></td><td>${bandRange(band,profile.unidad)}</td></tr>`).join('')}</tbody></table></div>`:numeric?`${interval(profile)}<p class="criteria-disclaimer">Dentro del intervalo: en referencia. Fuera del intervalo: alerta por comparación. Este perfil no publica una banda preventiva adicional.</p>`:'<p class="criteria-empty">No corresponde asignar mínimos, máximos o niveles de riesgo universales con la información disponible.</p>'}<details class="criteria-notes"><summary>Método, alcance y documento</summary><p>${esc(profile.metodo)}</p><p>${esc(profile.nota)}</p><a href="${esc(profile.fuente)}" target="_blank" rel="noopener noreferrer">Documento de referencia</a>${profile.fuenteComplementaria?` · <a href="${esc(profile.fuenteComplementaria)}" target="_blank" rel="noopener noreferrer">Modificación vigente consultada</a>`:''}<p>Revisado: ${esc(profile.verificadoEn)}.</p></details><p class="criteria-disclaimer">${profile.tipo==='norma'?'Confirmar uso, método y condiciones. Esta comparación no certifica cumplimiento legal ni aptitud del sitio.':'Referencia orientativa; no sustituye una norma aplicable en Panamá ni acredita ausencia de riesgo.'}</p></section>`;
  }
  function contexts(){
    const select=document.getElementById('guideContext'),previous=select.value;
    const profiles=MeasurementGuide.forParameter(document.getElementById('guideMatrix').value,document.getElementById('guideParameter').value);
    select.replaceChildren(...profiles.map(p=>{const option=document.createElement('option');option.value=p.id;option.textContent=p.contexto;return option;}));
    select.disabled=!profiles.length;
    if(profiles.some(p=>p.id===previous))select.value=previous;
    render();
  }
  function refresh(){
    const matrix=document.getElementById('guideMatrix').value,select=document.getElementById('guideParameter'),previous=select.value;
    const names=[...new Set([...(status==='ready'?Inspections.limites.filter(item=>item.matriz===matrix).map(item=>item.parametro):[]),...MeasurementGuide.items.filter(item=>item.matriz===matrix).map(item=>item.parametro)])];
    select.replaceChildren(...names.map(name=>{const option=document.createElement('option');option.value=name;option.textContent=name;return option;}));
    if(names.includes(previous))select.value=previous;
    contexts();
  }
  function init(){
    document.getElementById('guideMatrix').addEventListener('change',refresh);
    document.getElementById('guideParameter').addEventListener('change',contexts);
    document.getElementById('guideContext').addEventListener('change',render);
    const mobile=window.matchMedia('(max-width: 980px)'),details=document.getElementById('criteriaDetails');
    details.open=!mobile.matches;mobile.addEventListener?.('change',event=>{details.open=!event.matches;});refresh();
  }
  function setStatus(value){status=value;refresh();}
  return {init,setStatus};
})();
