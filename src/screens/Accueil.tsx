import { useMemo, useState } from 'react';
import { useMaintenant } from '../app/temps';
import { useLiveQuery } from 'dexie-react-hooks';
import { useStockage } from '../app/contexte';
import { aller, lien, useRoute } from '../app/route';
import { IcSuite } from '../design/icones';
import { CarreCalque, CoteDistance } from '../design/signature';
import {
  LIBELLES_STATUT, LIBELLES_TYPE_COURT, type StatutProjet, type TypeProjet,
} from '../data/schema';
import type { ResumeProjet } from '../data/projet';
import { modifierMeta, definirStatut } from '../data/projet';
import {
  compteARebours, dateCourte, dateJour, dateParlee, enRetard, enteteDuJour, joursParles, joursRestants,
} from '../time/dates';
import { BoutonIcone, Choix, Feuille, Segments } from '../ui/ui';
import { useAppuiLong } from '../ui/gestes';
import { problemeDurable, useEtatSynchro } from '../sync/contexte';
import './accueil.css';

type Tri = 'echeance' | 'recent' | 'nom';
const TYPES: TypeProjet[] = ['creatif', 'pro', 'perso', 'idees'];
const STATUTS_ACTIFS: StatutProjet[] = ['idee', 'en-cours', 'pause', 'termine'];

function trier(liste: ResumeProjet[], tri: Tri): ResumeProjet[] {
  const copie = [...liste];
  copie.sort((a, b) => {
    if (a.epingle !== b.epingle) return b.epingle - a.epingle;
    if (tri === 'nom') return a.titre.localeCompare(b.titre, 'fr', { sensitivity: 'base' });
    if (tri === 'recent') return b.modifie - a.modifie;
    return a.prochaineDate.localeCompare(b.prochaineDate) || b.modifie - a.modifie;
  });
  return copie;
}

