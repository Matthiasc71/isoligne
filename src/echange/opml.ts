import { COULEURS, type CleCouleur, type Rappel, type StatutProjet, type TypeProjet } from '../data/schema';
import { noeudVide, type LienEch, type NoeudEch, type ProjetEch } from './projet';

/**
 * OPML 2.0 : une ligne (`outline`) par branche. Note en `_note` (convention
 * des outils d'outline), tâche faite en `_complete` ; le reste dans l'espace
 * de noms `isoligne:`. Seule l'arborescence (et ses liens libres) y figure.
 */

const NS = 'https://github.com/Matthiasc71/isoligne';
const RAPPELS: readonly Rappel[] = ['J-7', 'J-1', 'J9h', 'H-1'];
const DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;

// Caractères interdits en XML 1.0 (contrôle, surrogats isolés) : retirés.
const XML_INTERDIT = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
const attr = (v: string) => v.replace(XML_INTERDIT, '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/\n/g, '&#10;').replace(/\r/g, '&#13;').replace(/\t/g, '&#9;');

export function versOpml(p: ProjetEch): string {
  const out: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<opml version="2.0" xmlns:isoligne="${NS}">`,
    '  <head>',
    `    <title>${attr(p.titre)}</title>`,
    `    <isoligne:projet type="${p.type}" couleur="${p.couleur}" statut="${p.statut}" epingle="${p.epingle}"${p.fin ? ` fin="${p.fin}"` : ''} liens="${attr(JSON.stringify(p.liens))}"/>`,
    '  </head>',
    '  <body>',
  ];
  const ligne = (n: NoeudEch, prof: number) => {
    const r = '  '.repeat(prof + 2);
    const a = [`text="${attr(n.texte)}"`];
    if (n.note) a.push(`_note="${attr(n.note)}"`);
    if (n.tache) a.push(`isoligne:tache="true"`);
    if (n.fait) a.push(`_complete="true"`);
    if (n.echeance) a.push(`isoligne:echeance="${n.echeance}"`);
    if (n.couleur) a.push(`isoligne:couleur="${n.couleur}"`);
    if (n.rappels) a.push(`isoligne:rappels="${n.rappels.join(',')}"`);
    if (n.perso) a.push(`isoligne:perso="${n.perso}"`);
    if (n.replie) a.push(`isoligne:replie="true"`);
    if (n.enfants.length === 0) { out.push(`${r}<outline ${a.join(' ')}/>`); return; }
    out.push(`${r}<outline ${a.join(' ')}>`);
    for (const e of n.enfants) ligne(e, prof + 1);
    out.push(`${r}</outline>`);
  };
  for (const n of p.arbre) ligne(n, 0);
  out.push('  </body>', '</opml>');
  return `${out.join('\n')}\n`;
}

/** OPML (le nôtre ou celui d'un autre outil) → projet. */
export function depuisOpml(xml: string, titreParDefaut = 'Import'): ProjetEch {
  const d = new DOMParser().parseFromString(xml, 'application/xml');
  if (d.getElementsByTagName('parsererror').length || d.documentElement.nodeName !== 'opml') throw new Error('OPML invalide');
  const p: ProjetEch = { titre: titreParDefaut, type: 'idees', couleur: 'craie', statut: 'en-cours', epingle: false, fin: null, arbre: [], blocs: [{ type: 'arbre' }], liens: [] };
  const titre = d.querySelector('head > title')?.textContent?.trim();
  if (titre) p.titre = titre;
  const projet = d.getElementsByTagNameNS(NS, 'projet')[0];
  if (projet) {
    p.type = (projet.getAttribute('type') as TypeProjet | null) ?? p.type;
    const c = projet.getAttribute('couleur');
    if (c && (COULEURS as readonly string[]).includes(c)) p.couleur = c as CleCouleur;
    p.statut = (projet.getAttribute('statut') as StatutProjet | null) ?? p.statut;
    p.epingle = projet.getAttribute('epingle') === 'true';
    const fin = projet.getAttribute('fin');
    p.fin = fin && DATE.test(fin) ? fin : null;
    try { p.liens = JSON.parse(projet.getAttribute('liens') ?? '[]') as LienEch[]; } catch { p.liens = []; }
  }
  const ns = (el: Element, nom: string) => el.getAttributeNS(NS, nom);
  const lire = (el: Element): NoeudEch => {
    const rappels = ns(el, 'rappels');
    const date = ns(el, 'echeance');
    const perso = ns(el, 'perso');
    const couleur = ns(el, 'couleur');
    const complete = el.getAttribute('_complete') === 'true';
    return noeudVide(el.getAttribute('text') ?? el.getAttribute('title') ?? '', {
      note: el.getAttribute('_note') ?? '',
      tache: ns(el, 'tache') === 'true' || complete,
      fait: complete,
      echeance: date && DATE.test(date) ? date : null,
      couleur: couleur && (COULEURS as readonly string[]).includes(couleur) ? (couleur as CleCouleur) : null,
      rappels: rappels === null ? null : rappels.split(',').filter((x): x is Rappel => (RAPPELS as string[]).includes(x)),
      perso: perso && DATE.test(perso) ? perso : null,
      replie: ns(el, 'replie') === 'true',
      enfants: [...el.children].filter((e) => e.nodeName === 'outline').map(lire),
    });
  };
  const body = d.getElementsByTagName('body')[0];
  p.arbre = body ? [...body.children].filter((e) => e.nodeName === 'outline').map(lire) : [];
  return p;
}
