import { ControllerProfile, ReaderAction } from '../types';

export interface GamepadButtonInfo {
  id: string;
  name: string;
  shortName: string;
  category: 'bumper' | 'trigger' | 'face' | 'dpad' | 'stick' | 'system';
}

export const GAMEPAD_INPUTS: Record<string, GamepadButtonInfo> = {
  button_0: { id: 'button_0', name: 'A / Cross', shortName: 'A', category: 'face' },
  button_1: { id: 'button_1', name: 'B / Circle', shortName: 'B', category: 'face' },
  button_2: { id: 'button_2', name: 'X / Square', shortName: 'X', category: 'face' },
  button_3: { id: 'button_3', name: 'Y / Triangle', shortName: 'Y', category: 'face' },
  button_4: { id: 'button_4', name: 'LB / L1 (Left Bumper)', shortName: 'LB', category: 'bumper' },
  button_5: { id: 'button_5', name: 'RB / R1 (Right Bumper)', shortName: 'RB', category: 'bumper' },
  button_6: { id: 'button_6', name: 'LT / L2 (Left Trigger)', shortName: 'LT', category: 'trigger' },
  button_7: { id: 'button_7', name: 'RT / R2 (Right Trigger)', shortName: 'RT', category: 'trigger' },
  button_8: { id: 'button_8', name: 'Select / View / Share', shortName: 'SELECT', category: 'system' },
  button_9: { id: 'button_9', name: 'Start / Menu / Options', shortName: 'START', category: 'system' },
  button_10: { id: 'button_10', name: 'L3 (Left Stick Click)', shortName: 'L3', category: 'stick' },
  button_11: { id: 'button_11', name: 'R3 (Right Stick Click)', shortName: 'R3', category: 'stick' },
  button_12: { id: 'button_12', name: 'D-Pad Up', shortName: 'DPAD ↑', category: 'dpad' },
  button_13: { id: 'button_13', name: 'D-Pad Down', shortName: 'DPAD ↓', category: 'dpad' },
  button_14: { id: 'button_14', name: 'D-Pad Left', shortName: 'DPAD ←', category: 'dpad' },
  button_15: { id: 'button_15', name: 'D-Pad Right', shortName: 'DPAD →', category: 'dpad' },
  axis_0_neg: { id: 'axis_0_neg', name: 'Left Stick Left', shortName: 'LS ←', category: 'stick' },
  axis_0_pos: { id: 'axis_0_pos', name: 'Left Stick Right', shortName: 'LS →', category: 'stick' },
  axis_1_neg: { id: 'axis_1_neg', name: 'Left Stick Up', shortName: 'LS ↑', category: 'stick' },
  axis_1_pos: { id: 'axis_1_pos', name: 'Left Stick Down', shortName: 'LS ↓', category: 'stick' },
  axis_2_neg: { id: 'axis_2_neg', name: 'Right Stick Left', shortName: 'RS ←', category: 'stick' },
  axis_2_pos: { id: 'axis_2_pos', name: 'Right Stick Right', shortName: 'RS →', category: 'stick' },
  axis_3_neg: { id: 'axis_3_neg', name: 'Right Stick Up', shortName: 'RS ↑', category: 'stick' },
  axis_3_pos: { id: 'axis_3_pos', name: 'Right Stick Down', shortName: 'RS ↓', category: 'stick' },
};

export const ACTION_DESCRIPTIONS: Record<ReaderAction, { label: string; description: string; defaultKey: string }> = {
  nextPage: {
    label: 'Next Page',
    description: 'Turn forward to the next page or comic panel',
    defaultKey: 'ArrowRight / E / PageDown',
  },
  prevPage: {
    label: 'Previous Page',
    description: 'Turn back to previous page or comic panel',
    defaultKey: 'ArrowLeft / Q / PageUp',
  },
  scrollDown: {
    label: 'Scroll Down',
    description: 'Smoothly scroll down content (TXT, webtoon, or zoom)',
    defaultKey: 'ArrowDown / S',
  },
  scrollUp: {
    label: 'Scroll Up',
    description: 'Smoothly scroll up content',
    defaultKey: 'ArrowUp / W',
  },
  toggleDistractionFree: {
    label: 'Distraction-Free Mode',
    description: 'Toggle full-bleed reading mode hiding all UI',
    defaultKey: 'F / Space',
  },
  toggleMenu: {
    label: 'Open Menu / Settings',
    description: 'Open font, theme, and layout settings drawer',
    defaultKey: 'Escape / M',
  },
  toggleToc: {
    label: 'Table of Contents',
    description: 'View and jump to book chapters or comic pages',
    defaultKey: 'T',
  },
  zoomIn: {
    label: 'Font / Zoom In',
    description: 'Increase font size or comic zoom level',
    defaultKey: '+ / =',
  },
  zoomOut: {
    label: 'Font / Zoom Out',
    description: 'Decrease font size or comic zoom level',
    defaultKey: '-',
  },
  toggleTheme: {
    label: 'Quick Theme Switch',
    description: 'Cycle OLED, Dark, Warm Sepia, and Paper Light',
    defaultKey: 'C',
  },
  bookmark: {
    label: 'Toggle Bookmark',
    description: 'Save or remove current page bookmark',
    defaultKey: 'B',
  },
  backToLibrary: {
    label: 'Exit to Library',
    description: 'Leave reader and return to shelf',
    defaultKey: 'Backspace / L',
  },
};

