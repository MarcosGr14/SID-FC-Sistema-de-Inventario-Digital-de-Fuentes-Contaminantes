const Inspections = (() => {
  let limites = [];
  async function cargarLimites() { limites = await DB.getLimites(); return limites; }
  function porMatriz(matriz) {
    const options=new Map(limites.filter(row=>row.matriz===matriz).map(row=>[row.parametro,row]));
    for(const guide of MeasurementGuide.items.filter(row=>row.matriz===matriz)){
      if(!options.has(guide.parametro))options.set(guide.parametro,{matriz,parametro:guide.parametro,unidad:guide.unidad,limite:null});
    }
    return [...options.values()];
  }
  function limiteDe(matriz,parametro){return porMatriz(matriz).find(row=>row.parametro===parametro);}
  function evaluar(matriz,parametro,valor,fecha=new Date(),criterioId=''){
    const profile=MeasurementGuide.byId(criterioId),unit=limiteDe(matriz,parametro)?.unidad||'';
    const result=MeasurementGuide.evaluateSnapshot(profile,valor,{matriz,parametro,unidad:unit,fecha});
    return {...result,unidad:unit,limite:profile?.max??null,minimo:profile?.min??null,umbral_aviso:null,referencia_normativa:profile?.norma||'',criterio:profile||null};
  }
  function interpretar(registro){
    if(registro.criterio_detalle)return MeasurementGuide.evaluateSnapshot(registro.criterio_detalle,registro.valor,registro);
    if(registro.origen_dato==='simulacion')return {estado:'sin_referencia',cumple:true,etiqueta:'Sin criterio documentado'};
    if((registro.criterio_minimo!=null||registro.criterio_maximo!=null)&&/^https:\/\//.test(registro.referencia_criterio||'')){
      return MeasurementGuide.evaluateSnapshot({matriz:registro.matriz,parametro:registro.parametro,unidad:registro.unidad,min:registro.criterio_minimo,max:registro.criterio_maximo},registro.valor,registro);
    }
    return {estado:'sin_referencia',cumple:true,etiqueta:'Sin criterio documentado'};
  }
  return {cargarLimites,porMatriz,limiteDe,evaluar,interpretar,get limites(){return limites;}};
})();
