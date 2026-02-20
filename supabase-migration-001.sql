-- Migration 001: puzzle_number + realtime
-- Run this in the Supabase SQL editor

-- Add puzzle number column to scores
alter table scores add column if not exists puzzle_number int;

-- Enable realtime for the scores table
alter publication supabase_realtime add table scores;