export function Accueil({ archives = false, compact = false }: { archives?: boolean; compact?: boolean }) {
  const stockage = useStockage();
  const route = useRoute();
  const maintenant = useMaintenant();
  const temoin = problemeDurable(useEtatSynchro(), maintenant);
  const [options, setOptions] = useState(false);
  const [projetActions, setProjetActions] = useState<ResumeProjet | null>(null);

  const projets = useLiveQuery(() => stockage.index.projets.toArray(), [stockage]);
  const tri = useLiveQuery(() => stockage.reglage<Tri>('tri', 'echeance'), [stockage]) ?? 'echeance';
  const types = useLiveQuery(() => stockage.reglage<TypeProjet[]>('filtreTypes', []), [stockage]) ?? [];
  const statuts = useLiveQuery(() => stockage.reglage<StatutProjet[]>('filtreStatuts', []), [stockage]) ?? [];
  const filtreActif = types.length > 0 || statuts.length > 0;

  const visibles = useMemo(() => {
    if (!projets) return null;
    const base = projets.filter((p) => (archives ? p.statut === 'archive' : p.statut !== 'archive'));
    const filtres = base.filter((p) => (!types.length || types.includes(p.type)) && (!statuts.length || statuts.includes(p.statut)));
    return trier(filtres, tri);
  }, [projets, archives, types, statuts, tri]);

  // La prochaine échéance, tous projets actifs confondus (hors terminés et archivés).
  const prochaine = useMemo(() => {
    if (!projets || archives) return null;
    const candidats = projets.filter((p) => p.prochaine && p.statut !== 'archive' && p.statut !== 'termine');
    candidats.sort((a, b) => a.prochaineDate.localeCompare(b.prochaineDate));
    const p = candidats[0];
    return p?.prochaine ? { projet: p, echeance: p.prochaine } : null;
  }, [projets, archives]);

  const projetCourant = route.ecran === 'projet' ? route.id : null;
  // Dans la colonne de l'ordinateur, la page principale porte le h1.
  const Titre = compact ? 'h2' : 'h1';

  return (
    <div className={`ecran accueil${compact ? ' compact' : ''}`}>
      <header className="accueil-tete">
        {archives ? (
          <Titre className="t-label">Archives</Titre>
        ) : (
          <Titre className="t-cote accueil-date">
            <span className="visuellement-cache">Projets, </span>{enteteDuJour(maintenant)}
          </Titre>
        )}
        <BoutonIcone
          libelle={temoin ? 'Tri, filtres et réglages · synchro à vérifier' : 'Tri, filtres et réglages'}
          className="avec-temoin" sansCadre={!filtreActif} actif={filtreActif} onClick={() => setOptions(true)}
        >
          <IcSuite />
          {temoin && <span className="temoin-synchro" aria-hidden="true" />}
        </BoutonIcone>
      </header>

      {prochaine && (
        <a
          className="prochaine"
          href={lien({ ecran: 'projet', id: prochaine.projet.id, branche: null, vue: 'page' })}
          aria-label={`Prochaine échéance ${joursParles(prochaine.echeance.date, maintenant)} : ${prochaine.echeance.titre || 'sans titre'}, ${prochaine.projet.titre}, ${dateParlee(prochaine.echeance.date)}`}
        >
          <div className="prochaine-haut">
            <span className="t-display redline prochaine-compte">{compteARebours(prochaine.echeance.date, maintenant)}</span>
            <span className="prochaine-texte">
              <span className="t-corps prochaine-titre">{prochaine.echeance.titre || 'Sans titre'}</span>
              <span className="t-cote prochaine-projet">
                <CarreCalque couleur={prochaine.projet.couleur} taille={8} />
                {prochaine.projet.titre} · {dateJour(prochaine.echeance.date, maintenant)}
              </span>
            </span>
          </div>
          {joursRestants(prochaine.echeance.date, maintenant) > 0 && (
            <CoteDistance valeur={`${joursRestants(prochaine.echeance.date, maintenant)} j`} rouge />
          )}
        </a>
      )}

      {visibles && visibles.length === 0 && (
        <p className="t-cote accueil-vide">
          {archives ? 'Aucun projet archivé' : filtreActif ? 'Aucun projet pour ces filtres' : 'Aucun projet'}
        </p>
      )}

      {visibles && visibles.length > 0 && (
        <ul className="liste-projets">
          {visibles.map((p, i) => (
            <LigneProjet
              key={p.id}
              p={p}
              maintenant={maintenant}
              urgente={prochaine?.projet.id === p.id}
              courant={projetCourant === p.id}
              separe={i > 0 && visibles[i - 1]!.epingle === 1 && p.epingle === 0}
              onActions={() => setProjetActions(p)}
            />
          ))}
        </ul>
      )}

      <Feuille ouverte={options} onFermer={() => setOptions(false)} titre="Projets">
        <div className="section-feuille">
          <span className="t-cote" id="tri">Tri</span>
          <Segments
            libelle="Tri"
            valeur={tri}
            onChange={(v) => void stockage.poserReglage('tri', v)}
            options={[{ valeur: 'echeance', libelle: 'Échéance' }, { valeur: 'recent', libelle: 'Récent' }, { valeur: 'nom', libelle: 'Nom' }]}
          />
        </div>
        <div className="section-feuille">
          <span className="t-cote">Type</span>
          {TYPES.map((t) => (
            <Choix
              key={t}
              role="checkbox"
              aria-checked={types.includes(t)}
              actif={types.includes(t)}
              onClick={() => void stockage.poserReglage('filtreTypes', types.includes(t) ? types.filter((x) => x !== t) : [...types, t])}
            >{LIBELLES_TYPE_COURT[t]}</Choix>
          ))}
        </div>
        <div className="section-feuille">
          <span className="t-cote">Statut</span>
          {STATUTS_ACTIFS.map((s) => (
            <Choix
              key={s}
              role="checkbox"
              aria-checked={statuts.includes(s)}
              actif={statuts.includes(s)}
              onClick={() => void stockage.poserReglage('filtreStatuts', statuts.includes(s) ? statuts.filter((x) => x !== s) : [...statuts, s])}
            >{LIBELLES_STATUT[s]}</Choix>
          ))}
        </div>
        <div className="section-feuille">
          <Choix onClick={() => { setOptions(false); aller({ ecran: archives ? 'accueil' : 'archives' }); }}>
            {archives ? 'Projets actifs' : 'Archives'}
          </Choix>
          <Choix onClick={() => { setOptions(false); aller({ ecran: 'reglages' }); }}>Réglages</Choix>
        </div>
      </Feuille>

      <ActionsProjet projet={projetActions} onFermer={() => setProjetActions(null)} />
    </div>
  );
}

