import { RefObject, useCallback, useEffect, useRef, useState } from 'react';

interface NavOpts {
  /** Container inside which [data-nav-id] items live. */
  containerRef: RefObject<HTMLDivElement | null>;
  active: boolean;
  /** Choose an initial item id when none focused. */
  getInitialId?: () => string | null;
  onActivate: (id: string) => void;
  /** Secondary action (X / ContextMenu key) for the focused item. */
  onSecondary?: (id: string) => void;
  /** Menu action (Start). Used on the home shelf to open the focused item's menu. */
  onMenu?: (id: string) => void;
  /** Back / B — e.g. close menus. */
  onBack?: () => void;
  /** Shoulder LB — switch focus to the top toolbar / header. */
  onShoulderLeft?: () => void;
  /** Shoulder RB — switch focus to the shelf (books). */
  onShoulderRight?: () => void;
  /** Currently pressed gamepad buttons (id set), re-evaluated every frame. */
  gamepadPressed?: Set<string>;
  /**
   * When a physical gamepad is connected only the D-pad AND the left stick
   * drive the highlight (keyboard arrows are disabled so keys never move it).
   */
  isGamepadConnected?: boolean;
  /**
   * Optional override for a directional move. Return `true` to consume the
   * event (e.g. use left/right on a focused book to switch books instead of
   * moving the highlight).
   */
  onMove?: (dx: number, dy: number, focusedId: string) => boolean;
}

