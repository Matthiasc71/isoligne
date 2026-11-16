import { Fragment, useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { nomParDefaut, useEtatSynchro, useServiceSynchro } from '../sync/contexte';
import type { AppairageOuvert, AppairageReclame, AppareilDistant } from '../sync/service';
import { ErreurSynchro } from '../sync/transport';
import { aujourdhui, dateJour } from '../time/dates';
import { Choix, Feuille } from '../ui/ui';
import './synchro.css';

type Parcours = null | 'activer' | 'rejoindre' | 'restaurer' | 'ajouter' | 'secours' | 'premiere';

function message(e: unknown): string {
  if (e instanceof ErreurSynchro) {
    if (e.statut === 404) return 'Code inconnu ou expiré. Affichez un nouveau code sur l’autre appareil.';
    if (e.statut === 429) return 'Trop de tentatives. Réessayez dans 10 minutes.';
    if (e.statut === 403) return 'Clé de secours refusée.';
    if (e.statut === 409) return 'Cet espace existe déjà : utilisez « Restaurer ».';
  }
  return navigator.onLine === false ? 'Hors ligne. Réessayez une fois connecté.' : 'Le serveur ne répond pas. Réessayez plus tard.';
}

function ilYa(ms: number | null): string {
  if (!ms) return '';
  const min = Math.round((Date.now() - ms) / 60_000);
  return min < 1 ? 'à l’instant' : min < 60 ? `il y a ${min} min` : `il y a ${Math.round(min / 60)} h`;
}

function mo(octets: number): string {
  const m = octets / 1_048_576;
  return `${(m >= 100 ? m.toFixed(0) : m.toFixed(1)).replace('.', ',')} Mo`;
}

/** Section « Synchro » des Réglages (brief : design/briefs/synchro.md). */
export function SectionSynchro() {
  const service = useServiceSynchro();
  const etat = useEtatSynchro();
  const [parcours, setParcours] = useState<Parcours>(null);
  const [appareils, setAppareils] = useState<AppareilDistant[] | null>(null);
  const [usage, setUsage] = useState<{ octets: number; limite: number } | null>(null);
  const [revoquer, setRevoquer] = useState<AppareilDistant | null>(null);
  const configuree = service.configuree;

  useEffect(() => {
    if (!configuree || etat.statut === 'revoque') return;
    void service.appareils().then(setAppareils).catch(() => setAppareils(null));
    void service.usage().then(setUsage).catch(() => setUsage(null));
  }, [service, configuree, etat.dernier, etat.statut]);

  if (!service.disponible) {
    return <p className="t-cote">Synchro indisponible dans cette version.</p>;
  }

  const fermer = () => setParcours(null);

  if (!configuree) {
    // Clés distinctes : les dialogues d'une branche ne doivent pas être réutilisés par l'autre.
    return (
      <Fragment key="local">
        <p className="t-cote synchro-ligne">Les projets restent sur cet appareil.</p>
        <Choix onClick={() => setParcours('activer')}>Activer la synchro</Choix>
        <Choix onClick={() => setParcours('rejoindre')}>Rejoindre un espace</Choix>
        <Choix onClick={() => setParcours('restaurer')}>Restaurer avec la clé de secours</Choix>
        <Feuille ouverte={parcours === 'activer'} onFermer={fermer} titre="Activer la synchro"><Activer onFini={() => setParcours('premiere')} /></Feuille>
        <Feuille ouverte={parcours === 'rejoindre'} onFermer={fermer} titre="Rejoindre un espace"><Rejoindre onFini={fermer} /></Feuille>
        <Feuille ouverte={parcours === 'restaurer'} onFermer={fermer} titre="Restaurer"><Restaurer onFini={fermer} /></Feuille>
      </Fragment>
    );
  }

  const ligneEtat = {
    'non-configure': '',
    inactif: 'En attente',
    'en-cours': 'Synchronisation…',
    'a-jour': `À jour · ${ilYa(etat.dernier)}`,
    'hors-ligne': 'Hors ligne : les modifications partiront au retour du réseau',
    erreur: `Dernière synchro ${etat.dernier ? ilYa(etat.dernier) : 'impossible'} · le serveur ne répond pas`,
    revoque: 'Cet appareil a été révoqué. Ses projets restent ici.',
  }[etat.statut];
  const ratio = usage ? usage.octets / usage.limite : 0;

  return (
    <Fragment key="espace">
      <p className={`t-cote synchro-ligne${etat.statut === 'revoque' || etat.statut === 'erreur' ? ' redline' : ''}`} role="status">{ligneEtat}</p>

      {appareils && etat.statut !== 'revoque' && (
        <ul className="appareils" aria-label="Appareils">
          {appareils.map((a) => (
            <li key={a.id} className="appareil">
              <span className="appareil-texte">
                <span className="t-corps">{a.nom}</span>
                <span className="t-cote">{a.moi ? 'cet appareil' : `vu ${dateJour(aujourdhui(a.vu))}`}</span>
              </span>
              {!a.moi && <button type="button" className="t-label lien-action redline" onClick={() => setRevoquer(a)}>Révoquer</button>}
            </li>
          ))}
        </ul>
      )}
      {etat.statut === 'revoque' ? (
        <Choix onClick={() => void service.quitter()}>Quitter l’espace</Choix>
      ) : (
        <>
          <Choix onClick={() => setParcours('ajouter')}>Ajouter un appareil</Choix>
          <Choix onClick={() => setParcours('secours')}>Clé de secours</Choix>
        </>
      )}
      {usage && etat.statut !== 'revoque' && (
        <p className={`t-cote synchro-ligne${ratio >= 0.8 ? ' redline' : ''}`}>
          Stockage {mo(usage.octets)} / {mo(usage.limite)} · {Math.round(ratio * 100)} %
          {ratio >= 0.8 && ' · proche de la limite gratuite'}
        </p>
      )}

      <Feuille ouverte={parcours === 'ajouter'} onFermer={fermer} titre="Ajouter un appareil"><Ajouter onFini={fermer} /></Feuille>
      <Feuille ouverte={parcours === 'secours' || parcours === 'premiere'} onFermer={fermer} titre="Clé de secours">
        <CleSecours key={parcours ?? ''} premiere={parcours === 'premiere'} onFini={fermer} />
      </Feuille>
      <Feuille ouverte={revoquer !== null} onFermer={() => setRevoquer(null)} titre="Révoquer">
        <p className="t-corps confirmation">« {revoquer?.nom} » ne pourra plus synchroniser. Ses données locales restent sur lui.</p>
        <div className="confirmation-actions">
          <button type="button" className="bouton-secondaire t-label" onClick={() => setRevoquer(null)}>Garder</button>
          <button type="button" className="bouton-danger t-label" onClick={() => {
            const a = revoquer;
            setRevoquer(null);
            if (a) void service.revoquer(a.id).then(() => service.appareils().then(setAppareils));
          }}>Révoquer</button>
        </div>
      </Feuille>
    </Fragment>
  );
}

function ChampNom({ nom, setNom }: { nom: string; setNom: (n: string) => void }) {
  return (
    <>
      <label className="visuellement-cache" htmlFor="nom-appareil">Nom de cet appareil</label>
      <input id="nom-appareil" className="champ t-corps" value={nom} maxLength={40} onChange={(e) => setNom(e.target.value)} placeholder="Nom de cet appareil" />
    </>
  );
}

function Erreur({ texte }: { texte: string | null }) {
  return texte ? <p className="t-cote redline" role="alert">{texte}</p> : null;
}

function Activer({ onFini }: { onFini: () => void }) {
  const service = useServiceSynchro();
  const [nom, setNom] = useState(nomParDefaut);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const valider = async (e: FormEvent) => {
    e.preventDefault();
    setEnvoi(true);
    try { await service.creerEspace(nom.trim() || nomParDefaut()); onFini(); } catch (x) {
      // Instance personnelle : un espace existe déjà sur ce serveur.
      setErreur(x instanceof ErreurSynchro && x.statut === 403
        ? 'Votre espace existe déjà : utilisez « Rejoindre un espace » ou « Restaurer ».' : message(x));
    } finally { setEnvoi(false); }
  };
  return (
    <form className="form-ajout" onSubmit={(e) => void valider(e)}>
      <p className="t-corps">Cet appareil crée l’espace. Les projets sont chiffrés ici avant tout envoi.</p>
      <ChampNom nom={nom} setNom={setNom} />
      <Erreur texte={erreur} />
      <button type="submit" className="bouton-principal t-label" disabled={envoi}>Activer</button>
    </form>
  );
}

function Rejoindre({ onFini }: { onFini: () => void }) {
  const service = useServiceSynchro();
  const [nom, setNom] = useState(nomParDefaut);
  const [code, setCode] = useState('');
  const [reclame, setReclame] = useState<AppairageReclame | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  // En attente de la confirmation : interrogation toutes les 2 s, 5 minutes au plus.
  useEffect(() => {
    if (!reclame) return;
    let actif = true;
    const debut = Date.now();
    const tour = async () => {
      while (actif && Date.now() - debut < 300_000) {
        try { if (await service.attendre(reclame, nom.trim() || nomParDefaut())) { onFini(); return; } } catch (x) { setErreur(message(x)); return; }
        await new Promise((r) => setTimeout(r, 2000));
      }
    };
    void tour();
    return () => { actif = false; };
  }, [reclame]); // eslint-disable-line react-hooks/exhaustive-deps

  if (reclame) {
    return (
      <div className="form-ajout">
        <p className="t-corps">Vérifiez que l’autre appareil affiche les mêmes chiffres :</p>
        <p className="t-display empreinte" aria-label={`Empreinte ${reclame.empreinte?.split('').join(' ')}`}>{reclame.empreinte?.replace(/(\d{3})(\d{3})/, '$1 $2')}</p>
        <p className="t-cote" role="status">En attente de confirmation sur l’autre appareil.</p>
        <Erreur texte={erreur} />
      </div>
    );
  }
  return (
    <form className="form-ajout" onSubmit={(e) => {
      e.preventDefault();
      setErreur(null);
      void service.reclamer(code, nom.trim() || nomParDefaut()).then(setReclame).catch((x: unknown) => setErreur(message(x)));
    }}>
      <p className="t-corps">Sur l’appareil déjà relié : Réglages, Synchro, « Ajouter un appareil ».</p>
      <label className="visuellement-cache" htmlFor="code-appairage">Code à 8 caractères</label>
      <input id="code-appairage" className="champ t-corps champ-code" value={code} placeholder="Code" autoComplete="one-time-code"
        autoCapitalize="characters" spellCheck={false} maxLength={11} onChange={(e) => setCode(e.target.value)} />
      <ChampNom nom={nom} setNom={setNom} />
      <Erreur texte={erreur} />
      <button type="submit" className="bouton-principal t-label" disabled={code.replace(/[\s-]/g, '').length !== 8}>Continuer</button>
    </form>
  );
}

function Restaurer({ onFini }: { onFini: () => void }) {
  const service = useServiceSynchro();
  const [cle, setCle] = useState('');
  const [nom, setNom] = useState(nomParDefaut);
  const [erreur, setErreur] = useState<string | null>(null);
  return (
    <form className="form-ajout" onSubmit={(e) => {
      e.preventDefault();
      setErreur(null);
      void service.restaurer(cle, nom.trim() || nomParDefaut())
        .then((ok) => (ok ? onFini() : setErreur('Clé invalide : vérifiez chaque groupe de 4 caractères.')))
        .catch((x: unknown) => setErreur(x instanceof ErreurSynchro && (x.statut === 403 || x.statut === 404)
          ? 'Clé refusée : aucun espace ne correspond. Vérifiez chaque groupe de 4 caractères.' : message(x)));
    }}>
      <label className="visuellement-cache" htmlFor="cle-secours">Clé de secours</label>
      <textarea id="cle-secours" className="champ t-cote champ-cle" rows={3} value={cle} placeholder="XXXX-XXXX-…" spellCheck={false}
        autoCapitalize="characters" onChange={(e) => setCle(e.target.value)} />
      <ChampNom nom={nom} setNom={setNom} />
      <Erreur texte={erreur} />
      <button type="submit" className="bouton-principal t-label" disabled={cle.replace(/[\s-]/g, '').length !== 52}>Restaurer</button>
    </form>
  );
}

function Ajouter({ onFini }: { onFini: () => void }) {
  const service = useServiceSynchro();
  const [ouvert, setOuvert] = useState<AppairageOuvert | null>(null);
  const [demande, setDemande] = useState<{ nom: string; empreinte: string | null; pub: string | null } | null>(null);
  const [reste, setReste] = useState(300);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState(false);

  useEffect(() => { void service.ouvrirAppairage().then(setOuvert).catch((x: unknown) => setErreur(message(x))); }, [service]);
  useEffect(() => {
    if (!ouvert || demande) return;
    const i = setInterval(() => {
      setReste(Math.max(0, Math.round((ouvert.expire - Date.now()) / 1000)));
      void service.suivreAppairage(ouvert).then((d) => { if (d) setDemande(d); }).catch(() => {});
    }, 2000);
    return () => clearInterval(i);
  }, [service, ouvert, demande]);

  if (erreur) return <Erreur texte={erreur} />;
  if (fait) return <p className="t-cote" role="status">Appareil ajouté. La synchro démarre de son côté.</p>;
  if (demande && ouvert) {
    return (
      <div className="form-ajout">
        <p className="t-corps">« {demande.nom} » demande à rejoindre. Les chiffres sont-ils identiques sur les deux écrans ?</p>
        <p className="t-display empreinte">{demande.empreinte?.replace(/(\d{3})(\d{3})/, '$1 $2')}</p>
        <div className="confirmation-actions">
          <button type="button" className="bouton-secondaire t-label" onClick={onFini}>Refuser</button>
          <button type="button" className="bouton-principal t-label" onClick={() => {
            if (demande.pub) void service.confirmerAppairage(ouvert, demande.pub).then(() => setFait(true)).catch((x: unknown) => setErreur(message(x)));
          }}>Identiques</button>
        </div>
      </div>
    );
  }
  return (
    <div className="form-ajout">
      <p className="t-corps">Sur le nouvel appareil, dans l’app installée : Réglages, Synchro, « Rejoindre un espace ».</p>
      <p className="t-display code-appairage" aria-label={`Code ${ouvert?.code.split('').join(' ') ?? ''}`}>
        {ouvert ? `${ouvert.code.slice(0, 4)} ${ouvert.code.slice(4)}` : '···· ····'}
      </p>
      <p className="t-cote">{reste > 0 ? `Valable ${Math.floor(reste / 60)} min ${String(reste % 60).padStart(2, '0')} s` : 'Code expiré : fermez et recommencez.'}</p>
    </div>
  );
}

function GrilleCle({ cle, impression = false }: { cle: string | null; impression?: boolean }) {
  return (
    <div className="cle-secours t-cote" aria-label={impression ? undefined : 'Clé de secours'}>
      {cle?.split('-').map((g, i) => <span key={i}>{g}</span>)}
      {cle && <span className="cle-cartouche" aria-hidden="true">Isoligne · clé de secours</span>}
    </div>
  );
}

function CleSecours({ premiere = false, onFini }: { premiere?: boolean; onFini: () => void }) {
  const service = useServiceSynchro();
  const [cle, setCle] = useState<string | null>(null);
  const [visible, setVisible] = useState(premiere);
  useEffect(() => { if (visible) void service.cleDeSecours().then(setCle); }, [service, visible]);
  if (!visible) {
    return (
      <div className="form-ajout">
        <p className="t-corps">La clé de secours permet de tout retrouver sur un nouvel appareil. Ne l’affichez qu’à l’abri des regards.</p>
        <button type="button" className="bouton-principal t-label" onClick={() => setVisible(true)}>Afficher</button>
      </div>
    );
  }
  return (
    <div className="form-ajout">
      <p className="t-corps">Sans cette clé, si tous vos appareils sont perdus, les données ne sont plus récupérables.</p>
      <GrilleCle cle={cle} />
      {cle && createPortal(
        <div className="impression-cle" aria-hidden="true">
          <GrilleCle cle={cle} impression />
          <p>Sans cette clé, si tous vos appareils sont perdus, les données ne sont plus récupérables. À conserver à l’abri.</p>
        </div>,
        document.body,
      )}
      <div className="confirmation-actions">
        <button type="button" className="bouton-secondaire t-label" onClick={() => window.print()}>Imprimer</button>
        <button type="button" className="bouton-secondaire t-label" onClick={() => { if (cle) void navigator.clipboard?.writeText(cle); }}>Copier</button>
      </div>
      <button type="button" className="bouton-principal t-label" onClick={onFini}>{premiere ? 'Je l’ai notée' : 'Fermer'}</button>
    </div>
  );
}
