
"""Klien GitHub REST API dengan timeout, validasi respons, dan error aman."""
from __future__ import annotations

import base64
import binascii
from dataclasses import dataclass

import httpx


class GithubApiError(RuntimeError):
    """Error umum saat berkomunikasi dengan GitHub API."""


class GithubRateLimitedError(GithubApiError):
    """GitHub API menolak request karena rate limit."""


@dataclass
class RepoFile:
    path: str
    size: int
    sha: str


class GithubApiClient:
    def __init__(self, token: str, timeout_seconds: float):
        if not token or not token.strip():
            raise ValueError("Token GitHub wajib diisi.")
        if timeout_seconds <= 0:
            raise ValueError("Timeout harus lebih besar dari nol.")

        self._timeout = timeout_seconds
        self._headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

    def get_default_branch(self, owner: str, repo: str) -> str:
        url = f"https://api.github.com/repos/{owner}/{repo}"
        resp = self._get(url)

        try:
            data = resp.json()
        except ValueError as exc:
            raise GithubApiError(
                "Respons informasi repositori bukan JSON yang valid."
            ) from exc

        if not isinstance(data, dict):
            raise GithubApiError("Format informasi repositori tidak valid.")

        branch = data.get("default_branch")
        if not isinstance(branch, str) or not branch.strip():
            raise GithubApiError("Branch default repositori tidak tersedia.")

        return branch

    def list_tree(self, owner: str, repo: str, branch: str) -> list[RepoFile]:
        """Ambil tree repositori; tolak hasil terpotong agar tidak menyesatkan."""
        url = (
            f"https://api.github.com/repos/{owner}/{repo}"
            f"/git/trees/{branch}"
        )
        resp = self._get(url, params={"recursive": "1"})

        try:
            data = resp.json()
        except ValueError as exc:
            raise GithubApiError(
                "Respons GitHub tree bukan JSON yang valid."
            ) from exc

        if not isinstance(data, dict):
            raise GithubApiError("Format respons GitHub tree tidak valid.")

        if data.get("truncated") is True:
            raise GithubApiError(
                "Daftar file GitHub terpotong; hasil scan tidak lengkap."
            )

        tree = data.get("tree")
        if not isinstance(tree, list):
            raise GithubApiError(
                "Respons GitHub tidak berisi daftar tree yang valid."
            )

        files: list[RepoFile] = []

        for item in tree:
            if not isinstance(item, dict):
                raise GithubApiError("Entri pada GitHub tree tidak valid.")

            if item.get("type") != "blob":
                continue

            path = item.get("path")
            sha = item.get("sha")
            size = item.get("size", 0)

            if (
                not isinstance(path, str)
                or not path
                or not isinstance(sha, str)
                or not sha
                or not isinstance(size, int)
                or isinstance(size, bool)
                or size < 0
            ):
                raise GithubApiError(
                    "Entri file pada GitHub tree memiliki format tidak valid."
                )

            files.append(RepoFile(path=path, size=size, sha=sha))

        return files

    def get_file_content(
        self, owner: str, repo: str, path: str, ref: str
    ) -> str:
        url = (
            f"https://api.github.com/repos/{owner}/{repo}"
            f"/contents/{path}"
        )
        resp = self._get(url, params={"ref": ref})

        try:
            data = resp.json()
        except ValueError as exc:
            raise GithubApiError(
                "Respons konten file bukan JSON yang valid."
            ) from exc

        if not isinstance(data, dict):
            raise GithubApiError("Format respons konten file tidak valid.")

        if data.get("encoding") != "base64":
            raise GithubApiError(
                "Encoding konten file GitHub tidak didukung."
            )

        encoded = data.get("content")
        if not isinstance(encoded, str):
            raise GithubApiError("Konten file GitHub tidak valid.")

        try:
            # API Contents dapat menyisipkan newline di string Base64.
            compact = "".join(encoded.split())
            decoded = base64.b64decode(compact, validate=True)
            return decoded.decode("utf-8", errors="replace")
        except (binascii.Error, ValueError) as exc:
            raise GithubApiError(
                "Konten file GitHub gagal didekode."
            ) from exc

    def _get(
        self, url: str, params: dict | None = None
    ) -> httpx.Response:
        try:
            resp = httpx.get(
                url,
                headers=self._headers,
                params=params,
                timeout=self._timeout,
            )
        except httpx.TimeoutException as exc:
            raise GithubApiError("Timeout saat menghubungi GitHub API.") from exc
        except httpx.HTTPError as exc:
            # Jangan menyertakan URL atau detail request ke pesan error.
            raise GithubApiError(
                f"Gagal menghubungi GitHub API ({type(exc).__name__})."
            ) from exc

        if (
            resp.status_code in (403, 429)
            and resp.headers.get("X-RateLimit-Remaining") == "0"
        ):
            raise GithubRateLimitedError("Rate limit GitHub API tercapai.")

        if resp.status_code == 429:
            raise GithubRateLimitedError(
                "GitHub API membatasi request; coba lagi nanti."
            )

        if resp.status_code == 403:
            raise GithubApiError(
                "Akses GitHub API ditolak; periksa izin token dan batas akses."
            )

        if resp.status_code == 404:
            raise GithubApiError(
                "Repositori atau file tidak ditemukan, atau token tidak memiliki akses."
            )

        if resp.status_code == 401:
            raise GithubApiError(
                "Token GitHub tidak valid atau sudah kedaluwarsa."
            )

        if resp.status_code >= 400:
            raise GithubApiError(
                f"GitHub API mengembalikan status HTTP {resp.status_code}."
            )

        return resp
