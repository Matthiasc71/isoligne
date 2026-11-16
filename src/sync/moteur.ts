import * as Y from 'yjs';
import { chiffrer, dechiffrer, depuisBase64Url, versBase64Url, type Espace } from './crypto';
import type { Ligne, Transport } from './transport';

/** Origine des mises à jour reçues du serveur (ni horodatées, ni annulables). */
export const DISTANT = 'distant';
/** Identifiant de synchro du document d'espace (liste des projets). */
export const ID_ESPACE = 'espace';

/**
 * État confirmé d'un projet :
 * - `seq` : dernier bloc lu sur le serveur ;
 * - `sv` : vecteur d'état de tout ce que le serveur possède à coup sûr.
 * À chaque cycle, on envoie la différence entre le document et `sv` : rien
 * de local ne peut être oublié, même si l'app s'est fermée en plein envoi.
 */
export interface EtatProjet { projet: string; seq: number; sv: Uint8Array }

export interface MemoireSynchro {
  lire(projet: string): Promise<EtatProjet | undefined>;
  ecrire(e: EtatProjet): Promise<void>;
}

export interface SourceDocs {
  ids(): string[];
  doc(projet: string): Promise<Y.Doc>;
}

export interface OptionsMoteur {
  /** Taille maximale d'une partie (caractères base64) : sous la limite de 1 Mo du Worker. */
  partie?: number;
  /** Au-delà de ce nombre de blocs sur le serveur, l'appareil envoie un état compacté. */
  seuilCompactage?: number;
}

const SV_VIDE = Y.encodeStateVector(new Map());

function fusionnerSv(a: Uint8Array, b: Uint8Array): Uint8Array {
  const x = Y.decodeStateVector(a);
  for (const [client, horloge] of Y.decodeStateVector(b)) x.set(client, Math.max(horloge, x.get(client) ?? 0));
  return Y.encodeStateVector(x);
}

/** Vrai si `doc` contient des opérations absentes de `sv`. */
function enAvance(doc: Uint8Array, sv: Uint8Array): boolean {
  const confirme = Y.decodeStateVector(sv);
  for (const [client, horloge] of Y.decodeStateVector(doc)) if (horloge > (confirme.get(client) ?? 0)) return true;
  return false;
}

function decouper(s: string, taille: number): string[] {
  const parts: string[] = [];
  for (let i = 0; i < s.length; i += taille) parts.push(s.slice(i, i + taille));
  return parts.length ? parts : [''];
}

/** Regroupe les lignes consécutives d'un même bloc ; un bloc incomplet est ignoré. */
export function regrouper(lignes: Ligne[]): { id: number; d: string }[] {
  const blocs: { id: number; d: string }[] = [];
  let courant: Ligne[] = [];
  for (const l of lignes) {
    if (l.partie === 0) courant = [];
    if (courant.length !== l.partie) { courant = []; continue; }
    courant.push(l);
    if (l.partie === l.total - 1) {
      blocs.push({ id: l.id, d: courant.map((x) => x.d).join('') });
      courant = [];
    }
  }
  return blocs;
}

export interface BilanCycle { recus: number; envoyes: number; compactes: number; illisibles: number }

export class MoteurSynchro {
  private readonly partie: number;
  private readonly seuil: number;

  constructor(
    private readonly espace: Espace,
    private readonly transport: Transport,
    private readonly memoire: MemoireSynchro,
    private readonly source: SourceDocs,
    options: OptionsMoteur = {},
  ) {
    this.partie = options.partie ?? 900_000;
    this.seuil = options.seuilCompactage ?? 50;
  }

  private contexte(projet: string): string {
    return `${this.espace.id}:${projet}`;
  }

  private async encoder(maj: Uint8Array, projet: string): Promise<string> {
    return versBase64Url(await chiffrer(this.espace.cle, maj, this.contexte(projet)));
  }

  /** Un cycle complet : tirer ce qui manque, envoyer ce qui n'est pas confirmé, compacter si besoin. */
  async cycle(): Promise<BilanCycle> {
    const bilan: BilanCycle = { recus: 0, envoyes: 0, compactes: 0, illisibles: 0 };
    const tetes = new Map((await this.transport.tetes()).map((t) => [t.projet, t]));
    // L'espace d'abord : il fait connaître les projets créés sur un autre appareil.
    await this.projet(ID_ESPACE, tetes.get(ID_ESPACE), bilan);
    const ids = new Set([...this.source.ids(), ...[...tetes.keys()].filter((p) => p !== ID_ESPACE)]);
    for (const id of ids) await this.projet(id, tetes.get(id), bilan);
    return bilan;
  }

  private async projet(projet: string, tete: { seq: number; nombre: number } | undefined, bilan: BilanCycle): Promise<void> {
    const doc = await this.source.doc(projet);
    const etat: EtatProjet = (await this.memoire.lire(projet)) ?? { projet, seq: 0, sv: SV_VIDE };

    // 1. Tirer.
    if (tete && tete.seq > etat.seq) {
      for (let encore = true; encore;) {
        const page = await this.transport.tirer(projet, etat.seq);
        encore = page.encore;
        for (const bloc of regrouper(page.lignes)) {
          try {
            const maj = await dechiffrer(this.espace.cle, depuisBase64Url(bloc.d), this.contexte(projet));
            Y.applyUpdate(doc, maj, DISTANT);
            etat.sv = fusionnerSv(etat.sv, Y.encodeStateVectorFromUpdate(maj));
            bilan.recus++;
          } catch {
            bilan.illisibles++; // bloc altéré ou d'un autre espace : ignoré, jamais appliqué
          }
          etat.seq = Math.max(etat.seq, bloc.id);
        }
        if (page.lignes.length === 0) break;
      }
      await this.memoire.ecrire(etat);
    }

    // 2. Envoyer ce que le serveur n'a pas confirmé.
    const sv = Y.encodeStateVector(doc);
    let seqServeur = Math.max(tete?.seq ?? 0, etat.seq);
    if (enAvance(sv, etat.sv)) {
      const bloc = await this.encoder(Y.encodeStateAsUpdate(doc, etat.sv), projet);
      const parties = decouper(bloc, this.partie);
      let seq: number | undefined;
      for (const [i, p] of parties.entries()) seq = (await this.transport.envoyer(projet, p, i, parties.length)).seq;
      // Personne d'autre n'a écrit entre-temps : inutile de relire notre propre bloc.
      if (seq !== undefined && etat.seq === (tete?.seq ?? 0)) etat.seq = seq;
      if (seq !== undefined) seqServeur = seq;
      etat.sv = fusionnerSv(etat.sv, sv);
      await this.memoire.ecrire(etat);
      bilan.envoyes++;
    }

    // 3. Compacter : l'appareil a tout lu ; l'état complet remplace les anciens blocs.
    if (tete && tete.nombre + (bilan.envoyes ? 1 : 0) > this.seuil && etat.seq === seqServeur) {
      const complet = Y.encodeStateAsUpdate(doc);
      const bloc = await this.encoder(complet, projet);
      const parties = decouper(bloc, this.partie);
      for (const [i, p] of parties.entries()) await this.transport.compacter(projet, etat.seq, p, i, parties.length);
      etat.sv = fusionnerSv(etat.sv, Y.encodeStateVector(doc));
      await this.memoire.ecrire(etat);
      bilan.compactes++;
    }
  }
}
