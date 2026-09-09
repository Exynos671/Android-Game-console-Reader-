import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  CheckCircle2,
  Copy,
  ExternalLink,
  HelpCircle,
  X,
  Sparkles,
  WifiOff,
  Gamepad2,
  Terminal,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface AndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isInstallable, isInstalled, isAndroid, install } = usePWAInstall();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [activeTab, setActiveTab] = useState<'pwa' | 'apk'>('pwa');

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleCopyUrl = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const handleCopyCommand = (cmd: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cmd);
      setCopiedCommand(true);
      setTimeout(() => setCopiedCommand(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-neutral-900 border border-neutral-700 rounded-3xl shadow-2xl p-5 sm:p-6 text-neutral-100 flex flex-col space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-100">Install on Android Device</h2>
              <p className="text-xs text-neutral-400">
                Optimized for Ayn Odin, Retroid Pocket, Anbernic, Logitech G Cloud & Phones
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Installation Mode Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-neutral-950 border border-neutral-800">
          <button
            onClick={() => setActiveTab('pwa')}
            className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'pwa'
                ? 'bg-neutral-800 text-amber-400 shadow-sm border border-amber-500/40'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Instant Install (WebAPK)</span>
          </button>
          <button
            onClick={() => setActiveTab('apk')}
            className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'apk'
                ? 'bg-neutral-800 text-amber-400 shadow-sm border border-amber-500/40'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Build APK Package</span>
          </button>
        </div>

        {/* Tab 1: Direct WebAPK Install */}
        {activeTab === 'pwa' && (
          <div className="space-y-4">
            {/* Status card */}
            {isInstalled ? (
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-600/60 text-emerald-300 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 shrink-0" />
                <div className="text-xs">
                  <div className="font-bold">App is already installed!</div>
                  <div className="text-emerald-400/80">
                    You are running in standalone mode with full physical gamepad access and offline caching.
                  </div>
                </div>
              </div>
            ) : isInstallable ? (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-900 border border-amber-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300">Ready to Install</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    1-Click Supported
                  </span>
                </div>
                <p className="text-xs text-neutral-300">
                  Click below to install Handheld Reader directly onto your Android device home screen launcher:
                </p>
                <button
                  onClick={async () => {
                    const success = await install();
                    if (success) onClose();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Install Handheld Reader Now</span>
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <Smartphone className="w-4 h-4" />
                  <span>How to Install on your Android Console</span>
                </div>
                <ol className="text-xs text-neutral-300 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>
                    Open <strong>Chrome</strong> or your device browser on your Android console.
                  </li>
                  <li>
                    Navigate to this app's URL (use the copy button below).
                  </li>
                  <li>
                    Tap the browser menu <strong>⋮ (three dots)</strong> in the top-right.
                  </li>
                  <li>
                    Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                  </li>
                </ol>
              </div>
            )}

            {/* Quick URL Sharing Box */}
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
              <div className="text-xs font-semibold text-neutral-400">
                Share URL to your Android Handheld:
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={currentUrl}
                  className="flex-1 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-xs font-mono text-neutral-200 select-all"
                />
                <button
                  onClick={handleCopyUrl}
                  className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-xs font-semibold text-neutral-200 flex items-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedUrl ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Advantages Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <div className="font-bold text-neutral-200 flex items-center gap-1.5">
                  <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Physical Gamepad</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Full access to RB/LB bumpers, analog thumbsticks, and rumble actuators.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <div className="font-bold text-neutral-200 flex items-center gap-1.5">
                  <WifiOff className="w-3.5 h-3.5 text-emerald-400" />
                  <span>100% Offline</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Service Worker caches your books and readers for flights and offline travel.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Native APK Building Instructions */}
        {activeTab === 'apk' && (
          <div className="space-y-4 text-xs">
            <p className="text-neutral-300 leading-relaxed">
              If you prefer a compiled standalone <strong>.APK</strong> file to sideload with ADB onto retro emulation handhelds, you can package this PWA using Google's official <strong>Bubblewrap</strong> or <strong>Capacitor</strong>:
            </p>

            {/* Method A: Bubblewrap */}
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400">Option 1: Google Bubblewrap (Fastest)</span>
                <span className="text-[10px] font-mono text-neutral-500">Official CLI</span>
              </div>
              <p className="text-neutral-400 text-[11px]">
                Converts the live manifest into a signed Android Studio APK in one step:
              </p>
              <div className="relative">
                <pre className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 font-mono text-[11px] text-neutral-300 overflow-x-auto">
{`npx @bubblewrap/cli init --manifest=${currentUrl}/manifest.webmanifest
npx @bubblewrap/cli build`}
                </pre>
                <button
                  onClick={() =>
                    handleCopyCommand(
                      `npx @bubblewrap/cli init --manifest=${currentUrl}/manifest.webmanifest && npx @bubblewrap/cli build`
                    )
                  }
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                  title="Copy command"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Method B: Capacitor Native Bridge */}
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400">Option 2: Capacitor (Full Native Android)</span>
                <span className="text-[10px] font-mono text-neutral-500">Android Studio</span>
              </div>
              <p className="text-neutral-400 text-[11px]">
                Build the web dist and open the generated Android Studio gradle project:
              </p>
              <div className="relative">
                <pre className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 font-mono text-[11px] text-neutral-300 overflow-x-auto">
{`npm run build
npx cap add android
npx cap run android`}
                </pre>
                <button
                  onClick={() =>
                    handleCopyCommand(`npm run build && npx cap add android && npx cap run android`)
                  }
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                  title="Copy command"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {copiedCommand && (
              <div className="text-emerald-400 text-center font-mono text-[11px]">
                ✓ Command copied to clipboard!
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 font-semibold text-xs text-neutral-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
