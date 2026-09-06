"""Real (non-mock) outbound HTTP tool. This is the one tool family capable
of reaching a real network, so every request — including redirect targets —
goes through the SSRF guard before a byte is sent."""

import httpx

from app.models.enums import RiskLevel
from app.security.ssrf_guard import validate_url
from app.tools.base import FunctionTool, Tool, ToolContext

MAX_REDIRECTS = 3
TIMEOUT_SECONDS = 15


def perform_request(method: str, url: str, json_body: dict | None = None, headers: dict | None = None) -> int:
    current_url = validate_url(url)
    with httpx.Client(follow_redirects=False, timeout=TIMEOUT_SECONDS) as client:
        for _ in range(MAX_REDIRECTS + 1):
            response = client.request(method, current_url, json=json_body, headers=headers)
            if response.is_redirect:
                location = response.headers.get("location")
                if not location:
                    return response.status_code
                current_url = validate_url(httpx.URL(current_url).join(location).human_repr())
                continue
            return response.status_code
    raise RuntimeError("too many redirects")


def _make_handler(method: str):
    def handler(config: dict, ctx: ToolContext) -> dict:
        url = validate_url(config["url"])
        with httpx.Client(follow_redirects=False, timeout=TIMEOUT_SECONDS) as client:
            current_url = url
            for _ in range(MAX_REDIRECTS + 1):
                response = client.request(method, current_url, json=config.get("body"), headers=config.get("headers"))
                if response.is_redirect:
                    location = response.headers.get("location")
                    if not location:
                        break
                    current_url = validate_url(httpx.URL(current_url).join(location).human_repr())
                    continue
                return {"status": response.status_code, "body": response.text[:5000]}
        raise RuntimeError("too many redirects")

    return handler


def build_tools() -> list[Tool]:
    return [
        FunctionTool("http_get", "HTTP GET to an external URL.", RiskLevel.LOW, ["http:external"], _make_handler("GET"), ["url"]),
        FunctionTool("http_post", "HTTP POST to an external URL.", RiskLevel.HIGH, ["http:external"], _make_handler("POST"), ["url", "body"]),
        FunctionTool("http_put", "HTTP PUT to an external URL.", RiskLevel.HIGH, ["http:external"], _make_handler("PUT"), ["url", "body"]),
        FunctionTool("http_patch", "HTTP PATCH to an external URL.", RiskLevel.HIGH, ["http:external"], _make_handler("PATCH"), ["url", "body"]),
    ]
