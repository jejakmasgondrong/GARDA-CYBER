from app.services.redaction import redact_secret


def test_redact_secret_keeps_only_prefix():
    out = redact_secret("ghp_AbCdEfGh12345678")
    assert out.startswith("ghp_")
    assert "AbCdEfGh12345678" not in out
    assert "redacted" in out


def test_redact_empty_string():
    assert redact_secret("") == ""
