import { Indice, signalerGeste } from '../ui/Indice';
import {
  useCallback, useEffect, useMemo, useRef, useState,
  type KeyboardEvent as RKeyboardEvent, type MouseEvent as RMouseEvent, type PointerEvent as RPointerEvent, type ReactNode,
} from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useStockage } from '../app/contexte';
import { lien } from '../app/route';
import { useMaintenant } from '../app/temps';
import { dateBloc, type ResumeProjet } from '../data/projet';
import type { LigneEcheance } from '../data/stockage';
import type { DateLocale } from '../data/schema';
import { CarreCalque } from '../design/signature';
import { IcRetour, IcSuite, IcSuivant } from '../design/icones';
import { definirEcheance } from '../tree/arbre';
import {
  INITIALES, MOIS, ajouterJours, ajouterMois, debutMois, deplacerDate, grilleMois, joursSemaine, memeMois,
} from '../time/calendrier';
import { aujourdhui, compteARebours, dateJour, dateParlee, enRetard } from '../time/dates';
import { Avis, BoutonIcone, Choix, Feuille } from '../ui/ui';
import './secondaires.css';
import './calendrier.css';

type VueCal = 'mois' | 'semaine' | 'agenda';
const VUES: { valeur: VueCal; libelle: string }[] = [
  { valeur: 'mois', libelle: 'Mois' }, { valeur: 'semaine', libelle: 'Semaine' }, { valeur: 'agenda', libelle: 'Agenda' },
];

interface Ligne { e: LigneEcheance; p: ResumeProjet }

const jourDe = (d: DateLocale) => d.slice(0, 10);

