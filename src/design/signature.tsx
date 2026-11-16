import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { formaterCalque, LIBELLES_COULEUR, type CleCouleur } from '../data/schema';
import './signature.css';

/** Grille de construction fixe : 12 px (mineure) et 60 px (majeure). */
export function Grille() {
  return (
    <svg className="grille" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="grille-mineure" width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M12 .5H.5V12" fill="none" stroke="var(--grille-mineure)" strokeWidth="1" />
        </pattern>
        <pattern id="grille-majeure" width="60" height="60" patternUnits="userSpaceOnUse">
          <rect width="60" height="60" fill="url(#grille-mineure)" />
          <path d="M60 .5H.5V60" fill="none" stroke="var(--grille-majeure)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grille-majeure)" />
    </svg>
  );
}

/** Petit carré plein de la couleur du calque, toujours accompagné de son numéro ou d'un titre. */
export function CarreCalque({ couleur, taille = 10 }: { couleur: CleCouleur; taille?: number }) {
  return (
    <span
      className="carre-calque"
      style={{ width: taille, height: taille, ['--c' as string]: `var(--calque-${couleur})` }}
      aria-hidden="true"
    />
  );
}

export function Calque({ couleur, calque }: { couleur: CleCouleur; calque: number }) {
  return (
    <span className="calque t-cote" role="img" aria-label={`Calque ${formaterCalque(calque)}, ${LIBELLES_COULEUR[couleur]}`}>
      <CarreCalque couleur={couleur} />
      <span aria-hidden="true">{formaterCalque(calque)}</span>
    </span>
  );
}

/** Ligne de cote d'avancement : flèches aux extrémités, trait épais jusqu'à l'avancement. */
export function CoteAvancement({ faites, total }: { faites: number; total: number }) {
  const p = total ? Math.round((faites / total) * 100) : 0;
  return (
    <div className="cote-avancement" role="img" aria-label={`Avancement ${p} %, ${faites} tâches faites sur ${total}`}>
      <svg className="cote-trace" height="12" aria-hidden="true">
        <line x1="0.5" y1="2" x2="0.5" y2="10" className="cote-borne" />
        <line x1="0" y1="6" x2="100%" y2="6" className="cote-pointille" />
        {p > 0 && (
          <>
            <line x1="0" y1="6" x2={`${p}%`} y2="6" className="cote-plein" pathLength={1} />
            <svg x={`${p}%`} overflow="visible">
              <path d="M-6 3 0 6 -6 9" className="cote-fleche" />
            </svg>
            <path d="M6 3 0 6 6 9" className="cote-fleche" />
          </>
        )}
        <line x1="100%" y1="2" x2="100%" y2="10" className="cote-borne" transform="translate(-0.5 0)" />
      </svg>
      <span className="t-cote cote-valeur" aria-hidden="true">{p} %</span>
    </div>
  );
}

/** Cote horizontale entre deux bornes, avec une valeur au milieu (« 3 j »). */
export function CoteDistance({ valeur, rouge = false }: { valeur: string; rouge?: boolean }) {
  return (
    <div className={`cote-distance t-cote${rouge ? ' redline' : ''}`} aria-hidden="true">
      <svg width="8" height="12"><path d="M.5 1v10M7 3 1 6l6 3" /></svg>
      <span className="cote-distance-trait trace" />
      <span>{valeur}</span>
      <span className="cote-distance-trait trace" />
      <svg width="8" height="12"><path d="M7.5 1v10M1 3l6 3-6 3" /></svg>
    </div>
  );
}

function cheminNuage(l: number, h: number, r = 4.5): string {
  const n = (longueur: number) => Math.max(2, Math.round(longueur / (r * 2)));
  const nx = n(l);
  const ny = n(h);
  const sx = l / nx;
  const sy = h / ny;
  let d = `M0 0`;
  for (let i = 0; i < nx; i++) d += ` a${sx / 2} ${sx / 2.4} 0 0 1 ${sx} 0`;
  for (let i = 0; i < ny; i++) d += ` a${sy / 2.4} ${sy / 2} 0 0 1 0 ${sy}`;
  for (let i = 0; i < nx; i++) d += ` a${sx / 2} ${sx / 2.4} 0 0 1 ${-sx} 0`;
  for (let i = 0; i < ny; i++) d += ` a${sy / 2.4} ${sy / 2} 0 0 1 0 ${-sy}`;
  return `${d}Z`;
}

/** Nuage de révision rouge autour de l'échéance la plus urgente. */
export function Nuage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [taille, setTaille] = useState<{ l: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mesurer = () => setTaille({ l: el.offsetWidth, h: el.offsetHeight });
    mesurer();
    const ro = new ResizeObserver(mesurer);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <span className="nuage redline" ref={ref}>
      {taille && (
        <svg className="nuage-trace" width={taille.l + 10} height={taille.h + 10} aria-hidden="true">
          <path d={cheminNuage(taille.l, taille.h)} transform="translate(5 5)" pathLength={1} />
        </svg>
      )}
      {children}
    </span>
  );
}

/** Quatre équerres aux angles (figures, sélection). */
export function ReperesAngle({ rouge = false }: { rouge?: boolean }) {
  return (
    <span className={`reperes${rouge ? ' reperes-rouges' : ''}`} aria-hidden="true">
      <i /><i /><i /><i />
    </span>
  );
}

/** Case à cocher carrée : cocher trace une croix. */
export function CaseACocher({
  coche, onChange, libelle,
}: { coche: boolean; onChange: () => void; libelle: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={coche}
      aria-label={libelle}
      className="case"
      onClick={onChange}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <rect x=".5" y=".5" width="15" height="15" className="case-cadre" />
        {coche && (
          <g className="case-croix">
            <line x1="3.5" y1="3.5" x2="12.5" y2="12.5" pathLength={1} />
            <line x1="12.5" y1="3.5" x2="3.5" y2="12.5" pathLength={1} />
          </g>
        )}
      </svg>
    </button>
  );
}
