import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useStockage } from '../app/contexte';
import { aller } from '../app/route';
import { ChoixRappels } from '../notif/ChoixRappels';
import { useEtatNotifs, useServiceNotifs } from '../notif/contexte';
import { estIos, type EtatNotifs } from '../notif/service';
import { Choix, Feuille } from '../ui/ui';
import { useServiceSynchro } from '../sync/contexte';
import '../notif/notif.css';

function ligneEtat(e: EtatNotifs): string {
  switch (e) {
    case 'actives': return 'Activées sur cet appareil';
    case 'inactives': return 'Inactives sur cet appareil';
    case 'installer': return 'Indisponibles ici : ouvrez Isoligne depuis l’écran d’accueil (Partager, puis Sur l’écran d’accueil)';
    case 'sans-synchro': return 'Les rappels passent par votre serveur de synchro : activez d’abord la synchro';
    case 'bloquees': return estIos()
      ? 'Bloquées : Réglages de l’iPhone, Notifications, Isoligne'
      : 'Bloquées : autorisez-les dans les réglages du site de votre navigateur';
    default: return 'Ce navigateur ne reçoit pas de notifications';
  }
}

function erreurActivation(x: unknown): string {
  return navigator.onLine === false ? 'Hors ligne. Réessayez une fois connecté.' : `Activation impossible${x instanceof Error && x.message ? ` (${x.message})` : ''}.`;
}

/** Section « Notifications » des Réglages (brief : design/briefs/temps.md §5). */
export function SectionNotifications() {
  const service = useServiceNotifs();
  const etat = useEtatNotifs();
  const [defauts, setDefauts] = useState(() => service.rappelsParDefaut());
  const [resume, setResume] = useState(() => service.resume());
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    const maj = () => { setDefauts(service.rappelsParDefaut()); setResume(service.resume()); };
    service.reglages.observe(maj);
    return () => service.reglages.unobserve(maj);
  }, [service]);

  const agir = async (f: () => Promise<string | void>) => {
    setEnvoi(true);
    setMessage(null);
    try { const t = await f(); if (t) setMessage({ texte: t, erreur: false }); } catch (x) { setMessage({ texte: erreurActivation(x), erreur: true }); } finally { setEnvoi(false); }
  };

  return (
    <>
      <p className={`t-cote notif-ligne${etat === 'bloquees' ? ' redline' : ''}`} role="status">{ligneEtat(etat)}</p>
      {etat === 'inactives' && <Choix onClick={() => void agir(() => service.activer())}>Activer les notifications</Choix>}
      {etat === 'sans-synchro' && <Choix onClick={() => document.getElementById('r-synchro')?.scrollIntoView({ block: 'start' })}>Aller à la synchro</Choix>}
      {etat === 'actives' && (
        <>
          <Choix onClick={() => void agir(async () => {
            const s = await service.essai();
            return s >= 200 && s < 300 ? 'Essai envoyé. Il arrive en quelques secondes.' : `Le service de notifications a répondu ${s}.`;
          })}>Envoyer un essai</Choix>
          <Choix onClick={() => void agir(() => service.desactiver())}>Désactiver sur cet appareil</Choix>
        </>
      )}
      {message && <p className={`t-cote notif-ligne${message.erreur ? ' redline' : ''}`} role={message.erreur ? 'alert' : 'status'}>{message.texte}</p>}
      {envoi && <p className="visuellement-cache" role="status">En cours</p>}

      <h3 className="t-cote sous-reglage">Rappels des nouvelles échéances</h3>
      <ChoixRappels valeurs={defauts} avecHeure onChange={(r) => { setDefauts(r); service.poserDefauts(r); }} />

      <div className="sous-reglage">
        <Choix role="checkbox" aria-checked={resume !== null} actif={resume !== null}
          onClick={() => { const v = resume === null ? '08:30' : null; setResume(v); service.poserResume(v); }}>
          Résumé quotidien
        </Choix>
        {resume !== null && (
          <div className="rappel-perso">
            <label className="t-cote" htmlFor="heure-resume">Heure du résumé</label>
            <input id="heure-resume" type="time" className="champ t-corps" value={resume}
              onChange={(e) => { if (e.target.value) { setResume(e.target.value); service.poserResume(e.target.value); } }} />
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Demande d'autorisation au bon moment : à la création d'une échéance,
 * une seule fois. La demande du système ne part qu'au toucher d'« Activer ».
 */
export function DemandeNotifications() {
  const stockage = useStockage();
  const service = useServiceNotifs();
  const synchro = useServiceSynchro();
  const etat = useEtatNotifs();
  const nombre = useLiveQuery(() => stockage.index.echeances.count(), [stockage]);
  const demandee = useLiveQuery(() => stockage.reglage<boolean>('notifDemandee', false), [stockage]);
  const precedent = useRef<number | undefined>(undefined);
  const [ouverte, setOuverte] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (nombre === undefined) return;
    const avant = precedent.current;
    precedent.current = nombre;
    // Version sans serveur (développement, tests) : rien à proposer.
    if (!synchro.disponible || avant === undefined || nombre <= avant || demandee !== false) return;
    if (etat === 'inactives' || etat === 'installer' || etat === 'sans-synchro') setOuverte(true);
  }, [nombre, demandee, etat, synchro]);

  const fermer = () => { setOuverte(false); void stockage.poserReglage('notifDemandee', true); };

  return (
    <Feuille ouverte={ouverte} onFermer={fermer} titre="Rappels">
      <div className="form-ajout">
        {etat === 'installer' ? (
          <>
            <p className="t-corps">Les rappels arrivent seulement dans l’app installée : Partager, puis Sur l’écran d’accueil.</p>
            <button type="button" className="bouton-principal t-label" onClick={fermer}>Compris</button>
          </>
        ) : etat === 'sans-synchro' ? (
          <>
            <p className="t-corps">Les rappels passent par votre serveur de synchro. Activez d’abord la synchro.</p>
            <div className="confirmation-actions">
              <button type="button" className="bouton-secondaire t-label" onClick={fermer}>Plus tard</button>
              <button type="button" className="bouton-principal t-label" onClick={() => { fermer(); aller({ ecran: 'reglages' }); }}>Réglages</button>
            </div>
          </>
        ) : (
          <>
            <p className="t-corps">Recevoir les rappels de vos échéances sur cet appareil, même app fermée ?</p>
            {erreur && <p className="t-cote redline" role="alert">{erreur}</p>}
            <div className="confirmation-actions">
              <button type="button" className="bouton-secondaire t-label" onClick={fermer}>Plus tard</button>
              <button type="button" className="bouton-principal t-label" onClick={() => {
                service.activer().then(fermer, (x: unknown) => setErreur(erreurActivation(x)));
              }}>Activer</button>
            </div>
          </>
        )}
      </div>
    </Feuille>
  );
}