/** Calendrier : mois, semaine, agenda (brief : design/briefs/temps.md §2). */
export default function Calendrier() {
  const stockage = useStockage();
  const maintenant = useMaintenant();
  const aujourd = aujourdhui(maintenant);
  const vue = useLiveQuery(() => stockage.reglage<VueCal>('vueCalendrier', 'mois'), [stockage]) ?? 'mois';
  const [choisi, setChoisi] = useState(aujourd);
  const [actions, setActions] = useState<Ligne | null>(null);
  const [replanifier, setReplanifier] = useState<Ligne | null>(null);
  const [avis, setAvis] = useState<{ texte: string; annuler: () => void } | null>(null);

  const lignes = useLiveQuery(async () => {
    const [echeances, projets] = await Promise.all([stockage.index.echeances.orderBy('date').toArray(), stockage.index.projets.toArray()]);
    const parId = new Map(projets.map((p) => [p.id, p]));
    return echeances.flatMap((e) => {
      const p = parId.get(e.projetId);
      return p && p.statut !== 'archive' ? [{ e, p }] : [];
    });
  }, [stockage]);

  const parJour = useMemo(() => {
    const m = new Map<DateLocale, Ligne[]>();
    for (const l of lignes ?? []) {
      const j = jourDe(l.e.date);
      m.set(j, [...(m.get(j) ?? []), l]);
    }
    return m;
  }, [lignes]);
  // La plus proche à venir : en redline, comme sur l'accueil.
  const urgente = lignes?.find((l) => !enRetard(l.e.date, maintenant))?.e.id ?? null;

  /** Change la date (heure gardée) ; « Annuler » pendant quelques secondes. */
  const deplacer = useCallback(async (l: Ligne, jour: DateLocale) => {
    const ancienne = l.e.date;
    const nouvelle = deplacerDate(ancienne, jour);
    if (nouvelle === ancienne) return;
    const poser = async (d: DateLocale) => {
      const p = stockage.ouvrir(l.e.projetId);
      await p.pret;
      if (l.e.genre === 'noeud') definirEcheance(p.doc, l.e.cible, d); else dateBloc(p.doc, l.e.cible, d);
    };
    await poser(nouvelle);
    setAvis({ texte: `Déplacée au ${dateJour(nouvelle, maintenant)}`, annuler: () => void poser(ancienne) });
  }, [stockage, maintenant]);

  const glisser = useGlisser((l, jour) => { signalerGeste('calendrier'); void deplacer(l, jour); });

  const changerVue = (v: VueCal) => void stockage.poserReglage('vueCalendrier', v);
  const decaler = (sens: -1 | 1) => {
    if (vue === 'semaine') { setChoisi(ajouterJours(choisi, 7 * sens)); return; }
    const m = ajouterMois(debutMois(choisi), sens);
    setChoisi(memeMois(m, aujourd) ? aujourd : m);
  };

  const [annee, mois] = choisi.split('-').map(Number) as [number, number];
  const ligneDe = (l: Ligne) => (
    <LigneCal key={l.e.id} l={l} maintenant={maintenant} urgente={l.e.id === urgente} onActions={() => setActions(l)} glisser={glisser.lier(l)} />
  );

  return (
    <div className="ecran calendrier">
      <header className="cal-tete">
        {vue === 'agenda' ? (
          <h1 className="t-titre">Agenda</h1>
        ) : (
          <>
            <div>
              <p className="t-cote" aria-hidden="true">{annee}</p>
              <h1 className="t-titre" aria-live="polite">
                <span className="visuellement-cache">{vue === 'semaine' ? 'Semaine, ' : ''}</span>
                {MOIS[mois - 1]}<span className="visuellement-cache"> {annee}</span>
              </h1>
            </div>
            <div className="cal-fleches">
              <BoutonIcone libelle={vue === 'semaine' ? 'Semaine précédente' : 'Mois précédent'} sansCadre onClick={() => decaler(-1)}><IcRetour /></BoutonIcone>
              <BoutonIcone libelle={vue === 'semaine' ? 'Semaine suivante' : 'Mois suivant'} sansCadre onClick={() => decaler(1)}><IcSuivant /></BoutonIcone>
            </div>
          </>
        )}
      </header>

      <div className="onglets cal-onglets" role="tablist" aria-label="Vue du calendrier">
        {VUES.map((v) => (
          <button key={v.valeur} type="button" role="tab" aria-selected={vue === v.valeur}
            className={`onglet t-label${vue === v.valeur ? ' actif' : ''}`} onClick={() => changerVue(v.valeur)}>{v.libelle}</button>
        ))}
      </div>

      {lignes && vue === 'mois' && (
        <>
          <GrilleMois choisi={choisi} aujourd={aujourd} parJour={parJour} maintenant={maintenant} survol={glisser.survol}
            onChoisir={setChoisi} onMois={decaler} onAujourdhui={() => setChoisi(aujourd)} />
          {![...parJour.keys()].some((j) => memeMois(j, choisi)) && <p className="t-cote cal-vide">Aucune échéance ce mois-ci</p>}
          <section className="cal-jour" aria-label={`Échéances du ${dateParlee(choisi)}`}>
            <h2 className="t-label">{dateJour(choisi, maintenant)}</h2>
            {(parJour.get(choisi) ?? []).length === 0
              ? <p className="t-cote cal-rien">Rien ce jour-là</p>
              : <ul className="liste-simple">{(parJour.get(choisi) ?? []).map(ligneDe)}</ul>}
            {(parJour.get(choisi) ?? []).length > 0 && <div className="cal-indice"><Indice cle="calendrier" texte="Appui long sur une échéance pour la déplacer." /></div>}
          </section>
        </>
      )}

      {lignes && vue === 'semaine' && (
        <ol className="cal-semaine" aria-label="Semaine">
          {joursSemaine(choisi).map((j) => (
            <li key={j} data-jour={j} className={`cal-semaine-jour${j === aujourd ? ' aujourdhui' : ''}${glisser.survol === j ? ' survol' : ''}`}>
              <h2 className="t-label">{dateJour(j, maintenant)}{j === aujourd && <span className="visuellement-cache">, aujourd’hui</span>}</h2>
              {(parJour.get(j) ?? []).length > 0 && <ul className="liste-simple">{(parJour.get(j) ?? []).map(ligneDe)}</ul>}
            </li>
          ))}
        </ol>
      )}

      {lignes && vue === 'agenda' && <Agenda lignes={lignes} maintenant={maintenant} ligneDe={ligneDe} />}

      {glisser.fantome}

      <Feuille ouverte={actions !== null} onFermer={() => setActions(null)} titre={actions?.e.titre || 'Échéance'}>
        <div className="section-feuille">
          <Choix onClick={() => { const l = actions; setActions(null); if (l) location.hash = lienLigne(l); }}>Ouvrir dans le projet</Choix>
          <Choix onClick={() => { const l = actions; setActions(null); setReplanifier(l); }}>Replanifier</Choix>
        </div>
      </Feuille>
      <Feuille ouverte={replanifier !== null} onFermer={() => setReplanifier(null)} titre="Replanifier">
        {replanifier && (
          <div className="form-ajout">
            <label className="t-cote" htmlFor="date-replanifier">Nouvelle date{replanifier.e.date.length > 10 ? ' (heure gardée)' : ''}</label>
            <input id="date-replanifier" type="date" className="champ t-corps" defaultValue={jourDe(replanifier.e.date)} autoFocus
              onChange={(e) => {
                if (!e.target.value) return;
                const l = replanifier;
                setReplanifier(null);
                void deplacer(l, e.target.value);
              }} />
          </div>
        )}
      </Feuille>
      {avis && <Avis texte={avis.texte} action="Annuler" onAction={avis.annuler} onFin={() => setAvis(null)} />}
    </div>
  );
}

