begin;

insert into public.fuentes (nombre, ubicacion, tipo, lat, lng)
select datos.nombre, datos.ubicacion, datos.tipo, datos.lat, datos.lng
from (values
  ('[SIMULACIÓN] Río Changuinola — control de agua', 'Changuinola, Bocas del Toro', 'agua', 9.4310, -82.5180),
  ('[SIMULACIÓN] Estación de aire urbana de Colón', 'Colón, Colón', 'aire', 9.3595, -79.9011),
  ('[SIMULACIÓN] Punto de control del Río Abajo', 'Río Abajo, distrito de Panamá, Panamá', 'agua', 9.0320, -79.5030),
  ('[SIMULACIÓN] Estación de aire de La Chorrera', 'La Chorrera, Panamá Oeste', 'aire', 8.8803, -79.7833),
  ('[SIMULACIÓN] Río Santa María — punto de control', 'Santiago, Veraguas', 'agua', 8.1050, -80.9750),
  ('[SIMULACIÓN] Estación de aire urbana de David', 'David, Chiriquí', 'aire', 8.4273, -82.4308),
  ('[SIMULACIÓN] Río Zaratí — punto de control', 'Penonomé, Coclé', 'agua', 8.5185, -80.3573),
  ('[SIMULACIÓN] Estación de aire de Las Tablas', 'Las Tablas, Los Santos', 'aire', 7.7648, -80.2787),
  ('[SIMULACIÓN] Quebrada — punto de control de Metetí', 'Metetí, Darién', 'agua', 8.4999, -77.9787),
  ('[SIMULACIÓN] Punto costero de agua en Narganá', 'Narganá, Guna Yala', 'agua', 9.4436, -78.5867)
) as datos(nombre, ubicacion, tipo, lat, lng)
where not exists (
  select 1
  from public.fuentes existentes
  where existentes.nombre = datos.nombre
);

with registros(
  fuente_nombre, inspector, matriz, parametro, valor, unidad,
  antiguedad, clasificacion, observaciones
) as (
  values
    ('[SIMULACIÓN] Río Changuinola — control de agua', 'Ing. Elena Santamaría', 'agua', 'DBO5', 18, 'mg/L', interval '2 hours', 'Bueno', 'Lectura sintética dentro del rango esperado; registro ficticio de demostración.'),
    ('[SIMULACIÓN] Estación de aire urbana de Colón', 'Téc. Ricardo Villarreal', 'aire', 'Material Particulado', 128, 'mg/Nm³', interval '3 hours', 'Intermedio', 'Lectura sintética cercana al límite; registro ficticio de demostración.'),
    ('[SIMULACIÓN] Punto de control del Río Abajo', 'Dra. Paula Méndez', 'agua', 'DQO', 195, 'mg/L', interval '4 hours', 'Alerta', 'Lectura sintética por encima del límite; alerta solo para probar la interfaz.'),
    ('[SIMULACIÓN] Estación de aire de La Chorrera', 'Ing. Samuel Ortega', 'aire', 'Material Particulado', 139, 'mg/Nm³', interval '5 hours', 'Intermedio', 'Lectura sintética próxima al límite; registro ficticio de demostración.'),
    ('[SIMULACIÓN] Río Santa María — punto de control', 'Biól. Camila Paredes', 'agua', 'Sólidos Suspendidos Totales', 42, 'mg/L', interval '6 hours', 'Bueno', 'Lectura sintética dentro del rango esperado; registro ficticio de demostración.'),
    ('[SIMULACIÓN] Estación de aire urbana de David', 'Téc. Andrés Quintero', 'aire', 'Óxidos de Nitrógeno (NOx)', 535, 'mg/Nm³', interval '7 hours', 'Alerta', 'Lectura sintética por encima del límite; alerta solo para probar la interfaz.'),
    ('[SIMULACIÓN] Río Zaratí — punto de control', 'Ing. Natalia Castillo', 'agua', 'DBO5', 38, 'mg/L', interval '8 hours', 'Bueno', 'Lectura sintética dentro del rango esperado; registro ficticio de demostración.'),
    ('[SIMULACIÓN] Estación de aire de Las Tablas', 'MSc. Jorge Batista', 'aire', 'Monóxido de Carbono (CO)', 240, 'mg/Nm³', interval '9 hours', 'Intermedio', 'Lectura sintética cercana al límite; registro ficticio de demostración.'),
    ('[SIMULACIÓN] Quebrada — punto de control de Metetí', 'Téc. Sofía Domínguez', 'agua', 'Aceites y Grasas', 26, 'mg/L', interval '10 hours', 'Alerta', 'Lectura sintética por encima del límite; alerta solo para probar la interfaz.'),
    ('[SIMULACIÓN] Punto costero de agua en Narganá', 'Ing. Manuel Araúz', 'agua', 'DQO', 34, 'mg/L', interval '11 hours', 'Bueno', 'Lectura sintética dentro del rango esperado; registro ficticio de demostración.')
)
insert into public.inspecciones (
  fuente_id, inspector, matriz, parametro, valor, unidad, cumple,
  fecha, observaciones
)
select
  f.id,
  r.inspector,
  r.matriz,
  r.parametro,
  r.valor,
  r.unidad,
  r.valor <= l.limite,
  now() - r.antiguedad,
  'SIMULACIÓN · Resultado ' || r.clasificacion || '. ' || r.observaciones
from registros r
join public.fuentes f on f.nombre = r.fuente_nombre
join public.limites l
  on l.matriz = r.matriz
  and l.parametro = r.parametro
  and l.unidad = r.unidad
where not exists (
  select 1
  from public.inspecciones i
  where i.fuente_id = f.id
    and i.inspector = r.inspector
    and i.observaciones = 'SIMULACIÓN · Resultado ' || r.clasificacion || '. ' || r.observaciones
);

commit;

select
  count(*) as mediciones_simuladas,
  count(*) filter (where cumple) as dentro_del_limite,
  count(*) filter (where not cumple) as sobre_el_limite
from public.inspecciones
where observaciones like 'SIMULACIÓN ·%';
