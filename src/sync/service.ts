import { ADRESSE_WORKER, definirJetonApercus } from '../media/lien';
import type { Stockage } from '../data/stockage';
import {
  aleatoire, chiffrer, cleDeSecours, cleEnveloppe, codeAppairage, dechiffrer, depuisBase64Url, deriverEspace,
  empreinte, genererPaire, lireCleDeSecours, versBase64Url, type Paire,
} from './crypto';
import { MoteurSynchro, type BilanCycle } from './moteur';
import { ErreurSynchro, TransportHttp } from './transport';

export interface ConfigSynchro { url: string; espace: string; appareil: string; jeton: string; nom: string }

export type Statut = 'non-configure' | 'inactif' | 'en-cours' | 'a-jour' | 'hors-ligne' | 'erreur' | 'revoque';
export interface EtatSynchro { statut: Statut; dernier: number | null; erreur: string | null; erreurDepuis: number | null }

export interface AppareilDistant { id: string; nom: string; cree: number; vu: number; moi: boolean }

const INTERVALLE = 30_000;

async function api<T>(url: string, chemin: string, options: { jeton?: string; corps?: unknown; methode?: string } = {}): Promise<T> {
  const h: Record<string, string> = {};
  if (options.jeton) h.authorization = `Bearer ${options.jeton}`;
  if (options.corps !== undefined) h['content-type'] = 'application/json';
  const r = await fetch(`${url}${chemin}`, {
    method: options.methode ?? (options.corps !== undefined ? 'POST' : 'GET'),
    headers: h,
    body: options.corps !== undefined ? JSON.stringify(options.corps) : undefined,
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    signal: AbortSignal.timeout(15_000),
  });
  if (!r.ok) throw new ErreurSynchro(r.status, ((await r.json().catch(() => ({}))) as { erreur?: string }).erreur ?? `${r.status}`);
  return r.json() as Promise<T>;
}

/** Appairage ouvert sur l'appareil existant. */
export interface AppairageOuvert { id: string; code: string; expire: number; paire: Paire }
/** Appairage réclamé par le nouvel appareil. */
export interface AppairageReclame { id: string; espace: string; paire: Paire | null; pubAncien: Uint8Array | null; empreinte: string | null }

/**
 * Synchro de l'espace : configuration, appairage, planification des cycles
 * (ouverture, retour au premier plan, retour du réseau, toutes les 30 s).
 */
export class ServiceSynchro {
  private etat: EtatSynchro = { statut: 'non-configure', dernier: null, erreur: null, erreurDepuis: null };
  private readonly abonnes = new Set<() => void>();
  private moteur: MoteurSynchro | null = null;
  private config: ConfigSynchro | null = null;
  private enCours: Promise<BilanCycle | null> | null = null;
  private minuterie: ReturnType<typeof setInterval> | null = null;
  private readonly url: string;

  constructor(private readonly stockage: Stockage, url: string = ADRESSE_WORKER) {
    this.url = url;
  }

  get disponible(): boolean { return Boolean(this.url); }
  get configuree(): ConfigSynchro | null { return this.config; }
  lireEtat(): EtatSynchro { return this.etat; }
  abonner(f: () => void): () => void { this.abonnes.add(f); return () => this.abonnes.delete(f); }

  private poser(e: Partial<EtatSynchro>): void {
    const suivant = { ...this.etat, ...e };
    // Début d'une période d'erreur (témoin global au-delà de 10 min).
    if (suivant.statut === 'erreur') suivant.erreurDepuis = this.etat.erreurDepuis ?? Date.now();
    else if (suivant.statut === 'a-jour') suivant.erreurDepuis = null;
    this.etat = suivant;
    for (const f of this.abonnes) f();
  }

  private async maitre(): Promise<Uint8Array | null> {
    return this.stockage.reglage<Uint8Array | null>('maitre', null);
  }

  /** Au démarrage : reprend la configuration enregistrée. */
  async charger(): Promise<void> {
    const config = await this.stockage.reglage<ConfigSynchro | null>('synchro', null);
    const maitre = await this.maitre();
    if (config && maitre) await this.demarrer(config, maitre);
  }

  private async enregistrer(config: ConfigSynchro, maitre: Uint8Array): Promise<void> {
    await this.stockage.poserReglage('maitre', maitre);
    await this.stockage.poserReglage('synchro', config);
    await this.demarrer(config, maitre);
  }

