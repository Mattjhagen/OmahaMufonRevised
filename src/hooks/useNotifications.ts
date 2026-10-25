import { useState, useEffect, useCallback } from 'react';

export interface InAppAlert {
  id: string;
  title: string;
  body: string;
  type: 'chat' | 'sighting' | 'system';
  timestamp: string;
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const [inAppAlerts, setInAppAlerts] = useState<InAppAlert[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('omaha_mufon_sound_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('omaha_mufon_sound_enabled', String(soundEnabled));
  }, [soundEnabled]);

  // Play subtle tactical audio chime using Web Audio API
  const playTacticalChime = useCallback((type: 'chat' | 'sighting' | 'system') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'sighting') {
        // High alert two-tone beep (880Hz -> 1174Hz)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'chat') {
        // Soft radio blip (587Hz -> 659Hz)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else {
        // Subtle acknowledgment blip
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch {
      // AudioContext unavailable or blocked by browser policy
    }
  }, [soundEnabled]);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    try {
      const res = await Notification.requestPermission();
      setPermission(res);
      return res;
    } catch (e) {
      console.warn('Failed to request notification permission:', e);
      return 'denied';
    }
  }, []);

  const sendNotification = useCallback(
    async (
      title: string,
      body: string,
      type: 'chat' | 'sighting' | 'system' = 'system',
      url: string = '/'
    ) => {
      // 1. Play tactical audio feedback
      playTacticalChime(type);

      // 2. Add to in-app toast alerts
      const alertId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newAlert: InAppAlert = {
        id: alertId,
        title,
        body,
        type,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setInAppAlerts((prev) => [newAlert, ...prev.slice(0, 4)]);

      // Auto dismiss after 6 seconds
      setTimeout(() => {
        setInAppAlerts((prev) => prev.filter((a) => a.id !== alertId));
      }, 6000);

      // 3. Dispatch native browser/mobile OS notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            const reg = await navigator.serviceWorker.ready;
            reg.showNotification(title, {
              body,
              icon: '/icons/icon-192.png',
              badge: '/icons/icon-192.png',
              tag: `omaha-mufon-${type}-${Date.now()}`,
              data: { url },
            });
          } else {
            new Notification(title, {
              body,
              icon: '/icons/icon-192.png',
              tag: `omaha-mufon-${type}`,
            });
          }
        } catch (err) {
          console.warn('Native notification failed:', err);
        }
      }
    },
    [playTacticalChime]
  );

  const dismissAlert = useCallback((id: string) => {
    setInAppAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return {
    permission,
    isSupported: typeof window !== 'undefined' && 'Notification' in window,
    requestPermission,
    sendNotification,
    inAppAlerts,
    dismissAlert,
    soundEnabled,
    setSoundEnabled,
  };
}
