const SIDCriteria = (() => {
  let status = "loading";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const number = value => Number(value).toLocaleString("es-PA", {maximumFractionDigits:6});
  const bound = (value, unit) => value == null ? "No establecido" : `${number(value)} ${esc(unit)}`;
  function range(min, max, unit) {
    return `<dl class="criteria-range"><div><dt>Mínimo</dt><dd>${bound(min,unit)}</dd></div><div><dt>Máximo</dt><dd>${bound(max,unit)}</dd></div></dl>`;
  }
  function render() {
    const matrix = document.getElementById("guideMatrix").value;
    const parameter = document.getElementById("guideParameter").value;
    const configured = status === "ready" ? Inspections.limites.find(item => item.matriz === matrix && item.parametro === parameter) : null;
    const guide = MeasurementGuide.find(matrix, parameter);
    const applied = status !== "ready"
      ? `<p class="criteria-empty">${status === "error" ? "No se pudieron consultar los criterios configurados. Usa Reintentar conexión." : "Cargando criterios configurados…"}</p>`
      : configured?.limite != null
        ? `${range(null,configured.limite,configured.unidad)}${configured.umbral_aviso != null ? `<p class="criteria-warning">Preventivo desde ${bound(configured.umbral_aviso,configured.unidad)}</p>` : ""}<details class="criteria-notes"><summary>Referencia y vigencia</summary><p>${esc(configured.referencia_normativa || "Referencia pendiente de documentación; confirmar ámbito y vigencia antes de uso oficial.")}</p>${configured.vigente_desde || configured.vigente_hasta ? `<p>Vigencia: ${esc(configured.vigente_desde || "sin inicio registrado")} a ${esc(configured.vigente_hasta || "sin fin registrado")}.</p>` : ""}</details>`
        : '<p class="criteria-empty">Sin umbral configurado para este parámetro. Puedes documentar un intervalo específico al registrar la medición.</p>';
    document.getElementById("measurementGuide").innerHTML = `<section class="criteria-applied"><h3>Criterio configurado SID-FC</h3>${applied}</section>${guide ? `<section class="criteria-guidance"><h3>Guía técnica de referencia</h3><p class="criteria-context">${esc(guide.contexto)}</p>${range(guide.min,guide.max,guide.unidad)}<details class="criteria-notes"><summary>Método, alcance y referencia</summary><p>${esc(guide.metodo)}</p><p>${esc(guide.nota)}</p>${guide.fuente ? `<a href="${esc(guide.fuente)}" target="_blank" rel="noopener noreferrer">Consultar documento</a>` : ""}</details><p class="criteria-disclaimer">Esta guía no se aplica automáticamente como límite de evaluación.</p></section>` : ""}`;
  }
  function refresh() {
    const matrix = document.getElementById("guideMatrix").value;
    const select = document.getElementById("guideParameter"), previous = select.value;
    const names = [...new Set([
      ...(status === "ready" ? Inspections.limites.filter(item=>item.matriz===matrix).map(item=>item.parametro) : []),
      ...MeasurementGuide.items.filter(item=>item.matriz===matrix).map(item=>item.parametro)
    ])];
    select.replaceChildren(...names.map(name=>{
      const option = document.createElement("option"); option.value=name; option.textContent=name; return option;
    }));
    if (names.includes(previous)) select.value=previous;
    render();
  }
  function init() {
    document.getElementById("guideMatrix").addEventListener("change", refresh);
    document.getElementById("guideParameter").addEventListener("change", render);
    const mobile = window.matchMedia("(max-width: 980px)");
    const details = document.getElementById("criteriaDetails");
    details.open = !mobile.matches;
    mobile.addEventListener?.("change", event=>{ details.open=!event.matches; });
    refresh();
  }
  function setStatus(value) { status=value; refresh(); }
  return {init,setStatus};
})();
