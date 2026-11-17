import { Indice, signalerGeste } from '../ui/Indice';
import {
  memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState,
  type KeyboardEvent as RKeyboardEvent, type PointerEvent as RPointerEvent,
} from 'react';
import type * as Y from 'yjs';
import { useArbre } from '../app/contexte';
import { CaseACocher, Nuage } from '../design/signature';
import { RACINE } from '../data/schema';
import {
  basculerFait, basculerReplie, creerApres, creerNoeud, decaler, definirTexte, deplacer, desindenter,
  estDansSousArbre, fusionnerAvec, indenter, supprimer,
} from '../tree/arbre';
import { IcDesindenter, IcIndenter } from '../design/icones';
import { aplatir, type Ligne } from '../tree/lignes';
import { compteARebours, dateCourte, dateParlee, enRetard } from '../time/dates';
import { BarreClavier } from './BarreClavier';
import './nomenclature.css';

export interface ActionsNomenclature {
  ouvrirPanneau: (id: string, champ?: 'date' | 'couleur') => void;
  ouvrirBranche: (id: string) => void;
  remonter: () => void;
}

/** Focus voulu ; `valeur` : texte attendu dans la ligne (si l'on a déjà tapé autre chose, on ne bouge plus le curseur). */
interface Focus { id: string; pos: number | 'fin'; valeur?: string }

/** Fonctions stables passées aux lignes : une ligne ne se redessine que si ses données changent. */
interface Controleur {
  enregistrer: (id: string, el: HTMLTextAreaElement | null) => void;
  surTouche: (e: RKeyboardEvent<HTMLTextAreaElement>, id: string) => void;
  surFocus: (id: string) => void;
  surFlou: (id: string) => void;
  basculerFaites: (id: string) => void;
  ouvrirPanneau: (id: string) => void;
  commencerGlisse: (id: string) => void;
}

const tactile = () => matchMedia('(pointer: coarse)').matches;

