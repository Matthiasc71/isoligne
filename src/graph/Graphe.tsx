import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as RKeyboardEvent } from 'react';
import {
  ReactFlow, ReactFlowProvider, ViewportPortal, applyNodeChanges, useReactFlow,
  type NodeChange, type NodeMouseHandler, type OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/base.css';
import type * as Y from 'yjs';
import { useArbre, useVersion } from '../app/contexte';
import {
  IcDeplier, IcExporter, IcPlus, IcRelier, IcReorganiser, IcReplier, IcRetour, IcSuivant,
} from '../design/icones';
import { RACINE, formaterCalque, type CleCouleur } from '../data/schema';
import {
  basculerReplie, creerNoeud, definirEcheance, definirTexte, deplacer, estDansSousArbre, numero, supprimer,
} from '../tree/arbre';
import { avancement } from '../tree/lignes';
import { aujourdhui, dateCourte, dateParlee } from '../time/dates';
import { Avis, BoutonIcone, Choix, Feuille, Segments } from '../ui/ui';
import { calculerPlan, dateDepuisX, frise, radial, type Plan } from './dispositions';
import {
  creerLien, epingler, lireLiens, lirePositions, modifierLien, reorganiser, supprimerLien,
  type Disposition, type LienLibre, type Point,
} from './liens';
import { ContexteGraphe, TYPES_NOEUDS, type NoeudGraphe } from './Noeuds';
import { MiniCarte } from './MiniCarte';
import { cheminArete, cheminLien, coteEtiquette, genre } from './rendu';
import type { DemandeLibre } from './libre.worker';
import './graphe.css';

export const DISPOSITIONS: { valeur: Disposition; libelle: string }[] = [
  { valeur: 'radial', libelle: 'Radial' },
  { valeur: 'arbre', libelle: 'Arbre' },
  { valeur: 'libre', libelle: 'Libre' },
  { valeur: 'frise', libelle: 'Frise' },
];

export interface PropsGraphe {
  doc: Y.Doc;
  annuler: Y.UndoManager;
  centre: string;
  disposition: Disposition;
  onDisposition: (d: Disposition) => void;
  titre: string;
  couleur: CleCouleur;
  calque: number;
  /** Cible de l'échéance la plus urgente (seule redline). */
  urgente: string | null;
  large: boolean;
  onRetour?: () => void;
  ouvrirPanneau: (id: string) => void;
  ouvrirBranche: (id: string) => void;
}

const reduit = () => matchMedia('(prefers-reduced-motion: reduce)').matches;


/** Disposition libre calculée dans un Web Worker (hors du fil principal). */
function usePlanLibre(demande: Omit<DemandeLibre, 'n'> | null): Plan | null {
  const [plan, setPlan] = useState<Plan | null>(null);
  const travailleur = useRef<Worker | null>(null);
  const compteur = useRef(0);
  useEffect(() => () => travailleur.current?.terminate(), []);
  useEffect(() => {
    if (!demande) return;
    travailleur.current ??= new Worker(new URL('./libre.worker.ts', import.meta.url), { type: 'module' });
    const n = ++compteur.current;
    const w = travailleur.current;
    const recevoir = (e: MessageEvent<{ n: number; plan: Plan }>) => { if (e.data.n === compteur.current) setPlan(e.data.plan); };
    w.addEventListener('message', recevoir);
    w.postMessage({ ...demande, n });
    return () => w.removeEventListener('message', recevoir);
  }, [demande]);
  return demande ? plan : null;
}

export function Graphe(props: PropsGraphe) {
  return (
    <ReactFlowProvider>
      <Toile {...props} />
    </ReactFlowProvider>
  );
}

function Toile({
  doc, annuler, centre, disposition, onDisposition, titre, couleur, calque, urgente, large, onRetour, ouvrirPanneau, ouvrirBranche,
}: PropsGraphe) {
  const v = useVersion(doc);
  const arbre = useArbre(doc);
  const flow = useReactFlow();
  const jour = aujourdhui();
  const liensLibres = useMemo(() => lireLiens(doc, arbre), [doc, arbre]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const epingles = useMemo(() => lirePositions(doc, disposition), [doc, disposition, v]);

  const demandeLibre = useMemo(
    () => (disposition === 'libre' ? { arbre, liens: liensLibres, centre, epingles } : null),
    [disposition, arbre, liensLibres, centre, epingles],
  );
  const planLibre = usePlanLibre(demandeLibre);
  // Largeur réelle de la toile : l'échelle de la frise s'y ajuste.
  const conteneur = useRef<HTMLDivElement>(null);
  const [largeurToile, setLargeurToile] = useState(800);
  useEffect(() => {
    const el = conteneur.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setLargeurToile(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const plan: Plan = useMemo(() => {
    if (disposition === 'libre') return planLibre ?? { ...radial(arbre, centre), disposition: 'libre', cercles: [] };
    // Place à droite pour l'étiquette du dernier nœud.
    if (disposition === 'frise') return frise(arbre, centre, jour, Math.max(280, largeurToile - 170));
    return calculerPlan(disposition, arbre, liensLibres, centre, epingles, jour);
  }, [disposition, planLibre, arbre, liensLibres, centre, epingles, jour, largeurToile]);

  // ───────── Positions affichées : animées d'un plan à l'autre (300 ms) ─────────
  const [affiche, setAffiche] = useState<Map<string, Point>>(() => new Map(plan.noeuds.map((n) => [n.id, { x: n.x, y: n.y }])));
  const afficheRef = useRef(affiche);
  afficheRef.current = affiche;
  const glisseEnCours = useRef<string | null>(null);
  useEffect(() => {
    const cible = new Map(plan.noeuds.map((n) => [n.id, { x: n.x, y: n.y }]));
    const depart = afficheRef.current;
    // Au-delà de 150 nœuds, pas de transition : recréer 500 nœuds à chaque image coûterait plus que l'effet n'apporte.
    if (reduit() || depart.size === 0 || cible.size > 150) { setAffiche(cible); return; }
    const t0 = performance.now();
    let image = 0;
    const pas = (t: number) => {
      const k = Math.min(1, (t - t0) / 300);
      const e = 1 - (1 - k) ** 3;
      const m = new Map<string, Point>();
      for (const [id, p] of cible) {
        const a = depart.get(id) ?? (plan.noeuds.find((n) => n.id === id)?.parent ? depart.get(plan.noeuds.find((n) => n.id === id)!.parent!) : undefined) ?? p;
        m.set(id, id === glisseEnCours.current ? (afficheRef.current.get(id) ?? p) : { x: a.x + (p.x - a.x) * e, y: a.y + (p.y - a.y) * e });
      }
      setAffiche(m);
      if (k < 1) image = requestAnimationFrame(pas);
    };
    image = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(image);
  }, [plan]);

  // Recadrer : bornes du plan, étiquettes comprises ; la frise démarre à gauche, à l'échelle 1.
  const recadrer = useCallback(() => {
    const duration = reduit() ? 0 : 300;
    if (plan.disposition === 'frise') {
      const h = conteneur.current?.clientHeight ?? 600;
      const hauteur = Math.max(60, ...(plan.axe?.couloirs.map((c) => c.y + c.hauteur) ?? [60])) + 40;
      void flow.setViewport({ x: 28, y: Math.max(24, (h - hauteur) / 2), zoom: 1 }, { duration });
      return;
    }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of plan.noeuds) {
      const g = genre(n, plan, arbre);
      const texte = n.id === RACINE ? '' : (arbre.parId.get(n.id)?.texte ?? '');
      const l = g === 'centre' ? 40 : g === 'branche' ? (texte.length * 10 + 24) / 2 : texte.length * 9 + 24;
      const gauche = g === 'feuille' ? (n.x < 0 ? l : 12) : l;
      const droite = g === 'feuille' ? (n.x >= 0 ? l : 12) : l;
      x0 = Math.min(x0, n.x - gauche); x1 = Math.max(x1, n.x + droite);
      y0 = Math.min(y0, n.y - 30); y1 = Math.max(y1, n.y + 40);
    }
    for (const r of plan.cercles) { x0 = Math.min(x0, -r); x1 = Math.max(x1, r); y0 = Math.min(y0, -r); y1 = Math.max(y1, r); }
    if (!Number.isFinite(x0)) return;
    void flow.fitBounds({ x: x0, y: y0, width: x1 - x0, height: y1 - y0 }, { padding: 0.06, duration });
  }, [plan, arbre, flow]);
  const derniereCle = useRef('');
  useEffect(() => {
    const cle = `${disposition}|${centre}|${plan.disposition === 'libre' && planLibre !== null}`;
    if (cle === derniereCle.current) return;
    derniereCle.current = cle;
    const t = setTimeout(recadrer, 60);
    return () => clearTimeout(t);
  }, [disposition, centre, planLibre, plan, recadrer]);

  // ───────── État d'interaction ─────────
  const [selection, setSelection] = useState<string | null>(null);
  const [edition, setEdition] = useState<string | null>(null);
  const [relier, setRelier] = useState<{ de: string | null } | null>(null);
  const [cible, setCible] = useState<string | null>(null);
  const [apercuDate, setApercuDate] = useState<{ id: string; date: string } | null>(null);
  const [lienOuvert, setLienOuvert] = useState<string | null>(null);
  const [exporter, setExporter] = useState(false);
  const [avis, setAvis] = useState<string | null>(null);
  const minuterieCible = useRef<{ id: string; t: ReturnType<typeof setTimeout> } | null>(null);
  const departGlisse = useRef<Point | null>(null);

  useEffect(() => { if (selection && !arbre.parId.has(selection) && selection !== centre) setSelection(null); }, [arbre, selection, centre]);

  const etape = useCallback((f: () => void) => { annuler.stopCapturing(); f(); annuler.stopCapturing(); }, [annuler]);

  // ───────── Nœuds React Flow ─────────
  const parId = useMemo(() => new Map(plan.noeuds.map((n) => [n.id, n])), [plan]);
  const nodes: NoeudGraphe[] = useMemo(() => plan.noeuds.map((n) => {
    const g = genre(n, plan, arbre);
    const noeud = arbre.parId.get(n.id);
    const p = affiche.get(n.id) ?? { x: n.x, y: n.y };
    const parent = n.parent ? (affiche.get(n.parent) ?? null) : null;
    const estUrgent = urgente === n.id;
    const date = apercuDate?.id === n.id ? apercuDate.date
      : estUrgent && noeud?.echeance ? dateCourte(noeud.echeance) : null;
    return {
      id: n.id,
      type: g,
      position: p,
      draggable: n.id !== plan.centre,
      selectable: false,
      ariaRole: 'img' as const,
      ariaLabel: n.id === RACINE ? `${titre}, calque ${formaterCalque(calque)}` : `${numero(arbre, n.id)} ${noeud?.texte || 'Sans titre'}${noeud?.tache && noeud.fait ? ', faite' : ''}`,
      data: {
        libelle: n.id === RACINE ? '' : (noeud?.texte ?? ''),
        cote: coteEtiquette({ ...n, ...p }, plan, parent),
        fait: Boolean(noeud?.tache && noeud.fait),
        date,
        urgent: estUrgent,
        selectionne: selection === n.id,
        cible: cible === n.id,
        origine: relier?.de === n.id,
        edition: edition === n.id,
        couleur,
        calque: formaterCalque(calque),
      },
    };
  }), [plan, arbre, affiche, urgente, apercuDate, selection, cible, relier, edition, couleur, calque, titre]);

  const onNodesChange = useCallback((changes: NodeChange<NoeudGraphe>[]) => {
    const deplacements = changes.filter((c) => c.type === 'position' && c.position);
    if (!deplacements.length) return;
    setAffiche((prev) => {
      const m = new Map(prev);
      for (const c of deplacements) {
        if (c.type !== 'position' || !c.position) continue;
        // Frise : seul l'axe du temps bouge.
        const y = plan.disposition === 'frise' ? (departGlisse.current?.y ?? c.position.y) : c.position.y;
        m.set(c.id, { x: c.position.x, y });
      }
      return m;
    });
  }, [plan.disposition]);
  void applyNodeChanges;

  // ───────── Glisser : rattacher, épingler ou changer la date ─────────
  const onNodeDragStart: OnNodeDrag<NoeudGraphe> = (_e, n) => {
    glisseEnCours.current = n.id;
    departGlisse.current = { ...n.position };
    setSelection(n.id);
  };
  const onNodeDrag: OnNodeDrag<NoeudGraphe> = (_e, n) => {
    if (plan.disposition === 'frise' && plan.axe) {
      const origine = arbre.parId.get(n.id)?.echeance ?? null;
      setApercuDate({ id: n.id, date: dateCourte(dateDepuisX(n.position.x, plan.axe, origine)) });
      return;
    }
    // Cible de rattachement : le nœud sous le point déplacé (zone selon sa forme).
    const parentActuel = arbre.parId.get(n.id)?.parent;
    let candidat: string | null = null;
    for (const m of plan.noeuds) {
      if (m.id === n.id || m.id === parentActuel || estDansSousArbre(arbre, n.id, m.id)) continue;
      const p = afficheRef.current.get(m.id) ?? m;
      const dx = Math.abs(n.position.x - p.x);
      const dy = Math.abs(n.position.y - p.y);
      const g = genre(m, plan, arbre);
      const texte = arbre.parId.get(m.id)?.texte ?? '';
      const dedans = g === 'centre' ? Math.hypot(dx, dy) < 32
        : g === 'branche' ? dx < (texte.length * 10 + 24) / 2 + 6 && dy < 20
        : Math.hypot(dx, dy) < 22;
      if (dedans) { candidat = m.id; break; }
    }
    if (minuterieCible.current?.id === candidat) return;
    if (minuterieCible.current) clearTimeout(minuterieCible.current.t);
    setCible(null);
    minuterieCible.current = candidat ? { id: candidat, t: setTimeout(() => setCible(candidat), 300) } : null;
  };
  const onNodeDragStop: OnNodeDrag<NoeudGraphe> = (_e, n) => {
    glisseEnCours.current = null;
    if (minuterieCible.current) clearTimeout(minuterieCible.current.t);
    minuterieCible.current = null;
    if (plan.disposition === 'frise' && plan.axe) {
      const origine = arbre.parId.get(n.id)?.echeance ?? null;
      etape(() => definirEcheance(doc, n.id, dateDepuisX(n.position.x, plan.axe!, origine)));
      setApercuDate(null);
    } else if (cible) {
      const parent = cible === RACINE ? RACINE : cible;
      etape(() => deplacer(doc, n.id, parent, arbre.enfants.get(parent)?.length ?? 0));
      setCible(null);
    } else {
      etape(() => epingler(doc, plan.disposition, n.id, n.position));
    }
    departGlisse.current = null;
  };

  // ───────── Toucher, double-toucher, relier ─────────
  const dernierToucherFond = useRef(0);
  const onNodeClick: NodeMouseHandler<NoeudGraphe> = (_e, n) => {
    if (relier) {
      if (!relier.de) { setRelier({ de: n.id }); return; }
      const id = creerLien(doc, arbre, relier.de, n.id);
      setRelier(null);
      if (id) setLienOuvert(id);
      return;
    }
    setSelection((s) => (s === n.id ? s : n.id));
  };
  const onNodeDoubleClick: NodeMouseHandler<NoeudGraphe> = (_e, n) => {
    if (n.id !== RACINE) setEdition(n.id);
  };
  const onPaneClick = () => {
    const t = Date.now();
    if (t - dernierToucherFond.current < 320) recadrer();
    dernierToucherFond.current = t;
    setSelection(null);
    if (relier && !relier.de) setRelier(null);
  };

  const ajouter = () => {
    const parent = selection && selection !== centre ? selection : centre;
    let id = '';
    etape(() => { id = creerNoeud(doc, parent); });
    setSelection(id);
    setEdition(id);
  };
  const replier = () => { if (selection && selection !== centre) etape(() => basculerReplie(doc, selection)); };
  const supprimerSelection = () => {
    if (!selection || selection === centre || selection === RACINE) return;
    const texte = arbre.parId.get(selection)?.texte || 'Élément';
    etape(() => supprimer(doc, selection));
    setSelection(null);
    setAvis(`${texte} supprimé`);
  };

  // ───────── Clavier (ordinateur) ─────────
  const surTouche = (e: RKeyboardEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('input, textarea')) return;
    const mod = e.metaKey || e.ctrlKey;
    if (e.key === 'Escape') { setRelier(null); setSelection(null); return; }
    if (mod && e.key === 'ArrowRight' && selection) { e.preventDefault(); ouvrirBranche(selection); return; }
    if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      const depuis = selection ? parId.get(selection) : parId.get(centre);
      if (!depuis) return;
      const sens = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[e.key]!;
      let meilleur: string | null = null;
      let score = Infinity;
      for (const n of plan.noeuds) {
        if (n.id === depuis.id) continue;
        const dx = n.x - depuis.x;
        const dy = n.y - depuis.y;
        const avance = dx * sens[0]! + dy * sens[1]!;
        if (avance <= 0) continue;
        const s = avance + Math.abs(dx * sens[1]! + dy * sens[0]!) * 2;
        if (s < score) { score = s; meilleur = n.id; }
      }
      if (meilleur) setSelection(meilleur);
      return;
    }
    if (e.key === 'Enter' && selection && selection !== RACINE) { e.preventDefault(); setEdition(selection); return; }
    if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); ajouter(); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); supprimerSelection(); }
  };

  const contexte = useMemo(() => ({
    renommer: (id: string, texte: string) => { if (arbre.parId.has(id)) etape(() => definirTexte(doc, id, texte)); },
    finEdition: () => setEdition(null),
  }), [arbre, doc, etape]);

  // ───────── Panneau de sélection ─────────
  const sel = selection && selection !== RACINE ? arbre.parId.get(selection) : undefined;
  const selAvancement = sel ? avancement(arbre, sel.id) : null;
  const ligneSel = sel ? [
    numero(arbre, sel.id),
    sel.echeance ? dateCourte(sel.echeance) : null,
    selAvancement && selAvancement.total ? `${selAvancement.faites}/${selAvancement.total}` : null,
  ].filter(Boolean) : [];

  const lien = lienOuvert ? liensLibres.find((l) => l.id === lienOuvert) : undefined;
  const titreCentre = centre === RACINE ? titre : (arbre.parId.get(centre)?.texte || 'Sans titre');
  const resume = `${titreCentre} : ${plan.noeuds.length - 1} éléments en disposition ${DISPOSITIONS.find((d) => d.valeur === disposition)?.libelle.toLowerCase()}${plan.sansDate ? `, ${plan.sansDate} sans date` : ''}.`;

  return (
    <ContexteGraphe.Provider value={contexte}>
      <section
        className={`graphe${large ? ' graphe-large' : ''}${relier ? ' en-relier' : ''}`}
        aria-label="Graphe"
        style={{ ['--calque-courant' as string]: `var(--calque-${couleur})` }}
      >
        {!large && (
          <div className="graphe-tete">
            <BoutonIcone libelle="Retour à la page" sansCadre onClick={onRetour}><IcRetour /></BoutonIcone>
            <h1 className="t-label graphe-titre">{titreCentre}</h1>
          </div>
        )}
        <div className="onglets" role="tablist" aria-label="Disposition">
          {DISPOSITIONS.map((d) => (
            <button key={d.valeur} type="button" role="tab" aria-selected={disposition === d.valeur}
              className={`onglet t-label${disposition === d.valeur ? ' actif' : ''}`} onClick={() => onDisposition(d.valeur)}>
              {d.libelle}
            </button>
          ))}
        </div>

        <div className="toile" ref={conteneur} tabIndex={0} onKeyDown={surTouche} aria-label={resume} role="application" aria-roledescription="graphe">
          <ReactFlow<NoeudGraphe>
            nodes={nodes}
            edges={[]}
            nodeTypes={TYPES_NOEUDS}
            nodeOrigin={[0.5, 0.5]}
            onNodesChange={onNodesChange}
            onNodeDragStart={onNodeDragStart}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onPaneClick={onPaneClick}
            onInit={() => setTimeout(recadrer, 0)}
            zoomOnDoubleClick={false}
            minZoom={0.15}
            maxZoom={2.5}
            onlyRenderVisibleElements={plan.noeuds.length > 150}
            nodesFocusable={false}
            deleteKeyCode={null}
          >
            <ViewportPortal>
              <Fond plan={plan} affiche={affiche} liens={liensLibres} arbre={arbre} onLien={setLienOuvert} />
            </ViewportPortal>
            {large && plan.disposition !== 'frise' && <MiniCarte plan={plan} affiche={affiche} />}
          </ReactFlow>
          {plan.disposition === 'frise' && plan.sansDate > 0 && (
            <p className="t-cote frise-sans-date">{plan.sansDate} sans date</p>
          )}
          {plan.disposition === 'frise' && plan.noeuds.length === 0 && (
            <p className="t-cote frise-vide">Aucune échéance</p>
          )}
        </div>

        {relier && (
          <div className="graphe-consigne t-cote" role="status">
            {relier.de ? 'Toucher le second nœud' : 'Toucher le premier nœud'}
            <button type="button" className="t-label lien-action" onClick={() => setRelier(null)}>Annuler</button>
          </div>
        )}

        {sel && !relier && (
          <div className={`selection${urgente === sel.id ? ' selection-urgente' : ''}`} role="region" aria-label="Sélection">
            <div className="selection-texte">
              <span className="t-corps">{sel.texte || 'Sans titre'}</span>
              <span className="t-cote">
                {ligneSel.map((x, i) => (
                  <span key={i}>{i > 0 && ' · '}<span className={i === 1 && sel.echeance && urgente === sel.id ? 'redline' : undefined}>{x}</span></span>
                ))}
              </span>
              {sel.echeance && <span className="visuellement-cache">Échéance {dateParlee(sel.echeance)}</span>}
            </div>
            <BoutonIcone libelle="Détails" onClick={() => ouvrirPanneau(sel.id)}><IcSuivant /></BoutonIcone>
          </div>
        )}

        <div className="outils-graphe" role="toolbar" aria-label="Outils du graphe">
          <BoutonIcone libelle="Ajouter" onClick={ajouter}><IcPlus /></BoutonIcone>
          <BoutonIcone libelle="Relier" actif={relier !== null} onClick={() => setRelier((r) => (r ? null : { de: selection && selection !== RACINE ? selection : null }))}>
            <IcRelier />
          </BoutonIcone>
          <BoutonIcone libelle={sel?.replie ? 'Déplier' : 'Replier'} disabled={!sel || sel.enfants.length === 0} onClick={replier}>
            {sel?.replie ? <IcDeplier /> : <IcReplier />}
          </BoutonIcone>
          <BoutonIcone libelle="Exporter" onClick={() => setExporter(true)}><IcExporter /></BoutonIcone>
          {epingles.size > 0 && disposition !== 'frise' && (
            <BoutonIcone libelle="Réorganiser" onClick={() => etape(() => reorganiser(doc, disposition))}><IcReorganiser /></BoutonIcone>
          )}
        </div>

        <Feuille ouverte={lien !== undefined} onFermer={() => setLienOuvert(null)} titre="Lien">
          {lien && <EditionLien doc={doc} lien={lien} onSupprimer={() => { etape(() => supprimerLien(doc, lien.id)); setLienOuvert(null); }} />}
        </Feuille>

        <Feuille ouverte={exporter} onFermer={() => setExporter(false)} titre="Exporter">
          <Choix onClick={() => void exporterGraphe('svg')}>SVG</Choix>
          <Choix onClick={() => void exporterGraphe('png')}>PNG</Choix>
        </Feuille>

        {avis && <Avis texte={avis} action="Annuler" onAction={() => annuler.undo()} onFin={() => setAvis(null)} />}
      </section>
    </ContexteGraphe.Provider>
  );

  async function exporterGraphe(format: 'svg' | 'png') {
    setExporter(false);
    const { versSvg, versPng, telecharger } = await import('./export');
    const donnees = {
      plan, arbre, liens: liensLibres, titre: titreCentre, couleur,
      urgente, dateUrgente: urgente && arbre.parId.get(urgente)?.echeance ? dateCourte(arbre.parId.get(urgente)!.echeance!) : null,
    };
    const nom = `${titreCentre.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}-${disposition}.${format}`;
    if (format === 'svg') telecharger(new Blob([(await versSvg(donnees)).svg], { type: 'image/svg+xml' }), nom);
    else telecharger(await versPng(donnees), nom);
  }
}

