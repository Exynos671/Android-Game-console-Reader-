import React from 'react';
import { GAMEPAD_INPUTS } from '../services/gamepadService';

interface GamepadButtonBadgeProps {
  inputId: string;
  isPressed?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const GamepadButtonBadge: React.FC<GamepadButtonBadgeProps> = ({
  inputId,
  isPressed = false,
  size = 'md',
  className = '',
}) => {
  const info = GAMEPAD_INPUTS[inputId] || {
    id: inputId,
    name: inputId,
    shortName: inputId.replace('button_', 'B').replace('axis_', 'A'),
    category: 'system' as const,
  };

  const getColors = () => {
    switch (info.category) {
      case 'bumper':
        return isPressed
          ? 'bg-amber-400 text-neutral-950 border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
          : 'bg-amber-950/50 text-amber-300 border-amber-700/60 hover:border-amber-500';
      case 'trigger':
        return isPressed
          ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.5)]'
          : 'bg-rose-950/50 text-rose-300 border-rose-700/60 hover:border-rose-500';
      case 'face':
        return isPressed
          ? 'bg-sky-400 text-neutral-950 border-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.5)]'
          : 'bg-sky-950/50 text-sky-300 border-sky-700/60 hover:border-sky-500';
      case 'dpad':
        return isPressed
          ? 'bg-emerald-400 text-neutral-950 border-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.5)]'
          : 'bg-emerald-950/50 text-emerald-300 border-emerald-700/60 hover:border-emerald-500';
      case 'stick':
        return isPressed
          ? 'bg-purple-400 text-neutral-950 border-purple-300 shadow-[0_0_12px_rgba(192,132,252,0.5)]'
          : 'bg-purple-950/50 text-purple-300 border-purple-700/60 hover:border-purple-500';
      default:
        return isPressed
          ? 'bg-neutral-200 text-neutral-950 border-white'
          : 'bg-neutral-800 text-neutral-300 border-neutral-700';
    }
  };

  const sizeClasses = {
    sm: 'text-[11px] px-1.5 py-0.5 min-w-[28px]',
    md: 'text-xs px-2.5 py-1 min-w-[34px]',
    lg: 'text-sm px-3 py-1.5 min-w-[42px]',
  };

  return (
    <span
      className={`inline-flex items-center justify-center font-mono font-bold uppercase tracking-wider rounded-md border transition-all duration-100 select-none shadow-sm ${sizeClasses[size]} ${getColors()} ${className}`}
      title={info.name}
    >
      {info.shortName}
    </span>
  );
};
