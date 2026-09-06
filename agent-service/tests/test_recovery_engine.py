from app.recovery.recovery_engine import RecoveryEngine


def test_retries_while_under_limit():
    engine = RecoveryEngine()
    decision = engine.decide(attempt=0, max_retries=3)
    assert decision.should_retry is True
    assert decision.should_escalate is False
    assert decision.backoff_seconds > 0


def test_backoff_grows_exponentially():
    engine = RecoveryEngine()
    first = engine.decide(attempt=0, max_retries=5)
    second = engine.decide(attempt=1, max_retries=5)
    third = engine.decide(attempt=2, max_retries=5)
    assert first.backoff_seconds < second.backoff_seconds < third.backoff_seconds


def test_escalates_once_retries_exhausted():
    engine = RecoveryEngine()
    decision = engine.decide(attempt=3, max_retries=3)
    assert decision.should_retry is False
    assert decision.should_escalate is True
