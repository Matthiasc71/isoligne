import { COULEURS, type CleCouleur, type DateLocale, type Rappel, type StatutProjet, type TypeProjet } from '../data/schema';
import type { Trait } from '../media/croquis';
import { noeudVide, type BlocEch, type LienEch, type NoeudEch, type ProjetEch } from './projet';

/**
 * Markdown d'un projet, lisible tel quel. Ce qui n'a pas d'équivalent Markdown
 * (type, statut, rappels, tracés, liens libres) va dans des commentaires HTML,
 * que les lecteurs Markdown n'affichent pas. Les blocs sont séparés par des
 * repères `<!-- bloc … -->`.
 */

const RAPPELS: readonly Rappel[] = ['J-7', 'J-1', 'J9h', 'H-1'];
const DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;

/** JSON sûr dans un commentaire HTML (jamais de « --> »). */
const jsonCommentaire = (v: unknown) => JSON.stringify(v).replace(/--/g, '-\\u002d');

/** Texte d'une ligne : barre oblique inverse, retours, et caractères qui ouvrent une métadonnée. */
export function echapperLigne(t: string): string {
  return t.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '').replace(/([@{<[])/g, '\\$1');
}
export function lireLigne(t: string): string {
  return t.replace(/\\(n|.)/g, (_, c: string) => (c === 'n' ? '\n' : c));
}

function suffixes(n: { echeance?: DateLocale | null; couleur?: CleCouleur | null; rappels: Rappel[] | null; perso: DateLocale | null; replie?: boolean }): string {
  let s = '';
  if (n.echeance) s += ` @${n.echeance}`;
  if (n.couleur) s += ` {${n.couleur}}`;
  const meta: string[] = [];
  if (n.rappels) meta.push(`rappels:${n.rappels.join(',')}`);
  if (n.perso) meta.push(`perso:${n.perso}`);
  if (n.replie) meta.push('replie');
  if (meta.length) s += ` <!-- ${meta.join(' ')} -->`;
  return s;
}

function caseTache(tache: boolean, fait: boolean): string {
  return tache ? (fait ? '[x] ' : '[ ] ') : '';
}

export function versMarkdown(p: ProjetEch): string {
  const out: string[] = [`# ${p.titre.replace(/\n/g, ' ')}`, ''];
  out.push(`<!-- isoligne ${jsonCommentaire({ version: 1, type: p.type, couleur: p.couleur, statut: p.statut, epingle: p.epingle, fin: p.fin })} -->`, '');

  const noeud = (n: NoeudEch, prof: number) => {
    const r = '  '.repeat(prof);
    out.push(`${r}- ${caseTache(n.tache, n.fait)}${echapperLigne(n.texte)}${suffixes(n)}`);
    if (n.note) {
      out.push(`${r}  <!-- note -->`);
      for (const l of n.note.split('\n')) out.push(`${r}  >${l ? ` ${l}` : ''}`);
    }
    for (const e of n.enfants) noeud(e, prof + 1);
  };

  for (const b of p.blocs) {
    switch (b.type) {
      case 'arbre':
        out.push('<!-- arborescence -->');
        for (const n of p.arbre) noeud(n, 0);
        break;
      case 'texte': out.push('<!-- bloc texte -->', b.md); break;
      case 'echeance':
        out.push('<!-- bloc echeance -->', `- ${caseTache(true, b.fait)}${echapperLigne(b.titre)}${suffixes({ echeance: b.date, rappels: b.rappels, perso: b.perso })}`);
        break;
      case 'separateur': out.push('<!-- bloc separateur -->', '---'); break;
      case 'lien':
        out.push(`<!-- bloc lien ${jsonCommentaire({ site: b.site, description: b.description })} -->`,
          `[${echapperLigne(b.titre || b.url).replace(/\]/g, '\\]')}](${b.url.replace(/[()\s]/g, encodeURIComponent)})`);
        break;
      case 'croquis':
        out.push(`<!-- bloc croquis ${jsonCommentaire({ legende: b.legende, couverture: b.couverture, traits: b.traits })} -->`,
          `![${echapperLigne(b.legende || 'Croquis').replace(/\]/g, '\\]')}](croquis)`);
        break;
    }
    out.push('');
  }
  if (p.liens.length) out.push(`<!-- liens ${jsonCommentaire(p.liens)} -->`, '');
  return `${out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;
}

// ───────────────────────────── Lecture ─────────────────────────────

interface Analyse { texte: string; tache: boolean; fait: boolean; echeance: DateLocale | null; couleur: CleCouleur | null; rappels: Rappel[] | null; perso: DateLocale | null; replie: boolean }

/** Une ligne de liste : case, texte, puis suffixes (date, couleur, métadonnées), de la fin vers le début. */
function analyserElement(brut: string): Analyse {
  let s = brut;
  const a: Analyse = { texte: '', tache: false, fait: false, echeance: null, couleur: null, rappels: null, perso: null, replie: false };
  const caseM = /^\[( |x|X)\] /.exec(s);
  if (caseM) { a.tache = true; a.fait = caseM[1] !== ' '; s = s.slice(caseM[0].length); }
  const meta = / <!-- (.*?) -->$/.exec(s);
  if (meta) {
    s = s.slice(0, meta.index);
    for (const m of meta[1]!.split(' ')) {
      if (m.startsWith('rappels:')) a.rappels = m.slice(8).split(',').filter((x): x is Rappel => (RAPPELS as string[]).includes(x));
      else if (m.startsWith('perso:') && DATE.test(m.slice(6))) a.perso = m.slice(6);
      else if (m === 'replie') a.replie = true;
    }
  }
  const coul = / \{([a-z-]+)\}$/.exec(s);
  if (coul && (COULEURS as readonly string[]).includes(coul[1]!)) { a.couleur = coul[1] as CleCouleur; s = s.slice(0, coul.index); }
  const date = / @(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2})?)$/.exec(s);
  if (date) { a.echeance = date[1]!; s = s.slice(0, date.index); }
  a.texte = lireLigne(s);
  return a;
}

const PUCE = /^( *)[-*+] (.*)$/;

/** Arborescence depuis des lignes de liste (retraits de 2 ou 4 espaces, tolérés). */
function lireArbreMd(lignes: string[]): NoeudEch[] {
  const racine: NoeudEch[] = [];
  const pile: { retrait: number; n: NoeudEch }[] = [];
  let i = 0;
  while (i < lignes.length) {
    const l = lignes[i]!;
    const m = PUCE.exec(l);
    if (!m) {
      // Note du nœud précédent : « <!-- note --> » puis des lignes « > ».
      const dernier = pile[pile.length - 1];
      if (dernier && /^ *<!-- note -->$/.test(l)) {
        const note: string[] = [];
        i++;
        while (i < lignes.length && /^ *>/.test(lignes[i]!)) note.push(lignes[i++]!.replace(/^ *> ?/, ''));
        dernier.n.note = note.join('\n');
        continue;
      }
      i++;
      continue;
    }
    const retrait = m[1]!.length;
    const a = analyserElement(m[2]!);
    const n = noeudVide(a.texte, { tache: a.tache, fait: a.fait, echeance: a.echeance, couleur: a.couleur, rappels: a.rappels, perso: a.perso, replie: a.replie });
    while (pile.length && pile[pile.length - 1]!.retrait >= retrait) pile.pop();
    (pile.length ? pile[pile.length - 1]!.n.enfants : racine).push(n);
    pile.push({ retrait, n });
    i++;
  }
  return racine;
}

function lireJsonCommentaire<T>(s: string, defaut: T): T {
  try { return JSON.parse(s) as T; } catch { return defaut; }
}

/** Markdown → projet. Accepte aussi un Markdown quelconque : titre `#`, listes → arborescence, le reste → un bloc texte. */
export function depuisMarkdown(md: string, titreParDefaut = 'Import'): ProjetEch {
  const lignes = md.replace(/\r\n?/g, '\n').split('\n');
  const p: ProjetEch = { titre: titreParDefaut, type: 'idees', couleur: 'craie', statut: 'en-cours', epingle: false, fin: null, arbre: [], blocs: [], liens: [] };
  let i = 0;
  const titre = lignes.findIndex((l) => /^# /.test(l));
  if (titre >= 0) { p.titre = lignes[titre]!.slice(2).trim(); lignes.splice(titre, 1); }

  const meta = lignes.findIndex((l) => /^<!-- isoligne \{.*\} -->$/.test(l));
  if (meta >= 0) {
    const m = lireJsonCommentaire<Partial<ProjetEch>>(lignes[meta]!.slice(14, -4), {});
    if (m.type) p.type = m.type as TypeProjet;
    if (m.couleur && (COULEURS as readonly string[]).includes(m.couleur)) p.couleur = m.couleur;
    if (m.statut) p.statut = m.statut as StatutProjet;
    p.epingle = Boolean(m.epingle);
    p.fin = typeof m.fin === 'string' && DATE.test(m.fin) ? m.fin : null;
    lignes.splice(meta, 1);
  }
  const liens = lignes.findIndex((l) => /^<!-- liens \[.*\] -->$/.test(l));
  if (liens >= 0) { p.liens = lireJsonCommentaire<LienEch[]>(lignes[liens]!.slice(11, -4), []); lignes.splice(liens, 1); }

  const reperes = lignes.some((l) => l === '<!-- arborescence -->' || l.startsWith('<!-- bloc '));
  if (!reperes) {
    // Markdown quelconque : les listes de premier niveau deviennent l'arborescence.
    const arbre: string[] = [];
    const reste: string[] = [];
    for (const l of lignes) {
      if (PUCE.test(l) || (arbre.length && /^ {2,}\S/.test(l) && !reste.length)) arbre.push(l.replace(/^(\s*)[*+] /, '$1- ').replace(/^(\s*)- \[ \] /, '$1- [ ] '));
      else if (l.trim() || reste.length) reste.push(l);
    }
    p.arbre = lireArbreMd(arbre);
    p.blocs = [{ type: 'arbre' }];
    const texte = reste.join('\n').trim();
    if (texte) p.blocs.push({ type: 'texte', md: texte });
    return p;
  }

  // Découpe par repères.
  const sections: { entete: string; corps: string[] }[] = [];
  for (; i < lignes.length; i++) {
    const l = lignes[i]!;
    if (l === '<!-- arborescence -->' || l.startsWith('<!-- bloc ')) sections.push({ entete: l, corps: [] });
    else if (sections.length) sections[sections.length - 1]!.corps.push(l);
  }
  for (const s of sections) {
    const corps = s.corps.join('\n').trim();
    if (s.entete === '<!-- arborescence -->') { p.arbre = lireArbreMd(s.corps); p.blocs.push({ type: 'arbre' }); continue; }
    const m = /^<!-- bloc (\w+)(?: (.*))? -->$/.exec(s.entete);
    if (!m) continue;
    const donnees = m[2] ? lireJsonCommentaire<Record<string, unknown>>(m[2], {}) : {};
    switch (m[1]) {
      case 'texte': p.blocs.push({ type: 'texte', md: corps }); break;
      case 'separateur': p.blocs.push({ type: 'separateur' }); break;
      case 'echeance': {
        const l = PUCE.exec(corps.split('\n')[0] ?? '');
        const a = analyserElement(l?.[2] ?? '');
        p.blocs.push({ type: 'echeance', titre: a.texte, date: a.echeance, fait: a.fait, rappels: a.rappels, perso: a.perso });
        break;
      }
      case 'lien': {
        const l = /^\[((?:\\.|[^\]\\])*)\]\((.*)\)$/.exec(corps);
        const url = l ? decodeURIComponent(l[2]!) : '';
        const titre = l ? lireLigne(l[1]!) : '';
        p.blocs.push({ type: 'lien', url, titre: titre === url ? '' : titre, site: String(donnees.site ?? ''), description: String(donnees.description ?? '') });
        break;
      }
      case 'croquis':
        p.blocs.push({
          type: 'croquis', legende: String(donnees.legende ?? ''), couverture: Boolean(donnees.couverture),
          traits: Array.isArray(donnees.traits) ? (donnees.traits as Trait[]) : [],
        });
        break;
    }
  }
  if (!p.blocs.some((b) => b.type === 'arbre')) p.blocs.unshift({ type: 'arbre' });
  return p;
}

export type { BlocEch };
