import type { DateLocale, Rappel } from '../data/schema';
import { dateCourte, decouper } from '../time/dates';
import './notif.css';

const RAPPELS: { valeur: Rappel; libelle: string; court: string }[] = [
  { valeur: 'J-7', libelle: 'J-7', court: 'J-7' },
  { valeur: 'J-1', libelle: 'J-1', court: 'J-1' },
  { valeur: 'J9h', libelle: 'Jour J, 9 h', court: '9 h' },
  { valeur: 'H-1', libelle: '1 h avant', court: '1 h avant' },
];

/** « J-7 · J-1 · 9 h », ou « Aucun rappel ». */
export function resumeRappels(r: readonly Rappel[], perso: DateLocale | null = null, avecHeure = true): string {
  const parts = RAPPELS.filter((x) => r.includes(x.valeur) && (x.valeur !== 'H-1' || avecHeure)).map((x) => x.court);
  if (perso) {
    const p = decouper(perso);
    parts.push(`${dateCourte(perso)}${p.heure !== null ? ` ${String(p.heure).padStart(2, '0')}:${String(p.minute ?? 0).padStart(2, '0')}` : ''}`);
  }
  return parts.length ? parts.join(' · ') : 'Aucun rappel';
}

/**
 * Cases de rappel (44 px). « 1 h avant » seulement si l'échéance a une heure ;
 * rappel personnalisé (date et heure) si `perso` est fourni.
 */
export function ChoixRappels({
  valeurs, onChange, avecHeure, perso, onPerso, idPerso = 'rappel-perso',
}: {
  valeurs: readonly Rappel[];
  onChange: (r: Rappel[]) => void;
  avecHeure: boolean;
  perso?: DateLocale | null;
  onPerso?: (d: DateLocale | null) => void;
  idPerso?: string;
}) {
  return (
    <>
      <div className="rappels" role="group" aria-label="Rappels">
        {RAPPELS.filter((r) => r.valeur !== 'H-1' || avecHeure).map((r) => {
          const actif = valeurs.includes(r.valeur);
          return (
            <button key={r.valeur} type="button" role="checkbox" aria-checked={actif}
              className={`rappel t-cote${actif ? ' actif' : ''}`}
              onClick={() => onChange(actif ? valeurs.filter((x) => x !== r.valeur) : [...valeurs, r.valeur])}>
              {r.libelle}
            </button>
          );
        })}
      </div>
      {onPerso && (
        <div className="rappel-perso">
          <label className="t-cote" htmlFor={idPerso}>Rappel personnalisé</label>
          <input id={idPerso} type="datetime-local" className="champ t-corps" value={perso ?? ''}
            onChange={(e) => onPerso(e.target.value ? e.target.value.slice(0, 16) : null)} />
        </div>
      )}
    </>
  );
}
