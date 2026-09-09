import React from 'react';
import { AspectRatio } from '../types';
import { Monitor, Smartphone, Square, Tv } from 'lucide-react';

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
      label: 'Native Fill',
      sub: 'Full viewport',
      icon: <Smartphone className="w-3.5 h-3.5" />,
    },
    {
      id: '16:9',
      label: '16 : 9',
      sub: 'Odin / Retroid 4',
      icon: <Tv className="w-3.5 h-3.5" />,
    },
    {
      id: '3:2',
      label: '3 : 2',
      sub: 'RG552 / GBA',
      icon: <Monitor className="w-3.5 h-3.5" />,
    },
    {
      id: '4:3',
      label: '4 : 3',
      sub: 'Miyoo / RG353',
      icon: <Tv className="w-3.5 h-3.5" />,
    },
    {
      id: '1:1',
      label: '1 : 1',
      sub: 'RGB30 Square',
      icon: <Square className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="flex items-center gap-1.5 p-1 bg-neutral-900/90 backdrop-blur border border-neutral-800 rounded-xl">
      <div className="flex items-center gap-1">
        {ratios.map((r) => {
          const isSelected = currentRatio === r.id;
          return (
            <button
              key={r.id}
              onClick={() => onChangeRatio(r.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                isSelected
                  ? 'bg-amber-500 text-neutral-950 shadow-md font-bold'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
              }`}
              title={`${r.label} (${r.sub})`}
            >
              {r.icon}
              <span>{r.label}</span>
            </button>
          );
        })}
      </div>

      <div className="h-4 w-px bg-neutral-800 mx-1" />

      {/* Handheld Console Bezel Frame Toggle */}
      <button
        onClick={() => onToggleBezel(!showBezel)}
        className={`px-2 py-1 rounded-lg text-xs font-mono transition-colors ${
          showBezel
            ? 'bg-neutral-700 text-amber-300 font-bold border border-amber-500/40'
            : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
        }`}
        title="Toggle handheld console body frame simulation"
      >
        Bezel: {showBezel ? 'ON' : 'OFF'}
      </button>
    </div>
  );
};