function lienLigne(l: Ligne): string {
  return lien({ ecran: 'projet', id: l.e.projetId, branche: null, vue: 'page', ...(l.e.genre === 'bloc' ? { bloc: l.e.cible } : { noeud: l.e.cible }) });
}

function LigneCal({ l, maintenant, urgente, onActions, glisser }: {
  l: Ligne; maintenant: number; urgente: boolean; onActions: () => void; glisser: ReturnType<ReturnType<typeof useGlisser>['lier']>;
}) {
  const retard = enRetard(l.e.date, maintenant);
  const titre = l.e.titre || 'Sans titre';
  return (
    <li className="cal-ligne">
      <a href={lienLigne(l)} className="ligne-agenda" {...glisser}
        aria-label={`${titre}, ${l.p.titre}, ${dateParlee(l.e.date)}${retard ? ', en retard' : ''}`}>
        <CarreCalque couleur={l.p.couleur} taille={14} />
        <span className="ligne-agenda-titre">
          <span className="t-corps cal-titre">{titre}</span>
          <span className="t-cote">{l.p.titre || 'Sans titre'}</span>
        </span>
        <span className={`t-cote${retard || urgente ? ' redline' : ''}`}>{retard ? 'en retard' : compteARebours(l.e.date, maintenant)}</span>
      </a>
      <BoutonIcone libelle={`Actions : ${titre}`} sansCadre onClick={onActions}><IcSuite /></BoutonIcone>
    </li>
  );
}

