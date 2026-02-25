"""
Hand history analysis endpoints.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from pydantic import BaseModel
from typing import Dict, List, Optional
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from slowapi import Limiter
from slowapi.util import get_remote_address

from analyzer.hand_parser import GGPokerParser
from analyzer.preflop_analyzer import PreflopAnalyzer

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


class PositionStat(BaseModel):
    total: int
    mistakes: int
    mistake_rate: float
    ev_loss: float


class LeakInfo(BaseModel):
    type: str
    description: str
    total_hands: int
    mistakes: int
    mistake_rate: float
    ev_loss: float
    common_mistakes: Optional[Dict[str, int]] = None


class DecisionInfo(BaseModel):
    hand_id: str
    hero_position: str
    hero_hand: str
    scenario: str
    villain_position: Optional[str]
    hero_action: str
    gto_frequencies: Dict[str, float]
    is_mistake: bool
    ev_loss: float


class AnalysisResponse(BaseModel):
    success: bool
    total_hands: int
    analyzed_hands: int
    mistakes: int
    mistake_rate: float
    total_ev_loss: float
    position_stats: Dict[str, PositionStat]
    top_leaks: List[LeakInfo]
    decisions: List[DecisionInfo]


class DemoResponse(BaseModel):
    success: bool
    total_hands: int
    analyzed_hands: int
    mistakes: int
    mistake_rate: float
    total_ev_loss: float
    position_stats: Dict[str, PositionStat]
    top_leaks: List[LeakInfo]


@router.post("/upload", response_model=AnalysisResponse)
@limiter.limit("20/minute")
async def analyze_hand_history(request: Request, file: UploadFile = File(...)):
    """
    Analyze uploaded hand history file.
    Currently supports GGPoker format.
    """
    if not file.filename.endswith(".txt"):
        raise HTTPException(status_code=400, detail="Only .txt files are supported")

    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    try:
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="File too large. Maximum size is 10MB.")
        content_str = content.decode("utf-8")
    except UnicodeDecodeError:
        try:
            content_str = content.decode("utf-8-sig")
        except Exception:
            raise HTTPException(status_code=400, detail="Unable to decode file. Please ensure it's a valid text file.")

    # Parse hands
    parser = GGPokerParser()
    try:
        hands = parser.parse_content(content_str)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing hand history: {str(e)}")

    if not hands:
        raise HTTPException(status_code=400, detail="No valid hands found in the file")

    # Analyze
    analyzer = PreflopAnalyzer()
    report = analyzer.analyze_hands(hands)

    # Format response
    position_stats = {}
    for pos, data in report.position_stats.items():
        rate = data["mistakes"] / data["total"] * 100 if data["total"] > 0 else 0
        position_stats[pos] = PositionStat(
            total=data["total"],
            mistakes=data["mistakes"],
            mistake_rate=round(rate, 1),
            ev_loss=round(data["ev_loss"], 1)
        )

    top_leaks = []
    for leak in report.top_leaks[:10]:
        top_leaks.append(LeakInfo(
            type=leak.get("type", "unknown"),
            description=leak["description"],
            total_hands=leak["total_hands"],
            mistakes=leak["mistakes"],
            mistake_rate=round(leak["mistake_rate"], 1),
            ev_loss=round(leak["ev_loss"], 1),
            common_mistakes=leak.get("common_mistakes")
        ))

    decisions = []
    for d in analyzer.decisions:
        decisions.append(DecisionInfo(
            hand_id=d.hand_id,
            hero_position=d.hero_position,
            hero_hand=d.hero_hand,
            scenario=d.scenario.value,
            villain_position=d.villain_position,
            hero_action=d.hero_action.value,
            gto_frequencies=d.gto_frequencies,
            is_mistake=d.is_mistake,
            ev_loss=round(d.ev_loss, 1)
        ))

    mistake_rate = report.mistakes / report.analyzed_hands * 100 if report.analyzed_hands > 0 else 0

    return AnalysisResponse(
        success=True,
        total_hands=report.total_hands,
        analyzed_hands=report.analyzed_hands,
        mistakes=report.mistakes,
        mistake_rate=round(mistake_rate, 1),
        total_ev_loss=round(report.total_ev_loss, 1),
        position_stats=position_stats,
        top_leaks=top_leaks,
        decisions=decisions
    )


class AIReviewRequest(BaseModel):
    """Request for AI-powered hand review."""
    position_stats: Dict[str, PositionStat]
    top_leaks: List[LeakInfo]
    total_hands: int
    analyzed_hands: int
    mistakes: int
    mistake_rate: float
    total_ev_loss: float


class AIInsight(BaseModel):
    """Individual AI insight."""
    category: str  # weakness, strength, recommendation, drill
    title: str
    title_zh: str
    description: str
    description_zh: str
    priority: int  # 1-5, 1 is highest
    drill_link: Optional[str] = None


class AIReviewResponse(BaseModel):
    """Response with AI-generated insights."""
    insights: List[AIInsight]
    overall_assessment: str
    overall_assessment_zh: str
    skill_level: str  # beginner, intermediate, advanced, expert
    focus_areas: List[str]


def generate_ai_insights(
    position_stats: Dict[str, PositionStat],
    top_leaks: List[LeakInfo],
    mistake_rate: float,
    total_ev_loss: float
) -> List[AIInsight]:
    """Generate AI insights based on analysis data."""
    insights = []

    # Analyze position weaknesses
    worst_positions = sorted(
        [(pos, stat) for pos, stat in position_stats.items() if stat.total >= 10],
        key=lambda x: x[1].mistake_rate,
        reverse=True
    )

    # Find worst position
    if worst_positions and worst_positions[0][1].mistake_rate > 10:
        pos, stat = worst_positions[0]
        position_advice = {
            "BB": ("Big Blind Defense", "大盲防守", "You're losing significant EV in BB. Focus on defending wider against late position steals, especially from BTN and CO.", "你在大盲位置損失了大量 EV。專注於對後位偷盲進行更寬的防守，尤其是對按鈕位和切位。"),
            "SB": ("Small Blind Play", "小盲玩法", "Your SB leaks suggest either over-folding or poor 3-betting frequencies. Consider a polarized 3-bet or fold strategy.", "你的小盲漏洞顯示可能過度棄牌或 3-bet 頻率不佳。考慮使用極化的 3-bet 或棄牌策略。"),
            "BTN": ("Button Play", "按鈕位玩法", "Button should be your most profitable position. Review your opening ranges and consider stealing more aggressively.", "按鈕位應該是你最賺錢的位置。檢視你的開池範圍，考慮更積極地偷盲。"),
            "CO": ("Cutoff Play", "切位玩法", "Cutoff mistakes often come from not opening wide enough or poor 3-bet defense. Review your CO ranges.", "切位錯誤通常來自開池不夠寬或 3-bet 防守不佳。檢視你的切位範圍。"),
            "HJ": ("Hijack Play", "HJ位玩法", "HJ requires balanced opening ranges. You may be opening too wide or too tight for this position.", "HJ位需要平衡的開池範圍。你可能在這個位置開池過寬或過緊。"),
            "UTG": ("Under The Gun Play", "UTG位玩法", "UTG requires the tightest ranges. If you're making mistakes here, you may be opening too wide.", "UTG需要最緊的範圍。如果你在這裡犯錯，可能是開池過寬。"),
        }

        title, title_zh, desc, desc_zh = position_advice.get(
            pos,
            (f"{pos} Play", f"{pos}位玩法", f"Focus on improving your {pos} play.", f"專注於改善你的{pos}位玩法。")
        )

        insights.append(AIInsight(
            category="weakness",
            title=f"Weakness: {title}",
            title_zh=f"弱點：{title_zh}",
            description=f"{desc} Your mistake rate at {pos} is {stat.mistake_rate}%, costing you {stat.ev_loss} bb.",
            description_zh=f"{desc_zh} 你在{pos}的錯誤率是 {stat.mistake_rate}%，損失了 {stat.ev_loss} bb。",
            priority=1,
            drill_link="/drill/rfi" if pos in ["UTG", "HJ", "CO", "BTN"] else "/drill/vs-rfi"
        ))

    # Find best position (strength)
    best_positions = sorted(
        [(pos, stat) for pos, stat in position_stats.items() if stat.total >= 10],
        key=lambda x: x[1].mistake_rate
    )

    if best_positions and best_positions[0][1].mistake_rate < 8:
        pos, stat = best_positions[0]
        insights.append(AIInsight(
            category="strength",
            title=f"Strength: {pos} Play",
            title_zh=f"強項：{pos}位玩法",
            description=f"Your {pos} play is solid with only {stat.mistake_rate}% mistakes. Keep up the good work!",
            description_zh=f"你的{pos}位玩法很穩健，錯誤率只有 {stat.mistake_rate}%。繼續保持！",
            priority=4,
            drill_link=None
        ))

    # Analyze leak patterns
    for leak in top_leaks[:3]:
        scenario = leak.description

        if "vs_rfi" in scenario:
            if "BB" in scenario:
                insights.append(AIInsight(
                    category="drill",
                    title="Practice: BB vs RFI Defense",
                    title_zh="練習：大盲防守",
                    description=f"Your '{scenario}' leak shows {leak.mistake_rate}% mistakes. Practice defending your BB against opens.",
                    description_zh=f"你的「{scenario}」漏洞顯示 {leak.mistake_rate}% 錯誤率。練習防守大盲對抗開池。",
                    priority=2,
                    drill_link="/drill/vs-rfi"
                ))
            else:
                insights.append(AIInsight(
                    category="drill",
                    title="Practice: Facing RFI",
                    title_zh="練習：面對開池",
                    description=f"Your response to raises needs work. Practice the VS-RFI drill to improve.",
                    description_zh=f"你對開池的應對需要加強。練習 VS-RFI 訓練來改善。",
                    priority=2,
                    drill_link="/drill/vs-rfi"
                ))

        elif "rfi" in scenario.lower():
            pos = scenario.replace("rfi_", "").upper()
            insights.append(AIInsight(
                category="drill",
                title=f"Practice: {pos} Opening Ranges",
                title_zh=f"練習：{pos}開池範圍",
                description=f"Your opening range at {pos} needs refinement. Use the RFI drill to memorize correct ranges.",
                description_zh=f"你在{pos}的開池範圍需要調整。使用 RFI 訓練來記憶正確範圍。",
                priority=2,
                drill_link="/drill/rfi"
            ))

        elif "3bet" in scenario.lower():
            insights.append(AIInsight(
                category="drill",
                title="Practice: 3-Bet Situations",
                title_zh="練習：3-bet 情況",
                description=f"Your 3-bet play has leaks. Practice responding to 3-bets with the VS-3bet drill.",
                description_zh=f"你的 3-bet 玩法有漏洞。使用 VS-3bet 訓練來練習應對 3-bet。",
                priority=2,
                drill_link="/drill/vs-3bet"
            ))

    # Overall recommendations based on mistake rate
    if mistake_rate > 15:
        insights.append(AIInsight(
            category="recommendation",
            title="Focus on Fundamentals",
            title_zh="專注基礎",
            description="Your overall mistake rate suggests focusing on preflop fundamentals. Master opening ranges before moving to advanced concepts.",
            description_zh="你的整體錯誤率顯示需要專注於翻前基礎。在進入進階概念前先精通開池範圍。",
            priority=1,
            drill_link="/drill/rfi"
        ))
    elif mistake_rate > 8:
        insights.append(AIInsight(
            category="recommendation",
            title="Refine Specific Spots",
            title_zh="精進特定情況",
            description="Your game is developing well. Focus on the specific leaks identified above to reduce your error rate.",
            description_zh="你的牌技正在進步。專注於上述特定漏洞來降低錯誤率。",
            priority=3,
            drill_link=None
        ))
    else:
        insights.append(AIInsight(
            category="recommendation",
            title="Advanced Study",
            title_zh="進階學習",
            description="Your preflop play is strong. Consider studying postflop play and exploitative adjustments.",
            description_zh="你的翻前玩法很強。考慮學習翻後玩法和剝削性調整。",
            priority=4,
            drill_link="/quiz/exploit"
        ))

    # Sort by priority
    insights.sort(key=lambda x: x.priority)

    return insights


def determine_skill_level(mistake_rate: float, total_hands: int) -> str:
    """Determine player skill level based on analysis."""
    if total_hands < 100:
        return "insufficient_data"

    if mistake_rate <= 5:
        return "expert"
    elif mistake_rate <= 10:
        return "advanced"
    elif mistake_rate <= 18:
        return "intermediate"
    else:
        return "beginner"


def generate_overall_assessment(
    mistake_rate: float,
    total_ev_loss: float,
    skill_level: str,
    top_leaks: List[LeakInfo]
) -> tuple[str, str]:
    """Generate overall assessment text."""

    assessments = {
        "expert": (
            f"Excellent preflop play! Your {mistake_rate}% mistake rate shows strong fundamentals. Focus on maintaining consistency and exploring advanced exploitative strategies.",
            f"出色的翻前玩法！你 {mistake_rate}% 的錯誤率顯示堅實的基礎。專注於保持穩定性並探索進階剝削策略。"
        ),
        "advanced": (
            f"Solid preflop fundamentals with a {mistake_rate}% mistake rate. You're losing {total_ev_loss} bb to mistakes - addressing the top leaks could significantly improve your win rate.",
            f"穩健的翻前基礎，錯誤率 {mistake_rate}%。你因錯誤損失了 {total_ev_loss} bb - 修正主要漏洞可以顯著提升你的勝率。"
        ),
        "intermediate": (
            f"Your preflop game is developing. With a {mistake_rate}% mistake rate and {total_ev_loss} bb EV loss, there's significant room for improvement. Focus on the drills recommended below.",
            f"你的翻前牌技正在發展中。{mistake_rate}% 的錯誤率和 {total_ev_loss} bb 的 EV 損失顯示有很大的進步空間。專注於下方推薦的訓練。"
        ),
        "beginner": (
            f"Your {mistake_rate}% mistake rate indicates preflop fundamentals need work. The good news: fixing these leaks will dramatically improve your results. Start with the RFI drill.",
            f"你 {mistake_rate}% 的錯誤率顯示翻前基礎需要加強。好消息是：修正這些漏洞將大幅改善你的成績。從 RFI 訓練開始。"
        ),
        "insufficient_data": (
            "Not enough hands to provide a reliable assessment. Upload more hand history for accurate analysis.",
            "手數不足以提供可靠的評估。上傳更多手牌記錄以獲得準確分析。"
        )
    }

    return assessments.get(skill_level, assessments["intermediate"])


@router.post("/ai-review", response_model=AIReviewResponse)
@limiter.limit("10/minute")
def get_ai_review(request: Request, data: AIReviewRequest):
    """Generate AI-powered insights based on hand analysis."""

    # Determine skill level
    skill_level = determine_skill_level(data.mistake_rate, data.total_hands)

    # Generate insights
    insights = generate_ai_insights(
        data.position_stats,
        data.top_leaks,
        data.mistake_rate,
        data.total_ev_loss
    )

    # Generate overall assessment
    overall_en, overall_zh = generate_overall_assessment(
        data.mistake_rate,
        data.total_ev_loss,
        skill_level,
        data.top_leaks
    )

    # Determine focus areas
    focus_areas = []
    for insight in insights[:3]:
        if insight.drill_link:
            focus_areas.append(insight.drill_link)

    return AIReviewResponse(
        insights=insights,
        overall_assessment=overall_en,
        overall_assessment_zh=overall_zh,
        skill_level=skill_level,
        focus_areas=list(set(focus_areas))
    )


@router.get("/demo", response_model=DemoResponse)
def get_demo_analysis():
    """Return demo analysis data for users without hand history."""
    return DemoResponse(
        success=True,
        total_hands=1000,
        analyzed_hands=876,
        mistakes=74,
        mistake_rate=8.4,
        total_ev_loss=52.3,
        position_stats={
            "UTG": PositionStat(total=145, mistakes=8, mistake_rate=5.5, ev_loss=6.2),
            "HJ": PositionStat(total=152, mistakes=10, mistake_rate=6.6, ev_loss=7.8),
            "CO": PositionStat(total=158, mistakes=9, mistake_rate=5.7, ev_loss=5.4),
            "BTN": PositionStat(total=165, mistakes=7, mistake_rate=4.2, ev_loss=4.1),
            "SB": PositionStat(total=128, mistakes=12, mistake_rate=9.4, ev_loss=9.8),
            "BB": PositionStat(total=128, mistakes=28, mistake_rate=21.9, ev_loss=19.0),
        },
        top_leaks=[
            LeakInfo(
                type="scenario",
                description="vs_rfi_BB_vs_BTN",
                total_hands=89,
                mistakes=19,
                mistake_rate=21.3,
                ev_loss=8.5,
                common_mistakes={"fold": 15, "call": 4}
            ),
            LeakInfo(
                type="scenario",
                description="vs_rfi_BB_vs_CO",
                total_hands=67,
                mistakes=12,
                mistake_rate=17.9,
                ev_loss=5.2,
                common_mistakes={"fold": 10, "call": 2}
            ),
            LeakInfo(
                type="scenario",
                description="rfi_SB",
                total_hands=128,
                mistakes=9,
                mistake_rate=7.0,
                ev_loss=4.8,
                common_mistakes={"fold": 6, "raise": 3}
            ),
        ]
    )
