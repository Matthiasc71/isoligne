import { lazy, Suspense, useEffect, useState } from 'react';
import { Grille } from '../design/signature';
import { IcCalendrier, IcPlus, IcProjets, IcRecherche } from '../design/icones';
import { BoutonIcone } from '../ui/ui';
import { aller, useRoute, type Route } from './route';
import { Accueil } from '../screens/Accueil';
import { AjoutRapide } from '../screens/AjoutRapide';
import { Raccourcis } from './Raccourcis';
import './app.css';

const Projet = lazy(() => import('../screens/Projet'));
const Calendrier = lazy(() => import('../screens/Calendrier'));
const Recherche = lazy(() => import('../screens/Recherche'));
const Reglages = lazy(() => import('../screens/Reglages'));

function useLarge(): boolean {
  const mq = '(min-width: 1024px)';
  const [large, setLarge] = useState(() => matchMedia(mq).matches);
  useEffect(() => {
    const m = matchMedia(mq);
    const f = () => setLarge(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return large;
}

function Navigation({ route, onAjouter, verticale }: { route: Route; onAjouter: () => void; verticale: boolean }) {
  const ecran = route.ecran;
  return (
    <nav className={verticale ? 'nav-laterale' : 'barre-bas'} aria-label="Navigation principale">
      <BoutonIcone
        libelle="Projets"
        actif={ecran === 'accueil' || ecran === 'archives' || (verticale && ecran === 'projet')}
        aria-current={ecran === 'accueil' ? 'page' : undefined}
        onClick={() => aller({ ecran: 'accueil' })}
      ><IcProjets /></BoutonIcone>
      <BoutonIcone
        libelle="Calendrier"
        actif={ecran === 'calendrier'}
        aria-current={ecran === 'calendrier' ? 'page' : undefined}
        onClick={() => aller({ ecran: 'calendrier' })}
      ><IcCalendrier /></BoutonIcone>
      <BoutonIcone
        libelle="Recherche"
        actif={ecran === 'recherche'}
        aria-current={ecran === 'recherche' ? 'page' : undefined}
        onClick={() => aller({ ecran: 'recherche' })}
      ><IcRecherche /></BoutonIcone>
      <BoutonIcone libelle="Ajouter" rouge onClick={onAjouter}><IcPlus /></BoutonIcone>
    </nav>
  );
}

export function App() {
  const route = useRoute();
  const large = useLarge();
  const [ajout, setAjout] = useState(false);

  // Raccourci global : Cmd/Ctrl+K ouvre l'ajout rapide (la palette complète arrive au jalon 6).
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setAjout(true); }
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, []);

  const contenu = (() => {
    switch (route.ecran) {
      case 'projet': return <Projet key={route.id} route={route} large={large} />;
      case 'calendrier': return <Calendrier />;
      case 'recherche': return <Recherche />;
      case 'reglages': return <Reglages />;
      case 'archives': return <Accueil archives />;
      default: return large ? <AucuneSelection /> : <Accueil />;
    }
  })();

  // Sur iPhone, la page projet remplace la navigation par son sélecteur de vue.
  const barreVisible = large || route.ecran !== 'projet';

  return (
    <div className={`app${large ? ' app-large' : ''}`}>
      <Grille />
      {large && <Navigation route={route} onAjouter={() => setAjout(true)} verticale />}
      {large && (
        <aside className="colonne-projets" aria-label="Projets">
          <Accueil compact />
        </aside>
      )}
      <main className="colonne-principale" id="contenu">
        <Suspense fallback={null}>{contenu}</Suspense>
      </main>
      {!large && barreVisible && <Navigation route={route} onAjouter={() => setAjout(true)} verticale={false} />}
      <AjoutRapide ouverte={ajout} onFermer={() => setAjout(false)} />
      <Raccourcis />
    </div>
  );
}

function AucuneSelection() {
  return <div className="aucune-selection" aria-hidden="true" />;
}
