-- Migration 003: add avatar column to players
-- Run this in the Supabase SQL editor

alter table players add column if not exists avatar text;

-- Optional: if you want players to be able to upload photos instead of just emoji,
-- create an "avatars" storage bucket in Supabase Dashboard > Storage > New bucket
-- Name: avatars, Public: yes
-- Then add this storage policy in the SQL editor:
--
-- insert into storage.policies (name, bucket_id, operation, definition)
-- values ('Public read avatars', 'avatars', 'SELECT', 'true');
--
-- insert into storage.policies (name, bucket_id, operation, definition)
-- values ('Anyone can upload avatars', 'avatars', 'INSERT', 'true');
--
-- insert into storage.policies (name, bucket_id, operation, definition)
-- values ('Anyone can update avatars', 'avatars', 'UPDATE', 'true');
