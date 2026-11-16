import { useRef, type PointerEvent as RPointerEvent } from 'react';

/**
 * Appui long (450 ms sans bouger) sur un élément. Le clic qui suit est
 * neutralisé. Le clic droit (ordinateur) déclenche la même action.
 */
export function useAppuiLong(action: () => void, delai = 450) {
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);
  const depart = useRef<{ x: number; y: number } | null>(null);
  const declenche = useRef(false);

  const annuler = () => {
    if (minuterie.current) clearTimeout(minuterie.current);
    minuterie.current = null;
  };

  return {
    onPointerDown: (e: RPointerEvent) => {
      if (e.pointerType === 'mouse') return;
      declenche.current = false;
      depart.current = { x: e.clientX, y: e.clientY };
      annuler();
      minuterie.current = setTimeout(() => {
        declenche.current = true;
        navigator.vibrate?.(10);
        action();
      }, delai);
    },
    onPointerMove: (e: RPointerEvent) => {
      const d = depart.current;
      if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8) annuler();
    },
    onPointerUp: annuler,
    onPointerCancel: annuler,
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      if (!declenche.current) action();
    },
    onClickCapture: (e: React.MouseEvent) => {
      if (declenche.current) { e.preventDefault(); e.stopPropagation(); declenche.current = false; }
    },
  };
}
