-- SID-FC · DEMO académica: lugares reales, resultados completamente simulados.
-- Coordenadas aproximadas, responsables ficticios y fotos contextuales institucionales.
-- Ejecutar todo en Supabase > SQL Editor. No ejecuta cambios en usuarios, RLS ni datos previos.
-- Se puede repetir: conserva los registros de este conjunto sin duplicarlos.

begin;
select pg_advisory_xact_lock(hashtext('sidfc-demo-lugares-reales-v1'));

create temporary table sidfc_demo_propietario on commit drop as
select id from auth.users
where id = auth.uid() or lower(email) in (
  'marcos.gaitan@sidfc.test', 'diego.cedeno@sidfc.test',
  'isabella.castro@sidfc.test', 'kevin.florez@sidfc.test',
  'madeleyn.delgado@sidfc.test'
)
order by (id = auth.uid()) desc nulls last,
         (lower(email) = 'marcos.gaitan@sidfc.test') desc, created_at
limit 1;

do $$
begin
  if not exists (select 1 from sidfc_demo_propietario) then
    raise exception 'No hay una cuenta del equipo para asociar las fotos. Revisa los correos en sidfc_demo_propietario al inicio del script.';
  end if;
end $$;

create temporary table sidfc_demo_puntos (
  codigo text primary key, nombre text, ubicacion text, tipo text,
  categoria text, lat double precision, lng double precision,
  referencia text, foto text
) on commit drop;

insert into sidfc_demo_puntos values

  ('matasnillo', '[DEMO] Río Matasnillo · tramo urbano', 'Bella Vista, Panamá; receptor de presiones urbanas. Punto de demostración, no estación oficial. Coordenadas aproximadas WGS 84.', 'agua', 'punto_muestreo', 8.985, -79.511,
   'https://miambiente.gob.pa/multa-de-9-mil-a-taller-que-contamino-el-rio-matasnillo/',
   'https://miambiente.gob.pa/wp-content/uploads/2024/08/Multa-de-9-mil-a-Taller-que-contamino-el-rio-Matasnillo.jpg'),
  ('juan-diaz', '[DEMO] Río Juan Díaz · cuenca urbana', 'Juan Díaz, Panamá; seguimiento demostrativo de un cuerpo receptor. Coordenadas aproximadas WGS 84.', 'agua', 'punto_muestreo', 9.04, -79.437,
   'https://miambiente.gob.pa/elementor-307092/',
   'https://miambiente.gob.pa/wp-content/uploads/2026/07/WhatsApp-Image-2026-07-08-at-3.35.05-PM-3-scaled.jpeg'),
  ('la-villa', '[DEMO] Río La Villa · sector de Azuero', 'Entorno de La Villa de Los Santos, Los Santos/Herrera. No corresponde a la ubicación oficial de la estación de Las Cabras. Coordenadas aproximadas WGS 84.', 'agua', 'punto_muestreo', 7.946, -80.414,
   'https://miambiente.gob.pa/miambiente-inaugura-primera-estacion-de-monitoreo-de-calidad-del-agua-del-rio-la-villa/',
   'https://miambiente.gob.pa/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-30-at-4.44.51-PM-scaled.jpeg'),
  ('pacora', '[DEMO] Río Pacora · seguimiento de sedimentos', 'Pacora, Panamá; escenario demostrativo de variación de sedimentos en la cuenca. Coordenadas aproximadas WGS 84.', 'agua', 'erosion_suelo', 9.084, -79.287,
   'https://miambiente.gob.pa/equipo-tecnico-de-miambiente-mantiene-intenso-operativo-de-monitoreo-en-la-cuenca-del-rio-pacora-para-mitigar-contaminacion/',
   'https://miambiente.gob.pa/wp-content/uploads/2025/07/5bbabb62-4d22-41d5-8ec3-0cdfa0081089.jpg'),
  ('santa-maria', '[DEMO] Río Santa María · seguimiento de cuenca', 'Cuenca del río Santa María, Veraguas; coordenadas de referencia regional, no de una toma de agua. Coordenadas aproximadas WGS 84.', 'agua', 'punto_muestreo', 8.21, -80.773,
   'https://miambiente.gob.pa/suman-esfuerzos-para-la-gobernanza-de-la-cuenca-del-rio-santa-maria/',
   'https://miambiente.gob.pa/wp-content/uploads/2026/09/WhatsApp-Image-2026-09-10-at-10.09.10-1-1.jpeg'),
  ('patacon-aire', '[DEMO] Cerro Patacón · aire ambiente', 'Área de influencia de Cerro Patacón, Panamá; punto hipotético, no estación certificada. Coordenadas aproximadas WGS 84.', 'aire', 'residuos_solidos', 9.07, -79.561,
   'https://miambiente.gob.pa/consejo-de-gabinete-declara-estado-de-emergencia-ambiental-en-el-relleno-sanitario-de-cerro-patacon/',
   'https://miambiente.gob.pa/wp-content/uploads/2023/04/consejo-de-gabinete.jpg'),
  ('patacon-suelo', '[DEMO] Cerro Patacón · suelo perimetral', 'Entorno de Cerro Patacón, Panamá; escenario de muestreo de suelo, sin afirmar contaminación comprobada. Coordenadas aproximadas WGS 84.', 'suelo', 'residuos_solidos', 9.066, -79.565,
   'https://miambiente.gob.pa/consejo-de-gabinete-declara-estado-de-emergencia-ambiental-en-el-relleno-sanitario-de-cerro-patacon/',
   'https://miambiente.gob.pa/wp-content/uploads/2023/04/consejo-de-gabinete.jpg'),
  ('remance-suelo', '[DEMO] Antigua mina El Remance · suelo', 'Distrito de San Francisco, Veraguas; referencia regional aproximada. No identifica una estación ni una parcela específica. Coordenadas aproximadas WGS 84.', 'suelo', 'extraccion_materiales', 8.301, -81.013,
   'https://miambiente.gob.pa/miambiente-retoma-el-monitoreo-ambiental-en-la-antigua-mina-el-remance-para-proteger-las-fuentes-de-agua/',
   'https://miambiente.gob.pa/wp-content/uploads/2026/10/PHOTO-2026-10-16-08-41-46.jpg.jpeg');


