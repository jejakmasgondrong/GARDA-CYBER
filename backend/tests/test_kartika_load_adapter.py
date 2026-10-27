"""Test draft Kartika Load adapter (stdlib-only, tanpa internet).

Bisa jalan dua cara:
- ``pytest tests/test_kartika_load_adapter.py -q`` (di mesin yg punya deps backend)
- ``python tests/test_kartika_load_adapter.py`` (standalone, tanpa pytest/fastapi)
"""
import socket
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.integrations.adapters.kartika_load_adapter import (  # noqa: E402
    analyze,
    clamp_int,
    netloc,
    parse_hostport,
    percentile,
    resolve_guard,
    run_load,
    split_target,
)


def test_percentile_empty_is_none_not_zero():
    assert percentile([], 0.95) is None


def test_percentile_nearest_rank():
    assert percentile([10.0, 20.0, 30.0, 40.0], 0.50) == 20.0


def test_clamp_rejects_garbage():
    assert clamp_int("9999", 1, 60, 10) == 60
    assert clamp_int("abc", 1, 60, 10) == 10
    assert clamp_int(None, 1, 60, 10) == 10
    assert clamp_int(0, 1, 60, 10) == 1


def test_split_target_domain_port_and_ip():
    assert split_target("example.com") == ("example.com", None, "/")
    assert split_target("example.com:8080/x") == ("example.com", 8080, "/x")
    assert split_target("http://127.0.0.1:8890/uji") == ("127.0.0.1", 8890, "/uji")
    assert split_target("127.0.0.1") == ("127.0.0.1", None, "/")
    assert split_target("ftp://example.com/") is None
    assert split_target("exa mple.com") is None
    assert split_target("example.com:99999/") is None  # port di luar range
    assert split_target("example.com:http/") is None  # port bukan angka
    assert split_target("[::1]:8080/x") == ("::1", 8080, "/x")
    assert split_target("::1") is None  # IPv6 wajib bracket


def test_netloc_brackets_ipv6():
    assert netloc("example.com", 8080) == "example.com:8080"
    assert netloc("example.com", None) == "example.com"
    assert netloc("::1", 8080) == "[::1]:8080"


def test_parse_hostport_rejects_garbage():
    assert parse_hostport("") == (None, None)
    assert parse_hostport("a..b") == (None, None)
    assert parse_hostport("[::1") == (None, None)


def test_resolve_guard_blocks_metadata_ip(monkeypatch=None):
    real_getaddrinfo = socket.getaddrinfo
    try:
        socket.getaddrinfo = lambda *a, **k: [(2, 1, 6, "", ("169.254.169.254", 0))]
        ips, refusal = resolve_guard("internal.example")
        assert ips == [] and "terlarang" in refusal
    finally:
        socket.getaddrinfo = real_getaddrinfo


class _Echo(BaseHTTPRequestHandler):
    def do_GET(self):
        body = b"ok"
        self.send_response(200)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


def test_run_load_against_local_echo():
    server = HTTPServer(("127.0.0.1", 0), _Echo)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        res = run_load(f"http://127.0.0.1:{port}/", "sustained",
                       duration=3, threads=2, max_requests=40, rps=0)
    finally:
        server.shutdown()
    assert res["requests_sent"] == 40, res
    assert res["error_rate_pct"] == 0.0, res
    assert res["p50_ms"] is not None and res["p95_ms"] is not None
    assert res["status_codes"].get("200") == 40, res


def test_analyze_flags_missing_rate_limit():
    res = {"status_codes": {"200": 100}, "p50_ms": 5.0, "p95_ms": 8.0,
           "error_rate_pct": 0.0, "error_kinds": {}}
    findings, advice = analyze(res)
    assert any("RATE_LIMIT_MISSING" in f for f in findings)
    assert len(advice) >= 1


if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items())
             if k.startswith("test_") and callable(v)]
    failed = 0
    for fn in tests:
        try:
            fn()
            print(f"PASS {fn.__name__}")
        except Exception as exc:
            failed += 1
            print(f"FAIL {fn.__name__}: {exc.__class__.__name__}: {exc}")
    print(f"{len(tests) - failed}/{len(tests)} passed")
    raise SystemExit(1 if failed else 0)
