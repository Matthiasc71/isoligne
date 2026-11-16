import { createContext, useContext, useSyncExternalStore } from 'react';
import type { EtatSynchro, ServiceSynchro } from './service';

const Contexte = createContext<ServiceSynchro | null>(null);
export const FournisseurSynchro = Contexte.Provider;

export function useServiceSynchro(): ServiceSynchro {
  const s = useContext(Contexte);
  if (!s) throw new Error('Service de synchro absent');
  return s;
}

export function useEtatSynchro(): EtatSynchro {
  const s = useServiceSynchro();
  return useSyncExternalStore((cb) => s.abonner(cb), () => s.lireEtat());
}

/** Problème durable (témoin sur l'accueil) : appareil révoqué, ou erreur depuis plus de 10 minutes. */
export function problemeDurable(e: EtatSynchro, maintenant: number = Date.now()): boolean {
  return e.statut === 'revoque' || (e.statut === 'erreur' && e.erreurDepuis !== null && maintenant - e.erreurDepuis > 600_000);
}

/** Nom d'appareil proposé par défaut (modifiable). */
export function nomParDefaut(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac OS X|Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'PC';
  return 'Ordinateur';
}
