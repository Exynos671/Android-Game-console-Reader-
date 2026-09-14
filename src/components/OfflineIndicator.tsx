import React from 'react';
import { WifiOff } from 'lucide-react';
import { useI18n } from '../i18n';

export const OfflineIndicator: React.FC = () => {
  const { t } = useI18n();
  const [isOnline, setIsOnline] = React.useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      className="fixed left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500/90 backdrop-blur px-3 py-1.5 text-xs font-medium text-neutral-950 shadow-xl border border-amber-400/50"
      style={{
        bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
        left: 'calc(1rem + env(safe-area-inset-left, 0px))',
      }}
    >
      <WifiOff className="w-3.5 h-3.5" />
      <span>{t('offline.mode')}</span>
    </div>
  );
};
