import { useEffect, useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useStockage } from '../app/contexte';
import { aller } from '../app/route';
import { CarreCalque } from '../design/signature';
import {
  COULEURS, LIBELLES_COULEUR, LIBELLES_TYPE_COURT, RACINE, type CleCouleur, type TypeProjet,
} from '../data/schema';
import { creerNoeud } from '../tree/arbre';
import { creerBloc } from '../data/projet';
import { poserUrl } from '../media/lien';
import { SaisieLien } from '../media/BlocLien';
import { Choix, Feuille, Segments } from '../ui/ui';
import './ajout.css';

export type Mode = 'menu' | 'projet' | 'idee' | 'lien';

export function AjoutRapide({ ouverte, onFermer, demande }: {
  ouverte: boolean;
  onFermer: () => void;
  /** Ouverture directe (coller une adresse sur ordinateur). */
  demande?: { mode: Mode; url?: string } | null;
}) {
  const stockage = useStockage();
  const [mode, setMode] = useState<Mode>('menu');
  const [urlCollee, setUrlCollee] = useState('');
  useEffect(() => {
    if (ouverte && demande) { setMode(demande.mode); setUrlCollee(demande.url ?? ''); }
  }, [ouverte, demande]);
  const projets = useLiveQuery(() => stockage.index.projets.where('statut').notEqual('archive').toArray(), [stockage]);
  const fermer = () => { onFermer(); setTimeout(() => setMode('menu'), 300); };
  // Aucun projet : droit au formulaire. Rien n'est affiché tant que la liste n'est pas lue (pas de clignotement).
  const effectif: Mode | null = projets === undefined ? null : mode === 'menu' && projets.length === 0 ? 'projet' : mode;

  return (
    <Feuille
      ouverte={ouverte}
      onFermer={fermer}
      titre={effectif === 'projet' ? 'Nouveau projet' : effectif === 'idee' ? 'Idée' : effectif === 'lien' ? 'Lien' : 'Ajouter'}
    >
      {effectif === 'menu' && (
        <>
          <Choix onClick={() => setMode('projet')}>Nouveau projet</Choix>
          <Choix onClick={() => setMode('idee')}>Idée dans un projet</Choix>
          <Choix onClick={() => setMode('lien')}>Lien dans un projet</Choix>
        </>
      )}
      {effectif === 'projet' && <FormProjet couleursPrises={projets?.map((p) => p.couleur) ?? []} onFini={fermer} />}
      {effectif === 'idee' && <FormIdee onFini={fermer} />}
      {effectif === 'lien' && <FormLien initiale={urlCollee} onFini={fermer} />}
    </Feuille>
  );
}

function FormProjet({ couleursPrises, onFini }: { couleursPrises: CleCouleur[]; onFini: () => void }) {
  const stockage = useStockage();
  const libre = COULEURS.find((c) => !couleursPrises.includes(c)) ?? COULEURS[couleursPrises.length % COULEURS.length]!;
  const [titre, setTitre] = useState('');
  const [type, setType] = useState<TypeProjet>('creatif');
  const [couleur, setCouleur] = useState<CleCouleur>(libre);
  const [envoi, setEnvoi] = useState(false);

  const valider = async (e: FormEvent) => {
    e.preventDefault();
    if (!titre.trim() || envoi) return;
    setEnvoi(true);
    const id = await stockage.creerProjet({ titre: titre.trim(), type, couleur });
    onFini();
    aller({ ecran: 'projet', id, branche: null, vue: 'page' });
  };

  return (
    <form onSubmit={(e) => void valider(e)} className="form-ajout">
      <label className="visuellement-cache" htmlFor="titre-projet">Titre</label>
      <input
        id="titre-projet"
        className="champ t-corps"
        placeholder="Titre"
        value={titre}
        onChange={(e) => setTitre(e.target.value)}
        autoFocus
        autoComplete="off"
        enterKeyHint="done"
      />
      <Segments
        libelle="Type"
        valeur={type}
        onChange={setType}
        options={(['creatif', 'pro', 'perso', 'idees'] as const).map((t) => ({ valeur: t, libelle: LIBELLES_TYPE_COURT[t] }))}
      />
      <fieldset className="couleurs">
        <legend className="visuellement-cache">Couleur</legend>
        {COULEURS.map((c) => (
          <label key={c} className={`couleur${couleur === c ? ' actif' : ''}`} title={LIBELLES_COULEUR[c]}>
            <input type="radio" name="couleur" className="visuellement-cache" checked={couleur === c} onChange={() => setCouleur(c)} />
            <CarreCalque couleur={c} taille={16} />
            <span className="visuellement-cache">{LIBELLES_COULEUR[c]}</span>
          </label>
        ))}
      </fieldset>
      <button type="submit" className="bouton-principal t-label" disabled={!titre.trim() || envoi}>Créer</button>
    </form>
  );
}

function FormIdee({ onFini }: { onFini: () => void }) {
  const stockage = useStockage();
  const projets = useLiveQuery(() => stockage.index.projets.where('statut').notEqual('archive').sortBy('modifie'), [stockage]);
  const [texte, setTexte] = useState('');
  const [projet, setProjet] = useState<string | null>(null);
  const liste = projets ? [...projets].reverse() : [];
  const cible = projet ?? liste[0]?.id ?? null;

  const valider = async (e: FormEvent) => {
    e.preventDefault();
    if (!texte.trim() || !cible) return;
    const o = stockage.ouvrir(cible);
    await o.pret;
    creerNoeud(o.doc, RACINE, undefined, { texte: texte.trim() });
    onFini();
  };

  return (
    <form onSubmit={(e) => void valider(e)} className="form-ajout">
      <label className="visuellement-cache" htmlFor="texte-idee">Idée</label>
      <input
        id="texte-idee"
        className="champ t-corps"
        placeholder="Idée"
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        autoFocus
        autoComplete="off"
      />
      <div className="section-feuille" role="radiogroup" aria-label="Projet">
        {liste.map((p) => (
          <Choix key={p.id} role="radio" aria-checked={cible === p.id} actif={cible === p.id} onClick={() => setProjet(p.id)}
            icone={<CarreCalque couleur={p.couleur} />}>
            {p.titre}
          </Choix>
        ))}
      </div>
      <button type="submit" className="bouton-principal t-label" disabled={!texte.trim() || !cible}>Ajouter</button>
    </form>
  );
}

function FormLien({ initiale, onFini }: { initiale: string; onFini: () => void }) {
  const stockage = useStockage();
  const projets = useLiveQuery(() => stockage.index.projets.where('statut').notEqual('archive').sortBy('modifie'), [stockage]);
  const [projet, setProjet] = useState<string | null>(null);
  const liste = projets ? [...projets].reverse() : [];
  const cible = projet ?? liste[0]?.id ?? null;
  const ajouter = async (url: string) => {
    if (!cible) return;
    const o = stockage.ouvrir(cible);
    await o.pret;
    const id = creerBloc(o.doc, 'lien');
    poserUrl(o.doc, id, url);
    onFini();
  };
  return (
    <div className="form-ajout">
      <SaisieLien key={initiale} initiale={initiale} autoFocus onValider={(u) => void ajouter(u)} />
      <div className="section-feuille" role="radiogroup" aria-label="Projet">
        {liste.map((p) => (
          <Choix key={p.id} role="radio" aria-checked={cible === p.id} actif={cible === p.id} onClick={() => setProjet(p.id)}
            icone={<CarreCalque couleur={p.couleur} />}>
            {p.titre}
          </Choix>
        ))}
      </div>
    </div>
  );
}
