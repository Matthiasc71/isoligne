import { useEffect, useState } from 'react';
import { Feuille } from '../ui/ui';
import { EVENEMENT_AIDE } from './Palette';

const MAC = /Mac|iPhone|iPad/.test(navigator.platform);
const CMD = MAC ? '⌘' : 'Ctrl';

export const GESTES: [string, string][] = [
  ['Balayer une ligne à droite · à gauche', 'Indenter · désindenter'],
  ['Toucher le numéro', 'Détails de la ligne'],
  ['Appui long sur le numéro', 'Déplacer la ligne'],
  ['Appui long sur un projet', 'Actions du projet'],
  ['Calendrier : appui long sur une échéance, puis glisser', 'La déplacer à un autre jour'],
  ['Calendrier : balayer la grille', 'Mois précédent · suivant'],
  ['Graphe : glisser un nœud et s’arrêter 0,3 s sur un autre', 'Le rattacher'],
  ['Graphe : glisser un nœud ailleurs', 'L’épingler'],
  ['Planche : deux doigts', 'Défiler sans dessiner'],
];

export const RACCOURCIS: [string, string][] = [
  [`${CMD}+K`, 'Palette de commandes'],
  ['Entrée', 'Nouvel élément'],
  ['Tab · Maj+Tab', 'Indenter · désindenter'],
  ['Alt+↑ · Alt+↓', 'Déplacer'],
  [`${CMD}+Entrée`, 'Tâche, puis cocher'],
  ['Retour arrière (début)', 'Fusionner avec le précédent'],
  [`${CMD}+.`, 'Replier · déplier'],
  [`${CMD}+→ · ${CMD}+←`, 'Ouvrir la branche · remonter'],
  [`${CMD}+Z · ${CMD}+Maj+Z`, 'Annuler · rétablir'],
  ['Calendrier : flèches', 'Jour précédent · suivant, semaine'],
  ['Calendrier : Page préc. · Page suiv.', 'Mois précédent · suivant'],
  ['Calendrier : T', 'Aujourd’hui'],
  ['?', 'Cette aide'],
];

function Liste({ titre, lignes }: { titre: string; lignes: [string, string][] }) {
  return (
    <section className="aide-section" aria-label={titre}>
      <h3 className="t-label">{titre}</h3>
      <dl className="raccourcis">
        {lignes.map(([touche, action]) => (
          <div key={touche} className="raccourci">
            <dt className="t-cote">{touche}</dt>
            <dd className="t-corps">{action}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Page « Gestes et raccourcis » : touche « ? » hors des champs, palette, ou Réglages → Aide. */
export function Raccourcis() {
  const [ouverte, setOuverte] = useState(false);
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      if (cible?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (e.key === '?') { e.preventDefault(); setOuverte((o) => !o); }
    };
    const ouvrir = () => setOuverte(true);
    window.addEventListener('keydown', f);
    window.addEventListener(EVENEMENT_AIDE, ouvrir);
    return () => { window.removeEventListener('keydown', f); window.removeEventListener(EVENEMENT_AIDE, ouvrir); };
  }, []);
  const tactile = matchMedia('(pointer: coarse)').matches;
  const listes = [<Liste key="g" titre="Gestes (iPhone)" lignes={GESTES} />, <Liste key="r" titre="Raccourcis (ordinateur)" lignes={RACCOURCIS} />];
  return (
    <Feuille ouverte={ouverte} onFermer={() => setOuverte(false)} titre="Gestes et raccourcis">
      {tactile ? listes : [...listes].reverse()}
    </Feuille>
  );
}
