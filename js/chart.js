const SIDChart = (() => {
  function render(holder, rows, mode = "line") {
    holder.replaceChildren();
    if (!rows.length) { holder.textContent = "Aún no hay resultados para este parámetro."; return; }
    const width = holder.clientWidth > 0 && holder.clientWidth < 600 ? 480 : 800;
    const height = 270, pad = { left: 58, right: 24, top: 25, bottom: 45 };
    const values = rows.map(row => Number(row.valor)).filter(Number.isFinite);
    if (!values.length) { holder.textContent = "No hay valores numéricos para graficar."; return; }
    const min = Math.min(...values), max = Math.max(...values);
    const spread = max - min || Math.max(Math.abs(max) * .15, 1);
    const low = mode === "bars" ? Math.min(0, min - spread * .12) : min - spread * .12;
    const high = max + spread * .15;
    const times = rows.map(row => new Date(row.fecha).getTime()), tmin = Math.min(...times), tmax = Math.max(...times);
    const xFor = (time, index) => tmax === tmin ? pad.left + (index + .5) * (width - pad.left - pad.right) / rows.length : pad.left + (time - tmin) / (tmax - tmin) * (width - pad.left - pad.right);
    const points = rows.map((row, index) => ({ row, x: xFor(times[index], index), y: height - pad.bottom - (Number(row.valor) - low) / (high - low) * (height - pad.top - pad.bottom) }));
    const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`); svg.setAttribute("role", "group");
    svg.setAttribute("aria-label", `${rows[0].parametro}: ${rows.length} mediciones, vista ${mode}.`);
    const make = (name, attrs, text) => { const el = document.createElementNS(ns, name); for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value); if (text != null) el.textContent = text; return el; };
    for (let n = 0; n <= 4; n++) {
      const y = pad.top + n * (height - pad.top - pad.bottom) / 4;
      svg.append(make("line", { x1: pad.left, x2: width - pad.right, y1: y, y2: y, class: "chart-grid" }));
      svg.append(make("text", { x: pad.left - 10, y: y + 4, "text-anchor": "end", class: "chart-label" }, (high - n * (high - low) / 4).toLocaleString("es-PA", { maximumFractionDigits: 2 })));
    }
    const zeroY = height - pad.bottom - (0 - low) / (high - low) * (height - pad.top - pad.bottom);
    if (mode === "line" && points.length > 1) {
      const coords = points.map(point => `${point.x},${point.y}`).join(" ");
      svg.append(make("polygon", { points: `${pad.left},${height - pad.bottom} ${coords} ${points.at(-1).x},${height - pad.bottom}`, class: "chart-area" }));
      svg.append(make("polyline", { points: coords, class: "chart-line" }));
    }
    const readout = document.createElement("div"); readout.className = "chart-readout"; readout.setAttribute("aria-live", "polite");
    const controls = [];
    const choose = (point, index) => {
      controls.forEach((control, current) => { control.classList.toggle("is-selected", current === index); control.setAttribute("aria-pressed", String(current === index)); });
      readout.replaceChildren();
      const value = document.createElement("strong"); value.textContent = `${point.row.valor} ${point.row.unidad || ""}`;
      const date = document.createElement("span"); date.textContent = new Date(point.row.fecha).toLocaleString("es-PA");
      readout.append(value, date);
      if (point.row.inspector) { const who = document.createElement("small"); who.textContent = point.row.inspector.replace(/\s*\(DEMO\)/gi, ""); readout.append(who); }
    };
    points.forEach((point, index) => {
      const color = ({ alerta: "#b73c38", intermedio: "#b37a13", bueno: "#19734c" })[point.row.estado] || "#61776b";
      const control = mode === "bars" ? make("rect", {
        x: point.x - Math.min(28, (width - pad.left - pad.right) / points.length * .32),
        y: Math.min(point.y, zeroY),
        width: Math.min(56, (width - pad.left - pad.right) / points.length * .64),
        height: Math.max(2, Math.abs(zeroY - point.y)), rx: 3,
        class: "chart-bar chart-point", tabindex: 0, role: "button",
        "aria-label": `${new Date(point.row.fecha).toLocaleDateString("es-PA")}: ${point.row.valor} ${point.row.unidad || ""}`
      }) : make("circle", { cx: point.x, cy: point.y, r: mode === "points" ? 7 : 5, class: "chart-point", tabindex: 0, role: "button", "aria-label": `${new Date(point.row.fecha).toLocaleDateString("es-PA")}: ${point.row.valor} ${point.row.unidad || ""}` });
      control.style.fill = color;
      control.append(make("title", {}, `${point.row.valor} ${point.row.unidad || ""} · ${new Date(point.row.fecha).toLocaleDateString("es-PA")}`));
      control.addEventListener("pointerenter", () => choose(point, index)); control.addEventListener("focus", () => choose(point, index));
      control.addEventListener("click", () => choose(point, index));
      control.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(point, index); }
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); controls[(index + (event.key === "ArrowRight" ? 1 : -1) + points.length) % points.length].focus(); }
      });
      controls.push(control); svg.append(control);
      if (index === 0 || index === points.length - 1 || index % Math.max(1, Math.ceil(points.length / 4)) === 0) {
        svg.append(make("text", { x: point.x, y: height - 16, "text-anchor": "middle", class: "chart-label" }, new Date(point.row.fecha).toLocaleDateString("es-PA", { day: "2-digit", month: "short" })));
      }
    });
    holder.append(svg, readout);
    choose(points.at(-1), points.length - 1);
  }
  return { render };
})();
