/**
 * Best-effort translation from the human-readable schedule strings the
 * planner/templates produce ("weekdays 09:00", "hourly", ...) to a 5-field
 * cron expression. Actual next-run computation is owned by the Python
 * worker (via croniter) so there is exactly one implementation of "what
 * time does this cron expression next fire" in the system — this helper
 * only decides *which* cron expression a schedule maps to.
 */
export function scheduleToCron(schedule: string | null | undefined): string | null {
  if (!schedule) return null;
  const s = schedule.trim().toLowerCase();

  if (/^(\S+\s+){4}\S+$/.test(s)) return schedule.trim();

  if (s === "hourly") return "0 * * * *";
  if (s === "every 5 minutes") return "*/5 * * * *";
  if (s === "every 15 minutes") return "*/15 * * * *";
  if (s === "weekly") return "0 9 * * 1";
  if (s === "monthly") return "0 9 1 * *";

  const timeMatch = s.match(/(\d{1,2}):(\d{2})/);
  const hour = timeMatch ? parseInt(timeMatch[1], 10) : 9;
  const minute = timeMatch ? parseInt(timeMatch[2], 10) : 0;

  if (s.startsWith("weekdays")) return `${minute} ${hour} * * 1-5`;
  if (s.startsWith("daily")) return `${minute} ${hour} * * *`;

  return null;
}
