import type * as Y from 'yjs';
import { gunzipSync, gzipSync, strFromU8, strToU8 } from 'fflate';
import type { Stockage } from '../data/stockage';
import { lireProjet, type ProjetEch } from '../echange/projet';
import { aleatoire, depuisBase64Url, versBase64Url } from '../sync/crypto';
import type { ServiceSynchro } from '../sync/service';

/**
 * Partage en lecture seule : un instantané du projet, compressé puis chiffré
 * (AES-256-GCM) avec une clé neuve qui n'existe que dans le lien, après le `#`.
 * Le serveur ne garde qu'un bloc illisible et l'empreinte de l'identifiant.
 */

export interface Instantane { v: 1; cree: number; projet: ProjetEch }

/** Un partage connu de l'espace (rangé dans l'espace chiffré, donc visible de chaque appareil). */
export interface Partage { id: string; cle: string; projetId: string; titre: string; cree: number; maj: number; expire: number | null }

export type Duree = '7' | '30' | 'jamais';
export const DUREES: { valeur: Duree; libelle: string }[] = [
  { valeur: '7', libelle: '7 j' }, { valeur: '30', libelle: '30 j' }, { valeur: 'jamais', libelle: 'Jamais' },
];
export const DUREE_DEFAUT: Duree = '30';

const CONTEXTE = new TextEncoder().encode('isoligne-partage:v1');
const JOUR = 86_400_000;

async function cleAes(brute: Uint8Array, usage: KeyUsage): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', brute as BufferSource, 'AES-GCM', false, [usage]);
}

export async function chiffrerInstantane(i: Instantane, cle: Uint8Array): Promise<string> {
  const clair = gzipSync(strToU8(JSON.stringify(i)), { level: 9, mtime: 0 });
  const iv = aleatoire(12);
  const c = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource, additionalData: CONTEXTE as BufferSource }, await cleAes(cle, 'encrypt'), clair as BufferSource));
  const tout = new Uint8Array(12 + c.length);
  tout.set(iv);
  tout.set(c, 12);
  return versBase64Url(tout);
}

export async function dechiffrerInstantane(donnees: string, cle: Uint8Array): Promise<Instantane> {
  const tout = depuisBase64Url(donnees);
  const clair = new Uint8Array(await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: tout.slice(0, 12) as BufferSource, additionalData: CONTEXTE as BufferSource }, await cleAes(cle, 'decrypt'), tout.slice(12) as BufferSource,
  ));
  const i = JSON.parse(strFromU8(gunzipSync(clair))) as Instantane;
  if (i.v !== 1 || !i.projet) throw new Error('Instantané inconnu');
  return i;
}

export function lienDe(p: Pick<Partage, 'id' | 'cle'>, origine = `${location.origin}${import.meta.env.BASE_URL}`): string {
  return `${origine}#/s/${p.id}/${p.cle}`;
}

export function partages(stockage: Stockage): Y.Map<Partage> {
  return stockage.espace.getMap<Partage>('partages');
}

function expiration(d: Duree, depuis: number): number | null {
  return d === 'jamais' ? null : depuis + Number(d) * JOUR;
}

async function envoyer(synchro: ServiceSynchro, stockage: Stockage, p: Partage): Promise<void> {
  const projet = stockage.ouvrir(p.projetId);
  await projet.pret;
  const donnees = await chiffrerInstantane({ v: 1, cree: Date.now(), projet: lireProjet(projet.doc) }, depuisBase64Url(p.cle));
  if (donnees.length > 2_800_000) throw new Error('Projet trop lourd pour un partage (2 Mo au plus).');
  await synchro.requete('/partages', { corps: { id: p.id, donnees, expire: p.expire } });
}

/** Crée le lien d'un projet (ou renvoie celui qui existe déjà, mis à jour). */
export async function partager(synchro: ServiceSynchro, stockage: Stockage, projetId: string, titre: string, duree: Duree): Promise<Partage> {
  const maintenant = Date.now();
  const p: Partage = {
    id: versBase64Url(aleatoire(32)), cle: versBase64Url(aleatoire(32)), projetId, titre, cree: maintenant, maj: maintenant,
    expire: expiration(duree, maintenant),
  };
  await envoyer(synchro, stockage, p);
  partages(stockage).set(p.id, p);
  return p;
}

/** Remplace l'instantané ; le lien ne change pas. */
export async function mettreAJour(synchro: ServiceSynchro, stockage: Stockage, p: Partage): Promise<Partage> {
  const projet = stockage.ouvrir(p.projetId);
  await projet.pret;
  const maj: Partage = { ...p, titre: lireProjet(projet.doc).titre, maj: Date.now() };
  await envoyer(synchro, stockage, maj);
  partages(stockage).set(p.id, maj);
  return maj;
}

export async function revoquer(synchro: ServiceSynchro, stockage: Stockage, p: Partage): Promise<void> {
  await synchro.requete(`/partages/${p.id}`, { methode: 'DELETE' });
  partages(stockage).delete(p.id);
}

/** Partages actifs (non expirés), du plus récent au plus ancien. */
export function actifs(stockage: Stockage, maintenant = Date.now()): Partage[] {
  return [...partages(stockage).values()].filter((p) => p.expire === null || p.expire > maintenant).sort((a, b) => b.cree - a.cree);
}