export function Nomenclature({
  doc, annuler, racine = RACINE, urgente, maintenant, actions, focusDemande,
}: {
  doc: Y.Doc;
  annuler: Y.UndoManager;
  racine?: string;
  /** Cible (id) de l'échéance la plus urgente : seule à porter le nuage. */
  urgente: string | null;
  maintenant: number;
  actions: ActionsNomenclature;
  /** Id à éditer dès l'affichage (nouvelle branche créée depuis le bouton +). */
  focusDemande?: string | null;
}) {
  const arbre = useArbre(doc);
  const [faitesOuvertes, setFaitesOuvertes] = useState<ReadonlySet<string>>(new Set());
  const { lignes, faitesRacine } = useMemo(() => aplatir(arbre, racine, faitesOuvertes), [arbre, racine, faitesOuvertes]);
  const champs = useRef(new Map<string, HTMLTextAreaElement>());
  const focusVoulu = useRef<Focus | null>(null);
  const [edition, setEdition] = useState<string | null>(null);
  const [glisse, setGlisse] = useState<{ id: string; avant: number } | null>(null);
  const liste = useRef<HTMLDivElement>(null);
  // Les lignes présentes à l'ouverture ne s'animent pas ; seules les nouvelles se tracent.
  const initiales = useRef<Set<string> | null>(null);
  if (initiales.current === null) initiales.current = new Set(arbre.parId.keys());

  const focaliser = useCallback((f: Focus) => { focusVoulu.current = f; }, []);
  /** Chaque opération de structure forme une étape d'annulation à part (pas fusionnée avec la frappe). */
  const etape = useCallback((f: () => void) => { annuler.stopCapturing(); f(); annuler.stopCapturing(); }, [annuler]);

  // Focus demandé de l'extérieur (bouton +) : après la fermeture de la feuille,
  // qui rend le focus au bouton qui l'a ouverte.
  useEffect(() => {
    if (!focusDemande) return;
    const t = setTimeout(() => {
      const el = champs.current.get(focusDemande);
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
      el.scrollIntoView({ block: 'center' });
    }, 30);
    return () => clearTimeout(t);
  }, [focusDemande]);

  // Applique le focus demandé après le rendu (la ligne peut venir d'être créée).
  useLayoutEffect(() => {
    const f = focusVoulu.current;
    if (!f) return;
    const el = champs.current.get(f.id);
    if (!el) return;
    focusVoulu.current = null;
    // Frappe rapide (Safari) : des lettres sont déjà dans la ligne ; replacer le curseur les mélangerait.
    if (f.valeur !== undefined && el.value !== f.valeur && document.activeElement === el) return;
    el.focus({ preventScroll: false });
    const pos = f.pos === 'fin' ? el.value.length : Math.min(f.pos, el.value.length);
    el.setSelectionRange(pos, pos);
    el.scrollIntoView({ block: 'nearest' });
  });

  const basculerFaites = (id: string) => {
    setFaitesOuvertes((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const indexLigne = (id: string) => lignes.findIndex((l) => l.noeud.id === id);

  const surTouche = (e: RKeyboardEvent<HTMLTextAreaElement>, l: Ligne) => {
    const el = e.currentTarget;
    const id = l.noeud.id;
    const mod = e.metaKey || e.ctrlKey;
    const debut = el.selectionStart === 0 && el.selectionEnd === 0;
    const pos = el.selectionStart;

    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) annuler.redo(); else annuler.undo();
      return;
    }
    if (e.key === 'Enter' && mod) {
      e.preventDefault();
      basculerFait(doc, id);
      focaliser({ id, pos });
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      const avant = el.value.slice(0, el.selectionStart);
      const apres = el.value.slice(el.selectionEnd);
      annuler.stopCapturing();
      doc.transact(() => {
        definirTexte(doc, id, avant);
        // Élément déplié avec enfants : le nouvel élément devient le premier enfant.
        const nouveau = l.noeud.enfants.length > 0 && !l.noeud.replie
          ? creerNoeud(doc, id, 0, { texte: apres })
          : creerApres(doc, id, { texte: apres, tache: l.noeud.tache });
        focaliser({ id: nouveau, pos: 0, valeur: apres });
      });
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      etape(() => {
        if (e.shiftKey) {
          if (l.noeud.parent !== racine) desindenter(doc, id);
        } else indenter(doc, id);
      });
      focaliser({ id, pos });
      return;
    }
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      etape(() => decaler(doc, id, e.key === 'ArrowUp' ? -1 : 1));
      focaliser({ id, pos });
      return;
    }
    if (mod && e.key === '.') {
      e.preventDefault();
      if (l.noeud.enfants.length) basculerReplie(doc, id);
      focaliser({ id, pos });
      return;
    }
    if (mod && e.key === 'ArrowRight') { e.preventDefault(); actions.ouvrirBranche(id); return; }
    if (mod && e.key === 'ArrowLeft') { e.preventDefault(); actions.remonter(); return; }
    if (e.key === 'Backspace' && debut) {
      const i = indexLigne(id);
      const precedente = lignes[i - 1];
      if (precedente) {
        e.preventDefault();
        annuler.stopCapturing();
        const r = fusionnerAvec(doc, id, precedente.noeud.id);
        if (r) focaliser({ id: r.focus, pos: r.curseur });
      } else if (!el.value && l.noeud.enfants.length === 0 && lignes.length > 1) {
        e.preventDefault();
        const suivante = lignes[i + 1];
        supprimer(doc, id);
        if (suivante) focaliser({ id: suivante.noeud.id, pos: 0 });
      }
      return;
    }
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !e.shiftKey && !mod) {
      const haut = e.key === 'ArrowUp';
      const avantCurseur = el.value.slice(0, pos);
      const surPremiereLigne = !avantCurseur.includes('\n') && el.selectionStart === el.selectionEnd && (haut ? caretEnHaut(el) : caretEnBas(el));
      if (!surPremiereLigne) return;
      const voisine = lignes[indexLigne(id) + (haut ? -1 : 1)];
      if (voisine) {
        e.preventDefault();
        focaliser({ id: voisine.noeud.id, pos: haut ? 'fin' : 0 });
        champs.current.get(voisine.noeud.id)?.focus();
      }
      return;
    }
    if (e.key === 'Escape') el.blur();
  };

  // ───────── Glisser pour déplacer (appui long sur le numéro) ─────────
  const terminerGlisse = useCallback((g: { id: string; avant: number } | null) => {
    if (!g) return;
    const cible = lignes[g.avant];
    if (cible) {
      if (!estDansSousArbre(arbre, g.id, cible.noeud.id)) {
        const freres = (arbre.enfants.get(cible.noeud.parent) ?? []).filter((f) => f !== g.id);
        deplacer(doc, g.id, cible.noeud.parent, freres.indexOf(cible.noeud.id));
      }
    } else {
      const derniere = lignes[lignes.length - 1];
      if (derniere && derniere.noeud.id !== g.id && !estDansSousArbre(arbre, g.id, derniere.noeud.id)) {
        const freres = (arbre.enfants.get(derniere.noeud.parent) ?? []).filter((f) => f !== g.id);
        deplacer(doc, g.id, derniere.noeud.parent, freres.indexOf(derniere.noeud.id) + 1);
      }
    }
  }, [lignes, arbre, doc]);

  useEffect(() => {
    if (!glisse) return;
    const bouger = (e: PointerEvent) => {
      const rangs = [...(liste.current?.querySelectorAll<HTMLElement>('[data-ligne]') ?? [])];
      let avant = rangs.length;
      for (let i = 0; i < rangs.length; i++) {
        const r = rangs[i]!.getBoundingClientRect();
        if (e.clientY < r.top + r.height / 2) { avant = i; break; }
      }
      setGlisse((g) => (g && g.avant !== avant ? { ...g, avant } : g));
    };
    const lacher = () => { setGlisse((g) => { etape(() => terminerGlisse(g)); return null; }); };
    window.addEventListener('pointermove', bouger);
    window.addEventListener('pointerup', lacher, { once: true });
    window.addEventListener('pointercancel', () => setGlisse(null), { once: true });
    return () => { window.removeEventListener('pointermove', bouger); window.removeEventListener('pointerup', lacher); };
  }, [glisse?.id, terminerGlisse]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dernières valeurs lues par le contrôleur stable.
  const courant = useRef({ lignes, surTouche, basculerFaites, actions });
  courant.current = { lignes, surTouche, basculerFaites, actions };
  const ctrl = useMemo<Controleur>(() => ({
    enregistrer: (id, el) => { if (el) champs.current.set(id, el); else champs.current.delete(id); },
    surTouche: (e, id) => {
      const l = courant.current.lignes.find((x) => x.noeud.id === id);
      if (l) courant.current.surTouche(e, l);
    },
    surFocus: (id) => setEdition(id),
    surFlou: (id) => setEdition((x) => (x === id ? null : x)),
    basculerFaites: (id) => courant.current.basculerFaites(id),
    ouvrirPanneau: (id) => courant.current.actions.ouvrirPanneau(id),
    commencerGlisse: (id) => setGlisse({ id, avant: courant.current.lignes.findIndex((x) => x.noeud.id === id) }),
  }), []);

  const premiereIdee = (texte: string) => {
    if (!texte.trim()) return;
    const id = creerNoeud(doc, racine, undefined, { texte: texte.trim() });
    focaliser({ id, pos: 'fin' });
  };

  return (
    <div className="nomenclature">
      {lignes.length === 0 ? (
        <PremiereIdee onValider={premiereIdee} />
      ) : (
        <>
        <Indice cle="nomenclature" texte="Balayez une ligne pour l’indenter. Appui long sur le numéro pour la déplacer." />
        <div
          ref={liste}
          role="tree"
          aria-label="Arborescence"
          className={`nomenclature-liste${glisse ? ' en-glisse' : ''}`}
        >
          {lignes.map((l, i) => (
            <LigneNoeud
              key={l.noeud.id}
              l={l}
              racine={racine}
              doc={doc}
              urgente={urgente === l.noeud.id}
              maintenant={maintenant}
              nouvelle={!initiales.current?.has(l.noeud.id)}
              glissee={glisse?.id === l.noeud.id}
              indicateur={glisse !== null && glisse.avant === i}
              faitesOuvertes={faitesOuvertes.has(l.noeud.id)}
              ctrl={ctrl}
            />
          ))}
          {glisse !== null && glisse.avant === lignes.length && <div className="indicateur-depot" aria-hidden="true" />}
        </div>
        </>
      )}
      {faitesRacine > 0 && (
        <button type="button" className="faites-racine t-cote" onClick={() => basculerFaites(racine)} aria-expanded={faitesOuvertes.has(racine)}>
          {faitesOuvertes.has(racine) ? 'Masquer les faites' : `+ ${faitesRacine} ${faitesRacine > 1 ? 'faites' : 'faite'}`}
        </button>
      )}
      {edition && tactile() && (
        <BarreClavier
          onIndenter={() => { indenter(doc, edition); focaliser({ id: edition, pos: champs.current.get(edition)?.selectionStart ?? 'fin' }); }}
          onDesindenter={() => {
            const n = arbre.parId.get(edition);
            if (n && n.parent !== racine) desindenter(doc, edition);
            focaliser({ id: edition, pos: champs.current.get(edition)?.selectionStart ?? 'fin' });
          }}
          onCocher={() => basculerFait(doc, edition)}
          onDate={() => actions.ouvrirPanneau(edition, 'date')}
          onCouleur={() => actions.ouvrirPanneau(edition, 'couleur')}
          onDetails={() => actions.ouvrirPanneau(edition)}
        />
      )}
    </div>
  );
}

