"""In-memory mock system of record, one per organization. Mock tools read
and write here instead of the UI faking results directly — this is what
lets the verification engine genuinely re-query "the system" after a mock
tool claims success, and what lets the same tool interface later be
swapped for a real integration without changing the executor.

Process-lifetime only: fine for local/dev demo purposes; a real deployment
would back this with its own store or real external services."""

import random
import uuid
from dataclasses import dataclass, field
from typing import Any, Callable

FIRST_NAMES = ["Alex", "Priya", "Sam", "Jordan", "Maria", "Wei", "Fatima", "Noah", "Elena", "Kwame"]
LAST_NAMES = ["Chen", "Patel", "Garcia", "Smith", "Johansson", "Nguyen", "Khan", "Rossi", "Kim", "Osei"]
COMPANIES = ["Acme Corp", "Globex", "Initech", "Umbrella Ltd", "Stark Industries", "Wayne Enterprises"]
SUBJECTS_COMPLAINT = [
    "Order arrived damaged", "Still waiting on a refund", "Charged twice for one order",
    "Product stopped working after 2 days", "Extremely slow support response",
]
SUBJECTS_QUESTION = [
    "Question about my subscription", "How do I change my shipping address?",
    "Do you support bulk orders?", "When will my order ship?",
]
SUBJECTS_URGENT = [
    "URGENT: account locked before demo", "Payment failed and site is down for us",
    "Security concern with my account",
]


@dataclass
class MockWorkspace:
    organization_id: str
    emails: list[dict[str, Any]] = field(default_factory=list)
    files: list[dict[str, Any]] = field(default_factory=list)
    customers: list[dict[str, Any]] = field(default_factory=list)
    tickets: list[dict[str, Any]] = field(default_factory=list)
    leads: list[dict[str, Any]] = field(default_factory=list)
    spreadsheets: dict[str, list[dict[str, Any]]] = field(default_factory=dict)
    tables: dict[str, list[dict[str, Any]]] = field(default_factory=dict)
    sent_notifications: list[dict[str, Any]] = field(default_factory=list)
    sent_emails: list[dict[str, Any]] = field(default_factory=list)
    reports: list[dict[str, Any]] = field(default_factory=list)
    idempotent_results: dict[str, dict[str, Any]] = field(default_factory=dict)


def _seed(org_id: str) -> MockWorkspace:
    rng = random.Random(org_id)
    ws = MockWorkspace(organization_id=org_id)

    for i in range(12):
        first, last = rng.choice(FIRST_NAMES), rng.choice(LAST_NAMES)
        pool, category = rng.choice(
            [(SUBJECTS_COMPLAINT, "complaint"), (SUBJECTS_QUESTION, "question"), (SUBJECTS_URGENT, "urgent")]
        )
        ws.emails.append(
            {
                "id": str(uuid.uuid4()),
                "from": f"{first.lower()}.{last.lower()}@{rng.choice(COMPANIES).lower().replace(' ', '')}.com",
                "subject": rng.choice(pool),
                "body": f"Hi team, this is regarding: {rng.choice(pool).lower()}. Please help. Thanks, {first}.",
                "category": category,
                "is_read": False,
                "received_at": f"2026-09-0{rng.randint(1, 6)}T0{rng.randint(1,9)}:00:00Z",
            }
        )

    for i in range(8):
        ws.customers.append(
            {
                "id": str(uuid.uuid4()),
                "name": f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}",
                "email": f"customer{i}@{rng.choice(COMPANIES).lower().replace(' ', '')}.com",
                "company": rng.choice(COMPANIES),
            }
        )

    for i in range(6):
        ws.files.append(
            {
                "id": str(uuid.uuid4()),
                "name": f"invoice-{1000 + i}.pdf" if i % 2 == 0 else f"document-{i}.pdf",
                "folder": "invoices/inbox" if i % 2 == 0 else "documents/inbox",
                "size_kb": rng.randint(20, 500),
            }
        )

    ws.spreadsheets["leads-inbox"] = [
        {
            "row": i + 1,
            "name": f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}",
            "email": f"lead{i}@{rng.choice(COMPANIES).lower().replace(' ', '')}.com",
            "company": rng.choice(COMPANIES),
        }
        for i in range(5)
    ]

    ws.tables["sales_orders"] = [
        {"id": str(uuid.uuid4()), "amount": round(rng.uniform(50, 2000), 2), "status": rng.choice(["paid", "paid", "refunded"])}
        for _ in range(15)
    ]
    ws.tables["invoices"] = []
    ws.tables["documents"] = []

    return ws


_workspaces: dict[str, MockWorkspace] = {}


def get_workspace(organization_id: str) -> MockWorkspace:
    if organization_id not in _workspaces:
        _workspaces[organization_id] = _seed(organization_id)
    return _workspaces[organization_id]


def with_idempotency(organization_id: str, idempotency_key: str, compute: Callable[[], dict[str, Any]]) -> dict[str, Any]:
    """Ensures a record-creating tool call has effect at most once per
    (execution, step) — spec section 25. A retry of the same step replays
    the cached result instead of creating a second ticket/lead/record."""
    ws = get_workspace(organization_id)
    if idempotency_key in ws.idempotent_results:
        return ws.idempotent_results[idempotency_key]
    result = compute()
    ws.idempotent_results[idempotency_key] = result
    return result
