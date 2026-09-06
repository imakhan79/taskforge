"""A minimal in-memory stand-in for the Supabase client, implementing just
enough of the chainable query-builder surface that app/database/repository.py
actually calls. This lets the executor/policy/risk/approval engines be
tested against a real (if tiny) end-to-end pipeline without a network
dependency, instead of mocking every repository call individually."""

import uuid
from dataclasses import dataclass, field
from typing import Any


@dataclass
class FakeResult:
    data: Any = None
    count: int | None = None


class FakeQuery:
    def __init__(self, store: "FakeSupabase", table_name: str) -> None:
        self._store = store
        self._table = table_name
        self._filters: list[tuple[str, str, Any]] = []
        self._order: tuple[str, bool] | None = None
        self._limit: int | None = None
        self._mode: str | None = None  # 'select' | 'insert' | 'update' | 'delete' | 'upsert'
        self._payload: Any = None
        self._single: str | None = None  # 'single' | 'maybe_single'
        self._want_count = False
        self._on_conflict: list[str] | None = None

    # --- filters -----------------------------------------------------
    def eq(self, col: str, val: Any) -> "FakeQuery":
        self._filters.append(("eq", col, val))
        return self

    def neq(self, col: str, val: Any) -> "FakeQuery":
        self._filters.append(("neq", col, val))
        return self

    def gte(self, col: str, val: Any) -> "FakeQuery":
        self._filters.append(("gte", col, val))
        return self

    def is_(self, col: str, val: Any) -> "FakeQuery":
        self._filters.append(("is", col, val))
        return self

    def order(self, col: str, desc: bool = False) -> "FakeQuery":
        self._order = (col, desc)
        return self

    def limit(self, n: int) -> "FakeQuery":
        self._limit = n
        return self

    def single(self) -> "FakeQuery":
        self._single = "single"
        return self

    def maybe_single(self) -> "FakeQuery":
        self._single = "maybe_single"
        return self

    # --- operations ----------------------------------------------------
    def select(self, *_cols: str, count: str | None = None) -> "FakeQuery":
        self._mode = "select"
        self._want_count = count is not None
        return self

    def insert(self, payload: Any) -> "FakeQuery":
        self._mode = "insert"
        self._payload = payload
        return self

    def update(self, payload: dict) -> "FakeQuery":
        self._mode = "update"
        self._payload = payload
        return self

    def upsert(self, payload: Any, on_conflict: str | None = None) -> "FakeQuery":
        self._mode = "upsert"
        self._payload = payload
        self._on_conflict = on_conflict.split(",") if on_conflict else None
        return self

    def _matches(self, row: dict) -> bool:
        for op, col, val in self._filters:
            if op == "eq" and row.get(col) != val:
                return False
            if op == "neq" and row.get(col) == val:
                return False
            if op == "gte" and (row.get(col) is None or row.get(col) < val):
                return False
            if op == "is" and val == "null" and row.get(col) is not None:
                return False
        return True

    def execute(self) -> FakeResult:
        rows = self._store.tables.setdefault(self._table, [])

        if self._mode == "insert":
            payloads = self._payload if isinstance(self._payload, list) else [self._payload]
            created = []
            for p in payloads:
                row = {"id": str(uuid.uuid4()), **p}
                rows.append(row)
                created.append(row)
            return FakeResult(data=created)

        if self._mode == "upsert":
            payloads = self._payload if isinstance(self._payload, list) else [self._payload]
            result_rows = []
            for p in payloads:
                match = None
                if self._on_conflict:
                    match = next((r for r in rows if all(r.get(k) == p.get(k) for k in self._on_conflict)), None)
                if match:
                    match.update(p)
                    result_rows.append(match)
                else:
                    row = {"id": str(uuid.uuid4()), **p}
                    rows.append(row)
                    result_rows.append(row)
            return FakeResult(data=result_rows)

        matched = [r for r in rows if self._matches(r)]

        if self._mode == "update":
            for r in matched:
                r.update(self._payload)
            return FakeResult(data=matched)

        # select
        if self._order:
            col, desc = self._order
            matched.sort(key=lambda r: r.get(col) or "", reverse=desc)
        count = len(matched)
        if self._limit is not None:
            matched = matched[: self._limit]

        if self._single == "single":
            if not matched:
                raise ValueError(f"no rows found in {self._table} for single()")
            return FakeResult(data=matched[0], count=count if self._want_count else None)
        if self._single == "maybe_single":
            return FakeResult(data=matched[0] if matched else None, count=count if self._want_count else None)
        return FakeResult(data=matched, count=count if self._want_count else None)


class FakeSupabase:
    def __init__(self) -> None:
        self.tables: dict[str, list[dict]] = {}

    def seed(self, table: str, rows: list[dict]) -> None:
        self.tables[table] = [dict(r) for r in rows]

    def table(self, name: str) -> FakeQuery:
        return FakeQuery(self, name)