export const DEFAULT_PROFILES: ControllerProfile[] = [
  {
    id: 'default_handheld',
    name: 'Standard Handheld (RB / LB)',
    description: 'Classic handheld ergonomics: RB for Next, LB for Prev, Right Stick for smooth scrolling, Y for Distraction-Free.',
    deadzone: 0.25,
    scrollSpeed: 14,
    invertScroll: false,
    hapticFeedback: true,
    bindings: {
      nextPage: 'button_5', // RB
      prevPage: 'button_4', // LB
      scrollDown: 'axis_3_pos', // Right Stick Down
      scrollUp: 'axis_3_neg', // Right Stick Up
      toggleDistractionFree: 'button_3', // Y
      toggleMenu: 'button_9', // Start
      toggleToc: 'button_8', // Select
      zoomIn: 'button_7', // RT
      zoomOut: 'button_6', // LT
      toggleTheme: 'button_2', // X
      bookmark: 'button_0', // A
      backToLibrary: 'button_1', // B
    },
  },
  {
    id: 'retro_dpad',
    name: 'Retro D-Pad & Face Buttons',
    description: 'Ideal for Miyoo Mini, RG353 or consoles with prominent D-Pads: D-Pad Right for Next, D-Pad Left for Prev.',
    deadzone: 0.25,
    scrollSpeed: 12,
    invertScroll: false,
    hapticFeedback: true,
    bindings: {
      nextPage: 'button_15', // D-Pad Right
      prevPage: 'button_14', // D-Pad Left
      scrollDown: 'button_13', // D-Pad Down
      scrollUp: 'button_12', // D-Pad Up
      toggleDistractionFree: 'button_0', // A
      toggleMenu: 'button_9', // Start
      toggleToc: 'button_8', // Select
      zoomIn: 'button_5', // RB
      zoomOut: 'button_4', // LB
      toggleTheme: 'button_2', // X
      bookmark: 'button_3', // Y
      backToLibrary: 'button_1', // B
    },
  },
  {
    id: 'one_hand_right',
    name: 'One-Handed (Right Hand)',
    description: 'Relaxed reading holding console with right hand only: RB/RT turn pages, A/B/X handle all functions.',
    deadzone: 0.25,
    scrollSpeed: 15,
    invertScroll: false,
    hapticFeedback: true,
    bindings: {
      nextPage: 'button_5', // RB
      prevPage: 'button_7', // RT
      scrollDown: 'axis_3_pos', // Right Stick Down
      scrollUp: 'axis_3_neg', // Right Stick Up
      toggleDistractionFree: 'button_3', // Y
      toggleMenu: 'button_2', // X
      toggleToc: 'button_9', // Start
      zoomIn: 'button_11', // R3
      zoomOut: 'button_8', // Select
      toggleTheme: 'button_0', // A
      bookmark: 'axis_2_pos', // Right Stick Right
      backToLibrary: 'button_1', // B
    },
  },
  {
    id: 'shoulder_swap',
    name: 'Shoulder Swapped (Left-Handed)',
    description: 'Left bumper LB for Next page, Right bumper RB for Previous page.',
    deadzone: 0.25,
    scrollSpeed: 14,
    invertScroll: false,
    hapticFeedback: true,
    bindings: {
      nextPage: 'button_4', // LB
      prevPage: 'button_5', // RB
      scrollDown: 'axis_1_pos', // Left Stick Down
      scrollUp: 'axis_1_neg', // Left Stick Up
      toggleDistractionFree: 'button_3', // Y
      toggleMenu: 'button_9',
      toggleToc: 'button_8',
      zoomIn: 'button_6', // LT
      zoomOut: 'button_7', // RT
      toggleTheme: 'button_2',
      bookmark: 'button_0',
      backToLibrary: 'button_1',
    },
  },
];

const STORAGE_KEY = 'handheld_reader_controller_profile';

export function loadSavedProfile(): ControllerProfile {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_PROFILES[0], ...parsed };
    }
  } catch (e) {
    console.error('Failed to load controller profile:', e);
  }
  return DEFAULT_PROFILES[0];
}

export function saveProfile(profile: ControllerProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save controller profile:', e);
  }
}

export function triggerHaptic(durationMs = 45, weakMagnitude = 0.4, strongMagnitude = 0.2): void {
  try {
    if (typeof navigator !== 'undefined' && 'getGamepads' in navigator) {
      const gamepads = navigator.getGamepads();
      for (const gp of gamepads) {
        if (!gp) continue;
        // Check vibration actuator
        if (gp.vibrationActuator && 'playEffect' in gp.vibrationActuator) {
          (gp.vibrationActuator as any).playEffect('dual-rumble', {
            startDelay: 0,
            duration: durationMs,
            weakMagnitude,
            strongMagnitude,
          }).catch(() => {});
        } else if ((gp as any).hapticActuators && (gp as any).hapticActuators.length > 0) {
          (gp as any).hapticActuators[0].pulse(weakMagnitude, durationMs).catch(() => {});
        }
      }
    }
  } catch {
    // Ignore unsupported haptic errors
  }
}
