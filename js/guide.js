const MeasurementGuide = (() => {
  const checked = '2026-11-13';
  const sources = {
    effluent:'https://mici.gob.pa/wp-content/uploads/2021/12/35rt-dgnti-copanit-35-2019-1.pdf',
    amendment:'https://www.gacetaoficial.gob.pa/storage/gacetas/2025/02/30224/GacetaNo_30224_20250221.pdf',
    recreation:'https://www.gacetaoficial.gob.pa/storage/gacetas/2008/07/26078/GacetaNo_26078_20080708.pdf',
    whoAir:'https://www.who.int/publications/i/item/9789240034228',
    whoWater:'https://iris.who.int/bitstream/handle/10665/375822/9789240088740-eng.pdf',
    epa:'https://document.airnow.gov/technical-assistance-document-for-the-reporting-of-daily-air-quailty.pdf',
    lead:'https://www.ccme.ca/en/chemical/124',
    cadmium:'https://ccme.ca/en/res/cadmium-canadian-soil-quality-guidelines-for-the-protection-of-environmental-and-human-health-en.pdf',
    phc:'https://ccme.ca/en/res/cws_phc_standard_1.0_e.pdf',
    emissions:'https://faolex.fao.org/docs/pdf/pan90271.pdf',
    soil:'https://www.nrcs.usda.gov/conservation-basics/soil/soil-health',
    oxygen:'https://oceanservice.noaa.gov/facts/hypoxia.html'
  };
  const items=[];
  const slug=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  function add(context, parametro, unidad, min, max, extra={}) {
    items.push({ ...context, id:context.key+'-'+slug(parametro), parametro, unidad, min, max, verificadoEn:checked, ...extra });
  }
  const effluent={key:'pa-efluente-2019-2025',matriz:'agua',tipo:'norma',contexto:'Descarga de efluente a cuerpo receptor · Panamá',norma:'DGNTI-COPANIT 35-2019, tabla 1; Resolución 13/2025',fuente:sources.effluent,fuenteComplementaria:sources.amendment,desde:'2019-12-28',metodo:'Muestreo en el punto de descarga y ensayo acreditado. Consultar la clasificación de muestras simples/compuestas de la Resolución 13/2025.',nota:'Aplica al efluente, no a una muestra del río receptor. Considerar las excepciones por contenido natural, incertidumbre, permisos y el procedimiento de evaluación. La modificación de 2025 revisada cambia el símbolo del nitrato en la tabla y el protocolo de muestreo; no cambia estos límites.'};
  for(const [name,unit,low,high] of [['DBO5','mg/L',null,50],['DQO','mg/L',null,100],['Sólidos Suspendidos Totales','mg/L',null,35],['Aceites y Grasas','mg/L',null,20],['Conductividad','µS/cm',null,2000],['Turbidez','NTU',null,30],['pH','pH',5.5,8.5],['Diferencia de temperatura','°C',-3,3],['Hidrocarburos totales','mg/L',null,5],['Sólidos disueltos totales','mg/L',null,500]]) add(effluent,name,unit,low,high,name==='Diferencia de temperatura'?{nota:'Diferencia entre la temperatura del efluente y la temperatura natural del cuerpo receptor antes de la descarga; no comparar temperatura absoluta con ±3 °C.'}:{});
  const recreation={key:'pa-recreacion-2008',matriz:'agua',tipo:'norma',contexto:'Agua continental de uso recreativo · Panamá',norma:'Decreto Ejecutivo 75/2008, artículos 11–12 y tabla 1',fuente:sources.recreation,desde:'2008-07-08',metodo:'Muestreo y métodos del capítulo V; pH, temperatura y oxígeno disuelto se miden en campo.',nota:'Niveles por parámetro para un uso recreativo confirmado. Una lectura aislada no acredita aptitud del balneario ni declara una emergencia; se requiere el conjunto de parámetros y el procedimiento de la norma.'};
  add(recreation,'Turbidez','NTU',null,100,{bands:[{max:50,maxExclusive:true,estado:'bueno',label:'Bajo riesgo (parámetro)'},{min:50,max:100,estado:'intermedio',label:'Riesgo medio (parámetro)'},{min:100,minExclusive:true,estado:'alerta',label:'Fuera del nivel medio'}]});
  add(recreation,'Oxígeno disuelto','mg/L',6,null,{bands:[{min:7,minExclusive:true,estado:'bueno',label:'Bajo riesgo (parámetro)'},{min:6,max:7,estado:'intermedio',label:'Riesgo medio (parámetro)'},{max:6,maxExclusive:true,estado:'alerta',label:'Fuera del nivel medio'}]});
  add(recreation,'DBO5','mg/L',null,5,{bands:[{max:3,maxExclusive:true,estado:'bueno',label:'Bajo riesgo (parámetro)'},{min:3,max:5,estado:'intermedio',label:'Riesgo medio (parámetro)'},{min:5,minExclusive:true,estado:'alerta',label:'Fuera del nivel medio'}]});
  add(recreation,'pH','pH',6.5,8.5);
  add(recreation,'Sólidos Suspendidos Totales','mg/L',null,50,{maxExclusive:true});
  add(recreation,'Aceites y Grasas','mg/L',null,10,{maxExclusive:true});
  add(recreation,'Diferencia de temperatura','°C',-3,3,{nota:'Evaluar ΔT frente a la condición natural; no usar este intervalo como temperatura absoluta.'});
  const supply={key:'oms-abastecimiento-2024',matriz:'agua',tipo:'guia',contexto:'Agua de abastecimiento · objetivo operacional OMS',norma:'OMS, pequeñas fuentes de abastecimiento, 2024, tabla 3.5',fuente:sources.whoWater,metodo:'pH con electrodo calibrado; turbidez por nefelometría antes de desinfectar.',nota:'Objetivos operacionales; no acreditan potabilidad ni se aplican a un río. pH y turbidez no sustituyen el control microbiológico.'};
  add(supply,'pH','pH',6.5,8.5);
  add(supply,'Turbidez','NTU',null,1,{maxExclusive:true,nota:'Objetivo <1 NTU antes de desinfectar. Si no es alcanzable, la OMS describe medidas adicionales y mantener <5 NTU; no es un rango universal de calidad de ríos.'});
  const air={key:'oms-aire-2021',matriz:'aire',tipo:'guia',contexto:'Aire ambiente · guía OMS 2021',norma:'OMS 2021, tabla 0.1 de niveles guía',fuente:sources.whoAir,metodo:'Verificar método, calibración, cobertura y período del promedio; una lectura instantánea no equivale a un promedio diario.',nota:'Referencia internacional, no LMP de Panamá. Los valores diarios corresponden al percentil 99 (3–4 días de excedencia por año); una lectura no demuestra cumplimiento anual. No hay un mínimo obligatorio ni una franja preventiva OMS universal.'};
  for(const [name,unit,max] of [['PM2.5 (promedio 24 h)','µg/m³',15],['PM10 (promedio 24 h)','µg/m³',45],['Dióxido de nitrógeno (promedio 24 h)','µg/m³',25],['Monóxido de carbono (promedio 24 h)','mg/m³',4],['Dióxido de azufre (promedio 24 h)','µg/m³',40],['Ozono (promedio 8 h)','µg/m³',100]]) add(air,name,unit,null,max,name.startsWith('Ozono')?{nota:'Guía OMS para el máximo diario del promedio móvil de 8 h. No equivale al valor de temporada pico de 60 µg/m³.'}:{});
  const aqi={key:'epa-aqi-pm-2026',matriz:'aire',tipo:'indice',contexto:'Aire ambiente · categorías AQI de EE. UU.',norma:'EPA, documento técnico AQI, mayo de 2026, tabla 6',fuente:sources.epa,metodo:'Promedio de 24 horas. Truncar PM2.5 a un decimal y PM10 a entero antes de clasificar.',nota:'Categorías estadounidenses usadas como referencia internacional, no norma de Panamá ni bandas OMS. SID-FC resume Moderado como preventivo y las categorías dañinas como alerta; conserva el nombre de la categoría.'};
  const labels=['Bueno','Moderado','Dañino para grupos sensibles','Dañino','Muy dañino','Peligroso'];
  for(const [name,limits,decimals] of [['PM2.5 (promedio 24 h)',[[0,9],[9.1,35.4],[35.5,55.4],[55.5,125.4],[125.5,225.4],[225.5,null]],1],['PM10 (promedio 24 h)',[[0,54],[55,154],[155,254],[255,354],[355,424],[425,null]],0]]) add(aqi,name,'µg/m³',null,null,{decimalesTruncados:decimals,bands:limits.map(([min,max],n)=>({min,max,estado:n===0?'bueno':n===1?'intermedio':'alerta',label:labels[n]}))});
  const lead={key:'ccme-pb-2025',matriz:'suelo',tipo:'guia',norma:'CCME, plomo, criterios provisionales finales 2025',fuente:sources.lead,metodo:'Plomo total en base seca; registrar uso del suelo, medios afectados y vías de exposición.',nota:'Referencia canadiense, no límite panameño. Confirmar escenario de exposición y reporte del sitio; la opción de 0.5 puntos IQ considera otros medios con plomo elevado.'};
  for(const [use,only,additional] of [['Agrícola',70,61],['Residencial/parques',113,61],['Comercial',154,82],['Industrial',600,600]]) {
    add({...lead,key:lead.key+'-'+slug(use)+'-suelo',contexto:`Suelo ${use.toLowerCase()} · exposición solo por suelo · CCME`},'Plomo total','mg/kg',null,only);
    if(additional!==only)add({...lead,key:lead.key+'-'+slug(use)+'-multimedio',contexto:`Suelo ${use.toLowerCase()} · exposición adicional en otros medios · CCME`},'Plomo total','mg/kg',null,additional);
  }
  const cd={key:'ccme-cd-1999',matriz:'suelo',tipo:'guia',norma:'CCME, cadmio, tabla 1, 1999',fuente:sources.cadmium,metodo:'Cadmio total en mg/kg de suelo seco; confirmar uso del suelo.',nota:'Referencia canadiense, no límite panameño. En jardines con producción de alimentos se necesita objetivo específico; no utilizar automáticamente el valor residencial.'};
  for(const [use,max] of [['Agrícola',1.4],['Residencial/parques',10],['Comercial',22],['Industrial',22]])add({...cd,key:cd.key+'-'+slug(use),contexto:`Suelo ${use.toLowerCase()} · CCME`},'Cadmio total','mg/kg',null,max);
  const phc={key:'ccme-phc-2008-grueso',matriz:'suelo',tipo:'guia',contexto:'Suelo superficial grueso agrícola/residencial · CCME',norma:'CCME PHC, tabla 1 revisada en enero de 2008',fuente:sources.phc,metodo:'Separar fracciones F1–F4 por el protocolo CCME, en base seca. Confirmar textura gruesa y exclusión de BTEX/PAH.',nota:'Valores Tier 1 canadienses, no límites de Panamá. No aplicar a hidrocarburos totales sin fraccionar. F1=30 supone contaminación cerca de una residencia; evaluar aguas subterráneas y ajustes del sitio.'};
  for(const [fraction,max] of [['F1 (C6–C10)',30],['F2 (>C10–C16)',150],['F3 (>C16–C34)',300],['F4 (>C34)',2800]])add(phc,'Hidrocarburos '+fraction,'mg/kg',null,max);
  const specific={key:'sitio',tipo:'contextual',norma:'Objetivo específico del sitio',metodo:'Documentar método, línea base, uso y condiciones del sitio.',nota:'No se ha definido un intervalo universal para clasificar esta variable como contaminación. Se necesita un criterio específico documentado.'};
  for(const [matrix,param,unit,source,note] of [
    ['agua','Temperatura','°C',sources.recreation,'Registrar temperatura absoluta. Las normas consultadas emplean ΔT respecto a la temperatura natural, no un máximo universal de temperatura del río.'],
    ['agua','Conductividad','µS/cm',sources.effluent,'El límite de 2000 µS/cm es para efluentes. En un río, interpretar con mineralización natural y línea base; confirmar compensación a 25 °C.'],
    ['suelo','pH','pH',sources.soil,'El pH describe acidez; el objetivo depende de uso, cultivo y extractante. No convertir automáticamente un rango agronómico en riesgo de contaminación.'],
    ['suelo','Materia orgánica','%',sources.soil,'Depende de textura, profundidad y uso. Indicar método; no hay porcentaje universal que por sí solo acredite contaminación.'],
    ['suelo','Hidrocarburos totales','mg/kg',sources.phc,'Especificar fracciones, textura, profundidad, uso y vía de exposición. Los límites por fracción no se aplican a una suma inespecífica.'],
    ['aire','Material Particulado','mg/Nm³',sources.emissions,'Emisión de chimenea: identificar actividad, potencia, combustible, antigüedad y condiciones de referencia. El valor previo de 150 no es universal.'],
    ['aire','Óxidos de Nitrógeno (NOx)','mg/Nm³',sources.emissions,'Seleccionar la actividad y el combustible del artículo 5 del Decreto 5/2009, y verificar permiso y modificaciones. No equivale a NO₂ ambiente.'],
    ['aire','Dióxido de Azufre (SO2)','mg/Nm³',sources.emissions,'El límite depende de la actividad y condiciones del artículo 5 del Decreto 5/2009. No comparar con µg/m³ de aire ambiente.'],
    ['aire','Monóxido de Carbono (CO)','mg/Nm³',sources.emissions,'No se validó el límite genérico previo de 300. Documentar norma/permiso y condiciones de medición antes de clasificar CO en chimenea.']
  ])add({...specific,key:specific.key+'-'+matrix,matriz:matrix,contexto:'Condiciones del sitio por confirmar',fuente:source},param,unit,null,null,{nota:note});
  function find(matriz,parametro,id) {return items.find(i=>i.matriz===matriz&&i.parametro===parametro&&(!id||i.id===id));}
  function forParameter(matriz,parametro){return items.filter(i=>i.matriz===matriz&&i.parametro===parametro);}
  function byId(id){return items.find(i=>i.id===id);}
  function range(i){if(i.bands)return 'Clasificación por bandas documentadas';if(i.min!=null&&i.max!=null)return `${i.minExclusive?'>':''}${i.min}–${i.maxExclusive?'<':''}${i.max} ${i.unidad}`;if(i.max!=null)return `${i.maxExclusive?'<':'≤'} ${i.max} ${i.unidad}`;if(i.min!=null)return `${i.minExclusive?'>':'≥'} ${i.min} ${i.unidad}`;return 'Requiere objetivo específico del sitio';}
  const normalizeUnit=value=>String(value||'').replaceAll('μ','µ').replaceAll('³','3').replaceAll(' ','');
  function evaluateSnapshot(profile,value,context={}) {
    const unknown={estado:'sin_referencia',cumple:true,etiqueta:'Sin criterio aplicable'};
    if(!profile||profile.matriz!==context.matriz||profile.parametro!==context.parametro||normalizeUnit(profile.unidad)!==normalizeUnit(context.unidad))return unknown;
    if(value==null||String(value).trim()==='')return unknown;
    let v=Number(value);if(!Number.isFinite(v)||(v<0&&profile.unidad!=='°C'))return unknown;
    if(profile.desde&&context.fecha&&(!Number.isFinite(new Date(context.fecha).getTime())||new Date(context.fecha)<new Date(profile.desde+'T00:00:00-05:00')))return unknown;
    if([profile.min,profile.max].some(n=>n!=null&&(typeof n!=='number'||!Number.isFinite(n))))return unknown;
    if(profile.bands&&(!Array.isArray(profile.bands)||profile.bands.some(b=>!b||!["bueno","intermedio","alerta"].includes(b.estado)||[b.min,b.max].some(n=>n!=null&&(typeof n!=='number'||!Number.isFinite(n))))))return unknown;
    if(profile.decimalesTruncados!=null){const factor=10**profile.decimalesTruncados;v=Math.trunc(v*factor+1e-9)/factor;}
    const inside=band=>(band.min==null||(band.minExclusive?v>band.min:v>=band.min))&&(band.max==null||(band.maxExclusive?v<band.max:v<=band.max));
    if(profile.bands){const band=profile.bands.find(inside);return band?{estado:band.estado,cumple:band.estado!=='alerta',etiqueta:band.label}:unknown;}
    if(profile.min==null&&profile.max==null)return unknown;
    const ok=inside(profile);return {estado:ok?'bueno':'alerta',cumple:ok,etiqueta:ok?'Dentro de la referencia':'Fuera de la referencia'};
  }
  function snapshot(profile){return JSON.parse(JSON.stringify(profile));}
  return {items,find,forParameter,byId,range,evaluateSnapshot,snapshot,normalizeUnit,checked,sources};
})();
