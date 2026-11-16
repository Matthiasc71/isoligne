import { useEffect, useState, type FormEvent } from 'react';
import type * as Y from 'yjs';
import { IcSuite } from '../design/icones';
import { supprimerBloc, type Bloc } from '../data/projet';
import { BoutonIcone, Choix, Feuille } from '../ui/ui';
import { useAppuiLong } from '../ui/gestes';
import { ADRESSE_WORKER, apercusPossibles, demanderApercu, normaliserUrl, poserApercu, poserUrl, siteDe, type EtatLien } from './lien';

/** Champ d'adresse avec « Coller » (geste explicite : le presse-papiers n'est lu qu'à la demande). */
export function SaisieLien({ initiale = '', onValider, autoFocus = false }: { initiale?: string; onValider: (url: string) => void; autoFocus?: boolean }) {
  const [texte, setTexte] = useState(initiale);
  const [erreur, setErreur] = useState(false);
  const valider = (e?: FormEvent) => {
    e?.preventDefault();
    const url = normaliserUrl(texte);
    if (!url) { setErreur(true); return; }
    onValider(url);
  };
  const coller = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) { setTexte(t.trim()); setErreur(false); }
    } catch { /* refusé : on laisse le champ tel quel */ }
  };
  return (
    <form className="saisie-lien" onSubmit={valider} noValidate>
      <label className="visuellement-cache" htmlFor="adresse-lien">Adresse</label>
      <input
        id="adresse-lien"
        className="champ t-corps"
        type="text"
        inputMode="url"
        placeholder="Adresse"
        value={texte}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-invalid={erreur}
        aria-describedby={erreur ? 'erreur-lien' : undefined}
        onChange={(e) => { setTexte(e.target.value); setErreur(false); }}
        enterKeyHint="done"
      />
      {'clipboard' in navigator && (
        <button type="button" className="t-label lien-action" onClick={() => void coller()}>Coller</button>
      )}
      {erreur && <p id="erreur-lien" className="t-cote redline saisie-erreur" role="alert">Adresse invalide</p>}
    </form>
  );
}

/** Bloc Lien : titre (ou adresse) et une ligne grise (site). Toucher ouvre la page ; appui long ou « ··· » ouvre le détail. */
export function BlocLien({ doc, bloc, autoFocus }: { doc: Y.Doc; bloc: Bloc; autoFocus: boolean }) {
  const url = (bloc.y.get('url') as string | undefined) ?? '';
  const etat = ((bloc.y.get('etat') as EtatLien | undefined) ?? 'vide');
  const titre = (bloc.y.get('titre') as string | undefined) ?? '';
  const site = (bloc.y.get('site') as string | undefined) ?? (url ? siteDe(url) : '');
  const description = (bloc.y.get('description') as string | undefined) ?? '';
  const [detail, setDetail] = useState(false);
  const [modifier, setModifier] = useState(false);
  const appui = useAppuiLong(() => setDetail(true));

  // Aperçu demandé au Worker ; s'il est hors ligne, on réessaie au retour du réseau.
  useEffect(() => {
    if (etat !== 'attente' || !url || !apercusPossibles()) return;
    let actif = true;
    const essayer = async () => {
      const a = await demanderApercu(url);
      if (!actif) return;
      if (a) poserApercu(doc, bloc.id, a);
      else if (navigator.onLine !== false && apercusPossibles()) poserApercu(doc, bloc.id, null);
    };
    void essayer();
    const enLigne = () => void essayer();
    window.addEventListener('online', enLigne);
    return () => { actif = false; window.removeEventListener('online', enLigne); };
  }, [doc, bloc.id, etat, url]);

  if (!url || modifier) {
    return (
      <div className="bloc bloc-lien">
        <SaisieLien initiale={url} autoFocus={autoFocus || modifier} onValider={(u) => { poserUrl(doc, bloc.id, u); setModifier(false); }} />
      </div>
    );
  }

  return (
    <div className="bloc bloc-lien">
      <a className="lien-carte" href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" {...appui}>
        <span className="t-corps lien-titre">{titre || url.replace(/^https?:\/\//, '')}</span>
        <span className="t-cote">{etat === 'echec' ? `${site} · aperçu indisponible` : site}</span>
      </a>
      <BoutonIcone libelle="Détails du lien" sansCadre onClick={() => setDetail(true)}><IcSuite /></BoutonIcone>
      <Feuille ouverte={detail} onFermer={() => setDetail(false)} titre={titre || site || 'Lien'}>
        <p className="t-cote lien-adresse">{url}</p>
        {description && <p className="t-corps lien-description">{description}</p>}
        <div className="section-feuille">
          <Choix onClick={() => { void navigator.clipboard?.writeText(url); setDetail(false); }}>Copier l'adresse</Choix>
          <Choix onClick={() => { setDetail(false); setModifier(true); }}>Modifier</Choix>
          {etat === 'echec' && ADRESSE_WORKER && <Choix onClick={() => { poserUrl(doc, bloc.id, url); setDetail(false); }}>Réessayer l'aperçu</Choix>}
          <Choix rouge onClick={() => { supprimerBloc(doc, bloc.id); setDetail(false); }}>Supprimer</Choix>
        </div>
      </Feuille>
    </div>
  );
}
