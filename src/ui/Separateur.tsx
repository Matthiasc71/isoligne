import { useRef, type KeyboardEvent, type PointerEvent } from 'react';

/**
 * Poignée de redimensionnement entre deux colonnes (ordinateur).
 * Souris ou doigt pour glisser ; flèches gauche/droite au clavier.
 */
export function Separateur({
  valeur, min, max, onChange, libelle, sens = 1,
}: {
  valeur: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  libelle: string;
  /** 1 : glisser vers la droite agrandit ; -1 : glisser vers la droite rétrécit (colonne de droite). */
  sens?: 1 | -1;
}) {
  const depart = useRef<{ x: number; v: number } | null>(null);
  const borner = (v: number) => Math.round(Math.max(min, Math.min(max, v)));
  const bas = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    depart.current = { x: e.clientX, v: valeur };
  };
  const bouger = (e: PointerEvent<HTMLDivElement>) => {
    if (depart.current) onChange(borner(depart.current.v + (e.clientX - depart.current.x) * sens));
  };
  const touche = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      onChange(borner(valeur + (e.key === 'ArrowRight' ? 24 : -24) * sens));
    }
  };
  return (
    <div
      className="separateur"
      role="separator"
      aria-orientation="vertical"
      aria-label={libelle}
      aria-valuenow={valeur}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={bas}
      onPointerMove={bouger}
      onPointerUp={() => { depart.current = null; }}
      onPointerCancel={() => { depart.current = null; }}
      onKeyDown={touche}
    />
  );
}
