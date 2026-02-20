-- Migration 002: allow players to update their own record
-- Run this in the Supabase SQL editor

create policy "public update players" on players for update using (true);
