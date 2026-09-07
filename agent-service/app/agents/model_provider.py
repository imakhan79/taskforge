"""Builds the Strands model provider from settings. AI_PROVIDER switches
between Gemini (default), Anthropic, and NVIDIA NIM without any other code
changing — the planner and classifier only ever depend on the Strands
`Model` interface, never on a specific provider SDK."""

from strands.models import Model

from app.config import Settings

# NVIDIA NIM (build.nvidia.com) exposes an OpenAI-compatible chat completions
# API, including free-tier trial credits, so it's reached through Strands'
# generic OpenAIModel rather than a dedicated provider class.
NVIDIA_NIM_BASE_URL = "https://integrate.api.nvidia.com/v1"


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

    if settings.ai_provider == "nvidia":
        from strands.models.openai import OpenAIModel

        return OpenAIModel(
            client_args={"api_key": settings.ai_api_key, "base_url": NVIDIA_NIM_BASE_URL},
            model_id=settings.ai_model,
        )

    raise ModelNotConfiguredError(f"Unsupported AI_PROVIDER: {settings.ai_provider!r}")
