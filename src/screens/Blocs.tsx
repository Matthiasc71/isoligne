import { lazy, Suspense, useState } from 'react';
import * as Y from 'yjs';
import { CaseACocher, Nuage } from '../design/signature';
import { IcBas, IcHaut, IcSupprimer } from '../design/icones';
import { dateBloc, deplacerBloc, poserBloc, supprimerBloc, texteBloc, type Bloc } from '../data/projet';
import { compteARebours, dateCourte, dateParlee, enRetard } from '../time/dates';
import { BoutonIcone, Feuille } from '../ui/ui';
import { ChoixRappels, resumeRappels } from '../notif/ChoixRappels';
import { rappelsEffectifs } from '../time/rappels';
import type { Rappel } from '../data/schema';

const EditeurRiche = lazy(() => import('../editor/EditeurRiche'));

export function BlocTexte({ bloc, autoFocus }: { bloc: Bloc; autoFocus: boolean }) {
  const fragment = bloc.y.get('contenu');
  if (!(fragment instanceof Y.XmlFragment)) return null;
  return (
    <div className="bloc bloc-texte">
      <Suspense fallback={<div className="t-corps bloc-attente" />}>
        <EditeurRiche fragment={fragment} libelle="Texte" autoFocus={autoFocus} />
      </Suspense>
    </div>
  );
}

export function BlocEcheance({ doc, bloc, urgente, maintenant, autoFocus }: {
  doc: Y.Doc; bloc: Bloc; urgente: boolean; maintenant: number; autoFocus: boolean;
}) {
  const t = bloc.y.get('titre');
  const titre = t instanceof Y.Text ? t.toString() : '';
  const date = (bloc.y.get('date') as string | null) ?? null;
  const fait = Boolean(bloc.y.get('fait'));
  const retard = date !== null && !fait && enRetard(date, maintenant);
  const affichee = date ? (retard ? compteARebours(date, maintenant) : dateCourte(date, maintenant)) : null;
  const idDate = `date-${bloc.id}`;
  const [rappelsOuverts, setRappelsOuverts] = useState(false);
  const rappels = rappelsEffectifs(bloc.y.get('rappels') as Rappel[] | undefined);
  const perso = (bloc.y.get('rappelPerso') as string | null | undefined) ?? null;
  return (
    <div className={`bloc-echeance-groupe${fait ? ' faite' : ''}`}>
    <div className={`bloc bloc-echeance${fait ? ' faite' : ''}`}>
      <CaseACocher coche={fait} onChange={() => poserBloc(doc, bloc.id, 'fait', !fait)} libelle={`Échéance ${titre || 'sans titre'} faite`} />
      <input
        className="t-corps bloc-echeance-titre"
        value={titre}
        placeholder="Échéance"
        aria-label="Titre de l'échéance"
        autoFocus={autoFocus}
        onChange={(e) => texteBloc(doc, bloc.id, e.target.value)}
      />
      <span className="ligne-points" aria-hidden="true" />
      <label className="bloc-echeance-date t-cote" htmlFor={idDate}>
        <span className="visuellement-cache">{date ? `Date : ${dateParlee(date)}` : 'Choisir une date'}</span>
        <span aria-hidden="true">
          {affichee === null ? '--.--' : urgente && !fait ? <Nuage>{affichee}</Nuage> : <span className={retard ? 'redline' : undefined}>{affichee}</span>}
        </span>
        <input
          id={idDate}
          type="date"
          className="date-cachee"
          value={date ?? ''}
          onChange={(e) => dateBloc(doc, bloc.id, e.target.value || null)}
        />
      </label>
    </div>
    {date && !fait && (
      <button type="button" className="bloc-echeance-rappels t-cote" onClick={() => setRappelsOuverts(true)}>
        Rappels · {resumeRappels(rappels, perso, false)}
      </button>
    )}
    <Feuille ouverte={rappelsOuverts} onFermer={() => setRappelsOuverts(false)} titre="Rappels">
      <ChoixRappels valeurs={rappels} onChange={(r) => poserBloc(doc, bloc.id, 'rappels', r)} avecHeure={false}
        perso={perso} onPerso={(d) => poserBloc(doc, bloc.id, 'rappelPerso', d)} idPerso={`rappel-perso-${bloc.id}`} />
    </Feuille>
    </div>
  );
}

export function BlocSeparateur() {
  return <hr className="bloc bloc-separateur trace" />;
}

/** Commandes d'un bloc en mode « Réorganiser ». */
export function CommandesBloc({ doc, bloc, premier, dernier, onSupprime }: {
  doc: Y.Doc; bloc: Bloc; premier: boolean; dernier: boolean; onSupprime: (nom: string) => void;
}) {
  const noms: Record<string, string> = {
    arbre: 'Arborescence', texte: 'Texte', echeance: 'Échéance', separateur: 'Séparateur', lien: 'Lien', croquis: 'Croquis',
  };
  return (
    <div className="commandes-bloc" role="group" aria-label={noms[bloc.type]}>
      <span className="t-label">{noms[bloc.type]}</span>
      <span className="commandes-bloc-actions">
        <BoutonIcone libelle="Monter le bloc" disabled={premier} onClick={() => deplacerBloc(doc, bloc.id, -1)}><IcHaut /></BoutonIcone>
        <BoutonIcone libelle="Descendre le bloc" disabled={dernier} onClick={() => deplacerBloc(doc, bloc.id, 1)}><IcBas /></BoutonIcone>
        {bloc.type !== 'arbre' && (
          <BoutonIcone libelle="Supprimer le bloc" rouge onClick={() => { supprimerBloc(doc, bloc.id); onSupprime(noms[bloc.type] ?? 'Bloc'); }}><IcSupprimer /></BoutonIcone>
        )}
      </span>
    </div>
  );
}
