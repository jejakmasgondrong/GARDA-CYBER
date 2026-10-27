"""
Konfigurasi aplikasi. Semua nilai dibaca dari environment variable (.env),
tidak ada secret yang di-hardcode di sini.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- Aplikasi ---
    APP_ENV: str = "development"
    APP_HOST: str = "127.0.0.1"
    APP_PORT: int = 8000
    APP_NAME: str = "GARDA CYBER"

    # --- Database ---
    DATABASE_URL: str = "sqlite:///./garda_cyber.db"

    # --- Frontend / CORS ---
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # --- Secret (wajib diisi sebelum production, kosong secara default) ---
    SECRET_KEY: str = ""

    # --- Deployment (diisi pengguna sendiri saat Fase VPS, tidak dipakai di lokal) ---
    DOMAIN_NAME: str = ""

    # --- AbuseIPDB ---
    ABUSEIPDB_API_KEY: str = ""

    # --- Integrasi Tahap 2 (status "not_configured" sampai diisi) ---
    NMAP_BINARY: str = ""
    OWASP_ZAP_URL: str = ""
    OWASP_ZAP_API_KEY: str = ""
    WAZUH_API_URL: str = ""
    WAZUH_API_USER: str = ""
    WAZUH_API_PASSWORD: str = ""

    # --- OSINT Domain Intelligence ---
    OSINT_DNS_TIMEOUT_SECONDS: float = 4.0
    OSINT_TLS_TIMEOUT_SECONDS: float = 4.0
    OSINT_MAX_TXT_RECORDS: int = 20

    # --- GitHub Exposure Monitor ---
    GITHUB_TOKEN: str = ""
    # Daftar "owner/repo" dipisah koma -- hanya repo di daftar ini yang boleh di-scan,
    # meski token punya akses ke lebih banyak repo (defense-in-depth, bukan cuma andalkan scope token).
    GITHUB_EXPOSURE_ALLOWED_REPOS: str = ""
    GITHUB_MAX_FILES_PER_SCAN: int = 200
    GITHUB_MAX_FILE_BYTES: int = 200_000
    GITHUB_API_TIMEOUT_SECONDS: float = 10.0

    # --- Kartika Load & Resilience (DRAFT) ---
    KARTIKA_LOAD_ENABLED: bool = True
    KARTIKA_LOAD_MAX_DURATION: int = 60
    KARTIKA_LOAD_MAX_THREADS: int = 16
    KARTIKA_LOAD_MAX_REQUESTS: int = 1000
    KARTIKA_LOAD_MAX_RPS: int = 500

    @property
    def github_allowed_repos_list(self) -> list[str]:
        return [r.strip() for r in self.GITHUB_EXPOSURE_ALLOWED_REPOS.split(",") if r.strip()]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    """Settings di-cache supaya file .env hanya dibaca sekali per proses."""
    return Settings()
