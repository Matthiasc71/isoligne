import { afterEach, describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { Stockage } from '../../src/data/stockage';
import { aleatoire, deriverEspace, type Espace } from '../../src/sync/crypto';
import { MoteurSynchro, ID_ESPACE, type OptionsMoteur } from '../../src/sync/moteur';
import type { Ligne, Tete, Transport } from '../../src/sync/transport';
import { creerNoeud, definirTexte, lireArbre, basculerFait, supprimer } from '../../src/tree/arbre';
import { creerBloc } from '../../src/data/projet';
import { ajouterTrait } from '../../src/media/croquis';
import { RACINE } from '../../src/data/schema';

/** Serveur simulé : même sémantique que le Worker (têtes, parties, compactage). */
class ServeurSimule {
  lignes: (Ligne & { projet: string })[] = [];
  tetes = new Map<string, { seq: number; nombre: number }>();
  private id = 0;
  enPanne = false;
  /** Coupure pendant l'envoi seulement (les têtes et le tirage répondent). */
  panneEnvoi = false;
  altere: ((d: string) => string) | null = null;

  transport(): Transport {
    const s = this;
    const panne = () => { if (s.enPanne) throw new Error('hors ligne'); };
    return {
      async tetes(): Promise<Tete[]> { panne(); return [...s.tetes].map(([projet, t]) => ({ projet, ...t })); },
      async tirer(projet, depuis) {
        panne();
        const tete = s.tetes.get(projet)?.seq ?? 0;
        const l = s.lignes.filter((x) => x.projet === projet && x.id > depuis && x.id <= tete);
        return { lignes: l.map((x) => ({ id: x.id, partie: x.partie, total: x.total, d: s.altere ? s.altere(x.d) : x.d })), encore: false };
      },
      async envoyer(projet, d, partie, total) {
        panne();
        if (s.panneEnvoi) throw new Error('coupure pendant l’envoi');
        const id = ++s.id;
        s.lignes.push({ projet, id, partie, total, d });
        if (partie === total - 1) {
          const t = s.tetes.get(projet);
          s.tetes.set(projet, { seq: id, nombre: (t?.nombre ?? 0) + 1 });
          return { seq: id };
        }
        return {};
      },
      async compacter(projet, jusqua, d, partie, total) {
        panne();
        const id = ++s.id;
        s.lignes.push({ projet, id, partie, total, d });
        if (partie === total - 1) {
          s.lignes = s.lignes.filter((x) => !(x.projet === projet && x.id <= jusqua));
          s.tetes.set(projet, { seq: id, nombre: 1 });
        }
      },
    };
  }
}

let n = 0;
const ouverts: Stockage[] = [];
afterEach(async () => { while (ouverts.length) await ouverts.pop()!.fermer(); });

async function appareil(espace: Espace, serveur: ServeurSimule, options?: OptionsMoteur) {
  const s = new Stockage(`synchro-${++n}`);
  ouverts.push(s);
  await s.espacePret;
  const moteur = new MoteurSynchro(espace, serveur.transport(), s.memoireSynchro(), s.sourceSynchro(), options);
  return { s, moteur };
}

/** Signature lisible d'un projet : arbre (texte, fait), pour comparer deux appareils. */
function signature(doc: Y.Doc): string {
  const a = lireArbre(doc);
  const rec = (p: string): string => (a.enfants.get(p) ?? []).map((id) => {
    const x = a.parId.get(id)!;
    return `${x.texte}${x.fait ? '✓' : ''}(${rec(id)})`;
  }).join(',');
  return rec(RACINE);
}

describe('synchro chiffrée (deux appareils simulés)', () => {
  it('l’ordinateur reçoit les projets créés sur l’iPhone, et les modifications reviennent', async () => {
    const espace = await deriverEspace(aleatoire(32));
    const serveur = new ServeurSimule();
    const iphone = await appareil(espace, serveur);
    const ordi = await appareil(espace, serveur);

    const id = await iphone.s.creerProjet({ titre: 'Marée basse', type: 'creatif', couleur: 'orange' });
    const doc = iphone.s.ouvrir(id).doc;
    const ecriture = creerNoeud(doc, RACINE, undefined, { texte: 'Écriture' });
    creerNoeud(doc, ecriture, undefined, { texte: 'Synopsis', tache: true });
    await iphone.moteur.cycle();

    await ordi.moteur.cycle();
    expect(ordi.s.idsProjets()).toEqual([id]);
    const docOrdi = (await ordi.s.sourceSynchro().doc(id));
    expect(signature(docOrdi)).toBe('Écriture(Synopsis())');
    await ordi.s.indexer(id, docOrdi);
    expect((await ordi.s.index.projets.get(id))?.titre).toBe('Marée basse');

    creerNoeud(docOrdi, RACINE, undefined, { texte: 'Tournage' });
    await ordi.moteur.cycle();
    await iphone.moteur.cycle();
    expect(signature(doc)).toBe('Écriture(Synopsis()),Tournage()');
  });

  it('chaque appareil travaille hors ligne, puis tous deux convergent sans perte', async () => {
    const espace = await deriverEspace(aleatoire(32));
    const serveur = new ServeurSimule();
    const iphone = await appareil(espace, serveur);
    const ordi = await appareil(espace, serveur);
    const id = await iphone.s.creerProjet({ titre: 'Mémoire', type: 'pro', couleur: 'lilas' });
    const di = iphone.s.ouvrir(id).doc;
    const redaction = creerNoeud(di, RACINE, undefined, { texte: 'Rédaction' });
    const plan = creerNoeud(di, redaction, undefined, { texte: 'Plan', tache: true });
    await iphone.moteur.cycle();
    await ordi.moteur.cycle();
    const dor = await ordi.s.sourceSynchro().doc(id);

    serveur.enPanne = true; // tout le monde hors ligne
    basculerFait(di, plan);
    creerNoeud(di, redaction, undefined, { texte: 'Chapitre 1' });
    definirTexte(dor, redaction, 'Rédaction finale');
    creerNoeud(dor, RACINE, undefined, { texte: 'Soutenance' });
    const croquis = creerBloc(dor, 'croquis');
    ajouterTrait(dor, croquis, [{ x: 1, y: 1, pression: 0.5 }, { x: 50, y: 50, pression: 0.5 }], 2, 'trait');
    await expect(iphone.moteur.cycle()).rejects.toThrow();
    await expect(ordi.moteur.cycle()).rejects.toThrow();

    serveur.enPanne = false; // retour du réseau
    await iphone.moteur.cycle();
    await ordi.moteur.cycle();
    await iphone.moteur.cycle();
    expect(signature(di)).toBe(signature(dor));
    expect(signature(di)).toBe('Rédaction finale(Plan✓(),Chapitre 1()),Soutenance()');
    expect(Y.encodeStateAsUpdate(di).length).toBeGreaterThan(0);
    expect(di.getMap('blocs').get(croquis)).toBeDefined();
  });

  it('rien n’est perdu si l’app se ferme pendant un envoi', async () => {
    const espace = await deriverEspace(aleatoire(32));
    const serveur = new ServeurSimule();
    const iphone = await appareil(espace, serveur);
    const id = await iphone.s.creerProjet({ titre: 'Coupure', type: 'perso', couleur: 'ocre' });
    await iphone.moteur.cycle();
    const doc = iphone.s.ouvrir(id).doc;
    creerNoeud(doc, RACINE, undefined, { texte: 'Écrit juste avant la coupure' });
    serveur.panneEnvoi = true;
    await expect(iphone.moteur.cycle()).rejects.toThrow();
    serveur.panneEnvoi = false;
    // Nouveau démarrage du moteur (même mémoire locale) : la différence non confirmée part.
    const relance = new MoteurSynchro(espace, serveur.transport(), iphone.s.memoireSynchro(), iphone.s.sourceSynchro());
    await relance.cycle();
    const ordi = await appareil(espace, serveur);
    await ordi.moteur.cycle();
    expect(signature(await ordi.s.sourceSynchro().doc(id))).toBe('Écrit juste avant la coupure()');
  });

  it('compacte au-delà du seuil, découpe les gros blocs, et un nouvel appareil reçoit tout', async () => {
    const espace = await deriverEspace(aleatoire(32));
    const serveur = new ServeurSimule();
    const iphone = await appareil(espace, serveur, { seuilCompactage: 5, partie: 200 });
    const id = await iphone.s.creerProjet({ titre: 'Gros', type: 'idees', couleur: 'ciel' });
    const doc = iphone.s.ouvrir(id).doc;
    for (let i = 0; i < 8; i++) {
      creerNoeud(doc, RACINE, undefined, { texte: `Idée ${i}` });
      await iphone.moteur.cycle();
    }
    const lignesProjet = serveur.lignes.filter((l) => l.projet === id);
    expect(serveur.tetes.get(id)!.nombre).toBeLessThanOrEqual(5);
    expect(lignesProjet.some((l) => l.total > 1)).toBe(true); // blocs découpés en parties
    const ordi = await appareil(espace, serveur);
    await ordi.moteur.cycle();
    expect(lireArbre(await ordi.s.sourceSynchro().doc(id)).parId.size).toBe(8);
  });

  it('le serveur ne lit rien et ne peut rien altérer : un bloc modifié est ignoré', async () => {
    const espace = await deriverEspace(aleatoire(32));
    const serveur = new ServeurSimule();
    const iphone = await appareil(espace, serveur);
    const id = await iphone.s.creerProjet({ titre: 'Secret de fabrication', type: 'perso', couleur: 'rose' });
    creerNoeud(iphone.s.ouvrir(id).doc, RACINE, undefined, { texte: 'Code du portail' });
    await iphone.moteur.cycle();
    const tout = serveur.lignes.map((l) => l.d).join('');
    expect(tout).not.toContain('Secret');
    expect(atob(tout.slice(0, 400).replace(/-/g, '+').replace(/_/g, '/').slice(0, 400))).not.toContain('Secret');

    serveur.altere = (d) => d.slice(0, 30) + (d[30] === 'A' ? 'B' : 'A') + d.slice(31);
    const ordi = await appareil(espace, serveur);
    const bilan = await ordi.moteur.cycle();
    expect(bilan.illisibles).toBeGreaterThan(0);
    expect(bilan.recus).toBe(0);

    // Un autre espace (autre secret) ne déchiffre rien non plus.
    serveur.altere = null;
    const intrus = await appareil(await deriverEspace(aleatoire(32)), serveur);
    expect((await intrus.moteur.cycle()).recus).toBe(0);
  });

  it('une suppression faite sur un appareil disparaît sur l’autre', async () => {
    const espace = await deriverEspace(aleatoire(32));
    const serveur = new ServeurSimule();
    const a = await appareil(espace, serveur);
    const b = await appareil(espace, serveur);
    const id = await a.s.creerProjet({ titre: 'Tri', type: 'perso', couleur: 'vert' });
    const da = a.s.ouvrir(id).doc;
    const x = creerNoeud(da, RACINE, undefined, { texte: 'À jeter' });
    creerNoeud(da, RACINE, undefined, { texte: 'À garder' });
    await a.moteur.cycle();
    await b.moteur.cycle();
    supprimer(da, x);
    await a.moteur.cycle();
    await b.moteur.cycle();
    expect(signature(await b.s.sourceSynchro().doc(id))).toBe('À garder()');
    expect(ID_ESPACE).toBe('espace');
  });
});
