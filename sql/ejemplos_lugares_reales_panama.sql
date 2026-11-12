-- Ejecuta este bloque completo en SQL Editor. Es una sola operación atómica.
-- Lugares reales; coordenadas aproximadas, resultados y responsables de demostración.
-- Fotos institucionales contextuales, no evidencia de las mediciones.
-- Repetirlo no duplica registros ni modifica datos anteriores.

do $sidfc_demo$
declare
  propietario_id uuid;
  fuente_id_demo uuid;
  punto record;
  serie jsonb;
  visita integer;
  parametro_demo text;
  unidad_demo text;
  referencia_demo text;
  responsables text[] := array[
    'Ing. Elena Santamaría (DEMO)', 'Téc. Ricardo Villarreal (DEMO)',
    'Biól. Camila Paredes (DEMO)', 'MSc. Jorge Batista (DEMO)',
    'Ing. Natalia Castillo (DEMO)', 'Téc. Sofía Domínguez (DEMO)'
  ];
  catalogo jsonb := $catalogo$
[
  {
    "codigo": "matasnillo",
    "nombre": "[DEMO] Río Matasnillo · tramo urbano",
    "ubicacion": "Bella Vista, Panamá; receptor de presiones urbanas. Punto de demostración, no estación oficial. Coordenadas aproximadas WGS 84.",
    "tipo": "agua",
    "categoria": "punto_muestreo",
    "lat": 8.985,
    "lng": -79.511,
    "referencia": "https://miambiente.gob.pa/multa-de-9-mil-a-taller-que-contamino-el-rio-matasnillo/",
    "foto": "https://miambiente.gob.pa/wp-content/uploads/2024/08/Multa-de-9-mil-a-Taller-que-contamino-el-rio-Matasnillo.jpg",
    "series": [
      {
        "parametro": "Turbidez",
        "unidad": "NTU",
        "valores": [
          68,
          57,
          44,
          32,
          24,
          19
        ]
      },
      {
        "parametro": "Oxígeno disuelto",
        "unidad": "mg/L",
        "valores": [
          3.1,
          3.7,
          4.3,
          4.9,
          5.4,
          5.9
        ]
      }
    ]
  },
  {
    "codigo": "juan-diaz",
    "nombre": "[DEMO] Río Juan Díaz · cuenca urbana",
    "ubicacion": "Juan Díaz, Panamá; seguimiento demostrativo de un cuerpo receptor. Coordenadas aproximadas WGS 84.",
    "tipo": "agua",
    "categoria": "punto_muestreo",
    "lat": 9.04,
    "lng": -79.437,
    "referencia": "https://miambiente.gob.pa/elementor-307092/",
    "foto": "https://miambiente.gob.pa/wp-content/uploads/2026/07/WhatsApp-Image-2026-07-08-at-3.35.05-PM-3-scaled.jpeg",
    "series": [
      {
        "parametro": "Turbidez",
        "unidad": "NTU",
        "valores": [
          21,
          28,
          41,
          58,
          72,
          85
        ]
      },
      {
        "parametro": "Oxígeno disuelto",
        "unidad": "mg/L",
        "valores": [
          6.5,
          6.2,
          5.7,
          5.1,
          4.6,
          4.0
        ]
      }
    ]
  },
  {
    "codigo": "la-villa",
    "nombre": "[DEMO] Río La Villa · sector de Azuero",
    "ubicacion": "Entorno de La Villa de Los Santos, Los Santos/Herrera. No corresponde a la ubicación oficial de la estación de Las Cabras. Coordenadas aproximadas WGS 84.",
    "tipo": "agua",
    "categoria": "punto_muestreo",
    "lat": 7.946,
    "lng": -80.414,
    "referencia": "https://miambiente.gob.pa/miambiente-inaugura-primera-estacion-de-monitoreo-de-calidad-del-agua-del-rio-la-villa/",
    "foto": "https://miambiente.gob.pa/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-30-at-4.44.51-PM-scaled.jpeg",
    "series": [
      {
        "parametro": "Turbidez",
        "unidad": "NTU",
        "valores": [
          17,
          18,
          16,
          19,
          17,
          18
        ]
      },
      {
        "parametro": "Oxígeno disuelto",
        "unidad": "mg/L",
        "valores": [
          6.8,
          6.7,
          6.9,
          6.6,
          6.8,
          6.7
        ]
      }
    ]
  },
  {
    "codigo": "pacora",
    "nombre": "[DEMO] Río Pacora · seguimiento de sedimentos",
    "ubicacion": "Pacora, Panamá; escenario demostrativo de variación de sedimentos en la cuenca. Coordenadas aproximadas WGS 84.",
    "tipo": "agua",
    "categoria": "erosion_suelo",
    "lat": 9.084,
    "lng": -79.287,
    "referencia": "https://miambiente.gob.pa/equipo-tecnico-de-miambiente-mantiene-intenso-operativo-de-monitoreo-en-la-cuenca-del-rio-pacora-para-mitigar-contaminacion/",
    "foto": "https://miambiente.gob.pa/wp-content/uploads/2025/07/5bbabb62-4d22-41d5-8ec3-0cdfa0081089.jpg",
    "series": [
      {
        "parametro": "Turbidez",
        "unidad": "NTU",
        "valores": [
          31,
          49,
          88,
          114,
          76,
          43
        ]
      },
      {
        "parametro": "Oxígeno disuelto",
        "unidad": "mg/L",
        "valores": [
          6.4,
          6.0,
          5.3,
          4.8,
          5.5,
          6.1
        ]
      }
    ]
  },
  {
    "codigo": "santa-maria",
    "nombre": "[DEMO] Río Santa María · seguimiento de cuenca",
    "ubicacion": "Cuenca del río Santa María, Veraguas; coordenadas de referencia regional, no de una toma de agua. Coordenadas aproximadas WGS 84.",
    "tipo": "agua",
    "categoria": "punto_muestreo",
    "lat": 8.21,
    "lng": -80.773,
    "referencia": "https://miambiente.gob.pa/suman-esfuerzos-para-la-gobernanza-de-la-cuenca-del-rio-santa-maria/",
    "foto": "https://miambiente.gob.pa/wp-content/uploads/2026/09/WhatsApp-Image-2026-09-10-at-10.09.10-1-1.jpeg",
    "series": [
      {
        "parametro": "Turbidez",
        "unidad": "NTU",
        "valores": [
          55,
          48,
          40,
          31,
          25,
          21
        ]
      },
      {
        "parametro": "Oxígeno disuelto",
        "unidad": "mg/L",
        "valores": [
          4.2,
          4.6,
          5.0,
          5.6,
          6.0,
          6.4
        ]
      }
    ]
  },
  {
    "codigo": "patacon-aire",
    "nombre": "[DEMO] Cerro Patacón · aire ambiente",
    "ubicacion": "Área de influencia de Cerro Patacón, Panamá; punto hipotético, no estación certificada. Coordenadas aproximadas WGS 84.",
    "tipo": "aire",
    "categoria": "residuos_solidos",
    "lat": 9.07,
    "lng": -79.561,
    "referencia": "https://miambiente.gob.pa/consejo-de-gabinete-declara-estado-de-emergencia-ambiental-en-el-relleno-sanitario-de-cerro-patacon/",
    "foto": "https://miambiente.gob.pa/wp-content/uploads/2023/04/consejo-de-gabinete.jpg",
    "series": [
      {
        "parametro": "PM2.5 (promedio 24 h)",
        "unidad": "µg/m³",
        "valores": [
          13,
          18,
          29,
          41,
          24,
          16
        ]
      },
      {
        "parametro": "PM10 (promedio 24 h)",
        "unidad": "µg/m³",
        "valores": [
          27,
          36,
          59,
          84,
          49,
          32
        ]
      }
    ]
  },
  {
    "codigo": "patacon-suelo",
    "nombre": "[DEMO] Cerro Patacón · suelo perimetral",
    "ubicacion": "Entorno de Cerro Patacón, Panamá; escenario de muestreo de suelo, sin afirmar contaminación comprobada. Coordenadas aproximadas WGS 84.",
    "tipo": "suelo",
    "categoria": "residuos_solidos",
    "lat": 9.066,
    "lng": -79.565,
    "referencia": "https://miambiente.gob.pa/consejo-de-gabinete-declara-estado-de-emergencia-ambiental-en-el-relleno-sanitario-de-cerro-patacon/",
    "foto": "https://miambiente.gob.pa/wp-content/uploads/2023/04/consejo-de-gabinete.jpg",
    "series": [
      {
        "parametro": "pH",
        "unidad": "pH",
        "valores": [
          6.3,
          6.2,
          6.2,
          6.1,
          6.2,
          6.3
        ]
      },
      {
        "parametro": "Hidrocarburos totales",
        "unidad": "mg/kg",
        "valores": [
          110,
          150,
          190,
          170,
          135,
          100
        ]
      }
    ]
  },
  {
    "codigo": "remance-suelo",
    "nombre": "[DEMO] Antigua mina El Remance · suelo",
    "ubicacion": "Distrito de San Francisco, Veraguas; referencia regional aproximada. No identifica una estación ni una parcela específica. Coordenadas aproximadas WGS 84.",
    "tipo": "suelo",
    "categoria": "extraccion_materiales",
    "lat": 8.301,
    "lng": -81.013,
    "referencia": "https://miambiente.gob.pa/miambiente-retoma-el-monitoreo-ambiental-en-la-antigua-mina-el-remance-para-proteger-las-fuentes-de-agua/",
    "foto": "https://miambiente.gob.pa/wp-content/uploads/2026/10/PHOTO-2026-10-16-08-41-46.jpg.jpeg",
    "series": [
      {
        "parametro": "Plomo total",
        "unidad": "mg/kg",
        "valores": [
          42,
          44,
          43,
          45,
          44,
          43
        ]
      },
      {
        "parametro": "Cadmio total",
        "unidad": "mg/kg",
        "valores": [
          0.45,
          0.47,
          0.46,
          0.48,
          0.47,
          0.46
        ]
      }
    ]
  }
]
$catalogo$::jsonb;
begin
  perform pg_advisory_xact_lock(hashtext('sidfc-demo-lugares-reales-v1'));

  select u.id into propietario_id
  from auth.users u
  where u.id = auth.uid() or lower(u.email) in (
    'marcos.gaitan@sidfc.test', 'diego.cedeno@sidfc.test',
    'isabella.castro@sidfc.test', 'kevin.florez@sidfc.test',
    'madeleyn.delgado@sidfc.test'
  )
  order by (u.id = auth.uid()) desc nulls last,
           (lower(u.email) = 'marcos.gaitan@sidfc.test') desc, u.created_at
  limit 1;

  if propietario_id is null then
    raise exception 'No hay una cuenta del equipo para asociar las fotos. Revisa los correos de auth.users en la consulta del propietario del script.';
  end if;

  for punto in
    select * from jsonb_to_recordset(catalogo) as p(
      codigo text, nombre text, ubicacion text, tipo text, categoria text,
      lat double precision, lng double precision, referencia text, foto text,
      series jsonb
    )
  loop
    select f.id into fuente_id_demo
    from public.fuentes f where f.nombre = punto.nombre
    order by f.creado_en, f.id limit 1;

    if fuente_id_demo is null then
      insert into public.fuentes (nombre, ubicacion, tipo, categoria_fuente, lat, lng, creado_por)
      values (punto.nombre, punto.ubicacion, punto.tipo, punto.categoria, punto.lat, punto.lng, propietario_id)
      returning id into fuente_id_demo;
    end if;

    for serie in select value from jsonb_array_elements(punto.series)
    loop
      parametro_demo := serie->>'parametro';
      unidad_demo := serie->>'unidad';

      -- No aplica límites de efluentes o chimeneas a agua superficial o aire ambiente.
      insert into public.limites (matriz, parametro, limite, unidad, referencia_normativa)
      values (punto.tipo, parametro_demo, null, unidad_demo,
        'Parámetro de demostración. Sin criterio normativo verificado para este uso, ubicación y período.')
      on conflict (matriz, parametro) do nothing;

      for visita in 1..6
      loop
        referencia_demo := 'SIDFC-LUGARES-REALES-V1 | ' || punto.codigo || ' | ' || parametro_demo ||
          ' | visita ' || visita || ' | Contexto geográfico e institucional, NO fuente de estos resultados: ' || punto.referencia;

        insert into public.inspecciones (
          fuente_id, inspector, matriz, parametro, valor, unidad, cumple,
          fecha, observaciones, estado, origen_dato, metodo_muestreo,
          referencia_dato, creado_por
        )
        select fuente_id_demo, responsables[visita], punto.tipo, parametro_demo,
          (serie->'valores'->>(visita - 1))::numeric, unidad_demo, true,
          timestamptz '2026-10-08 09:00:00-05' + (visita - 1) * interval '7 days',
          'SIMULACIÓN · SIDFC-LUGARES-REALES-V1 · ' || punto.codigo || ' · visita ' || visita ||
          '. Resultado sintético, sin toma de muestras real. Lugar real; punto exacto, fecha y responsable de demostración. No acredita condiciones reales ni incumplimiento.',
          'sin_referencia', 'simulacion',
          case
            when punto.tipo = 'agua' then 'Escenario de agua superficial; resultados sintéticos, sin análisis real.'
            when punto.tipo = 'aire' then 'Escenario de aire ambiente; promedio sintético de 24 horas, sin sensor real.'
            else 'Escenario de suelo superficial; resultados sintéticos, sin muestra real.'
          end,
          referencia_demo, propietario_id
        where not exists (
          select 1 from public.inspecciones i
          where i.fuente_id = fuente_id_demo and i.referencia_dato = referencia_demo
        );
      end loop;
    end loop;

    insert into public.evidencias_fuente (
      fuente_id, inspeccion_id, ruta_archivo, photo_url, descripcion, creado_por
    )
    select fuente_id_demo, null, null, punto.foto,
      'DEMO · Fotografía contextual institucional; no es evidencia de este punto ni de las mediciones simuladas. Fuente: ' || punto.referencia,
      propietario_id
    where not exists (
      select 1 from public.evidencias_fuente e
      where e.fuente_id = fuente_id_demo and e.photo_url = punto.foto
    );
  end loop;

  raise notice 'Conjunto DEMO listo: 8 puntos, 96 lecturas y 8 fotos contextuales. No se duplican al repetirlo.';
end;
$sidfc_demo$;
