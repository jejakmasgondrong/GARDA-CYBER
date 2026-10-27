from app.core.config import get_settings


def test_integration_registry_lists_all_tools(client):
    res = client.get("/api/v1/integrations")
    assert res.status_code == 200

    items = res.json()
    tool_ids = {item["tool_id"] for item in items}

    assert tool_ids == {
        "nmap",
        "nuclei",
        "amass",
        "owasp_zap",
        "wazuh",
        "suricata",
        "sigma",
        "osquery",
        "greenbone",
        "osint_domain",
        "github_exposure",
        "ip_reputation",
        "kartika_load",
        "kartika_sqli_probe",
        "kartika_wa_phish",
    }

    by_id = {item["tool_id"]: item for item in items}
    settings = get_settings()

    # Status mengikuti konfigurasi aplikasi yang sebenarnya.
    assert by_id["nmap"]["configured"] is bool(
        settings.NMAP_BINARY.strip()
    )

    for tool_id in [
        "owasp_zap",
        "wazuh",
        "suricata",
        "sigma",
        "osquery",
        "greenbone",
    ]:
        assert by_id[tool_id]["configured"] is False, (
            f"{tool_id} seharusnya belum configured"
        )

    assert isinstance(by_id["ip_reputation"]["configured"], bool)

    import shutil

    assert by_id["nuclei"]["configured"] is (
        shutil.which("nuclei") is not None
    )
    assert by_id["amass"]["configured"] is (
        shutil.which("amass") is not None
    )
    assert by_id["osint_domain"]["configured"] is True

    # Adapter Kartika stdlib-only: configured mengikuti flag-nya (default True).
    assert by_id["kartika_load"]["configured"] is bool(settings.KARTIKA_LOAD_ENABLED)
    assert by_id["kartika_sqli_probe"]["configured"] is bool(settings.KARTIKA_SQLI_PROBE_ENABLED)
    assert by_id["kartika_wa_phish"]["configured"] is bool(settings.KARTIKA_WA_PHISH_ENABLED)

    assert by_id["github_exposure"]["configured"] is bool(
        settings.GITHUB_TOKEN.strip()
        and settings.github_allowed_repos_list
    )


def test_osint_and_github_both_implemented(client):
    res = client.get("/api/v1/integrations")
    assert res.status_code == 200

    items = {item["tool_id"]: item for item in res.json()}

    assert items["osint_domain"]["implemented"] is True
    assert items["github_exposure"]["implemented"] is True
    assert items["nmap"]["implemented"] is True
    assert items["kartika_load"]["implemented"] is True
    assert items["kartika_sqli_probe"]["implemented"] is True
    assert items["kartika_wa_phish"]["implemented"] is True
