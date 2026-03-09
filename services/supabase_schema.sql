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

-- ═══════════════════════════════════════════════════════════════════════════
-- LEADERBOARD SYSTEM
-- ═══════════════════════════════════════════════════════════════════════════

-- User profiles for leaderboard display
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    display_name TEXT NOT NULL DEFAULT 'Anonymous',
    avatar_url TEXT,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregated leaderboard stats (updated on each activity)
CREATE TABLE IF NOT EXISTS leaderboard_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,

    -- Core metrics
    total_hands INTEGER DEFAULT 0,
    correct_hands INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,

    -- Weekly/Monthly resets
    weekly_hands INTEGER DEFAULT 0,
    weekly_correct INTEGER DEFAULT 0,
    monthly_hands INTEGER DEFAULT 0,
    monthly_correct INTEGER DEFAULT 0,

    -- Timestamps
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    week_start_at TIMESTAMPTZ DEFAULT date_trunc('week', NOW()),
    month_start_at TIMESTAMPTZ DEFAULT date_trunc('month', NOW()),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_stats ENABLE ROW LEVEL SECURITY;

-- user_profiles policies (public read, own write)
CREATE POLICY "Public profiles are viewable by everyone"
    ON user_profiles FOR SELECT
    USING (is_public = true OR auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id);

-- leaderboard_stats policies (public read for leaderboard, own write)
CREATE POLICY "Leaderboard stats are viewable by everyone"
    ON leaderboard_stats FOR SELECT
    USING (true);

CREATE POLICY "Users can insert own stats"
    ON leaderboard_stats FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
    ON leaderboard_stats FOR UPDATE
    USING (auth.uid() = user_id);

