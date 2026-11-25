begin;

select plan(12);

insert into public.fuentes (
  id, nombre, ubicacion, tipo, lat, lng, categoria_fuente, publicado_en
) values
  ('00000000-0000-4000-8000-000000000101', 'SIDFC RLS test publicada', 'Sitio de prueba', 'agua', 8.9, -79.5, 'punto_muestreo', now()),
  ('00000000-0000-4000-8000-000000000102', 'SIDFC RLS test privada', 'Sitio privado de prueba', 'agua', 8.9, -79.5, 'punto_muestreo', null);

insert into public.inspecciones (
  id, fuente_id, inspector, matriz, parametro, valor, unidad, cumple, estado,
  fecha, observaciones, origen_dato, publicado_en
) values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101', 'Investigador reservado', 'agua', 'DBO5', 18, 'mg/L', true, 'bueno', now(), 'Nota interna reservada', 'laboratorio', now()),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000102', 'Investigador reservado', 'agua', 'DBO5', 88, 'mg/L', false, 'alerta', now(), 'Nota privada de prueba', 'campo', null);

set local role anon;
select is((select count(*)::int from public.fuentes where nombre like 'SIDFC RLS test%'), 1, 'anon solo ve la fuente aprobada');
select is((select count(*)::int from public.inspecciones where id::text like '%0201' or id::text like '%0202'), 1, 'anon solo ve la medición aprobada de una fuente aprobada');
select ok(not has_column_privilege('anon', 'public.inspecciones', 'inspector', 'select'), 'anon no puede consultar el nombre del investigador');
select ok(not has_column_privilege('anon', 'public.inspecciones', 'observaciones', 'select'), 'anon no puede consultar notas internas');
select ok(not has_column_privilege('anon', 'public.inspecciones', 'cumple', 'select'), 'anon no puede consultar el booleano heredado de clasificación');
reset role;

set local role authenticated;
select is((select count(*)::int from public.fuentes where nombre like 'SIDFC RLS test%'), 2, 'investigador autenticado ve fuentes pendientes de publicación');
select ok(has_table_privilege('authenticated', 'public.inspecciones', 'insert'), 'investigador autenticado puede crear mediciones');
select ok(not has_column_privilege('authenticated', 'public.inspecciones', 'inspector', 'update'), 'investigador no puede modificar mediciones existentes');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000301","role":"authenticated","app_metadata":{"role":"investigator"}}', true);
select throws_ok($$insert into public.fuentes (nombre, tipo, lat, lng, publicado_en) values ('SIDFC no auto publicar', 'agua', 8.9, -79.5, now())$$, '42501', 'investigador no puede publicar al crear una fuente');
select throws_ok($$insert into public.inspecciones (fuente_id, inspector, matriz, parametro, valor, unidad, cumple, fecha, publicado_en) values ('00000000-0000-4000-8000-000000000101', 'Investigador', 'agua', 'DBO5', 5, 'mg/L', true, now(), now())$$, '42501', 'investigador no puede publicar al crear una medición');
select is((with changed as (
  update public.fuentes set publicado_en = null
  where id = '00000000-0000-4000-8000-000000000101' returning id
) select count(*)::int from changed), 0, 'un investigador sin rol administrador no puede publicar una fuente');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000302","role":"authenticated","app_metadata":{"role":"admin"}}', true);
select is((with changed as (
  update public.fuentes set publicado_en = null
  where id = '00000000-0000-4000-8000-000000000101' returning id
) select count(*)::int from changed), 1, 'un administrador puede retirar una fuente de publicación');

select * from finish();
rollback;
