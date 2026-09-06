import pytest

from app.security.ssrf_guard import SSRFError, validate_url


def test_blocks_loopback():
    with pytest.raises(SSRFError):
        validate_url("http://127.0.0.1/admin")


def test_blocks_cloud_metadata_ip():
    with pytest.raises(SSRFError):
        validate_url("http://169.254.169.254/latest/meta-data/")


def test_blocks_private_ip():
    with pytest.raises(SSRFError):
        validate_url("http://10.0.0.5/internal")


def test_blocks_disallowed_scheme():
    with pytest.raises(SSRFError):
        validate_url("file:///etc/passwd")


def test_blocks_ssh_port():
    with pytest.raises(SSRFError):
        validate_url("http://8.8.8.8:22/")


def test_allows_public_ip_literal():
    # 8.8.8.8 is a public, non-reserved address (Google DNS) — validated as
    # an IP literal so this test needs no real DNS lookup.
    assert validate_url("http://8.8.8.8/") == "http://8.8.8.8/"
