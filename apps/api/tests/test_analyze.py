"""
Tests for hand analysis and AI review endpoints.
"""

import pytest


class TestDemoAnalysis:
    """Tests for demo analysis endpoint."""

    def test_get_demo_analysis(self, client):
        """Test getting demo analysis data."""
        response = client.get("/api/analyze/demo")
        assert response.status_code == 200
        data = response.json()
        assert data["success"]
        assert "total_hands" in data
        assert "analyzed_hands" in data
        assert "mistakes" in data
        assert "mistake_rate" in data
        assert "position_stats" in data
        assert "top_leaks" in data


class TestAIReview:
    """Tests for AI review endpoint."""

    @pytest.fixture
    def sample_analysis_data(self):
        """Sample analysis data for AI review."""
        return {
            "position_stats": {
                "UTG": {"total": 100, "mistakes": 5, "mistake_rate": 5.0, "ev_loss": 3.5},
                "HJ": {"total": 100, "mistakes": 8, "mistake_rate": 8.0, "ev_loss": 5.2},
                "CO": {"total": 100, "mistakes": 6, "mistake_rate": 6.0, "ev_loss": 4.0},
                "BTN": {"total": 120, "mistakes": 5, "mistake_rate": 4.2, "ev_loss": 3.0},
                "SB": {"total": 80, "mistakes": 10, "mistake_rate": 12.5, "ev_loss": 8.0},
                "BB": {"total": 80, "mistakes": 20, "mistake_rate": 25.0, "ev_loss": 15.0},
            },
            "top_leaks": [
                {
                    "type": "scenario",
                    "description": "vs_rfi_BB_vs_BTN",
                    "total_hands": 50,
                    "mistakes": 12,
                    "mistake_rate": 24.0,
                    "ev_loss": 8.0,
                },
                {
                    "type": "scenario",
                    "description": "rfi_SB",
                    "total_hands": 80,
                    "mistakes": 8,
                    "mistake_rate": 10.0,
                    "ev_loss": 5.0,
                },
            ],
            "total_hands": 1000,
            "analyzed_hands": 580,
            "mistakes": 54,
            "mistake_rate": 9.3,
            "total_ev_loss": 38.7,
        }

    def test_ai_review_returns_insights(self, client, sample_analysis_data):
        """Test that AI review returns insights."""
        response = client.post("/api/analyze/ai-review", json=sample_analysis_data)
        assert response.status_code == 200
        data = response.json()
        assert "insights" in data
        assert "overall_assessment" in data
        assert "overall_assessment_zh" in data
        assert "skill_level" in data
        assert "focus_areas" in data
        assert len(data["insights"]) > 0

    def test_ai_review_skill_level_advanced(self, client, sample_analysis_data):
        """Test skill level determination for advanced player."""
        response = client.post("/api/analyze/ai-review", json=sample_analysis_data)
        data = response.json()
        # 9.3% mistake rate should be intermediate or advanced
        assert data["skill_level"] in ["intermediate", "advanced"]

    def test_ai_review_skill_level_beginner(self, client, sample_analysis_data):
        """Test skill level for beginner (high mistake rate)."""
        sample_analysis_data["mistake_rate"] = 25.0
        response = client.post("/api/analyze/ai-review", json=sample_analysis_data)
        data = response.json()
        assert data["skill_level"] == "beginner"

    def test_ai_review_skill_level_expert(self, client, sample_analysis_data):
        """Test skill level for expert (low mistake rate)."""
        sample_analysis_data["mistake_rate"] = 3.5
        response = client.post("/api/analyze/ai-review", json=sample_analysis_data)
        data = response.json()
        assert data["skill_level"] == "expert"

    def test_ai_review_insights_have_categories(self, client, sample_analysis_data):
        """Test that insights have proper categories."""
        response = client.post("/api/analyze/ai-review", json=sample_analysis_data)
        data = response.json()
        for insight in data["insights"]:
            assert "category" in insight
            assert "title" in insight
            assert "title_zh" in insight
            assert "description" in insight
            assert "description_zh" in insight
            assert "priority" in insight
            assert insight["category"] in ["weakness", "strength", "recommendation", "drill"]

    def test_ai_review_identifies_bb_weakness(self, client, sample_analysis_data):
        """Test that AI identifies BB as weakness (highest mistake rate)."""
        response = client.post("/api/analyze/ai-review", json=sample_analysis_data)
        data = response.json()
        # Should have a weakness insight about BB
        weakness_titles = [i["title"] for i in data["insights"] if i["category"] == "weakness"]
        assert any("BB" in t or "Big Blind" in t for t in weakness_titles)

    def test_ai_review_includes_drill_links(self, client, sample_analysis_data):
        """Test that some insights include drill links."""
        response = client.post("/api/analyze/ai-review", json=sample_analysis_data)
        data = response.json()
        drill_links = [i["drill_link"] for i in data["insights"] if i.get("drill_link")]
        assert len(drill_links) > 0
        # Drill links should be valid paths
        for link in drill_links:
            assert link.startswith("/drill/") or link.startswith("/quiz/")
