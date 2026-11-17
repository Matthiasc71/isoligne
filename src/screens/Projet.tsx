import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type * as Y from 'yjs';
import { useArbre, useProjet, useStockage, useVersion } from '../app/contexte';
import { aller, type Route, type Vue } from '../app/route';
import { useMaintenant } from '../app/temps';
import { IcArbre, IcCroquis, IcEcheance, IcLien, IcPlus, IcRetour, IcSeparateur, IcSuite, IcTexte } from '../design/icones';
import { Calque, CoteAvancement } from '../design/signature';
import {
  COULEURS, LIBELLES_COULEUR, LIBELLES_STATUT, LIBELLES_TYPE, LIBELLES_TYPE_COURT, RACINE, formaterCalque, lireMeta,
  type CleCouleur, type Meta, type StatutProjet, type TypeProjet,
} from '../data/schema';
import { creerBloc, definirStatut, definirTitre, echeancesOuvertes, lireBlocs, modifierMeta } from '../data/projet';
import { ancetres, creerNoeud, noteDe } from '../tree/arbre';
import { avancement } from '../tree/lignes';
import { aujourdhui, dateCourte, dateJour } from '../time/dates';
import { Nomenclature } from '../outliner/Nomenclature';
import { PanneauNoeud } from '../outliner/PanneauNoeud';
import { Avis, BoutonIcone, Choix, Feuille } from '../ui/ui';
import { BlocEcheance, BlocSeparateur, BlocTexte, CommandesBloc } from './Blocs';
import { Separateur } from '../ui/Separateur';
import { Figure } from '../media/Figure';
import { Planche } from '../media/Planche';
import { BlocLien } from '../media/BlocLien';
import { numerosFigures, traitsDe, useTraits } from '../media/croquis';
import type { Bloc } from '../data/projet';
import type { Disposition } from '../graph/liens';
import { exporterProjet } from '../echange/fichiers';
import './projet.css';

const Graphe = lazy(() => import('../graph/Graphe').then((m) => ({ default: m.Graphe })));

const EditeurRiche = lazy(() => import('../editor/EditeurRiche'));

type RouteProjet = Extract<Route, { ecran: 'projet' }>;

export default function Projet({ route, large }: { route: RouteProjet; large: boolean }) {
  const p = useProjet(route.id);
  if (!p) return null;
  return <PageProjet route={route} large={large} doc={p.doc} annuler={p.annuler} />;
}

