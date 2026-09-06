import logging

from fastapi import FastAPI

from app.api.routes import router as agent_router
from app.config import get_settings

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="TaskForge Agent Service", version="0.1.0")
app.include_router(agent_router)


@app.get("/")
def root() -> dict:
    return {"service": "taskforge-agent-service", "status": "ok"}


@app.on_event("startup")
def on_startup() -> None:
    settings = get_settings()
    logging.getLogger("taskforge.agent").info(
        "agent-service starting: provider=%s model=%s", settings.ai_provider, settings.ai_model
    )
