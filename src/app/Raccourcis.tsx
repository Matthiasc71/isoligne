import { useEffect, useState } from 'react';
import { Feuille } from '../ui/ui';

const MAC = /Mac|iPhone|iPad/.test(navigator.platform);
const CMD = MAC ? '⌘' : 'Ctrl';

const RACCOURCIS: [string, string][] = [
  ['Entrée', 'Nouvel élément'],
  ['Tab · Maj+Tab', 'Indenter · désindenter'],
  ['Alt+↑ · Alt+↓', 'Déplacer'],
  [`${CMD}+Entrée`, 'Tâche, puis cocher'],
  ['Retour arrière (début)', 'Fusionner avec le précédent'],
  [`${CMD}+.`, 'Replier · déplier'],
  [`${CMD}+→ · ${CMD}+←`, 'Ouvrir la branche · remonter'],
  [`${CMD}+Z · ${CMD}+Maj+Z`, 'Annuler · rétablir'],
  [`${CMD}+K`, 'Ajouter'],
  ['?', 'Cette aide'],
];

/** Aide des raccourcis clavier (touche « ? » hors des champs de saisie). */
export function Raccourcis() {
  const [ouverte, setOuverte] = useState(false);
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      if (cible?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (e.key === '?') { e.preventDefault(); setOuverte((o) => !o); }
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, []);
  return (
    <Feuille ouverte={ouverte} onFermer={() => setOuverte(false)} titre="Raccourcis">
      <dl className="raccourcis">
        {RACCOURCIS.map(([touche, action]) => (
          <div key={touche} className="raccourci">
            <dt className="t-cote">{touche}</dt>
            <dd className="t-corps">{action}</dd>
          </div>
        ))}
      </dl>
    </Feuille>
  );
}
