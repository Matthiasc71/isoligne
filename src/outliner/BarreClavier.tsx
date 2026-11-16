import { useEffect, useState, type ReactNode } from 'react';
import { IcCocher, IcCouleur, IcDate, IcDesindenter, IcIndenter, IcSuite } from '../design/icones';

/** Distance entre le bas de la fenêtre et le haut du clavier virtuel. */
function useHauteurClavier(): number {
  const [h, setH] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const maj = () => setH(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    maj();
    vv.addEventListener('resize', maj);
    vv.addEventListener('scroll', maj);
    return () => { vv.removeEventListener('resize', maj); vv.removeEventListener('scroll', maj); };
  }, []);
  return h;
}

function Bouton({ libelle, onAction, children }: { libelle: string; onAction: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      className="bouton-icone sans-cadre"
      aria-label={libelle}
      // Garder le focus (et le clavier) dans le champ en cours d'édition.
      onPointerDown={(e) => e.preventDefault()}
      onClick={onAction}
    >
      {children}
    </button>
  );
}

/** Petite barre au-dessus du clavier de l'iPhone : icônes seules. */
export function BarreClavier({
  onIndenter, onDesindenter, onCocher, onDate, onCouleur, onDetails,
}: {
  onDetails: () => void;
  onIndenter: () => void;
  onDesindenter: () => void;
  onCocher: () => void;
  onDate: () => void;
  onCouleur: () => void;
}) {
  const bas = useHauteurClavier();
  return (
    <div className="barre-clavier" role="toolbar" aria-label="Outils de l'élément" style={{ bottom: bas }}>
      <Bouton libelle="Désindenter" onAction={onDesindenter}><IcDesindenter /></Bouton>
      <Bouton libelle="Indenter" onAction={onIndenter}><IcIndenter /></Bouton>
      <Bouton libelle="Cocher" onAction={onCocher}><IcCocher /></Bouton>
      <Bouton libelle="Échéance" onAction={onDate}><IcDate /></Bouton>
      <Bouton libelle="Couleur" onAction={onCouleur}><IcCouleur /></Bouton>
      <Bouton libelle="Détails" onAction={onDetails}><IcSuite /></Bouton>
    </div>
  );
}
