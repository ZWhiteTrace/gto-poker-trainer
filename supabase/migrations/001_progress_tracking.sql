-- Progress Tracking Schema for GTO Poker Trainer
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User stats table (aggregated stats)
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stats JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Individual drill results table
CREATE TABLE IF NOT EXISTS drill_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  drill_type TEXT NOT NULL CHECK (drill_type IN ('rfi', 'vs_rfi', 'vs_3bet', 'vs_4bet')),
  hand TEXT NOT NULL,
  hero_position TEXT NOT NULL,
  villain_position TEXT,
  player_action TEXT NOT NULL,
  correct_action TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  is_acceptable BOOLEAN NOT NULL DEFAULT FALSE,
  frequency INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_drill_results_user_id ON drill_results(user_id);
CREATE INDEX IF NOT EXISTS idx_drill_results_drill_type ON drill_results(drill_type);
CREATE INDEX IF NOT EXISTS idx_drill_results_created_at ON drill_results(created_at DESC);

-- Row Level Security (RLS)
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE drill_results ENABLE ROW LEVEL SECURITY;

-- Users can only see their own stats (idempotent)
DROP POLICY IF EXISTS "Users can view own stats" ON user_stats;
CREATE POLICY "Users can view own stats"
  ON user_stats FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own stats" ON user_stats;
CREATE POLICY "Users can insert own stats"
  ON user_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own stats" ON user_stats;
CREATE POLICY "Users can update own stats"
  ON user_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only see their own drill results (idempotent)
DROP POLICY IF EXISTS "Users can view own drill results" ON drill_results;
CREATE POLICY "Users can view own drill results"
  ON drill_results FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own drill results" ON drill_results;
CREATE POLICY "Users can insert own drill results"
  ON drill_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at (idempotent)
DROP TRIGGER IF EXISTS update_user_stats_updated_at ON user_stats;
CREATE TRIGGER update_user_stats_updated_at
  BEFORE UPDATE ON user_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON user_stats TO authenticated;
GRANT ALL ON drill_results TO authenticated;
