"""Test draft SQLi probe + WA phish (offline, tanpa internet).

Dua cara jalan (pola sama seperti test_kartika_load_adapter.py):
- ``pytest tests/test_kartika_probe_wa.py -q`` (di mesin yg punya deps backend)
- ``python tests/test_kartika_probe_wa.py`` (standalone)
"""
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.integrations.adapters.kartika_sqli_probe_adapter import (  # noqa: E402
    PROOF_MARKER,
    SEVERITY_OF,
    aggregate,
    assess,
    build_union_value,
    check_proof,
    dbms_of,
    fetch_probe,
    find_db_signatures,
    try_proof,
    waf_hit,
)
from app.integrations.adapters.kartika_wa_phish_adapter import (  # noqa: E402
    analyze_message,
    band,
)


def _probes(base=(200, "<html>halo</html>"), quote=None, bt=None, bf=None):
    quote = quote or (200, "<html>halo</html>")
    return {"baseline": base, "quote1": quote, "quote2": quote,
            "bool_true": bt or base, "bool_false": bf or base}


def test_find_db_signatures_mysql_and_clean():
    assert "you have an error in your sql syntax" in find_db_signatures(
        "You have an error in your SQL syntax near ''1'''")
    assert find_db_signatures("<html>halo dunia</html>") == []


def test_dbms_of_maps_signatures():
    assert dbms_of(["you have an error in your sql syntax"]) == ["MySQL/MariaDB"]
    assert dbms_of(["ora-"]) == ["Oracle"]  # signature persis, bukan kode penuh
    assert dbms_of([]) == []


def test_assess_strong_with_score_and_dbms():
    bad = (500, "you have an error in your sql syntax near ''")
    label, score, signals, findings, advice = assess(_probes(quote=bad))
    assert label == "SINYAL_KUAT" and score >= 50, (label, score)
    assert any("ERROR_SIG" in s for s in signals)
    assert SEVERITY_OF[label] == "HIGH"
    assert advice


def test_assess_not_fooled_by_baseline_signature():
    # Signature yang SUDAH ada di baseline bukan temuan (hindari false positive).
    base = (200, "debug: pg_query failed (halaman debug internal)")
    label, score, _, _, _ = assess(_probes(base=base, quote=base))
    assert (label, score) == ("TANPA_SINYAL", 0), (label, score)


def test_assess_boolean_differential_scores():
    probes = _probes(bt=(200, "<html>" + "data" * 50 + "</html>"),
                     bf=(200, "<html>kosong</html>"))
    label, score, signals, _, _ = assess(probes)
    assert label == "PERLU_TINJAU" and score == 30, (label, score, signals)
    assert any("BOOL_DIFF" in s for s in signals)


def test_assess_status_delta_only_is_review():
    probes = _probes(quote=(500, "<html>" + "x" * 200 + "</html>"),
                     bt=(200, "<html>" + "x" * 200 + "</html>"),
                     bf=(200, "<html>" + "x" * 200 + "</html>"))
    base = (200, "<html>" + "x" * 200 + "</html>")
    probes["baseline"] = base
    label, score, _, _, _ = assess(probes)
    assert label == "PERLU_TINJAU", (label, score)


def test_waf_hit_only_on_block_status():
    assert waf_hit(403, "blocked by ModSecurity")
    assert not waf_hit(200, "blocked by ModSecurity")


def test_aggregate_picks_worst_param():
    assert aggregate([("a", "TANPA_SINYAL"), ("b", "SINYAL_KUAT")]) == ("b", "SINYAL_KUAT")
    assert aggregate([("a", "GAGAL_JALAN"), ("b", "TANPA_SINYAL")]) == ("b", "TANPA_SINYAL")
    assert aggregate([("a", "SINYAL_KUAT"), ("b", "TERBUKTI")]) == ("b", "TERBUKTI")


