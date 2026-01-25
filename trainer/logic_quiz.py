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
POSTFLOP_DIR = DATA_DIR / "reasoning" / "postflop"
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
        self.postflop_data = self._load_postflop_reasoning()
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

    def _load_postflop_reasoning(self) -> dict:
        """載入翻後 reasoning 檔案 (cbet, barrel, defense)"""
        postflop = {"cbet": {}, "barrel": {}, "defense": {}}
        if not POSTFLOP_DIR.exists():
            return postflop

        # 載入 C-bet reasoning
        cbet_path = POSTFLOP_DIR / "cbet_reasoning.json"
        if cbet_path.exists():
            with open(cbet_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            for key, value in data.items():
                if key != "meta" and isinstance(value, dict):
                    postflop["cbet"][key] = value

        # 載入 Barrel reasoning
        barrel_path = POSTFLOP_DIR / "barrel_reasoning.json"
        if barrel_path.exists():
            with open(barrel_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            for key, value in data.items():
                if key != "meta" and isinstance(value, dict):
                    postflop["barrel"][key] = value

        # 載入 Defense reasoning
        defense_path = POSTFLOP_DIR / "defense_reasoning.json"
        if defense_path.exists():
            with open(defense_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            for key, value in data.items():
                if key != "meta" and isinstance(value, dict):
                    postflop["defense"][key] = value

        return postflop

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
            "bluff_4bet": "4bet (詐唬端)",
            "value_4bet": "4bet (價值端)",
            "call": "Call",
            "fold": "Fold",
            "mix_call_3bet": "混合 (Call/3bet)",
            "mix_3bet_fold": "混合 (3bet/Fold)",
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

    # ========== Postflop Question Types ==========

    def get_available_board_textures(self, category: str = "cbet") -> List[str]:
        """取得可用的牌面類型"""
        if category not in self.postflop_data:
            return []
        textures = []
        for spot, spot_data in self.postflop_data[category].items():
            for texture in spot_data.keys():
                if texture not in textures:
                    textures.append(texture)
        return textures

    def _format_action(self, action: str) -> str:
        """將 action 代碼轉為可讀中文"""
        action_map = {
            "bet_25": "下注 25%",
            "bet_33": "下注 33%",
            "bet_50": "下注 50%",
            "bet_66": "下注 66%",
            "bet_75": "下注 75%",
            "check": "過牌",
            "call": "跟注",
            "raise": "加注",
            "fold": "棄牌",
        }
        return action_map.get(action, action)

    def generate_type_e(
        self, board_texture: str = None, spot: str = "srp_btn_vs_bb"
    ) -> Optional[LogicQuestion]:
        """
        生成 E 類題型：C-bet 決策
        「在 {board} 牌面，為什麼 {hand} 應該 bet/check？」
        """
        cbet_data = self.postflop_data.get("cbet", {})
        if spot not in cbet_data:
            return None

        spot_data = cbet_data[spot]

        # 選擇牌面類型
        if board_texture and board_texture in spot_data:
            texture_data = spot_data[board_texture]
        else:
            textures = list(spot_data.keys())
            if not textures:
                return None
            board_texture = random.choice(textures)
            texture_data = spot_data[board_texture]

        hands = texture_data.get("hands", {})
        if not hands:
            return None

        # 隨機選一手牌
        hand = random.choice(list(hands.keys()))
        hand_data = hands[hand]

        action = hand_data.get("action", "")
        why = hand_data.get("why", "")
        tags = hand_data.get("tags", [])
        example_board = texture_data.get("example_board", board_texture)

        if not tags:
            return None

        # 正確答案
        correct_answer = why

        # 生成干擾選項
        distractors = self._generate_distractors(tags, count=3)

        # 組合選項
        options = [correct_answer] + distractors
        indices = list(range(len(options)))
        random.shuffle(indices)
        options = [options[i] for i in indices]
        correct_index = indices.index(0)

        # 題目文字
        if "3bet" in spot:
            pot_type = "3bet pot"
        else:
            pot_type = "單挑底池"
        question_text = (
            f"在 {example_board} 牌面 ({board_texture.replace('_', ' ')})，"
            f"{pot_type}，為什麼 {hand} 應該 {self._format_action(action)}？"
        )

        # 解說
        context = texture_data.get("context", {})
        explanation_parts = [why, ""]
        explanation_parts.append(f"牌面類型：{board_texture.replace('_', ' ')}")
        explanation_parts.append(f"範圍優勢：{context.get('range_advantage', 'N/A')}")
        explanation_parts.append(f"C-bet 頻率：{context.get('cbet_frequency', 'N/A')}")
        if context.get("note"):
            explanation_parts.append(f"\n{context['note']}")

        return LogicQuestion(
            question_type="E",
            question_text=question_text,
            options=options,
            correct_index=correct_index,
            explanation="\n".join(explanation_parts),
            tags_involved=tags,
            layer="Layer 2 (WHY) - Postflop C-bet",
            hand=hand,
            scenario=f"{spot} / {board_texture}",
        )

    def generate_type_f(
        self, board_texture: str = None, spot: str = "bb_vs_btn_srp"
    ) -> Optional[LogicQuestion]:
        """
        生成 F 類題型：OOP 防守決策
        「面對 c-bet，為什麼 {hand} 應該 call/raise/fold？」
        """
        defense_data = self.postflop_data.get("defense", {})
        if spot not in defense_data:
            return None

        spot_data = defense_data[spot]

        # 選擇牌面類型
        if board_texture and board_texture in spot_data:
            texture_data = spot_data[board_texture]
        else:
            textures = list(spot_data.keys())
            if not textures:
                return None
            board_texture = random.choice(textures)
            texture_data = spot_data[board_texture]

        hands = texture_data.get("hands", {})
        if not hands:
            return None

        # 隨機選一手牌
        hand = random.choice(list(hands.keys()))
        hand_data = hands[hand]

        action = hand_data.get("action", "")
        role = hand_data.get("role", "")
        tags = hand_data.get("tags", [])
        example_board = texture_data.get("example_board", board_texture)

        if not tags:
            return None

        # 正確答案：用主要 tag 解釋
        primary_tag = tags[0]
        correct_answer = (
            f"{self._get_tag_name(primary_tag)}："
            f"{self._get_tag_explanation(primary_tag)}"
        )

        # 生成干擾選項
        distractors = self._generate_distractors(tags, count=3)

        # 組合選項
        options = [correct_answer] + distractors
        indices = list(range(len(options)))
        random.shuffle(indices)
        options = [options[i] for i in indices]
        correct_index = indices.index(0)

        # 題目文字
        action_zh = {"call": "跟注", "raise": "加注", "fold": "棄牌"}.get(action, action)
        if "3bet" in spot:
            pot_type = "3bet pot"
            aggressor = "3bettor"
        else:
            pot_type = "單挑底池"
            aggressor = "BTN"
        question_text = (
            f"在 {example_board} 牌面，{pot_type}，面對 {aggressor} 的 c-bet，"
            f"為什麼 {hand} 應該 check-{action_zh}？"
        )

        # 解說
        context = texture_data.get("context", {})
        explanation_parts = []
        for t in tags:
            explanation_parts.append(
                f"• {self._get_tag_name(t)}：{self._get_tag_explanation(t)}"
            )
        explanation_parts.append("")
        explanation_parts.append(f"牌面範圍優勢：{context.get('range_advantage', 'N/A')}")
        explanation_parts.append(f"防守頻率：{context.get('defense_frequency', 'N/A')}")
        if context.get("note"):
            explanation_parts.append(f"\n{context['note']}")

        return LogicQuestion(
            question_type="F",
            question_text=question_text,
            options=options,
            correct_index=correct_index,
            explanation="\n".join(explanation_parts),
            tags_involved=tags,
            layer="Layer 2 (WHY) - Postflop Defense",
            hand=hand,
            scenario=f"{spot} / {board_texture}",
        )

    def generate_type_g(
        self, street: str = None, spot: str = "srp_btn_vs_bb"
    ) -> Optional[LogicQuestion]:
        """
        生成 G 類題型：Barrel 決策
        「Flop bet 後 Turn/River 為什麼應該繼續/停止？」
        """
        barrel_data = self.postflop_data.get("barrel", {})
        if spot not in barrel_data:
            return None

        spot_data = barrel_data[spot]

        # 選擇街道
        if street == "turn":
            scenario_group = spot_data.get("turn_barrel_scenarios", {})
            street_label = "Turn"
        elif street == "river":
            scenario_group = spot_data.get("river_barrel_scenarios", {})
            street_label = "River"
        else:
            # 隨機選擇
            turn_scenarios = spot_data.get("turn_barrel_scenarios", {})
            river_scenarios = spot_data.get("river_barrel_scenarios", {})
            if turn_scenarios and river_scenarios:
                if random.choice([True, False]):
                    scenario_group = turn_scenarios
                    street_label = "Turn"
                else:
                    scenario_group = river_scenarios
                    street_label = "River"
            elif turn_scenarios:
                scenario_group = turn_scenarios
                street_label = "Turn"
            elif river_scenarios:
                scenario_group = river_scenarios
                street_label = "River"
            else:
                return None

        if not scenario_group:
            return None

        # 隨機選場景
        scenario_name = random.choice(list(scenario_group.keys()))
        scenario_data = scenario_group[scenario_name]

        hands = scenario_data.get("hands", {})
        if not hands:
            return None

        # 隨機選一手牌
        hand = random.choice(list(hands.keys()))
        hand_data = hands[hand]

        action = hand_data.get("action", "")
        why = hand_data.get("why", "")
        tags = hand_data.get("tags", [])

        flop = scenario_data.get("flop", "")
        turn = scenario_data.get("turn", "")
        river = scenario_data.get("river", "")
        context = scenario_data.get("context", {})

        if not tags:
            return None

        # 正確答案
        correct_answer = why

        # 生成干擾選項
        distractors = self._generate_distractors(tags, count=3)

        # 組合選項
        options = [correct_answer] + distractors
        indices = list(range(len(options)))
        random.shuffle(indices)
        options = [options[i] for i in indices]
        correct_index = indices.index(0)

        # 題目文字
        if street_label == "Turn":
            board_str = f"Flop: {flop} → Turn: {turn}"
        else:
            board_str = f"Flop: {flop} → Turn: {turn} → River: {river}"

        question_text = (
            f"BTN vs BB 單挑底池，Flop bet 後對手 call。\n"
            f"{board_str}\n"
            f"為什麼 {hand} 在 {street_label} 應該 {self._format_action(action)}？"
        )

        # 解說
        explanation_parts = [why, ""]
        explanation_parts.append(f"場景：{scenario_name.replace('_', ' ')}")
        if context.get("equity_change"):
            explanation_parts.append(f"權益變化：{context['equity_change']}")
        if context.get("barrel_frequency"):
            explanation_parts.append(f"Barrel 頻率：{context['barrel_frequency']}")
        if context.get("note"):
            explanation_parts.append(f"\n{context['note']}")

        return LogicQuestion(
            question_type="G",
            question_text=question_text,
            options=options,
            correct_index=correct_index,
            explanation="\n".join(explanation_parts),
            tags_involved=tags,
            layer="Layer 2 (WHY) - Postflop Barrel",
            hand=hand,
            scenario=f"{spot} / {street_label} / {scenario_name}",
        )

    def generate_random_question(
        self, scenario: str = None, include_postflop: bool = False
    ) -> Optional[LogicQuestion]:
        """隨機生成一道題目（A, B, E, F 類型）"""
        if not scenario:
            scenarios = self.get_available_scenarios()
            if not scenarios:
                return None
            scenario = random.choice(scenarios)

        # 隨機選題型
        if include_postflop and self.postflop_data.get("cbet"):
            question_type = random.choice(["A", "B", "E", "F", "G"])
        else:
            question_type = random.choice(["A", "B"])

        if question_type == "A":
            hands = self.get_scenario_hands(scenario)
            if not hands:
                return None
            hand = random.choice(hands)
            return self.generate_type_a(scenario, hand)
        elif question_type == "B":
            return self.generate_type_b(scenario)
        elif question_type == "E":
            return self.generate_type_e()
        elif question_type == "F":
            return self.generate_type_f()
        else:
            return self.generate_type_g()

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

    def generate_postflop_quiz(
        self, board_texture: str = None, count: int = 5
    ) -> List[LogicQuestion]:
        """生成一組翻後測驗題 (E + F 類型)"""
        questions = []

        # 生成 E 類 (C-bet) 題目
        cbet_data = self.postflop_data.get("cbet", {})
        for spot, spot_data in cbet_data.items():
            textures = list(spot_data.keys())
            if board_texture:
                textures = [t for t in textures if t == board_texture]
            for texture in textures:
                q = self.generate_type_e(board_texture=texture, spot=spot)
                if q:
                    questions.append(q)

        # 生成 F 類 (Defense) 題目
        defense_data = self.postflop_data.get("defense", {})
        for spot, spot_data in defense_data.items():
            textures = list(spot_data.keys())
            if board_texture:
                textures = [t for t in textures if t == board_texture]
            for texture in textures:
                q = self.generate_type_f(board_texture=texture, spot=spot)
                if q:
                    questions.append(q)

        random.shuffle(questions)
        return questions[:count]

    def get_postflop_summary(self) -> dict:
        """取得翻後資料統計摘要"""
        summary = {
            "cbet_spots": 0,
            "cbet_hands": 0,
            "defense_spots": 0,
            "defense_hands": 0,
            "barrel_scenarios": 0,
            "total_postflop_hands": 0,
        }

        # C-bet 統計
        for spot, spot_data in self.postflop_data.get("cbet", {}).items():
            for texture, texture_data in spot_data.items():
                summary["cbet_spots"] += 1
                summary["cbet_hands"] += len(texture_data.get("hands", {}))

        # Defense 統計
        for spot, spot_data in self.postflop_data.get("defense", {}).items():
            for texture, texture_data in spot_data.items():
                summary["defense_spots"] += 1
                summary["defense_hands"] += len(texture_data.get("hands", {}))

        # Barrel 統計
        for spot, spot_data in self.postflop_data.get("barrel", {}).items():
            for scenario_type, scenarios in spot_data.items():
                for scenario_name, scenario_data in scenarios.items():
                    summary["barrel_scenarios"] += 1

        summary["total_postflop_hands"] = (
            summary["cbet_hands"] + summary["defense_hands"]
        )

        return summary
