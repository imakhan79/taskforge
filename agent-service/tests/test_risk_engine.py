from app.models.enums import RiskLevel
from app.security.risk_engine import RiskEngine
from tests.fake_supabase import FakeSupabase


def make_engine() -> RiskEngine:
    db = FakeSupabase()
    db.seed(
        "tool_definitions",
        [
            {"name": "search_emails", "risk_level": "low"},
            {"name": "send_email", "risk_level": "high"},
            {"name": "delete_file", "risk_level": "critical"},
        ],
    )
    return RiskEngine(db)


def test_get_tool_risk_from_catalog():
    engine = make_engine()
    assert engine.get_tool_risk("send_email") == RiskLevel.HIGH
    assert engine.get_tool_risk("delete_file") == RiskLevel.CRITICAL


def test_get_tool_risk_unknown_tool_falls_back_to_medium():
    engine = make_engine()
    assert engine.get_tool_risk("made_up_tool") == RiskLevel.MEDIUM


def test_requires_approval_respects_org_threshold():
    engine = make_engine()
    settings = {"approval_risk_threshold": "high"}
    assert engine.requires_approval(RiskLevel.LOW, settings) is False
    assert engine.requires_approval(RiskLevel.MEDIUM, settings) is False
    assert engine.requires_approval(RiskLevel.HIGH, settings) is True
    assert engine.requires_approval(RiskLevel.CRITICAL, settings) is True


def test_requires_approval_stricter_threshold():
    engine = make_engine()
    settings = {"approval_risk_threshold": "medium"}
    assert engine.requires_approval(RiskLevel.LOW, settings) is False
    assert engine.requires_approval(RiskLevel.MEDIUM, settings) is True


def test_highest_risk():
    engine = make_engine()
    result = engine.highest_risk([RiskLevel.LOW, RiskLevel.CRITICAL, RiskLevel.MEDIUM])
    assert result == RiskLevel.CRITICAL
