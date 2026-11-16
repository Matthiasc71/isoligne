import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type * as Y from 'yjs';
import { Stockage, type ProjetOuvert } from '../data/stockage';
import { lireArbre, type Arbre } from '../tree/arbre';

const Contexte = createContext<Stockage | null>(null);

export const FournisseurStockage = Contexte.Provider;

export function useStockage(): Stockage {
  const s = useContext(Contexte);
  if (!s) throw new Error('Stockage absent');
  return s;
}

/** Ouvre un projet et attend sa lecture depuis IndexedDB. */
export function useProjet(id: string): ProjetOuvert | null {
  const stockage = useStockage();
  const [pret, setPret] = useState<ProjetOuvert | null>(null);
  useEffect(() => {
    let actif = true;
    const p = stockage.ouvrir(id);
    void p.pret.then(() => { if (actif) setPret(p); });
    return () => { actif = false; setPret(null); };
  }, [stockage, id]);
  return pret;
}

const versions = new WeakMap<Y.Doc, { v: number; abonnes: Set<() => void> }>();

function etat(doc: Y.Doc) {
  let e = versions.get(doc);
  if (!e) {
    const nouveau = { v: 0, abonnes: new Set<() => void>() };
    doc.on('update', () => {
      nouveau.v++;
      for (const a of nouveau.abonnes) a();
    });
    versions.set(doc, nouveau);
    e = nouveau;
  }
  return e;
}

/** Numéro de version du document : change à chaque modification (locale ou distante). */
export function useVersion(doc: Y.Doc): number {
  const e = etat(doc);
  return useSyncExternalStore(
    (cb) => { e.abonnes.add(cb); return () => e.abonnes.delete(cb); },
    () => e.v,
  );
}

export function useArbre(doc: Y.Doc): Arbre {
  const v = useVersion(doc);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => lireArbre(doc), [doc, v]);
}
