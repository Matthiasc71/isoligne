import { afterAll, describe, expect, it } from 'vitest';
import { Stockage } from '../../src/data/stockage';
import { ServiceSynchro } from '../../src/sync/service';
import { creerNoeud, lireArbre } from '../../src/tree/arbre';
import { RACINE } from '../../src/data/schema';

/**
 * De bout en bout contre le vrai Worker (wrangler dev + D1 locale) :
 * lancé par `worker/scripts-integration.sh`, ignoré sinon.
 */
const URL_WORKER = process.env.WORKER_URL ?? '';
const ouverts: Stockage[] = [];
afterAll(async () => { for (const s of ouverts) await s.fermer(); });

function appareil(nom: string) {
  const s = new Stockage(`reel-${nom}-${Date.now()}`);
  ouverts.push(s);
  return { s, service: new ServiceSynchro(s, URL_WORKER) };
}

describe.skipIf(!URL_WORKER)('synchro réelle : espace, appairage par code, convergence, restauration', () => {
  it('l’ordinateur rejoint l’espace de l’iPhone, puis tous deux restent synchronisés', async () => {
    const iphone = appareil('iphone');
    await iphone.s.espacePret;
    await iphone.service.creerEspace('iPhone');
    const id = await iphone.s.creerProjet({ titre: 'Marée basse', type: 'creatif', couleur: 'orange' });
    creerNoeud(iphone.s.ouvrir(id).doc, RACINE, undefined, { texte: 'Écriture' });
    expect(await iphone.service.synchroniser()).not.toBeNull();

    // Appairage par code : les deux écrans affichent la même empreinte.
    const ordi = appareil('ordi');
    await ordi.s.espacePret;
    const ouvert = await iphone.service.ouvrirAppairage();
    const reclame = await ordi.service.reclamer(ouvert.code.toLowerCase(), 'Ordinateur');
    expect(await ordi.service.attendre(reclame, 'Ordinateur')).toBe(false); // pas avant la confirmation
    const vu = await iphone.service.suivreAppairage(ouvert);
    expect(vu?.nom).toBe('Ordinateur');
    expect(vu?.empreinte).toBe(reclame.empreinte);
    await iphone.service.confirmerAppairage(ouvert, vu!.pub!);
    expect(await ordi.service.attendre(reclame, 'Ordinateur')).toBe(true);

    await ordi.service.synchroniser();
    expect(ordi.s.idsProjets()).toEqual([id]);
    const docOrdi = await ordi.s.sourceSynchro().doc(id);
    expect([...lireArbre(docOrdi).parId.values()].map((n) => n.texte)).toEqual(['Écriture']);

    creerNoeud(docOrdi, RACINE, undefined, { texte: 'Tournage' });
    await ordi.service.synchroniser();
    await iphone.service.synchroniser();
    expect([...lireArbre(iphone.s.ouvrir(id).doc).parId.values()].map((n) => n.texte).sort()).toEqual(['Tournage', 'Écriture']);
    expect((await iphone.service.appareils()).map((a) => a.nom)).toEqual(['iPhone', 'Ordinateur']);
    expect((await iphone.service.usage())?.octets).toBeGreaterThan(0);

    // Tous les appareils perdus : la clé de secours suffit.
    const cle = (await iphone.service.cleDeSecours())!;
    const neuf = appareil('neuf');
    await neuf.s.espacePret;
    expect(await neuf.service.restaurer('AAAA-BBBB', 'x')).toBe(false);
    expect(await neuf.service.restaurer(cle.toLowerCase(), 'Nouveau téléphone')).toBe(true);
    await neuf.service.synchroniser();
    expect([...lireArbre(await neuf.s.sourceSynchro().doc(id)).parId.values()].length).toBe(2);

    // Révocation : l'ordinateur ne synchronise plus.
    const ordiDistant = (await iphone.service.appareils()).find((a) => a.nom === 'Ordinateur')!;
    await iphone.service.revoquer(ordiDistant.id);
    await ordi.service.synchroniser();
    expect(ordi.service.lireEtat().statut).toBe('revoque');
    for (const x of [iphone, ordi, neuf]) x.service.arreter();
  });
});
