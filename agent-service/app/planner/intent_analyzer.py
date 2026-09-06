"""Lightweight, deterministic pre-pass over the raw instruction: pulls out
an obvious trigger cadence before the (costlier) LLM planning call, so the
planner's prompt already contains a strong hint instead of asking the model
to re-derive something a regex can get right for free."""

import re
from dataclasses import dataclass

_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"every\s+(\d+)\s+minutes", re.I), "every {0} minutes"),
    (re.compile(r"every\s+weekday", re.I), "weekdays 09:00"),
    (re.compile(r"every\s+hour|hourly", re.I), "hourly"),
    (re.compile(r"every\s+day|daily", re.I), "daily 09:00"),
    (re.compile(r"every\s+week|weekly", re.I), "weekly"),
    (re.compile(r"every\s+month|monthly", re.I), "monthly"),
]
_TIME_PATTERN = re.compile(r"\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b", re.I)


@dataclass
class IntentHint:
    likely_trigger_type: str
    likely_schedule: str | None


def analyze_intent(instruction: str) -> IntentHint:
    schedule: str | None = None
    for pattern, template in _PATTERNS:
        match = pattern.search(instruction)
        if match:
            schedule = template.format(*match.groups()) if match.groups() else template
            break

    time_match = _TIME_PATTERN.search(instruction)
    if schedule and time_match and "weekday" in schedule or (schedule and schedule.startswith("daily")):
        hour = int(time_match.group(1)) if time_match else 9
        minute = int(time_match.group(2) or 0) if time_match else 0
        if time_match and time_match.group(3).lower() == "pm" and hour != 12:
            hour += 12
        prefix = "weekdays" if schedule and "weekday" in schedule else "daily"
        schedule = f"{prefix} {hour:02d}:{minute:02d}"

    trigger_type = "schedule" if schedule else "manual"
    return IntentHint(likely_trigger_type=trigger_type, likely_schedule=schedule)
