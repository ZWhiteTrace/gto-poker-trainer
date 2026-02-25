-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 003: Add missing tables + fix drill_type CHECK constraint
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. User profiles for leaderboard display
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    display_name TEXT NOT NULL DEFAULT 'Anonymous',
    avatar_url TEXT,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Aggregated leaderboard stats
CREATE TABLE IF NOT EXISTS leaderboard_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    total_hands INTEGER DEFAULT 0,
    correct_hands INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    weekly_hands INTEGER DEFAULT 0,
    weekly_correct INTEGER DEFAULT 0,
    monthly_hands INTEGER DEFAULT 0,
    monthly_correct INTEGER DEFAULT 0,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    week_start_at TIMESTAMPTZ DEFAULT date_trunc('week', NOW()),
    month_start_at TIMESTAMPTZ DEFAULT date_trunc('month', NOW()),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Achievement definitions
CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_zh TEXT NOT NULL,
    description TEXT NOT NULL,
    description_zh TEXT NOT NULL,
    icon TEXT NOT NULL,
    category TEXT NOT NULL,
    points INTEGER DEFAULT 10,
    tier TEXT DEFAULT 'bronze',
    requirement JSONB NOT NULL,
    is_secret BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User achievements (join table)
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    achievement_id TEXT REFERENCES achievements(id) ON DELETE CASCADE NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS Policies (idempotent with DROP IF EXISTS)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- user_profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON user_profiles;
CREATE POLICY "Public profiles are viewable by everyone"
    ON user_profiles FOR SELECT
    USING (is_public = true OR auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id);

-- leaderboard_stats
DROP POLICY IF EXISTS "Leaderboard stats are viewable by everyone" ON leaderboard_stats;
CREATE POLICY "Leaderboard stats are viewable by everyone"
    ON leaderboard_stats FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can insert own stats" ON leaderboard_stats;
CREATE POLICY "Users can insert own stats"
    ON leaderboard_stats FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own stats" ON leaderboard_stats;
CREATE POLICY "Users can update own stats"
    ON leaderboard_stats FOR UPDATE
    USING (auth.uid() = user_id);

-- achievements
DROP POLICY IF EXISTS "Achievements are viewable by everyone" ON achievements;
CREATE POLICY "Achievements are viewable by everyone"
    ON achievements FOR SELECT
    USING (NOT is_secret OR EXISTS (
        SELECT 1 FROM user_achievements ua
        WHERE ua.achievement_id = achievements.id AND ua.user_id = auth.uid()
    ));

-- user_achievements
DROP POLICY IF EXISTS "Users can view own achievements" ON user_achievements;
CREATE POLICY "Users can view own achievements"
    ON user_achievements FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view others achievements if public" ON user_achievements;
CREATE POLICY "Users can view others achievements if public"
    ON user_achievements FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = user_id AND up.is_public = true
    ));

