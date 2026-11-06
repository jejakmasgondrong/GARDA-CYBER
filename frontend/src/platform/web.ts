import type { Platform, PlatformStorage, PlatformClipboard, PlatformNotification, PlatformWindow, PlatformDownload } from './index';

const webStorage: PlatformStorage = {
  getItem: (key) => {
    try { return window.localStorage.getItem(key); } catch { return null; }
  },
  setItem: (key, value) => {
    try { window.localStorage.setItem(key, value); } catch { /* quota exceeded */ }
  },
  removeItem: (key) => {
    try { window.localStorage.removeItem(key); } catch { /* ignore */ }
  },
};

const webClipboard: PlatformClipboard = {
  writeText: async (text) => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
  },
};

const webNotification: PlatformNotification = {
  show: (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  },
  requestPermission: async () => {
    if (!('Notification' in window)) return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  },
};

const webWindow: PlatformWindow = {
  getColorScheme: () => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },
  onColorSchemeChange: (callback) => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => callback(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  },
  isOnline: () => navigator.onLine,
  onOnlineStatusChange: (callback) => {
    const onlineHandler = () => callback(true);
    const offlineHandler = () => callback(false);
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);
    return () => {
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
    };
  },
  openExternal: (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  },
};

const webDownload: PlatformDownload = {
  downloadBlob: (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

export const platform: Platform = {
  storage: webStorage,
  clipboard: webClipboard,
  notification: webNotification,
  window: webWindow,
  download: webDownload,
};
