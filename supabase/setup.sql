create table if not exists public.scores (
  team integer not null check (team between 1 and 16),
  game text not null,
  total integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (team, game)
);
create table if not exists public.game_availability (
  game text primary key,
  available boolean not null default true,
  updated_at timestamptz not null default now()
);
create table if not exists public.checklist (
  team integer not null check (team between 1 and 16),
  game text not null,
  complete boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (team, game)
);
alter table public.scores enable row level security;
alter table public.game_availability enable row level security;
alter table public.checklist enable row level security;
create policy "public scores read" on public.scores for select using (true);
create policy "public scores write" on public.scores for all using (true) with check (true);
create policy "public availability read" on public.game_availability for select using (true);
create policy "public availability write" on public.game_availability for all using (true) with check (true);
create policy "public checklist read" on public.checklist for select using (true);
create policy "public checklist write" on public.checklist for all using (true) with check (true);