function PageProjet({ route, large, doc, annuler }: { route: RouteProjet; large: boolean; doc: Y.Doc; annuler: Y.UndoManager }) {
  const stockage = useStockage();
  useVersion(doc);
  const arbre = useArbre(doc);
  const maintenant = useMaintenant();
  const meta = lireMeta(doc);
  const existe = doc.getMap('meta').has('titre');

  const racine = route.branche && arbre.parId.has(route.branche) ? route.branche : RACINE;
  const noeudRacine = racine !== RACINE ? arbre.parId.get(racine)! : null;
  const urgente = useMemo(() => echeancesOuvertes(doc, arbre, racine)[0] ?? null, [doc, arbre, racine]);
  const { faites, total } = avancement(arbre, racine);
  const blocs = lireBlocs(doc);

  const [cartouche, setCartouche] = useState(false);
  const [panneau, setPanneau] = useState<{ id: string; champ?: 'date' | 'couleur' } | null>(null);
  const [ajout, setAjout] = useState(false);
  const [menu, setMenu] = useState(false);
  const [reorganiser, setReorganiser] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const [avis, setAvis] = useState<string | null>(null);
  const [nouveauBloc, setNouveauBloc] = useState<string | null>(null);
  const [planche, setPlanche] = useState<string | null>(null);
  const [focusNoeud, setFocusNoeud] = useState<string | null>(null);

  // Disposition du graphe : mémorisée (iPhone : Radial, Arbre ou Libre ; la Frise a sa propre vue).
  const dispositionMobile = useLiveQuery(() => stockage.reglage<Disposition>('disposition', 'radial'), [stockage]) ?? 'radial';
  const dispositionOrdi = useLiveQuery(() => stockage.reglage<Disposition>('dispositionOrdi', 'radial'), [stockage]) ?? 'radial';
  const largeurGraphe = useLiveQuery(() => stockage.reglage<number>('largeurGraphe', 560), [stockage]) ?? 560;
  const [largeurTemp, setLargeurTemp] = useState<number | null>(null);
  const disposition: Disposition = route.vue === 'frise' ? 'frise' : large ? dispositionOrdi : dispositionMobile;

  const allerBranche = useCallback((branche: string | null, vue: Vue = route.vue) => {
    aller({ ecran: 'projet', id: route.id, branche, vue });
  }, [route.id, route.vue]);

  const remonter = useCallback(() => {
    if (!noeudRacine) { aller({ ecran: 'accueil' }); return; }
    allerBranche(noeudRacine.parent === RACINE ? null : noeudRacine.parent);
  }, [noeudRacine, allerBranche]);

  // Ouverture ciblée (calendrier, notification) : la branche qui contient le nœud, puis son panneau.
  useEffect(() => {
    if (route.noeud) {
      const n = arbre.parId.get(route.noeud);
      if (!n) return;
      aller({ ecran: 'projet', id: route.id, branche: n.parent === RACINE ? null : n.parent, vue: 'page' }, true);
      setPanneau({ id: n.id });
    } else if (route.bloc) {
      const id = route.bloc;
      aller({ ecran: 'projet', id: route.id, branche: null, vue: 'page' }, true);
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>(`[data-bloc="${CSS.escape(id)}"]`);
        el?.scrollIntoView({ block: 'center' });
        el?.querySelector<HTMLElement>('input')?.focus({ preventScroll: true });
      });
    }
  }, [route.noeud, route.bloc, route.id, arbre]);

  // Cmd/Ctrl+Z hors des champs : annuler.
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      if (cible?.closest('input, textarea, [contenteditable="true"]')) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) annuler.redo(); else annuler.undo();
      }
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [annuler]);

  if (!existe) {
    return (
      <div className="ecran">
        <div className="barre-haute">
          <BoutonIcone libelle="Retour aux projets" sansCadre onClick={() => aller({ ecran: 'accueil' })}><IcRetour /></BoutonIcone>
        </div>
        <p className="t-cote">Projet introuvable</p>
      </div>
    );
  }

  const ajouterBloc = (type: 'branche' | 'texte' | 'echeance' | 'separateur' | 'croquis' | 'lien') => {
    setAjout(false);
    if (type === 'branche') {
      setFocusNoeud(creerNoeud(doc, racine));
      return;
    }
    const id = creerBloc(doc, type);
    setNouveauBloc(id);
    if (type === 'croquis') setPlanche(id);
  };
  const figures = numerosFigures(blocs);
  const couverture = blocs.find((b) => b.type === 'croquis' && b.y.get('couverture'));

  const nomenclature = (
    <Nomenclature
      doc={doc}
      annuler={annuler}
      racine={racine}
      urgente={urgente?.genre === 'noeud' ? urgente.cible : null}
      maintenant={maintenant}
      focusDemande={focusNoeud}
      actions={{
        ouvrirPanneau: (id, champ) => setPanneau(champ ? { id, champ } : { id }),
        ouvrirBranche: (id) => allerBranche(id),
        remonter,
      }}
    />
  );

  const changerDisposition = (d: Disposition) => {
    const branche = noeudRacine ? racine : null;
    if (large) {
      void stockage.poserReglage('dispositionOrdi', d);
      if (route.vue !== 'page') allerBranche(branche, 'page');
    } else if (d === 'frise') {
      aller({ ecran: 'projet', id: route.id, branche, vue: 'frise' }, true);
    } else {
      void stockage.poserReglage('disposition', d);
      aller({ ecran: 'projet', id: route.id, branche, vue: 'graphe' }, true);
    }
  };

  const graphe = (
    <Suspense fallback={null}>
      <Graphe
        doc={doc}
        annuler={annuler}
        centre={racine}
        disposition={disposition}
        onDisposition={changerDisposition}
        titre={meta.titre || 'Sans titre'}
        couleur={meta.couleur}
        calque={meta.calque}
        urgente={urgente?.genre === 'noeud' ? urgente.cible : null}
        large={large}
        onRetour={() => allerBranche(noeudRacine ? racine : null, 'page')}
        ouvrirPanneau={(id) => setPanneau({ id })}
        ouvrirBranche={(id) => allerBranche(id)}
      />
    </Suspense>
  );

  const communs = (
    <>
      <PanneauNoeud
        doc={doc}
        annuler={annuler}
        id={panneau?.id ?? null}
        {...(panneau?.champ ? { champ: panneau.champ } : {})}
        racine={racine}
        onFermer={() => setPanneau(null)}
        onOuvrirBranche={(id) => allerBranche(id)}
        onSupprime={(t) => setAvis(`${t} supprimé`)}
      />
      {avis && <Avis texte={avis} action="Annuler" onAction={() => annuler.undo()} onFin={() => setAvis(null)} />}
      {planche && blocs.some((b) => b.id === planche) && (
        <Planche doc={doc} annuler={annuler} idBloc={planche} numero={figures.get(planche) ?? 1} couleur={meta.couleur} onFermer={() => setPlanche(null)} />
      )}
    </>
  );

  const page = (
    <div className={`ecran projet${large ? ' projet-large' : ''}`} style={{ ['--calque-courant' as string]: `var(--calque-${meta.couleur})` }}>
      <div className="barre-haute">
        <BoutonIcone libelle={noeudRacine ? 'Remonter' : 'Retour aux projets'} sansCadre onClick={remonter}><IcRetour /></BoutonIcone>
        <BoutonIcone libelle="Options du projet" sansCadre onClick={() => setMenu(true)}><IcSuite /></BoutonIcone>
      </div>

      {noeudRacine ? (
        <EnTeteBranche doc={doc} meta={meta} arbre={arbre} racine={racine} allerBranche={allerBranche} />
      ) : (
        <EnTeteProjet doc={doc} meta={meta} cartouche={cartouche} basculer={() => setCartouche((c) => !c)} maintenant={maintenant} />
      )}

      {!noeudRacine && couverture && (
        <div className="projet-section couverture">
          <FigureBloc bloc={couverture} numero={figures.get(couverture.id) ?? 1} onOuvrir={() => setPlanche(couverture.id)} />
        </div>
      )}

      {total > 0 && (
        <div className="projet-section">
          <CoteAvancement faites={faites} total={total} />
        </div>
      )}

      {reorganiser && (
        <div className="reorganiser-tete">
          <span className="t-cote">Réorganiser</span>
          <button type="button" className="t-label lien-action" onClick={() => setReorganiser(false)}>Terminé</button>
        </div>
      )}

      {noeudRacine ? (
        <div className="projet-section">{nomenclature}</div>
      ) : (
        blocs.filter((b) => b !== couverture || reorganiser).map((b, i, liste) => (
          <section key={b.id} data-bloc={b.id} className="projet-section" aria-label={b.type === 'arbre' ? 'Arborescence' : undefined}>
            {reorganiser && <CommandesBloc doc={doc} bloc={b} premier={i === 0} dernier={i === liste.length - 1} onSupprime={(nom) => { annuler.stopCapturing(); setAvis(`${nom} supprimé`); }} />}
            {b.type === 'arbre' && nomenclature}
            {b.type === 'texte' && <BlocTexte bloc={b} autoFocus={nouveauBloc === b.id} />}
            {b.type === 'echeance' && (
              <BlocEcheance doc={doc} bloc={b} urgente={urgente?.cible === b.id} maintenant={maintenant} autoFocus={nouveauBloc === b.id} />
            )}
            {b.type === 'separateur' && <BlocSeparateur />}
            {b.type === 'croquis' && <FigureBloc bloc={b} numero={figures.get(b.id) ?? 1} onOuvrir={() => setPlanche(b.id)} />}
            {b.type === 'lien' && <BlocLien doc={doc} bloc={b} autoFocus={nouveauBloc === b.id} />}
          </section>
        ))
      )}

      <div className="barre-vue">
        {!large && <div className="selecteur-vue" role="tablist" aria-label="Vue">
          {(['page', 'graphe', 'frise'] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={route.vue === v}
              className={`t-label${route.vue === v ? ' actif' : ''}`}
              onClick={() => allerBranche(noeudRacine ? racine : null, v)}
            >
              {v === 'page' ? 'Page' : v === 'graphe' ? 'Graphe' : 'Frise'}
            </button>
          ))}
        </div>}
        <BoutonIcone libelle="Ajouter un bloc" rouge onClick={() => setAjout(true)}><IcPlus /></BoutonIcone>
      </div>

      <Feuille ouverte={ajout} onFermer={() => setAjout(false)} titre="Ajouter">
        <Choix icone={<IcArbre />} onClick={() => ajouterBloc('branche')}>{noeudRacine ? 'Élément' : 'Branche'}</Choix>
        {!noeudRacine && (
          <>
            <Choix icone={<IcTexte />} onClick={() => ajouterBloc('texte')}>Texte</Choix>
            <Choix icone={<IcEcheance />} onClick={() => ajouterBloc('echeance')}>Échéance</Choix>
            <Choix icone={<IcCroquis />} onClick={() => ajouterBloc('croquis')}>Croquis</Choix>
            <Choix icone={<IcLien />} onClick={() => ajouterBloc('lien')}>Lien</Choix>
            <Choix icone={<IcSeparateur />} onClick={() => ajouterBloc('separateur')}>Séparateur</Choix>
          </>
        )}
      </Feuille>

      <Feuille ouverte={menu} onFermer={() => setMenu(false)} titre={meta.titre || 'Projet'}>
        {!noeudRacine && <Choix onClick={() => { setMenu(false); setReorganiser(true); }}>Réorganiser les blocs</Choix>}
        <Choix onClick={() => { modifierMeta(doc, 'epingle', !meta.epingle); setMenu(false); }}>{meta.epingle ? 'Désépingler' : 'Épingler'}</Choix>
        <Choix onClick={() => { definirStatut(doc, meta.statut === 'archive' ? 'en-cours' : 'archive'); setMenu(false); }}>
          {meta.statut === 'archive' ? 'Désarchiver' : 'Archiver'}
        </Choix>
        <Choix onClick={() => { setMenu(false); void exporterProjet(doc, 'md'); }}>Exporter en Markdown</Choix>
        <Choix onClick={() => { setMenu(false); void exporterProjet(doc, 'opml'); }}>Exporter en OPML</Choix>
        <Choix rouge onClick={() => { setMenu(false); setConfirmer(true); }}>Supprimer le projet</Choix>
      </Feuille>

      <Feuille ouverte={confirmer} onFermer={() => setConfirmer(false)} titre="Supprimer le projet">
        <p className="t-corps confirmation">« {meta.titre} » et tout son contenu seront supprimés de cet appareil. Cette action est définitive.</p>
        <div className="confirmation-actions">
          <button type="button" className="bouton-secondaire t-label" onClick={() => setConfirmer(false)}>Garder</button>
          <button type="button" className="bouton-danger t-label" onClick={() => {
            void stockage.supprimerProjet(route.id).then(() => aller({ ecran: 'accueil' }, true));
          }}>Supprimer</button>
        </div>
      </Feuille>

    </div>
  );

  if (!large && route.vue !== 'page') return <>{graphe}{communs}</>;
  if (!large) return <>{page}{communs}</>;
  const lg = largeurTemp ?? largeurGraphe;
  return (
    <div className="projet-colonnes" style={{ gridTemplateColumns: `minmax(380px, 1fr) 9px ${lg}px` }}>
      <div className="colonne-page">{page}</div>
      <Separateur
        libelle="Largeur du graphe"
        valeur={lg}
        min={360}
        max={1100}
        sens={-1}
        onChange={(v) => { setLargeurTemp(v); void stockage.poserReglage('largeurGraphe', v); }}
      />
      <div className="colonne-graphe">{graphe}</div>
      {communs}
    </div>
  );
}

