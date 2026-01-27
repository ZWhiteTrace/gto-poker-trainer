"""
Hand history analysis endpoints.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from analyzer.hand_parser import GGPokerParser
from analyzer.preflop_analyzer import PreflopAnalyzer

router = APIRouter()


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
async def analyze_hand_history(file: UploadFile = File(...)):
    """
    Analyze uploaded hand history file.
    Currently supports GGPoker format.
    """
    if not file.filename.endswith(".txt"):
        raise HTTPException(status_code=400, detail="Only .txt files are supported")

    try:
        content = await file.read()
        content_str = content.decode("utf-8")
    except UnicodeDecodeError:
        try:
            content_str = content.decode("utf-8-sig")
        except:
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
