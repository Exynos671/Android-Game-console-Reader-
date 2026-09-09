import React from 'react';
import { AspectRatio } from '../types';
import { Monitor, Smartphone, Square, Tv, TabletSmartphone } from 'lucide-react';

interface HandheldAspectSwitcherProps {
  currentRatio: AspectRatio;
  onChangeRatio: (ratio: AspectRatio) => void;
  showBezel: boolean;
  onToggleBezel: (show: boolean) => void;
}

export const HandheldAspectSwitcher: React.FC<HandheldAspectSwitcherProps> = ({
  currentRatio,
  onChangeRatio,
  showBezel,
  onToggleBezel,
}) => {
  const ratios: { id: AspectRatio; label: string; sub: string; icon: React.ReactNode }[] = [
    {
      id: 'native',
      label: '全屏自适应',
      sub: '当前设备全屏铺满',
      icon: <Smartphone className="w-3.5 h-3.5" />,
    },
    {
      id: '9:16',
      label: '9 : 16',
      sub: '竖屏手机标准比例',
      icon: <TabletSmartphone className="w-3.5 h-3.5" />,
    },
    {
      id: '9:20',
      label: '9 : 20',
      sub: '全面屏长款手机',
      icon: <TabletSmartphone className="w-3.5 h-3.5" />,
    },
    {
      id: '16:9',
      label: '16 : 9',
      sub: 'Odin / Retroid Pocket 4 宽屏',
      icon: <Tv className="w-3.5 h-3.5" />,
    },
    {
      id: '3:2',
      label: '3 : 2',
      sub: 'RG552 / GBA 黄金视觉',
      icon: <Monitor className="w-3.5 h-3.5" />,
    },
    {
      id: '4:3',
      label: '4 : 3',
      sub: 'Miyoo Mini / RG353 复古机型',
      icon: <Tv className="w-3.5 h-3.5" />,
    },
    {
      id: '1:1',
      label: '1 : 1',
      sub: 'RGB30 方屏掌机',
      icon: <Square className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-neutral-900/90 backdrop-blur border border-neutral-800 rounded-xl overflow-x-auto max-w-full no-scrollbar">
      <div className="flex items-center gap-1">
        {ratios.map((r) => {
          const isSelected = currentRatio === r.id;
          return (
            <button
              key={r.id}
              onClick={() => onChangeRatio(r.id)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-amber-500 text-neutral-950 shadow-md font-bold'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
              }`}
              title={`${r.label} - ${r.sub}`}
            >
              {r.icon}
              <span>{r.label}</span>
            </button>
          );
        })}
      </div>

      <div className="h-4 w-px bg-neutral-800 mx-1 shrink-0" />

      {/* Handheld Console Bezel Frame Toggle */}
      <button
        onClick={() => onToggleBezel(!showBezel)}
        className={`px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
          showBezel
            ? 'bg-neutral-700 text-amber-300 font-bold border border-amber-500/40'
            : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
        }`}
        title="开启/关闭实体掌机外壳按键模拟边框"
      >
        掌机外壳: {showBezel ? '已开' : '已关'}
      </button>
    </div>
  );
};
