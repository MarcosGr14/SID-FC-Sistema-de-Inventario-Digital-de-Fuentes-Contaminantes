
const UI = (() => {
  let datosDisponibles = false;
  let cargandoDatos = false;
  let fuentes = [];
  let inspecciones = [];
  let filtroActual = "todas";
  let paginaHistorico = 1;
  let paginaFuentes = 1;
  let paginaHistorialPerfil = 1;
  let paginaHistorialFiltrada = [];
  let fuentePerfilActiva = null;
  let solicitudPerfil = 0;
  const solicitudesEvidencia = new Map();
  let versionDatos = 0;
  let versionFotos = 0;
  let abrirFuenteDespuesDelLogin = false;
  let regresarAInspeccionDespuesDeFuente = false;
  let abrirRegistroNuevaFuente = null;
  const HISTORICO_POR_PAGINA = 6;
  const FUENTES_POR_PAGINA = 5;
  const HISTORIAL_PERFIL_POR_PAGINA = 5;
  const NOMBRES_CUENTAS_EQUIPO = {
    "marcos.gaitan@sidfc.test": "Marcos Gaitan",
    "diego.cedeno@sidfc.test": "Diego Cedeño",
    "isabella.castro@sidfc.test": "Isabella Castro",
    "kevin.florez@sidfc.test": "Kevin Florez",
    "madeleyn.delgado@sidfc.test": "Madeleyn Delgado",
  };
  function toast(msg, isError = false) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.toggle("is-error", isError);
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add("is-visible"));
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      el.classList.remove("is-visible");
      setTimeout(() => (el.hidden = true), 250);
    }, 2600);
  }

  function fmtFecha(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("es-PA", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[char]);
  }
  function fuentesConEstado() {
    return fuentes.map((f) => {
      const propias = inspecciones
        .filter((i) => i.fuente_id === f.id)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      const ultima = propias[0];
      const visita = ultima ? propias.filter((i) => new Date(i.fecha).getTime() === new Date(ultima.fecha).getTime()) : [];
      const prioridad = { alerta: 4, intermedio: 3, sin_referencia: 2, bueno: 1 };
      const estado = visita.length ? visita.map(estadoDe).sort((a, b) => (prioridad[b] || 0) - (prioridad[a] || 0))[0] : "sin_datos";
      return { ...f, estado, ultimaMedicion: ultima ? fmtFecha(ultima.fecha) : null };
    });
  }
  function renderStats() {
    const conEstado = fuentesConEstado();
    const total = conEstado.length;
    const ok = conEstado.filter((f) => f.estado === "bueno" || f.estado === "intermedio").length;
    const alerta = conEstado.filter((f) => f.estado === "alerta").length;

    const now = new Date();
    const delMes = inspecciones.filter((i) => {
      const d = new Date(i.fecha);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    document.getElementById("statTotal").textContent = total;
    document.getElementById("statOk").textContent = ok;
    document.getElementById("statAlert").textContent = alerta;
    document.getElementById("statMes").textContent = delMes;
    document.getElementById("countTodas").textContent = `(${total})`;
  }
  function renderMap() {
    if (!SIDMap.isInitialized()) return;
    SIDMap.render(fuentesConEstado(), filtroActual, abrirExpediente);
  }
  function poblarFuentesSelect() {
    const sel = document.getElementById("fFuente");
    const ayuda = document.getElementById("fFuenteHelp");
    const seleccionada = sel.value;
    sel.innerHTML = `<option value="" disabled selected>${fuentes.length ? "Seleccionar fuente…" : "Aún no hay fuentes registradas"}</option>`;
    fuentes.forEach((f) => {
      const opt = document.createElement("option");
      opt.value = f.id;
      opt.textContent = `${f.nombre} · ${titulo(f.tipo)}`;
      sel.appendChild(opt);
    });
    if (fuentes.some(f=>String(f.id)===seleccionada)) sel.value=seleccionada;
    ayuda.textContent = fuentes.length
      ? "Cada medición se vincula al sitio seleccionado."
      : "El inventario está vacío. Crea primero una fuente o un punto puntual de evaluación; después quedará disponible aquí para registrar sus mediciones.";
    actualizarDetalleFuente();
  }

  function actualizarDetalleFuente() {
    const id = document.getElementById("fFuente")?.value;
    const fuente = fuentes.find((f) => String(f.id) === String(id));
    const detalles = document.getElementById("fFuenteDetails");
    if (!detalles) return;
    const pickerLabel = document.getElementById("sourcePickerLabel");
    if (pickerLabel) pickerLabel.textContent = fuente ? fuente.nombre : "Seleccionar fuente";
    detalles.hidden = !fuente;
    if (!fuente) return;
    const referencia = typeof SIDWorkflows === "undefined" ? fuente.ubicacion?.trim() : SIDWorkflows.compact(fuente);
    const coordenadas = `${Number(fuente.lat).toFixed(5)}, ${Number(fuente.lng).toFixed(5)}`;
    document.getElementById("fFuenteLugar").textContent = `${referencia ? `${referencia} · ` : "Ubicación"}${coordenadas}`;
  }

  function titulo(value) {
    return ({ agua: "Agua", aire: "Aire", suelo: "Suelo", sin_datos: "Sin datos", bueno: "Bajo criterio", intermedio: "Preventivo", alerta: "Alerta", sin_referencia: "Sin referencia", campo: "Campo", laboratorio: "Laboratorio", oficial: "Oficial", punto_muestreo:"Punto de monitoreo",residuos_solidos:"Residuos sólidos",erosion_suelo:"Erosión y sedimentos",extraccion_materiales:"Extracción de materiales",emision_atmosferica:"Emisión atmosférica",descarga_agua:"Descarga de agua",simulacion: "Académico" })[value] || String(value || "—").replaceAll("_", " ");
  }
  function estadoDe(i) { return i.estado || (i.cumple ? "bueno" : "alerta"); }
  function pillEstado(estado) {
    const cls = estado === "alerta" ? "status-pill--alert" : estado === "bueno" ? "status-pill--ok" : estado === "intermedio" ? "status-pill--mid" : "status-pill--unknown";
    const label = estado === "bueno" ? "Bajo criterio" : titulo(estado);
    return `<span class="status-pill ${cls}">${escapeHTML(label)}</span>`;
  }

  function poblarParametros() {
    const matriz = document.getElementById("fMatriz").value;
    const paramSel = document.getElementById("fParametro");
    const parametroPrevio = paramSel.value;
    const unidadSpan = document.getElementById("fUnidad");
    const opciones = Inspections.porMatriz(matriz);
    paramSel.innerHTML = "";
    opciones.forEach((l) => {
      const opt = document.createElement("option");
      opt.value = l.parametro;
      opt.textContent = `${l.parametro} · ${l.unidad}`;
      paramSel.appendChild(opt);
    });
    if (opciones.some(l=>l.parametro===parametroPrevio)) paramSel.value=parametroPrevio;
    unidadSpan.textContent = opciones.find(l=>l.parametro===paramSel.value)?.unidad || "";
    paramSel.onchange = () => {
      const lim = Inspections.limiteDe(matriz, paramSel.value);
      unidadSpan.textContent = lim?.unidad || "";
      mostrarGuiaParametro();
    };
    mostrarGuiaParametro();
  }

  function mostrarGuiaParametro() {
    const node = document.getElementById("measurementHint");
    if (!node || typeof MeasurementGuide === "undefined") return;
    const item = MeasurementGuide.find(document.getElementById("fMatriz").value,document.getElementById("fParametro").value);
    node.innerHTML = item ? `<strong>${escapeHTML(MeasurementGuide.range(item))}</strong><span>${escapeHTML(item.contexto)}</span><p>${escapeHTML(item.nota)}</p>` : '<p>Criterio específico del proyecto. Verifica la norma, el medio y la unidad antes de clasificar el resultado.</p>';
  }
  function ajustarMatrizFuente() {
    const fuente = fuentes.find((f) => String(f.id) === document.getElementById("fFuente").value);
    const matrizSel = document.getElementById("fMatriz");
    [...matrizSel.options].forEach((option) => { option.disabled = false; });
    if (fuente) matrizSel.value = fuente.tipo;
    poblarParametros();
    if(fuente){
      const recientes=inspecciones.filter(i=>i.fuente_id===fuente.id&&i.matriz===fuente.tipo).sort((a,b)=>new Date(b.fecha)-new Date(a.fecha));
      const elegido=recientes[0]?.parametro || ({agua:"pH",aire:"PM2.5 (promedio 24 h)",suelo:"pH"})[fuente.tipo];
      const parametro=document.getElementById("fParametro");
      if([...parametro.options].some(o=>o.value===elegido)){parametro.value=elegido;parametro.onchange?.();}
    }
    actualizarDetalleFuente();
  }
  function renderHistorico(filtroTexto = "") {
    const tbody = document.querySelector("#tablaHistorico tbody");
    const fuentesById = Object.fromEntries(fuentes.map((f) => [f.id, f.nombre]));
    const texto = filtroTexto.trim().toLowerCase();
    const filtroFuente = document.getElementById("filtroFuenteHistorico")?.value || "";
    const filtroMatriz = document.getElementById("filtroMatrizHistorico")?.value || "";
    const filtroEstado = document.getElementById("filtroEstadoHistorico")?.value || "";
    const desde = document.getElementById("filtroFechaDesde")?.value || "";
    const hasta = document.getElementById("filtroFechaHasta")?.value || "";

    const filas = [...inspecciones]
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
      .filter((i) => {
        if (filtroFuente && String(i.fuente_id) !== filtroFuente) return false;
        if (filtroMatriz && i.matriz !== filtroMatriz) return false;
        if (filtroEstado && estadoDe(i) !== filtroEstado) return false;
        const fechaLocal = new Date(i.fecha);
        const dia = Number.isNaN(fechaLocal.getTime()) ? "" : [fechaLocal.getFullYear(), String(fechaLocal.getMonth() + 1).padStart(2, "0"), String(fechaLocal.getDate()).padStart(2, "0")].join("-");
        if (desde && dia < desde) return false;
        if (hasta && dia > hasta) return false;
        if (!texto) return true;
        const nombreFuente = (fuentesById[i.fuente_id] || "").toLowerCase();
        return [nombreFuente, i.inspector, i.parametro, i.observaciones, i.referencia_dato].some((v) => String(v || "").toLowerCase().includes(texto));
      });

    const totalPaginas = Math.max(1, Math.ceil(filas.length / HISTORICO_POR_PAGINA));
    paginaHistorialFiltrada = filas;
    paginaHistorico = Math.min(paginaHistorico, totalPaginas);
    const inicio = (paginaHistorico - 1) * HISTORICO_POR_PAGINA;
    const filasPagina = filas.slice(inicio, inicio + HISTORICO_POR_PAGINA);

    tbody.innerHTML =
      filasPagina
        .map(
          (i) => `
      <tr>
        <td>${fmtFecha(i.fecha)}</td>
        <td><button class="history-map-button" type="button" data-view-map="${escapeHTML(i.fuente_id)}" title="Ver esta fuente en el mapa">${escapeHTML(fuentesById[i.fuente_id] || i.fuente_id)}<span aria-hidden="true"> ↗</span></button></td>
        <td>${titulo(i.matriz)}</td>
        <td>${escapeHTML(i.parametro)}</td>
        <td>${escapeHTML(i.valor)} ${escapeHTML(i.unidad || "")}</td>
        <td>${pillEstado(estadoDe(i))}</td>
        <td>${escapeHTML((i.inspector||"").replace(/\s*\(DEMO\)/gi,""))}</td>
        <td>${titulo(i.origen_dato || "campo")}</td>
      </tr>`
        )
        .join("") || `<tr><td colspan="8" class="table-empty">${filas.length ? "No hay coincidencias." : "Aún no hay inspecciones registradas."}</td></tr>`;
    renderPaginacionHistorico(filas.length);
  }

  function renderPaginacionHistorico(total) {
    const nav = document.getElementById("paginacionHistorico");
    nav.replaceChildren();
    nav.hidden = total <= HISTORICO_POR_PAGINA;
    if (nav.hidden) return;

    const totalPaginas = Math.ceil(total / HISTORICO_POR_PAGINA);
    const agregarBoton = (texto, pagina, { disabled = false, actual = false, etiqueta = texto } = {}) => {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = `pagination__button${actual ? " is-current" : ""}`;
      boton.textContent = texto;
      boton.disabled = disabled;
      boton.setAttribute("aria-label", etiqueta);
      if (actual) boton.setAttribute("aria-current", "page");
      boton.dataset.historyPage = pagina;
      nav.appendChild(boton);
    };

    agregarBoton("‹", paginaHistorico - 1, { disabled: paginaHistorico === 1, etiqueta: "Página anterior" });
    let desde = Math.max(1, paginaHistorico - 2);
    let hasta = Math.min(totalPaginas, desde + 4);
    desde = Math.max(1, hasta - 4);
    for (let pagina = desde; pagina <= hasta; pagina += 1) {
      agregarBoton(String(pagina), pagina, { actual: pagina === paginaHistorico, etiqueta: `Página ${pagina}` });
    }
    agregarBoton("›", paginaHistorico + 1, { disabled: paginaHistorico === totalPaginas, etiqueta: "Página siguiente" });

    const estado = document.createElement("span");
    estado.className = "pagination__status";
    estado.setAttribute("aria-live", "polite");
    const primero = (paginaHistorico - 1) * HISTORICO_POR_PAGINA + 1;
    const ultimo = Math.min(paginaHistorico * HISTORICO_POR_PAGINA, total);
    estado.textContent = `${primero}–${ultimo} de ${total} inspecciones`;
    nav.appendChild(estado);
  }
  function renderPaginacionLista(id, total, porPagina, pagina, onChange) {
    const nav = document.getElementById(id);
    nav.replaceChildren();
    const totalPaginas = Math.ceil(total / porPagina);
    nav.hidden = totalPaginas <= 1;
    if (nav.hidden) return;
    const add = (label, target, disabled = false) => {
      const button = document.createElement("button");
      button.type = "button"; button.className = `pagination__button${target === pagina ? " is-current" : ""}`;
      button.textContent = label; button.disabled = disabled; button.setAttribute("aria-label", label === "‹" ? "Página anterior" : label === "›" ? "Página siguiente" : `Página ${target}`);
      if (target === pagina) button.setAttribute("aria-current", "page");
      button.addEventListener("click", () => onChange(target)); nav.append(button);
    };
    add("‹", pagina - 1, pagina === 1);
    let start = Math.max(1, pagina - 2), end = Math.min(totalPaginas, start + 4);
    start = Math.max(1, end - 4);
    for (let n = start; n <= end; n += 1) add(String(n), n);
    add("›", pagina + 1, pagina === totalPaginas);
    const status = document.createElement("span"); status.className = "pagination__status";
    status.textContent = `${(pagina - 1) * porPagina + 1}–${Math.min(pagina * porPagina, total)} de ${total}`; nav.append(status);
  }
  function renderResumen() {
    const tbodyFuentes = document.querySelector("#tablaResumenFuentes tbody");
    const listadoFuentes = fuentesConEstado();
    const paginasFuentes = Math.max(1, Math.ceil(listadoFuentes.length / FUENTES_POR_PAGINA));
    paginaFuentes = Math.min(paginaFuentes, paginasFuentes);
    tbodyFuentes.innerHTML = listadoFuentes.slice((paginaFuentes - 1) * FUENTES_POR_PAGINA, paginaFuentes * FUENTES_POR_PAGINA)
      .map(
        (f) => `
      <tr>
        <td>${escapeHTML(f.nombre)}</td>
        <td>${escapeHTML(titulo(f.tipo))} · ${escapeHTML(titulo(f.categoria_fuente || "otro"))}</td>
        <td>${escapeHTML(f.ubicacion || "Sin referencia")}<br><small>${Number(f.lat).toFixed(5)}, ${Number(f.lng).toFixed(5)}</small></td>
        <td>${f.ultimaMedicion || "Sin mediciones"}</td>
        <td>${pillEstado(f.estado === "sin_datos" ? "sin_referencia" : f.estado)}</td>
        <td><button class="btn btn--small btn--ghost" type="button" data-open-profile="${escapeHTML(f.id)}">Ver expediente</button></td>
      </tr>`
      )
      .join("") || `<tr><td colspan="6" class="table-empty">Aún no hay fuentes registradas.</td></tr>`;

    renderPaginacionLista("paginacionFuentes", listadoFuentes.length, FUENTES_POR_PAGINA, paginaFuentes, (pagina) => { paginaFuentes = pagina; renderResumen(); });
    tbodyFuentes.onclick = (event) => {
      const button = event.target.closest("[data-open-profile]");
      if (button) abrirExpediente(button.dataset.openProfile);
    };
  }
  function fichaTecnica(r) {
    const criterio = r.criterio_minimo != null || r.criterio_maximo != null;
    if (!r.observaciones && !criterio) return "—";
    const intervalo = criterio ? `<p>Criterio aplicado: ${r.criterio_minimo == null ? "sin mínimo" : escapeHTML(r.criterio_minimo)} – ${r.criterio_maximo == null ? "sin máximo" : escapeHTML(r.criterio_maximo)} ${escapeHTML(r.unidad || "")}</p><p>${escapeHTML(r.referencia_criterio || "")}</p>` : "";
    return `<details class="technical-details"><summary>Ficha técnica</summary>${intervalo}${r.observaciones ? `<p>${escapeHTML(r.observaciones)}</p>` : ""}</details>`;
  }
  function dibujarGrafico(rows) {
    SIDChart.render(document.getElementById("profileChart"),rows);
  }

  async function abrirExpediente(id) {
    const fuente = fuentes.find((f) => String(f.id) === String(id));
    if (!fuente) return;
    const solicitud = ++solicitudPerfil;
    const perfilAbierto=!document.getElementById("modalExpediente").hidden;
    const parametroPrevio=String(fuentePerfilActiva?.id)===String(id)?document.getElementById("profileParameter").value:null;
    const scrollPrevio=document.querySelector("#modalExpediente .modal").scrollTop;
    if (String(fuentePerfilActiva?.id) !== String(fuente.id)) {
      paginaHistorialPerfil = 1;
      document.getElementById("profileEvidenceForm").reset();
      actualizarOrigenFoto();
    }
    fuentePerfilActiva = fuente;
    const rows = inspecciones.filter((i) => String(i.fuente_id) === String(id)).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    paginaHistorialPerfil = Math.min(paginaHistorialPerfil, Math.max(1, Math.ceil(rows.length / HISTORIAL_PERFIL_POR_PAGINA)));
    document.getElementById("profileTitle").textContent = fuente.nombre;
    document.getElementById("profileLocation").textContent = `${titulo(fuente.tipo)} · ${fuente.ubicacion || "Sin referencia del sitio"} · ${Number(fuente.lat).toFixed(5)}, ${Number(fuente.lng).toFixed(5)}`;
    document.getElementById("profileLocationQuality").textContent=fuente.esDemostracion?"Coordenada de referencia · confirmar en campo":"Coordenada registrada · WGS 84";
    const metricas = document.getElementById("profileMetrics");
    const ultima = rows.at(-1);
    const estadoVisita = fuentesConEstado().find((f) => f.id === fuente.id)?.estado;
    metricas.innerHTML = `<div><small>Categoría</small><strong>${escapeHTML(titulo(fuente.categoria_fuente || "otro"))}</strong></div><div><small>Mediciones</small><strong>${rows.length}</strong></div><div><small>Última lectura</small><strong>${ultima ? `${escapeHTML(ultima.valor)} ${escapeHTML(ultima.unidad || "")}` : "Sin datos"}</strong></div><div><small>Estado actual</small>${ultima ? pillEstado(estadoVisita) : pillEstado("sin_referencia")}</div>`;
    const params = [...new Map(rows.map((r) => [`${r.matriz}|${r.parametro}|${r.unidad || ""}`, r])).entries()];
    const select = document.getElementById("profileParameter");
    select.innerHTML = params.map(([key, r]) => `<option value="${escapeHTML(key)}">${escapeHTML(titulo(r.matriz))} · ${escapeHTML(r.parametro)} (${escapeHTML(r.unidad || "")})</option>`).join("");
    if(parametroPrevio&&params.some(([key])=>key===parametroPrevio))select.value=parametroPrevio;
    const updateGraph = () => {
      const [matriz, parametro, unidad] = (select.value || "").split("|");
      const same = rows.filter((r) => r.matriz === matriz && r.parametro === parametro && (r.unidad || "") === unidad);
      dibujarGrafico(same);
      const first = same[0], last = same.at(-1);
      const trend = document.getElementById("profileTrend");
      if (!first || !last || first === last) trend.textContent = "Se requieren al menos dos mediciones comparables para observar una tendencia.";
      else if (["metodo_muestreo","criterio_minimo","criterio_maximo","referencia_criterio"].some(k=>(first[k]??null)!==(last[k]??null))) trend.textContent="El método o criterio cambió entre lecturas. Revisa su comparabilidad antes de interpretar la evolución.";
      else if (estadoDe(first) === "sin_referencia" || estadoDe(last) === "sin_referencia") trend.textContent = `Variación de ${first.valor} a ${last.valor} ${unidad}. Sin criterio normativo vigente; la variación no determina mejora ni cumplimiento.`;
      else {
        const a = { alerta: 3, intermedio: 2, bueno: 1 }[estadoDe(first)], b = { alerta: 3, intermedio: 2, bueno: 1 }[estadoDe(last)];
        trend.textContent = b < a ? "Mejora según el criterio configurado." : b > a ? "Empeora según el criterio configurado." : "Se mantiene en el mismo rango del criterio configurado.";
      }
      document.getElementById("profileChartNote").textContent = fuente.esDemostracion ? "Evaluación académica · criterios documentados en la ficha técnica." : "Las lecturas se comparan por parámetro y unidad; confirma el método y el criterio aplicable.";
    };
    openModal("modalExpediente");
    select.onchange = updateGraph; updateGraph();
    const lecturasPerfil = [...rows].reverse();
    document.querySelector("#profileHistory tbody").innerHTML = lecturasPerfil.slice((paginaHistorialPerfil - 1) * HISTORIAL_PERFIL_POR_PAGINA, paginaHistorialPerfil * HISTORIAL_PERFIL_POR_PAGINA).map((r) => `<tr><td>${fmtFecha(r.fecha)}</td><td>${escapeHTML(titulo(r.matriz))} · ${escapeHTML(r.parametro)}</td><td>${escapeHTML(r.valor)} ${escapeHTML(r.unidad || "")}</td><td>${pillEstado(estadoDe(r))}</td><td>${escapeHTML(titulo(r.origen_dato || "campo"))}${r.referencia_dato || r.metodo_muestreo ? `<details class="technical-details"><summary>Ver procedencia</summary><p>${escapeHTML(r.referencia_dato || "")}</p><p>${escapeHTML(r.metodo_muestreo || "")}</p></details>` : ""}</td><td>${fichaTecnica(r)}</td></tr>`).join("") || '<tr><td colspan="6" class="table-empty">Aún no hay mediciones para esta fuente.</td></tr>';
    renderPaginacionLista("paginacionProfileHistory", lecturasPerfil.length, HISTORIAL_PERFIL_POR_PAGINA, paginaHistorialPerfil, (pagina) => { paginaHistorialPerfil = pagina; abrirExpediente(fuente.id); });
    const inspectionSelect = document.getElementById("profilePhotoInspection");
    inspectionSelect.innerHTML = '<option value="">Evidencia general de la fuente</option>' + [...rows].reverse().map((r) => `<option value="${escapeHTML(r.id)}">${escapeHTML(fmtFecha(r.fecha))} · ${escapeHTML(r.parametro)}</option>`).join("");
    const upload = document.getElementById("profileEvidenceForm");
    upload.hidden = !Auth.user() || !DB.hasEvidenceStorage();
    document.getElementById("profileEvidenceNotice").textContent = DB.hasEvidenceStorage() ? (Auth.user() ? "Consulta las imágenes de la fuente o adjunta una nueva. Los archivos se guardan de forma privada; los enlaces conservan el acceso de su sitio de origen." : "Inicia sesión para agregar o ver evidencias fotográficas.") : "La evidencia fotográfica requiere la conexión configurada con Supabase Storage.";
    const gallery = document.getElementById("profileEvidenceGallery"); gallery.replaceChildren();
    if (!Auth.user()) gallery.innerHTML = '<p class="evidence-empty">Las fotografías están disponibles al iniciar sesión.</p>';
    if(perfilAbierto) document.querySelector("#modalExpediente .modal").scrollTop=scrollPrevio;
    else document.querySelector("#modalExpediente .modal").scrollTop=0;
    gallery.setAttribute("aria-busy", "false");
    if (Auth.user() && DB.hasEvidenceStorage()) {
      const usuario = Auth.user().id;
      const vigente = () => solicitud === solicitudPerfil && !document.getElementById("modalExpediente").hidden && Auth.user()?.id === usuario;
      const clave = `${usuario}:${id}`;
      gallery.innerHTML = '<p class="evidence-empty" role="status">Cargando fotografías…</p>';
      gallery.setAttribute("aria-busy", "true");
      try {
        if (!solicitudesEvidencia.has(clave)) {
          const pendiente = Promise.resolve().then(() => DB.getEvidencias(id)).finally(() => { if(solicitudesEvidencia.get(clave)===pendiente) solicitudesEvidencia.delete(clave); });
          solicitudesEvidencia.set(clave, pendiente);
        }
        const evidencias = await solicitudesEvidencia.get(clave);
        if (!vigente()) return;
        gallery.replaceChildren();
        if (!evidencias.length) gallery.innerHTML = '<p class="evidence-empty">Todavía no hay fotografías para esta fuente.</p>';
        evidencias.forEach((item) => {
          const card = document.createElement("figure"); card.className = "evidence-card";
          const img = document.createElement("img");
          if (item.url) img.src = item.url;
          else { img.hidden = true; card.classList.add("evidence-card--unavailable"); }
          img.alt = item.descripcion || "Fotografía de la fuente"; img.loading = "lazy";
          img.addEventListener("error", () => { img.hidden = true; card.classList.add("evidence-card--unavailable"); }, { once: true });
          const cap = document.createElement("figcaption");
          const title = document.createElement("strong"); title.textContent = item.descripcion?.startsWith("DEMO") ? "Fotografía de referencia" : item.descripcion || "Fotografía de la fuente";
          const date = document.createElement("time"); date.dateTime = item.creado_en; date.textContent = fmtFecha(item.creado_en);
          cap.append(title, date);
          if (item.descripcion) {
            const details = document.createElement("details"); const summary = document.createElement("summary"); summary.textContent = "Procedencia y observaciones";
            const text = document.createElement("p"); text.textContent = item.descripcion; details.append(summary, text); cap.append(details);
          }
          card.append(img, cap); gallery.append(card);
        });
      } catch (error) {
        if (!vigente()) return;
        const mensaje = document.createElement("p");
        mensaje.className = "evidence-empty";
        mensaje.textContent = "No se pudieron cargar las fotografías. El expediente sigue disponible.";
        const reintentar = document.createElement("button");
        reintentar.type = "button";
        reintentar.className = "btn btn--ghost";
        reintentar.textContent = "Reintentar fotografías";
        reintentar.addEventListener("click", () => abrirExpediente(id));
        gallery.replaceChildren(mensaje, reintentar);
      } finally {
        if (vigente()) gallery.setAttribute("aria-busy", "false");
      }
    }
  }
  async function cargarFotosMapa() {
    const version = ++versionFotos, usuario = Auth.user()?.id;
    if (!usuario || !DB.hasEvidenceStorage()) return;
    const ids = fuentes.map(f=>f.id);
    try {
      const fotos = await DB.getEvidenciasMapa(ids);
      if (version !== versionFotos || Auth.user()?.id !== usuario) return;
      fuentes = fuentes.map(f=>({...f, _fotoMapa:fotos[f.id] || null}));
      if (SIDMap.updatePhotos) SIDMap.updatePhotos(fuentes);
      else renderMap();
    } catch {}
  }
  async function refrescarDatos() {
    const version = ++versionDatos;
    const [nuevasFuentes, nuevasInspecciones] = await Promise.all([DB.getFuentes(), DB.getInspecciones()]);
    if (version !== versionDatos) return;
    versionFotos++;
    fuentes = nuevasFuentes.map((f) => ({ ...f, _fotoMapa:null, esDemostracion: /^\[DEMO\]\s*/i.test(f.nombre), ubicacion_original:f.ubicacion, ubicacion: typeof SIDWorkflows === "undefined" ? f.ubicacion : SIDWorkflows.compact(f), nombre: f.nombre.replace(/^\[DEMO\]\s*/i, "") }));
    inspecciones = nuevasInspecciones;
    paginaHistorico = 1;
    poblarFuentesSelect();
    const filtroFuente = document.getElementById("filtroFuenteHistorico");
    if (filtroFuente) {
      const seleccionado = filtroFuente.value;
      filtroFuente.innerHTML = '<option value="">Todas</option>' + fuentes.map((f) => `<option value="${escapeHTML(f.id)}">${escapeHTML(f.nombre)}</option>`).join("");
      filtroFuente.value = seleccionado;
    }
    renderStats();
    renderMap();
    renderHistorico(document.getElementById("buscarHistorico").value);
    renderResumen();
    void cargarFotosMapa();
  }
  function reflejarSesion() {
    const u = Auth.user();
    const tag = document.getElementById("sessionTag");
    const btnLogin = document.getElementById("btnLogin");
    const btnNuevaFuente = document.getElementById("btnNuevaFuente");
    const btnInsp = document.getElementById("btnRegistrarInspeccion");
    const btnGuardar = document.getElementById("btnGuardarInspeccion");
    const hint = document.getElementById("formLoginHint");

    if (u) {
      tag.hidden = false;
      const correo = String(u.email || "").toLowerCase();
      const nombreVisible = u.user_metadata?.full_name || NOMBRES_CUENTAS_EQUIPO[correo] || u.email;
      tag.textContent = nombreVisible;
      tag.title = u.email || "";
      btnLogin.textContent = "Cerrar sesión";
      btnNuevaFuente.disabled = !datosDisponibles;
      btnInsp.disabled = !datosDisponibles;
      btnGuardar.disabled = !datosDisponibles;
      hint.hidden = true;
      const inspector = document.getElementById("fInspector");
      if (inspector && !inspector.value) {
        inspector.value = nombreVisible || "";
      }
    } else {
      tag.hidden = true;
      btnLogin.textContent = "Iniciar sesión";
      btnNuevaFuente.disabled = true;
      btnInsp.disabled = true;
      btnGuardar.disabled = true;
      hint.hidden = false;
    }
  }
  function wireTabs(selector, panelPrefix) {
    document.querySelectorAll(selector).forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(selector).forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        const key = btn.dataset.tab || btn.dataset.filter;
        document.querySelectorAll(`[id^="${panelPrefix}"]`).forEach((p) => p.classList.remove("is-active"));
        if (panelPrefix === "tab-") {
          document.getElementById(`tab-${key}`).classList.add("is-active");
        }
      });
    });
  }
  function openModal(id, { preserveForm = false } = {}) {
    const backdrop = document.getElementById(id);
    backdrop._justOpened = backdrop.hidden;
    if (backdrop.hidden) backdrop._returnFocus = document.activeElement;
    backdrop.hidden = false;
    document.body.classList.add("has-modal-open");
    if (id === "modalFuente") {
      if (!preserveForm) document.getElementById("formFuente").reset();
      document.getElementById("fuenteError").hidden = true;
    } else if (id === "modalLogin") {
      document.getElementById("loginError").hidden = true;
    }
    if (backdrop._justOpened !== false) backdrop.querySelector("input, select, textarea, button")?.focus({preventScroll:true});
    backdrop._justOpened = false;
  }
  function closeModal(id) {
    if (id === "modalExpediente") solicitudPerfil++;
    const backdrop = document.getElementById(id);
    backdrop.hidden = true;
    backdrop._returnFocus?.focus({preventScroll:true});
    if (![...document.querySelectorAll(".modal-backdrop")].some((modal) => !modal.hidden)) {
      document.body.classList.remove("has-modal-open");
    }
  }

  function wireLoginModal() {
    document.getElementById("btnLogin").addEventListener("click", async () => {
      if (Auth.user()) {
        const button = document.getElementById("btnLogin"); button.disabled = true;
        try {
          await Auth.logout();
          reflejarSesion();
          refrescarDatos().catch(() => {});
          toast("Sesión cerrada.");
        } catch(error) { toast(error.message, true); }
        finally { button.disabled = false; }
        return;
      }
      document.getElementById("demoNote").textContent = DB.mode() === "demo"
        ? `Modo demo: usa ${SID_CONFIG.DEMO_USER.email} / ${SID_CONFIG.DEMO_USER.password}`
        : "";
      openModal("modalLogin");
    });
    document.getElementById("btnCancelLogin").addEventListener("click", () => closeModal("modalLogin"));
    document.getElementById("modalLogin").addEventListener("click", (event) => {
      if (event.target.id === "modalLogin") closeModal("modalLogin");
    });

    let iniciandoSesion = false;
    document.getElementById("formLogin").addEventListener("submit", async (e) => {
      e.preventDefault();
      if (iniciandoSesion) return;
      const email = document.getElementById("loginEmail").value;
      const password = document.getElementById("loginPassword").value;
      const errorEl = document.getElementById("loginError");
      errorEl.hidden = true;
      const submit = e.target.querySelector('[type="submit"]');
      iniciandoSesion = true; submit.disabled = true;
      try {
        await Auth.login(email, password);
        closeModal("modalLogin");
        e.target.reset();
        reflejarSesion();
        try { await refrescarDatos(); } catch {}
        toast("Sesión iniciada correctamente.");
        if (abrirFuenteDespuesDelLogin) {
          abrirFuenteDespuesDelLogin = false;
          abrirRegistroNuevaFuente?.(true);
        }
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.hidden = false;
      } finally { iniciandoSesion = false; submit.disabled = false; }
    });
  }

  function wireFuenteModal() {
    function abrirRegistroFuente(desdeInspeccion = false) {
      if (!Auth.user()) {
        abrirFuenteDespuesDelLogin = desdeInspeccion;
        openModal("modalLogin");
        toast("Inicia sesión para registrar una fuente o punto de evaluación.");
        return;
      }
      regresarAInspeccionDespuesDeFuente = desdeInspeccion;
      if (document.getElementById("page-inventario").hidden) navegarA("inventario");
      openModal("modalFuente");
      const estado = document.getElementById("nfUbicacionEstado");
      estado.textContent = "Escribe las coordenadas, usa tu ubicación o elige un punto en el mapa.";
    }
    abrirRegistroNuevaFuente = abrirRegistroFuente;

    function ponerCoordenadas(lat, lng, mensaje) {
      document.getElementById("nfLat").value = Number(lat).toFixed(6);
      document.getElementById("nfLng").value = Number(lng).toFixed(6);
      document.getElementById("nfUbicacionEstado").textContent = mensaje;
      SIDMap.setMarkerPreview({ lat: Number(lat), lng: Number(lng) });
    }

    ["nfLat", "nfLng"].forEach((id) => {
      document.getElementById(id).addEventListener("change", () => {
        const lat = Number(document.getElementById("nfLat").value);
        const lng = Number(document.getElementById("nfLng").value);
        if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= 7 && lat <= 10 && lng >= -83.5 && lng <= -77) {
          ponerCoordenadas(lat, lng, "Coordenadas manuales listas. Verifica el pin en el mapa.");
          SIDMap.focus(lat, lng);
        }
      });
    });

    document.getElementById("btnNuevaFuente").addEventListener("click", () => abrirRegistroFuente(false));
    document.getElementById("btnFuenteDesdeInspeccion").addEventListener("click", () => abrirRegistroFuente(true));
    document.getElementById("btnVerFuenteMapa").addEventListener("click", () => {
      const fuente = fuentes.find((f) => String(f.id) === document.getElementById("fFuente").value);
      if (!fuente) return;
      SIDMap.focus(Number(fuente.lat), Number(fuente.lng));
      document.getElementById("map").scrollIntoView({ block: "center", behavior: "smooth" });
    });
    document.getElementById("btnUsarUbicacion").addEventListener("click", () => {
      const estado = document.getElementById("nfUbicacionEstado");
      if (!navigator.geolocation) {
        estado.textContent = "Este navegador no permite obtener la ubicación; escribe las coordenadas o selecciónalas en el mapa.";
        return;
      }
      estado.textContent = "Obteniendo ubicación…";
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          ponerCoordenadas(coords.latitude, coords.longitude, "Ubicación actual obtenida. Verifica el punto antes de guardarlo.");
          SIDMap.focus(coords.latitude, coords.longitude);
        },
        () => { estado.textContent = "No se pudo obtener la ubicación. Revisa el permiso del navegador o ingresa las coordenadas manualmente."; },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    });

    document.getElementById("btnElegirMapa").addEventListener("click", () => {
      closeModal("modalFuente");
      if (document.getElementById("page-inventario").hidden) navegarA("inventario");
      SIDMap.enablePlacement((latlng) => {
        ponerCoordenadas(latlng.lat, latlng.lng, "Punto seleccionado en el mapa. Puedes ajustar las coordenadas antes de guardar.");
        SIDMap.disablePlacement();
        SIDMap.setMarkerPreview(latlng);
        openModal("modalFuente", { preserveForm: true });
      });
      document.getElementById("map").scrollIntoView({ block: "center", behavior: "smooth" });
      toast("Haz clic en el mapa para marcar el punto de evaluación 📍");
    });

    function cerrarFuenteModal() {
      closeModal("modalFuente");
      SIDMap.disablePlacement();
      document.getElementById("formFuente").reset();
    }
    document.getElementById("btnCancelFuente").addEventListener("click", cerrarFuenteModal);
    document.getElementById("modalFuente").addEventListener("click", (event) => {
      if (event.target.id === "modalFuente") cerrarFuenteModal();
    });

    let guardandoFuente = false;
    document.getElementById("formFuente").addEventListener("submit", async (e) => {
      e.preventDefault();
      if (guardandoFuente) return;
      const errorEl = document.getElementById("fuenteError");
      errorEl.hidden = true;
      const nombre = document.getElementById("nfNombre").value.trim();
      const tipo = document.getElementById("nfCategoria").value;
      const categoria_fuente = document.getElementById("nfCategoriaFuente").value;
      const ubicacion = document.getElementById("nfUbicacion").value.trim();
      const lat = parseFloat(document.getElementById("nfLat").value);
      const lng = parseFloat(document.getElementById("nfLng").value);
      if (!nombre || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < 7 || lat > 10 || lng < -83.5 || lng > -77) {
        errorEl.textContent = "Completa el nombre y usa coordenadas válidas dentro de Panamá (latitud 7–10, longitud -83.5– -77).";
        errorEl.hidden = false;
        return;
      }
      const submit = e.target.querySelector('[type="submit"]');
      guardandoFuente = true;
      submit.disabled = true;
      try {
        const nuevaFuente = await DB.addFuente({ nombre, tipo, categoria_fuente, ubicacion, lat, lng });
        const volverAInspeccion = regresarAInspeccionDespuesDeFuente;
        cerrarFuenteModal();
        try { await refrescarDatos(); }
        catch { toast("Fuente guardada. Recarga el inventario para consultarla."); return; }
        if (volverAInspeccion) {
          document.getElementById("fFuente").value = String(nuevaFuente.id);
          ajustarMatrizFuente();
          document.querySelector('.tab[data-tab="inspeccion"]').click();
          document.getElementById("fInspector").focus();
        }
        toast("Fuente registrada correctamente.");
      } catch (err) {
        errorEl.textContent = "No se pudo guardar: " + err.message;
        errorEl.hidden = false;
      } finally {
        guardandoFuente = false;
        submit.disabled = false;
      }
    });
  }

  function wireInspeccionForm() {
    document.getElementById("btnRegistrarInspeccion").addEventListener("click", () => {
      document.querySelector('.tab[data-tab="inspeccion"]').click();
      document.querySelector("#sourcePicker summary")?.focus();
    });

    document.getElementById("fFuente").addEventListener("change", ajustarMatrizFuente);
    document.getElementById("fFuente").addEventListener("change", actualizarDetalleFuente);
    document.getElementById("fInspector").placeholder = "Nombre de la persona que realiza la medición";
    document.getElementById("fFuente").title = "Selecciona un punto ya registrado o crea uno nuevo";
    document.getElementById("fFecha").value = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    document.getElementById("fMatriz").addEventListener("change", poblarParametros);
    document.getElementById("fOrigenDato").addEventListener("change",()=>{document.getElementById("fReferenciaDato").required=document.getElementById("fOrigenDato").value==="oficial";});

    let guardandoMedicion = false;
    document.getElementById("formInspeccion").addEventListener("submit", async (e) => {
      e.preventDefault();
      if (guardandoMedicion) return;
      const fuente_id = document.getElementById("fFuente").value;
      const inspector = document.getElementById("fInspector").value.trim();
      const matriz = document.getElementById("fMatriz").value;
      const parametro = document.getElementById("fParametro").value;
      const valor = parseFloat(document.getElementById("fValor").value);
      const fecha = document.getElementById("fFecha").value;
      const observaciones = document.getElementById("fObservaciones").value.trim();
      const origen_dato = document.getElementById("fOrigenDato").value;
      const metodo_muestreo = document.getElementById("fMetodo").value.trim();
      const referencia_dato = document.getElementById("fReferenciaDato").value.trim();

      if (!fuente_id || !inspector || !Number.isFinite(valor) || !parametro || !fecha) {
        toast("Completa todos los campos obligatorios.", true);
        return;
      }

      if(valor<0 && Inspections.limiteDe(matriz,parametro)?.unidad!=="°C"){toast("Una concentración no puede ser negativa.",true);return;}
      const fuente = fuentes.find((f) => String(f.id) === fuente_id);
      if (!fuente) {
        toast("Selecciona una fuente válida.", true);
        return;
      }
      if ((origen_dato === "oficial" || origen_dato === "laboratorio") && !referencia_dato) {
        toast("Agrega la institución o referencia verificable de este dato.", true);
        document.getElementById("fReferenciaDato").focus();
        return;
      }
      const minimoRaw=document.getElementById("fCriterioMin").value, maximoRaw=document.getElementById("fCriterioMax").value;
      const criterio_minimo=minimoRaw===""?null:Number(minimoRaw), criterio_maximo=maximoRaw===""?null:Number(maximoRaw);
      const referencia_criterio=document.getElementById("fCriterioRef").value.trim();
      if(criterio_minimo!=null&&criterio_maximo!=null&&criterio_minimo>criterio_maximo){toast("El mínimo debe ser menor o igual al máximo.",true);return;}
      if((criterio_minimo!=null||criterio_maximo!=null)&&!/^https:\/\//.test(referencia_criterio)){toast("Agrega el documento HTTPS que respalda el intervalo.",true);return;}
      if(origen_dato==="oficial"&&!/^https:\/\//.test(referencia_dato)){toast("El informe externo necesita un enlace HTTPS verificable.",true);return;}
      const evalRes = Inspections.evaluar(matriz, parametro, valor, fecha);
      if(criterio_minimo!=null||criterio_maximo!=null){evalRes.estado=((criterio_minimo!=null&&valor<criterio_minimo)||(criterio_maximo!=null&&valor>criterio_maximo))?"alerta":"bueno";evalRes.cumple=evalRes.estado!=="alerta";}
      else if(origen_dato==="oficial"||MeasurementGuide.find(matriz,parametro)){evalRes.estado="sin_referencia";evalRes.cumple=true;}
      const registro = {
        fuente_id, inspector, matriz, parametro, valor, fecha: new Date(fecha).toISOString(),
        observaciones, unidad: evalRes.unidad, cumple: evalRes.cumple, estado: evalRes.estado,
        origen_dato, metodo_muestreo, referencia_dato, criterio_minimo, criterio_maximo, referencia_criterio,
      };

      const submit = document.getElementById("btnGuardarInspeccion");
      guardandoMedicion = true;
      submit.disabled = true;
      try {
        await DB.addInspeccion(registro);
        e.target.reset();
        document.getElementById("fReferenciaDato").required=false;
        document.getElementById("fFecha").value = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        ajustarMatrizFuente();
        try { await refrescarDatos(); }
        catch { toast("Medición guardada. Recarga el inventario para consultar el resultado."); return; }
        toast(
          evalRes.estado === "alerta"
            ? "Resultado fuera del criterio de evaluación documentado."
            : evalRes.estado === "intermedio"
              ? "Medición guardada en rango preventivo SID-FC."
              : evalRes.estado === "sin_referencia"
                ? "Medición guardada; no hay criterio vigente para interpretarla."
                : "Medición guardada bajo el criterio configurado.",
          evalRes.estado === "alerta"
        );
      } catch (err) {
        toast("No se pudo guardar la medición: " + err.message, true);
      } finally {
        guardandoMedicion = false;
        submit.disabled = !Auth.user() || !datosDisponibles;
      }
    });
  }

  function wireFiltrosMapa() {
    document.querySelectorAll(".filter-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".filter-tab").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        filtroActual = btn.dataset.filter;
        renderMap();
      });
    });
  }

  function wireHistoricoBuscar() {
    document.getElementById("buscarHistorico").addEventListener("input", (e) => {
      paginaHistorico = 1;
      renderHistorico(e.target.value);
    });
    document.getElementById("paginacionHistorico").addEventListener("click", (event) => {
      const boton = event.target.closest("[data-history-page]");
      if (!boton || boton.disabled) return;
      paginaHistorico = Number(boton.dataset.historyPage);
      renderHistorico(document.getElementById("buscarHistorico").value);
    });
    document.querySelector("#tablaHistorico tbody").addEventListener("click", (event) => {
      const button = event.target.closest("[data-view-map]");
      if (button) irAlMapaDeFuente(button.dataset.viewMap);
    });
    ["filtroFuenteHistorico", "filtroMatrizHistorico", "filtroEstadoHistorico", "filtroFechaDesde", "filtroFechaHasta"].forEach((id) => {
      document.getElementById(id).addEventListener("change", () => { paginaHistorico = 1; renderHistorico(document.getElementById("buscarHistorico").value); });
    });
    document.getElementById("btnLimpiarFiltrosHistorico").addEventListener("click", () => {
      ["filtroFuenteHistorico", "filtroMatrizHistorico", "filtroEstadoHistorico", "filtroFechaDesde", "filtroFechaHasta", "buscarHistorico"].forEach((id) => { document.getElementById(id).value = ""; });
      paginaHistorico = 1; renderHistorico("");
    });
  }

  function irAlMapaDeFuente(id) {
    ajustarVistaTrabajo(false);
    navegarA("inventario");
    filtroActual = "todas";
    document.querySelectorAll(".filter-tab").forEach((button) => {
      const active = button.dataset.filter === "todas";
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    renderMap();
    requestAnimationFrame(() => {
      SIDMap.focusFuente(id);
      document.getElementById("map").scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }

  function actualizarOrigenFoto() {
    const esArchivo = document.querySelector('[name="photoInputMode"]:checked').value === "file";
    document.getElementById("profilePhotoFileField").hidden = !esArchivo;
    document.getElementById("profilePhotoUrlField").hidden = esArchivo;
    if (esArchivo) document.getElementById("profilePhotoUrl").value = "";
    else document.getElementById("profilePhoto").value = "";
  }
  function wireExpedientes() {
    document.querySelectorAll('[name="photoInputMode"]').forEach((input) => input.addEventListener("change", actualizarOrigenFoto));
    document.getElementById("btnCloseProfile").addEventListener("click", () => closeModal("modalExpediente"));
    document.getElementById("modalExpediente").addEventListener("click", (event) => { if (event.target.id === "modalExpediente") closeModal("modalExpediente"); });
    let subiendoEvidencia = false;
    document.getElementById("profileEvidenceForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      if (subiendoEvidencia) return;
      const file = document.getElementById("profilePhoto").files[0];
      const photoUrl = document.getElementById("profilePhotoUrl").value.trim();
      const status = document.getElementById("profileEvidenceNotice");
      if (!fuentePerfilActiva) return;
      if (Boolean(file) === Boolean(photoUrl)) { status.textContent = "Elige un archivo o pega una URL, pero solo una opción."; return; }
      if (file && (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024)) { status.textContent = "Elige una imagen JPG, PNG o WebP de hasta 5 MB."; return; }
      if (photoUrl) {
        try { if (new URL(photoUrl).protocol !== "https:") throw new Error(); }
        catch { status.textContent = "Pega una URL válida que comience con https://."; return; }
      }
      const submit = event.currentTarget.querySelector('[type="submit"]');
      const fuenteId = fuentePerfilActiva.id, solicitud = solicitudPerfil;
      const vigente = () => solicitud === solicitudPerfil && !document.getElementById("modalExpediente").hidden;
      subiendoEvidencia = true; submit.disabled = true;
      try {
        await DB.addEvidencia({ fuenteId, inspeccionId: document.getElementById("profilePhotoInspection").value, file, photoUrl, descripcion: document.getElementById("profilePhotoDescription").value.trim() });
        solicitudesEvidencia.delete(`${Auth.user()?.id}:${fuenteId}`);
        if (vigente()) {
          document.getElementById("profileEvidenceForm").reset();
          actualizarOrigenFoto();
          status.textContent = "Evidencia guardada.";
        }
        try { await refrescarDatos(); }
        catch { toast("Evidencia guardada. Recarga el inventario para consultarla."); return; }
        if (vigente()) await abrirExpediente(fuenteId);
      } catch (error) {
        if (vigente()) status.textContent = error.message;
        else toast("No se pudo guardar la evidencia: " + error.message, true);
      } finally { subiendoEvidencia = false; submit.disabled = false; }
    });
  }

  function navegarA(pagina) {
    const id = `page-${pagina}`;
    if (!document.getElementById(id)) return;
    document.querySelectorAll(".page-view").forEach((view) => {
      view.hidden = view.id !== id;
    });
    document.querySelectorAll(".page-link").forEach((link) => {
      const activo = link.dataset.page === pagina;
      link.classList.toggle("is-active", activo);
      if (activo) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    document.querySelector(".inventory-actions").hidden = pagina !== "inventario";
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (pagina === "inventario") {
      SIDMap.init();
      requestAnimationFrame(() => {
        SIDMap.invalidateSize();
        renderMap();
      });
    }
  }

  function ajustarVistaTrabajo(active) {
    document.querySelector(".workspace").classList.toggle("workspace--expanded", active);
    document.querySelectorAll("[data-expand-workspace]").forEach(button => {
      button.setAttribute("aria-pressed", String(active));
      button.textContent = active ? "Volver a vista dividida" : "Ampliar tabla";
    });
    SIDMap.invalidateSize();
  }
  function wireWorkspaceExpansion() {
    const workspace = document.querySelector(".workspace");
    document.querySelectorAll("[data-expand-workspace]").forEach(button => button.addEventListener("click", () => {
      ajustarVistaTrabajo(!workspace.classList.contains("workspace--expanded"));
      document.querySelector(".form-panel").scrollIntoView({block:"start",behavior:"auto"});
    }));
    document.querySelector('.tab[data-tab="inspeccion"]').addEventListener("click", () => ajustarVistaTrabajo(false));
  }

  function wireNavigation() {
    document.querySelectorAll(".page-link").forEach((button) => {
      button.addEventListener("click", () => navegarA(button.dataset.page));
    });
    document.querySelectorAll("[data-go-page]").forEach((button) => {
      button.addEventListener("click", () => navegarA(button.dataset.goPage));
    });
  }

  function wireHomeParallax() {
    const hero = document.querySelector(".home-hero");
    const image = hero?.querySelector(".home-hero__image");
    if (!hero || !image || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let queued = false;
    const update = () => {
      queued = false;
      const rect = hero.getBoundingClientRect();
      const shift = Math.max(-24, Math.min(72, -rect.top * 0.14));
      image.style.setProperty("--parallax-y", `${shift}px`);
    };
    window.addEventListener("scroll", () => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(update);
    }, { passive: true });
    update();
  }

  function wireContactForm() {
    const form = document.getElementById("contactForm");
    if (!form) return;
    const status = document.getElementById("contactFormStatus");
    form.addEventListener("input", (event) => event.target.setCustomValidity?.(""));
    let enviandoContacto = false;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (enviandoContacto) return;
      const nombre = form.elements.namedItem("nombre");
      const celular = form.elements.namedItem("celular");
      const comentario = form.elements.namedItem("comentario");
      nombre.value = nombre.value.trim().replace(/\s+/g, " ");
      comentario.value = comentario.value.trim();
      nombre.setCustomValidity(nombre.value.split(" ").length >= 2 && /^[\p{L}\p{M} .'-]+$/u.test(nombre.value) ? "" : "Escribe tu nombre y al menos un apellido.");
      const digitosCelular = celular.value.replace(/\D/g, "").length;
      if (digitosCelular < 8 || digitosCelular > 15 || !/^[+0-9() .-]+$/.test(celular.value)) {
        celular.setCustomValidity("El celular debe tener entre 8 y 15 dígitos.");
      } else {
        celular.setCustomValidity("");
      }
      if (!form.reportValidity()) return;

      const boton = form.querySelector('button[type="submit"]');
      enviandoContacto = true;
      boton.disabled = true;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      status.textContent = "Enviando tu mensaje…";
      status.classList.remove("is-error");
      try {
        const data = new URLSearchParams(new FormData(form));
        const response = await fetch("/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: data.toString(),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("No se pudo enviar el mensaje.");
        form.reset();
        status.textContent = "Gracias. Tu mensaje fue recibido y quedará disponible para el equipo.";
      } catch {
        status.textContent = "No pudimos enviar el mensaje. Inténtalo de nuevo más tarde.";
        status.classList.add("is-error");
      } finally {
        clearTimeout(timeout);
        enviandoContacto = false;
        boton.disabled = false;
      }
    });
  }

  function wireReporte() {
    const generarResumen = () => {
      const conEstado = fuentesConEstado();
      const filasFuentes = conEstado
        .map(
          (f) => `<tr><td>${escapeHTML(f.nombre)}</td><td>${escapeHTML(titulo(f.tipo))} · ${escapeHTML(titulo(f.categoria_fuente || "otro"))}</td>
          <td class="${f.estado === "alerta" ? "alerta" : "ok"}">${f.estado === "sin_datos" ? "Sin datos" : titulo(f.estado)}</td>
          <td>${f.ultimaMedicion || "—"}</td></tr>`
        )
        .join("");
      const html = `
        <h2>Resumen de fuentes</h2>
        <table><thead><tr><th>Fuente</th><th>Tipo</th><th>Estado</th><th>Última medición</th></tr></thead>
        <tbody>${filasFuentes}</tbody></table>
        <p style="margin-top:2rem;font-size:.8rem;color:#666;">
          Documento generado por SID-FC (prototipo académico UTP). Las alertas son de carácter
          informativo y no constituyen una determinación legal de incumplimiento ambiental.
        </p>`;
      try { SIDExport.reportePDF(html); } catch (error) { toast(error.message, true); }
    };
    const generarHistorico = () => {
      const filas = paginaHistorialFiltrada.map((i) => `<tr><td>${escapeHTML(fmtFecha(i.fecha))}</td><td>${escapeHTML(fuentes.find((f) => String(f.id) === String(i.fuente_id))?.nombre || i.fuente_id)}</td><td>${escapeHTML(titulo(i.matriz))}</td><td>${escapeHTML(i.parametro)}</td><td>${escapeHTML(i.valor)} ${escapeHTML(i.unidad || "")}</td><td>${escapeHTML(titulo(estadoDe(i)))}</td><td>${escapeHTML((i.inspector||"").replace(/\s*\(DEMO\)/gi,""))}</td><td>${escapeHTML(titulo(i.origen_dato || "campo"))}</td></tr>`).join("");
      try { SIDExport.reportePDF(`<h2>Historial completo de mediciones filtrado</h2><p>${paginaHistorialFiltrada.length} registros. Reporte incluye todas las visitas coincidentes.</p><table><thead><tr><th>Fecha</th><th>Fuente</th><th>Medio</th><th>Parámetro</th><th>Valor</th><th>Estado</th><th>Registrado por</th><th>Origen</th></tr></thead><tbody>${filas}</tbody></table><p style="margin-top:2rem;font-size:.8rem;color:#666">Los estados reflejan criterios configurados en SID-FC y no determinan por sí solos incumplimiento legal.</p>`); } catch (error) { toast(error.message, true); }
    };
    document.getElementById("btnReporte").addEventListener("click", generarResumen);
    document.getElementById("btnReporteResumen").addEventListener("click", generarResumen);
    document.getElementById("btnReporteHistorial").addEventListener("click", generarHistorico);
  }

  function wireExportFooter() {
    document.getElementById("footerExportJson").addEventListener("click", () => SIDExport.exportJSON().catch((error) => toast("No se pudo exportar: " + error.message, true)));
    document.getElementById("footerExportCsv").addEventListener("click", () => SIDExport.exportCSV().catch((error) => toast("No se pudo exportar: " + error.message, true)));
  }

  async function init() {
    wireTabs(".tab", "tab-");
    wireNavigation();
    wireContactForm();
    wireHomeParallax();
    wireFiltrosMapa();
    wireLoginModal();
    wireFuenteModal();
    wireInspeccionForm();
    wireExpedientes();
    SIDCriteria.init();
    wireWorkspaceExpansion();
    if (typeof SIDWorkflows !== "undefined") SIDWorkflows.init({getFuentes:()=>fuentes,getInspecciones:()=>inspecciones,refresh:refrescarDatos});
    document.getElementById("btnFitMap").addEventListener("click",()=>SIDMap.fitVisible?.());
    document.addEventListener("keydown", (event) => {
      const open = [...document.querySelectorAll(".modal-backdrop")].find(el=>!el.hidden);
      if (open && !event.target.closest?.("input,select,textarea,[contenteditable=true],summary")) {
        const surface=open.querySelector(".modal");
        const keys={ArrowDown:48,ArrowUp:-48,PageDown:surface?.clientHeight*0.8,PageUp:-surface?.clientHeight*0.8};
        if(event.key in keys){event.preventDefault();surface.scrollBy?.({top:keys[event.key],behavior:"auto"});}
        if(event.key==="Home"||event.key==="End"){event.preventDefault();surface.scrollTo?.({top:event.key==="Home"?0:surface.scrollHeight,behavior:"auto"});}
      }
      if (event.key === "Tab") {
        const modal = [...document.querySelectorAll(".modal-backdrop")].find((el) => !el.hidden);
        const focusable = modal && [...modal.querySelectorAll("button, input, select, textarea, a[href],summary,[tabindex=\"0\"]")].filter((el) => !el.disabled && el.getClientRects().length);
        if (focusable?.length) {
          const first = focusable[0], last = focusable.at(-1);
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      }
      if (event.key === "Escape") {
        if (!document.getElementById("modalFuente").hidden) {
          document.getElementById("btnCancelFuente").click();
        } else if (!document.getElementById("modalLogin").hidden) {
          closeModal("modalLogin");
        } else if (!document.getElementById("modalExpediente").hidden) {
          closeModal("modalExpediente");
        }
      }
    });
    wireHistoricoBuscar();
    wireReporte();
    wireExportFooter();
    reflejarSesion();
    let usuarioAnterior = null;
    Auth.onChange(user => {
      reflejarSesion();
      document.dispatchEvent(new Event("sidfc:sessionchange"));
      if (usuarioAnterior === (user?.id || null)) return;
      usuarioAnterior = user?.id || null;
      versionFotos++;
      solicitudesEvidencia.clear();
      fuentes = fuentes.map(f=>({...f, _fotoMapa:null}));
      renderMap();
      if (!document.getElementById("modalExpediente").hidden) closeModal("modalExpediente");
      document.getElementById("profileEvidenceGallery").replaceChildren();
      document.getElementById("profileEvidenceForm").reset();
      actualizarOrigenFoto();
      if (datosDisponibles && user) void cargarFotosMapa();
    });

    document.getElementById("btnRetryConnection").addEventListener("click", cargarDatos);
    window.addEventListener("online", cargarDatos);
    await DB.init();
    await cargarDatos();
  }

  async function cargarDatos() {
    if (cargandoDatos) return;
    cargandoDatos = true;
    SIDCriteria.setStatus("loading");
    const notice = document.getElementById("connectionNotice");
    const title = document.getElementById("connectionTitle");
    const message = document.getElementById("connectionMessage");
    const retry = document.getElementById("btnRetryConnection");
    notice.hidden = false; notice.classList.remove("is-error"); retry.hidden = true;
    title.textContent = "Conectando con el inventario";
    message.textContent = "La navegación está disponible mientras cargan los registros.";
    try {
      await Promise.all([
        Inspections.cargarLimites().then(() => SIDCriteria.setStatus("ready")).catch(error => { SIDCriteria.setStatus("error"); throw error; }),
        Auth.restore()
      ]);
      await refrescarDatos();
      datosDisponibles = true;
      poblarParametros();
      notice.hidden = true;
      document.getElementById("dbModeTag").textContent = DB.mode() === "supabase" ? "Datos sincronizados" : "Demostración local";
    } catch (error) {
      datosDisponibles = false;
      title.textContent = "Servicio de datos no disponible";
      message.textContent = "No se pudieron consultar los registros. Reintenta en unos momentos; la navegación y el contacto siguen disponibles.";
      notice.classList.add("is-error"); retry.hidden = false;
      document.getElementById("dbModeTag").textContent = "Sin conexión al servicio de datos";
      ["statTotal", "statOk", "statAlert", "statMes"].forEach((id) => { document.getElementById(id).textContent = "—"; });
      ["tablaHistorico", "tablaResumenFuentes"].forEach((id) => {
        const table = document.getElementById(id);
        table.querySelector("tbody").innerHTML = `<tr><td colspan="${table.querySelectorAll("th").length}" class="table-empty">Registros no disponibles. Usa Reintentar conexión para volver a consultarlos.</td></tr>`;
      });
      document.getElementById("fFuenteHelp").textContent = "Conecta con el servicio de datos para seleccionar un punto de monitoreo.";
      console.error("SID-FC: error al cargar datos", error);
    } finally {
      cargandoDatos = false;
      document.querySelectorAll(".history-filters input, .history-filters select, #btnLimpiarFiltrosHistorico").forEach((el) => { el.disabled = !datosDisponibles; });
      if (!datosDisponibles) document.querySelectorAll(".pagination").forEach((el) => { el.hidden = true; });
      reflejarSesion();
      ["btnReporte", "btnReporteHistorial", "btnReporteResumen", "footerExportJson", "footerExportCsv"].forEach((id) => { document.getElementById(id).disabled = !datosDisponibles; });
    }
  }

  return { init };
})();