DROP POLICY IF EXISTS "System can insert achievements" ON user_achievements;
CREATE POLICY "System can insert achievements"
    ON user_achievements FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_leaderboard_total ON leaderboard_stats(total_hands DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_accuracy ON leaderboard_stats(correct_hands DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_streak ON leaderboard_stats(best_streak DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_weekly ON leaderboard_stats(weekly_hands DESC);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- Fix drill_results.drill_type CHECK constraint
-- Old: only 'rfi', 'vs_rfi', 'vs_3bet', 'vs_4bet'
-- New: add all TrackedDrillType values from frontend
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE drill_results DROP CONSTRAINT IF EXISTS drill_results_drill_type_check;
ALTER TABLE drill_results ADD CONSTRAINT drill_results_drill_type_check
    CHECK (drill_type IN (
        'rfi', 'vs_rfi', 'vs_3bet', 'vs_4bet',
        'push_fold', 'push_fold_defense', 'push_fold_resteal', 'push_fold_hu',
        'table_trainer', 'postflop'
    ));

-- ═══════════════════════════════════════════════════════════════════════════
-- Seed default achievements (from supabase_schema.sql)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO achievements (id, name, name_zh, description, description_zh, icon, category, points, tier, requirement) VALUES
('first_hand', 'First Hand', '第一手', 'Complete your first practice hand', '完成第一手練習', '🎯', 'milestone', 5, 'bronze', '{"type": "hands", "value": 1}'),
('hands_100', 'Centurion', '百手達人', 'Complete 100 practice hands', '完成 100 手練習', '💯', 'milestone', 10, 'bronze', '{"type": "hands", "value": 100}'),
('hands_500', 'Dedicated Player', '專注玩家', 'Complete 500 practice hands', '完成 500 手練習', '🎮', 'milestone', 25, 'silver', '{"type": "hands", "value": 500}'),
('hands_1000', 'Grinder', '磨練者', 'Complete 1,000 practice hands', '完成 1,000 手練習', '⚡', 'milestone', 50, 'gold', '{"type": "hands", "value": 1000}'),
('hands_5000', 'Poker Scholar', '撲克學者', 'Complete 5,000 practice hands', '完成 5,000 手練習', '🎓', 'milestone', 100, 'platinum', '{"type": "hands", "value": 5000}'),
('streak_5', 'Hot Hand', '手感火熱', 'Get 5 correct answers in a row', '連續答對 5 題', '🔥', 'streak', 10, 'bronze', '{"type": "streak", "value": 5}'),
('streak_10', 'On Fire', '勢不可擋', 'Get 10 correct answers in a row', '連續答對 10 題', '🌟', 'streak', 25, 'silver', '{"type": "streak", "value": 10}'),
('streak_25', 'Unstoppable', '無人能擋', 'Get 25 correct answers in a row', '連續答對 25 題', '💫', 'streak', 50, 'gold', '{"type": "streak", "value": 25}'),
('streak_50', 'GTO Master', 'GTO 大師', 'Get 50 correct answers in a row', '連續答對 50 題', '👑', 'streak', 100, 'platinum', '{"type": "streak", "value": 50}'),
('accuracy_70', 'Solid Foundation', '穩健基礎', 'Achieve 70% accuracy (min 50 hands)', '達成 70% 正確率（至少 50 手）', '📊', 'accuracy', 15, 'bronze', '{"type": "accuracy", "value": 70, "min_hands": 50}'),
('accuracy_80', 'Sharp Player', '敏銳玩家', 'Achieve 80% accuracy (min 100 hands)', '達成 80% 正確率（至少 100 手）', '🎯', 'accuracy', 30, 'silver', '{"type": "accuracy", "value": 80, "min_hands": 100}'),
('accuracy_90', 'Elite Performer', '頂尖表現', 'Achieve 90% accuracy (min 200 hands)', '達成 90% 正確率（至少 200 手）', '🏆', 'accuracy', 75, 'gold', '{"type": "accuracy", "value": 90, "min_hands": 200}'),
('accuracy_95', 'Near Perfect', '近乎完美', 'Achieve 95% accuracy (min 500 hands)', '達成 95% 正確率（至少 500 手）', '💎', 'accuracy', 150, 'platinum', '{"type": "accuracy", "value": 95, "min_hands": 500}'),
('daily_7', 'Weekly Warrior', '週間戰士', 'Practice 7 days in a row', '連續練習 7 天', '📅', 'special', 30, 'silver', '{"type": "daily_streak", "value": 7}'),
('daily_30', 'Monthly Master', '月度大師', 'Practice 30 days in a row', '連續練習 30 天', '🗓️', 'special', 100, 'gold', '{"type": "daily_streak", "value": 30}'),
('exam_pass', 'Exam Passer', '考試及格', 'Pass a mock exam with 70%+', '模擬考得分 70% 以上', '✅', 'special', 20, 'bronze', '{"type": "exam_score", "value": 70}'),
('exam_ace', 'Exam Ace', '考試高手', 'Score 90%+ on a mock exam', '模擬考得分 90% 以上', '🌟', 'special', 50, 'gold', '{"type": "exam_score", "value": 90}')
ON CONFLICT (id) DO NOTHING;
