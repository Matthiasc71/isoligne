import { useEffect, useMemo, useRef, useState, type KeyboardEvent as RKeyboardEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useStockage } from './contexte';
import { aller, useRoute } from './route';
import { appliquerTheme, type Theme } from './theme';
import { normaliser } from '../search/normaliser';
import { Feuille } from '../ui/ui';
import type { Mode } from '../screens/AjoutRapide';
import './palette.css';

/** Commandes transmises aux écrans concernés (feuilles qu'ils possèdent). */
export const EVENEMENT_AIDE = 'isoligne:aide';
export const EVENEMENT_PARTAGER = 'isoligne:partager';

interface Commande { id: string; groupe: string; libelle: string; touche?: string; agir: () => void | Promise<void> }

/** Au plus une faute (lettre en trop, en moins, changée, ou deux lettres voisines inversées). */
function proche(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let fautes = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++fautes > 1) return false;
    if (a.length === b.length && a[i] === b[j + 1] && a[i + 1] === b[j]) { i += 2; j += 2; continue; }
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return fautes + (a.length - i) + (b.length - j) <= 1;
}

/** Tous les mots tapés trouvent un mot du libellé : début exact, ou début à une faute près (5 lettres et plus). */
export function correspond(libelle: string, requete: string): boolean {
  const mots = normaliser(libelle).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return normaliser(requete).split(/\s+/).filter(Boolean).every((q) =>
    mots.some((m) => m.startsWith(q) || (q.length >= 5 && [q.length - 1, q.length, q.length + 1].some((n) => proche(m.slice(0, n), q)))));
}