insert into public.fuentes (nombre, ubicacion, tipo, categoria_fuente, lat, lng, creado_por)
select p.nombre, p.ubicacion, p.tipo, p.categoria, p.lat, p.lng, u.id
from sidfc_demo_puntos p cross join sidfc_demo_propietario u
where not exists (select 1 from public.fuentes f where f.nombre = p.nombre);

create temporary table sidfc_demo_series (
  codigo text, parametro text, unidad text, valores numeric[],
  primary key (codigo, parametro), check (cardinality(valores) = 6)
) on commit drop;

insert into sidfc_demo_series values

  ('matasnillo', 'Turbidez', 'NTU', array[68, 57, 44, 32, 24, 19]::numeric[]),
  ('matasnillo', 'Oxígeno disuelto', 'mg/L', array[3.1, 3.7, 4.3, 4.9, 5.4, 5.9]::numeric[]),
  ('juan-diaz', 'Turbidez', 'NTU', array[21, 28, 41, 58, 72, 85]::numeric[]),
  ('juan-diaz', 'Oxígeno disuelto', 'mg/L', array[6.5, 6.2, 5.7, 5.1, 4.6, 4.0]::numeric[]),
  ('la-villa', 'Turbidez', 'NTU', array[17, 18, 16, 19, 17, 18]::numeric[]),
  ('la-villa', 'Oxígeno disuelto', 'mg/L', array[6.8, 6.7, 6.9, 6.6, 6.8, 6.7]::numeric[]),
  ('pacora', 'Turbidez', 'NTU', array[31, 49, 88, 114, 76, 43]::numeric[]),
  ('pacora', 'Oxígeno disuelto', 'mg/L', array[6.4, 6.0, 5.3, 4.8, 5.5, 6.1]::numeric[]),
  ('santa-maria', 'Turbidez', 'NTU', array[55, 48, 40, 31, 25, 21]::numeric[]),
  ('santa-maria', 'Oxígeno disuelto', 'mg/L', array[4.2, 4.6, 5.0, 5.6, 6.0, 6.4]::numeric[]),
  ('patacon-aire', 'PM2.5 (promedio 24 h)', 'µg/m³', array[13, 18, 29, 41, 24, 16]::numeric[]),
  ('patacon-aire', 'PM10 (promedio 24 h)', 'µg/m³', array[27, 36, 59, 84, 49, 32]::numeric[]),
  ('patacon-suelo', 'pH', 'pH', array[6.3, 6.2, 6.2, 6.1, 6.2, 6.3]::numeric[]),
  ('patacon-suelo', 'Hidrocarburos totales', 'mg/kg', array[110, 150, 190, 170, 135, 100]::numeric[]),
  ('remance-suelo', 'Plomo total', 'mg/kg', array[42, 44, 43, 45, 44, 43]::numeric[]),
  ('remance-suelo', 'Cadmio total', 'mg/kg', array[0.45, 0.47, 0.46, 0.48, 0.47, 0.46]::numeric[]);


