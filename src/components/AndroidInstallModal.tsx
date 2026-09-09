import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  CheckCircle2,
  Copy,
  X,
  Sparkles,
  WifiOff,
  Gamepad2,
  Terminal,
  Github,
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
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [activeTab, setActiveTab] = useState<'pwa' | 'apk' | 'github'>('pwa');

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-neutral-900 border border-neutral-700 rounded-3xl shadow-2xl p-4 sm:p-6 text-neutral-100 flex flex-col space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Smartphone className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-100">安装至安卓手机 / 掌机</h2>
              <p className="text-xs text-neutral-400">
                适配 Ayn Odin、Retroid Pocket、周哥 RG 系列、安卓手机与折叠屏
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
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('pwa')}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'pwa'
                ? 'bg-neutral-800 text-amber-400 shadow-sm border border-amber-500/40'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="truncate">一键安装</span>
          </button>
          <button
            onClick={() => setActiveTab('github')}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'github'
                ? 'bg-neutral-800 text-amber-400 shadow-sm border border-amber-500/40'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            <span className="truncate">GitHub 自动打包</span>
          </button>
          <button
            onClick={() => setActiveTab('apk')}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'apk'
                ? 'bg-neutral-800 text-amber-400 shadow-sm border border-amber-500/40'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="truncate">本地编译 APK</span>
          </button>
        </div>

        {/* Tab 1: Direct WebAPK Install */}
        {activeTab === 'pwa' && (
          <div className="space-y-4">
            {isInstalled ? (
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-600/60 text-emerald-300 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 shrink-0" />
                <div className="text-xs">
                  <div className="font-bold">应用程序已成功安装！</div>
                  <div className="text-emerald-400/80">
                    当前正在以原生独立窗口运行，完整支持物理肩键/摇杆监听与纯离线缓存。
                  </div>
                </div>
              </div>
            ) : isInstallable ? (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-900 border border-amber-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300">安装准备就绪</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    支持免商店直装
                  </span>
                </div>
                <p className="text-xs text-neutral-300">
                  点击下方按钮，将掌机阅读器添加至安卓桌面或游戏前端启动器（如 Daijishō / Pegasus / 手机桌面）：
                </p>
                <button
                  onClick={async () => {
                    const success = await install();
                    if (success) onClose();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>立即安装掌机阅读器至设备桌面</span>
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <Smartphone className="w-4 h-4" />
                  <span>在安卓掌机或手机浏览器中安装</span>
                </div>
                <ol className="text-xs text-neutral-300 space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>在掌机或手机的 Chrome / Edge / 夸克浏览器中打开此网页；</li>
                  <li>点击浏览器右上角或底部的菜单 <strong>⋮ (三个点)</strong>；</li>
                  <li>选择 <strong>“安装应用”</strong> 或 <strong>“添加到主屏幕”</strong>；</li>
                  <li>安装完成后，即可从桌面独立启动，全屏无地址栏沉浸阅读。</li>
                </ol>
              </div>
            )}

            {/* Quick URL Sharing Box */}
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
              <div className="text-xs font-semibold text-neutral-400">
                将此链接复制至安卓掌机或手机中打开：
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
                  className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-xs font-semibold text-neutral-200 flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedUrl ? '已复制！' : '复制网址'}</span>
                </button>
              </div>
            </div>

            {/* Advantages Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <div className="font-bold text-neutral-200 flex items-center gap-1.5">
                  <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>实体按键原生响应</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  支持左右肩键 RB/LB、摇杆滚屏、触觉马达微振反馈。
                </p>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <div className="font-bold text-neutral-200 flex items-center gap-1.5">
                  <WifiOff className="w-3.5 h-3.5 text-emerald-400" />
                  <span>100% 离线阅读</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  内置 Service Worker 与 IndexedDB，断网与飞行模式下正常使用。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: GitHub Actions Automated Build */}
        {activeTab === 'github' && (
          <div className="space-y-3.5 text-xs">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-950 border border-amber-500/30 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <Github className="w-4 h-4" />
                <span>GitHub Actions 自动化一键编译 APK 说明</span>
              </div>
              <p className="text-neutral-300 leading-relaxed">
                本项目已配置好 <code>.github/workflows/build-android.yml</code> 工作流脚本。无需在本地电脑配置复杂的 Android SDK 与 Java 环境，只需将代码提交到 GitHub 仓库，即可自动在云端编译出可直接安装在掌机和手机上的 <strong>APK 安装包</strong>！
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
              <span className="font-bold text-neutral-200">操作步骤：</span>
              <ol className="text-neutral-300 space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>将本项目的代码推送（Push）到你的 GitHub 仓库；</li>
                <li>在 GitHub 仓库页面点击顶部 <strong>Actions</strong> 选项卡；</li>
                <li>选中 <strong>Build Android APK</strong> 工作流，点击 <strong>Run workflow</strong>（或每次 push 自动触发）；</li>
                <li>编译完成后，在 Actions 页面底部的 <strong>Artifacts (产物)</strong> 下载生成的 <code>app-debug.apk</code>，拷贝至掌机安装即可！</li>
              </ol>
            </div>
          </div>
        )}

        {/* Tab 3: Local Native APK Building Instructions */}
        {activeTab === 'apk' && (
          <div className="space-y-3 text-xs">
            <p className="text-neutral-300 leading-relaxed">
              如果你熟悉开发环境，也可以在本地电脑直接使用 <strong>Capacitor</strong> 编译生成安卓 APK 文件：
            </p>

            {/* Capacitor */}
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400">本地命令 (Capacitor 原生 Android 构建)</span>
                <span className="text-[10px] font-mono text-neutral-500">Android Studio / Gradle</span>
              </div>
              <div className="relative">
                <pre className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 font-mono text-[11px] text-neutral-300 overflow-x-auto">
{`npm install
npm run build
npx cap sync
npx cap open android`}
                </pre>
                <button
                  onClick={() =>
                    handleCopyCommand(`npm install && npm run build && npx cap sync && npx cap open android`)
                  }
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                  title="复制代码"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {copiedCommand && (
              <div className="text-emerald-400 text-center font-mono text-[11px]">
                ✓ 命令已复制到剪贴板！
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
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
