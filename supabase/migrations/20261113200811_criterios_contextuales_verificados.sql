begin;
alter table public.inspecciones
  add column if not exists criterio_id text,
  add column if not exists criterio_detalle jsonb;
alter table public.limites alter column limite drop not null;
with verificados(matriz,parametro,limite,referencia,desde) as (values
('agua','DBO5',50::numeric,'Descarga de efluente a cuerpo receptor · Panamá. DGNTI-COPANIT 35-2019, tabla 1; Resolución 13/2025. https://mici.gob.pa/wp-content/uploads/2021/12/35rt-dgnti-copanit-35-2019-1.pdf. No aplicar sin confirmar ámbito, método y condiciones.','2019-12-28'::date),
('agua','DQO',100::numeric,'Descarga de efluente a cuerpo receptor · Panamá. DGNTI-COPANIT 35-2019, tabla 1; Resolución 13/2025. https://mici.gob.pa/wp-content/uploads/2021/12/35rt-dgnti-copanit-35-2019-1.pdf. No aplicar sin confirmar ámbito, método y condiciones.','2019-12-28'::date),
('agua','Sólidos Suspendidos Totales',35::numeric,'Descarga de efluente a cuerpo receptor · Panamá. DGNTI-COPANIT 35-2019, tabla 1; Resolución 13/2025. https://mici.gob.pa/wp-content/uploads/2021/12/35rt-dgnti-copanit-35-2019-1.pdf. No aplicar sin confirmar ámbito, método y condiciones.','2019-12-28'::date),
('agua','Aceites y Grasas',20::numeric,'Descarga de efluente a cuerpo receptor · Panamá. DGNTI-COPANIT 35-2019, tabla 1; Resolución 13/2025. https://mici.gob.pa/wp-content/uploads/2021/12/35rt-dgnti-copanit-35-2019-1.pdf. No aplicar sin confirmar ámbito, método y condiciones.','2019-12-28'::date),
('aire','Material Particulado',null::numeric,'Condiciones del sitio por confirmar. Objetivo específico del sitio. https://faolex.fao.org/docs/pdf/pan90271.pdf. Sin límite genérico: seleccionar un contexto documentado en la aplicación.',null::date),
('aire','Óxidos de Nitrógeno (NOx)',null::numeric,'Condiciones del sitio por confirmar. Objetivo específico del sitio. https://faolex.fao.org/docs/pdf/pan90271.pdf. Sin límite genérico: seleccionar un contexto documentado en la aplicación.',null::date),
('aire','Dióxido de Azufre (SO2)',null::numeric,'Condiciones del sitio por confirmar. Objetivo específico del sitio. https://faolex.fao.org/docs/pdf/pan90271.pdf. Sin límite genérico: seleccionar un contexto documentado en la aplicación.',null::date),
('aire','Monóxido de Carbono (CO)',null::numeric,'Condiciones del sitio por confirmar. Objetivo específico del sitio. https://faolex.fao.org/docs/pdf/pan90271.pdf. Sin límite genérico: seleccionar un contexto documentado en la aplicación.',null::date),
('suelo','pH',null::numeric,'Condiciones del sitio por confirmar. Objetivo específico del sitio. https://www.nrcs.usda.gov/conservation-basics/soil/soil-health. Sin límite genérico: seleccionar un contexto documentado en la aplicación.',null::date),
('suelo','Plomo total',null::numeric,'Suelo agrícola · exposición solo por suelo · CCME. CCME, plomo, criterios provisionales finales 2025. https://www.ccme.ca/en/chemical/124. Sin límite genérico: seleccionar un contexto documentado en la aplicación.',null::date),
('suelo','Cadmio total',null::numeric,'Suelo agrícola · CCME. CCME, cadmio, tabla 1, 1999. https://ccme.ca/en/res/cadmium-canadian-soil-quality-guidelines-for-the-protection-of-environmental-and-human-health-en.pdf. Sin límite genérico: seleccionar un contexto documentado en la aplicación.',null::date),
('suelo','Hidrocarburos totales',null::numeric,'Condiciones del sitio por confirmar. Objetivo específico del sitio. https://ccme.ca/en/res/cws_phc_standard_1.0_e.pdf. Sin límite genérico: seleccionar un contexto documentado en la aplicación.',null::date),
('agua','Oxígeno disuelto',null::numeric,'Agua continental de uso recreativo · Panamá. Decreto Ejecutivo 75/2008, artículos 11–12 y tabla 1. https://www.gacetaoficial.gob.pa/storage/gacetas/2008/07/26078/GacetaNo_26078_20080708.pdf. Sin límite genérico: seleccionar un contexto documentado en la aplicación.',null::date),
('aire','PM2.5 (promedio 24 h)',15::numeric,'Aire ambiente · guía OMS 2021. OMS 2021, tabla 0.1 de niveles guía. https://www.who.int/publications/i/item/9789240034228. No aplicar sin confirmar ámbito, método y condiciones.',null::date),
('agua','Turbidez',null::numeric,'Descarga de efluente a cuerpo receptor · Panamá. DGNTI-COPANIT 35-2019, tabla 1; Resolución 13/2025. https://mici.gob.pa/wp-content/uploads/2021/12/35rt-dgnti-copanit-35-2019-1.pdf. Sin límite genérico: seleccionar un contexto documentado en la aplicación.',null::date),
('aire','PM10 (promedio 24 h)',45::numeric,'Aire ambiente · guía OMS 2021. OMS 2021, tabla 0.1 de niveles guía. https://www.who.int/publications/i/item/9789240034228. No aplicar sin confirmar ámbito, método y condiciones.',null::date))
update public.limites l set limite=v.limite,umbral_aviso=null,referencia_normativa=v.referencia,vigente_desde=v.desde,vigente_hasta=null
from verificados v where l.matriz=v.matriz and l.parametro=v.parametro;

