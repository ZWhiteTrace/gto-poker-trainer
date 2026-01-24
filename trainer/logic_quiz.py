"""
GTO Logic Quiz Engine (Layer C: Question Generation)

根據 reasoning + tags 資料自動生成「WHY」層的教學題目。
支援兩種題型：
  A (角色辨識): 為什麼某張牌做某動作？
  B (比較推理): 為什麼同類型的兩張牌策略不同？
"""

import json
import random
from pathlib import Path
from typing import List, Dict, Optional, Tuple

# 資料目錄
DATA_DIR = Path(__file__).parent.parent / "data"
TAGS_PATH = DATA_DIR / "tags" / "principle_tags.json"
REASONING_DIR = DATA_DIR / "reasoning" / "6max"
TEMPLATES_PATH = DATA_DIR / "question_templates" / "templates.json"


class LogicQuestion:
    """一道邏輯題目的資料結構"""

    def __init__(
        self,
        question_type: str,
        question_text: str,
        options: List[str],
        correct_index: int,
        explanation: str,
        tags_involved: List[str],
        layer: str,
        hand: str = "",
        scenario: str = "",
    ):
        self.question_type = question_type  # "A" or "B"
        self.question_text = question_text
        self.options = options
        self.correct_index = correct_index
        self.explanation = explanation
        self.tags_involved = tags_involved
        self.layer = layer
        self.hand = hand
        self.scenario = scenario

    def to_dict(self) -> dict:
        return {
            "type": self.question_type,
            "question": self.question_text,
            "options": self.options,
            "correct_index": self.correct_index,
            "explanation": self.explanation,
            "tags": self.tags_involved,
            "layer": self.layer,
            "hand": self.hand,
            "scenario": self.scenario,
        }


