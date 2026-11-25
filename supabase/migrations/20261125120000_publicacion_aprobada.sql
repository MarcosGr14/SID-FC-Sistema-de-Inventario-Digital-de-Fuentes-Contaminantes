begin;

alter table public.fuentes
  add column if not exists publicado_en timestamptz;
alter table public.inspecciones
  add column if not exists publicado_en timestamptz;

comment on column public.fuentes.publicado_en is
  'Fecha de publicación aprobada. NULL mantiene el registro privado para el rol anon.';
comment on column public.inspecciones.publicado_en is
  'Fecha de publicación aprobada. NULL mantiene la medición privada para el rol anon.';

drop policy if exists "Lectura pública de fuentes" on public.fuentes;
drop policy if exists "Consulta pública de fuentes aprobadas" on public.fuentes;
create policy "Consulta pública de fuentes aprobadas" on public.fuentes
  for select to anon
  using (publicado_en is not null);
drop policy if exists "Investigadores consultan fuentes" on public.fuentes;
create policy "Investigadores consultan fuentes" on public.fuentes
  for select to authenticated
  using (true);
drop policy if exists "Inserción solo autenticado" on public.fuentes;
create policy "Inserción solo autenticado" on public.fuentes
  for insert to authenticated
  with check (publicado_en is null);

drop policy if exists "Lectura pública de inspecciones" on public.inspecciones;
drop policy if exists "Consulta pública de mediciones aprobadas" on public.inspecciones;
create policy "Consulta pública de mediciones aprobadas" on public.inspecciones
  for select to anon
  using (
    publicado_en is not null
    and exists (
      select 1 from public.fuentes f
      where f.id = fuente_id and f.publicado_en is not null
    )
  );
drop policy if exists "Investigadores consultan inspecciones" on public.inspecciones;
create policy "Investigadores consultan inspecciones" on public.inspecciones
  for select to authenticated
  using (true);
drop policy if exists "Inserción solo autenticado" on public.inspecciones;
create policy "Inserción solo autenticado" on public.inspecciones
  for insert to authenticated
  with check (publicado_en is null);

-- Reset inherited/default grants, then restore only the operations used by the app.
revoke all on table public.fuentes, public.inspecciones, public.limites,
  public.evidencias_fuente from public, anon, authenticated;
grant select (
  id, nombre, ubicacion, tipo, lat, lng, categoria_fuente, creado_en, publicado_en
)
  on table public.fuentes to anon;
grant select (
  id, fuente_id, matriz, parametro, valor, unidad, fecha, estado, origen_dato,
  metodo_muestreo, referencia_dato, criterio_minimo, criterio_maximo,
  referencia_criterio, criterio_id, criterio_detalle, creado_en, publicado_en
) on table public.inspecciones to anon;
grant select on table public.limites to anon;
grant select on table public.fuentes, public.inspecciones, public.limites to authenticated;
grant insert on table public.fuentes, public.inspecciones to authenticated;
grant select, insert, delete on table public.evidencias_fuente to authenticated;
grant usage on schema public to anon, authenticated;

-- Only an account assigned app_metadata.role = "admin" can publish records.
grant update (publicado_en) on table public.fuentes, public.inspecciones to authenticated;
drop policy if exists "Administradores publican fuentes" on public.fuentes;
create policy "Administradores publican fuentes" on public.fuentes
  for update to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
drop policy if exists "Administradores publican mediciones" on public.inspecciones;
create policy "Administradores publican mediciones" on public.inspecciones
  for update to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    and (
      publicado_en is null
      or exists (
        select 1 from public.fuentes f
        where f.id = fuente_id and f.publicado_en is not null
      )
    )
  );

commit;
