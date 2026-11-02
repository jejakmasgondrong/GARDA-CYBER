/**
 * Platform abstraction layer.
 * All browser-specific API access MUST go through this module.
 * When migrating to Tauri/Electron/Capacitor, only this folder needs changes.
 */

export interface PlatformStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PlatformClipboard {
  writeText(text: string): Promise<void>;
}

export interface PlatformNotification {
  show(title: string, body?: string): void;
  requestPermission(): Promise<boolean>;
}

export interface PlatformWindow {
  getColorScheme(): 'dark' | 'light';
  onColorSchemeChange(callback: (scheme: 'dark' | 'light') => void): () => void;
  isOnline(): boolean;
  onOnlineStatusChange(callback: (online: boolean) => void): () => void;
  openExternal(url: string): void;
}

export interface PlatformDownload {
  downloadBlob(blob: Blob, filename: string): void;
}

export interface Platform {
  storage: PlatformStorage;
  clipboard: PlatformClipboard;
  notification: PlatformNotification;
  window: PlatformWindow;
  download: PlatformDownload;
}
