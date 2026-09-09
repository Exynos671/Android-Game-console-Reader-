import { ControllerProfile, ReaderAction } from '../types';

export interface GamepadButtonInfo {
  id: string;
  name: string;
  shortName: string;
  category: 'bumper' | 'trigger' | 'face' | 'dpad' | 'stick' | 'system';
}

export const GAMEPAD_INPUTS: Record<string, GamepadButtonInfo> = {
  button_0: { id: 'button_0', name: 'A / 确认 (A 键)', shortName: 'A', category: 'face' },
  button_1: { id: 'button_1', name: 'B / 返回 (B 键)', shortName: 'B', category: 'face' },
  button_2: { id: 'button_2', name: 'X / 功能 (X 键)', shortName: 'X', category: 'face' },
  button_3: { id: 'button_3', name: 'Y / 沉浸 (Y 键)', shortName: 'Y', category: 'face' },
  button_4: { id: 'button_4', name: 'LB / L1 (左肩键)', shortName: 'LB', category: 'bumper' },
  button_5: { id: 'button_5', name: 'RB / R1 (右肩键)', shortName: 'RB', category: 'bumper' },
  button_6: { id: 'button_6', name: 'LT / L2 (左扳机)', shortName: 'LT', category: 'trigger' },
  button_7: { id: 'button_7', name: 'RT / R2 (右扳机)', shortName: 'RT', category: 'trigger' },
  button_8: { id: 'button_8', name: 'Select / 选择 / 视图', shortName: '选择', category: 'system' },
  button_9: { id: 'button_9', name: 'Start / 开始 / 菜单', shortName: '菜单', category: 'system' },
  button_10: { id: 'button_10', name: 'L3 (左摇杆下压)', shortName: 'L3', category: 'stick' },
  button_11: { id: 'button_11', name: 'R3 (右摇杆下压)', shortName: 'R3', category: 'stick' },
  button_12: { id: 'button_12', name: '十字键 - 上', shortName: '↑', category: 'dpad' },
  button_13: { id: 'button_13', name: '十字键 - 下', shortName: '↓', category: 'dpad' },
  button_14: { id: 'button_14', name: '十字键 - 左', shortName: '←', category: 'dpad' },
  button_15: { id: 'button_15', name: '十字键 - 右', shortName: '→', category: 'dpad' },
  axis_0_neg: { id: 'axis_0_neg', name: '左摇杆 - 向左', shortName: '左摇杆 ←', category: 'stick' },
  axis_0_pos: { id: 'axis_0_pos', name: '左摇杆 - 向右', shortName: '左摇杆 →', category: 'stick' },
  axis_1_neg: { id: 'axis_1_neg', name: '左摇杆 - 向上', shortName: '左摇杆 ↑', category: 'stick' },
  axis_1_pos: { id: 'axis_1_pos', name: '左摇杆 - 向下', shortName: '左摇杆 ↓', category: 'stick' },
  axis_2_neg: { id: 'axis_2_neg', name: '右摇杆 - 向左', shortName: '右摇杆 ←', category: 'stick' },
  axis_2_pos: { id: 'axis_2_pos', name: '右摇杆 - 向右', shortName: '右摇杆 →', category: 'stick' },
  axis_3_neg: { id: 'axis_3_neg', name: '右摇杆 - 向上', shortName: '右摇杆 ↑', category: 'stick' },
  axis_3_pos: { id: 'axis_3_pos', name: '右摇杆 - 向下', shortName: '右摇杆 ↓', category: 'stick' },
};

export const ACTION_DESCRIPTIONS: Record<ReaderAction, { label: string; description: string; defaultKey: string }> = {
  nextPage: {
    label: '下一页 / 下一画格',
    description: '向前翻页或切换下一分镜，最舒适的指尖操作',
    defaultKey: '方向右键 / E / PageDown',
  },
  prevPage: {
    label: '上一页 / 上一画格',
    description: '向后翻页或返回上一分镜',
    defaultKey: '方向左键 / Q / PageUp',
  },
  scrollDown: {
    label: '向下平滑滚动',
    description: '平滑滚动文本、条漫长图或放大查看画面',
    defaultKey: '方向下键 / S',
  },
  scrollUp: {
    label: '向上平滑滚动',
    description: '平滑向上回滚内容',
    defaultKey: '方向上键 / W',
  },
  toggleDistractionFree: {
    label: '沉浸无干扰模式',
    description: '隐藏所有工具栏与按键提示，全屏专注阅读',
    defaultKey: 'F / 空格键',
  },
  toggleMenu: {
    label: '打开阅读排版菜单',
    description: '呼出字体、字号、夜间滤镜与排版抽屉',
    defaultKey: 'Esc / M',
  },
  toggleToc: {
    label: '目录与书签',
    description: '快速浏览全书目录并跳转至指定章节或书签',
    defaultKey: 'T',
  },
  zoomIn: {
    label: '放大字号 / 画面',
    description: '增大阅读字号或放大漫画画面',
    defaultKey: '+ / =',
  },
  zoomOut: {
    label: '缩小字号 / 画面',
    description: '减小阅读字号或缩小漫画画面',
    defaultKey: '-',
  },
  toggleTheme: {
    label: '快速循环阅读主题',
    description: '在 OLED纯黑、暗夜深灰、羊皮纸、浅白纸张间切换',
    defaultKey: 'C',
  },
  bookmark: {
    label: '添加 / 取消书签',
    description: '快速为当前阅读位置添加或移除书签',
    defaultKey: 'B',
  },
  backToLibrary: {
    label: '退出返回书库',
    description: '保存当前进度并回到图书书架首页',
    defaultKey: '退格键 / L',
  },
};

export const DEFAULT_PROFILES: ControllerProfile[] = [
  {
    id: 'default_handheld',
    name: '掌机标准预设 (RB / LB 翻页)',
    description: '经典掌机工学：RB 下一页，LB 上一页，右摇杆平滑滚动，Y 键切换全屏沉浸模式。',
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
    name: '复古十字键与正面按键预设',
    description: '适合 Miyoo Mini、RG353 等紧凑复古机型：十字键右键翻页，左键回翻，下键向下浏览。',
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
    name: '单手握持模式 (右手专属)',
    description: '懒人单手阅读：右手握住掌机时，RB/RT 负责翻页与上一页，A/B/X 按键覆盖主要功能。',
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
    name: '肩键对调预设 (左手习惯)',
    description: '专为左手习惯设计：左肩键 LB 翻到下一页，右肩键 RB 翻到上一页。',
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
