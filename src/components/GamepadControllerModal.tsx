import React, { useEffect, useRef, useState } from 'react';
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
import { RecordingTarget } from '../hooks/useGamepad';
import { ACTION_DESCRIPTIONS, GAMEPAD_INPUTS, triggerHaptic } from '../services/gamepadService';
import { GamepadButtonBadge } from './GamepadButtonBadge';
import { SafeSlider } from './SafeSlider';
import { useI18n } from '../i18n';

interface GamepadControllerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: ControllerProfile;
  onUpdateProfile: (profile: ControllerProfile) => void;
  recordingTarget: RecordingTarget | null;
  onStartRecording: (target: RecordingTarget | null) => void;
  connectedGamepadName: string | null;
  pressedInputs: Set<string>;
  presetProfiles: ControllerProfile[];
}

export const GamepadControllerModal: React.FC<GamepadControllerModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile,
  recordingTarget,
  onStartRecording,
  connectedGamepadName,
  pressedInputs,
  presetProfiles,
}) => {
  const { t, tf } = useI18n();
  const [activeTab, setActiveTab] = useState<'bindings' | 'tuning' | 'presets'>('bindings');
  const bHoldTimerRef = useRef<number | null>(null);

  // Holding B for a moment always leaves the button-mapping screen.
  useEffect(() => {
    if (!isOpen || !pressedInputs) return;
    const held = pressedInputs.has('button_1');
    if (held && bHoldTimerRef.current === null) {
      bHoldTimerRef.current = window.setTimeout(() => {
        bHoldTimerRef.current = null;
        onStartRecording(null);
        onClose();
      }, 750);
    } else if (!held && bHoldTimerRef.current !== null) {
      window.clearTimeout(bHoldTimerRef.current);
      bHoldTimerRef.current = null;
    }
  }, [pressedInputs, isOpen, onClose, onStartRecording]);

  // Clear any pending long-press timer when the modal unmounts.
  useEffect(
    () => () => {
      if (bHoldTimerRef.current !== null) {
        window.clearTimeout(bHoldTimerRef.current);
        bHoldTimerRef.current = null;
      }
    },
    []
  );

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

  const labelFor = (action: ReaderAction) => t(`ctrl.action_${action}` as any);
  const descFor = (action: ReaderAction) => t(`ctrl.action_${action}Desc` as any);

  const presetLabel = (id: string, fallback: string) => {
    const key = `ctrl.presetName_${id}` as any;
    const v = t(key);
    return v === key ? fallback : v;
  };
  const presetDesc = (id: string, fallback: string) => {
    const key = `ctrl.presetDesc_${id}` as any;
    const v = t(key);
    return v === key ? fallback : v;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-neutral-900 border border-neutral-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-neutral-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold flex flex-wrap items-center gap-2">
                {t('ctrl.title')}
                {connectedGamepadName ? (
                  <span className="whitespace-nowrap text-xs font-normal px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {t('ctrl.connected')}
                  </span>
                ) : (
                  <span className="whitespace-nowrap text-xs font-normal px-2.5 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700 flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3 text-amber-400" />
                    {t('ctrl.pressAny')}
                  </span>
                )}
              </h2>
              <p className="text-xs text-neutral-400 truncate max-w-md">
                {connectedGamepadName || t('ctrl.subtitleNot')}
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
        <div className="shrink-0 px-4 sm:px-6 py-2.5 bg-neutral-950/90 border-b border-neutral-800/80 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs font-mono">
          <div className="flex items-center gap-2 text-neutral-400">
            <Radio className="shrink-0 w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span className="whitespace-nowrap">{t('ctrl.activeInputs')}</span>
            {pressedInputs.size > 0 ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                {Array.from(pressedInputs).map((inp) => (
                  <GamepadButtonBadge key={inp} inputId={inp} isPressed={true} size="sm" />
                ))}
              </div>
            ) : (
              <span className="text-neutral-500 italic">{t('ctrl.nonePressed')}</span>
            )}
          </div>

          <div className="ml-auto whitespace-nowrap text-neutral-400">
            {t('ctrl.profile')}{' '}
            <span className="text-amber-400 font-bold">
              {presetLabel(profile.id, profile.name)}
            </span>
          </div>
        </div>

        {/* Recording Overlay banner if active */}
        {recordingTarget && (
          <div className="bg-amber-500/15 border-b border-amber-500/40 px-6 py-3 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span className="text-sm font-semibold text-amber-300">{t('ctrl.recordingFor')}</span>
              <span className="px-2 py-0.5 rounded bg-amber-400 text-neutral-950 font-bold text-xs uppercase">
                {labelFor(recordingTarget.action)}
              </span>
              <span className="text-xs text-amber-300">
                [{recordingTarget.slot === 'secondary' ? t('ctrl.bindingSecondary') : t('ctrl.bindingPrimary')}]
              </span>
              <span className="hidden sm:inline text-[11px] text-amber-200/80">
                {t('ctrl.longPressBExit')}
              </span>
            </div>
            <button
              onClick={() => onStartRecording(null)}
              className="text-xs text-neutral-400 hover:text-white px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700"
            >
              {t('ctrl.cancel')}
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="shrink-0 flex border-b border-neutral-800 px-4 sm:px-6 bg-neutral-900/50 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('bindings')}
            className={`shrink-0 whitespace-nowrap py-3 px-2.5 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'bindings'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {t('ctrl.tabBindings')}
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={`shrink-0 whitespace-nowrap py-3 px-2.5 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'presets'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {t('ctrl.tabPresets')}
          </button>
          <button
            onClick={() => setActiveTab('tuning')}
            className={`shrink-0 whitespace-nowrap py-3 px-2.5 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'tuning'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {t('ctrl.tabTuning')}
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'bindings' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
                <span>{t('ctrl.actionPurpose')}</span>
                <div className="flex items-center gap-6">
                  <span>{t('ctrl.assignedButton')}</span>
                  <span className="hidden sm:inline">{t('ctrl.keyboardFallback')}</span>
                </div>
              </div>

              {actionsList.map((action) => {
                const desc = ACTION_DESCRIPTIONS[action];
                const primaryInput = profile.bindings[action];
                const secondaryInput = profile.secondaryBindings?.[action];
                const isRecordingThis = recordingTarget?.action === action;
                const slotLabel = (slot: 'primary' | 'secondary') =>
                  slot === 'secondary' ? t('ctrl.bindingSecondary') : t('ctrl.bindingPrimary');

                return (
                  <div
                    key={action}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isRecordingThis
                        ? 'bg-amber-500/10 border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                        : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-neutral-100">{labelFor(action)}</span>
                        {(action === 'nextPage' || action === 'prevPage') && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                            {t('ctrl.primary')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400">{descFor(action)}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {(
                        [
                          { slot: 'primary' as const, input: primaryInput },
                          { slot: 'secondary' as const, input: secondaryInput || '' },
                        ]
                      ).map(({ slot, input }) => {
                        const rec = isRecordingThis && recordingTarget?.slot === slot;
                        const pressed = input ? pressedInputs.has(input) : false;
                        return (
                          <button
                            key={slot}
                            onClick={() => onStartRecording(rec ? null : { action, slot })}
                            className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg border text-[9px] font-semibold transition-all ${
                              rec
                                ? 'bg-amber-500 text-neutral-950 border-amber-400 animate-pulse font-bold'
                                : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-300'
                            }`}
                          >
                            <span>{slotLabel(slot)}</span>
                            {input ? (
                              <GamepadButtonBadge inputId={input} isPressed={pressed} size="sm" />
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded border border-dashed border-neutral-600 text-neutral-500">
                                {rec ? t('ctrl.listening') : '+'}
                              </span>
                            )}
                          </button>
                        );
                      })}

                      {/* Keyboard shortcut hint */}
                      <span className="hidden sm:inline-block text-[11px] font-mono text-neutral-500 bg-neutral-950 px-2 py-1 rounded border border-neutral-800 min-w-[120px] text-center">
                        {desc?.defaultKey}
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
                          {presetLabel(preset.id, preset.name)}
                          {isActive && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                        </h4>
                        <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                          {presetDesc(preset.id, preset.description)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-neutral-500">{t('ctrl.nextPrev')}:</span>
                      <GamepadButtonBadge inputId={preset.bindings.nextPage} size="sm" />
                      <GamepadButtonBadge inputId={preset.bindings.prevPage} size="sm" />
                      <span className="text-[11px] text-neutral-500 ml-2">{t('ctrl.scroll')}:</span>
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
                      {t('ctrl.deadzone')}
                    </h4>
                    <p className="text-xs text-neutral-400">{t('ctrl.deadzoneDesc')}</p>
                  </div>
                  <span className="font-mono text-sm text-amber-400 font-bold">
                    {Math.round(profile.deadzone * 100)}%
                  </span>
                </div>
                <SafeSlider
                  min={0.1}
                  max={0.5}
                  step={0.05}
                  value={profile.deadzone}
                  onChange={(v) =>
                    onUpdateProfile({ ...profile, deadzone: Math.round(v * 100) / 100 })
                  }
                />
                <div className="flex justify-between text-[11px] font-mono text-neutral-500">
                  <span>{t('ctrl.ultraSensitive')}</span>
                  <span>25% ({t('ctrl.recommended')})</span>
                  <span>{t('ctrl.firmTilt')}</span>
                </div>
              </div>

              {/* Scroll Speed */}
              <div className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-amber-400" />
                      {t('ctrl.scrollSpeed')}
                    </h4>
                    <p className="text-xs text-neutral-400">{t('ctrl.scrollSpeedDesc')}</p>
                  </div>
                  <span className="font-mono text-sm text-amber-400 font-bold">
                    {tf('ctrl.pxPerTick', { n: profile.scrollSpeed })}
                  </span>
                </div>
                <SafeSlider
                  min={6}
                  max={32}
                  step={2}
                  value={profile.scrollSpeed}
                  onChange={(v) =>
                    onUpdateProfile({ ...profile, scrollSpeed: Math.round(v) })
                  }
                />
              </div>

              {/* Invert Scroll & Haptics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center justify-between p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 cursor-pointer hover:border-neutral-700">
                  <div className="space-y-0.5">
                    <span className="text-sm font-semibold text-neutral-100">
                      {t('ctrl.invertScroll')}
                    </span>
                    <p className="text-xs text-neutral-400">{t('ctrl.invertScrollDesc')}</p>
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
                      <span className="text-sm font-semibold text-neutral-100">
                        {t('ctrl.haptics')}
                      </span>
                      <p className="text-xs text-neutral-400">{t('ctrl.hapticsDesc')}</p>
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

        {/* Footer: stack the two actions on phones so their labels never
            squeeze into each other; keep the desktop row otherwise. */}
        <div className="px-4 sm:px-6 py-4 border-t border-neutral-800 bg-neutral-950 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <button
            onClick={() => handlePresetSelect(presetProfiles[0])}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-2 sm:py-1.5 rounded-lg border border-neutral-700 text-xs text-neutral-300 hover:bg-neutral-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            <span className="text-center">{t('ctrl.resetStandard')}</span>
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto whitespace-nowrap px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all"
          >
            {t('ctrl.saveResume')}
          </button>
        </div>
      </div>
    </div>
  );
};
