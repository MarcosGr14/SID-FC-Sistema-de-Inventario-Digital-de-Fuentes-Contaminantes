begin;
alter table public.fuentes add column if not exists archivado_en timestamptz;
alter table public.inspecciones
  add column if not exists criterio_minimo numeric,
  add column if not exists criterio_maximo numeric,
  add column if not exists referencia_criterio text;
update public.fuentes f set archivado_en = now()
where archivado_en is null and not exists (
  select 1 from public.inspecciones i
  where i.fuente_id = f.id and i.referencia_dato like 'SIDFC-LUGARES-REALES-V1 | %'
);
drop policy if exists "Solo fuentes activas" on public.fuentes;
create policy "Solo fuentes activas" on public.fuentes as restrictive
  for select to anon, authenticated using (archivado_en is null);
drop policy if exists "Solo mediciones activas" on public.inspecciones;
create policy "Solo mediciones activas" on public.inspecciones as restrictive
  for select to anon, authenticated using (
    exists (select 1 from public.fuentes f where f.id = fuente_id and f.archivado_en is null)
  );
commit;
select count(*) filter(where archivado_en is null) as fuentes_activas,
       count(*) filter(where archivado_en is not null) as fuentes_archivadas
from public.fuentes;
