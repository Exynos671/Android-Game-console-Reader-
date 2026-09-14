import { useEffect, useRef, useState, useCallback } from 'react';
import { ControllerProfile, ReaderAction, BindSlot } from '../types';
import {
  DEFAULT_PROFILES,
  loadSavedProfile,
  saveProfile,
  triggerHaptic,
} from '../services/gamepadService';

export interface RecordingTarget {
  action: ReaderAction;
  slot: BindSlot;
}

interface UseGamepadOptions {
  onAction?: (action: ReaderAction) => void;
  onScroll?: (deltaY: number) => void;
  enabled?: boolean;
  /** Called when the user presses a button while recording a binding. */
  onRecordingPress?: (target: RecordingTarget, inputId: string) => void;
  /** Called when the user holds down B (button_1) while recording a binding. */
  onLongPressB?: () => void;
}

/** Return the action bound (primary or secondary) to a given input. */
export function actionForInput(prof: ControllerProfile, input: string): ReaderAction | null {
  for (const [a, id] of Object.entries(prof.bindings)) {
    if (id === input) return a as ReaderAction;
  }
  for (const [a, id] of Object.entries(prof.secondaryBindings || {})) {
    if (id === input) return a as ReaderAction;
  }
  return null;
}

export function useGamepad({
  onAction,
  onScroll,
  enabled = true,
  onRecordingPress,
  onLongPressB,
}: UseGamepadOptions = {}) {
  /** How long B must be held while binding to abort + leave the settings. */
  const B_LONG_PRESS_MS = 700;
  const [profile, setProfileState] = useState<ControllerProfile>(loadSavedProfile);
  const [connectedGamepadName, setConnectedGamepadName] = useState<string | null>(null);
  const [pressedInputs, setPressedInputs] = useState<Set<string>>(new Set());
  const [recordingTarget, setRecordingTarget] = useState<RecordingTarget | null>(null);

  const prevButtonsRef = useRef<boolean[]>([]);
  const prevAxesActiveRef = useRef<Record<string, boolean>>({});
  const lastActionTimeRef = useRef<Record<string, number>>({});
  const onActionRef = useRef(onAction);
  const onScrollRef = useRef(onScroll);
  const onRecordingPressRef = useRef(onRecordingPress);
  const onLongPressBRef = useRef(onLongPressB);
  const profileRef = useRef(profile);
  const recordingTargetRef = useRef(recordingTarget);
  const bHoldTimerRef = useRef<number | null>(null);
  const bHoldFiredRef = useRef(false);

  useEffect(() => {
    onActionRef.current = onAction;
  }, [onAction]);

  useEffect(() => {
    onScrollRef.current = onScroll;
  }, [onScroll]);

  useEffect(() => {
    onRecordingPressRef.current = onRecordingPress;
  }, [onRecordingPress]);

  useEffect(() => {
    onLongPressBRef.current = onLongPressB;
  }, [onLongPressB]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    recordingTargetRef.current = recordingTarget;
    if (!recordingTarget && bHoldTimerRef.current) {
      window.clearTimeout(bHoldTimerRef.current);
      bHoldTimerRef.current = null;
    }
    if (!recordingTarget) bHoldFiredRef.current = false;
  }, [recordingTarget]);

  const updateProfile = useCallback((newProfile: ControllerProfile) => {
    setProfileState(newProfile);
    saveProfile(newProfile);
  }, []);

  const rebindAction = useCallback(
    (action: ReaderAction, inputId: string, slot: BindSlot = 'primary') => {
      setProfileState((prev) => {
        const updated: ControllerProfile = { ...prev };
        if (slot === 'secondary') {
          updated.secondaryBindings = {
            ...(prev.secondaryBindings || {}),
            [action]: inputId,
          };
        } else {
          updated.bindings = { ...prev.bindings, [action]: inputId };
        }
        saveProfile(updated);
        return updated;
      });
    },
    []
  );

  // Check Gamepad Loop
  useEffect(() => {
    let animFrameId: number;

    const scanGamepads = () => {
      if (typeof navigator === 'undefined' || !('getGamepads' in navigator)) return;

      const gamepads = navigator.getGamepads();
      let activeGamepad: Gamepad | null = null;

      for (const gp of gamepads) {
        if (gp && gp.connected) {
          activeGamepad = gp;
          break;
        }
      }

      if (activeGamepad) {
        if (connectedGamepadName !== activeGamepad.id) {
          setConnectedGamepadName(activeGamepad.id);
        }

        const currentlyPressed = new Set<string>();
        const now = performance.now();
        const curProfile = profileRef.current;
        const currentRecording = recordingTargetRef.current;

        const maybeRecord = (inputId: string, haptic: boolean) => {
          if (currentRecording) {
            onRecordingPressRef.current?.(currentRecording, inputId);
            setRecordingTarget(null);
            if (haptic) triggerHaptic(60, 0.8, 0.4);
          }
        };

        // 1. Scan Buttons
        activeGamepad.buttons.forEach((btn, idx) => {
          const isPressed = btn.pressed || btn.value > 0.3;
          const inputId = `button_${idx}`;

          if (isPressed) {
            currentlyPressed.add(inputId);

            if (currentRecording) {
              const wasPressed = prevButtonsRef.current[idx];
              if (inputId === 'button_1') {
                // B is special while binding: a quick tap records B, holding
                // it down aborts the recording and exits the settings screen.
                if (!wasPressed) {
                  bHoldFiredRef.current = false;
                  if (bHoldTimerRef.current) window.clearTimeout(bHoldTimerRef.current);
                  bHoldTimerRef.current = window.setTimeout(() => {
                    bHoldTimerRef.current = null;
                    bHoldFiredRef.current = true;
                    setRecordingTarget(null);
                    onLongPressBRef.current?.();
                  }, B_LONG_PRESS_MS);
                }
              } else if (!wasPressed) {
                maybeRecord(inputId, true);
              }
            } else {
              const wasPressed = prevButtonsRef.current[idx];
              if (!wasPressed) {
                handleInputTrigger(inputId, curProfile, now);
              }
            }
          } else if (
            idx === 1 &&
            prevButtonsRef.current[1] &&
            currentRecording &&
            bHoldTimerRef.current
          ) {
            // Released before the long-press interval: record B normally.
            window.clearTimeout(bHoldTimerRef.current);
            bHoldTimerRef.current = null;
            if (!bHoldFiredRef.current) maybeRecord('button_1', true);
          }
          prevButtonsRef.current[idx] = isPressed;
        });

        // 2. Scan Axes
        const deadzone = curProfile.deadzone || 0.25;
        const axisCount = activeGamepad.axes.length;

        for (let i = 0; i < axisCount; i++) {
          const val = activeGamepad.axes[i];
          const negId = `axis_${i}_neg`;
          const posId = `axis_${i}_pos`;

          if (val < -deadzone) {
            currentlyPressed.add(negId);
            if (currentRecording) {
              const wasActive = prevAxesActiveRef.current[negId];
              if (!wasActive) maybeRecord(negId, true);
            } else {
              const wasActive = prevAxesActiveRef.current[negId];
              if (!wasActive) {
                handleInputTrigger(negId, curProfile, now);
              }
            }
            prevAxesActiveRef.current[negId] = true;

            checkContinuousScroll(negId, Math.abs(val), curProfile);
          } else {
            prevAxesActiveRef.current[negId] = false;
          }

          if (val > deadzone) {
            currentlyPressed.add(posId);
            if (currentRecording) {
              const wasActive = prevAxesActiveRef.current[posId];
              if (!wasActive) maybeRecord(posId, true);
            } else {
              const wasActive = prevAxesActiveRef.current[posId];
              if (!wasActive) {
                handleInputTrigger(posId, curProfile, now);
              }
            }
            prevAxesActiveRef.current[posId] = true;

            checkContinuousScroll(posId, Math.abs(val), curProfile);
          } else {
            prevAxesActiveRef.current[posId] = false;
          }
        }

        setPressedInputs(currentlyPressed);
      } else {
        if (connectedGamepadName !== null) {
          setConnectedGamepadName(null);
          setPressedInputs(new Set());
        }
      }

      animFrameId = requestAnimationFrame(scanGamepads);
    };

    const handleInputTrigger = (inputId: string, prof: ControllerProfile, now: number) => {
      if (!enabled) return;

      const action = actionForInput(prof, inputId);
      if (!action) return;

      const lastTime = lastActionTimeRef.current[action] || 0;
      const minInterval = action === 'nextPage' || action === 'prevPage' ? 220 : 150;
      if (now - lastTime >= minInterval) {
        lastActionTimeRef.current[action] = now;
        if (prof.hapticFeedback) {
          triggerHaptic(30, 0.3, 0.1);
        }
        onActionRef.current?.(action);
      }
    };

    const checkContinuousScroll = (inputId: string, magnitude: number, prof: ControllerProfile) => {
      if (!enabled) return;
      const speed = prof.scrollSpeed || 14;
      const invert = prof.invertScroll ? -1 : 1;

      if (prof.bindings.scrollDown === inputId || prof.secondaryBindings?.scrollDown === inputId) {
        onScrollRef.current?.(speed * magnitude * invert);
      } else if (prof.bindings.scrollUp === inputId || prof.secondaryBindings?.scrollUp === inputId) {
        onScrollRef.current?.(-speed * magnitude * invert);
      }
    };

    animFrameId = requestAnimationFrame(scanGamepads);

    const onGamepadConnect = (e: GamepadEvent) => {
      setConnectedGamepadName(e.gamepad.id);
      triggerHaptic(80, 0.5, 0.3);
    };

    const onGamepadDisconnect = () => {
      setConnectedGamepadName(null);
      setPressedInputs(new Set());
    };

    window.addEventListener('gamepadconnected', onGamepadConnect);
    window.addEventListener('gamepaddisconnected', onGamepadDisconnect);

    return () => {
      cancelAnimationFrame(animFrameId);
      if (bHoldTimerRef.current) {
        window.clearTimeout(bHoldTimerRef.current);
        bHoldTimerRef.current = null;
      }
      window.removeEventListener('gamepadconnected', onGamepadConnect);
      window.removeEventListener('gamepaddisconnected', onGamepadDisconnect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, rebindAction]);

  // Keyboard support as fallback / simulation
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = e.key;

      if (key === 'ArrowRight' || key === 'e' || key === 'E' || key === 'PageDown') {
        e.preventDefault();
        onActionRef.current?.('nextPage');
      } else if (key === 'ArrowLeft' || key === 'q' || key === 'Q' || key === 'PageUp') {
        e.preventDefault();
        onActionRef.current?.('prevPage');
      } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
        e.preventDefault();
        onScrollRef.current?.(profileRef.current.scrollSpeed * 2);
      } else if (key === 'ArrowUp' || key === 'w' || key === 'W') {
        e.preventDefault();
        onScrollRef.current?.(-profileRef.current.scrollSpeed * 2);
      } else if (key === ' ' || key === 'f' || key === 'F') {
        e.preventDefault();
        onActionRef.current?.('toggleDistractionFree');
      } else if (key === 'Escape' || key === 'm' || key === 'M') {
        e.preventDefault();
        onActionRef.current?.('toggleMenu');
      } else if (key === 't' || key === 'T') {
        e.preventDefault();
        onActionRef.current?.('toggleToc');
      } else if (key === '+' || key === '=') {
        e.preventDefault();
        onActionRef.current?.('zoomIn');
      } else if (key === '-' || key === '_') {
        e.preventDefault();
        onActionRef.current?.('zoomOut');
      } else if (key === 'c' || key === 'C') {
        e.preventDefault();
        onActionRef.current?.('toggleTheme');
      } else if (key === 'b' || key === 'B') {
        e.preventDefault();
        onActionRef.current?.('bookmark');
      } else if (key === 'Backspace' || key === 'l' || key === 'L') {
        e.preventDefault();
        onActionRef.current?.('backToLibrary');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled]);

  return {
    profile,
    updateProfile,
    rebindAction,
    connectedGamepadName,
    isGamepadConnected: Boolean(connectedGamepadName),
    pressedInputs,
    recordingTarget,
    setRecordingTarget,
    presetProfiles: DEFAULT_PROFILES,
  };
}
