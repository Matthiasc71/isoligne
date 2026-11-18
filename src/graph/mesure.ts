import { definirMesure, type Mesure, type Niveau } from './etiquettes';

/**
 * Mesure réelle des libellés : un élément hors écran, avec les mêmes classes que les
 * nœuds du graphe, donne la largeur exacte du texte une fois les polices chargées.
 */
let sonde: { racine: HTMLElement; spans: Record<Niveau, HTMLElement> } | null = null;
const cache = new Map<string, number>();

function creerSonde() {
  const racine = document.createElement('div');
  racine.setAttribute('aria-hidden', 'true');
  racine.style.cssText = 'position:absolute;left:-10000px;top:0;visibility:hidden;contain:layout style;pointer-events:none';
  const spans = {} as Record<Niveau, HTMLElement>;
  for (const n of [1, 2, 3] as Niveau[]) {
    const conteneur = document.createElement('div');
    conteneur.className = n === 3 ? 'g-n3' : '';
    const span = document.createElement('span');
    span.className = n === 1 ? 'g-libelle-1' : 'g-libelle';
    span.style.cssText = 'display:inline-block;white-space:pre;width:auto;-webkit-line-clamp:none';
    conteneur.append(span);
    racine.append(conteneur);
    spans[n] = span;
  }
  document.body.append(racine);
  return { racine, spans };
}

const mesurer: Mesure = (texte, niveau) => {
  const cle = `${niveau}|${texte}`;
  const connu = cache.get(cle);
  if (connu !== undefined) return connu;
  sonde ??= creerSonde();
  const span = sonde.spans[niveau];
  span.textContent = texte;
  const l = span.getBoundingClientRect().width;
  cache.set(cle, l);
  return l;
};

/** Active la mesure réelle ; la promesse se résout quand les polices sont chargées (les mesures changent). */
export function activerMesure(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  definirMesure(mesurer);
  return (document.fonts?.ready ?? Promise.resolve()).then(() => { cache.clear(); });
}
