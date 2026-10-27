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
    fetch_probe,
    find_db_signatures,
    verdict,
)
from app.integrations.adapters.kartika_wa_phish_adapter import (  # noqa: E402
    analyze_message,
    band,
)


def test_find_db_signatures_mysql_and_clean():
    assert "you have an error in your sql syntax" in find_db_signatures(
        "You have an error in your SQL syntax near ''1'''")
    assert find_db_signatures("<html>halo dunia</html>") == []


def test_verdict_strong_only_when_new_signature():
    base = (200, "<html>halo</html>")
    bad = (500, "you have an error in your sql syntax near ''")
    label, findings, advice = verdict(base, bad, bad)
    assert label == "SINYAL_KUAT", findings
    assert advice


def test_verdict_not_fooled_by_baseline_signature():
    # Signature yang SUDAH ada di baseline bukan temuan (hindari false positive).
    base = (200, "debug: pg_query failed (halaman debug internal)")
    same = (200, "debug: pg_query failed (halaman debug internal)")
    label, _, _ = verdict(base, same, same)
    assert label == "TANPA_SINYAL", label


def test_verdict_unclear_on_status_delta():
    base = (200, "<html>" + "x" * 200 + "</html>")
    changed = (500, "<html>oops</html>")
    label, _, _ = verdict(base, changed, changed)
    assert label == "PERLU_TINJAU", label


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
        base = fetch_probe(f"http://127.0.0.1:{port}/uji?id=KartikaBaseline1")
        quote = fetch_probe(f"http://127.0.0.1:{port}/uji?id=KartikaBaseline1%27")
    finally:
        server.shutdown()
    assert base[0] == 200 and quote[0] == 200
    label, _, _ = verdict(base, quote, quote)
    assert label == "TANPA_SINYAL", label


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
