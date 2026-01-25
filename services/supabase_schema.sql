-- ═══════════════════════════════════════════════════════════════════════════
-- GTO Poker Trainer - Supabase Database Schema
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Instructions:
-- 1. Go to your Supabase project dashboard
-- 2. Click on "SQL Editor" in the left sidebar
-- 3. Create a "New query"
-- 4. Paste this entire file and click "Run"
-- ═══════════════════════════════════════════════════════════════════════════

-- User Progress Table
-- Stores learning progress (completed lessons, etc.)
CREATE TABLE IF NOT EXISTS user_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    progress_type TEXT NOT NULL,  -- 'preflop_completed', 'postflop_completed', etc.
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, progress_type)
);

-- Mock Exam History Table
-- Stores individual exam results
CREATE TABLE IF NOT EXISTS mock_exam_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    time_secs INTEGER DEFAULT 0,
    type_stats JSONB DEFAULT '{}'::jsonb,  -- {"equity": {"correct": 2, "total": 3}, ...}
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drill Session History (optional, for future use)
CREATE TABLE IF NOT EXISTS drill_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_date DATE DEFAULT CURRENT_DATE,
    total_hands INTEGER DEFAULT 0,
    correct_hands INTEGER DEFAULT 0,
    action_types JSONB DEFAULT '[]'::jsonb,  -- ["RFI", "vs_3bet", ...]
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- Row Level Security (RLS) Policies
-- Users can only access their own data
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE drill_history ENABLE ROW LEVEL SECURITY;

-- user_progress policies
CREATE POLICY "Users can view own progress"
    ON user_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
    ON user_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
    ON user_progress FOR UPDATE
    USING (auth.uid() = user_id);

-- mock_exam_history policies
CREATE POLICY "Users can view own exam history"
    ON mock_exam_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exam results"
    ON mock_exam_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- drill_history policies
CREATE POLICY "Users can view own drill history"
    ON drill_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own drill history"
    ON drill_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- Indexes for better query performance
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_history_user_id ON mock_exam_history(user_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_history_created_at ON mock_exam_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_drill_history_user_id ON drill_history(user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- Helper function to get user stats
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_user_exam_stats(p_user_id UUID)
RETURNS TABLE (
    total_exams BIGINT,
    total_questions BIGINT,
    total_correct BIGINT,
    avg_accuracy NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_exams,
        COALESCE(SUM(total), 0)::BIGINT as total_questions,
        COALESCE(SUM(score), 0)::BIGINT as total_correct,
        CASE
            WHEN SUM(total) > 0 THEN ROUND((SUM(score)::NUMERIC / SUM(total)::NUMERIC) * 100, 1)
            ELSE 0
        END as avg_accuracy
    FROM mock_exam_history
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