def test_build_union_value_hardcoded_marker_only():
    val = build_union_value(2)
    assert PROOF_MARKER in val and "UNION SELECT" in val
    assert "users" not in val.lower() and "information_schema" not in val.lower()
    # Tidak ada input user di template SQL -- hanya marker + hitungan kolom.
    assert val == f"KartikaBaseline1' UNION SELECT '{PROOF_MARKER}1','{PROOF_MARKER}2'-- "


def test_check_proof_needs_new_marker():
    assert check_proof("<html>data</html>", f"<html>{PROOF_MARKER}1</html>")
    assert not check_proof(f"<html>{PROOF_MARKER}1</html>", f"<html>{PROOF_MARKER}1</html>")
    assert not check_proof("<html>data</html>", "<html>data</html>")


class _VulnUnion(BaseHTTPRequestHandler):
    """Stub vuln yang mengevaluasi UNION marker (tanpa DB beneran)."""
    def do_GET(self):
        from urllib.parse import urlparse, parse_qs, unquote
        val = parse_qs(urlparse(self.path).query).get("id", [""])[0]
        if "UNION" in val and PROOF_MARKER in val:
            body = f"<html>row {PROOF_MARKER}1</html>".encode()
            self.send_response(200)
        elif "'" in val or '"' in val:
            body = b"you have an error in your sql syntax"
            self.send_response(500)
        else:
            body = b"<html>data user</html>"
            self.send_response(200)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


def test_try_proof_against_union_stub():
    server = HTTPServer(("127.0.0.1", 0), _VulnUnion)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        def build(value):
            from urllib.parse import urlencode
            return f"http://127.0.0.1:{port}/u?{urlencode({'id': value})}"
        proven, columns = try_proof(build, "<html>data user</html>")
    finally:
        server.shutdown()
    assert (proven, columns) == (True, 1)


def test_try_proof_fails_cleanly_on_echo():
    server = HTTPServer(("127.0.0.1", 0), _Echo)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        def build(value):
            from urllib.parse import urlencode
            return f"http://127.0.0.1:{port}/u?{urlencode({'id': value})}"
        proven, columns = try_proof(build, "<html>echo</html>")
    finally:
        server.shutdown()
    assert (proven, columns) == (False, None)


class _Echo(BaseHTTPRequestHandler):
    def do_GET(self):
        body = b"<html>echo</html>"
        self.send_response(200)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


def test_fetch_probe_no_signal_on_echo():
    server = HTTPServer(("127.0.0.1", 0), _Echo)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        probes = {name: fetch_probe(f"http://127.0.0.1:{port}/uji?id=v")
                  for name in ("baseline", "quote1", "quote2", "bool_true", "bool_false")}
    finally:
        server.shutdown()
    label, score, signals, _, _ = assess(probes)
    assert (label, score, signals) == ("TANPA_SINYAL", 0, []), (label, score, signals)


def test_wa_phish_spam_scores_high():
    spam = ("SELAMAT! Anda MENANG undian berhadiah. Klaim hadiah SEKARANG "
            "sebelum diblokir di http://bit.ly/klaim123, kirim kode OTP Anda, "
            "jangan beritahu kode ke siapa pun. Transfer biaya admin ke rekening.")
    score, hits = analyze_message(spam)
    assert band(score) == "TINGGI", (score, hits)
    assert any(h.startswith("OTP_SECRET") for h in hits)
    assert any(h.startswith("SHORT_URL") for h in hits)


def test_wa_phish_benign_scores_low():
    score, hits = analyze_message("Halo, besok rapat jam 9 di kantor ya. Bawa laporan.")
    assert band(score) == "RENDAH", (score, hits)


def test_wa_phish_one_hit_per_rule():
    text = "bit.ly/a bit.ly/b bit.ly/c"
    score, hits = analyze_message(text)
    assert sum(1 for h in hits if h.startswith("SHORT_URL")) == 1
    # Tanpa scheme http(s)://, GENERIC_LINK tidak kena -- skor murni 3.
    assert score == 3, (score, hits)


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
