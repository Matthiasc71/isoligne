import { useEffect, useState } from 'react';
import { useStockage } from '../app/contexte';
import { aller } from '../app/route';
import { useServiceSynchro } from '../sync/contexte';
import { dateJour, aujourdhui } from '../time/dates';
import { Choix, Feuille, Segments } from '../ui/ui';
import { actifs, DUREE_DEFAUT, DUREES, lienDe, mettreAJour, partager, partages, revoquer, type Duree, type Partage } from './partage';
import './partage.css';

/** Partages actifs de l'espace, suivis en direct (ils vivent dans l'espace chiffré). */
export function usePartages(): Partage[] {
  const stockage = useStockage();
  const [liste, setListe] = useState(() => actifs(stockage));
  useEffect(() => {
    const maj = () => setListe(actifs(stockage));
    const m = partages(stockage);
    m.observe(maj);
    maj();
    return () => m.unobserve(maj);
  }, [stockage]);
  return liste;
}

function erreur(e: unknown): string {
  if (navigator.onLine === false) return 'Hors ligne : le partage demande le réseau.';
  return e instanceof Error && e.message.includes('2 Mo') ? e.message : 'Le serveur ne répond pas. Réessayez plus tard.';
}

const expireTexte = (p: Partage) => (p.expire === null ? 'sans expiration' : `expire le ${dateJour(aujourdhui(p.expire))}`);

/** Lien affiché, avec Copier, Partager (feuille du système) et Mettre à jour. */
function LienPartage({ p, onMessage }: { p: Partage; onMessage: (m: string) => void }) {
  const stockage = useStockage();
  const synchro = useServiceSynchro();
  const url = lienDe(p);
  return (
    <>
      <p className="t-cote partage-url" aria-label="Lien de partage">{url}</p>
      <p className="t-cote">Instantané du {dateJour(aujourdhui(p.maj))} · {expireTexte(p)}</p>
      <div className="confirmation-actions">
        <button type="button" className="bouton-secondaire t-label" onClick={() => {
          void navigator.clipboard?.writeText(url).then(() => onMessage('Lien copié.'), () => onMessage('Copie impossible : sélectionnez le lien.'));
        }}>Copier</button>
        {typeof navigator.share === 'function' && (
          <button type="button" className="bouton-secondaire t-label" onClick={() => { void navigator.share({ url, title: p.titre }).catch(() => undefined); }}>Partager</button>
        )}
      </div>
      <Choix onClick={() => void mettreAJour(synchro, stockage, p).then(() => onMessage('Instantané mis à jour : même lien.'), (e: unknown) => onMessage(erreur(e)))}>
        Mettre à jour l’instantané
      </Choix>
    </>
  );
}

/** « ··· » du projet → Partager en lecture seule (brief bonus §4). */
export function FeuillePartage({ ouverte, onFermer, projetId, titre }: { ouverte: boolean; onFermer: () => void; projetId: string; titre: string }) {
  const stockage = useStockage();
  const synchro = useServiceSynchro();
  const liste = usePartages();
  const existant = liste.find((p) => p.projetId === projetId);
  const [duree, setDuree] = useState<Duree>(DUREE_DEFAUT);
  const [message, setMessage] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  useEffect(() => { if (!ouverte) setMessage(null); }, [ouverte]);

  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre="Partager en lecture seule">
      <div className="form-ajout">
        {!synchro.configuree ? (
          <>
            <p className="t-corps">Le partage passe par votre serveur de synchro. Activez d’abord la synchro.</p>
            <button type="button" className="bouton-principal t-label" onClick={() => { onFermer(); aller({ ecran: 'reglages' }); }}>Réglages</button>
          </>
        ) : existant ? (
          <LienPartage p={existant} onMessage={setMessage} />
        ) : (
          <>
            <p className="t-corps">Toute personne qui a ce lien voit cet instantané. Le serveur ne peut pas le lire.</p>
            <Segments libelle="Durée du lien" valeur={duree} onChange={setDuree} options={DUREES} />
            <button type="button" className="bouton-principal t-label" disabled={envoi} onClick={() => {
              setEnvoi(true);
              setMessage(null);
              partager(synchro, stockage, projetId, titre, duree).then(() => setMessage('Lien créé.'), (e: unknown) => setMessage(erreur(e))).finally(() => setEnvoi(false));
            }}>Créer le lien</button>
          </>
        )}
        {message && <p className="t-cote" role="status">{message}</p>}
      </div>
    </Feuille>
  );
}

/** Réglages → Liens partagés : projet, dates, Mettre à jour, Révoquer (confirmé). */
export function SectionPartages() {
  const stockage = useStockage();
  const synchro = useServiceSynchro();
  const liste = usePartages();
  const [confirmer, setConfirmer] = useState<Partage | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  if (liste.length === 0) return <p className="t-cote notif-ligne">Aucun lien actif.</p>;
  return (
    <>
      <ul className="appareils" aria-label="Liens partagés">
        {liste.map((p) => (
          <li key={p.id} className="appareil">
            <span className="appareil-texte">
              <span className="t-corps">{p.titre || 'Sans titre'}</span>
              <span className="t-cote">créé le {dateJour(aujourdhui(p.cree))} · {expireTexte(p)}</span>
            </span>
            <span className="partage-actions">
              <button type="button" className="t-label lien-action" onClick={() => void mettreAJour(synchro, stockage, p).then(() => setMessage(`« ${p.titre} » mis à jour.`), (e: unknown) => setMessage(erreur(e)))}>Mettre à jour</button>
              <button type="button" className="t-label lien-action redline" onClick={() => setConfirmer(p)}>Révoquer</button>
            </span>
          </li>
        ))}
      </ul>
      {message && <p className="t-cote notif-ligne" role="status">{message}</p>}
      <Feuille ouverte={confirmer !== null} onFermer={() => setConfirmer(null)} titre="Révoquer le lien">
        <p className="t-corps confirmation">Le lien de « {confirmer?.titre} » cessera de fonctionner, et l’instantané sera effacé du serveur.</p>
        <div className="confirmation-actions">
          <button type="button" className="bouton-secondaire t-label" onClick={() => setConfirmer(null)}>Garder</button>
          <button type="button" className="bouton-danger t-label" onClick={() => {
            const p = confirmer;
            setConfirmer(null);
            if (p) void revoquer(synchro, stockage, p).then(() => setMessage('Lien révoqué.'), (e: unknown) => setMessage(erreur(e)));
          }}>Révoquer</button>
        </div>
      </Feuille>
    </>
  );
}
