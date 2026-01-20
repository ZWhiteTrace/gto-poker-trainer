"""
Training session management.
"""
import json
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional

from .drill import Spot
from core.evaluator import EvalResult


@dataclass
class SpotResult:
    """Result of a single spot in a session."""
    spot: Spot
    player_action: str
    eval_result: EvalResult
    response_time_ms: Optional[float] = None

    def to_dict(self) -> dict:
        return {
            "hand": str(self.spot.hand),
            "scenario": self.spot.scenario.scenario_key,
            "player_action": self.player_action,
            "correct_action": self.eval_result.correct_action,
            "is_correct": self.eval_result.is_correct,
            "response_time_ms": self.response_time_ms,
            "timestamp": self.spot.timestamp.isoformat(),
        }


@dataclass
class TrainingSession:
    """
    Manages a single training session.
    """
    session_id: str = field(default_factory=lambda: datetime.now().strftime("%Y%m%d_%H%M%S"))
    start_time: datetime = field(default_factory=datetime.now)
    results: List[SpotResult] = field(default_factory=list)

    @property
    def total_spots(self) -> int:
        return len(self.results)

    @property
    def correct_count(self) -> int:
        """Count of perfectly correct answers (primary GTO action)."""
        return sum(1 for r in self.results if r.eval_result.is_correct)

    @property
    def acceptable_count(self) -> int:
        """Count of acceptable answers (mixed strategy, not primary but valid)."""
        return sum(1 for r in self.results if r.eval_result.is_acceptable and not r.eval_result.is_correct)

    @property
    def not_wrong_count(self) -> int:
        """Count of correct + acceptable answers."""
        return sum(1 for r in self.results if r.eval_result.is_correct or r.eval_result.is_acceptable)

    @property
    def incorrect_count(self) -> int:
        """Count of true errors (0% frequency actions)."""
        return sum(1 for r in self.results if not r.eval_result.is_correct and not r.eval_result.is_acceptable)

    @property
    def accuracy(self) -> float:
        """Accuracy based on not-wrong (correct + acceptable) answers."""
        if self.total_spots == 0:
            return 0.0
        return self.not_wrong_count / self.total_spots

    @property
    def accuracy_percent(self) -> str:
        return f"{self.accuracy * 100:.1f}%"

    @property
    def mistakes(self) -> List[SpotResult]:
        """Only true mistakes (0% frequency actions), not acceptable mixed strategies."""
        return [r for r in self.results if not r.eval_result.is_correct and not r.eval_result.is_acceptable]

    def add_result(self, spot: Spot, player_action: str, eval_result: EvalResult,
                   response_time_ms: Optional[float] = None):
        """Add a spot result to the session."""
        self.results.append(SpotResult(
            spot=spot,
            player_action=player_action,
            eval_result=eval_result,
            response_time_ms=response_time_ms,
        ))

    def get_stats_by_action_type(self) -> Dict[str, Dict]:
        """Get accuracy stats grouped by action type."""
        stats = {}
        for result in self.results:
            action_type = result.spot.scenario.action_type.value
            if action_type not in stats:
                stats[action_type] = {"total": 0, "correct": 0}
            stats[action_type]["total"] += 1
            if result.eval_result.is_correct:
                stats[action_type]["correct"] += 1

        # Calculate percentages
        for action_type in stats:
            total = stats[action_type]["total"]
            correct = stats[action_type]["correct"]
            stats[action_type]["accuracy"] = correct / total if total > 0 else 0

        return stats

    def get_stats_by_position(self) -> Dict[str, Dict]:
        """Get accuracy stats grouped by hero position."""
        stats = {}
        for result in self.results:
            position = result.spot.scenario.hero_position.value
            if position not in stats:
                stats[position] = {"total": 0, "correct": 0}
            stats[position]["total"] += 1
            if result.eval_result.is_correct:
                stats[position]["correct"] += 1

        # Calculate percentages
        for position in stats:
            total = stats[position]["total"]
            correct = stats[position]["correct"]
            stats[position]["accuracy"] = correct / total if total > 0 else 0

        return stats

    def get_weak_hands(self, min_attempts: int = 2) -> List[Dict]:
        """
        Find hands that are frequently answered incorrectly.
        Returns list of {hand, scenario, attempts, correct, accuracy}
        """
        hand_stats = {}

        for result in self.results:
            key = f"{result.spot.hand}_{result.spot.scenario.scenario_key}"
            if key not in hand_stats:
                hand_stats[key] = {
                    "hand": str(result.spot.hand),
                    "scenario": result.spot.scenario.scenario_key,
                    "attempts": 0,
                    "correct": 0,
                }
            hand_stats[key]["attempts"] += 1
            if result.eval_result.is_correct:
                hand_stats[key]["correct"] += 1

        # Filter and calculate accuracy
        weak_hands = []
        for key, stats in hand_stats.items():
            if stats["attempts"] >= min_attempts:
                stats["accuracy"] = stats["correct"] / stats["attempts"]
                if stats["accuracy"] < 0.8:  # Less than 80% accuracy
                    weak_hands.append(stats)

        # Sort by accuracy (lowest first)
        weak_hands.sort(key=lambda x: x["accuracy"])
        return weak_hands

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "start_time": self.start_time.isoformat(),
            "total_spots": self.total_spots,
            "correct_count": self.correct_count,
            "accuracy": self.accuracy,
            "results": [r.to_dict() for r in self.results],
        }

    def save(self, data_dir: Path = None):
        """Save session to JSON file."""
        if data_dir is None:
            data_dir = Path(__file__).parent.parent / "data" / "user"

        data_dir.mkdir(parents=True, exist_ok=True)
        filepath = data_dir / f"session_{self.session_id}.json"

        with open(filepath, 'w') as f:
            json.dump(self.to_dict(), f, indent=2)

    @classmethod
    def load(cls, filepath: Path) -> "TrainingSession":
        """Load session from JSON file."""
        with open(filepath, 'r') as f:
            data = json.load(f)
        # Note: This is a simplified load that doesn't fully reconstruct Spot objects
        session = cls(session_id=data["session_id"])
        session.start_time = datetime.fromisoformat(data["start_time"])
        return session


