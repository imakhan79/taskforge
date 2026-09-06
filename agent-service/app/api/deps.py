from fastapi import Header, HTTPException

from app.config import get_settings


def require_shared_secret(x_agent_service_secret: str = Header(default="")) -> None:
    """Every request from Next.js carries this header (spec section 32:
    "Secure communication between Next.js and Python"). Anything without
    the correct value is rejected before touching the database."""
    settings = get_settings()
    if not settings.agent_service_secret or x_agent_service_secret != settings.agent_service_secret:
        raise HTTPException(status_code=401, detail="Invalid or missing agent-service credentials.")
