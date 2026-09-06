"""Four memory scopes (spec section 24): short-term (this execution only,
kept in-process), task (this task's execution history), organization
(business-rule preferences), and operational (aggregate success/failure
patterns). Never stores secrets — callers must not pass credentials in."""

from typing import Any

from supabase import Client

from app.database import repository
from app.models.enums import MemoryScope


class MemoryManager:
    def __init__(self, db: Client, organization_id: str) -> None:
        self._db = db
        self._organization_id = organization_id
        self._short_term: dict[str, Any] = {}

    def remember_short_term(self, key: str, value: Any) -> None:
        self._short_term[key] = value

    def recall_short_term(self, key: str, default: Any = None) -> Any:
        return self._short_term.get(key, default)

    def remember_operational(self, key: str, value: dict[str, Any]) -> None:
        repository.upsert_memory(self._db, organization_id=self._organization_id, scope=MemoryScope.OPERATIONAL.value, key=key, value=value)

    def remember_task(self, task_id: str, key: str, value: dict[str, Any]) -> None:
        repository.upsert_memory(self._db, organization_id=self._organization_id, scope=MemoryScope.TASK.value, key=key, value=value, task_id=task_id)

    def recall_task(self, task_id: str, key: str) -> dict[str, Any] | None:
        row = repository.get_memory(self._db, organization_id=self._organization_id, scope=MemoryScope.TASK.value, key=key, task_id=task_id)
        return row["value"] if row else None

    def recall_organization(self, key: str) -> dict[str, Any] | None:
        row = repository.get_memory(self._db, organization_id=self._organization_id, scope=MemoryScope.ORGANIZATION.value, key=key)
        return row["value"] if row else None
