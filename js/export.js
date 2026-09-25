
const SIDExport = (() => {
  function download(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function timestamp() {
    return new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  }

  async function exportJSON() {
    const [fuentes, inspecciones, limites] = await Promise.all([
      DB.getFuentes(),
      DB.getInspecciones(),
      DB.getLimites(),
    ]);
    const backup = {
      generado: new Date().toISOString(),
      modo: DB.mode(),
      fuentes,
      inspecciones,
      limites,
    };
    download(`sidfc-backup-${timestamp()}.json`, JSON.stringify(backup, null, 2), "application/json");
  }

  async function exportCSV() {
    const [fuentes, inspecciones] = await Promise.all([DB.getFuentes(), DB.getInspecciones()]);
    const fuentesById = Object.fromEntries(fuentes.map((f) => [f.id, f.nombre]));

    const header = ["Fecha", "Fuente", "Matriz", "Parametro", "Valor", "Unidad", "Cumple", "Inspector", "Observaciones"];
    const rows = inspecciones.map((i) => [
      i.fecha,
      fuentesById[i.fuente_id] || i.fuente_id,
      i.matriz,
      i.parametro,
      i.valor,
      i.unidad,
      i.cumple ? "Sí" : "No",
      i.inspector,
      (i.observaciones || "").replace(/[\n,]/g, " "),
    ]);

    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    download(`sidfc-inspecciones-${timestamp()}.csv`, "\uFEFF" + csv, "text/csv;charset=utf-8;");
  }

  
  async function reportePDF(resumenHTML) {
    const win = window.open("", "_blank");
    win.document.write(`
      <html lang="es"><head><meta charset="UTF-8"><title>Reporte SID-FC</title>
      <style>
        body{font-family:Arial,sans-serif;color:#12201a;padding:2rem;}
        h1{color:#0f3d2c;} table{width:100%;border-collapse:collapse;margin-top:1rem;}
        th,td{border:1px solid #ccc;padding:.4rem .6rem;font-size:.85rem;text-align:left;}
        th{background:#eef2ec;}
        .alerta{color:#d64541;font-weight:bold;}
        .ok{color:#1f9d5c;font-weight:bold;}
      </style></head><body>
      <h1>🌿 SID-FC — Reporte de Fuentes Contaminantes</h1>
      <p>Generado: ${new Date().toLocaleString("es-PA")}</p>
      ${resumenHTML}
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }

  return { exportJSON, exportCSV, reportePDF };
})();
