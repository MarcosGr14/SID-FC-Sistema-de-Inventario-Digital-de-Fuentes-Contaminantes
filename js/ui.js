
const UI = (() => {
  let fuentes = [];
  let inspecciones = [];
  let filtroActual = "todas";
  let paginaHistorico = 1;
  let abrirFuenteDespuesDelLogin = false;
  let regresarAInspeccionDespuesDeFuente = false;
  let abrirRegistroNuevaFuente = null;
  const HISTORICO_POR_PAGINA = 8;
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
        .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
      const ultima = propias[0];
      let estado = "sin_datos";
      if (ultima) estado = ultima.cumple ? "ok" : "alerta";
      return { ...f, estado, ultimaMedicion: ultima ? fmtFecha(ultima.fecha) : null };
    });
  }
  function renderStats() {
    const conEstado = fuentesConEstado();
    const total = conEstado.length;
    const ok = conEstado.filter((f) => f.estado === "ok").length;
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
    SIDMap.render(fuentesConEstado(), filtroActual);
  }
  function poblarFuentesSelect() {
    const sel = document.getElementById("fFuente");
    const ayuda = document.getElementById("fFuenteHelp");
    sel.innerHTML = `<option value="" disabled selected>${fuentes.length ? "Seleccionar fuente…" : "Aún no hay fuentes registradas"}</option>`;
    fuentes.forEach((f) => {
      const opt = document.createElement("option");
      opt.value = f.id;
      opt.textContent = `${f.nombre} · ${f.tipo === "agua" ? "Agua" : "Aire"}${f.ubicacion ? ` · ${f.ubicacion}` : ""}`;
      sel.appendChild(opt);
    });
    ayuda.textContent = fuentes.length
      ? "Selecciona una fuente ya registrada; cada medición quedará asociada a su ubicación. Si es un punto nuevo, créalo una sola vez y luego podrás reutilizarlo."
      : "El inventario está vacío. Crea primero una fuente o un punto puntual de evaluación; después quedará disponible aquí para registrar sus mediciones.";
    actualizarDetalleFuente();
  }

  function actualizarDetalleFuente() {
    const id = document.getElementById("fFuente")?.value;
    const fuente = fuentes.find((f) => String(f.id) === String(id));
    const detalles = document.getElementById("fFuenteDetails");
    if (!detalles) return;
    detalles.hidden = !fuente;
    if (!fuente) return;
    const referencia = fuente.ubicacion?.trim();
    const coordenadas = `${Number(fuente.lat).toFixed(5)}, ${Number(fuente.lng).toFixed(5)}`;
    document.getElementById("fFuenteLugar").textContent = `${referencia ? `${referencia} · ` : "Ubicación"}${coordenadas}`;
  }

  function poblarParametros() {
    const matriz = document.getElementById("fMatriz").value;
    const paramSel = document.getElementById("fParametro");
    const unidadSpan = document.getElementById("fUnidad");
    const opciones = Inspections.porMatriz(matriz);
    paramSel.innerHTML = "";
    opciones.forEach((l) => {
      const opt = document.createElement("option");
      opt.value = l.parametro;
      opt.textContent = `${l.parametro} (LMP ${l.limite} ${l.unidad})`;
      paramSel.appendChild(opt);
    });
    unidadSpan.textContent = opciones[0]?.unidad || "";
    paramSel.onchange = () => {
      const lim = Inspections.limiteDe(matriz, paramSel.value);
      unidadSpan.textContent = lim?.unidad || "";
    };
  }

  function ajustarMatrizFuente() {
    const fuente = fuentes.find((f) => String(f.id) === document.getElementById("fFuente").value);
    const matrizSel = document.getElementById("fMatriz");
    [...matrizSel.options].forEach((option) => {
      option.disabled = Boolean(fuente && option.value !== fuente.tipo);
    });
    if (fuente) matrizSel.value = fuente.tipo;
    poblarParametros();
    actualizarDetalleFuente();
  }
  function renderHistorico(filtroTexto = "") {
    const tbody = document.querySelector("#tablaHistorico tbody");
    const fuentesById = Object.fromEntries(fuentes.map((f) => [f.id, f.nombre]));
    const texto = filtroTexto.trim().toLowerCase();

    const filas = [...inspecciones]
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
      .filter((i) => {
        if (!texto) return true;
        const nombreFuente = (fuentesById[i.fuente_id] || "").toLowerCase();
        return nombreFuente.includes(texto) || (i.inspector || "").toLowerCase().includes(texto);
      });

    const totalPaginas = Math.max(1, Math.ceil(filas.length / HISTORICO_POR_PAGINA));
    paginaHistorico = Math.min(paginaHistorico, totalPaginas);
    const inicio = (paginaHistorico - 1) * HISTORICO_POR_PAGINA;
    const filasPagina = filas.slice(inicio, inicio + HISTORICO_POR_PAGINA);

    tbody.innerHTML =
      filasPagina
        .map(
          (i) => `
      <tr>
        <td>${fmtFecha(i.fecha)}</td>
        <td>${escapeHTML(fuentesById[i.fuente_id] || i.fuente_id)}</td>
        <td>${i.matriz === "agua" ? "Agua" : "Aire"}</td>
        <td>${escapeHTML(i.parametro)}</td>
        <td>${escapeHTML(i.valor)} ${escapeHTML(i.unidad || "")}</td>
        <td><span class="status-pill ${i.cumple ? "status-pill--ok" : "status-pill--alert"}">${i.cumple ? "En regla" : "Alerta"}</span></td>
        <td>${escapeHTML(i.inspector)}</td>
      </tr>`
        )
        .join("") || `<tr><td colspan="7" class="table-empty">${filas.length ? "No hay coincidencias." : "Aún no hay inspecciones registradas."}</td></tr>`;
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
  function renderResumen() {
    const tbodyFuentes = document.querySelector("#tablaResumenFuentes tbody");
    tbodyFuentes.innerHTML = fuentesConEstado()
      .map(
        (f) => `
      <tr>
        <td>${escapeHTML(f.nombre)}</td>
        <td>${f.tipo === "agua" ? "Agua" : "Aire"}</td>
        <td>${escapeHTML(f.ubicacion || "Sin referencia")}<br><small>${Number(f.lat).toFixed(5)}, ${Number(f.lng).toFixed(5)}</small></td>
        <td>${f.ultimaMedicion || "Sin mediciones"}</td>
        <td><span class="status-pill ${f.estado === "alerta" ? "status-pill--alert" : f.estado === "ok" ? "status-pill--ok" : ""}">
          ${f.estado === "alerta" ? "Alerta" : f.estado === "ok" ? "En regla" : "Sin datos"}
        </span></td>
      </tr>`
      )
      .join("") || `<tr><td colspan="5" class="table-empty">Aún no hay fuentes registradas.</td></tr>`;

    const tbodyLimites = document.querySelector("#tablaLimites tbody");
    tbodyLimites.innerHTML = Inspections.limites
      .map(
        (l) => `<tr><td>${l.matriz === "agua" ? "Agua" : "Aire"}</td><td>${escapeHTML(l.parametro)}</td><td>${escapeHTML(l.limite)}</td><td>${escapeHTML(l.unidad)}</td></tr>`
      )
      .join("");
  }
  async function refrescarDatos() {
    [fuentes, inspecciones] = await Promise.all([DB.getFuentes(), DB.getInspecciones()]);
    paginaHistorico = 1;
    poblarFuentesSelect();
    renderStats();
    renderMap();
    renderHistorico(document.getElementById("buscarHistorico").value);
    renderResumen();
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
      btnNuevaFuente.disabled = false;
      btnInsp.disabled = false;
      btnGuardar.disabled = false;
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
    backdrop.hidden = false;
    document.body.classList.add("has-modal-open");
    if (id === "modalFuente") {
      if (!preserveForm) document.getElementById("formFuente").reset();
      document.getElementById("fuenteError").hidden = true;
    } else {
      document.getElementById("loginError").hidden = true;
    }
    backdrop.querySelector("input, select, textarea, button")?.focus();
  }
  function closeModal(id) {
    document.getElementById(id).hidden = true;
    if (![...document.querySelectorAll(".modal-backdrop")].some((modal) => !modal.hidden)) {
      document.body.classList.remove("has-modal-open");
    }
  }

  function wireLoginModal() {
    document.getElementById("btnLogin").addEventListener("click", () => {
      if (Auth.user()) {
        Auth.logout();
        reflejarSesion();
        toast("Sesión cerrada.");
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

    document.getElementById("formLogin").addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("loginEmail").value;
      const password = document.getElementById("loginPassword").value;
      const errorEl = document.getElementById("loginError");
      errorEl.hidden = true;
      try {
        await Auth.login(email, password);
        closeModal("modalLogin");
        e.target.reset();
        reflejarSesion();
        toast("Sesión iniciada correctamente.");
        if (abrirFuenteDespuesDelLogin) {
          abrirFuenteDespuesDelLogin = false;
          abrirRegistroNuevaFuente?.(true);
        }
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.hidden = false;
      }
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

    document.getElementById("formFuente").addEventListener("submit", async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById("fuenteError");
      errorEl.hidden = true;
      const nombre = document.getElementById("nfNombre").value.trim();
      const tipo = document.getElementById("nfCategoria").value;
      const ubicacion = document.getElementById("nfUbicacion").value.trim();
      const lat = parseFloat(document.getElementById("nfLat").value);
      const lng = parseFloat(document.getElementById("nfLng").value);
      if (!nombre || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < 7 || lat > 10 || lng < -83.5 || lng > -77) {
        errorEl.textContent = "Completa el nombre y usa coordenadas válidas dentro de Panamá (latitud 7–10, longitud -83.5– -77).";
        errorEl.hidden = false;
        return;
      }
      try {
        const nuevaFuente = await DB.addFuente({ nombre, tipo, ubicacion, lat, lng });
        const volverAInspeccion = regresarAInspeccionDespuesDeFuente;
        cerrarFuenteModal();
        await refrescarDatos();
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
      }
    });
  }

  function wireInspeccionForm() {
    document.getElementById("btnRegistrarInspeccion").addEventListener("click", () => {
      document.querySelector('.tab[data-tab="inspeccion"]').click();
      document.getElementById("fFuente").focus();
    });

    document.getElementById("fFuente").addEventListener("change", ajustarMatrizFuente);
    document.getElementById("fFuente").addEventListener("change", actualizarDetalleFuente);
    document.getElementById("fInspector").placeholder = "Nombre de la persona que realiza la medición";
    document.getElementById("fFuente").title = "Selecciona un punto ya registrado o crea uno nuevo";
    document.getElementById("fFecha").value = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    document.getElementById("fMatriz").addEventListener("change", poblarParametros);

    document.getElementById("formInspeccion").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fuente_id = document.getElementById("fFuente").value;
      const inspector = document.getElementById("fInspector").value.trim();
      const matriz = document.getElementById("fMatriz").value;
      const parametro = document.getElementById("fParametro").value;
      const valor = parseFloat(document.getElementById("fValor").value);
      const fecha = document.getElementById("fFecha").value;
      const observaciones = document.getElementById("fObservaciones").value.trim();

      if (!fuente_id || !inspector || Number.isNaN(valor) || !fecha) {
        toast("Completa todos los campos obligatorios.", true);
        return;
      }

      const fuente = fuentes.find((f) => String(f.id) === fuente_id);
      if (!fuente || fuente.tipo !== matriz) {
        toast("La matriz de medición debe coincidir con el tipo de la fuente.", true);
        return;
      }
      const evalRes = Inspections.evaluar(matriz, parametro, valor);
      const registro = {
        fuente_id, inspector, matriz, parametro, valor, fecha,
        observaciones, unidad: evalRes.unidad, cumple: evalRes.cumple,
      };

      try {
        await DB.addInspeccion(registro);
        e.target.reset();
        document.getElementById("fFecha").value = "";
        ajustarMatrizFuente();
        await refrescarDatos();
        toast(
          evalRes.cumple
            ? "Medición guardada: dentro del límite permitido ✅"
            : `⚠️ Medición supera el LMP (${evalRes.limite} ${evalRes.unidad}) — fuente marcada en alerta.`,
          !evalRes.cumple
        );
      } catch (err) {
        toast("No se pudo guardar la medición: " + err.message, true);
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
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const nombre = form.elements.namedItem("nombre");
      const celular = form.elements.namedItem("celular");
      const comentario = form.elements.namedItem("comentario");
      nombre.value = nombre.value.trim().replace(/\s+/g, " ");
      comentario.value = comentario.value.trim();
      nombre.setCustomValidity(nombre.value.split(" ").length >= 2 ? "" : "Escribe tu nombre y al menos un apellido.");
      const digitosCelular = celular.value.replace(/\D/g, "").length;
      if (digitosCelular < 8 || digitosCelular > 15) {
        celular.setCustomValidity("El celular debe tener entre 8 y 15 dígitos.");
      } else {
        celular.setCustomValidity("");
      }
      if (!form.reportValidity()) return;

      const boton = form.querySelector('button[type="submit"]');
      boton.disabled = true;
      status.textContent = "Enviando tu mensaje…";
      status.classList.remove("is-error");
      try {
        const data = new URLSearchParams(new FormData(form));
        const response = await fetch("/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: data.toString(),
        });
        if (!response.ok) throw new Error("No se pudo enviar el mensaje.");
        form.reset();
        status.textContent = "Gracias. Tu mensaje fue recibido y quedará disponible para el equipo.";
      } catch {
        status.textContent = "No pudimos enviar el mensaje. Inténtalo de nuevo más tarde.";
        status.classList.add("is-error");
      } finally {
        boton.disabled = false;
      }
    });
  }

  function wireReporte() {
    document.getElementById("btnReporte").addEventListener("click", () => {
      const conEstado = fuentesConEstado();
      const filasFuentes = conEstado
        .map(
          (f) => `<tr><td>${escapeHTML(f.nombre)}</td><td>${f.tipo === "agua" ? "Agua" : "Aire"}</td>
          <td class="${f.estado === "alerta" ? "alerta" : "ok"}">${f.estado === "alerta" ? "Alerta roja" : f.estado === "ok" ? "En regla" : "Sin datos"}</td>
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
      SIDExport.reportePDF(html);
    });
  }

  function wireExportFooter() {
    document.getElementById("footerExportJson").addEventListener("click", () => SIDExport.exportJSON());
    document.getElementById("footerExportCsv").addEventListener("click", () => SIDExport.exportCSV());
  }

  async function init() {
    await DB.init();
    await Inspections.cargarLimites();
    await Auth.restore();

    document.getElementById("dbModeTag").textContent =
      "Modo: " + (DB.mode() === "supabase" ? "Conectado a Supabase" : "Demo (localStorage)");

    wireTabs(".tab", "tab-");
    wireNavigation();
    wireContactForm();
    wireHomeParallax();
    wireFiltrosMapa();
    wireLoginModal();
    wireFuenteModal();
    wireInspeccionForm();
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (!document.getElementById("modalFuente").hidden) {
          document.getElementById("btnCancelFuente").click();
        } else if (!document.getElementById("modalLogin").hidden) {
          closeModal("modalLogin");
        }
      }
    });
    wireHistoricoBuscar();
    wireReporte();
    wireExportFooter();
    reflejarSesion();

    poblarParametros();
    await refrescarDatos();
  }

  return { init };
})();