/** Palette de commandes (ordinateur, Cmd/Ctrl+K) : brief bonus §6. */
export function Palette({ ouverte, onFermer, onAjouter }: { ouverte: boolean; onFermer: () => void; onAjouter: (m: Mode) => void }) {
  const stockage = useStockage();
  const route = useRoute();
  const [q, setQ] = useState('');
  const [actif, setActif] = useState(0);
  const liste = useRef<HTMLUListElement>(null);
  const projets = useLiveQuery(() => stockage.index.projets.orderBy('modifie').reverse().toArray(), [stockage]) ?? [];

  const champ = useRef<HTMLInputElement>(null);
  // La feuille donne le focus à son premier bouton (« Fermer ») : on le place dans le champ.
  useEffect(() => {
    if (!ouverte) return;
    setQ('');
    setActif(0);
    const t = requestAnimationFrame(() => champ.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [ouverte]);

  const commandes = useMemo<Commande[]>(() => {
    const c: Commande[] = [
      { id: 'n-projet', groupe: 'Ajouter', libelle: 'Nouveau projet', agir: () => onAjouter('projet') },
      { id: 'n-idee', groupe: 'Ajouter', libelle: 'Idée dans un projet', agir: () => onAjouter('idee') },
      { id: 'n-lien', groupe: 'Ajouter', libelle: 'Lien dans un projet', agir: () => onAjouter('lien') },
      ...projets.map((p): Commande => ({ id: `p-${p.id}`, groupe: 'Aller à', libelle: p.titre || 'Sans titre', agir: () => aller({ ecran: 'projet', id: p.id, branche: null, vue: 'page' }) })),
      { id: 'a-cal', groupe: 'Aller à', libelle: 'Calendrier', agir: () => aller({ ecran: 'calendrier' }) },
      { id: 'a-rech', groupe: 'Aller à', libelle: 'Recherche', agir: () => aller({ ecran: 'recherche' }) },
      { id: 'a-regl', groupe: 'Aller à', libelle: 'Réglages', agir: () => aller({ ecran: 'reglages' }) },
    ];
    if (route.ecran === 'projet') {
      const id = route.id;
      const exporter = async (f: 'md' | 'opml') => {
        const p = stockage.ouvrir(id);
        await p.pret;
        await (await import('../echange/fichiers')).exporterProjet(p.doc, f);
      };
      c.push(
        { id: 'c-md', groupe: 'Ce projet', libelle: 'Exporter en Markdown', agir: () => exporter('md') },
        { id: 'c-opml', groupe: 'Ce projet', libelle: 'Exporter en OPML', agir: () => exporter('opml') },
        { id: 'c-partager', groupe: 'Ce projet', libelle: 'Partager en lecture seule', agir: () => { window.dispatchEvent(new Event(EVENEMENT_PARTAGER)); } },
        { id: 'c-graphe', groupe: 'Ce projet', libelle: 'Ouvrir le graphe', agir: () => aller({ ecran: 'projet', id, branche: route.branche, vue: 'graphe' }) },
      );
    }
    c.push(
      {
        id: 'd-sauver', groupe: 'Données', libelle: 'Sauvegarder tout', agir: async () => {
          const [{ creerSauvegarde }, { livrer }] = await Promise.all([import('../echange/sauvegarde'), import('../echange/fichiers')]);
          const z = await creerSauvegarde(stockage);
          await livrer(new Blob([z.octets as BlobPart], { type: 'application/zip' }), z.nom);
          await stockage.poserReglage('derniereSauvegarde', Date.now());
        },
      },
      ...(['auto', 'clair', 'sombre'] as Theme[]).map((t): Commande => ({
        id: `t-${t}`, groupe: 'Thème', libelle: `Thème ${t === 'auto' ? 'auto' : t}`, agir: () => { appliquerTheme(t); void stockage.poserReglage('theme', t); },
      })),
      { id: 'aide', groupe: 'Aide', libelle: 'Gestes et raccourcis', touche: '?', agir: () => { window.dispatchEvent(new Event(EVENEMENT_AIDE)); } },
    );
    return c;
  }, [projets, route, stockage, onAjouter]);

  const filtrees = useMemo(() => (q.trim() ? commandes.filter((c) => correspond(c.libelle, q)) : commandes), [commandes, q]);
  const courant = Math.min(actif, Math.max(0, filtrees.length - 1));

  useEffect(() => {
    liste.current?.querySelector<HTMLElement>(`[data-index="${courant}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [courant]);

  const lancer = (c: Commande | undefined) => {
    if (!c) return;
    onFermer();
    void c.agir();
  };
  const touche = (e: RKeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActif((courant + 1) % Math.max(1, filtrees.length)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActif((courant - 1 + filtrees.length) % Math.max(1, filtrees.length)); }
    else if (e.key === 'Enter') { e.preventDefault(); lancer(filtrees[courant]); }
  };

  let groupe = '';
  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre="Commandes" titreVisible={false}>
      <div className="palette">
        <input ref={champ} className="champ t-corps palette-champ" placeholder="Commande ou projet" aria-label="Commande ou projet" value={q}
          role="combobox" aria-expanded="true" aria-controls="palette-liste" aria-autocomplete="list"
          aria-activedescendant={filtrees[courant] ? `cmd-${filtrees[courant]!.id}` : undefined}
          onChange={(e) => { setQ(e.target.value); setActif(0); }} onKeyDown={touche} spellCheck={false} autoComplete="off" />
        <ul id="palette-liste" ref={liste} role="listbox" aria-label="Commandes" className="palette-liste">
          {filtrees.map((c, i) => {
            const entete = c.groupe !== groupe ? c.groupe : null;
            groupe = c.groupe;
            return (
              <li key={c.id} role="presentation">
                {entete && <span className="t-label palette-groupe" aria-hidden="true">{entete}</span>}
                <div id={`cmd-${c.id}`} role="option" aria-selected={i === courant} data-index={i}
                  className={`palette-option${i === courant ? ' actif' : ''}`}
                  onPointerMove={() => setActif(i)} onClick={() => lancer(c)}>
                  <span className="t-corps">{c.libelle}</span>
                  <span className="t-cote">{c.touche ?? (c.groupe === 'Aller à' && c.id.startsWith('p-') ? 'Projet' : '')}</span>
                </div>
              </li>
            );
          })}
        </ul>
        {filtrees.length === 0 && <p className="t-cote" role="status">Aucune commande</p>}
      </div>
    </Feuille>
  );
}
