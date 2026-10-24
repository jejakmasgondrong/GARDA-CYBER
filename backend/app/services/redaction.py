"""
Utilitas redaksi nilai sensitif sebelum disimpan/di-log.
Dipakai sekarang untuk menyiapkan Workspace GitHub Exposure Monitor (Fase berikut),
dan untuk memastikan tidak ada tempat di kode yang mencatat nilai mentah secara utuh.
"""


def redact_secret(raw_value: str, keep_prefix: int = 4) -> str:
    """
    Mengubah 'ghp_AbCdEfGh12345678' -> 'ghp_A***(redacted, len=18)'.
    Dipakai sebelum nilai apa pun yang terdeteksi sebagai kredensial
    disimpan ke database atau dicatat ke log/audit.
    """
    if not raw_value:
        return ""
    prefix = raw_value[:keep_prefix]
    return f"{prefix}***(redacted, len={len(raw_value)})"