-- Indexes for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_total ON leaderboard_stats(total_hands DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_accuracy ON leaderboard_stats(correct_hands DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_streak ON leaderboard_stats(best_streak DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_weekly ON leaderboard_stats(weekly_hands DESC);

-- Function to get leaderboard
CREATE OR REPLACE FUNCTION get_leaderboard(
    p_type TEXT DEFAULT 'total',  -- 'total', 'weekly', 'monthly', 'streak', 'accuracy'
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
    WHERE ls.total_hands >= 10  -- Minimum threshold
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

-- ═══════════════════════════════════════════════════════════════════════════
-- LEGACY NOTE: This file is superseded by supabase/migrations/ (001-004).
-- Do NOT use this file to provision new environments.
-- Kept for historical reference only.
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- ACHIEVEMENT SYSTEM
-- ═══════════════════════════════════════════════════════════════════════════

-- Achievement definitions
CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,  -- e.g., 'first_hand', 'streak_10', 'accuracy_90'
    name TEXT NOT NULL,
    name_zh TEXT NOT NULL,
    description TEXT NOT NULL,
    description_zh TEXT NOT NULL,
    icon TEXT NOT NULL,  -- Emoji or icon name
    category TEXT NOT NULL,  -- 'milestone', 'streak', 'accuracy', 'special'
    points INTEGER DEFAULT 10,
    tier TEXT DEFAULT 'bronze',  -- 'bronze', 'silver', 'gold', 'platinum'
    requirement JSONB NOT NULL,  -- {"type": "hands", "value": 100}
    is_secret BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User achievements (unlocked achievements)
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    achievement_id TEXT REFERENCES achievements(id) ON DELETE CASCADE NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- achievements policies (public read)
CREATE POLICY "Achievements are viewable by everyone"
    ON achievements FOR SELECT
    USING (NOT is_secret OR EXISTS (
        SELECT 1 FROM user_achievements ua
        WHERE ua.achievement_id = achievements.id AND ua.user_id = auth.uid()
    ));

-- user_achievements policies
CREATE POLICY "Users can view own achievements"
    ON user_achievements FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view others achievements if public"
    ON user_achievements FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = user_id AND up.is_public = true
    ));

CREATE POLICY "System can insert achievements"
    ON user_achievements FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- Insert default achievements
INSERT INTO achievements (id, name, name_zh, description, description_zh, icon, category, points, tier, requirement) VALUES
-- Milestone achievements
('first_hand', 'First Hand', '第一手', 'Complete your first practice hand', '完成第一手練習', '🎯', 'milestone', 5, 'bronze', '{"type": "hands", "value": 1}'),
('hands_100', 'Centurion', '百手達人', 'Complete 100 practice hands', '完成 100 手練習', '💯', 'milestone', 10, 'bronze', '{"type": "hands", "value": 100}'),
('hands_500', 'Dedicated Player', '專注玩家', 'Complete 500 practice hands', '完成 500 手練習', '🎮', 'milestone', 25, 'silver', '{"type": "hands", "value": 500}'),
('hands_1000', 'Grinder', '磨練者', 'Complete 1,000 practice hands', '完成 1,000 手練習', '⚡', 'milestone', 50, 'gold', '{"type": "hands", "value": 1000}'),
('hands_5000', 'Poker Scholar', '撲克學者', 'Complete 5,000 practice hands', '完成 5,000 手練習', '🎓', 'milestone', 100, 'platinum', '{"type": "hands", "value": 5000}'),

-- Streak achievements
('streak_5', 'Hot Hand', '手感火熱', 'Get 5 correct answers in a row', '連續答對 5 題', '🔥', 'streak', 10, 'bronze', '{"type": "streak", "value": 5}'),
('streak_10', 'On Fire', '勢不可擋', 'Get 10 correct answers in a row', '連續答對 10 題', '🌟', 'streak', 25, 'silver', '{"type": "streak", "value": 10}'),
('streak_25', 'Unstoppable', '無人能擋', 'Get 25 correct answers in a row', '連續答對 25 題', '💫', 'streak', 50, 'gold', '{"type": "streak", "value": 25}'),
('streak_50', 'GTO Master', 'GTO 大師', 'Get 50 correct answers in a row', '連續答對 50 題', '👑', 'streak', 100, 'platinum', '{"type": "streak", "value": 50}'),

-- Accuracy achievements
('accuracy_70', 'Solid Foundation', '穩健基礎', 'Achieve 70% accuracy (min 50 hands)', '達成 70% 正確率（至少 50 手）', '📊', 'accuracy', 15, 'bronze', '{"type": "accuracy", "value": 70, "min_hands": 50}'),
('accuracy_80', 'Sharp Player', '敏銳玩家', 'Achieve 80% accuracy (min 100 hands)', '達成 80% 正確率（至少 100 手）', '🎯', 'accuracy', 30, 'silver', '{"type": "accuracy", "value": 80, "min_hands": 100}'),
('accuracy_90', 'Elite Performer', '頂尖表現', 'Achieve 90% accuracy (min 200 hands)', '達成 90% 正確率（至少 200 手）', '🏆', 'accuracy', 75, 'gold', '{"type": "accuracy", "value": 90, "min_hands": 200}'),
('accuracy_95', 'Near Perfect', '近乎完美', 'Achieve 95% accuracy (min 500 hands)', '達成 95% 正確率（至少 500 手）', '💎', 'accuracy', 150, 'platinum', '{"type": "accuracy", "value": 95, "min_hands": 500}'),

-- Special achievements
('daily_7', 'Weekly Warrior', '週間戰士', 'Practice 7 days in a row', '連續練習 7 天', '📅', 'special', 30, 'silver', '{"type": "daily_streak", "value": 7}'),
('daily_30', 'Monthly Master', '月度大師', 'Practice 30 days in a row', '連續練習 30 天', '🗓️', 'special', 100, 'gold', '{"type": "daily_streak", "value": 30}'),
('exam_pass', 'Exam Passer', '考試及格', 'Pass a mock exam with 70%+', '模擬考得分 70% 以上', '✅', 'special', 20, 'bronze', '{"type": "exam_score", "value": 70}'),
('exam_ace', 'Exam Ace', '考試高手', 'Score 90%+ on a mock exam', '模擬考得分 90% 以上', '🌟', 'special', 50, 'gold', '{"type": "exam_score", "value": 90}')
ON CONFLICT (id) DO NOTHING;

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS TABLE (
    achievement_id TEXT,
    name TEXT,
    icon TEXT,
    points INTEGER
) AS $$
DECLARE
    v_stats RECORD;
    v_achievement RECORD;
    v_newly_unlocked TEXT[] := '{}';
BEGIN
    -- Get user stats
    SELECT
        COALESCE(ls.total_hands, 0) as total_hands,
        COALESCE(ls.correct_hands, 0) as correct_hands,
        COALESCE(ls.best_streak, 0) as best_streak,
        CASE WHEN ls.total_hands > 0
            THEN ROUND((ls.correct_hands::NUMERIC / ls.total_hands::NUMERIC) * 100, 1)
            ELSE 0
        END as accuracy
    INTO v_stats
    FROM leaderboard_stats ls
    WHERE ls.user_id = p_user_id;

    -- If no stats, return empty
    IF v_stats IS NULL THEN
        RETURN;
    END IF;

    -- Check each achievement
    FOR v_achievement IN
        SELECT a.* FROM achievements a
        WHERE NOT EXISTS (
            SELECT 1 FROM user_achievements ua
            WHERE ua.user_id = p_user_id AND ua.achievement_id = a.id
        )
    LOOP
        -- Check if achievement is earned
        IF (v_achievement.requirement->>'type' = 'hands' AND
            v_stats.total_hands >= (v_achievement.requirement->>'value')::INTEGER) OR
           (v_achievement.requirement->>'type' = 'streak' AND
            v_stats.best_streak >= (v_achievement.requirement->>'value')::INTEGER) OR
           (v_achievement.requirement->>'type' = 'accuracy' AND
            v_stats.total_hands >= COALESCE((v_achievement.requirement->>'min_hands')::INTEGER, 0) AND
            v_stats.accuracy >= (v_achievement.requirement->>'value')::NUMERIC)
        THEN
            -- Award achievement
            INSERT INTO user_achievements (user_id, achievement_id)
            VALUES (p_user_id, v_achievement.id)
            ON CONFLICT DO NOTHING;

            v_newly_unlocked := array_append(v_newly_unlocked, v_achievement.id);
        END IF;
    END LOOP;

    -- Return newly unlocked achievements
    RETURN QUERY
    SELECT a.id, a.name, a.icon, a.points
    FROM achievements a
    WHERE a.id = ANY(v_newly_unlocked);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user achievements summary
CREATE OR REPLACE FUNCTION get_user_achievements_summary(p_user_id UUID)
RETURNS TABLE (
    total_achievements INTEGER,
    total_points INTEGER,
    achievements JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(ua.id)::INTEGER as total_achievements,
        COALESCE(SUM(a.points), 0)::INTEGER as total_points,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', a.id,
                    'name', a.name,
                    'name_zh', a.name_zh,
                    'icon', a.icon,
                    'tier', a.tier,
                    'points', a.points,
                    'unlocked_at', ua.unlocked_at
                ) ORDER BY ua.unlocked_at DESC
            ),
            '[]'::jsonb
        ) as achievements
    FROM user_achievements ua
    JOIN achievements a ON ua.achievement_id = a.id
    WHERE ua.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
