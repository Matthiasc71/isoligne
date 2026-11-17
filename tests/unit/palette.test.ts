import { describe, expect, it } from 'vitest';
import { correspond } from '../../src/app/Palette';

describe('filtre de la palette', () => {
  it('début de mot, accents, une faute légère (inversion comprise)', () => {
    expect(correspond('Calendrier', 'cal')).toBe(true);
    expect(correspond('Calendrier', 'calendir')).toBe(true);
    expect(correspond('Calendrier', 'calandrier')).toBe(true);
    expect(correspond('Réglages', 'reglage')).toBe(true);
    expect(correspond('Nouveau projet', 'nouv proj')).toBe(true);
    expect(correspond('Exporter en Markdown', 'markdwn')).toBe(true);
    expect(correspond('Calendrier', 'cxlxndrier')).toBe(false);
    expect(correspond('Thème sombre', 'clair')).toBe(false);
  });
});
