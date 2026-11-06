import { useState, useEffect } from 'react';
import { platform } from '../platform/usePlatform';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(platform.window.isOnline());

  useEffect(() => {
    return platform.window.onOnlineStatusChange(setIsOnline);
  }, []);

  return isOnline;
}
