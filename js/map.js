
const SIDMap = (() => {
  let map, markersLayer, tileLayer, previewMarker = null;
  let placementCallback = null;
  const markersBySource = new Map();

  function init() {
    if (map) return;
    map = L.map("map", { scrollWheelZoom: false }).setView(SID_CONFIG.MAP_CENTER, SID_CONFIG.MAP_ZOOM);

    tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);

    map.on("click", (e) => {
      if (placementCallback) {
        placementCallback(e.latlng);
      }
    });
    requestAnimationFrame(() => map.invalidateSize());
    window.addEventListener("resize", () => map.invalidateSize({ pan: false }));
  }

  function iconFor(estado) {
    const color = estado === "alerta" ? "#d64541" : estado === "bueno" ? "#1f9d5c" : estado === "intermedio" ? "#d59a24" : "#7c8b83";
    return L.divIcon({
      className: "",
      html: `<div style="
        width:26px;height:26px;border-radius:50% 50% 50% 0;
        background:${color};transform:rotate(-45deg);
        border:2px solid #fff; box-shadow:0 2px 6px rgba(0,0,0,.35);
      "></div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 26],
      popupAnchor: [0, -24],
    });
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
      const marker = L.marker([f.lat, f.lng], { icon: iconFor(f.estado) });
      const estadoTxt = ({ alerta: "⚠️ Alerta según criterio", intermedio: "◉ Rango preventivo", bueno: "✓ Bajo criterio configurado", sin_referencia: "— Sin criterio de referencia", sin_datos: "— Sin mediciones" })[f.estado] || "— Sin datos";
      const popup = document.createElement("div");
      const nombre = document.createElement("strong");
      nombre.textContent = f.nombre;
      const tipo = document.createElement("div");
      tipo.textContent = `Medio: ${{ agua: "Agua", aire: "Aire", suelo: "Suelo" }[f.tipo] || f.tipo} · Categoría: ${String(f.categoria_fuente || "otro").replaceAll("_", " ")}`;
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
      coordenadas.textContent = `Coordenadas: ${Number(f.lat).toFixed(5)}, ${Number(f.lng).toFixed(5)}`;
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
      const tooltip = document.createElement("div");
      tooltip.className = "map-hover-card";
      const tooltipText = document.createElement("span");
      tooltipText.textContent = `${f.nombre} · ${estadoTxt}`;
      tooltip.append(tooltipText);
      if (f._fotoMapa) {
        const thumb = document.createElement("img"); thumb.src = f._fotoMapa; thumb.alt = ""; thumb.className = "map-hover-photo"; thumb.loading = "lazy"; thumb.addEventListener("error", () => thumb.remove(), { once: true }); tooltip.prepend(thumb);
      }
      marker.bindTooltip(tooltip, { direction: "top", offset: [0, -18], opacity: 1, className: "map-hover-tooltip" });
      markersBySource.set(String(f.id), marker);
      marker.addTo(markersLayer);
    });

    return visibles.length;
  }

  function enablePlacement(cb) {
    placementCallback = cb;
    map.scrollWheelZoom.disable();
    map.getContainer().style.cursor = "crosshair";
  }
  function disablePlacement() {
    placementCallback = null;
    map.scrollWheelZoom.enable();
    map.getContainer().style.cursor = "";
    if (previewMarker) markersLayer.removeLayer(previewMarker);
    previewMarker = null;
  }

  function invalidateSize() {
    if (!map) return;
    requestAnimationFrame(() => {
      map.invalidateSize({ pan: false });
      tileLayer?.redraw();
    });
  }

  function focus(lat, lng) {
    if (!map || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    map.setView([lat, lng], Math.max(map.getZoom(), 15), { animate: true });
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

  return { init, isInitialized: () => Boolean(map), render, enablePlacement, disablePlacement, setMarkerPreview, invalidateSize, focus, focusFuente };
})();
