import { createContext, memo, useContext, useEffect, useRef, useState } from 'react';
import type { Node, NodeProps } from '@xyflow/react';
import { CarreCalque, ReperesAngle } from '../design/signature';
import type { CleCouleur } from '../data/schema';
import type { Cote } from './rendu';

export interface DonneesNoeud extends Record<string, unknown> {
  libelle: string;
  cote: Cote;
  fait: boolean;
  /** Date affichée sous l'étiquette (seulement pour l'échéance urgente, ou pendant un glisser sur la frise). */
  date: string | null;
  urgent: boolean;
  selectionne: boolean;
  cible: boolean;
  origine: boolean;
  edition: boolean;
  couleur: CleCouleur;
  calque: string;
}

export type NoeudGraphe = Node<DonneesNoeud, 'centre' | 'branche' | 'feuille'>;

/** Actions stables partagées par les nœuds (renommage sur place). */
export const ContexteGraphe = createContext<{ renommer: (id: string, texte: string) => void; finEdition: () => void }>({
  renommer: () => {},
  finEdition: () => {},
});

function Renommer({ id, valeur, className }: { id: string; valeur: string; className: string }) {
  const { renommer, finEdition } = useContext(ContexteGraphe);
  const [t, setT] = useState(valeur);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  const valider = () => { renommer(id, t); finEdition(); };
  return (
    <input
      ref={ref}
      className={`renommer nodrag ${className}`}
      value={t}
      aria-label="Renommer"
      size={Math.max(4, t.length + 1)}
      onChange={(e) => setT(e.target.value)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') valider();
        if (e.key === 'Escape') finEdition();
      }}
      onBlur={valider}
    />
  );
}

function Marques({ d }: { d: DonneesNoeud }) {
  if (d.cible) return <ReperesAngle rouge />;
  if (d.selectionne) return <ReperesAngle rouge />;
  if (d.origine) return <span className="origine-relier" aria-hidden="true" />;
  return null;
}

export const NoeudCentre = memo(function NoeudCentre({ id, data }: NodeProps<NoeudGraphe>) {
  return (
    <div className="g-centre">
      <span className="g-centre-cercle">
        <CarreCalque couleur={data.couleur} taille={14} />
        <Marques d={data} />
      </span>
      {data.edition
        ? <Renommer id={id} valeur={data.libelle} className="t-label g-centre-libelle" />
        : data.libelle && <span className="t-label g-centre-libelle">{data.libelle}</span>}
    </div>
  );
});

export const NoeudBranche = memo(function NoeudBranche({ id, data }: NodeProps<NoeudGraphe>) {
  return (
    <div className={`g-branche${data.fait ? ' g-fait' : ''}${data.urgent ? ' g-urgent' : ''}`}>
      {data.edition
        ? <Renommer id={id} valeur={data.libelle} className="t-label" />
        : <span className="t-label">{data.libelle || 'Sans titre'}</span>}
      <Marques d={data} />
      {data.date && <span className={`t-cote g-date g-date-sous${data.urgent ? ' redline' : ''}`}>{data.date}</span>}
    </div>
  );
});

export const NoeudFeuille = memo(function NoeudFeuille({ id, data }: NodeProps<NoeudGraphe>) {
  return (
    <div className={`g-feuille${data.fait ? ' g-fait' : ''}${data.urgent ? ' g-urgent' : ''}`}>
      <span className="g-carre">
        {data.fait && (
          <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden="true"><path d="M1.5 1.5l6 6m0-6-6 6" /></svg>
        )}
      </span>
      <span className="g-reperes-feuille"><Marques d={data} /></span>
      <span className={`g-etiquette g-${data.cote}`}>
        {data.edition
          ? <Renommer id={id} valeur={data.libelle} className="t-corps" />
          : <span className="t-corps">{data.libelle || 'Sans titre'}</span>}
        {data.date && <span className={`t-cote g-date${data.urgent ? ' redline' : ''}`}>{data.date}</span>}
      </span>
    </div>
  );
});

export const TYPES_NOEUDS = { centre: NoeudCentre, branche: NoeudBranche, feuille: NoeudFeuille };
