import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import * as Y from 'yjs';
import { useVersion } from '../app/contexte';
import { blocs, type CleCouleur } from '../data/schema';
import { appliquerDiff } from '../tree/arbre';
import {
  IcAnnuler, IcCrayon, IcEpaisseur, IcGomme, IcRetablir, IcSuite,
} from '../design/icones';
import { BoutonIcone, Choix, Feuille } from '../ui/ui';
import {
  HAUTEUR, LARGEUR, useTraits, ajouterTrait, cheminTrait, compacter, effacerTout, gommer, mettreEnCouverture, traitsDe,
  type EncreCroquis, type Epaisseur, type Trait,
} from './croquis';
import { Traits } from './Figure';
import { Grille } from '../design/signature';
import './medias.css';

const ENCRES: { valeur: EncreCroquis; libelle: string }[] = [
  { valeur: 'trait', libelle: 'Encre trait' },
  { valeur: 'trait-2', libelle: 'Encre cote' },
  { valeur: 'redline', libelle: 'Encre redline' },
  { valeur: 'calque', libelle: 'Encre du calque' },
];

/** Planche de dessin plein écran (brief : design/briefs/croquis-lien.md). */
export function Planche({
  doc, annuler, idBloc, numero, couleur, onFermer,
}: { doc: Y.Doc; annuler: Y.UndoManager; idBloc: string; numero: number; couleur: CleCouleur; onFermer: () => void }) {
  useVersion(doc);
  const bloc = blocs(doc).get(idBloc);
  const traits = useTraits(bloc ? traitsDe(bloc) : null);
  const legendeY = bloc?.get('legende');
  const legende = legendeY instanceof Y.Text ? legendeY.toString() : '';
  const couverture = Boolean(bloc?.get('couverture'));

  const [outil, setOutil] = useState<'crayon' | 'gomme'>('crayon');
  const [epaisseur, setEpaisseur] = useState<Epaisseur>(2);
  const [encre, setEncre] = useState<EncreCroquis>('trait');
  const [enCours, setEnCours] = useState<{ x: number; y: number; pression: number }[] | null>(null);
  const [menu, setMenu] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const toile = useRef<SVGSVGElement>(null);
  const pointeurs = useRef(new Set<number>());
  const initiaux = useRef(new Set(traits.map((t) => t.id)));
  const nouveaux = useMemo(() => new Set(traits.filter((t) => !initiaux.current.has(t.id)).map((t) => t.id)), [traits]);

  // Échap ferme ; le défilement de la page est bloqué tant que la planche est ouverte.
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !menu) onFermer();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !(e.target as HTMLElement).closest('input')) {
        e.preventDefault();
        if (e.shiftKey) annuler.redo(); else annuler.undo();
      }
    };
    window.addEventListener('keydown', f);
    const ancien = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', f); document.body.style.overflow = ancien; };
  }, [onFermer, menu, annuler]);

  const point = (e: RPointerEvent<SVGSVGElement>) => {
    const r = toile.current!.getBoundingClientRect();
    // Le doigt n'a pas de pression mesurée (0 ou 0,5) : 0,5 déclenche la pression simulée.
    const pression = e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 0.5;
    return { x: ((e.clientX - r.left) / r.width) * LARGEUR, y: ((e.clientY - r.top) / r.height) * HAUTEUR, pression };
  };

  const bas = (e: RPointerEvent<SVGSVGElement>) => {
    pointeurs.current.add(e.pointerId);
    if (pointeurs.current.size > 1) { setEnCours(null); return; } // deux doigts : pas de dessin
    e.currentTarget.setPointerCapture(e.pointerId);
    annuler.stopCapturing();
    if (outil === 'gomme') { const p = point(e); gommer(doc, idBloc, p.x, p.y); return; }
    setEnCours([point(e)]);
  };
  const bouge = (e: RPointerEvent<SVGSVGElement>) => {
    if (pointeurs.current.size !== 1 || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    if (outil === 'gomme') { const p = point(e); gommer(doc, idBloc, p.x, p.y); return; }
    const evts = (e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent]) as PointerEvent[];
    const r = toile.current!.getBoundingClientRect();
    const nouveauxPoints = evts.map((ev) => ({
      x: ((ev.clientX - r.left) / r.width) * LARGEUR,
      y: ((ev.clientY - r.top) / r.height) * HAUTEUR,
      pression: ev.pointerType === 'pen' && ev.pressure > 0 ? ev.pressure : 0.5,
    }));
    setEnCours((c) => (c ? [...c, ...nouveauxPoints] : c));
  };
  const haut = (e: RPointerEvent<SVGSVGElement>) => {
    pointeurs.current.delete(e.pointerId);
    if (enCours && enCours.length) ajouterTrait(doc, idBloc, enCours, epaisseur, encre);
    setEnCours(null);
    annuler.stopCapturing();
  };

  const traitEnCours: Trait | null = enCours ? { id: 'en-cours', p: compacter(enCours), e: epaisseur, c: encre } : null;

  return (
    <div className="planche" role="dialog" aria-modal="true" aria-label={`Planche, FIG. ${numero}`}
      style={{ ['--calque-courant' as string]: `var(--calque-${couleur})` }}>
      <Grille />
      <div className="planche-tete">
        <span className="t-cote">FIG. {numero}</span>
        <span className="planche-tete-actions">
          <BoutonIcone libelle="Options du croquis" sansCadre onClick={() => setMenu(true)}><IcSuite /></BoutonIcone>
          <button type="button" className="bouton-principal t-label planche-termine" onClick={onFermer}>Terminé</button>
        </span>
      </div>

      <div className="planche-zone">
        <svg
          ref={toile}
          className={`planche-toile${outil === 'gomme' ? ' en-gomme' : ''}`}
          viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
          role="img"
          aria-label={`Dessin, ${traits.length} traits`}
          onPointerDown={bas}
          onPointerMove={bouge}
          onPointerUp={haut}
          onPointerCancel={haut}
        >
          <Traits traits={traits} nouveaux={nouveaux} />
          {traitEnCours && <path d={cheminTrait(traitEnCours)} className={`encre-${encre}`} />}
        </svg>
        <span className="reperes" aria-hidden="true"><i /><i /><i /><i /></span>
      </div>

      <label className="visuellement-cache" htmlFor="legende-croquis">Légende</label>
      <input
        id="legende-croquis"
        className="champ t-corps planche-legende"
        placeholder="Légende"
        value={legende}
        onChange={(e) => { if (legendeY instanceof Y.Text) appliquerDiff(doc, legendeY, e.target.value); }}
        autoComplete="off"
      />

      <div className="planche-outils">
        {outil === 'crayon' && (
          <div className="planche-reglages" role="group" aria-label="Crayon">
            {([1, 2, 3] as const).map((ep) => (
              <BoutonIcone key={ep} libelle={['Trait fin', 'Trait moyen', 'Trait épais'][ep - 1]!} actif={epaisseur === ep} onClick={() => setEpaisseur(ep)}>
                <IcEpaisseur largeur={[1, 2.5, 4.5][ep - 1]!} />
              </BoutonIcone>
            ))}
            <span className="planche-sep" aria-hidden="true" />
            {ENCRES.map((x) => (
              <BoutonIcone key={x.valeur} libelle={x.libelle} actif={encre === x.valeur} onClick={() => setEncre(x.valeur)}>
                <span className={`pastille-encre encre-fond-${x.valeur}`} aria-hidden="true" />
              </BoutonIcone>
            ))}
          </div>
        )}
        <div className="planche-barre" role="toolbar" aria-label="Outils de dessin">
          <BoutonIcone libelle="Crayon" actif={outil === 'crayon'} onClick={() => setOutil('crayon')}><IcCrayon /></BoutonIcone>
          <BoutonIcone libelle="Gomme" actif={outil === 'gomme'} onClick={() => setOutil('gomme')}><IcGomme /></BoutonIcone>
          <BoutonIcone libelle="Annuler" onClick={() => annuler.undo()}><IcAnnuler /></BoutonIcone>
          <BoutonIcone libelle="Rétablir" onClick={() => annuler.redo()}><IcRetablir /></BoutonIcone>
        </div>
      </div>

      <Feuille ouverte={menu} onFermer={() => setMenu(false)} titre={`FIG. ${numero}`}>
        <Choix role="checkbox" aria-checked={couverture} actif={couverture} onClick={() => { mettreEnCouverture(doc, idBloc, !couverture); setMenu(false); }}>
          En couverture
        </Choix>
        <Choix rouge onClick={() => { setMenu(false); setConfirmer(true); }}>Effacer tout</Choix>
      </Feuille>
      <Feuille ouverte={confirmer} onFermer={() => setConfirmer(false)} titre="Effacer tout">
        <p className="t-corps confirmation">Tous les traits de la FIG. {numero} seront effacés. « Annuler » les rétablit.</p>
        <div className="confirmation-actions">
          <button type="button" className="bouton-secondaire t-label" onClick={() => setConfirmer(false)}>Garder</button>
          <button type="button" className="bouton-danger t-label" onClick={() => { annuler.stopCapturing(); effacerTout(doc, idBloc); setConfirmer(false); }}>Effacer</button>
        </div>
      </Feuille>
    </div>
  );
}
