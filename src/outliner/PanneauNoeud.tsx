import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type * as Y from 'yjs';
import { useArbre } from '../app/contexte';
import { CarreCalque } from '../design/signature';
import {
  IcBas, IcDesindenter, IcHaut, IcIndenter, IcOuvrir, IcRattacher, IcSupprimer,
} from '../design/icones';
import { rappelsEffectifs } from '../time/rappels';
import { ChoixRappels } from '../notif/ChoixRappels';
import { COULEURS, LIBELLES_COULEUR, RACINE, type CleCouleur } from '../data/schema';
import {
  basculerFait, basculerTache, decaler, definirCouleur, definirEcheance, definirRappelPerso, definirRappels, deplacer, desindenter,
  estDansSousArbre, indenter, noteDe, numero, supprimer,
} from '../tree/arbre';
import { Choix, Feuille } from '../ui/ui';
import './panneau.css';

const EditeurRiche = lazy(() => import('../editor/EditeurRiche'));


export function PanneauNoeud({
  doc, annuler, id, champ, racine, onFermer, onOuvrirBranche, onSupprime,
}: {
  doc: Y.Doc;
  annuler: Y.UndoManager;
  id: string | null;
  champ?: 'date' | 'couleur';
  racine: string;
  onFermer: () => void;
  onOuvrirBranche: (id: string) => void;
  onSupprime: (texte: string) => void;
}) {
  const arbre = useArbre(doc);
  const n = id ? arbre.parId.get(id) : undefined;
  /** Chaque opération de structure forme une étape d'annulation à part. */
  const etape = (f: () => void) => { annuler.stopCapturing(); f(); annuler.stopCapturing(); };
  const [rattacher, setRattacher] = useState(false);
  const dateRef = useRef<HTMLInputElement>(null);
  const couleurRef = useRef<HTMLFieldSetElement>(null);
  // La note est créée à la demande, hors du rendu (c'est une écriture Yjs).
  const [note, setNote] = useState<Y.XmlFragment | null>(null);
  useEffect(() => { setNote(id ? noteDe(doc, id) : null); }, [doc, id]);

  useEffect(() => { setRattacher(false); }, [id]);
  useEffect(() => {
    if (!n) return;
    const t = setTimeout(() => {
      if (champ === 'date') dateRef.current?.focus();
      if (champ === 'couleur') couleurRef.current?.querySelector('input')?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [champ, n?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const date = n?.echeance?.slice(0, 10) ?? '';
  const heure = n?.echeance?.slice(11, 16) ?? '';
  const poserDate = (d: string, h: string) => {
    if (!id) return;
    definirEcheance(doc, id, d ? (h ? `${d}T${h}` : d) : null);
  };

  const parentsPossibles = useMemo(() => {
    if (!n || !rattacher) return [];
    const res: { id: string; libelle: string }[] = [];
    if (n.parent !== RACINE) res.push({ id: RACINE, libelle: 'Premier niveau' });
    for (const c of arbre.parId.values()) {
      if (c.id === n.parent || estDansSousArbre(arbre, n.id, c.id)) continue;
      res.push({ id: c.id, libelle: `${numero(arbre, c.id)} ${c.texte || 'Sans titre'}` });
    }
    return res.sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr', { numeric: true }));
  }, [arbre, n, rattacher]);

  return (
    <Feuille ouverte={n !== undefined} onFermer={onFermer} titre={n ? `${numero(arbre, n.id)} ${n.texte || 'Sans titre'}` : ''}>
      {n && id && (
        <>
          <div className="section-feuille">
            <Choix role="checkbox" aria-checked={n.tache} actif={n.tache} onClick={() => basculerTache(doc, id)}>Tâche</Choix>
            {n.tache && (
              <Choix role="checkbox" aria-checked={n.fait} actif={n.fait} onClick={() => basculerFait(doc, id)}>Faite</Choix>
            )}
          </div>

          <div className="section-feuille">
            <span className="t-cote">Échéance</span>
            <div className="panneau-date">
              <label className="visuellement-cache" htmlFor="date-noeud">Date</label>
              <input id="date-noeud" ref={dateRef} type="date" className="champ t-corps" value={date}
                onChange={(e) => poserDate(e.target.value, heure)} />
              <label className="visuellement-cache" htmlFor="heure-noeud">Heure (facultative)</label>
              <input id="heure-noeud" type="time" className="champ t-corps" value={heure} disabled={!date}
                onChange={(e) => poserDate(date, e.target.value)} />
            </div>
            {date && (
              <ChoixRappels valeurs={rappelsEffectifs(n.rappels)} onChange={(r) => definirRappels(doc, id, r)} avecHeure={Boolean(heure)}
                perso={n.rappelPerso} onPerso={(d) => definirRappelPerso(doc, id, d)} idPerso="rappel-perso-noeud" />
            )}
          </div>

          <fieldset className="section-feuille couleurs-noeud" ref={couleurRef}>
            <legend className="visuellement-cache">Couleur</legend>
            <div className="couleurs-liste">
              <label className={`couleur${n.couleur === null ? ' actif' : ''}`} title="Aucune">
                <input type="radio" name="couleur-noeud" className="visuellement-cache" checked={n.couleur === null} onChange={() => definirCouleur(doc, id, null)} />
                <span className="couleur-aucune" aria-hidden="true" />
                <span className="visuellement-cache">Aucune</span>
              </label>
              {COULEURS.map((c: CleCouleur) => (
                <label key={c} className={`couleur${n.couleur === c ? ' actif' : ''}`} title={LIBELLES_COULEUR[c]}>
                  <input type="radio" name="couleur-noeud" className="visuellement-cache" checked={n.couleur === c} onChange={() => definirCouleur(doc, id, c)} />
                  <CarreCalque couleur={c} taille={16} />
                  <span className="visuellement-cache">{LIBELLES_COULEUR[c]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="section-feuille">
            <span className="visuellement-cache">Note</span>
            <div className="panneau-note">
              {note && (
                <Suspense fallback={null}>
                  <EditeurRiche fragment={note} libelle="Note" placeholder="Note" />
                </Suspense>
              )}
            </div>
          </div>

          <div className="section-feuille">
            <Choix icone={<IcOuvrir />} onClick={() => { onFermer(); onOuvrirBranche(id); }}>Ouvrir</Choix>
            <Choix icone={<IcHaut />} onClick={() => etape(() => decaler(doc, id, -1))}>Monter</Choix>
            <Choix icone={<IcBas />} onClick={() => etape(() => decaler(doc, id, 1))}>Descendre</Choix>
            <Choix icone={<IcIndenter />} onClick={() => etape(() => indenter(doc, id))}>Indenter</Choix>
            {n.parent !== racine && n.parent !== RACINE && (
              <Choix icone={<IcDesindenter />} onClick={() => etape(() => desindenter(doc, id))}>Désindenter</Choix>
            )}
            <Choix icone={<IcRattacher />} onClick={() => setRattacher((r) => !r)}>Rattacher à…</Choix>
            {rattacher && (
              <div className="rattacher" role="group" aria-label="Nouveau parent">
                {parentsPossibles.map((p) => (
                  <Choix key={p.id} onClick={() => {
                    etape(() => deplacer(doc, id, p.id, arbre.enfants.get(p.id)?.length ?? 0));
                    setRattacher(false);
                  }}>{p.libelle}</Choix>
                ))}
              </div>
            )}
            <Choix icone={<IcSupprimer />} rouge onClick={() => {
              const texte = n.texte || 'Élément';
              etape(() => supprimer(doc, id));
              onFermer();
              onSupprime(texte);
            }}>Supprimer</Choix>
          </div>
        </>
      )}
    </Feuille>
  );
}
