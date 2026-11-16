export type Theme = 'auto' | 'clair' | 'sombre';

const FONDS = { clair: '#EEF1EC', sombre: '#0F2D52' } as const;

/** Applique le thème : `data-theme` sur <html> et couleur de la barre d'état. */
export function appliquerTheme(theme: Theme): void {
  const html = document.documentElement;
  if (theme === 'auto') html.removeAttribute('data-theme');
  else html.setAttribute('data-theme', theme);
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  metas.forEach((m) => {
    if (theme === 'auto') {
      m.content = m.media.includes('dark') ? FONDS.sombre : FONDS.clair;
    } else {
      m.content = FONDS[theme];
    }
  });
}
