import React from 'react';
import { Smartphone, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  onOpenModal: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ onOpenModal }) => {
  const { isInstalled, isInstallable } = usePWAInstall();

  if (isInstalled) {
    return (
      <button
        onClick={onOpenModal}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-300 hover:border-neutral-600 text-xs font-semibold transition-colors"
        title="已安装至安卓系统"
      >
        <Check className="w-3.5 h-3.5 text-emerald-400" />
        <span className="hidden sm:inline">已安装</span>
      </button>
    );
  }

  return (
    <button
      onClick={onOpenModal}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
        isInstallable
          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30'
          : 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:border-neutral-600'
      }`}
      title="安装掌机阅读器至安卓手机/掌机桌面"
    >
      <Smartphone className="w-3.5 h-3.5 text-amber-400" />
      <span>安装应用</span>
      {isInstallable && (
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
      )}
    </button>
  );
};
