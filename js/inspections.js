
const Inspections = (() => {
  let limites = [];

  async function cargarLimites() {
    limites = await DB.getLimites();
    return limites;
  }

  function porMatriz(matriz) {
    return limites.filter((l) => l.matriz === matriz);
  }

  function limiteDe(matriz, parametro) {
    return limites.find((l) => l.matriz === matriz && l.parametro === parametro);
  }

  
  function evaluar(matriz, parametro, valor) {
    const lim = limiteDe(matriz, parametro);
    if (!lim) return { cumple: true, limite: null, unidad: "" };
    return {
      cumple: Number(valor) <= lim.limite,
      limite: lim.limite,
      unidad: lim.unidad,
    };
  }

  return { cargarLimites, porMatriz, limiteDe, evaluar, get limites() { return limites; } };
})();
