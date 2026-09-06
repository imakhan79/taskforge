"""Failure handling (spec section 27): classify -> retry with exponential
backoff up to the org's max_retries -> if still failing, escalate to a
human rather than silently giving up or faking success."""

import time
from dataclasses import dataclass

BASE_BACKOFF_SECONDS = 1.5


@dataclass
class RecoveryDecision:
    should_retry: bool
    backoff_seconds: float
    should_escalate: bool


class RecoveryEngine:
    def decide(self, *, attempt: int, max_retries: int) -> RecoveryDecision:
        if attempt < max_retries:
            return RecoveryDecision(
                should_retry=True,
                backoff_seconds=BASE_BACKOFF_SECONDS * (2**attempt),
                should_escalate=False,
            )
        return RecoveryDecision(should_retry=False, backoff_seconds=0, should_escalate=True)

    def sleep_for_backoff(self, seconds: float) -> None:
        time.sleep(seconds)
