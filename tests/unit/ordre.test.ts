import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { cleInsertion, comparerOrdre, type Ordonnable } from '../../src/tree/ordre';

describe('indexation fractionnaire', () => {
  it('insère toujours à la position demandée', () => {
    fc.assert(fc.property(fc.array(fc.nat(50), { maxLength: 60 }), (positions) => {
      let liste: Ordonnable[] = [];
      positions.forEach((pos, k) => {
        const i = pos % (liste.length + 1);
        const { cle, recles } = cleInsertion(liste, i);
        if (recles) liste = liste.map((f) => ({ ...f, ordre: recles.get(f.id)! }));
        const attendu = [...liste];
        attendu.splice(i, 0, { id: `n${k}`, ordre: cle });
        liste = [...liste, { id: `n${k}`, ordre: cle }].sort(comparerOrdre);
        expect(liste.map((f) => f.id)).toEqual(attendu.map((f) => f.id));
      });
    }));
  });

  it('renumérote une fratrie ex aequo (insertions concurrentes)', () => {
    const freres = [{ id: 'a', ordre: 'a0' }, { id: 'b', ordre: 'a0' }];
    const { cle, recles } = cleInsertion(freres, 1);
    expect(recles).toBeDefined();
    const liste = [...freres.map((f) => ({ ...f, ordre: recles!.get(f.id)! })), { id: 'c', ordre: cle }].sort(comparerOrdre);
    expect(liste.map((f) => f.id)).toEqual(['a', 'c', 'b']);
  });
});
