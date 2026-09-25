
const SIDMap = (() => {
  let map, markersLayer, tileLayer, previewMarker = null;
  let placementCallback = null;

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
    const color = estado === "alerta" ? "#d64541" : estado === "ok" ? "#1f9d5c" : "#7c8b83";
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

  
  function render(fuentesConEstado, filtro = "todas") {
    markersLayer.clearLayers();
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
      const estadoTxt =
        f.estado === "alerta" ? "⚠️ Alerta roja" : f.estado === "ok" ? "✅ En regla" : "— Sin mediciones";
      const popup = document.createElement("div");
      const nombre = document.createElement("strong");
      nombre.textContent = f.nombre;
      const tipo = document.createElement("div");
      tipo.textContent = `Tipo: ${f.tipo === "agua" ? "Descarga de agua" : "Emisión atmosférica"}`;
      const estado = document.createElement("div");
      estado.textContent = estadoTxt;
      popup.append(nombre, tipo, estado);
      if (f.ubicacion) {
        const referencia = document.createElement("div");
        referencia.textContent = `Sitio: ${f.ubicacion}`;
        popup.appendChild(referencia);
      }
      const coordenadas = document.createElement("small");
      coordenadas.textContent = `Coordenadas: ${Number(f.lat).toFixed(5)}, ${Number(f.lng).toFixed(5)}`;
      popup.appendChild(coordenadas);
      if (f.ultimaMedicion) {
        const ultima = document.createElement("small");
        ultima.textContent = `Última medición: ${f.ultimaMedicion}`;
        popup.appendChild(ultima);
      }
      marker.bindPopup(popup);
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

  function setMarkerPreview(latlng) {
    if (previewMarker) markersLayer.removeLayer(previewMarker);
    previewMarker = L.marker(latlng, { title: "Ubicación seleccionada" }).addTo(markersLayer);
  }

  return { init, isInitialized: () => Boolean(map), render, enablePlacement, disablePlacement, setMarkerPreview, invalidateSize, focus };
})();
