import React from 'react';
import { Smartphone, Download, Check } from 'lucide-react';
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
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-300 hover:border-neutral-600 text-xs font-semibold transition-colors"
        title="App is installed on Android"
      >
        <Check className="w-3.5 h-3.5 text-emerald-400" />
        <span className="hidden sm:inline">Installed</span>
      </button>
    );
  }

  return (
    <button
      onClick={onOpenModal}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
        isInstallable
          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30'
          : 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:border-neutral-600'
      }`}
      title="Install Handheld Reader onto Android Device"
    >
      <Smartphone className="w-3.5 h-3.5 text-amber-400" />
      <span>Install App</span>
      {isInstallable && (
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
      )}
    </button>
  );
};
