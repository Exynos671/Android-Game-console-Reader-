import React, { useState } from 'react';
import {
  Gamepad2,
  X,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Vibrate,
  Radio,
} from 'lucide-react';
import { ControllerProfile, ReaderAction } from '../types';
import { ACTION_DESCRIPTIONS, GAMEPAD_INPUTS, triggerHaptic } from '../services/gamepadService';
import { GamepadButtonBadge } from './GamepadButtonBadge';

interface GamepadControllerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: ControllerProfile;
  onUpdateProfile: (profile: ControllerProfile) => void;
  onRebindAction: (action: ReaderAction, inputId: string) => void;
  recordingAction: ReaderAction | null;
  onStartRecording: (action: ReaderAction | null) => void;
  connectedGamepadName: string | null;
  pressedInputs: Set<string>;
  presetProfiles: ControllerProfile[];
}

export const GamepadControllerModal: React.FC<GamepadControllerModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile,
  recordingAction,
  onStartRecording,
  connectedGamepadName,
  pressedInputs,
  presetProfiles,
}) => {
  const [activeTab, setActiveTab] = useState<'bindings' | 'tuning' | 'presets'>('bindings');

  if (!isOpen) return null;

  const handlePresetSelect = (preset: ControllerProfile) => {
    onUpdateProfile({ ...preset });
    triggerHaptic(50, 0.5, 0.2);
  };

  const actionsList: ReaderAction[] = [
    'nextPage',
    'prevPage',
    'scrollDown',
    'scrollUp',
    'toggleDistractionFree',
    'toggleMenu',
    'toggleToc',
    'zoomIn',
    'zoomOut',
    'toggleTheme',
    'bookmark',
    'backToLibrary',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-neutral-900 border border-neutral-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-neutral-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Handheld Controller Mapping
                {connectedGamepadName ? (
                  <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Connected
                  </span>
                ) : (
                  <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700 flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3 text-amber-400" />
                    Press any button to connect
                  </span>
                )}
              </h2>
              <p className="text-xs text-neutral-400 truncate max-w-md">
                {connectedGamepadName || 'Standard gamepad API active (Keyboard simulation available)'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Controller Monitor Bar */}
        <div className="px-6 py-2.5 bg-neutral-950/90 border-b border-neutral-800/80 flex items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 text-neutral-400">
            <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span>Active Inputs:</span>
            {pressedInputs.size > 0 ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                {Array.from(pressedInputs).map((inp) => (
                  <GamepadButtonBadge key={inp} inputId={inp} isPressed={true} size="sm" />
                ))}
              </div>
            ) : (
              <span className="text-neutral-500 italic">None (Press buttons on your handheld to test)</span>
            )}
          </div>

          <div className="text-neutral-400">
            Profile: <span className="text-amber-400 font-bold">{profile.name}</span>
          </div>
        </div>

        {/* Recording Overlay banner if active */}
        {recordingAction && (
          <div className="bg-amber-500/15 border-b border-amber-500/40 px-6 py-3 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span className="text-sm font-semibold text-amber-300">
                Press any button or tilt a thumbstick on your handheld for:
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-400 text-neutral-950 font-bold text-xs uppercase">
                {ACTION_DESCRIPTIONS[recordingAction]?.label || recordingAction}
              </span>
            </div>
            <button
              onClick={() => onStartRecording(null)}
              className="text-xs text-neutral-400 hover:text-white px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-neutral-800 px-6 bg-neutral-900/50">
          <button
            onClick={() => setActiveTab('bindings')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'bindings'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Button Mappings
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'presets'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Console Presets
          </button>
          <button
            onClick={() => setActiveTab('tuning')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'tuning'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Stick Deadzone &amp; Haptics
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'bindings' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
                <span>Action &amp; Purpose</span>
                <div className="flex items-center gap-6">
                  <span>Assigned Controller Button</span>
                  <span className="hidden sm:inline">Keyboard Fallback</span>
                </div>
              </div>

              {actionsList.map((action) => {
                const desc = ACTION_DESCRIPTIONS[action];
                const currentInput = profile.bindings[action];
                const isPressed = pressedInputs.has(currentInput);
                const isRecordingThis = recordingAction === action;

                return (
                  <div
                    key={action}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isRecordingThis
                        ? 'bg-amber-500/10 border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                        : isPressed
                        ? 'bg-neutral-800/80 border-neutral-600'
                        : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-neutral-100">{desc.label}</span>
                        {action === 'nextPage' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                            Primary
                          </span>
                        )}
                        {action === 'prevPage' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400">{desc.description}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Remap button */}
                      <button
                        onClick={() => onStartRecording(isRecordingThis ? null : action)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                          isRecordingThis
                            ? 'bg-amber-500 text-neutral-950 border-amber-400 animate-pulse font-bold'
                            : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-200'
                        }`}
                      >
                        {isRecordingThis ? (
                          <span>Listening...</span>
                        ) : (
                          <>
                            <GamepadButtonBadge inputId={currentInput} isPressed={isPressed} size="md" />
                            <span className="text-neutral-400 hover:text-white">Remap</span>
                          </>
                        )}
                      </button>

                      {/* Keyboard shortcut hint */}
                      <span className="hidden sm:inline-block text-[11px] font-mono text-neutral-500 bg-neutral-950 px-2 py-1 rounded border border-neutral-800 min-w-[120px] text-center">
                        {desc.defaultKey}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'presets' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {presetProfiles.map((preset) => {
                const isActive = profile.id === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => handlePresetSelect(preset)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isActive
                        ? 'bg-amber-500/10 border-amber-500/80 shadow-[0_0_16px_rgba(245,158,11,0.15)]'
                        : 'bg-neutral-900/70 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-850'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-neutral-100 flex items-center gap-2">
                          {preset.name}
                          {isActive && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                        </h4>
                        <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{preset.description}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-neutral-500">Next/Prev:</span>
                      <GamepadButtonBadge inputId={preset.bindings.nextPage} size="sm" />
                      <GamepadButtonBadge inputId={preset.bindings.prevPage} size="sm" />
                      <span className="text-[11px] text-neutral-500 ml-2">Scroll:</span>
                      <GamepadButtonBadge inputId={preset.bindings.scrollDown} size="sm" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'tuning' && (
            <div className="space-y-6">
              {/* Analog Stick Deadzone */}
              <div className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-amber-400" />
                      Analog Stick Deadzone
                    </h4>
                    <p className="text-xs text-neutral-400">
                      Prevents unintentional page scrolling caused by loose or drifting handheld sticks.
                    </p>
                  </div>
                  <span className="font-mono text-sm text-amber-400 font-bold">
                    {Math.round(profile.deadzone * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.5"
                  step="0.05"
                  value={profile.deadzone}
                  onChange={(e) =>
                    onUpdateProfile({ ...profile, deadzone: parseFloat(e.target.value) })
                  }
                  className="w-full accent-amber-400 bg-neutral-700 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[11px] font-mono text-neutral-500">
                  <span>10% (Ultra sensitive)</span>
                  <span>25% (Recommended)</span>
                  <span>50% (Firm tilt only)</span>
                </div>
              </div>

              {/* Scroll Speed */}
              <div className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-amber-400" />
                      Continuous Scroll Speed
                    </h4>
                    <p className="text-xs text-neutral-400">
                      Controls the pixel scroll velocity when holding analog thumbsticks or triggers.
                    </p>
                  </div>
                  <span className="font-mono text-sm text-amber-400 font-bold">
                    {profile.scrollSpeed} px/tick
                  </span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="32"
                  step="2"
                  value={profile.scrollSpeed}
                  onChange={(e) =>
                    onUpdateProfile({ ...profile, scrollSpeed: parseInt(e.target.value) })
                  }
                  className="w-full accent-amber-400 bg-neutral-700 rounded-lg cursor-pointer"
                />
              </div>

              {/* Invert Scroll & Haptics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center justify-between p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 cursor-pointer hover:border-neutral-700">
                  <div className="space-y-0.5">
                    <span className="text-sm font-semibold text-neutral-100">Invert Vertical Scroll</span>
                    <p className="text-xs text-neutral-400">Invert thumbstick tilt direction</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.invertScroll}
                    onChange={(e) =>
                      onUpdateProfile({ ...profile, invertScroll: e.target.checked })
                    }
                    className="w-5 h-5 rounded accent-amber-400 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 cursor-pointer hover:border-neutral-700">
                  <div className="space-y-0.5 flex items-center gap-2">
                    <Vibrate className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="text-sm font-semibold text-neutral-100">Haptic Rumble Feedback</span>
                      <p className="text-xs text-neutral-400">Vibrate console motors on page turn</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.hapticFeedback}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      onUpdateProfile({ ...profile, hapticFeedback: enabled });
                      if (enabled) triggerHaptic(80, 0.6, 0.3);
                    }}
                    className="w-5 h-5 rounded accent-amber-400 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <button
            onClick={() => handlePresetSelect(presetProfiles[0])}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-700 text-xs text-neutral-300 hover:bg-neutral-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Standard Handheld (RB/LB)
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all"
          >
            Save &amp; Resume Reading
          </button>
        </div>
      </div>
    </div>
  );
};
