import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource/b612/400.css';
import '@fontsource/b612/700.css';
import '@fontsource/b612-mono/400.css';
import './design/base.css';
import { Stockage } from './data/stockage';
import { FournisseurStockage } from './app/contexte';
import { appliquerTheme, type Theme } from './app/theme';
import { App } from './app/App';
import { ServiceSynchro } from './sync/service';
import { FournisseurSynchro } from './sync/contexte';
import { ServiceNotifs } from './notif/service';
import { FournisseurNotifs } from './notif/contexte';

const stockage = new Stockage();
const synchro = new ServiceSynchro(stockage);
const notifs = new ServiceNotifs(stockage, synchro);
void stockage.espacePret.then(() => synchro.charger()).then(() => notifs.charger());

// Protège les données locales de l'éviction automatique du navigateur.
void navigator.storage?.persist?.();

void stockage.reglage<Theme>('theme', 'auto').then(appliquerTheme);

// Avant de quitter ou de passer en arrière-plan : écrire les index en attente.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') void stockage.vider();
});

if (import.meta.env.DEV || import.meta.env.VITE_DEMO === '1') {
  // Données de démonstration : ouvrir l'app avec ?demo (développement, ou build de mesure VITE_DEMO=1).
  if (new URLSearchParams(location.search).has('demo')) {
    void stockage.espacePret.then(async () => {
      if (stockage.idsProjets().length === 0) {
        const { chargerDemo, chargerGrandProjet } = await import('./app/demo');
        await chargerDemo(stockage);
        if (new URLSearchParams(location.search).get('demo') === '500') await chargerGrandProjet(stockage);
      }
    });
  }
}

if (import.meta.env.PROD) {
  void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
}

// Écran d'ouverture : retiré dès que les projets sont prêts et l'animation jouée (≈ 0,95 s),
// au plus tard à 1,5 s du lancement ; un toucher le passe. Il n'existe qu'au lancement à froid.
const ouverture = document.getElementById('ouverture');
if (ouverture) {
  const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let fini = false;
  const finir = () => {
    if (fini) return;
    fini = true;
    ouverture.classList.add('fin');
    setTimeout(() => ouverture.remove(), 300);
  };
  const a = (ms: number) => setTimeout(finir, Math.max(0, ms - performance.now()));
  void stockage.espacePret.then(() => a(reduit ? 0 : 950));
  a(1500);
  ouverture.addEventListener('pointerdown', finir);
}

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <FournisseurStockage value={stockage}>
      <FournisseurSynchro value={synchro}>
        <FournisseurNotifs value={notifs}>
          <App />
        </FournisseurNotifs>
      </FournisseurSynchro>
    </FournisseurStockage>
  </StrictMode>,
);
