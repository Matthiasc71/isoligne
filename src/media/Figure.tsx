import { memo, useMemo } from 'react';
import { HAUTEUR, LARGEUR, cheminTrait, type Trait } from './croquis';
import './medias.css';

/** Tracé vectoriel d'un croquis (lecture seule) : les traits suivent le thème. */
export const Traits = memo(function Traits({ traits, nouveaux }: { traits: Trait[]; nouveaux?: ReadonlySet<string> }) {
  const chemins = useMemo(() => traits.map((t) => ({ id: t.id, c: t.c, d: cheminTrait(t) })), [traits]);
  return (
    <>
      {chemins.map((t) => (
        <path key={t.id} d={t.d} className={`encre-${t.c}${nouveaux?.has(t.id) ? ' trait-nouveau' : ''}`} />
      ))}
    </>
  );
});

/** Figure de la page : repères d'angle, tracé, « FIG. n — légende ». */
export function Figure({
  traits, numero, legende, onOuvrir,
}: { traits: Trait[]; numero: number; legende: string; onOuvrir: () => void }) {
  const description = `FIG. ${numero}${legende ? `, ${legende}` : ''}, ${traits.length} ${traits.length > 1 ? 'traits' : 'trait'}. Ouvrir la planche`;
  return (
    <figure className="figure">
      <button type="button" className="figure-dessin" onClick={onOuvrir} aria-label={description}>
        <svg viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`} aria-hidden="true" focusable="false">
          <Traits traits={traits} />
        </svg>
        <span className="reperes" aria-hidden="true"><i /><i /><i /><i /></span>
      </button>
      <figcaption className="t-cote figure-legende">
        FIG. {numero}{legende && <> — {legende}</>}
      </figcaption>
    </figure>
  );
}