interface GridItem {
  id: string;
  cx: number;
  cy: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

type NavZone = 'header' | 'shelf';

function collectItems(container: HTMLElement, zone?: NavZone | null): GridItem[] {
  let scope: HTMLElement = container;
  if (zone) {
    const zoneEl = container.querySelector<HTMLElement>(`[data-nav-zone="${zone}"]`);
    if (!zoneEl) return [];
    scope = zoneEl;
  }
  const nodes = Array.from(
    scope.querySelectorAll<HTMLElement>('[data-nav-id]')
  );
  const out: GridItem[] = [];
  for (const el of nodes) {
    if (el.hasAttribute('aria-hidden') || (el as HTMLElement).style.display === 'none') {
      continue;
    }
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    out.push({
      id: el.getAttribute('data-nav-id') || '',
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      top: r.top,
      bottom: r.bottom,
      left: r.left,
      right: r.right,
    });
  }
  return out;
}

function nearestInDir(items: GridItem[], cur: GridItem, dx: number, dy: number): GridItem | null {
  let best: GridItem | null = null;
  let bestScore = Infinity;
  for (const it of items) {
    if (it.id === cur.id) continue;
    const ddx = it.cx - cur.cx;
    const ddy = it.cy - cur.cy;
    if (dx !== 0 && Math.sign(ddx) !== Math.sign(dx)) continue;
    if (dy !== 0 && Math.sign(ddy) !== Math.sign(dy)) continue;
    if (dx !== 0 && dy === 0 && Math.abs(ddy) > Math.max(60, cur.bottom - cur.top)) continue;
    if (dy !== 0 && dx === 0 && Math.abs(ddx) > Math.max(140, cur.right - cur.left) * 1.1) continue;
    const score =
      (dx !== 0 ? Math.abs(ddx) : 0) * 2 + (dy !== 0 ? Math.abs(ddy) : 0) * 2 +
      Math.abs(ddx) + Math.abs(ddy);
    if (score < bestScore) {
      bestScore = score;
      best = it;
    }
  }
  return best;
}

/**
 * Pure controller / keyboard navigation for arbitrary grids of
 * `[data-nav-id]` elements inside a container. The D-pad (buttons 12-15),
 * A/Enter (button_0), X (button_2), Start (button_9) and B (button_1) are
 * all handled here so the whole home screen works without touching it.
 * When a physical gamepad is connected only the D-pad moves the highlight —
 * the analog stick and arrow-key events are intentionally ignored.
 */
export function useControllerNav({
  containerRef,
  active,
  getInitialId,
  onActivate,
  onSecondary,
  onMenu,
  onBack,
  onShoulderLeft,
  onShoulderRight,
  gamepadPressed,
  isGamepadConnected,
  onMove,
}: NavOpts) {
  const [focusedId, setFocusedId] = useState<string | null>(() => getInitialId?.() || null);
  // Once the shoulder buttons pick a zone (top bar vs shelf), navigation is
  // locked to that zone so the D-pad/stick can never jump between them.
  const [zone, setZone] = useState<NavZone | null>(null);
  const zoneRef = useRef<NavZone | null>(null);
  const focusedIdRef = useRef(focusedId);
  const onActivateRef = useRef(onActivate);
  const onSecondaryRef = useRef(onSecondary);
  const onMenuRef = useRef(onMenu);
  const onBackRef = useRef(onBack);
  const shoulderLeftRef = useRef(onShoulderLeft);
  const shoulderRightRef = useRef(onShoulderRight);
  const onMoveRef = useRef(onMove);
  const prevPressedRef = useRef<Set<string> | null>(null);
  const lastAxisMoveRef = useRef(0);

  useEffect(() => {
    focusedIdRef.current = focusedId;
  }, [focusedId]);

  useEffect(() => {
    onActivateRef.current = onActivate;
    onSecondaryRef.current = onSecondary;
    onMenuRef.current = onMenu;
    onBackRef.current = onBack;
    shoulderLeftRef.current = onShoulderLeft;
    shoulderRightRef.current = onShoulderRight;
    onMoveRef.current = onMove;
  }, [onActivate, onSecondary, onMenu, onBack, onShoulderLeft, onShoulderRight, onMove]);

  const current = () => {
    const id = focusedIdRef.current;
    if (id) return id;
    const init = getInitialId?.() || null;
    if (init) {
      focusedIdRef.current = init;
      return init;
    }
    const items = containerRef.current ? collectItems(containerRef.current) : [];
    const first = items[0];
    if (first) {
      focusedIdRef.current = first.id;
      return first.id;
    }
    return null;
  };

  const move = useCallback(
    (dx: number, dy: number) => {
      const container = containerRef.current;
      if (!container) return;
      // Allow the host to intercept a move (e.g. left/right switches books).
      const focused = focusedIdRef.current || getInitialId?.() || null;
      if (focused && onMoveRef.current?.(dx, dy, focused)) return;
      const items = collectItems(container, zoneRef.current);
      if (!items.length) return;
      const curId = focusedIdRef.current;
      const cur = items.find((i) => i.id === curId) || items[0];
      const target = nearestInDir(items, cur, dx, dy);
      const next = target ? target.id : cur.id;
      focusedIdRef.current = next;
      setFocusedId(next);
      requestAnimationFrame(() => {
        const el = container.querySelector<HTMLElement>(`[data-nav-id="${CSS.escape(next)}"]`);
        el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      });
    },
    [containerRef, getInitialId]
  );

  const activate = useCallback(() => {
    const id = focusedIdRef.current || current();
    if (id) onActivateRef.current?.(id);
  }, [current]);

  /** Shoulder LB/RB jump: LB -> first item (top toolbar), RB -> first book
   *  on the shelf (or last item when the shelf is empty). */
  const jumpTo = useCallback(
    (edge: 'tool' | 'shelf') => {
      const container = containerRef.current;
      if (!container) return;
      const targetZone: NavZone = edge === 'tool' ? 'header' : 'shelf';
      const items = collectItems(container, targetZone);
      if (!items.length) return;
      let next: GridItem;
      if (edge === 'tool') {
        next = items[0];
      } else {
        next = items.find((i) => i.id.startsWith('book:')) || items[items.length - 1];
      }
      zoneRef.current = targetZone;
      setZone(targetZone);
      focusedIdRef.current = next.id;
      setFocusedId(next.id);
      requestAnimationFrame(() => {
        const el = container.querySelector<HTMLElement>(`[data-nav-id="${CSS.escape(next.id)}"]`);
        el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      });
    },
    [containerRef]
  );

  const secondary = useCallback(() => {
    const id = focusedIdRef.current || current();
    if (id) onSecondaryRef.current?.(id);
  }, [current]);

  const menu = useCallback(() => {
    const id = focusedIdRef.current || current();
    if (id) onMenuRef.current?.(id);
  }, [current]);

  const back = useCallback(() => {
    onBackRef.current?.();
  }, []);

  // Highlight ring follows the focused element.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.querySelectorAll('.hh-focused').forEach((el) => {
      el.classList.remove('hh-focused');
    });
    if (active && focusedId) {
      const el = container.querySelector<HTMLElement>(
        `[data-nav-id="${CSS.escape(focusedId)}"]`
      );
      el?.classList.add('hh-focused');
    }
  }, [focusedId, active, containerRef]);

  // Light up the locked zone (top bar / shelf) so the user can see where the
  // controller is currently navigating.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.querySelectorAll('.hh-zone-lit').forEach((el) => {
      el.classList.remove('hh-zone-lit');
    });
    if (active && zone) {
      container
        .querySelector<HTMLElement>(`[data-nav-zone="${zone}"]`)
        ?.classList.add('hh-zone-lit');
    }
  }, [zone, active, containerRef]);

  // Keyboard fallback — only when no physical gamepad is driving the UI.
  useEffect(() => {
    if (!active || isGamepadConnected) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          move(0, -1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          move(0, 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          move(-1, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          move(1, 0);
          break;
        case 'Enter':
          e.preventDefault();
          activate();
          break;
        case 'x':
        case 'X':
          secondary();
          break;
        case 'Escape':
          back();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, isGamepadConnected, move, activate, secondary, back]);

  // Gamepad D-pad / shoulders / A / B / X / Start rising-edge detection.
  useEffect(() => {
    if (!active || !gamepadPressed) return;
    const prev = prevPressedRef.current;
    prevPressedRef.current = gamepadPressed;
    if (!prev) return;
    const just = (id: string) => gamepadPressed.has(id) && !prev.has(id);
    if (just('button_12')) move(0, -1);
    else if (just('button_13')) move(0, 1);
    else if (just('button_14')) move(-1, 0);
    else if (just('button_15')) move(1, 0);
    else if (just('button_4')) (shoulderLeftRef.current ? shoulderLeftRef.current() : jumpTo('tool'));
    else if (just('button_5')) (shoulderRightRef.current ? shoulderRightRef.current() : jumpTo('shelf'));
    else if (just('button_0')) activate();
    else if (just('button_2')) secondary();
    else if (just('button_9')) menu();
    else if (just('button_1')) back();
  }, [active, gamepadPressed, move, jumpTo, activate, secondary, menu, back]);

  // Left analog stick navigation (repeats while held past the deadzone).
  useEffect(() => {
    if (!active || !isGamepadConnected) return;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = Date.now();
      if (now - lastAxisMoveRef.current < 230) return;
      try {
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (const gp of pads) {
          if (!gp) continue;
          const dx = gp.axes[0] ?? 0;
          const dy = gp.axes[1] ?? 0;
          if (Math.abs(dx) > 0.55 || Math.abs(dy) > 0.55) {
            if (Math.abs(dx) >= Math.abs(dy)) move(dx > 0 ? 1 : -1, 0);
            else move(0, dy > 0 ? 1 : -1);
            lastAxisMoveRef.current = now;
          }
          break;
        }
      } catch {
        /* ignore */
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, isGamepadConnected, move]);

  return {
    focusedId,
    zone,
    setFocusedId: (id: string | null) => {
      focusedIdRef.current = id;
      setFocusedId(id);
    },
  };
}
