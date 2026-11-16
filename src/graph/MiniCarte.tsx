import { useStore, useReactFlow } from '@xyflow/react';
import type { MouseEvent } from 'react';
import type { Plan } from './dispositions';
import type { Point } from './liens';

const L = 160;
const H = 110;

/** Mini-carte (ordinateur) : points du plan et cadre visible ; un clic recentre la vue. */
export function MiniCarte({ plan, affiche }: { plan: Plan; affiche: Map<string, Point> }) {
  const [tx, ty, zoom] = useStore((s) => s.transform);
  const largeur = useStore((s) => s.width);
  const hauteur = useStore((s) => s.height);
  const flow = useReactFlow();
  const points = plan.noeuds.map((n) => affiche.get(n.id) ?? n);
  if (!points.length) return null;
  const vue = { x: -tx / zoom, y: -ty / zoom, l: largeur / zoom, h: hauteur / zoom };
  const x0 = Math.min(vue.x, ...points.map((p) => p.x)) - 40;
  const y0 = Math.min(vue.y, ...points.map((p) => p.y)) - 40;
  const x1 = Math.max(vue.x + vue.l, ...points.map((p) => p.x)) + 40;
  const y1 = Math.max(vue.y + vue.h, ...points.map((p) => p.y)) + 40;
  const k = Math.min(L / (x1 - x0), H / (y1 - y0));
  const cliquer = (e: MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = x0 + (e.clientX - r.left) / k;
    const y = y0 + (e.clientY - r.top) / k;
    void flow.setCenter(x, y, { zoom, duration: 200 });
  };
  return (
    <svg className="minicarte" width={L} height={H} role="img" aria-label="Mini-carte" onClick={cliquer}>
      {points.map((p, i) => (
        <rect key={i} x={(p.x - x0) * k - 1.5} y={(p.y - y0) * k - 1.5} width={3} height={3} className="minicarte-point" />
      ))}
      <rect x={(vue.x - x0) * k} y={(vue.y - y0) * k} width={vue.l * k} height={vue.h * k} className="minicarte-vue" />
    </svg>
  );
}
