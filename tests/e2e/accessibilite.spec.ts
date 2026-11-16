import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { creerProjet } from './aide';

/** Contrôle automatique WCAG 2.2 AA (axe-core) et taille des cibles tactiles, dans les deux thèmes. */
for (const mode of ['dark', 'light'] as const) {
  test(`accessibilité en mode ${mode === 'dark' ? 'sombre' : 'clair'}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: mode, reducedMotion: 'reduce' });
    await page.goto('./');
    await creerProjet(page, 'Contrôle');
    const premiere = page.getByLabel('Première idée');
    await premiere.fill('Branche');
    await premiere.press('Enter');
    await page.keyboard.press('Escape');

    const verifier = async (ecran: string) => {
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      const lisible = r.violations.map((v) => `${ecran} · ${v.id} : ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);
      expect(lisible).toEqual([]);
      // Cibles tactiles : au moins 44 × 44 px sur iPhone (24 px minimum WCAG partout).
      const minimum = test.info().project.name.startsWith('iphone') ? 44 : 24;
      const petites = await page.evaluate((min) => [...document.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [role="checkbox"]')]
        .filter((el) => el.offsetParent !== null && !el.classList.contains('visuellement-cache') && !el.closest('.visuellement-cache') && !el.classList.contains('date-cachee'))
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ el, r }) => r.width > 0 && (r.height < min || r.width < min) && !(el.tagName === 'TEXTAREA' || el.tagName === 'INPUT'))
        .map(({ el, r }) => `${el.tagName.toLowerCase()} "${el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 20)}" ${Math.round(r.width)}×${Math.round(r.height)}`), minimum);
      expect(petites, `${ecran} : cibles trop petites`).toEqual([]);
    };

    await verifier('projet');
    await page.locator('.projet-titre').click();
    await verifier('cartouche');
    await page.locator('.projet-titre').click();
    await page.getByRole('tree').getByRole('button', { name: /^1\b/ }).click();
    await verifier('panneau');
    await page.getByRole('dialog').getByRole('button', { name: 'Fermer' }).click();
    if (test.info().project.name.startsWith('iphone')) {
      await page.getByRole('tab', { name: 'Graphe' }).click();
      await page.locator('.react-flow__node').first().waitFor();
      await verifier('graphe');
      await page.getByRole('button', { name: 'Retour à la page' }).click();
    }
    await page.goto('./#/');
    await verifier('accueil');
  });
}
