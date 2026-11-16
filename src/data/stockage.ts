import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import Dexie, { type EntityTable } from 'dexie';
import { LOCAL } from '../tree/arbre';
import { nouvelId } from './ids';
import { initialiserProjet, resumer, type Echeance, type InitProjet, type ResumeProjet } from './projet';
import { blocs, meta, noeuds } from './schema';
import { ID_ESPACE, type EtatProjet, type MemoireSynchro, type SourceDocs } from '../sync/moteur';

// ───────────────────────────── Index local (Dexie) ─────────────────────────────

export interface LigneEcheance extends Echeance {
  /** `${projetId}:${cible}` */
  id: string;
  projetId: string;
}

export interface Reglage { cle: string; valeur: unknown }

export class BaseIndex extends Dexie {
  projets!: EntityTable<ResumeProjet, 'id'>;
  echeances!: EntityTable<LigneEcheance, 'id'>;
  reglages!: EntityTable<Reglage, 'cle'>;
  synchro!: EntityTable<EtatProjet, 'projet'>;

  constructor(nom = 'isoligne-index') {
    super(nom);
    this.version(1).stores({
      projets: 'id, prochaineDate, modifie, statut, epingle, calque',
      echeances: 'id, projetId, date',
      reglages: 'cle',
    });
    // Jalon 4 : état confirmé de la synchro, par projet.
    this.version(2).stores({ synchro: 'projet' });
  }
}

// ───────────────────────────── Documents Yjs ─────────────────────────────

export interface ProjetOuvert {
  id: string;
  doc: Y.Doc;
  annuler: Y.UndoManager;
  pret: Promise<void>;
}

const HORODATAGE = 'horodatage';

export class Stockage {
  readonly index: BaseIndex;
  readonly espace: Y.Doc;
  readonly espacePret: Promise<void>;
  private readonly prefixe: string;
  private readonly ouverts = new Map<string, ProjetOuvert>();
  private readonly persistances: IndexeddbPersistence[] = [];
  private readonly minuteries = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly revises = new Set<string>();
  private readonly derniersHorodatages = new Map<string, number>();

  constructor(prefixe = 'isoligne') {
    this.prefixe = prefixe;
    this.index = new BaseIndex(`${prefixe}-index`);
    this.espace = new Y.Doc();
    const p = new IndexeddbPersistence(`${prefixe}:espace`, this.espace);
    this.persistances.push(p);
    this.espacePret = p.whenSynced.then(() => this.reconcilier());
    // Un projet créé ou supprimé sur un autre appareil arrive par l'espace : on met l'index à niveau.
    this.espace.getMap('projets').observe(() => { void this.espacePret.then(() => this.reconcilier()); });
  }

  /** Accès aux documents pour le moteur de synchro. */
  sourceSynchro(): SourceDocs {
    return {
      ids: () => this.idsProjets(),
      doc: async (id) => {
        if (id === ID_ESPACE) { await this.espacePret; return this.espace; }
        const p = this.ouvrir(id);
        await p.pret;
        return p.doc;
      },
    };
  }

  memoireSynchro(): MemoireSynchro {
    return {
      lire: (projet) => this.index.synchro.get(projet),
      ecrire: async (e) => { await this.index.synchro.put({ ...e }); },
    };
  }

  /** Projets connus de l'espace (non supprimés). */
  idsProjets(): string[] {
    const ids: string[] = [];
    this.espace.getMap<{ supprime?: boolean }>('projets').forEach((v, id) => { if (!v.supprime) ids.push(id); });
    return ids;
  }

  /** Remet l'index à niveau pour les projets absents de Dexie (premier lancement, autre appareil). */
  private async reconcilier(): Promise<void> {
    const ids = this.idsProjets();
    const connus = new Set((await this.index.projets.toCollection().primaryKeys()) as string[]);
    for (const id of ids) if (!connus.has(id)) await this.ouvrir(id).pret;
    for (const id of connus) if (!ids.includes(id)) await this.retirerIndex(id);
  }

