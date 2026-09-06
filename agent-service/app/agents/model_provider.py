"""Builds the Strands model provider from settings. AI_PROVIDER switches
between Gemini (default) and Anthropic without any other code changing —
the planner and classifier only ever depend on the Strands `Model`
interface, never on a specific provider SDK."""

from strands.models import Model

from app.config import Settings


class ModelNotConfiguredError(Exception):
    pass


def build_model(settings: Settings) -> Model:
    if not settings.ai_api_key:
        raise ModelNotConfiguredError(
            "AI_API_KEY is not set. Configure it in agent-service/.env to enable planning."
        )

    if settings.ai_provider == "gemini":
        from strands.models.gemini import GeminiModel

        return GeminiModel(client_args={"api_key": settings.ai_api_key}, model_id=settings.ai_model)

    if settings.ai_provider == "anthropic":
        from strands.models.anthropic import AnthropicModel

        return AnthropicModel(client_args={"api_key": settings.ai_api_key}, model_id=settings.ai_model, max_tokens=4096)

    raise ModelNotConfiguredError(f"Unsupported AI_PROVIDER: {settings.ai_provider!r}")