/** Couche sous les nœuds : cercles de construction, axe de la frise, arêtes, liens libres. */
function Fond({ plan, affiche, liens, arbre, onLien }: {
  plan: Plan; affiche: Map<string, Point>; liens: LienLibre[]; arbre: ReturnType<typeof useArbre>; onLien: (id: string) => void;
}) {
  // Les arêtes présentes à l'ouverture ne s'animent pas ; celles des nouveaux nœuds se tracent.
  const initiales = useRef<Set<string> | null>(null);
  if (initiales.current === null) initiales.current = new Set(arbre.parId.keys());
  const coude = plan.disposition === 'arbre';
  const p = (id: string) => affiche.get(id);
  const axe = plan.axe;
  const bas = axe ? Math.max(60, ...axe.couloirs.map((c) => c.y + c.hauteur)) : 0;
  const etendue = 4000;
  return (
    <svg className="fond-graphe" aria-hidden="true">
      {plan.cercles.map((r, i) => <circle key={i} r={r} className="cercle-construction" />)}
      {plan.disposition === 'radial' && <><line x1={-etendue} x2={etendue} y1={0} y2={0} className="axe-construction" /><line y1={-etendue} y2={etendue} x1={0} x2={0} className="axe-construction" /></>}
      {axe && (
        <g>
          {axe.couloirs.map((c) => (
            <g key={c.id}>
              <line x1={-etendue} x2={etendue} y1={c.y} y2={c.y} className="couloir" />
              <text x={4} y={c.y + 18} className="t-label etiquette-couloir">{arbre.parId.get(c.id)?.texte ?? ''}</text>
            </g>
          ))}
          <line x1={-etendue} x2={etendue} y1={bas} y2={bas} className="axe-temps" />
          {axe.graduations.map((g) => (
            <g key={g.x}>
              <line x1={g.x} x2={g.x} y1={bas} y2={bas + (g.majeure ? 10 : 5)} className="graduation" />
              <text x={g.x + 4} y={bas + 24} className="t-cote graduation-texte">{g.libelle}</text>
            </g>
          ))}
          <line x1={axe.aujourdhuiX} x2={axe.aujourdhuiX} y1={-30} y2={bas} className="aujourdhui" />
          <text x={axe.aujourdhuiX + 4} y={-14} className="t-cote aujourdhui-texte">auj.</text>
        </g>
      )}
      {plan.aretes.map((a) => {
        const de = p(a.de); const vers = p(a.vers);
        const nouvelle = !initiales.current?.has(a.vers);
        return de && vers ? (
          <path key={`${a.de}-${a.vers}`} d={cheminArete(de, vers, coude, coude && Math.abs(vers.x - de.x) < Math.abs(vers.y - de.y))}
            className={`arete${nouvelle ? ' arete-nouvelle' : ''}`} pathLength={nouvelle ? 1 : undefined} />
        ) : null;
      })}
      {liens.map((l) => {
        const de = p(l.de); const vers = p(l.vers);
        if (!de || !vers) return null;
        const { d, milieu } = cheminLien(de, vers);
        return (
          <g key={l.id} className={`lien-libre${l.style === 'trait' ? ' lien-trait' : ''}`} onClick={() => onLien(l.id)}>
            <path d={d} className="lien-zone" />
            <path d={d} className="lien-trace" />
            {l.libelle && <text x={milieu.x} y={milieu.y - 6} className="t-cote lien-texte" textAnchor="middle">{l.libelle}</text>}
          </g>
        );
      })}
    </svg>
  );
}

function EditionLien({ doc, lien, onSupprimer }: { doc: Y.Doc; lien: LienLibre; onSupprimer: () => void }) {
  return (
    <div className="form-ajout">
      <label className="visuellement-cache" htmlFor="libelle-lien">Libellé du lien</label>
      <input id="libelle-lien" className="champ t-corps" placeholder="Libellé (facultatif)" defaultValue={lien.libelle}
        onChange={(e) => modifierLien(doc, lien.id, 'libelle', e.target.value)} autoComplete="off" />
      <Segments
        libelle="Style"
        valeur={lien.style}
        onChange={(v) => modifierLien(doc, lien.id, 'style', v)}
        options={[{ valeur: 'pointille', libelle: 'Pointillé' }, { valeur: 'trait', libelle: 'Trait' }]}
      />
      <Choix rouge onClick={onSupprimer}>Supprimer le lien</Choix>
    </div>
  );
}
