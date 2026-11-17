import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useStockage } from '../app/contexte';
import { aller } from '../app/route';
import { useMaintenant } from '../app/temps';
import { importerFichier, livrer } from '../echange/fichiers';
import { creerSauvegarde } from '../echange/sauvegarde';
import { Choix } from '../ui/ui';

const JOUR = 86_400_000;

function ligneSauvegarde(derniere: number | null, maintenant: number): string {
  if (!derniere) return 'Aucune sauvegarde';
  // L'horloge de l'écran avance à la minute : une sauvegarde de l'instant ne doit pas paraître dans le futur.
  const j = Math.max(0, Math.floor((maintenant - derniere) / JOUR));
  const quand = j === 0 ? 'aujourd’hui' : j === 1 ? 'hier' : `il y a ${j} jours`;
  return j > 30 ? `Sauvegarde conseillée · dernière ${quand}` : `Dernière sauvegarde ${quand}`;
}

/** Réglages → Données : sauvegarde complète, restauration, import (brief bonus §2-3). */
export function SectionDonnees() {
  const stockage = useStockage();
  const maintenant = useMaintenant();
  const derniere = useLiveQuery(() => stockage.reglage<number | null>('derniereSauvegarde', null), [stockage]);
  const [message, setMessage] = useState<{ texte: string; erreur?: boolean; projet?: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const fichier = useRef<HTMLInputElement>(null);
  const [accepte, setAccepte] = useState('.zip');

  const agir = async (f: () => Promise<{ texte: string; projet?: string }>) => {
    setEnvoi(true);
    setMessage(null);
    try { setMessage(await f()); } catch (e) { setMessage({ texte: e instanceof Error ? e.message : 'Échec.', erreur: true }); } finally { setEnvoi(false); }
  };

  const choisir = (types: string) => {
    setAccepte(types);
    // Le sélecteur s'ouvre dans le geste (exigence d'iOS) : l'attribut est posé directement.
    if (fichier.current) { fichier.current.accept = types; fichier.current.click(); }
  };

  return (
    <>
      <p className="t-cote notif-ligne" role="status">{derniere === undefined ? '' : ligneSauvegarde(derniere, maintenant)}</p>
      <Choix onClick={() => void agir(async () => {
        const z = await creerSauvegarde(stockage);
        await livrer(new Blob([z.octets as BlobPart], { type: 'application/zip' }), z.nom);
        await stockage.poserReglage('derniereSauvegarde', Date.now());
        return { texte: `${z.projets} projet${z.projets > 1 ? 's' : ''} sauvegardé${z.projets > 1 ? 's' : ''}.` };
      })}>Sauvegarder tout</Choix>
      <Choix onClick={() => choisir('.zip,application/zip')}>Restaurer une sauvegarde</Choix>
      <Choix onClick={() => choisir('.md,.markdown,.txt,.opml,.xml,text/markdown,text/plain,text/x-opml')}>Importer un fichier</Choix>
      <input ref={fichier} type="file" className="visuellement-cache" tabIndex={-1} aria-hidden="true" accept={accepte}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          void agir(async () => {
            const r = await importerFichier(stockage, f);
            return r.genre === 'sauvegarde'
              ? { texte: `${r.projets} projet${r.projets > 1 ? 's' : ''} restauré${r.projets > 1 ? 's' : ''}, fusionné${r.projets > 1 ? 's' : ''} avec ceux de cet appareil.` }
              : { texte: `« ${r.titre} » importé.`, projet: r.id };
          });
        }} />
      {envoi && <p className="t-cote notif-ligne" role="status">En cours…</p>}
      {message && (
        <p className={`t-cote notif-ligne${message.erreur ? ' redline' : ''}`} role={message.erreur ? 'alert' : 'status'}>
          {message.texte}
          {message.projet && <> <button type="button" className="t-cote lien-action lien-souligne" onClick={() => aller({ ecran: 'projet', id: message.projet!, branche: null, vue: 'page' })}>Ouvrir</button></>}
        </p>
      )}
      <p className="t-cote notif-ligne">Le fichier de sauvegarde n’est pas chiffré : rangez-le en lieu sûr.</p>
    </>
  );
}
