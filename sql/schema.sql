create table if not exists fuentes (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  ubicacion   text,
  tipo        text not null check (tipo in ('agua','aire')),
  lat         double precision not null,
  lng         double precision not null,
  categoria_fuente text not null default 'otro',
  publicado_en timestamptz,
  creado_por  uuid references auth.users(id),
  creado_en   timestamptz not null default now()
);
alter table public.fuentes
  add column if not exists ubicacion text,
  add column if not exists categoria_fuente text not null default 'otro',
  add column if not exists publicado_en timestamptz;
create table if not exists limites (
  id         uuid primary key default gen_random_uuid(),
  matriz     text not null check (matriz in ('agua','aire')),
  parametro  text not null,
  limite     numeric,
  unidad     text not null
);

create unique index if not exists idx_limites_matriz_parametro
  on limites (matriz, parametro);

insert into limites (matriz, parametro, limite, unidad) values
  ('agua','DBO5', 50, 'mg/L'),
  ('agua','DQO', 100, 'mg/L'),
  ('agua','Sólidos Suspendidos Totales', 35, 'mg/L'),
  ('agua','Aceites y Grasas', 20, 'mg/L'),
  ('aire','Material Particulado', null, 'mg/Nm³'),
  ('aire','Óxidos de Nitrógeno (NOx)', null, 'mg/Nm³'),
  ('aire','Dióxido de Azufre (SO2)', null, 'mg/Nm³'),
  ('aire','Monóxido de Carbono (CO)', null, 'mg/Nm³')
on conflict (matriz, parametro) do nothing;
create table if not exists inspecciones (
  id             uuid primary key default gen_random_uuid(),
  fuente_id      uuid not null references fuentes(id) on delete cascade,
  inspector      text not null,
  matriz         text not null check (matriz in ('agua','aire')),
  parametro      text not null,
  valor          numeric not null,
  unidad         text,
  cumple         boolean not null,
  fecha          timestamptz not null,
  observaciones  text,
  publicado_en   timestamptz,
  creado_por     uuid references auth.users(id),
  creado_en      timestamptz not null default now()
);

create index if not exists idx_inspecciones_fuente on inspecciones(fuente_id);
create index if not exists idx_inspecciones_fecha on inspecciones(fecha);
alter table fuentes enable row level security;
alter table inspecciones enable row level security;
alter table limites enable row level security;

alter table public.inspecciones
  add column if not exists publicado_en timestamptz;
drop policy if exists "Lectura pública de fuentes" on fuentes;
drop policy if exists "Consulta pública de fuentes aprobadas" on fuentes;
create policy "Consulta pública de fuentes aprobadas" on fuentes
  for select to anon using (publicado_en is not null);
drop policy if exists "Investigadores consultan fuentes" on fuentes;
create policy "Investigadores consultan fuentes" on fuentes
  for select to authenticated using (true);
drop policy if exists "Inserción solo autenticado" on fuentes;
create policy "Inserción solo autenticado" on fuentes
  for insert to authenticated with check (publicado_en is null);

drop policy if exists "Lectura pública de inspecciones" on inspecciones;
drop policy if exists "Consulta pública de mediciones aprobadas" on inspecciones;
create policy "Consulta pública de mediciones aprobadas" on inspecciones
  for select to anon using (
    publicado_en is not null
    and exists (select 1 from public.fuentes f where f.id = fuente_id and f.publicado_en is not null)
  );
drop policy if exists "Investigadores consultan inspecciones" on inspecciones;
create policy "Investigadores consultan inspecciones" on inspecciones
  for select to authenticated using (true);
drop policy if exists "Inserción solo autenticado" on inspecciones;
create policy "Inserción solo autenticado" on inspecciones
  for insert to authenticated with check (publicado_en is null);

drop policy if exists "Lectura pública de límites" on limites;
create policy "Lectura pública de límites" on limites
  for select to anon, authenticated using (true);
revoke all on table public.fuentes, public.inspecciones, public.limites
  from public, anon, authenticated;
grant select on table public.fuentes, public.inspecciones, public.limites to authenticated;
grant select on table public.limites to anon;
grant insert on table public.fuentes, public.inspecciones to authenticated;
grant usage on schema public to anon, authenticated;
grant select on table public.fuentes, public.inspecciones to authenticated;