function LigneProjet({ p, maintenant, urgente, courant, separe, onActions }: {
  p: ResumeProjet; maintenant: number; urgente: boolean; courant: boolean; separe: boolean; onActions: () => void;
}) {
  const appui = useAppuiLong(onActions);
  const date = p.prochaine?.date ?? null;
  const retard = date !== null && enRetard(date, maintenant);
  const ratio = p.faites > 0 ? p.faites / p.total : null;
  const description = [
    p.titre,
    p.epingle ? 'épinglé' : null,
    date ? `prochaine échéance ${dateParlee(date)}${retard ? ', en retard' : ''}` : null,
    p.total ? `${p.faites} tâches faites sur ${p.total}` : null,
  ].filter(Boolean).join(', ');
  return (
    <li className={`ligne-projet${separe ? ' ligne-separee' : ''}`}>
      <a
        href={lien({ ecran: 'projet', id: p.id, branche: null, vue: 'page' })}
        aria-label={description}
        aria-current={courant ? 'page' : undefined}
        className={courant ? 'courant' : undefined}
        {...appui}
      >
        <CarreCalque couleur={p.couleur} />
        <span className="ligne-projet-titre t-corps">{p.titre || 'Sans titre'}</span>
        {date && (
          <span className={`t-cote ligne-projet-date${urgente || retard ? ' redline' : ''}`}>
            {retard ? compteARebours(date, maintenant) : dateCourte(date, maintenant)}
          </span>
        )}
        {ratio !== null && (
          <span className="ligne-projet-avancement" aria-hidden="true">
            <span className="trace" style={{ width: `${ratio * 100}%` }} />
          </span>
        )}
      </a>
    </li>
  );
}

function ActionsProjet({ projet, onFermer }: { projet: ResumeProjet | null; onFermer: () => void }) {
  const stockage = useStockage();
  const agir = async (f: (doc: import('yjs').Doc) => void) => {
    if (!projet) return;
    const o = stockage.ouvrir(projet.id);
    await o.pret;
    f(o.doc);
    await stockage.indexer(projet.id, o.doc);
    onFermer();
  };
  return (
    <Feuille ouverte={projet !== null} onFermer={onFermer} titre={projet?.titre || 'Projet'}>
      {projet && (
        <>
          <Choix onClick={() => void agir((d) => modifierMeta(d, 'epingle', !projet.epingle))}>
            {projet.epingle ? 'Désépingler' : 'Épingler'}
          </Choix>
          <div className="section-feuille">
            <span className="t-cote">Statut</span>
            {(['idee', 'en-cours', 'pause', 'termine'] as const).map((s) => (
              <Choix key={s} role="radio" aria-checked={projet.statut === s} actif={projet.statut === s} onClick={() => void agir((d) => definirStatut(d, s))}>
                {LIBELLES_STATUT[s]}
              </Choix>
            ))}
          </div>
          <div className="section-feuille">
            <Choix onClick={() => void agir((d) => definirStatut(d, projet.statut === 'archive' ? 'en-cours' : 'archive'))}>
              {projet.statut === 'archive' ? 'Désarchiver' : 'Archiver'}
            </Choix>
          </div>
        </>
      )}
    </Feuille>
  );
}
