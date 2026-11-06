/**
 * API client terpusat. Semua pemanggilan backend harus lewat sini,
 * bukan fetch tersebar di tiap komponen.
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

/**
 * API key opsional. Backend hanya mewajibkannya kalau API_KEY diisi di .env;
 * kalau kosong, header tidak dikirim dan tidak ada perubahan perilaku.
 * Disimpan di localStorage karena platform ini belum punya sistem login.
 */
const API_KEY_STORAGE = "gc.apiKey";

export function getApiKey(): string {
  try {
    return localStorage.getItem(API_KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function setApiKey(value: string): void {
  try {
    const trimmed = value.trim();
    if (trimmed) localStorage.setItem(API_KEY_STORAGE, trimmed);
    else localStorage.removeItem(API_KEY_STORAGE);
  } catch {
    /* localStorage bisa diblokir; abaikan */
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = getApiKey();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "X-API-Key": apiKey } : {}),
    },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const pesan = res.status === 401
      ? "API key tidak dikirim atau salah. Isi di halaman Settings."
      : body || res.statusText;
    throw new ApiError(res.status, pesan);
  }
  return res.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(data) }),
};
