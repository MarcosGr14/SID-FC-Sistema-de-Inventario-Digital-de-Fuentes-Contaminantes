create table if not exists fuentes (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  ubicacion   text,
  tipo        text not null check (tipo in ('agua','aire')),
  lat         double precision not null,
  lng         double precision not null,
  creado_por  uuid references auth.users(id),
  creado_en   timestamptz not null default now()
);
alter table public.fuentes
  add column if not exists ubicacion text;
create table if not exists limites (
  id         uuid primary key default gen_random_uuid(),
  matriz     text not null check (matriz in ('agua','aire')),
  parametro  text not null,
  limite     numeric not null,
  unidad     text not null
);

create unique index if not exists idx_limites_matriz_parametro
  on limites (matriz, parametro);

insert into limites (matriz, parametro, limite, unidad) values
  ('agua','DBO5', 50, 'mg/L'),
  ('agua','DQO', 150, 'mg/L'),
  ('agua','Sólidos Suspendidos Totales', 100, 'mg/L'),
  ('agua','Aceites y Grasas', 20, 'mg/L'),
  ('aire','Material Particulado', 150, 'mg/Nm³'),
  ('aire','Óxidos de Nitrógeno (NOx)', 500, 'mg/Nm³'),
  ('aire','Dióxido de Azufre (SO2)', 500, 'mg/Nm³'),
  ('aire','Monóxido de Carbono (CO)', 300, 'mg/Nm³')
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
  creado_por     uuid references auth.users(id),
  creado_en      timestamptz not null default now()
);

create index if not exists idx_inspecciones_fuente on inspecciones(fuente_id);
create index if not exists idx_inspecciones_fecha on inspecciones(fecha);
alter table fuentes enable row level security;
alter table inspecciones enable row level security;
alter table limites enable row level security;

drop policy if exists "Lectura pública de fuentes" on fuentes;
create policy "Lectura pública de fuentes" on fuentes
  for select to anon, authenticated using (true);
drop policy if exists "Inserción solo autenticado" on fuentes;
create policy "Inserción solo autenticado" on fuentes
  for insert to authenticated with check (true);

drop policy if exists "Lectura pública de inspecciones" on inspecciones;
create policy "Lectura pública de inspecciones" on inspecciones
  for select to anon, authenticated using (true);
drop policy if exists "Inserción solo autenticado" on inspecciones;
create policy "Inserción solo autenticado" on inspecciones
  for insert to authenticated with check (true);

drop policy if exists "Lectura pública de límites" on limites;
create policy "Lectura pública de límites" on limites
  for select to anon, authenticated using (true);
grant select on table fuentes, inspecciones, limites to anon, authenticated;
grant insert on table fuentes, inspecciones to authenticated;
