"""Produces the final structured summary the dashboard renders (spec
section 41: manual vs automated time, time saved). Counts come from real
step_results, never a free-text claim of success."""

from app.models.execution import StepResult

SECONDS_PER_MANUAL_STEP = 180  # conservative estimate of a human doing one step by hand


class ReportingEngine:
    def build_summary(self, step_results: list[StepResult], duration_ms: int) -> dict:
        succeeded = [r for r in step_results if r.success and r.verified]
        failed = [r for r in step_results if not (r.success and r.verified)]

        manual_seconds = len(step_results) * SECONDS_PER_MANUAL_STEP
        automated_seconds = max(duration_ms / 1000, 1)
        time_saved_seconds = max(0, int(manual_seconds - automated_seconds))

        return {
            "steps_completed": len(succeeded),
            "steps_failed": len(failed),
            "total_steps": len(step_results),
            "manual_time_estimate_seconds": manual_seconds,
            "automated_time_seconds": round(automated_seconds, 1),
            "time_saved_seconds": time_saved_seconds,
        }
