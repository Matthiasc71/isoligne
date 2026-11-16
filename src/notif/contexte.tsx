import { createContext, useContext, useSyncExternalStore } from 'react';
import type { EtatNotifs, ServiceNotifs } from './service';

const Contexte = createContext<ServiceNotifs | null>(null);
export const FournisseurNotifs = Contexte.Provider;

export function useServiceNotifs(): ServiceNotifs {
  const s = useContext(Contexte);
  if (!s) throw new Error('Service de notifications absent');
  return s;
}

export function useEtatNotifs(): EtatNotifs {
  const s = useServiceNotifs();
  return useSyncExternalStore((cb) => s.abonner(cb), () => s.lireEtat());
}
