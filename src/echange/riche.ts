import * as Y from 'yjs';

/**
 * Texte riche (fragments TipTap / y-prosemirror) ↔ Markdown.
 * Couvre StarterKit tel que l'éditeur l'utilise : paragraphes, titres 2 et 3,
 * listes, citations, code, filets, retours à la ligne ; gras, italique, barré,
 * code, liens.
 */

type Marques = Record<string, Record<string, unknown> | null | undefined>;
interface Op { insert: string | object; attributes?: Marques }

const nomMarque = (n: string) => n.replace(/--[a-zA-Z0-9+/=]{8}$/, '');

function echapper(t: string): string {
  return t.replace(/([\\`*_~[\]<>])/g, '\\$1');
}

function enLigne(el: Y.XmlElement): string {
  let s = '';
  for (const enfant of el.toArray()) {
    if (enfant instanceof Y.XmlText) {
      for (const op of enfant.toDelta() as Op[]) {
        if (typeof op.insert !== 'string') continue;
        const m = new Set(Object.keys(op.attributes ?? {}).map(nomMarque));
        const lienAttr = Object.entries(op.attributes ?? {}).find(([k]) => nomMarque(k) === 'link')?.[1] as { href?: string } | undefined;
        let t = m.has('code') ? `\`${op.insert.replace(/`/g, '')}\`` : echapper(op.insert);
        if (m.has('bold')) t = `**${t}**`;
        // Italique en « _ » : « * » collé à « ** » serait ambigu (« *a*** b** »).
        if (m.has('italic')) t = `_${t}_`;
        if (m.has('strike')) t = `~~${t}~~`;
        if (lienAttr?.href) t = `[${t}](${lienAttr.href.replace(/[()\s]/g, encodeURIComponent)})`;
        s += t;
      }
    } else if (enfant instanceof Y.XmlElement && enfant.nodeName === 'hardBreak') {
      s += '\\\n';
    }
  }
  return s;
}

function enBloc(el: Y.XmlElement): string {
  const enfants = el.toArray().filter((e): e is Y.XmlElement => e instanceof Y.XmlElement);
  switch (el.nodeName) {
    case 'heading': return `${'#'.repeat(Math.min(6, Math.max(2, Number(el.getAttribute('level')) || 2)))} ${enLigne(el)}`;
    case 'horizontalRule': return '***';
    case 'codeBlock': {
      const texte = el.toArray().map((e) => (e instanceof Y.XmlText ? e.toString() : '')).join('');
      return `\`\`\`${(el.getAttribute('language') as string | undefined) ?? ''}\n${texte}\n\`\`\``;
    }
    case 'blockquote': return enfants.map(enBloc).join('\n\n').split('\n').map((l) => (l ? `> ${l}` : '>')).join('\n');
    case 'bulletList':
    case 'orderedList':
      return enfants.map((li, i) => {
        const puce = el.nodeName === 'orderedList' ? `${i + 1}. ` : '- ';
        const corps = li.toArray().filter((e): e is Y.XmlElement => e instanceof Y.XmlElement).map(enBloc).join('\n');
        return corps.split('\n').map((l, j) => (j === 0 ? puce + l : `${' '.repeat(puce.length)}${l}`)).join('\n');
      }).join('\n');
    default: {
      // Un paragraphe qui commence comme un titre, une liste, une citation ou un filet reste un paragraphe.
      const t = enLigne(el);
      if (t.trim() === '') return '';
      return /^(#|>|[-+] |\d+\. |```|---|___)/.test(t) ? `\\${t}` : t;
    }
  }
}

export function richeVersMarkdown(f: Y.XmlFragment): string {
  // Un paragraphe vide (ou fait d'espaces) n'a pas d'équivalent Markdown : il est omis.
  return f.toArray().filter((e): e is Y.XmlElement => e instanceof Y.XmlElement).map(enBloc).filter((b) => b.trim() !== '').join('\n\n');
}

// ───────────────────────────── Markdown → texte riche ─────────────────────────────

/** Analyse en ligne : `code`, **gras**, *italique*, ~~barré~~, [lien](adresse), échappements. */
export function analyserLigne(s: string): Op[] {
  const ops: Op[] = [];
  const pousser = (t: string, a: Marques) => {
    if (!t) return;
    const der = ops[ops.length - 1];
    if (der && typeof der.insert === 'string' && JSON.stringify(der.attributes ?? {}) === JSON.stringify(a)) der.insert += t;
    else ops.push(Object.keys(a).length ? { insert: t, attributes: a } : { insert: t });
  };
  const parcourir = (t: string, a: Marques) => {
    let i = 0;
    let tampon = '';
    const vider = () => { pousser(tampon, a); tampon = ''; };
    while (i < t.length) {
      const c = t[i]!;
      if (c === '\\' && i + 1 < t.length) {
        if (t[i + 1] === '\n') { vider(); ops.push({ insert: { hardBreak: true } }); i += 2; continue; }
        tampon += t[i + 1]; i += 2; continue;
      }
      if (c === '`') {
        const f = t.indexOf('`', i + 1);
        if (f > i) { vider(); pousser(t.slice(i + 1, f), { ...a, code: {} }); i = f + 1; continue; }
      }
      const delim = t.startsWith('**', i) ? '**' : t.startsWith('~~', i) ? '~~' : c === '*' || c === '_' ? c : null;
      if (delim) {
        const f = fermeture(t, i + delim.length, delim);
        if (f > i + delim.length) {
          vider();
          parcourir(t.slice(i + delim.length, f), { ...a, [delim === '**' ? 'bold' : delim === '~~' ? 'strike' : 'italic']: {} });
          i = f + delim.length;
          continue;
        }
      }
      if (c === '[') {
        const m = /^\[((?:\\.|[^\]\\])*)\]\(([^()\s]*)\)/.exec(t.slice(i));
        if (m) {
          vider();
          parcourir(m[1]!, { ...a, link: { href: decodeURIComponent(m[2]!) } });
          i += m[0].length;
          continue;
        }
      }
      tampon += c;
      i++;
    }
    vider();
  };
  parcourir(s, {});
  return ops;
}

