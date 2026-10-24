"""Pola deteksi kredensial yang sering ter-expose di repo publik/privat.

Pola yang dipakai di sini adalah pola PUBLIK yang sudah umum didokumentasikan
oleh tool open-source sejenis (format token resmi vendor, bukan kredensial
siapa pun). Dipakai HANYA untuk mendeteksi & meredaksi, tidak pernah untuk
memvalidasi/menguji apakah kredensial tsb masih aktif.
"""
import re
from dataclasses import dataclass


@dataclass(frozen=True)
class SecretPattern:
    id: str
    label: str
    regex: re.Pattern
    risk_level: str  # "low" | "medium" | "high" | "critical"


SECRET_PATTERNS: list[SecretPattern] = [
    SecretPattern("aws_access_key_id", "AWS Access Key ID", re.compile(r"\bAKIA[0-9A-Z]{16}\b"), "critical"),
    SecretPattern("github_pat", "GitHub Personal Access Token", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{36,}\b"), "critical"),
    SecretPattern("slack_token", "Slack Token", re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}\b"), "high"),
    SecretPattern("private_key_header", "Private Key Block", re.compile(r"-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----"), "critical"),
    SecretPattern("generic_api_key_assignment", "Generic API Key Assignment",
                  re.compile(r"(?i)\b(api[_-]?key|secret[_-]?key|access[_-]?token)\b\s*[:=]\s*['\"][A-Za-z0-9_\-]{16,}['\"]"), "medium"),
    SecretPattern("google_api_key", "Google API Key", re.compile(r"\bAIza[0-9A-Za-z\-_]{35}\b"), "high"),
    SecretPattern("stripe_key", "Stripe API Key", re.compile(r"\b(sk|pk)_live_[0-9a-zA-Z]{24,}\b"), "critical"),
]


def scan_content_for_secrets(content: str) -> list[tuple[SecretPattern, str, int]]:
    """Mengembalikan list (pattern, matched_text, line_number) untuk setiap kecocokan.
    Dibatasi 1 kecocokan pertama per pola per file supaya hasil tidak banjir duplikat."""
    results: list[tuple[SecretPattern, str, int]] = []
    lines = content.splitlines()
    for pattern in SECRET_PATTERNS:
        for i, line in enumerate(lines, start=1):
            match = pattern.regex.search(line)
            if match:
                results.append((pattern, match.group(0), i))
                break  # satu kecocokan per pola per file cukup untuk Findings -- hindari spam
    return results