function caretEnHaut(el: HTMLTextAreaElement): boolean {
  return !el.value.slice(0, el.selectionStart).includes('\n') && el.selectionStart <= lettresParLigne(el);
}
function caretEnBas(el: HTMLTextAreaElement): boolean {
  return el.value.length - el.selectionEnd <= lettresParLigne(el) && !el.value.slice(el.selectionEnd).includes('\n');
}
/** Estimation grossière (B612 16 px ≈ 9 px par caractère) pour savoir si le curseur est sur la première ou la dernière ligne. */
function lettresParLigne(el: HTMLTextAreaElement): number {
  return el.scrollHeight <= 30 ? Infinity : Math.max(8, Math.floor(el.clientWidth / 9));
}

function PremiereIdee({ onValider }: { onValider: (t: string) => void }) {
  const [t, setT] = useState('');
  return (
    <div className="ligne-noeud premiere-idee">
      <span className="ligne-num t-cote" aria-hidden="true">1</span>
      <label className="visuellement-cache" htmlFor="premiere-idee">Première idée</label>
      <input
        id="premiere-idee"
        className="ligne-texte t-corps"
        placeholder="Première idée"
        value={t}
        onChange={(e) => setT(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onValider(t); setT(''); } }}
        onBlur={() => { if (t.trim()) { onValider(t); setT(''); } }}
        enterKeyHint="next"
      />
    </div>
  );
}

