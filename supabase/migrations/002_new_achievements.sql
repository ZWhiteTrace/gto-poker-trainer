-- New Achievements for GTO Poker Trainer
-- Run this in your Supabase SQL Editor to add new achievements

-- Milestone Achievements
INSERT INTO achievements (id, name, name_zh, description, description_zh, icon, category, points, tier, requirement) VALUES
  ('milestone_500', 'Dedicated Learner', '勤奮學員', 'Complete 500 practice hands', '完成 500 手練習', '📚', 'milestone', 50, 'silver', '{"type": "hands", "value": 500}'),
  ('milestone_2500', 'GTO Enthusiast', 'GTO 狂熱者', 'Complete 2500 practice hands', '完成 2500 手練習', '🎯', 'milestone', 100, 'gold', '{"type": "hands", "value": 2500}'),
  ('milestone_5000', 'Poker Scholar', '撲克學者', 'Complete 5000 practice hands', '完成 5000 手練習', '🎓', 'milestone', 200, 'gold', '{"type": "hands", "value": 5000}'),
  ('milestone_10000', 'GTO Master', 'GTO 大師', 'Complete 10000 practice hands', '完成 10000 手練習', '👑', 'milestone', 500, 'platinum', '{"type": "hands", "value": 10000}')
ON CONFLICT (id) DO NOTHING;

-- Streak Achievements
INSERT INTO achievements (id, name, name_zh, description, description_zh, icon, category, points, tier, requirement) VALUES
  ('streak_25', 'Quarter Century', '四分之一世紀', 'Achieve a 25 hand correct streak', '達成 25 手連續正確', '🔥', 'streak', 30, 'silver', '{"type": "streak", "value": 25}'),
  ('streak_50', 'Half Century', '半世紀', 'Achieve a 50 hand correct streak', '達成 50 手連續正確', '💥', 'streak', 75, 'gold', '{"type": "streak", "value": 50}'),
  ('streak_75', 'Unstoppable', '勢不可擋', 'Achieve a 75 hand correct streak', '達成 75 手連續正確', '⚡', 'streak', 100, 'gold', '{"type": "streak", "value": 75}'),
  ('streak_100', 'Perfect Hundred', '完美百手', 'Achieve a 100 hand correct streak', '達成 100 手連續正確', '🌟', 'streak', 200, 'platinum', '{"type": "streak", "value": 100}')
ON CONFLICT (id) DO NOTHING;

-- Accuracy Achievements
INSERT INTO achievements (id, name, name_zh, description, description_zh, icon, category, points, tier, requirement) VALUES
  ('accuracy_75', 'Above Average', '高於平均', 'Achieve 75% accuracy with 100+ hands', '達成 75% 準確率（100+ 手）', '📈', 'accuracy', 25, 'bronze', '{"type": "accuracy", "value": 75, "min_hands": 100}'),
  ('accuracy_85', 'Solid Player', '穩定玩家', 'Achieve 85% accuracy with 200+ hands', '達成 85% 準確率（200+ 手）', '💪', 'accuracy', 75, 'silver', '{"type": "accuracy", "value": 85, "min_hands": 200}'),
  ('accuracy_90', 'Near Perfect', '接近完美', 'Achieve 90% accuracy with 300+ hands', '達成 90% 準確率（300+ 手）', '🎖️', 'accuracy', 150, 'gold', '{"type": "accuracy", "value": 90, "min_hands": 300}'),
  ('accuracy_95', 'GTO Genius', 'GTO 天才', 'Achieve 95% accuracy with 500+ hands', '達成 95% 準確率（500+ 手）', '🧠', 'accuracy', 300, 'platinum', '{"type": "accuracy", "value": 95, "min_hands": 500}')
ON CONFLICT (id) DO NOTHING;

-- Special Achievements
INSERT INTO achievements (id, name, name_zh, description, description_zh, icon, category, points, tier, requirement) VALUES
  ('special_weekly_100', 'Weekly Warrior', '每週戰士', 'Complete 100 hands in a single week', '單週完成 100 手練習', '🗓️', 'special', 40, 'silver', '{"type": "weekly_hands", "value": 100}'),
  ('special_daily_50', 'Daily Dedication', '每日精進', 'Complete 50 hands in a single day', '單日完成 50 手練習', '📅', 'special', 30, 'bronze', '{"type": "daily_hands", "value": 50}'),
  ('special_comeback', 'Comeback King', '逆轉之王', 'Improve accuracy by 10% over 100 hands', '在 100 手內提升 10% 準確率', '🔄', 'special', 50, 'silver', '{"type": "accuracy_improvement", "value": 10}'),
  ('special_all_positions', 'Position Master', '位置大師', 'Practice all 6 positions with 50+ hands each', '每個位置練習 50+ 手', '🎪', 'special', 100, 'gold', '{"type": "all_positions", "value": 50}')
ON CONFLICT (id) DO NOTHING;

-- Comment: These new achievements expand the system from basic milestones
-- to include more engaging goals across different categories.
-- Total new achievements: 16 (4 milestone + 4 streak + 4 accuracy + 4 special)