  ouvrir(id: string): ProjetOuvert {
    const deja = this.ouverts.get(id);
    if (deja) return deja;
    const doc = new Y.Doc({ guid: id });
    const persistance = new IndexeddbPersistence(`${this.prefixe}:p:${id}`, doc);
    this.persistances.push(persistance);
    const annuler = new Y.UndoManager([noeuds(doc), blocs(doc), meta(doc)], {
      trackedOrigins: new Set([LOCAL]),
      captureTimeout: 600,
    });
    const projet: ProjetOuvert = { id, doc, annuler, pret: persistance.whenSynced.then(() => this.indexer(id, doc)) };
    doc.on('update', (_u: Uint8Array, origine: unknown) => {
      if (origine === LOCAL) this.horodater(id, doc);
      this.planifierIndex(id, doc);
    });
    this.ouverts.set(id, projet);
    return projet;
  }

  async creerProjet(init: Omit<InitProjet, 'calque'>): Promise<string> {
    await this.espacePret;
    const id = nouvelId();
    const derniers = await this.index.projets.orderBy('calque').last();
    const calque = (derniers?.calque ?? 0) + 1;
    const p = this.ouvrir(id);
    await p.pret;
    initialiserProjet(p.doc, { ...init, calque });
    p.annuler.clear();
    this.espace.getMap('projets').set(id, { cree: Date.now() });
    await this.indexer(id, p.doc);
    return id;
  }

  /** Suppression définitive d'un projet (après confirmation dans l'interface). */
  async supprimerProjet(id: string): Promise<void> {
    this.espace.getMap('projets').set(id, { supprime: true });
    await this.retirerIndex(id);
  }

  /** Date de modification, au plus une écriture toutes les 10 s (économise la synchro). */
  private horodater(id: string, doc: Y.Doc): void {
    const maintenant = Date.now();
    if (maintenant - (this.derniersHorodatages.get(id) ?? 0) < 10_000) return;
    this.derniersHorodatages.set(id, maintenant);
    doc.transact(() => {
      const m = meta(doc);
      m.set('modifie', maintenant);
      if (!this.revises.has(id)) {
        this.revises.add(id);
        m.set('revision', ((m.get('revision') as number | undefined) ?? 0) + 1);
      }
    }, HORODATAGE);
  }

  private planifierIndex(id: string, doc: Y.Doc): void {
    clearTimeout(this.minuteries.get(id));
    this.minuteries.set(id, setTimeout(() => { void this.indexer(id, doc); }, 250));
  }

  async indexer(id: string, doc: Y.Doc): Promise<void> {
    clearTimeout(this.minuteries.get(id));
    if (!meta(doc).has('titre')) return; // document encore vide
    const { resume, echeances } = resumer(id, doc);
    await this.index.transaction('rw', this.index.projets, this.index.echeances, async () => {
      await this.index.projets.put(resume);
      await this.index.echeances.where('projetId').equals(id).delete();
      await this.index.echeances.bulkPut(echeances.map((e) => ({ ...e, id: `${id}:${e.cible}`, projetId: id })));
    });
  }

  private async retirerIndex(id: string): Promise<void> {
    await this.index.transaction('rw', this.index.projets, this.index.echeances, async () => {
      await this.index.projets.delete(id);
      await this.index.echeances.where('projetId').equals(id).delete();
    });
  }

  async reglage<T>(cle: string, defaut: T): Promise<T> {
    return ((await this.index.reglages.get(cle))?.valeur as T | undefined) ?? defaut;
  }
  async poserReglage(cle: string, valeur: unknown): Promise<void> {
    await this.index.reglages.put({ cle, valeur });
  }

  /** Écrit tout de suite les index en attente (avant de quitter la page). */
  async vider(): Promise<void> {
    await Promise.all([...this.ouverts.values()].map((p) => this.indexer(p.id, p.doc)));
  }

  async fermer(): Promise<void> {
    for (const t of this.minuteries.values()) clearTimeout(t);
    await Promise.all(this.persistances.map((p) => p.destroy()));
    this.index.close();
  }
}