interface PropsLigne {
  l: Ligne;
  racine: string;
  doc: Y.Doc;
  urgente: boolean;
  maintenant: number;
  nouvelle: boolean;
  glissee: boolean;
  indicateur: boolean;
  faitesOuvertes: boolean;
  ctrl: Controleur;
}

/** Égalité des données affichées par une ligne (les objets `Ligne` sont recréés à chaque lecture de l'arbre). */
function memesDonnees(a: PropsLigne, b: PropsLigne): boolean {
  const x = a.l;
  const y = b.l;
  return a.racine === b.racine && a.doc === b.doc && a.urgente === b.urgente && a.maintenant === b.maintenant
    && a.nouvelle === b.nouvelle && a.glissee === b.glissee && a.indicateur === b.indicateur
    && a.faitesOuvertes === b.faitesOuvertes && a.ctrl === b.ctrl
    && x.numero === y.numero && x.profondeur === y.profondeur && x.faitesCachees === y.faitesCachees && x.replies === y.replies
    && x.noeud.texte === y.noeud.texte && x.noeud.tache === y.noeud.tache && x.noeud.fait === y.noeud.fait
    && x.noeud.echeance === y.noeud.echeance && x.noeud.couleur === y.noeud.couleur && x.noeud.replie === y.noeud.replie
    && x.noeud.parent === y.noeud.parent && x.noeud.enfants.length === y.noeud.enfants.length;
}