function EnTeteProjet({ doc, meta, cartouche, basculer, maintenant }: {
  doc: Y.Doc; meta: Meta; cartouche: boolean; basculer: () => void; maintenant: number;
}) {
  const ligne = [LIBELLES_TYPE_COURT[meta.type], meta.fin ? `fin ${dateCourte(meta.fin, maintenant)}` : null].filter(Boolean).join(' · ');
  return (
    <header className="projet-tete">
      <Calque couleur={meta.couleur} calque={meta.calque} />
      <h1>
        <button type="button" className="t-titre projet-titre" aria-expanded={cartouche} aria-controls="cartouche" onClick={basculer}>
          {meta.titre || 'Sans titre'}
        </button>
      </h1>
      <p className="t-cote projet-ligne">{ligne}</p>
      {cartouche && <Cartouche doc={doc} meta={meta} maintenant={maintenant} />}
    </header>
  );
}

function Cartouche({ doc, meta, maintenant }: { doc: Y.Doc; meta: Meta; maintenant: number }) {
  const date = (ms: number) => (ms ? dateJour(aujourdhui(ms), maintenant) : '—');
  return (
    <div id="cartouche" className="cartouche">
      <label className="cartouche-case cartouche-large">
        <span className="t-label">Titre</span>
        <input className="t-corps" value={meta.titre} onChange={(e) => definirTitre(doc, e.target.value)} />
      </label>
      <label className="cartouche-case">
        <span className="t-label">Type</span>
        <select className="t-corps" value={meta.type} onChange={(e) => modifierMeta(doc, 'type', e.target.value as TypeProjet)}>
          {(['creatif', 'pro', 'perso', 'idees'] as const).map((t) => <option key={t} value={t}>{LIBELLES_TYPE[t]}</option>)}
        </select>
      </label>
      <label className="cartouche-case">
        <span className="t-label">Échéance finale</span>
        <input type="date" className="t-corps" value={meta.fin ?? ''} onChange={(e) => modifierMeta(doc, 'fin', e.target.value || null)} />
      </label>
      <label className="cartouche-case">
        <span className="t-label">Statut</span>
        <select className="t-corps" value={meta.statut} onChange={(e) => definirStatut(doc, e.target.value as StatutProjet)}>
          {(['idee', 'en-cours', 'pause', 'termine', 'archive'] as const).map((s) => <option key={s} value={s}>{LIBELLES_STATUT[s]}</option>)}
        </select>
      </label>
      <label className="cartouche-case">
        <span className="t-label">Calque {formaterCalque(meta.calque)}</span>
        <select className="t-corps" value={meta.couleur} onChange={(e) => modifierMeta(doc, 'couleur', e.target.value as CleCouleur)}>
          {COULEURS.map((c) => <option key={c} value={c}>{LIBELLES_COULEUR[c]}</option>)}
        </select>
      </label>
      <div className="cartouche-case cartouche-petite">
        <span className="t-label">Rév.</span>
        <span className="t-cote">{String(meta.revision).padStart(2, '0')}</span>
      </div>
      <div className="cartouche-case cartouche-petite">
        <span className="t-label">Créé</span>
        <span className="t-cote">{date(meta.cree)}</span>
      </div>
      <div className="cartouche-case cartouche-petite">
        <span className="t-label">Modifié</span>
        <span className="t-cote">{date(meta.modifie)}</span>
      </div>
    </div>
  );
}

