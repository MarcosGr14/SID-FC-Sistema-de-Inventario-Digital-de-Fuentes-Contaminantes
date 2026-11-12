-- Clasificación exclusivamente didáctica del conjunto SIDFC-LUGARES-REALES-V1.
-- Los umbrales son ficticios, no son LMP ni criterios de cumplimiento legal.
-- Conserva resultados, fechas, responsables, fotografías y límites configurados.
with criterios(matriz, parametro, unidad, sentido, bueno, preventivo, detalle) as (
  values
    ('agua', 'Turbidez', 'NTU', 'max', 25::numeric, 50::numeric, 'Turbidez: bajo <=25; preventivo >25 a 50; alerta >50 NTU.'),
    ('agua', 'Oxígeno disuelto', 'mg/L', 'min', 6, 4, 'Oxígeno disuelto: bajo riesgo >=6; preventivo >=4 y <6; alerta <4 mg/L.'),
    ('aire', 'PM2.5 (promedio 24 h)', 'µg/m³', 'max', 15, 35, 'PM2.5: bajo <=15; preventivo >15 a 35; alerta >35 µg/m³.'),
    ('aire', 'PM10 (promedio 24 h)', 'µg/m³', 'max', 45, 75, 'PM10: bajo <=45; preventivo >45 a 75; alerta >75 µg/m³.'),
    ('suelo', 'pH', 'pH', 'rango', 6, 8, 'pH: bajo entre 6 y 8; preventivo entre 5.5 y 6 o entre 8 y 8.5; alerta fuera de 5.5 a 8.5.'),
    ('suelo', 'Hidrocarburos totales', 'mg/kg', 'max', 100, 150, 'Hidrocarburos: bajo <=100; preventivo >100 a 150; alerta >150 mg/kg.'),
    ('suelo', 'Plomo total', 'mg/kg', 'max', 40, 45, 'Plomo: bajo <=40; preventivo >40 a 45; alerta >45 mg/kg.'),
    ('suelo', 'Cadmio total', 'mg/kg', 'max', 0.40, 0.46, 'Cadmio: bajo <=0.40; preventivo >0.40 a 0.46; alerta >0.46 mg/kg.')
), clasificacion as (
  select i.id, c.detalle,
    case
      when c.sentido = 'rango' then
        case when i.valor between 6 and 8 then 'bueno'
             when i.valor between 5.5 and 8.5 then 'intermedio' else 'alerta' end
      when c.sentido = 'min' then
        case when i.valor >= c.bueno then 'bueno'
             when i.valor >= c.preventivo then 'intermedio' else 'alerta' end
      else
        case when i.valor <= c.bueno then 'bueno'
             when i.valor <= c.preventivo then 'intermedio' else 'alerta' end
    end as nuevo_estado
  from public.inspecciones i
  join public.fuentes f on f.id = i.fuente_id
  join criterios c on c.matriz = i.matriz and c.parametro = i.parametro and c.unidad = i.unidad
  where i.origen_dato = 'simulacion'
    and i.referencia_dato like 'SIDFC-LUGARES-REALES-V1 | %'
    and f.nombre like '[DEMO] %'
), actualizadas as (
  update public.inspecciones i
  set estado = c.nuevo_estado,
      cumple = c.nuevo_estado <> 'alerta',
      observaciones = split_part(coalesce(i.observaciones, ''), ' | CRITERIO DEMO:', 1)
        || ' | CRITERIO DEMO: FICTICIO, sin validez normativa. ' || c.detalle
  from clasificacion c
  where i.id = c.id
  returning i.estado
)
select estado, count(*) as mediciones_demo from actualizadas group by estado order by estado;
