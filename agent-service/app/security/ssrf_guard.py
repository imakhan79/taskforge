"""Blocks the HTTP tool from reaching internal infrastructure. Every
hostname is resolved and every resolved address is checked — validating the
literal string in the URL is not enough, since DNS can point a public-looking
hostname at a private IP (DNS rebinding)."""

import ipaddress
import socket
from urllib.parse import urlparse

BLOCKED_HOSTNAMES = {"metadata.google.internal", "metadata.internal"}
METADATA_IPS = {"169.254.169.254", "fd00:ec2::254"}


class SSRFError(Exception):
    pass


def _check_ip(ip_str: str, hostname: str) -> None:
    ip = ipaddress.ip_address(ip_str)
    if ip_str in METADATA_IPS:
        raise SSRFError(f"blocked cloud metadata address {ip_str} (resolved from {hostname})")
    if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast or ip.is_unspecified:
        raise SSRFError(f"blocked non-public address {ip_str} (resolved from {hostname})")


def validate_url(url: str) -> str:
    """Raises SSRFError if the URL is not safe to fetch. Returns the
    validated URL unchanged (for call-site chaining)."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise SSRFError(f"disallowed URL scheme: {parsed.scheme!r}")
    if not parsed.hostname:
        raise SSRFError("URL has no hostname")

    hostname = parsed.hostname.lower()
    if hostname in BLOCKED_HOSTNAMES:
        raise SSRFError(f"blocked hostname: {hostname}")
    if parsed.port in (22, 3389):
        raise SSRFError(f"blocked port: {parsed.port}")

    try:
        infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror as exc:
        raise SSRFError(f"could not resolve host: {hostname}") from exc

    for info in infos:
        _check_ip(info[4][0], hostname)

    return url
