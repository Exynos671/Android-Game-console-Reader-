import { useEffect, useRef, useState, useCallback } from 'react';
import { ControllerProfile, ReaderAction } from '../types';
import {
  DEFAULT_PROFILES,
  loadSavedProfile,
  saveProfile,
  triggerHaptic,
  GAMEPAD_INPUTS,
} from '../services/gamepadService';

interface UseGamepadOptions {
  onAction?: (action: ReaderAction) => void;
  onScroll?: (deltaY: number) => void;
  enabled?: boolean;
}

export function useGamepad({ onAction, onScroll, enabled = true }: UseGamepadOptions = {}) {
  const [profile, setProfileState] = useState<ControllerProfile>(loadSavedProfile);
  const [connectedGamepadName, setConnectedGamepadName] = useState<string | null>(null);
  const [pressedInputs, setPressedInputs] = useState<Set<string>>(new Set());
  const [recordingAction, setRecordingAction] = useState<ReaderAction | null>(null);

  const prevButtonsRef = useRef<boolean[]>([]);
  const prevAxesActiveRef = useRef<Record<string, boolean>>({});
  const lastActionTimeRef = useRef<Record<string, number>>({});
  const onActionRef = useRef(onAction);
  const onScrollRef = useRef(onScroll);
  const profileRef = useRef(profile);
  const recordingActionRef = useRef(recordingAction);

  useEffect(() => {
    onActionRef.current = onAction;
  }, [onAction]);

  useEffect(() => {
    onScrollRef.current = onScroll;
  }, [onScroll]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    recordingActionRef.current = recordingAction;
  }, [recordingAction]);

  const updateProfile = useCallback((newProfile: ControllerProfile) => {
    setProfileState(newProfile);
    saveProfile(newProfile);
  }, []);

  const rebindAction = useCallback((action: ReaderAction, inputId: string) => {
    setProfileState((prev) => {
      const updated: ControllerProfile = {
        ...prev,
        bindings: {
          ...prev.bindings,
          [action]: inputId,
        },
      };
      saveProfile(updated);
      return updated;
    });
  }, []);

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
        const currentRecording = recordingActionRef.current;

        // 1. Scan Buttons
        activeGamepad.buttons.forEach((btn, idx) => {
          const isPressed = btn.pressed || btn.value > 0.3;
          const inputId = `button_${idx}`;

          if (isPressed) {
            currentlyPressed.add(inputId);

            // Check if user is actively recording a binding
            if (currentRecording) {
              rebindAction(currentRecording, inputId);
              setRecordingAction(null);
              triggerHaptic(60, 0.8, 0.4);
              return;
            }

            const wasPressed = prevButtonsRef.current[idx];
            if (!wasPressed) {
              // Single tap trigger
              handleInputTrigger(inputId, curProfile, now);
            }
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

          // Negative tilt
          if (val < -deadzone) {
            currentlyPressed.add(negId);
            if (currentRecording) {
              rebindAction(currentRecording, negId);
              setRecordingAction(null);
              triggerHaptic(60, 0.8, 0.4);
              return;
            }

            const wasActive = prevAxesActiveRef.current[negId];
            if (!wasActive) {
              handleInputTrigger(negId, curProfile, now);
            }
            prevAxesActiveRef.current[negId] = true;

            // Continuous scroll check for right stick / left stick
            checkContinuousScroll(negId, Math.abs(val), curProfile);
          } else {
            prevAxesActiveRef.current[negId] = false;
          }

          // Positive tilt
          if (val > deadzone) {
            currentlyPressed.add(posId);
            if (currentRecording) {
              rebindAction(currentRecording, posId);
              setRecordingAction(null);
              triggerHaptic(60, 0.8, 0.4);
              return;
            }

            const wasActive = prevAxesActiveRef.current[posId];
            if (!wasActive) {
              handleInputTrigger(posId, curProfile, now);
            }
            prevAxesActiveRef.current[posId] = true;

            // Continuous scroll check
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

      // Find which action corresponds to this inputId
      for (const [action, mappedInput] of Object.entries(prof.bindings) as [ReaderAction, string][]) {
        if (mappedInput === inputId) {
          // Debounce rapid repeat for discrete page turns
          const lastTime = lastActionTimeRef.current[action] || 0;
          const minInterval = action === 'nextPage' || action === 'prevPage' ? 220 : 150;

          if (now - lastTime >= minInterval) {
            lastActionTimeRef.current[action] = now;
            if (prof.hapticFeedback) {
              triggerHaptic(30, 0.3, 0.1);
            }
            onActionRef.current?.(action);
          }
          break;
        }
      }
    };

    const checkContinuousScroll = (inputId: string, magnitude: number, prof: ControllerProfile) => {
      if (!enabled) return;
      const speed = prof.scrollSpeed || 14;
      const invert = prof.invertScroll ? -1 : 1;

      if (prof.bindings.scrollDown === inputId) {
        onScrollRef.current?.(speed * magnitude * invert);
      } else if (prof.bindings.scrollUp === inputId) {
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
      window.removeEventListener('gamepadconnected', onGamepadConnect);
      window.removeEventListener('gamepaddisconnected', onGamepadDisconnect);
    };
  }, [enabled, rebindAction]);

  // Keyboard support as fallback / simulation
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
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
    recordingAction,
    setRecordingAction,
    presetProfiles: DEFAULT_PROFILES,
  };
}