  private async demarrer(config: ConfigSynchro, maitre: Uint8Array): Promise<void> {
    this.config = config;
    definirJetonApercus(config.jeton);
    const espace = await deriverEspace(maitre);
    this.moteur = new MoteurSynchro(espace, new TransportHttp(config.url, config.jeton), this.stockage.memoireSynchro(), this.stockage.sourceSynchro());
    this.poser({ statut: 'inactif' });
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.surReseau);
      document.addEventListener('visibilitychange', this.surVisibilite);
      this.minuterie = setInterval(() => { if (document.visibilityState === 'visible') void this.synchroniser(); }, INTERVALLE);
    }
    void this.synchroniser();
  }

  arreter(): void {
    if (this.minuterie) clearInterval(this.minuterie);
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.surReseau);
      document.removeEventListener('visibilitychange', this.surVisibilite);
    }
    this.moteur = null;
    definirJetonApercus(null);
  }

  private surReseau = () => { void this.synchroniser(); };
  // Au retour au premier plan, et juste avant de passer en arrière-plan (envoi des dernières modifications).
  private surVisibilite = () => { void this.synchroniser(); };

  /** Un cycle à la fois ; hors ligne, on attend le retour du réseau. */
  synchroniser(): Promise<BilanCycle | null> {
    if (!this.moteur) return Promise.resolve(null);
    if (this.enCours) return this.enCours;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { this.poser({ statut: 'hors-ligne' }); return Promise.resolve(null); }
    const moteur = this.moteur;
    this.poser({ statut: 'en-cours' });
    this.enCours = moteur.cycle()
      .then((b) => { this.poser({ statut: 'a-jour', dernier: Date.now(), erreur: null }); return b; })
      .catch((e: unknown) => {
        if (e instanceof ErreurSynchro && e.statut === 401) { this.poser({ statut: 'revoque', erreur: 'Appareil révoqué' }); this.arreter(); }
        else this.poser({ statut: navigator.onLine === false ? 'hors-ligne' : 'erreur', erreur: e instanceof Error ? e.message : String(e) });
        return null;
      })
      .finally(() => { this.enCours = null; });
    return this.enCours;
  }

  // ───────────────────────────── Premier appareil, restauration ─────────────────────────────

  async creerEspace(nom: string): Promise<void> {
    const maitre = aleatoire(32);
    const espace = await deriverEspace(maitre);
    const r = await api<{ appareil: string; jeton: string }>(this.url, '/espace', { corps: { espace: espace.id, secours: espace.jetonSecours, nom } });
    await this.enregistrer({ url: this.url, espace: espace.id, appareil: r.appareil, jeton: r.jeton, nom }, maitre);
  }

  async restaurer(cle: string, nom: string): Promise<boolean> {
    const maitre = await lireCleDeSecours(cle);
    if (!maitre) return false;
    const espace = await deriverEspace(maitre);
    const r = await api<{ appareil: string; jeton: string }>(this.url, '/restauration', { corps: { espace: espace.id, secours: espace.jetonSecours, nom } });
    await this.enregistrer({ url: this.url, espace: espace.id, appareil: r.appareil, jeton: r.jeton, nom }, maitre);
    return true;
  }

  async cleDeSecours(): Promise<string | null> {
    const m = await this.maitre();
    return m ? cleDeSecours(m) : null;
  }

  /**
   * Quitter l'espace (après une révocation) : le secret et le jeton sont effacés,
   * les projets restent sur l'appareil, qui peut ensuite rejoindre un espace.
   */
  async quitter(): Promise<void> {
    this.arreter();
    this.config = null;
    await this.stockage.poserReglage('synchro', null);
    await this.stockage.poserReglage('maitre', null);
    await this.stockage.oublierSynchro();
    this.poser({ statut: 'non-configure', dernier: null, erreur: null, erreurDepuis: null });
  }

  // ───────────────────────────── Appairage : appareil existant ─────────────────────────────

  async ouvrirAppairage(): Promise<AppairageOuvert> {
    if (!this.config) throw new Error('Synchro non configurée');
    const code = codeAppairage();
    const paire = await genererPaire();
    const r = await api<{ id: string; expire: number }>(this.config.url, '/appairage', {
      jeton: this.config.jeton, corps: { code, pub: versBase64Url(paire.publique) },
    });
    return { id: r.id, code, expire: r.expire, paire };
  }

  /** Le nouvel appareil s'est-il présenté ? Si oui : son nom et l'empreinte à comparer. */
  async suivreAppairage(a: AppairageOuvert): Promise<{ nom: string; empreinte: string | null; pub: string | null } | null> {
    if (!this.config) return null;
    const r = await api<{ statut: string; pub: string | null; nom: string | null }>(this.config.url, `/appairage/${a.id}`, { jeton: this.config.jeton });
    if (r.statut !== 'reclame') return null;
    return { nom: r.nom ?? 'Appareil', pub: r.pub, empreinte: r.pub ? await empreinte(a.paire.publique, depuisBase64Url(r.pub)) : null };
  }

  /** Confirmation (après comparaison des empreintes) : le secret maître part chiffré pour le seul nouvel appareil. */
  async confirmerAppairage(a: AppairageOuvert, pubNouveau: string): Promise<void> {
    if (!this.config) return;
    const maitre = await this.maitre();
    if (!maitre) throw new Error('Secret absent');
    const cle = await cleEnveloppe(a.paire.privee, depuisBase64Url(pubNouveau));
    const enveloppe = versBase64Url(await chiffrer(cle, maitre, 'appairage'));
    await api(this.config.url, `/appairage/${a.id}/confirmer`, { jeton: this.config.jeton, corps: { enveloppe } });
  }

  // ───────────────────────────── Appairage : nouvel appareil ─────────────────────────────

  async reclamer(code: string, nom: string): Promise<AppairageReclame> {
    const paire = await genererPaire();
    const r = await api<{ id: string; espace: string; pub: string | null }>(this.url, '/appairage/reclamer', {
      corps: { code: code.toUpperCase().replace(/[\s-]/g, ''), nom, pub: versBase64Url(paire.publique) },
    });
    const pubAncien = r.pub ? depuisBase64Url(r.pub) : null;
    return { id: r.id, espace: r.espace, paire, pubAncien, empreinte: pubAncien ? await empreinte(paire.publique, pubAncien) : null };
  }

  /** Attend la confirmation sur l'appareil existant ; renvoie vrai quand l'appareil est appairé. */
  async attendre(a: AppairageReclame, nom: string): Promise<boolean> {
    const r = await api<{ statut: string; appareil?: string; jeton?: string; enveloppe?: string }>(this.url, `/appairage/${a.id}/attente`);
    if (r.statut !== 'confirme' || !r.jeton || !r.appareil || !r.enveloppe || !a.paire || !a.pubAncien) return false;
    const cle = await cleEnveloppe(a.paire.privee, a.pubAncien);
    const maitre = await dechiffrer(cle, depuisBase64Url(r.enveloppe), 'appairage');
    // Le secret reçu doit bien correspondre à l'espace annoncé.
    if ((await deriverEspace(maitre)).id !== a.espace) throw new Error('Secret incohérent');
    await this.enregistrer({ url: this.url, espace: a.espace, appareil: r.appareil, jeton: r.jeton, nom }, maitre);
    return true;
  }

  // ───────────────────────────── Réglages ─────────────────────────────

  async appareils(): Promise<AppareilDistant[]> {
    if (!this.config) return [];
    return api(this.config.url, '/appareils', { jeton: this.config.jeton });
  }

  async revoquer(id: string): Promise<void> {
    if (!this.config) return;
    await api(this.config.url, `/appareils/${id}`, { jeton: this.config.jeton, methode: 'DELETE' });
  }

  /** Appel authentifié au Worker (notifications…). */
  async requete<T>(chemin: string, options: { corps?: unknown; methode?: string } = {}): Promise<T> {
    if (!this.config) throw new Error('Synchro non configurée');
    return api<T>(this.config.url, chemin, { jeton: this.config.jeton, ...options });
  }

  /** Appel public au Worker (clé VAPID). */
  async requetePublique<T>(chemin: string): Promise<T> {
    return api<T>(this.url, chemin);
  }

  async usage(): Promise<{ octets: number; limite: number } | null> {
    if (!this.config) return null;
    return api(this.config.url, '/usage', { jeton: this.config.jeton });
  }
}
