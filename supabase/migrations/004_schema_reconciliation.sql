-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 004: Schema reconciliation
-- Adds tables/functions used by frontend code but missing from migrations.
-- Resolves drift between services/supabase_schema.sql (legacy) and actual DB.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. mock_exam_history — written by apps/web/src/app/exam/page.tsx
--    Production has legacy columns (time_secs, type_stats) from services/supabase_schema.sql.
--    Frontend writes (time_taken, wrong_answers). Add new columns, keep old ones for safety.
CREATE TABLE IF NOT EXISTS mock_exam_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    time_taken INTEGER DEFAULT 0,
    wrong_answers JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- If table already exists (from legacy schema), add the columns the frontend expects.
ALTER TABLE mock_exam_history ADD COLUMN IF NOT EXISTS time_taken INTEGER DEFAULT 0;
ALTER TABLE mock_exam_history ADD COLUMN IF NOT EXISTS wrong_answers JSONB DEFAULT '[]'::jsonb;

ALTER TABLE mock_exam_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own exam history" ON mock_exam_history;
CREATE POLICY "Users can view own exam history"
    ON mock_exam_history FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own exam history" ON mock_exam_history;
CREATE POLICY "Users can insert own exam history"
    ON mock_exam_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_mock_exam_history_user_id
    ON mock_exam_history(user_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_history_created_at
    ON mock_exam_history(created_at DESC);

-- 2. quiz_results — written by apps/web/src/stores/quizProgressStore.ts
CREATE TABLE IF NOT EXISTS quiz_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    quiz_type TEXT NOT NULL,
    category TEXT,
    is_correct BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own quiz results" ON quiz_results;
CREATE POLICY "Users can view own quiz results"
    ON quiz_results FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own quiz results" ON quiz_results;
CREATE POLICY "Users can insert own quiz results"
    ON quiz_results FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id
    ON quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz_type
    ON quiz_results(quiz_type);

-- 3. get_leaderboard RPC — called by apps/web/src/lib/supabase/leaderboard.ts
--    Signature: get_leaderboard(p_type TEXT, p_limit INTEGER)
CREATE OR REPLACE FUNCTION get_leaderboard(
    p_type TEXT DEFAULT 'total',
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    rank BIGINT,
    user_id UUID,
    display_name TEXT,
    avatar_url TEXT,
    total_hands INTEGER,
    correct_hands INTEGER,
    accuracy NUMERIC,
    best_streak INTEGER,
    weekly_hands INTEGER,
    monthly_hands INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ROW_NUMBER() OVER (
            ORDER BY
                CASE p_type
                    WHEN 'total' THEN ls.total_hands
                    WHEN 'weekly' THEN ls.weekly_hands
                    WHEN 'monthly' THEN ls.monthly_hands
                    WHEN 'streak' THEN ls.best_streak
                    WHEN 'accuracy' THEN
                        CASE WHEN ls.total_hands >= 100 THEN ls.correct_hands ELSE 0 END
                    ELSE ls.total_hands
                END DESC
        ) as rank,
        ls.user_id,
        COALESCE(up.display_name, 'Anonymous') as display_name,
        up.avatar_url,
        ls.total_hands,
        ls.correct_hands,
        CASE
            WHEN ls.total_hands > 0
            THEN ROUND((ls.correct_hands::NUMERIC / ls.total_hands::NUMERIC) * 100, 1)
            ELSE 0
        END as accuracy,
        ls.best_streak,
        ls.weekly_hands,
        ls.monthly_hands
    FROM leaderboard_stats ls
    LEFT JOIN user_profiles up ON ls.user_id = up.id AND up.is_public = true
    WHERE ls.total_hands >= 10
    ORDER BY
        CASE p_type
            WHEN 'total' THEN ls.total_hands
            WHEN 'weekly' THEN ls.weekly_hands
            WHEN 'monthly' THEN ls.monthly_hands
            WHEN 'streak' THEN ls.best_streak
            WHEN 'accuracy' THEN
                CASE WHEN ls.total_hands >= 100 THEN ls.correct_hands ELSE 0 END
            ELSE ls.total_hands
        END DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON mock_exam_history TO authenticated;
GRANT ALL ON quiz_results TO authenticated;
