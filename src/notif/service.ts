import type * as Y from 'yjs';
import { liveQuery } from 'dexie';
import type { Rappel } from '../data/schema';
import type { Stockage } from '../data/stockage';
import { aleatoire, depuisBase64Url, versBase64Url } from '../sync/crypto';
import type { ServiceSynchro } from '../sync/service';
import { aujourdhui } from '../time/dates';
import { planifier, poserRappelsParDefaut, RAPPELS_DEFAUT, type EcheancePlan } from '../time/rappels';
import { chiffrerNotif, type ClesAbonnement } from './webpush';

/**
 * Notifications de l'appareil :
 * - activation dans le geste de l'utilisateur (exigence d'iOS) ;
 * - abonnement push rangé dans l'espace chiffré, pour que chaque appareil puisse chiffrer pour lui ;
 * - planning recalculé après chaque synchro, chiffré ici, envoyé au Worker seulement s'il a changé ;
 * - pastille d'icône (échéances du jour + en retard).
 */

export type EtatNotifs = 'non-supporte' | 'installer' | 'sans-synchro' | 'bloquees' | 'inactives' | 'actives';

export interface AbonnementEspace extends ClesAbonnement { endpoint: string; appareil: string; cree: number }
interface AbonnementLocal { id: string; endpoint: string }

/** Plafond du Worker : envois (notifications × abonnements) par planning. */
const MAX_ENVOIS = 400;