function GrilleMois({ choisi, aujourd, parJour, maintenant, survol, onChoisir, onMois, onAujourdhui }: {
  choisi: DateLocale; aujourd: DateLocale; parJour: Map<DateLocale, Ligne[]>; maintenant: number; survol: DateLocale | null;
  onChoisir: (d: DateLocale) => void; onMois: (s: -1 | 1) => void; onAujourdhui: () => void;
}) {
  const grille = useMemo(() => grilleMois(choisi), [choisi]);
  const ref = useRef<HTMLDivElement>(null);
  const clavier = useRef(false);
  const balayage = useRef<{ x: number; y: number } | null>(null);

  // Focus suivi au clavier : le jour choisi garde le focus quand il change.
  useEffect(() => {
    if (!clavier.current) return;
    clavier.current = false;
    ref.current?.querySelector<HTMLElement>(`[data-jour="${choisi}"] button`)?.focus();
  }, [choisi]);

  const touche = (e: RKeyboardEvent) => {
    const pas: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let suivant: DateLocale | null = null;
    if (e.key in pas) suivant = ajouterJours(choisi, pas[e.key]!);
    else if (e.key === 'PageUp') suivant = ajouterMois(choisi, -1);
    else if (e.key === 'PageDown') suivant = ajouterMois(choisi, 1);
    else if (e.key === 't' || e.key === 'T') { e.preventDefault(); clavier.current = true; onAujourdhui(); return; }
    if (!suivant) return;
    e.preventDefault();
    clavier.current = true;
    onChoisir(suivant);
  };

  // Balayage horizontal (doigt) : mois précédent ou suivant.
  const debut = (e: RPointerEvent) => { if (e.pointerType === 'touch') balayage.current = { x: e.clientX, y: e.clientY }; };
  const fin = (e: RPointerEvent) => {
    const b = balayage.current;
    balayage.current = null;
    if (!b) return;
    const dx = e.clientX - b.x;
    if (Math.abs(dx) > 60 && Math.abs(e.clientY - b.y) < 40) onMois(dx < 0 ? 1 : -1);
  };

  return (
    <div className="cal-mois" role="grid" aria-label="Mois" ref={ref} onKeyDown={touche} onPointerDown={debut} onPointerUp={fin}>
      <div role="row" className="cal-entete">
        {INITIALES.map((x, i) => <span key={i} role="columnheader" className="t-cote" aria-label={['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'][i]}>{x}</span>)}
      </div>
      {grille.map((semaine) => (
        <div role="row" key={semaine[0]} className="cal-rangee">
          {semaine.map((j) => {
            const l = parJour.get(j) ?? [];
            const retard = l.some((x) => enRetard(x.e.date, maintenant));
            const titres = l.map((x) => x.e.titre || 'Sans titre').join(', ');
            const etiquette = `${dateParlee(j)}${j === aujourd ? ', aujourd’hui' : ''}${l.length ? `, ${l.length} échéance${l.length > 1 ? 's' : ''} : ${titres}` : ''}${retard ? ', en retard' : ''}`;
            const classes = ['cal-case', memeMois(j, choisi) ? '' : 'hors-mois', j === aujourd ? 'aujourdhui' : '', j === choisi ? 'choisi' : '', survol === j ? 'survol' : ''].filter(Boolean).join(' ');
            return (
              <div role="gridcell" key={j} data-jour={j} className={classes} aria-selected={j === choisi}>
                <button type="button" tabIndex={j === choisi ? 0 : -1} aria-label={etiquette} onClick={() => onChoisir(j)}>
                  <span className="t-corps cal-num" aria-hidden="true">{Number(j.slice(8))}</span>
                  <span className="cal-carres" aria-hidden="true">
                    {l.slice(0, 3).map((x) => (enRetard(x.e.date, maintenant)
                      ? <span key={x.e.id} className="carre-retard" />
                      : <CarreCalque key={x.e.id} couleur={x.p.couleur} taille={7} />))}
                    {l.length > 3 && <span className="t-cote cal-plus">+{l.length - 3}</span>}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Agenda({ lignes, maintenant, ligneDe }: { lignes: Ligne[]; maintenant: number; ligneDe: (l: Ligne) => ReactNode }) {
  if (lignes.length === 0) return <p className="t-cote cal-vide">Aucune échéance</p>;
  const retard = lignes.filter((l) => enRetard(l.e.date, maintenant));
  const avenir = lignes.filter((l) => !enRetard(l.e.date, maintenant));
  const groupes = new Map<DateLocale, Ligne[]>();
  for (const l of avenir) groupes.set(jourDe(l.e.date), [...(groupes.get(jourDe(l.e.date)) ?? []), l]);
  return (
    <>
      {retard.length > 0 && (
        <section className="cal-groupe" aria-label="En retard">
          <h2 className="t-label redline">En retard</h2>
          <ul className="liste-simple">{retard.map(ligneDe)}</ul>
        </section>
      )}
      {[...groupes].map(([j, l]) => (
        <section key={j} className="cal-groupe" aria-label={dateParlee(j)}>
          <h2 className="t-label">{dateJour(j, maintenant)}</h2>
          <ul className="liste-simple">{l.map(ligneDe)}</ul>
        </section>
      ))}
    </>
  );
}

/**
 * Glisser une échéance sur un jour :
 * - doigt : appui long (0,4 s), puis glisser ; le défilement est bloqué pendant le geste ;
 * - souris : glisser dès 6 px.
 * Le jour survolé est encadré ; un relâcher sur un autre jour replanifie.
 */
function useGlisser(onDeposer: (l: Ligne, jour: DateLocale) => void) {
  const [geste, setGeste] = useState<{ l: Ligne; x: number; y: number; jour: DateLocale | null } | null>(null);
  const r = useRef<{ l: Ligne; x: number; y: number; type: string; id: number; cible: Element; actif: boolean; minuterie: ReturnType<typeof setTimeout> | null } | null>(null);
  const bloquerClic = useRef(false);

  useEffect(() => {
    if (!geste) return;
    const bloquer = (e: TouchEvent) => e.preventDefault();
    document.addEventListener('touchmove', bloquer, { passive: false });
    return () => document.removeEventListener('touchmove', bloquer);
  }, [geste !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  const jourSous = (x: number, y: number): DateLocale | null =>
    (document.elementFromPoint(x, y)?.closest('[data-jour]') as HTMLElement | null)?.dataset.jour ?? null;

  const activer = () => {
    const c = r.current;
    if (!c) return;
    c.actif = true;
    try { c.cible.setPointerCapture(c.id); } catch { /* pointeur déjà relâché */ }
    navigator.vibrate?.(10);
    setGeste({ l: c.l, x: c.x, y: c.y, jour: jourSous(c.x, c.y) });
  };
  const fin = () => {
    if (r.current?.minuterie) clearTimeout(r.current.minuterie);
    r.current = null;
    setGeste(null);
  };

  const lier = (l: Ligne) => ({
    onPointerDown: (e: RPointerEvent) => {
      if (e.button !== 0) return;
      r.current = { l, x: e.clientX, y: e.clientY, type: e.pointerType, id: e.pointerId, cible: e.currentTarget, actif: false, minuterie: null };
      if (e.pointerType !== 'mouse') r.current.minuterie = setTimeout(activer, 400);
    },
    onPointerMove: (e: RPointerEvent) => {
      const c = r.current;
      if (!c || c.id !== e.pointerId) return;
      if (!c.actif) {
        const d = Math.hypot(e.clientX - c.x, e.clientY - c.y);
        if (c.type === 'mouse' && d > 6) { c.x = e.clientX; c.y = e.clientY; activer(); } else if (c.type !== 'mouse' && d > 8) fin();
        return;
      }
      setGeste({ l: c.l, x: e.clientX, y: e.clientY, jour: jourSous(e.clientX, e.clientY) });
    },
    onPointerUp: (e: RPointerEvent) => {
      const c = r.current;
      if (c?.actif) {
        bloquerClic.current = true;
        const jour = jourSous(e.clientX, e.clientY);
        if (jour && jour !== jourDe(c.l.e.date)) onDeposer(c.l, jour);
      }
      fin();
    },
    onPointerCancel: fin,
    // Pas de glisser-déposer natif du lien (il annulerait le geste).
    draggable: false,
    onDragStart: (e: RMouseEvent) => e.preventDefault(),
    onClick: (e: RMouseEvent) => { if (bloquerClic.current) { e.preventDefault(); bloquerClic.current = false; } },
    onContextMenu: (e: RMouseEvent) => { if (r.current) e.preventDefault(); },
  });

  const fantome = geste ? (
    <div className="cal-fantome t-cote" style={{ left: geste.x, top: geste.y }} aria-hidden="true">
      {geste.l.e.titre || 'Sans titre'}
    </div>
  ) : null;

  return { lier, survol: geste?.jour ?? null, fantome };
}
