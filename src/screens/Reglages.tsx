import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useStockage } from '../app/contexte';
import { aller } from '../app/route';
import { appliquerTheme, type Theme } from '../app/theme';
import { IcRetour } from '../design/icones';
import { BoutonIcone, Segments } from '../ui/ui';
import { SectionSynchro } from './Synchro';
import { SectionNotifications } from './Notifications';
import { SectionDonnees } from './Donnees';
import { SectionPartages } from '../partage/FeuillePartage';
import './secondaires.css';

const LICENCES = [
  'React (MIT)', 'Yjs, y-indexeddb (MIT)', 'Dexie (Apache 2.0)', 'TipTap, ProseMirror (MIT)',
  'fractional-indexing (CC0)', 'date-fns (MIT)', 'Workbox (MIT)',
  'MiniSearch, fflate (MIT)', 'Archivo, B612, B612 Mono (SIL OFL 1.1)',
];

export default function Reglages() {
  const stockage = useStockage();
  const theme = useLiveQuery(() => stockage.reglage<Theme>('theme', 'auto'), [stockage]) ?? 'auto';
  const [protege, setProtege] = useState<boolean | null>(null);
  const [usage, setUsage] = useState<string | null>(null);

  useEffect(() => {
    void navigator.storage?.persisted?.().then(setProtege);
    void navigator.storage?.estimate?.().then((e) => {
      if (e.usage !== undefined) setUsage(`${(e.usage / 1_048_576).toFixed(1).replace('.', ',')} Mo`);
    });
  }, []);

  return (
    <div className="ecran">
      <div className="barre-haute">
        <BoutonIcone libelle="Retour aux projets" sansCadre onClick={() => aller({ ecran: 'accueil' })}><IcRetour /></BoutonIcone>
      </div>
      <h1 className="t-titre ecran-titre">Réglages</h1>

      <section className="reglage" aria-labelledby="r-theme">
        <h2 id="r-theme" className="t-label">Thème</h2>
        <Segments
          libelle="Thème"
          valeur={theme}
          onChange={(v) => { appliquerTheme(v); void stockage.poserReglage('theme', v); }}
          options={[{ valeur: 'auto', libelle: 'Auto' }, { valeur: 'clair', libelle: 'Clair' }, { valeur: 'sombre', libelle: 'Sombre' }]}
        />
      </section>

      <section className="reglage" aria-labelledby="r-synchro">
        <h2 id="r-synchro" className="t-label">Synchro</h2>
        <SectionSynchro />
      </section>

      <section className="reglage" aria-labelledby="r-notifications">
        <h2 id="r-notifications" className="t-label">Notifications</h2>
        <SectionNotifications />
      </section>

      <section className="reglage" aria-labelledby="r-partages">
        <h2 id="r-partages" className="t-label">Liens partagés</h2>
        <SectionPartages />
      </section>

      <section className="reglage" aria-labelledby="r-donnees">
        <h2 id="r-donnees" className="t-label">Données sur cet appareil</h2>
        <p className="t-cote">
          {usage ?? '—'} · {protege === null ? '—' : protege ? 'protégées contre l’effacement automatique' : 'non protégées : installez l’app sur l’écran d’accueil'}
        </p>
        <SectionDonnees />
      </section>

      <section className="reglage" aria-labelledby="r-apropos">
        <h2 id="r-apropos" className="t-label">À propos</h2>
        <p className="t-cote">Isoligne {__VERSION__} · code libre (MIT) · données chiffrées sur l’appareil avant tout envoi</p>
        <ul className="licences t-cote">
          {LICENCES.map((l) => <li key={l}>{l}</li>)}
        </ul>
      </section>
    </div>
  );
}
