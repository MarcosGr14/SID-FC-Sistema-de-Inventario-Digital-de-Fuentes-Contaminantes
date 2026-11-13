-- Consulta histórica: las bandas didácticas se retiraron en la revisión de noviembre de 2026.
-- Los criterios documentados se conservan por medición; este archivo ya no reclasifica datos.
select estado, count(*) as mediciones_academicas
from public.inspecciones
where origen_dato = 'simulacion'
  and referencia_dato like 'SIDFC-LUGARES-REALES-V1 | %'
group by estado order by estado;
