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

const stockage = new Stockage();
const synchro = new ServiceSynchro(stockage);
void stockage.espacePret.then(() => synchro.charger());

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

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <FournisseurStockage value={stockage}>
      <FournisseurSynchro value={synchro}>
        <App />
      </FournisseurSynchro>
    </FournisseurStockage>
  </StrictMode>,
);