const LigneNoeud = memo(function LigneNoeud({
  l, racine, doc, urgente, maintenant, nouvelle, glissee, indicateur, faitesOuvertes, ctrl,
}: PropsLigne) {
  const n = l.noeud;
  const enregistrer = useCallback((el: HTMLTextAreaElement | null) => ctrl.enregistrer(n.id, el), [ctrl, n.id]);
  // Valeur locale, mise à jour dans l'événement de frappe lui-même : un champ contrôlé par le
  // seul document Yjs pouvait, sous WebKit (Safari), renvoyer le curseur en début de ligne.
  // Elle suit le document dès que son texte change ailleurs (autre appareil, annulation).
  const [texte, setTexte] = useState(n.texte);
  const connu = useRef(n.texte);
  if (n.texte !== connu.current) {
    connu.current = n.texte;
    if (n.texte !== texte) setTexte(n.texte);
  }
  const [decalage, setDecalage] = useState(0);
  const balayage = useRef<{ x: number; y: number; actif: boolean } | null>(null);
  const appui = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appuiDeclenche = useRef(false);

  const premierNiveau = l.profondeur === 0 && !n.tache;
  const retard = n.echeance !== null && !(n.tache && n.fait) && enRetard(n.echeance, maintenant);
  const date = n.echeance ? (retard ? compteARebours(n.echeance, maintenant) : dateCourte(n.echeance, maintenant)) : null;
  const aDroite = date !== null || l.faitesCachees > 0 || l.replies > 0;

  // Balayage horizontal (iPhone) : droite = indenter, gauche = désindenter.
  const surBas = (e: RPointerEvent) => {
    if (e.pointerType !== 'touch') return;
    balayage.current = { x: e.clientX, y: e.clientY, actif: false };
  };
  const surDeplacement = (e: RPointerEvent) => {
    const b = balayage.current;
    if (!b) return;
    const dx = e.clientX - b.x;
    const dy = e.clientY - b.y;
    if (!b.actif && Math.abs(dy) > 12) { balayage.current = null; return; }
    if (!b.actif && Math.abs(dx) > 16 && Math.abs(dx) > Math.abs(dy) * 2) b.actif = true;
    if (b.actif) setDecalage(Math.max(-56, Math.min(56, dx)));
  };
  const surHaut = () => {
    const b = balayage.current;
    balayage.current = null;
    if (b?.actif) {
      if (Math.abs(decalage) > 40) signalerGeste('nomenclature');
      if (decalage > 40) indenter(doc, n.id);
      else if (decalage < -40 && n.parent !== racine) desindenter(doc, n.id);
    }
    setDecalage(0);
  };

  // Numéro : toucher = panneau du nœud ; appui long = déplacer.
  const numeroBas = (e: RPointerEvent) => {
    appuiDeclenche.current = false;
    if (e.pointerType === 'mouse') return;
    appui.current = setTimeout(() => {
      appuiDeclenche.current = true;
      navigator.vibrate?.(10);
      ctrl.commencerGlisse(n.id);
    }, 450);
  };
  const numeroFin = () => { if (appui.current) clearTimeout(appui.current); };

  const libelleNum = `${l.numero}${n.tache ? (n.fait ? ', tâche faite' : ', tâche') : ''}${n.echeance ? `, échéance ${dateParlee(n.echeance)}${retard ? ', en retard' : ''}` : ''}, détails`;

  return (
    <div
      role="treeitem"
      aria-level={l.profondeur + 1}
      aria-expanded={n.enfants.length ? !n.replie : undefined}
      aria-selected={false}
      aria-label={n.texte || 'Élément vide'}
      data-ligne
      className={`ligne-noeud${premierNiveau ? ' premier-niveau' : ''}${glissee ? ' glissee' : ''}${indicateur ? ' indicateur' : ''}${n.tache && n.fait ? ' faite' : ''}${nouvelle ? ' nouvelle' : ''}`}
      style={{ ['--profondeur' as string]: Math.max(0, l.profondeur - 1), transform: decalage ? `translateX(${decalage}px)` : undefined }}
      onPointerDown={surBas}
      onPointerMove={surDeplacement}
      onPointerUp={surHaut}
      onPointerCancel={surHaut}
    >
      {decalage !== 0 && (
        <span className="indice-balayage" aria-hidden="true">{decalage > 0 ? <IcIndenter /> : <IcDesindenter />}</span>
      )}
      <button
        type="button"
        className="ligne-num t-cote"
        aria-label={libelleNum}
        onPointerDown={numeroBas}
        onPointerUp={numeroFin}
        onPointerLeave={numeroFin}
        onPointerCancel={numeroFin}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => { if (!appuiDeclenche.current) ctrl.ouvrirPanneau(n.id); }}
      >
        {l.numero}
      </button>
      <span className="ligne-corps">
        {n.tache && (
          <CaseACocher coche={n.fait} onChange={() => basculerFait(doc, n.id)} libelle={`Cocher ${n.texte || 'la tâche'}`} />
        )}
        {/* Hauteur automatique sans JavaScript : une copie invisible du texte dimensionne la cellule. */}
        <span className={`champ-auto ${premierNiveau ? 't-label' : 't-corps'}`} data-valeur={`${texte} `}>
          <textarea
            ref={enregistrer}
            className="ligne-texte"
            value={texte}
            rows={1}
            aria-label={`${l.numero} ${texte}`}
            placeholder={premierNiveau ? 'Branche' : 'Élément'}
            spellCheck
            onChange={(e) => {
              const v = e.target.value.replace(/\n/g, ' ');
              setTexte(v);
              connu.current = v;
              definirTexte(doc, n.id, v);
            }}
            onKeyDown={(e) => ctrl.surTouche(e, n.id)}
            onFocus={() => ctrl.surFocus(n.id)}
            onBlur={() => ctrl.surFlou(n.id)}
            enterKeyHint="next"
          />
        </span>
        {aDroite && <span className="ligne-points" aria-hidden="true" />}
        {aDroite && (
          <span className="ligne-droite">
            {l.replies > 0 && (
              <button type="button" className="t-cote ligne-info" onClick={() => basculerReplie(doc, n.id)} aria-label={`Déplier ${l.replies} éléments`}>
                +{l.replies}
              </button>
            )}
            {l.faitesCachees > 0 && (
              <button type="button" className="t-cote ligne-info" onClick={() => ctrl.basculerFaites(n.id)} aria-expanded={faitesOuvertes}>
                + {l.faitesCachees} {l.faitesCachees > 1 ? 'faites' : 'faite'}
              </button>
            )}
            {date !== null && (urgente
              ? <span className="t-cote ligne-date"><Nuage>{date}</Nuage></span>
              : <span className={`t-cote ligne-date${retard ? ' redline' : ''}`}>{date}</span>)}
          </span>
        )}
      </span>
    </div>
  );
}, memesDonnees);