class ProgressTracker:
    """
    Tracks overall progress across multiple sessions.
    """

    def __init__(self, data_dir: Path = None):
        if data_dir is None:
            data_dir = Path(__file__).parent.parent / "data" / "user"
        self.data_dir = data_dir
        self.progress_file = data_dir / "progress.json"
        self._load_progress()

    def _load_progress(self):
        """Load progress from file."""
        if self.progress_file.exists():
            with open(self.progress_file, 'r') as f:
                self.data = json.load(f)
        else:
            self.data = {
                "total_sessions": 0,
                "total_spots": 0,
                "total_correct": 0,
                "hand_stats": {},  # {hand_scenario: {attempts, correct, last_seen}}
                "session_history": [],  # List of {date, accuracy, spots}
            }

    def _save_progress(self):
        """Save progress to file."""
        self.data_dir.mkdir(parents=True, exist_ok=True)
        with open(self.progress_file, 'w') as f:
            json.dump(self.data, f, indent=2)

    def record_session(self, session: TrainingSession):
        """Record a completed session."""
        self.data["total_sessions"] += 1
        self.data["total_spots"] += session.total_spots
        self.data["total_correct"] += session.correct_count

        # Update hand stats
        for result in session.results:
            key = f"{result.spot.hand}_{result.spot.scenario.scenario_key}"
            if key not in self.data["hand_stats"]:
                self.data["hand_stats"][key] = {
                    "attempts": 0,
                    "correct": 0,
                    "last_seen": None,
                }
            self.data["hand_stats"][key]["attempts"] += 1
            if result.eval_result.is_correct:
                self.data["hand_stats"][key]["correct"] += 1
            self.data["hand_stats"][key]["last_seen"] = datetime.now().isoformat()

        # Add to session history
        self.data["session_history"].append({
            "date": session.start_time.isoformat(),
            "accuracy": session.accuracy,
            "spots": session.total_spots,
        })

        self._save_progress()

    @property
    def overall_accuracy(self) -> float:
        if self.data["total_spots"] == 0:
            return 0.0
        return self.data["total_correct"] / self.data["total_spots"]

    def get_weak_spots(self, min_attempts: int = 3, max_accuracy: float = 0.7) -> List[Dict]:
        """Get spots that need more practice."""
        weak = []
        for key, stats in self.data["hand_stats"].items():
            if stats["attempts"] >= min_attempts:
                accuracy = stats["correct"] / stats["attempts"]
                if accuracy <= max_accuracy:
                    hand, scenario = key.rsplit("_", 1)
                    weak.append({
                        "hand": hand,
                        "scenario": scenario,
                        "accuracy": accuracy,
                        "attempts": stats["attempts"],
                    })
        weak.sort(key=lambda x: x["accuracy"])
        return weak
