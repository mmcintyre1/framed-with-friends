-- Run this in the Supabase SQL editor

create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  pin text not null,
  created_at timestamptz default now()
);

create table scores (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  game_key text not null check (game_key in ('framed', 'one-frame', 'title-shot', 'poster')),
  score int check (score >= 1 and score <= 6),
  solved boolean not null default false,
  date date not null,
  created_at timestamptz default now(),
  unique (player_id, game_key, date)
);

-- Allow public read/write (since we're doing PIN auth ourselves)
alter table players enable row level security;
alter table scores enable row level security;

create policy "public read players" on players for select using (true);
create policy "public insert players" on players for insert with check (true);

create policy "public read scores" on scores for select using (true);
create policy "public insert scores" on scores for insert with check (true);
create policy "public update scores" on scores for update using (true);
