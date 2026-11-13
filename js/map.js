
const SIDMap = (() => {
  let map, markersLayer, tileLayer, previewMarker = null;
  let placementCallback = null;
  const markersBySource = new Map();
  let fitted=false;

  function init() {
    if (map) return;
    map = L.map("map", { scrollWheelZoom: false, minZoom:5, maxZoom:19 }).setView(SID_CONFIG.MAP_CENTER, SID_CONFIG.MAP_ZOOM);

    tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const terrain=L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",{maxZoom:17,attribution:'Map data © OpenStreetMap contributors · Elevation SRTM · Style © OpenTopoMap (CC-BY-SA)'});
    L.control.layers({"Calles":tileLayer,"Relieve":terrain}, {},{position:"topright",collapsed:true}).addTo(map);
    L.control.scale({imperial:false,position:"bottomleft"}).addTo(map);
    markersLayer = L.layerGroup().addTo(map);

    map.on("click", (e) => {
      if (placementCallback) {
        placementCallback(e.latlng);
      }
    });
    requestAnimationFrame(() => map.invalidateSize());
    window.addEventListener("resize", () => map.invalidateSize({ pan: false }));
  }

  function iconFor(estado,tipo) {
    const colors={alerta:"#b73c38",bueno:"#19734c",intermedio:"#b37a13"};
    const symbols={agua:'<path d="M12 3C9 8 5 11 5 15a7 7 0 0 0 14 0c0-4-4-7-7-12Z"/>',aire:'<path d="M3 8h12c6 0 6-7 1-5M3 12h16c5 0 5 7 0 6M3 16h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',suelo:'<path d="m2 20 7-14 5 8 3-5 6 11H2Z"/>'};
    return L.divIcon({className:"sid-marker",html:`<span class="sid-marker__pin" style="--marker-color:${colors[estado]||"#61776b"}"><svg viewBox="0 0 24 24" aria-hidden="true">${symbols[tipo]||symbols.suelo}</svg></span>`,iconSize:[40,44],iconAnchor:[20,42],popupAnchor:[0,-38]});
  }

  function render(fuentesConEstado, filtro = "todas", onViewSource = null) {
    markersLayer.clearLayers();
    markersBySource.clear();
    previewMarker = null;

    const visibles = fuentesConEstado.filter((f) => {
      if (filtro === "todas") return true;
      if (filtro === "alerta") return f.estado === "alerta";
      return f.tipo === filtro;
    });

    visibles.forEach((f) => {
      const lat = Number(f.lat);
      const lng = Number(f.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
      const marker = L.marker([f.lat, f.lng], { icon: iconFor(f.estado,f.tipo),title:f.nombre,alt:f.nombre });
      const estadoTxt = ({ alerta: "⚠️ Alerta según criterio", intermedio: "◉ Rango preventivo", bueno: "✓ Bajo criterio configurado", sin_referencia: "— Sin criterio de referencia", sin_datos: "— Sin mediciones" })[f.estado] || "— Sin datos";
      const popup = document.createElement("div");
      const nombre = document.createElement("strong");
      nombre.textContent = f.nombre;
      const tipo = document.createElement("div");
      tipo.textContent = `Medio: ${{ agua: "Agua", aire: "Aire", suelo: "Suelo" }[f.tipo] || f.tipo} · Categoría: ${({punto_muestreo:"Punto de monitoreo",residuos_solidos:"Residuos sólidos",erosion_suelo:"Erosión y sedimentos",extraccion_materiales:"Extracción de materiales",emision_atmosferica:"Emisión atmosférica",descarga_agua:"Descarga de agua",otro:"Otra"})[f.categoria_fuente] || "Otra"}`;
      const estado = document.createElement("div");
      estado.textContent = estadoTxt;
      popup.append(nombre, tipo, estado);
      if (f._fotoMapa) {
        const imagen = document.createElement("img");
        imagen.src = f._fotoMapa;
        imagen.alt = `Fotografía de ${f.nombre}`;
        imagen.className = "map-source-photo";
        imagen.loading = "lazy";
        imagen.addEventListener("error", () => imagen.remove(), { once: true });
        popup.appendChild(imagen);
      }
      if (f.ubicacion) {
        const referencia = document.createElement("div");
        referencia.textContent = `Sitio: ${f.ubicacion}`;
        popup.appendChild(referencia);
      }
      const coordenadas = document.createElement("small");
      coordenadas.textContent = `${f.esDemostracion ? "Referencia WGS 84" : "Coordenadas WGS 84"}: ${Number(f.lat).toFixed(5)}, ${Number(f.lng).toFixed(5)}`;
      popup.appendChild(coordenadas);
      if (onViewSource) {
        const button = document.createElement("button"); button.type = "button"; button.textContent = "Ver expediente"; button.className = "map-profile-link";
        button.addEventListener("click", () => onViewSource(f.id)); popup.appendChild(button);
      }
      if (f.ultimaMedicion) {
        const ultima = document.createElement("small");
        ultima.textContent = `Última medición: ${f.ultimaMedicion}`;
        popup.appendChild(ultima);
      }
      marker.bindPopup(popup);
      marker.on("popupopen", () => marker.closeTooltip());
      const tooltip = document.createElement("div");
      tooltip.className = "map-hover-card";
      const tooltipText = document.createElement("div");
      tooltipText.className = "map-hover-card__body";
      const tooltipName = document.createElement("strong");
      tooltipName.textContent = f.nombre;
      const tooltipState = document.createElement("span");
      tooltipState.textContent = estadoTxt;
      tooltipText.append(tooltipName, tooltipState);
      tooltip.append(tooltipText);
      if (f._fotoMapa) {
        const thumb = document.createElement("img"); thumb.src = f._fotoMapa; thumb.alt = ""; thumb.className = "map-hover-photo"; thumb.loading = "lazy"; thumb.addEventListener("error", () => thumb.remove(), { once: true }); tooltip.prepend(thumb);
      }
      marker.bindTooltip(tooltip, { direction: "top", offset: [0, -18], opacity: 1, className: "map-hover-tooltip" });
      markersBySource.set(String(f.id), marker);
      marker.addTo(markersLayer);
    });

    if(!fitted&&markersBySource.size)fitVisible();
    return visibles.length;
  }

  function updatePhotos(fuentes) {
    for (const fuente of fuentes) {
      const marker = markersBySource.get(String(fuente.id));
      if (!marker) continue;
      const popup = marker.getPopup()?.getContent();
      const tooltip = marker.getTooltip()?.getContent();
      const url = fuente._fotoMapa;
      for (const [container, className] of [[popup, "map-source-photo"], [tooltip, "map-hover-photo"]]) {
        if (!container?.querySelector) continue;
        const previous = container.querySelector(`.${className}`);
        if (previous?.getAttribute("src") === url) continue;
        previous?.remove();
        if (!url) continue;
        const image = document.createElement("img");
        image.src = url; image.className = className; image.loading = "lazy";
        image.alt = className === "map-source-photo" ? `Fotografía de ${fuente.nombre}` : "";
        image.addEventListener("error", () => image.remove(), { once:true });
        if (className === "map-hover-photo") container.prepend(image);
        else container.children[2]?.after(image);
      }
      if (marker.isTooltipOpen()) marker.getTooltip().update();
      if (marker.isPopupOpen()) marker.getPopup().update();
    }
  }

  function enablePlacement(cb) {
    placementCallback = cb;
    map.scrollWheelZoom.disable();
    map.getContainer().style.cursor = "crosshair";
  }
  function disablePlacement() {
    placementCallback = null;
    map.scrollWheelZoom.disable();
    map.getContainer().style.cursor = "";
    if (previewMarker) markersLayer.removeLayer(previewMarker);
    previewMarker = null;
  }

  function invalidateSize() {
    if (!map) return;
    requestAnimationFrame(() => {
      map.invalidateSize({ pan: false });
      if(!fitted&&markersBySource.size)fitVisible();
      tileLayer?.redraw();
    });
  }

  function focus(lat, lng) {
    if (!map || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    map.setView([lat, lng], Math.max(map.getZoom(), 15), { animate: true });
  }

  function fitVisible() {
    if(!map||!map.getContainer().clientWidth||!map.getContainer().clientHeight)return;
    const points=[...markersBySource.values()].map(m=>m.getLatLng());
    if(points.length)map.fitBounds(L.latLngBounds(points).pad(.15),{maxZoom:13,padding:[24,24]});
    else map.setView([8.65,-80.25],7);
    fitted=true;
  }
  function focusFuente(id) {
    const marker = markersBySource.get(String(id));
    if (!map || !marker) return;
    map.setView(marker.getLatLng(), Math.max(map.getZoom(), 15), { animate: true });
    marker.openPopup();
  }

  function setMarkerPreview(latlng) {
    if (previewMarker) markersLayer.removeLayer(previewMarker);
    previewMarker = L.marker(latlng, { title: "Ubicación seleccionada" }).addTo(markersLayer);
  }

  return { init, isInitialized: () => Boolean(map), render, enablePlacement, disablePlacement, setMarkerPreview, invalidateSize, focus, focusFuente, fitVisible, updatePhotos };
})();
