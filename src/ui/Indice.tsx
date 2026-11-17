import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useStockage } from '../app/contexte';

export type CleIndice = 'nomenclature' | 'calendrier' | 'graphe' | 'planche';
const EVENEMENT = 'isoligne:geste';

/** Le geste a été fait : son indice ne s'affiche plus. */
export function signalerGeste(cle: CleIndice): void {
  window.dispatchEvent(new CustomEvent<CleIndice>(EVENEMENT, { detail: cle }));
}

/** Retient les gestes faits, même quand aucun indice n'est affiché. */
export function SuiviGestes() {
  const stockage = useStockage();
  useEffect(() => {
    const f = (e: Event) => {
      const cle = (e as CustomEvent<CleIndice>).detail;
      void stockage.reglage<CleIndice[]>('indicesVus', []).then((vus) => {
        if (!vus.includes(cle)) void stockage.poserReglage('indicesVus', [...vus, cle]);
      });
    };
    window.addEventListener(EVENEMENT, f);
    return () => window.removeEventListener(EVENEMENT, f);
  }, [stockage]);
  return null;
}

/**
 * Indice au premier usage (écran tactile) : une ligne de cote et « Compris »,
 * une seule fois, effacé aussi dès que le geste a été fait (brief bonus §7).
 */
export function Indice({ cle, texte }: { cle: CleIndice; texte: string }) {
  const stockage = useStockage();
  const vus = useLiveQuery(() => stockage.reglage<CleIndice[]>('indicesVus', []), [stockage]);
  const [tactile] = useState(() => matchMedia('(pointer: coarse)').matches);
  if (!tactile || !vus || vus.includes(cle)) return null;
  return (
    <p className="indice t-cote" role="note">
      <span>{texte}</span>
      <button type="button" className="t-label lien-action" onClick={() => void stockage.poserReglage('indicesVus', [...vus, cle])}>Compris</button>
    </p>
  );
}
