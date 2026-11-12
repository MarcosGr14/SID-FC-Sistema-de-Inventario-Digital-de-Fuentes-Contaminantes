
const Inspections = (() => {
  let limites = [];

  async function cargarLimites() {
    limites = await DB.getLimites();
    return limites;
  }

  function porMatriz(matriz) {
    const guardados = limites.filter((l) => l.matriz === matriz);
    const adicionales = typeof MeasurementGuide === "undefined" ? [] : MeasurementGuide.items.filter((g) => g.matriz === matriz && !guardados.some((l) => l.parametro === g.parametro)).map((g) => ({ ...g, limite:null }));
    return [...guardados, ...adicionales];
  }

  function limiteDe(matriz, parametro) {
    return porMatriz(matriz).find((l) => l.parametro === parametro);
  }

  
  function evaluar(matriz, parametro, valor, fechaMedicion = new Date()) {
    const lim = limiteDe(matriz, parametro);
    const fecha = new Date(fechaMedicion);
    const sinVigencia = lim && ((lim.vigente_desde && fecha < new Date(`${lim.vigente_desde}T00:00:00`)) || (lim.vigente_hasta && fecha > new Date(`${lim.vigente_hasta}T23:59:59`)));
    if (!lim || lim.limite == null || sinVigencia) {
      return { cumple: true, estado: "sin_referencia", limite: lim?.limite ?? null, umbral_aviso: lim?.umbral_aviso ?? null, unidad: lim?.unidad || "", referencia_normativa: lim?.referencia_normativa || "" };
    }
    const tieneUmbral = lim.umbral_aviso != null && Number.isFinite(Number(lim.umbral_aviso));
    const estado = Number(valor) > Number(lim.limite) ? "alerta" : tieneUmbral && Number(valor) >= Number(lim.umbral_aviso) ? "intermedio" : "bueno";
    return {
      cumple: estado !== "alerta",
      estado,
      limite: lim.limite,
      umbral_aviso: lim.umbral_aviso ?? null,
      unidad: lim.unidad,
      referencia_normativa: lim.referencia_normativa || "",
    };
  }

  return { cargarLimites, porMatriz, limiteDe, evaluar, get limites() { return limites; } };
})();