-- Retira las bandas didácticas anteriores sin cambiar lecturas ni procedencia.
update public.inspecciones set estado='sin_referencia',cumple=true
where origen_dato='simulacion' and referencia_dato like 'SIDFC-LUGARES-REALES-V1 | %'
  and criterio_detalle is null;
with aire(parametro,detalle) as (values
('PM2.5 (promedio 24 h)','{"key":"oms-aire-2021","matriz":"aire","tipo":"guia","contexto":"Aire ambiente · guía OMS 2021","norma":"OMS 2021, tabla 0.1 de niveles guía","fuente":"https://www.who.int/publications/i/item/9789240034228","metodo":"Verificar método, calibración, cobertura y período del promedio; una lectura instantánea no equivale a un promedio diario.","nota":"Referencia internacional, no LMP de Panamá. Los valores diarios corresponden al percentil 99 (3–4 días de excedencia por año); una lectura no demuestra cumplimiento anual. No hay un mínimo obligatorio ni una franja preventiva OMS universal.","id":"oms-aire-2021-pm2-5-promedio-24-h","parametro":"PM2.5 (promedio 24 h)","unidad":"µg/m³","min":null,"max":15,"verificadoEn":"2026-11-13"}'::jsonb),
('PM10 (promedio 24 h)','{"key":"oms-aire-2021","matriz":"aire","tipo":"guia","contexto":"Aire ambiente · guía OMS 2021","norma":"OMS 2021, tabla 0.1 de niveles guía","fuente":"https://www.who.int/publications/i/item/9789240034228","metodo":"Verificar método, calibración, cobertura y período del promedio; una lectura instantánea no equivale a un promedio diario.","nota":"Referencia internacional, no LMP de Panamá. Los valores diarios corresponden al percentil 99 (3–4 días de excedencia por año); una lectura no demuestra cumplimiento anual. No hay un mínimo obligatorio ni una franja preventiva OMS universal.","id":"oms-aire-2021-pm10-promedio-24-h","parametro":"PM10 (promedio 24 h)","unidad":"µg/m³","min":null,"max":45,"verificadoEn":"2026-11-13"}'::jsonb))
update public.inspecciones i set
 criterio_id=a.detalle->>'id',criterio_detalle=a.detalle,
 criterio_minimo=null,criterio_maximo=(a.detalle->>'max')::numeric,referencia_criterio=a.detalle->>'fuente',
 estado=case when i.valor>(a.detalle->>'max')::numeric then 'alerta' else 'bueno' end,
 cumple=i.valor<=(a.detalle->>'max')::numeric
from aire a where i.origen_dato='simulacion' and i.referencia_dato like 'SIDFC-LUGARES-REALES-V1 | %'
 and i.matriz='aire' and i.parametro=a.parametro and i.unidad=a.detalle->>'unidad'
 and i.metodo_muestreo like '%promedio sintético de 24 horas%'
 and i.criterio_detalle is null;
notify pgrst,'reload schema';
commit;

select count(*) as lecturas_conservadas,
 count(*) filter(where criterio_detalle is not null) as con_criterio_documentado,
 count(*) filter(where estado='sin_referencia') as contexto_pendiente
from public.inspecciones where referencia_dato like 'SIDFC-LUGARES-REALES-V1 | %';
