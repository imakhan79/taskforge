from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str = ""
    supabase_service_role_key: str = ""

    agent_service_secret: str = "change-me-to-a-long-random-secret"

    ai_provider: str = "gemini"
    ai_model: str = "gemini-2.5-flash"
    ai_api_key: str = ""

    worker_poll_interval_seconds: int = 15
    worker_max_concurrent_executions: int = 5

    host: str = "0.0.0.0"
    port: int = 8000


@lru_cache
def get_settings() -> Settings:
    return Settings()
