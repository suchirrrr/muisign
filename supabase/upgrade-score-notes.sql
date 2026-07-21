alter table public.scores add column if not exists notes text not null default '';
alter table public.scores add column if not exists breakdown jsonb not null default '{}'::jsonb;
