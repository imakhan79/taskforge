from functools import lru_cache

from supabase import Client, create_client

from app.config import get_settings


@lru_cache
def get_supabase() -> Client:
    """Service-role Supabase client. This process is the only caller
    allowed to write to executions, execution_events, memories, approvals,
    audit_logs, and integration_credentials — RLS denies the `authenticated`
    role on those tables entirely (see supabase/migrations/002_rls.sql)."""
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for the agent-service to run."
        )
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