class LogicQuizEngine:
    """GTO 邏輯題目生成引擎"""

    def __init__(self):
        self.tags_data = self._load_tags()
        self.reasoning_data = self._load_reasoning()
        self.templates = self._load_templates()

    def _load_tags(self) -> dict:
        """載入原則標籤庫"""
        if not TAGS_PATH.exists():
            return {}
        with open(TAGS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("tags", {})

    def _load_reasoning(self) -> dict:
        """載入所有 reasoning 檔案"""
        reasoning = {}
        if not REASONING_DIR.exists():
            return reasoning
        for filepath in REASONING_DIR.glob("*.json"):
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
            # 取出所有 scenario (排除 meta)
            for key, value in data.items():
                if key == "meta":
                    continue
                if isinstance(value, dict) and "hands" in value:
                    reasoning[key] = value
        return reasoning

    def _load_templates(self) -> dict:
        """載入題目模板"""
        if not TEMPLATES_PATH.exists():
            return {}
        with open(TEMPLATES_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("question_types", {})

    def get_available_scenarios(self) -> List[str]:
        """取得有 reasoning 資料的所有場景"""
        return list(self.reasoning_data.keys())

    def get_scenario_hands(self, scenario: str) -> List[str]:
        """取得某場景中有 reasoning 的所有手牌"""
        if scenario not in self.reasoning_data:
            return []
        return list(self.reasoning_data[scenario].get("hands", {}).keys())

    def _format_role(self, role: str) -> str:
        """將 role 代碼轉為可讀中文"""
        role_map = {
            "bluff_3bet": "3bet (詐唬端)",
            "value_3bet": "3bet (價值端)",
            "call": "Call",
            "fold": "Fold",
            "mix_call_3bet": "混合 (Call/3bet)",
        }
        return role_map.get(role, role)

    def _format_scenario(self, scenario: str) -> str:
        """將 scenario key 轉為可讀格式"""
        return scenario.replace("_", " ")

    def _get_tag_explanation(self, tag_key: str) -> str:
        """取得 tag 的完整解釋"""
        tag = self.tags_data.get(tag_key, {})
        return tag.get("explanation", tag_key)

    def _get_tag_name(self, tag_key: str) -> str:
        """取得 tag 的顯示名稱"""
        tag = self.tags_data.get(tag_key, {})
        return tag.get("name", tag_key)

    def _get_misconceptions(self, tag_key: str) -> List[str]:
        """取得某 tag 的常見錯誤認知"""
        tag = self.tags_data.get(tag_key, {})
        return tag.get("misconceptions", [])

    def _generate_distractors(
        self, correct_tags: List[str], count: int = 3
    ) -> List[str]:
        """
        生成干擾選項：
        Priority 1: 正確 tag 的 misconceptions
        Priority 2: 同 category 其他 tag 的 explanation
        Priority 3: 不相關 tag 的 explanation
        """
        distractors = []

        # Priority 1: misconceptions from correct tags
        for tag_key in correct_tags:
            for misconception in self._get_misconceptions(tag_key):
                if misconception not in distractors:
                    distractors.append(misconception)

        # Priority 2: same category, different tag
        correct_categories = set()
        for tag_key in correct_tags:
            tag = self.tags_data.get(tag_key, {})
            correct_categories.add(tag.get("category", ""))

        for tag_key, tag_data in self.tags_data.items():
            if tag_key in correct_tags:
                continue
            if tag_data.get("category") in correct_categories:
                explanation = tag_data.get("explanation", "")
                if explanation and explanation not in distractors:
                    distractors.append(explanation)

        # Priority 3: unrelated tags
        for tag_key, tag_data in self.tags_data.items():
            if tag_key in correct_tags:
                continue
            if tag_data.get("category") not in correct_categories:
                explanation = tag_data.get("explanation", "")
                if explanation and explanation not in distractors:
                    distractors.append(explanation)

        random.shuffle(distractors)
        return distractors[:count]

    def generate_type_a(
        self, scenario: str, hand: str
    ) -> Optional[LogicQuestion]:
        """
        生成 A 類題型：角色辨識
        「為什麼 {hand} 在 {scenario} 中做 {action}？」
        """
        scenario_data = self.reasoning_data.get(scenario)
        if not scenario_data:
            return None

        hand_data = scenario_data.get("hands", {}).get(hand)
        if not hand_data:
            return None

        role = hand_data["role"]
        tags = hand_data.get("tags", [])
        if not tags:
            return None

        # 選擇主要 tag 作為正確答案
        primary_tag = tags[0]
        correct_answer = (
            f"{self._get_tag_name(primary_tag)}："
            f"{self._get_tag_explanation(primary_tag)}"
        )

        # 生成干擾選項
        distractors = self._generate_distractors(tags, count=3)

        # 組合選項並隨機排列
        options = [correct_answer] + distractors
        correct_index = 0
        # Shuffle
        indices = list(range(len(options)))
        random.shuffle(indices)
        options = [options[i] for i in indices]
        correct_index = indices.index(0)

        # 題目文字
        question_text = (
            f"在 {self._format_scenario(scenario)} 場景中，"
            f"{hand} 的最佳策略是 {self._format_role(role)}。"
            f"支撐此決策的主要邏輯是？"
        )

        # 解說（列出所有相關 tags）
        explanation_parts = []
        for t in tags:
            explanation_parts.append(
                f"• {self._get_tag_name(t)}：{self._get_tag_explanation(t)}"
            )
        if hand_data.get("note"):
            explanation_parts.append(f"\n補充：{hand_data['note']}")
        explanation = "\n".join(explanation_parts)

        return LogicQuestion(
            question_type="A",
            question_text=question_text,
            options=options,
            correct_index=correct_index,
            explanation=explanation,
            tags_involved=tags,
            layer="Layer 2 (WHY)",
            hand=hand,
            scenario=scenario,
        )

    def generate_type_b(
        self, scenario: str, compare_group: str = None
    ) -> Optional[LogicQuestion]:
        """
        生成 B 類題型：比較推理
        「為什麼 {hand_a} 做 {action_a} 但 {hand_b} 做 {action_b}？」
        自動從同一 compare_group 中找 role 不同的兩張牌。
        """
        scenario_data = self.reasoning_data.get(scenario)
        if not scenario_data:
            return None

        hands = scenario_data.get("hands", {})

        # 找出可比較的配對
        pairs = self._find_comparison_pairs(hands, compare_group)
        if not pairs:
            return None

        hand_a, hand_b = random.choice(pairs)
        data_a = hands[hand_a]
        data_b = hands[hand_b]

        # 找出 tag 差異
        tags_a = set(data_a.get("tags", []))
        tags_b = set(data_b.get("tags", []))
        diff_a_only = list(tags_a - tags_b)  # A 有 B 沒有
        diff_b_only = list(tags_b - tags_a)  # B 有 A 沒有

        if not diff_a_only and not diff_b_only:
            return None

        # 正確答案：用差異 tag 解釋
        explanation_parts = []
        if diff_a_only:
            primary_diff = diff_a_only[0]
            correct_answer = (
                f"{hand_a} 具有 {self._get_tag_name(primary_diff)}："
                f"{self._get_tag_explanation(primary_diff)}"
            )
            explanation_parts.append(
                f"{hand_a} 的優勢：{self._get_tag_name(primary_diff)}"
            )
        elif diff_b_only:
            primary_diff = diff_b_only[0]
            correct_answer = (
                f"{hand_b} 受到 {self._get_tag_name(primary_diff)} 影響："
                f"{self._get_tag_explanation(primary_diff)}"
            )
            explanation_parts.append(
                f"{hand_b} 的劣勢：{self._get_tag_name(primary_diff)}"
            )

        # 補充所有差異
        for t in diff_a_only:
            explanation_parts.append(
                f"• {hand_a} 有 {self._get_tag_name(t)}"
            )
        for t in diff_b_only:
            explanation_parts.append(
                f"• {hand_b} 受 {self._get_tag_name(t)} 影響"
            )

        # 生成干擾項
        all_diff_tags = diff_a_only + diff_b_only
        distractors = self._generate_distractors(all_diff_tags, count=3)

        # 組合選項
        options = [correct_answer] + distractors
        indices = list(range(len(options)))
        random.shuffle(indices)
        options = [options[i] for i in indices]
        correct_index = indices.index(0)

        # 題目文字
        question_text = (
            f"在 {self._format_scenario(scenario)} 中，"
            f"為什麼 {hand_a} 傾向 {self._format_role(data_a['role'])}，"
            f"但 {hand_b} 卻建議 {self._format_role(data_b['role'])}？"
        )

        explanation = "\n".join(explanation_parts)

        return LogicQuestion(
            question_type="B",
            question_text=question_text,
            options=options,
            correct_index=correct_index,
            explanation=explanation,
            tags_involved=all_diff_tags,
            layer="Layer 2 (WHY) + Range Shape",
            hand=f"{hand_a} vs {hand_b}",
            scenario=scenario,
        )

    def _find_comparison_pairs(
        self, hands: dict, compare_group: str = None
    ) -> List[Tuple[str, str]]:
        """在同一 compare_group 中找 role 不同的配對"""
        # 按 compare_group 分組
        groups = {}
        for hand, data in hands.items():
            group = data.get("compare_group", "default")
            if compare_group and group != compare_group:
                continue
            if group not in groups:
                groups[group] = []
            groups[group].append((hand, data.get("role", "")))

        # 找 role 不同的配對
        pairs = []
        for group, members in groups.items():
            for i in range(len(members)):
                for j in range(i + 1, len(members)):
                    if members[i][1] != members[j][1]:
                        pairs.append((members[i][0], members[j][0]))

        return pairs

    def generate_random_question(
        self, scenario: str = None
    ) -> Optional[LogicQuestion]:
        """隨機生成一道題目（A 或 B 類型）"""
        if not scenario:
            scenarios = self.get_available_scenarios()
            if not scenarios:
                return None
            scenario = random.choice(scenarios)

        # 隨機選題型
        question_type = random.choice(["A", "B"])

        if question_type == "A":
            hands = self.get_scenario_hands(scenario)
            if not hands:
                return None
            hand = random.choice(hands)
            return self.generate_type_a(scenario, hand)
        else:
            return self.generate_type_b(scenario)

    def generate_quiz(
        self, scenario: str, count: int = 5
    ) -> List[LogicQuestion]:
        """生成一組測驗題"""
        questions = []
        hands = self.get_scenario_hands(scenario)
        if not hands:
            return questions

        # 先用所有 hands 生成 A 類題目
        a_questions = []
        for hand in hands:
            q = self.generate_type_a(scenario, hand)
            if q:
                a_questions.append(q)

        # 生成所有可能的 B 類題目
        b_questions = []
        q = self.generate_type_b(scenario)
        if q:
            b_questions.append(q)
        # 嘗試不同 compare_groups
        groups = set()
        for hand_data in self.reasoning_data.get(scenario, {}).get("hands", {}).values():
            groups.add(hand_data.get("compare_group", ""))
        for group in groups:
            if group:
                q = self.generate_type_b(scenario, compare_group=group)
                if q:
                    b_questions.append(q)

        # 混合 A 和 B
        all_questions = a_questions + b_questions
        random.shuffle(all_questions)
        return all_questions[:count]