/** Fermeture d'un délimiteur, en sautant les caractères échappés (et `*` doublé pour l'italique). */
function fermeture(t: string, depuis: number, d: string): number {
  for (let j = depuis; j < t.length; j++) {
    if (t[j] === '\\') { j++; continue; }
    // Un délimiteur à l'intérieur d'un morceau de code ne compte pas.
    if (t[j] === '`') { const f = t.indexOf('`', j + 1); if (f > j) { j = f; continue; } }
    if (t.startsWith(d, j)) {
      if (d === '*' && t[j + 1] === '*') { const f = fermeture(t, j + 2, '**'); if (f < 0) return -1; j = f + 1; continue; }
      return j;
    }
  }
  return -1;
}

function elementLigne(nom: string, texte: string, attrs: Record<string, unknown> = {}): Y.XmlElement {
  const el = new Y.XmlElement(nom);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v as never);
  let t: Y.XmlText | null = null;
  const contenu: (Y.XmlText | Y.XmlElement)[] = [];
  const deltas: Op[][] = [[]];
  for (const op of analyserLigne(texte)) {
    if (typeof op.insert === 'string') deltas[deltas.length - 1]!.push(op);
    else deltas.push([]);
  }
  deltas.forEach((d, i) => {
    if (i > 0) contenu.push(new Y.XmlElement('hardBreak'));
    if (d.length) { t = new Y.XmlText(); t.applyDelta(d); contenu.push(t); }
  });
  el.insert(0, contenu);
  return el;
}

interface Ligne { retrait: number; texte: string }

/** Markdown → éléments de bloc (pour un fragment vide). */
export function markdownVersElements(md: string): Y.XmlElement[] {
  const lignes = md.replace(/\r\n?/g, '\n').split('\n');
  const res: Y.XmlElement[] = [];
  let i = 0;
  const vide = (l: string | undefined) => l === undefined || l.trim() === '';
  while (i < lignes.length) {
    const l = lignes[i]!;
    if (vide(l)) { i++; continue; }
    const fence = /^```(.*)$/.exec(l);
    if (fence) {
      const corps: string[] = [];
      i++;
      while (i < lignes.length && !/^```\s*$/.test(lignes[i]!)) corps.push(lignes[i++]!);
      i++;
      const el = new Y.XmlElement('codeBlock');
      if (fence[1]) el.setAttribute('language', fence[1].trim());
      const t = new Y.XmlText();
      t.insert(0, corps.join('\n'));
      el.insert(0, [t]);
      res.push(el);
      continue;
    }
    const titre = /^(#{2,6})\s+(.*)$/.exec(l);
    if (titre) { res.push(elementLigne('heading', titre[2]!, { level: Math.min(3, titre[1]!.length) })); i++; continue; }
    if (/^(\*\*\*|---|___)\s*$/.test(l)) { res.push(new Y.XmlElement('horizontalRule')); i++; continue; }
    if (l.startsWith('>')) {
      const corps: string[] = [];
      while (i < lignes.length && lignes[i]!.startsWith('>')) corps.push(lignes[i++]!.replace(/^> ?/, ''));
      const el = new Y.XmlElement('blockquote');
      el.insert(0, markdownVersElements(corps.join('\n')));
      res.push(el);
      continue;
    }
    if (/^(- |\d+\. )/.test(l)) {
      const bloc: Ligne[] = [];
      while (i < lignes.length && !vide(lignes[i]) && (/^(- |\d+\. )/.test(lignes[i]!) || /^ {2,}/.test(lignes[i]!))) {
        const m = /^( *)(.*)$/.exec(lignes[i++]!)!;
        bloc.push({ retrait: m[1]!.length, texte: m[2]! });
      }
      res.push(liste(bloc));
      continue;
    }
    const para: string[] = [];
    while (i < lignes.length && !vide(lignes[i]) && !/^(#{2,6}\s|>|```|- |\d+\. )/.test(lignes[i]!)) para.push(lignes[i++]!);
    // Retour à la ligne simple = espace ; « \ » en fin de ligne = retour forcé.
    res.push(elementLigne('paragraph', para.join('\n').replace(/(?<!\\)\n/g, ' ')));
  }
  return res;
}

function liste(lignes: Ligne[]): Y.XmlElement {
  const ordonnee = /^\d+\. /.test(lignes[0]!.texte);
  const el = new Y.XmlElement(ordonnee ? 'orderedList' : 'bulletList');
  const items: Y.XmlElement[] = [];
  let i = 0;
  const base = lignes[0]!.retrait;
  while (i < lignes.length) {
    const m = /^(- |\d+\. )(.*)$/.exec(lignes[i]!.texte)!;
    const largeur = m[1]!.length;
    const corps: string[] = [m[2]!];
    i++;
    while (i < lignes.length && lignes[i]!.retrait >= base + largeur) {
      corps.push(`${' '.repeat(lignes[i]!.retrait - base - largeur)}${lignes[i]!.texte}`);
      i++;
    }
    const li = new Y.XmlElement('listItem');
    li.insert(0, markdownVersElements(corps.join('\n')));
    items.push(li);
  }
  el.insert(0, items);
  return el;
}

export function remplirRiche(f: Y.XmlFragment, md: string): void {
  if (f.length) f.delete(0, f.length);
  f.insert(0, markdownVersElements(md));
}