export function estIos(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
export function installee(): boolean {
  return matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

type NavigateurPastille = Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };

async function sha256(texte: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texte));
  return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export class ServiceNotifs {
  private etat: EtatNotifs = 'inactives';
  private readonly abonnes = new Set<() => void>();
  private local: AbonnementLocal | null = null;
  private envoyee: string | null = null;
  private enCours: Promise<void> | null = null;
  private encore = false;

  constructor(private readonly stockage: Stockage, private readonly synchro: ServiceSynchro) {}

  /** Réglages partagés par tous les appareils (dans l'espace chiffré). */
  get reglages(): Y.Map<unknown> { return this.stockage.espace.getMap('notifications'); }
  get abonnements(): Y.Map<AbonnementEspace> { return this.stockage.espace.getMap('abonnements'); }

  lireEtat(): EtatNotifs { return this.etat; }
  abonner(f: () => void): () => void { this.abonnes.add(f); return () => this.abonnes.delete(f); }
  private notifier(): void { for (const f of this.abonnes) f(); }

  rappelsParDefaut(): Rappel[] { return (this.reglages.get('defauts') as Rappel[] | undefined) ?? [...RAPPELS_DEFAUT]; }
  resume(): string | null { return (this.reglages.get('resume') as string | null | undefined) ?? null; }
  poserDefauts(r: Rappel[]): void { this.reglages.set('defauts', r); }
  poserResume(hhmm: string | null): void { this.reglages.set('resume', hhmm); }

  async charger(): Promise<void> {
    await this.stockage.espacePret;
    this.local = await this.stockage.reglage<AbonnementLocal | null>('abonnementPush', null);
    this.envoyee = await this.stockage.reglage<string | null>('planningEnvoye', null);
    poserRappelsParDefaut(this.rappelsParDefaut());
    this.reglages.observe(() => { poserRappelsParDefaut(this.rappelsParDefaut()); void this.planifier(); this.notifier(); });
    this.synchro.abonner(() => {
      this.recalculer();
      if (this.synchro.lireEtat().statut === 'a-jour') void this.planifier();
    });
    liveQuery(() => this.stockage.index.echeances.toArray()).subscribe({ next: () => { void this.planifier(); void this.pastille(); } });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { this.recalculer(); void this.pastille(); } });
    this.recalculer();
  }

  recalculer(): void {
    let e: EtatNotifs;
    if (estIos() && !installee()) e = 'installer';
    else if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) e = 'non-supporte';
    else if (!this.synchro.configuree || this.synchro.lireEtat().statut === 'revoque') e = 'sans-synchro';
    else if (Notification.permission === 'denied') e = 'bloquees';
    else if (this.local && Notification.permission === 'granted' && this.abonnements.has(this.local.id)) e = 'actives';
    else e = 'inactives';
    if (e !== this.etat) { this.etat = e; this.notifier(); }
  }

  /** À appeler directement dans le gestionnaire du toucher : iOS refuse une demande hors geste. */
  async activer(): Promise<void> {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') { this.recalculer(); return; }
    const reg = await navigator.serviceWorker.ready;
    const { cle } = await this.synchro.requetePublique<{ cle: string }>('/push/cle');
    // Un ancien abonnement (autre clé VAPID) empêcherait d'en créer un nouveau.
    const ancien = await reg.pushManager.getSubscription();
    if (ancien) await ancien.unsubscribe().catch(() => false);
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: depuisBase64Url(cle) as BufferSource });
    const cles = sub.toJSON().keys ?? {};
    if (!cles.p256dh || !cles.auth) throw new Error('Abonnement incomplet');
    const id = versBase64Url(aleatoire(16));
    await this.synchro.requete('/push/abonnements', { corps: { id, endpoint: sub.endpoint } });
    if (this.local) this.abonnements.delete(this.local.id);
    this.abonnements.set(id, { endpoint: sub.endpoint, p256dh: cles.p256dh, auth: cles.auth, appareil: this.synchro.configuree?.nom ?? '', cree: Date.now() });
    this.local = { id, endpoint: sub.endpoint };
    await this.stockage.poserReglage('abonnementPush', this.local);
    this.envoyee = null;
    this.recalculer();
    await this.planifier();
  }

  async desactiver(): Promise<void> {
    const reg = await navigator.serviceWorker.ready;
    await (await reg.pushManager.getSubscription())?.unsubscribe().catch(() => false);
    if (this.local) {
      const id = this.local.id;
      this.abonnements.delete(id);
      await this.synchro.requete(`/push/abonnements/${id}`, { methode: 'DELETE' }).catch(() => null);
    }
    this.local = null;
    await this.stockage.poserReglage('abonnementPush', null);
    this.recalculer();
    await this.planifier();
  }

  /** Notification immédiate vers cet appareil, pour vérifier toute la chaîne. */
  async essai(): Promise<number> {
    const ab = this.local ? this.abonnements.get(this.local.id) : undefined;
    if (!this.local || !ab) throw new Error('Notifications inactives');
    const c = await chiffrerNotif(ab, { t: 'Essai', b: 'Les rappels arriveront ainsi.', u: '#/reglages', g: 'essai' });
    return (await this.synchro.requete<{ statut: number }>('/push/essai', { corps: { a: this.local.id, c } })).statut;
  }

  /** Recalcule le planning ; ne l'envoie que s'il diffère du dernier confirmé. Un seul calcul à la fois. */
  planifier(): Promise<void> {
    if (this.enCours) { this.encore = true; return this.enCours; }
    this.enCours = this.calculer()
      .catch(() => undefined)
      .finally(() => {
        this.enCours = null;
        if (this.encore) { this.encore = false; void this.planifier(); }
      });
    return this.enCours;
  }

  private async calculer(): Promise<void> {
    if (!this.synchro.configuree || navigator.onLine === false || this.synchro.lireEtat().statut === 'revoque') return;
    const abos = [...this.abonnements.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
    const notifs = abos.length ? planifier(await this.echeances(), { maintenant: Date.now(), resume: this.resume() }) : [];
    const empreinte = await sha256(JSON.stringify({ a: abos.map(([id]) => id), n: notifs.map((n) => [n.id, n.quand, n.titre, n.texte, n.url]) }));
    if (empreinte === this.envoyee) return;
    const distant = await this.synchro.requete<{ empreinte: string | null }>('/push/planning');
    if (distant.empreinte !== empreinte) {
      const envois: { a: string; i: string; q: number; c: string }[] = [];
      remplir: for (const n of notifs) {
        for (const [id, ab] of abos) {
          if (envois.length >= MAX_ENVOIS) break remplir;
          envois.push({ a: id, i: n.id, q: n.quand, c: await chiffrerNotif(ab, { t: n.titre, b: n.texte, u: n.url, g: n.id }) });
        }
      }
      await this.synchro.requete('/push/planning', { corps: { empreinte, envois } });
    }
    this.envoyee = empreinte;
    await this.stockage.poserReglage('planningEnvoye', empreinte);
  }

  private async echeances(): Promise<EcheancePlan[]> {
    const [ech, projets] = await Promise.all([this.stockage.index.echeances.toArray(), this.stockage.index.projets.toArray()]);
    const parId = new Map(projets.map((p) => [p.id, p]));
    return ech.flatMap((e) => {
      const p = parId.get(e.projetId);
      if (!p || p.statut === 'archive') return [];
      return [{
        projetId: e.projetId, projet: p.titre, cible: e.cible, genre: e.genre, titre: e.titre, date: e.date,
        rappels: e.rappels ?? null, perso: e.rappelPerso ?? null,
      }];
    });
  }

  /** Pastille : échéances ouvertes du jour et en retard (projets non archivés). */
  async pastille(): Promise<void> {
    const nav = navigator as NavigateurPastille;
    if (!nav.setAppBadge) return;
    const jour = aujourdhui();
    const n = (await this.echeances()).filter((e) => e.date.slice(0, 10) <= jour).length;
    await (n > 0 ? nav.setAppBadge(n) : nav.clearAppBadge?.())?.catch(() => undefined);
  }
}
