alter table public.fuentes
  add column if not exists categoria_fuente text not null default 'otro';

alter table public.fuentes
  drop constraint if exists fuentes_tipo_check;
alter table public.fuentes
  add constraint fuentes_tipo_check check (tipo in ('agua', 'aire', 'suelo'));

alter table public.inspecciones
  drop constraint if exists inspecciones_matriz_check;
alter table public.inspecciones
  add constraint inspecciones_matriz_check check (matriz in ('agua', 'aire', 'suelo'));

alter table public.limites
  drop constraint if exists limites_matriz_check;
alter table public.limites
  add constraint limites_matriz_check check (matriz in ('agua', 'aire', 'suelo'));

alter table public.limites
  alter column limite drop not null;
alter table public.limites
  add column if not exists umbral_aviso numeric,
  add column if not exists referencia_normativa text,
  add column if not exists vigente_desde date,
  add column if not exists vigente_hasta date;

update public.fuentes
set categoria_fuente = case tipo
  when 'agua' then 'punto_muestreo'
  when 'aire' then 'emision_atmosferica'
  else 'otro'
end
where categoria_fuente = 'otro';

update public.limites
set umbral_aviso = round(limite * 0.8, 2)
where limite is not null and umbral_aviso is null;

update public.limites
set referencia_normativa = 'Referencia no documentada en SID-FC; confirmar norma, ámbito y vigencia antes de uso oficial.'
where limite is not null and referencia_normativa is null;

insert into public.limites (matriz, parametro, limite, unidad, umbral_aviso, referencia_normativa)
values
  ('suelo', 'pH', null, 'pH', null, null),
  ('suelo', 'Plomo total', null, 'mg/kg', null, null),
  ('suelo', 'Cadmio total', null, 'mg/kg', null, null),
  ('suelo', 'Hidrocarburos totales', null, 'mg/kg', null, null)
on conflict (matriz, parametro) do nothing;

alter table public.inspecciones
  add column if not exists estado text,
  add column if not exists origen_dato text not null default 'campo',
  add column if not exists metodo_muestreo text,
  add column if not exists referencia_dato text;

update public.inspecciones i
set estado = case
  when l.id is null or l.limite is null
    or (l.vigente_desde is not null and i.fecha::date < l.vigente_desde)
    or (l.vigente_hasta is not null and i.fecha::date > l.vigente_hasta)
    then 'sin_referencia'
  when i.valor > l.limite then 'alerta'
  when l.umbral_aviso is not null and i.valor >= l.umbral_aviso then 'intermedio'
  else 'bueno'
end
from public.limites l
where l.matriz = i.matriz and l.parametro = i.parametro;

update public.inspecciones i
set estado = 'sin_referencia'
where estado is null;

update public.inspecciones
set origen_dato = 'simulacion',
    referencia_dato = 'Conjunto sintético de demostración SID-FC'
where observaciones like 'SIMULACIÓN ·%';

alter table public.inspecciones
  alter column estado set default 'sin_referencia',
  alter column estado set not null;
alter table public.inspecciones
  drop constraint if exists inspecciones_estado_check;
alter table public.inspecciones
  add constraint inspecciones_estado_check
  check (estado in ('bueno', 'intermedio', 'alerta', 'sin_referencia'));
alter table public.inspecciones
  drop constraint if exists inspecciones_origen_dato_check;
alter table public.inspecciones
  add constraint inspecciones_origen_dato_check
  check (origen_dato in ('campo', 'laboratorio', 'oficial', 'simulacion'));

create table if not exists public.evidencias_fuente (
  id uuid primary key default gen_random_uuid(),
  fuente_id uuid not null references public.fuentes(id) on delete cascade,
  inspeccion_id uuid references public.inspecciones(id) on delete set null,
  ruta_archivo text not null unique,
  descripcion text,
  creado_por uuid not null references auth.users(id),
  creado_en timestamptz not null default now()
);
create index if not exists idx_evidencias_fuente_fecha
  on public.evidencias_fuente (fuente_id, creado_en desc);

alter table public.evidencias_fuente enable row level security;
drop policy if exists "Inspectores consultan evidencias" on public.evidencias_fuente;
create policy "Inspectores consultan evidencias" on public.evidencias_fuente
  for select to authenticated using (true);
drop policy if exists "Inspectores agregan evidencias" on public.evidencias_fuente;
create policy "Inspectores agregan evidencias" on public.evidencias_fuente
  for insert to authenticated with check (creado_por = (select auth.uid()));
drop policy if exists "Inspectores eliminan evidencias propias" on public.evidencias_fuente;
create policy "Inspectores eliminan evidencias propias" on public.evidencias_fuente
  for delete to authenticated using (creado_por = (select auth.uid()));
grant select, insert, delete on table public.evidencias_fuente to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sidfc-evidencias', 'sidfc-evidencias', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "SID-FC lectura de evidencias privadas" on storage.objects;
create policy "SID-FC lectura de evidencias privadas" on storage.objects
  for select to authenticated using (bucket_id = 'sidfc-evidencias');
drop policy if exists "SID-FC carga de evidencias privadas" on storage.objects;
create policy "SID-FC carga de evidencias privadas" on storage.objects
  for insert to authenticated with check (bucket_id = 'sidfc-evidencias');
drop policy if exists "SID-FC borrado de evidencias propias" on storage.objects;
create policy "SID-FC borrado de evidencias propias" on storage.objects
  for delete to authenticated using (
    bucket_id = 'sidfc-evidencias' and owner_id = (select auth.uid()::text)
  );

grant select on table public.fuentes, public.inspecciones, public.limites to anon, authenticated;
grant insert on table public.fuentes, public.inspecciones to authenticated;

alter table public.evidencias_fuente
  alter column ruta_archivo drop not null,
  add column if not exists photo_url text;
alter table public.evidencias_fuente
  drop constraint if exists evidencias_fuente_foto_origen_check,
  add constraint evidencias_fuente_foto_origen_check check (
    (ruta_archivo is not null and photo_url is null)
    or (ruta_archivo is null and photo_url like 'https://%')
  );
