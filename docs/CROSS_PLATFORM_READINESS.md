# Cross-Platform Readiness Guide — GARDA CYBER 2.0

## Struktur `src/platform/`

```
src/platform/
├── index.ts         # Interface definitions (Platform, PlatformStorage, etc.)
├── web.ts           # Web browser implementation
└── usePlatform.ts   # React hook for platform access
```

### API Browser yang Dibungkus

| Browser API | Platform Method | File |
|---|---|---|
| `localStorage` | `platform.storage.getItem/setItem/removeItem` | `web.ts` |
| `navigator.clipboard` | `platform.clipboard.writeText` | `web.ts` |
| `Notification` | `platform.notification.show/requestPermission` | `web.ts` |
| `matchMedia (prefers-color-scheme)` | `platform.window.getColorScheme/onColorSchemeChange` | `web.ts` |
| `navigator.onLine` | `platform.window.isOnline/onOnlineStatusChange` | `web.ts` |
| `window.open` | `platform.window.openExternal` | `web.ts` |
| `URL.createObjectURL + anchor` | `platform.download.downloadBlob` | `web.ts` |

### Komponen yang menggunakan platform abstraction:
- `useTheme.ts` — dark/light/system theme via `platform.storage` dan `platform.window.getColorScheme`
- `useOnlineStatus.ts` — status koneksi via `platform.window.isOnline`
- `BlueTeam.tsx` — tidak lagi menggunakan `localStorage` langsung

---

## Rekomendasi Jalur Migrasi

### Desktop: Tauri (Recommended) atau Electron

**Tauri (Recommended)**
- Bundle size sangat kecil (~5-10MB vs Electron ~150MB)
- Menggunakan WebView native OS (WebView2 di Windows, WebKit di macOS/Linux)
- Langkah migrasi:
  1. Install Tauri CLI: `cargo install tauri-cli`
  2. Init project: `cargo tauri init` di root
  3. Buat implementasi `src/platform/tauri.ts` yang menggunakan `@tauri-apps/api`
  4. Ganti import di `usePlatform.ts` berdasarkan environment
  5. Build: `cargo tauri build`

**Electron (Alternative)**
- Lebih mature ecosystem, tapi bundle size besar
- Langkah migrasi sama, tapi implementasi platform menggunakan `electron` IPC

### Mobile: Capacitor (Recommended)

**Capacitor**
- Dari tim Ionic, wraps web app dalam native WebView
- Langkah migrasi:
  1. `npx @capacitor/cli init`
  2. `npx cap add android` / `npx cap add ios`
  3. Buat `src/platform/capacitor.ts` menggunakan Capacitor plugins
  4. `npx cap sync` → buka di Android Studio / Xcode
  5. Build native app

### Platform Switching Pattern
```typescript
// src/platform/usePlatform.ts
import { platform as webPlatform } from './web';
// import { platform as tauriPlatform } from './tauri';
// import { platform as capacitorPlatform } from './capacitor';

// Switch implementation based on environment
export const platform = webPlatform;
// export const platform = import.meta.env.VITE_PLATFORM === 'tauri' ? tauriPlatform : webPlatform;
```

---

## Design Tokens

Semua design tokens didefinisikan sebagai CSS custom properties di `src/index.css` dan dimapping ke Tailwind utilities di `tailwind.config.js`. Ini memungkinkan theming yang konsisten di semua platform.

```css
:root {
  --gc-bg: #0B1220;
  --gc-primary: #2685F6;
  /* ... dll */
}
```

Saat migrasi ke native app wrapper, CSS variables tetap berfungsi karena dirender dalam WebView.

---

## Risiko & Keterbatasan

1. **WebSocket**: Belum diimplementasi. Jika backend menambahkan WebSocket, perlu wrapper platform untuk native apps.
2. **File System Access**: Tidak ada akses filesystem langsung. Export PDF/CSV perlu native plugin.
3. **Push Notifications**: Web Notification API hanya bekerja di browser. Native push perlu platform-specific implementation.
4. **Deep Linking**: URL routing berbasis BrowserRouter. Untuk native apps, perlu konfigurasi deep linking scheme.
5. **Offline Storage**: Saat ini hanya localStorage. Untuk offline-first, perlu IndexedDB atau native SQLite.
6. **Biometric Auth**: Tidak ada di web. Perlu native plugin untuk fingerprint/face ID.

---

## Checklist Kesiapan

- [x] Design tokens terpusat (CSS variables + Tailwind config)
- [x] Platform abstraction layer (`src/platform/`)
- [x] Tidak ada hardcode URL di komponen
- [x] Touch-first design (44px min targets)
- [x] Safe area support (`env(safe-area-inset-*)`)
- [x] Layout adaptif 3 mode (mobile/tablet/desktop)
- [x] Offline/connection status handling
- [x] No browser-specific dependencies di core
- [x] Lazy loading per halaman (code splitting)
- [x] Pagination untuk dataset besar
- [ ] PWA manifest (optional, bisa ditambahkan)
- [ ] Service Worker untuk offline caching (future)
