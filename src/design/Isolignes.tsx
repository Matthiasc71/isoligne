import { memo } from 'react';
import './isolignes.css';

/**
 * Deux courbes de niveau sous le titre (le nom « Isoligne »). Chaque courbe est
 * périodique sur L : dessinée sur 2 L, elle glisse d'une période en boucle, sans
 * couture. Animation CSS (transform), arrêtée si l'on réduit les animations.
 */
const L = 320;
const H = 28;

function y(x: number, base: number, a: number, b: number, phase: number): number {
  return base + a * Math.sin((2 * Math.PI * x) / L + phase) + b * Math.sin((4 * Math.PI * x) / L + phase * 1.7);
}

function chemin(base: number, a: number, b: number, phase: number): string {
  let d = '';
  for (let x = 0; x <= 2 * L; x += 4) d += `${x ? 'L' : 'M'}${x} ${y(x, base, a, b, phase).toFixed(2)}`;
  return d;
}

const A = chemin(11, 3.2, 1.6, 0);
const B = chemin(19, 2.6, 1.4, 2.1);
const POINT = 96;

export const Isolignes = memo(function Isolignes() {
  return (
    <svg className="isolignes" viewBox={`0 0 ${L} ${H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <g className="iso-a">
        <path d={A} />
        {[POINT, POINT + L].map((x) => <rect key={x} className="iso-point" x={x - 2.5} y={y(x, 11, 3.2, 1.6, 0) - 2.5} width="5" height="5" />)}
      </g>
      <g className="iso-b"><path d={B} /></g>
    </svg>
  );
});
