"""Semua test di sini mock httpx -- tidak butuh internet atau token GitHub asli."""
import os
from unittest.mock import MagicMock, patch

import pytest

from app.services.github_exposure_service import InvalidRepoFormatError, validate_repo_format


def test_validate_repo_format_accepts_owner_slash_name():
    assert validate_repo_format("octocat/hello-world") == "octocat/hello-world"


def test_validate_repo_format_rejects_url():
    with pytest.raises(InvalidRepoFormatError):
        validate_repo_format("https://github.com/octocat/hello-world")


def test_validate_repo_format_rejects_missing_owner():
    with pytest.raises(InvalidRepoFormatError):
        validate_repo_format("hello-world")


def test_status_not_configured_without_token(client, monkeypatch):
    monkeypatch.setenv("GITHUB_TOKEN", "")
    monkeypatch.setenv("GITHUB_EXPOSURE_ALLOWED_REPOS", "")
    from app.core.config import get_settings
    get_settings.cache_clear()
    r = client.get("/api/v1/github-exposure/status")
    assert r.status_code == 200
    assert r.json()["status"] == "not_configured"
    get_settings.cache_clear()


def test_scan_without_token_returns_not_configured_status(client, monkeypatch):
    monkeypatch.setenv("GITHUB_TOKEN", "")
    from app.core.config import get_settings
    get_settings.cache_clear()
    r = client.post("/api/v1/github-exposure/scan", json={"repo": "octocat/hello-world"})
    assert r.status_code == 201
    assert r.json()["status"] == "not_configured"
    get_settings.cache_clear()


def test_scan_rejects_repo_outside_allowlist(client, monkeypatch):
    monkeypatch.setenv("GITHUB_TOKEN", "fake-token-for-test")
    monkeypatch.setenv("GITHUB_EXPOSURE_ALLOWED_REPOS", "octocat/allowed-repo")
    from app.core.config import get_settings
    get_settings.cache_clear()
    r = client.post("/api/v1/github-exposure/scan", json={"repo": "octocat/NOT-allowed"})
    assert r.status_code == 201
    assert r.json()["status"] == "rejected_scope"
    get_settings.cache_clear()


def test_scan_invalid_repo_format_returns_error_status(client, monkeypatch):
    monkeypatch.setenv("GITHUB_TOKEN", "fake-token-for-test")
    monkeypatch.setenv("GITHUB_EXPOSURE_ALLOWED_REPOS", "octocat/allowed-repo")
    from app.core.config import get_settings
    get_settings.cache_clear()
    r = client.post("/api/v1/github-exposure/scan", json={"repo": "not a valid repo"})
    assert r.status_code == 201
    assert r.json()["status"] == "error"
    get_settings.cache_clear()


def test_scan_creates_redacted_finding_for_allowed_repo(client, monkeypatch):
    monkeypatch.setenv("GITHUB_TOKEN", "fake-token-for-test")
    monkeypatch.setenv("GITHUB_EXPOSURE_ALLOWED_REPOS", "octocat/allowed-repo")
    from app.core.config import get_settings
    get_settings.cache_clear()

    from app.services.github_api_client import RepoFile
    with patch("app.services.github_exposure_service.GithubApiClient") as MockClient:
        instance = MockClient.return_value
        instance.get_default_branch.return_value = "main"
        instance.list_tree.return_value = [RepoFile(path="config.py", size=50, sha="abc")]
        instance.get_file_content.return_value = 'aws_key = "AKIAABCDEFGHIJKLMNOP"'

        r = client.post("/api/v1/github-exposure/scan", json={"repo": "octocat/allowed-repo"})

    assert r.status_code == 201
    body = r.json()
    assert body["status"] == "completed"
    assert body["findings_created"] == 1

    findings = client.get("/api/v1/findings", params={"category": "secret_exposure"}).json()
    assert findings["total"] >= 1
    finding_desc = findings["items"][0]["description"]
    assert "AKIAABCDEFGHIJKLMNOP" not in finding_desc  # nilai mentah TIDAK boleh tersimpan
    assert "redacted" in finding_desc
    get_settings.cache_clear()


def test_scan_history_pagination(client, monkeypatch):
    monkeypatch.setenv("GITHUB_TOKEN", "")
    from app.core.config import get_settings
    get_settings.cache_clear()
    client.post("/api/v1/github-exposure/scan", json={"repo": "octocat/hello-world"})
    r = client.get("/api/v1/github-exposure/scans", params={"limit": 5})
    assert r.status_code == 200
    assert r.json()["total"] >= 1
    get_settings.cache_clear()


def test_audit_log_never_contains_github_token(client, monkeypatch):
    monkeypatch.setenv("GITHUB_TOKEN", "super-secret-token-value-xyz")
    monkeypatch.setenv("GITHUB_EXPOSURE_ALLOWED_REPOS", "octocat/allowed-repo")
    from app.core.config import get_settings
    get_settings.cache_clear()

    from app.services.github_api_client import RepoFile
    with patch("app.services.github_exposure_service.GithubApiClient") as MockClient:
        instance = MockClient.return_value
        instance.get_default_branch.return_value = "main"
        instance.list_tree.return_value = []
        client.post("/api/v1/github-exposure/scan", json={"repo": "octocat/allowed-repo"})

    logs = client.get("/api/v1/audit-logs").json()
    for log in logs:
        assert "super-secret-token-value-xyz" not in str(log)
    get_settings.cache_clear()


def test_github_exposure_registered_as_implemented(client):
    r = client.get("/api/v1/integrations")
    items = {i["tool_id"]: i for i in r.json()}
    assert items["github_exposure"]["implemented"] is True
