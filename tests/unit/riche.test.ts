import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import * as Y from 'yjs';
import { markdownVersElements, remplirRiche, richeVersMarkdown } from '../../src/echange/riche';
import { texteRiche } from '../../src/search/textes';

function marquesParCaractere(f: Y.XmlFragment): string[] {
  return f.toArray().flatMap((p) => (p as Y.XmlElement).toArray().flatMap((t) =>
    (t as Y.XmlText).toDelta().flatMap((d: { insert: string; attributes?: object }) =>
      [...d.insert].map((c) => `${c}|${Object.keys(d.attributes ?? {}).sort().join(',')}`))));
}

function fragment(md: string): Y.XmlFragment {
  const doc = new Y.Doc();
  const f = doc.getXmlFragment('f');
  remplirRiche(f, md);
  return f;
}

describe('texte riche ↔ Markdown', () => {
  it('structure : titres, listes imbriquées, citation, code, filet, marques, lien, retour forcé', () => {
    const md = [
      '## Intentions',
      'Un _film_ **court**, ~~long~~, `code` et [un lien](https://exemple.fr/a_b).',
      '- Premier\n- Second\n  - Sous-point\n- Troisième',
      '1. Un\n2. Deux',
      '> Citation\n> sur deux lignes',
      '```ts\nconst a = 1;\n```',
      '***',
      'Ligne\\\nsuivante',
    ].join('\n\n');
    const f = fragment(md);
    expect(f.toArray().map((e) => (e as Y.XmlElement).nodeName)).toEqual(
      ['heading', 'paragraph', 'bulletList', 'orderedList', 'blockquote', 'codeBlock', 'horizontalRule', 'paragraph']);
    const p = f.get(1) as Y.XmlElement;
    const delta = (p.get(0) as Y.XmlText).toDelta() as { insert: string; attributes?: Record<string, unknown> }[];
    expect(delta.find((d) => d.insert === 'film')?.attributes).toEqual({ italic: {} });
    expect(delta.find((d) => d.insert === 'un lien')?.attributes).toEqual({ link: { href: 'https://exemple.fr/a_b' } });
    expect((f.get(7) as Y.XmlElement).toArray().map((e) => (e instanceof Y.XmlElement ? e.nodeName : 'texte'))).toEqual(['texte', 'hardBreak', 'texte']);
    expect(richeVersMarkdown(f)).toBe(md.replace('Citation\n> sur deux lignes', 'Citation sur deux lignes'));
  });

  it('propriété : texte arbitraire (caractères spéciaux compris) sans perte, en un aller-retour', () => {
    const mot = fc.string({ minLength: 1, maxLength: 12 }).filter((s) => !/[\n\r]/.test(s) && s.trim() === s && s.length > 0);
    const marque = fc.constantFrom('', 'bold', 'italic', 'strike', 'code');
    fc.assert(fc.property(fc.array(fc.array(fc.tuple(mot, marque), { minLength: 1, maxLength: 4 }), { minLength: 1, maxLength: 4 }), (paras) => {
      const doc = new Y.Doc();
      const f = doc.getXmlFragment('f');
      f.insert(0, paras.map((runs) => {
        const el = new Y.XmlElement('paragraph');
        const t = new Y.XmlText();
        t.applyDelta(runs.map(([m, k], i) => ({ insert: (i ? ' ' : '') + (k === 'code' ? m.replace(/`/g, '') || 'x' : m), ...(k ? { attributes: { [k]: {} } } : {}) })));
        el.insert(0, [t]);
        return el;
      }));
      const relire = (md: string) => { const g = new Y.Doc().getXmlFragment('f'); g.insert(0, markdownVersElements(md)); return g; };
      const md = richeVersMarkdown(f);
      const f2 = relire(md);
      // Même texte, mêmes marques caractère par caractère ; Markdown stable dès le second passage.
      expect(texteRiche(f2)).toBe(texteRiche(f));
      expect(marquesParCaractere(f2)).toEqual(marquesParCaractere(f));
      expect(richeVersMarkdown(relire(richeVersMarkdown(f2)))).toBe(richeVersMarkdown(f2));
    }), { numRuns: 300 });
  });
});
