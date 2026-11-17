import { SuiviGestes } from '../ui/Indice';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Grille } from '../design/signature';
import { IcCalendrier, IcPlus, IcProjets, IcRecherche } from '../design/icones';
import { BoutonIcone } from '../ui/ui';
import { aller, useRoute, type Route } from './route';
import { Accueil } from '../screens/Accueil';
import { AjoutRapide, type Mode } from '../screens/AjoutRapide';
import { DemandeNotifications } from '../screens/Notifications';
import { normaliserUrl } from '../media/lien';
import { Raccourcis } from './Raccourcis';
import { Palette } from './Palette';
import './app.css';

const Projet = lazy(() => import('../screens/Projet'));
const Calendrier = lazy(() => import('../screens/Calendrier'));
const Recherche = lazy(() => import('../screens/Recherche'));
const Reglages = lazy(() => import('../screens/Reglages'));
const VuePartage = lazy(() => import('../partage/VuePartage'));

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
  const [demandeAjout, setDemandeAjout] = useState<{ mode: Mode; url?: string } | null>(null);

  // Coller une adresse hors d'un champ (ordinateur) : propose de l'ajouter à un projet.
  useEffect(() => {
    const f = (e: ClipboardEvent) => {
      const cible = e.target as HTMLElement | null;
      if (cible?.closest('input, textarea, [contenteditable="true"]')) return;
      const url = normaliserUrl(e.clipboardData?.getData('text/plain') ?? '');
      if (!url) return;
      e.preventDefault();
      setDemandeAjout({ mode: 'lien', url });
      setAjout(true);
    };
    window.addEventListener('paste', f);
    return () => window.removeEventListener('paste', f);
  }, []);

  // Raccourci global : Cmd/Ctrl+K ouvre la palette de commandes.
  const [palette, setPalette] = useState(false);
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(true); }
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, []);

  // Destinataire d'un lien de partage : la vue en lecture seule, sans navigation ni édition.
  if (route.ecran === 'partage') {
    return (
      <div className="app app-partage">
        <Grille />
        <main className="colonne-principale" id="contenu">
          <Suspense fallback={null}><VuePartage id={route.id} cle={route.cle} /></Suspense>
        </main>
      </div>
    );
  }

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
      <AjoutRapide ouverte={ajout} demande={demandeAjout} onFermer={() => { setAjout(false); setDemandeAjout(null); }} />
      <Palette ouverte={palette} onFermer={() => setPalette(false)}
        onAjouter={(mode) => { setDemandeAjout({ mode }); setAjout(true); }} />
      <Raccourcis />
      <DemandeNotifications />
      <SuiviGestes />
    </div>
  );
}

function AucuneSelection() {
  return <div className="aucune-selection" aria-hidden="true" />;
}