function EnTeteBranche({ doc, meta, arbre, racine, allerBranche }: {
  doc: Y.Doc; meta: Meta; arbre: ReturnType<typeof useArbre>; racine: string; allerBranche: (b: string | null) => void;
}) {
  const n = arbre.parId.get(racine)!;
  const chemin = ancetres(arbre, racine);
  const [note, setNote] = useState<Y.XmlFragment | null>(null);
  useEffect(() => { setNote(noteDe(doc, racine)); }, [doc, racine]);
  return (
    <header className="projet-tete">
      <nav className="fil-ariane t-cote" aria-label="Fil d'Ariane">
        <button type="button" onClick={() => allerBranche(null)}>{meta.titre || 'Projet'}</button>
        {chemin.map((id) => (
          <span key={id}>
            <span aria-hidden="true" className="fil-sep">/</span>
            <button type="button" onClick={() => allerBranche(id)}>{arbre.parId.get(id)?.texte || 'Sans titre'}</button>
          </span>
        ))}
      </nav>
      <h1 className="t-titre projet-titre-branche">{n.texte || 'Sans titre'}</h1>
      <div className="branche-note">
        {note && (
          <Suspense fallback={null}>
            <EditeurRiche fragment={note} libelle="Note de la branche" placeholder="Note" />
          </Suspense>
        )}
      </div>
    </header>
  );
}

/** Bloc croquis lu dans Yjs : la figure se redessine quand ses traits changent. */
function FigureBloc({ bloc, numero, onOuvrir }: { bloc: Bloc; numero: number; onOuvrir: () => void }) {
  const traits = useTraits(traitsDe(bloc.y));
  const legende = bloc.y.get('legende');
  return <Figure traits={traits} numero={numero} legende={legende ? String(legende) : ''} onOuvrir={onOuvrir} />;
}
