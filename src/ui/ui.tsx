import {
  forwardRef, useEffect, useRef, type ButtonHTMLAttributes, type ReactNode,
} from 'react';
import { IcFermer } from '../design/icones';
import './ui.css';

type BoutonIconeProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  libelle: string;
  actif?: boolean;
  rouge?: boolean;
  sansCadre?: boolean;
  children: ReactNode;
};

/** Bouton icône seule : carré de 48 px, libellé pour VoiceOver et info-bulle sur ordinateur. */
export const BoutonIcone = forwardRef<HTMLButtonElement, BoutonIconeProps>(function BoutonIcone(
  { libelle, actif = false, rouge = false, sansCadre = false, className = '', children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={libelle}
      title={libelle}
      className={`bouton-icone${actif ? ' actif' : ''}${rouge ? ' rouge' : ''}${sansCadre ? ' sans-cadre' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

/** Feuille du bas (dialogue modal) : même papier que l'écran, un trait au-dessus, pas d'assombrissement. */
export function Feuille({
  ouverte, onFermer, titre, children, titreVisible = true,
}: {
  ouverte: boolean;
  onFermer: () => void;
  titre: string;
  children: ReactNode;
  titreVisible?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (ouverte && !d.open) d.showModal();
    if (!ouverte && d.open) d.close();
  }, [ouverte]);
  return (
    <dialog
      ref={ref}
      className="feuille"
      aria-label={titre}
      onClose={onFermer}
      onCancel={(e) => { e.preventDefault(); onFermer(); }}
      onClick={(e) => { if (e.target === ref.current) onFermer(); }}
    >
      {ouverte && (
        <div className="feuille-corps">
          <div className="feuille-tete">
            <h2 className={titreVisible ? 't-label' : 'visuellement-cache'}>{titre}</h2>
            <BoutonIcone libelle="Fermer" sansCadre onClick={onFermer}><IcFermer /></BoutonIcone>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

/** Ligne de choix dans une feuille (bouton plein largeur, 48 px). */
export function Choix({
  children, onClick, actif = false, rouge = false, icone, role, ...rest
}: {
  children: ReactNode;
  onClick: () => void;
  actif?: boolean;
  rouge?: boolean;
  icone?: ReactNode;
  role?: string;
  'aria-checked'?: boolean;
}) {
  return (
    <button
      type="button"
      role={role}
      className={`choix${actif ? ' actif' : ''}${rouge ? ' redline' : ''}`}
      onClick={onClick}
      {...rest}
    >
      {icone}
      <span>{children}</span>
    </button>
  );
}

/** Groupe segmenté (tri, type, thème) : l'option active est remplie. */
export function Segments<T extends string>({
  options, valeur, onChange, libelle,
}: {
  options: readonly { valeur: T; libelle: string }[];
  valeur: T;
  onChange: (v: T) => void;
  libelle: string;
}) {
  return (
    <div className="segments" role="radiogroup" aria-label={libelle}>
      {options.map((o) => (
        <button
          key={o.valeur}
          type="button"
          role="radio"
          aria-checked={o.valeur === valeur}
          className={`segment t-label${o.valeur === valeur ? ' actif' : ''}`}
          onClick={() => onChange(o.valeur)}
        >
          {o.libelle}
        </button>
      ))}
    </div>
  );
}

/** Message éphémère avec action (« Supprimé · Annuler »). */
export function Avis({ texte, action, onAction, onFin }: {
  texte: string; action?: string; onAction?: () => void; onFin: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onFin, 6000);
    return () => clearTimeout(t);
  }, [onFin, texte]);
  return (
    <div className="avis" role="status">
      <span className="t-cote">{texte}</span>
      {action && onAction && (
        <button type="button" className="avis-action t-label" onClick={() => { onAction(); onFin(); }}>{action}</button>
      )}
    </div>
  );
}
