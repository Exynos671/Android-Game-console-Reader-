import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';

export interface SystemStatus {
  timeStr: string;
  batteryLevel: number | null; // 0..100
  isCharging: boolean;
}

function readClock(): string {
  try {
    return new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    const d = new Date();
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
}

/**
 * Live clock + real system battery. Uses the native Capacitor Device plugin
 * when packaged as an Android app (the Web Battery API is unavailable in
 * Android WebViews), with a graceful web fallback.
 */
export function useSystemStatus(): SystemStatus {
  const [timeStr, setTimeStr] = useState(readClock);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState(false);

  useEffect(() => {
    let alive = true;
    let batteryObj: any = null;
    const updateTime = () => {
      if (!alive) return;
      setTimeStr(readClock());
    };
    updateTime();
    const timeTimer = window.setInterval(updateTime, 30000);

    const applyBattery = (level100: number | null, charging: boolean) => {
      if (!alive) return;
      if (level100 !== null && level100 >= 0 && level100 <= 100) {
        setBatteryLevel(Math.round(level100));
        setIsCharging(Boolean(charging));
      }
    };

    const readBattery = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const info = await Device.getBatteryInfo();
          // batteryLevel: 0..1, or -1 when unknown
          const lvl = typeof info.batteryLevel === 'number' ? info.batteryLevel * 100 : -1;
          applyBattery(lvl >= 0 ? lvl : null, Boolean(info.isCharging));
        } catch {
          /* fall through to web API */
        }
        return;
      }
      try {
        if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
          batteryObj = await (navigator as any).getBattery();
          const update = () => {
            applyBattery(Math.round(batteryObj.level * 100), batteryObj.charging);
          };
          update();
          batteryObj.addEventListener?.('levelchange', update);
          batteryObj.addEventListener?.('chargingchange', update);
        }
      } catch {
        /* unsupported */
      }
    };

    readBattery();
    const batteryTimer = window.setInterval(readBattery, 60000);

    return () => {
      alive = false;
      window.clearInterval(timeTimer);
      window.clearInterval(batteryTimer);
      batteryObj?.removeEventListener?.('levelchange', () => {});
      batteryObj?.removeEventListener?.('chargingchange', () => {});
    };
  }, []);

  return { timeStr, batteryLevel, isCharging };
}