-- Agua superficial y aire ambiente requieren criterios específicos: no se reutilizan LMP de efluentes ni de chimeneas.
insert into public.limites (matriz, parametro, limite, unidad, referencia_normativa)
select distinct p.tipo, s.parametro, null::numeric, s.unidad,
  'Parámetro de demostración. Sin criterio normativo verificado para el uso, ubicación y período de evaluación.'
from sidfc_demo_series s join sidfc_demo_puntos p using (codigo)
on conflict (matriz, parametro) do nothing;

insert into public.inspecciones (
  fuente_id, inspector, matriz, parametro, valor, unidad, cumple,
  fecha, observaciones, estado, origen_dato, metodo_muestreo,
  referencia_dato, creado_por
)
select f.id,
  (array['Ing. Elena Santamaría (DEMO)', 'Téc. Ricardo Villarreal (DEMO)',
         'Biól. Camila Paredes (DEMO)', 'MSc. Jorge Batista (DEMO)',
         'Ing. Natalia Castillo (DEMO)', 'Téc. Sofía Domínguez (DEMO)'])[n],
  p.tipo, s.parametro, s.valores[n], s.unidad, true,
  timestamptz '2026-10-08 09:00:00-05' + (n - 1) * interval '7 days',
  'SIMULACIÓN · SIDFC-LUGARES-REALES-V1 · ' || p.codigo || ' · visita ' || n ||
  '. Resultado sintético, no obtenido en campo ni en laboratorio. El lugar es real; ' ||
  'el punto exacto, la fecha de toma y el responsable son de demostración. ' ||
  'No acredita condiciones ambientales reales ni incumplimiento.',
  'sin_referencia', 'simulacion',
  case
    when p.tipo = 'agua' then 'Escenario de agua superficial; valores sintéticos, sin análisis real.'
    when p.tipo = 'aire' then 'Escenario de concentración en aire ambiente; promedio sintético de 24 horas, sin sensor real.'
    else 'Escenario de suelo superficial; resultados sintéticos, sin muestra real.'
  end,
  'SIDFC-LUGARES-REALES-V1 | ' || p.codigo || ' | ' || s.parametro || ' | visita ' || n ||
  ' | Contexto geográfico e institucional, NO fuente de estos resultados: ' || p.referencia,
  u.id
from sidfc_demo_series s
join sidfc_demo_puntos p using (codigo)
join public.fuentes f on f.id = (
  select existente.id from public.fuentes existente
  where existente.nombre = p.nombre order by existente.creado_en, existente.id limit 1
)
cross join sidfc_demo_propietario u
cross join generate_series(1, 6) as visita(n)
where not exists (
  select 1 from public.inspecciones i
  where i.fuente_id = f.id
    and i.referencia_dato like 'SIDFC-LUGARES-REALES-V1 | ' || p.codigo || ' | ' || s.parametro || ' | visita ' || n || ' | %'
);

insert into public.evidencias_fuente (
  fuente_id, inspeccion_id, ruta_archivo, photo_url, descripcion, creado_por
)
select f.id, null, null, p.foto,
  'DEMO · Fotografía contextual de una publicación institucional; no es evidencia de este punto ni de las mediciones simuladas. Fuente: ' || p.referencia,
  u.id
from sidfc_demo_puntos p
join public.fuentes f on f.id = (
  select existente.id from public.fuentes existente
  where existente.nombre = p.nombre order by existente.creado_en, existente.id limit 1
)
cross join sidfc_demo_propietario u
where not exists (
  select 1 from public.evidencias_fuente e
  where e.fuente_id = f.id and e.photo_url = p.foto
);

-- Resumen esperado: 8 puntos, 96 lecturas y 8 fotos contextuales.
select f.nombre, f.tipo,
  (select count(*) from public.inspecciones i
   where i.fuente_id = f.id and i.referencia_dato like 'SIDFC-LUGARES-REALES-V1 | %') as lecturas_demo,
  (select count(*) from public.evidencias_fuente e
   where e.fuente_id = f.id and e.photo_url = p.foto) as fotos_contextuales
from sidfc_demo_puntos p
join public.fuentes f on f.nombre = p.nombre
order by f.nombre;

commit;
