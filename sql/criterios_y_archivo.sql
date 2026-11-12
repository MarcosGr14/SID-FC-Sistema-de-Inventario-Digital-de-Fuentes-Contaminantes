begin;
alter table public.fuentes add column if not exists archivado_en timestamptz;
alter table public.inspecciones
  add column if not exists criterio_minimo numeric,
  add column if not exists criterio_maximo numeric,
  add column if not exists referencia_criterio text;
drop policy if exists "Solo fuentes activas" on public.fuentes;
create policy "Solo fuentes activas" on public.fuentes as restrictive
  for select to anon, authenticated using (archivado_en is null);
drop policy if exists "Solo mediciones activas" on public.inspecciones;
create policy "Solo mediciones activas" on public.inspecciones as restrictive
  for select to anon, authenticated using (
    exists (select 1 from public.fuentes f where f.id = fuente_id and f.archivado_en is null)
  );
commit;
