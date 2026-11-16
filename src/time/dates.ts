import { TZDate } from '@date-fns/tz';
import { differenceInCalendarDays } from 'date-fns';
import type { DateLocale } from '../data/schema';

export const FUSEAU = 'Europe/Paris';

const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const JOURS_LONGS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

const deux = (n: number) => String(n).padStart(2, '0');

interface Parties { annee: number; mois: number; jour: number; heure: number | null; minute: number | null }

export function decouper(d: DateLocale): Parties {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(d);
  if (!m) throw new Error(`Date invalide : ${d}`);
  return {
    annee: +m[1]!, mois: +m[2]!, jour: +m[3]!,
    heure: m[4] !== undefined ? +m[4] : null,
    minute: m[5] !== undefined ? +m[5] : null,
  };
}

/** Instant (ms) d'une date locale de Paris ; sans heure : minuit. */
export function instant(d: DateLocale): number {
  const p = decouper(d);
  return new TZDate(p.annee, p.mois - 1, p.jour, p.heure ?? 0, p.minute ?? 0, FUSEAU).getTime();
}

/** Date du jour à Paris, au format `AAAA-MM-JJ`. */
export function aujourdhui(maintenant: number = Date.now()): DateLocale {
  const t = new TZDate(maintenant, FUSEAU);
  return `${t.getFullYear()}-${deux(t.getMonth() + 1)}-${deux(t.getDate())}`;
}

/** Jours calendaires (Paris) entre aujourd'hui et `d` : 3 = dans 3 jours, -2 = en retard de 2 jours. */
export function joursRestants(d: DateLocale, maintenant: number = Date.now()): number {
  const p = decouper(d);
  const cible = new TZDate(p.annee, p.mois - 1, p.jour, FUSEAU);
  return differenceInCalendarDays(cible, new TZDate(maintenant, FUSEAU));
}

/** « J-3 », « J-0 », « J+2 ». */
export function compteARebours(d: DateLocale, maintenant: number = Date.now()): string {
  const j = joursRestants(d, maintenant);
  return j >= 0 ? `J-${j}` : `J+${-j}`;
}

export function enRetard(d: DateLocale, maintenant: number = Date.now()): boolean {
  const p = decouper(d);
  if (p.heure === null) return joursRestants(d, maintenant) < 0;
  return instant(d) < maintenant;
}

function jourSemaine(p: Parties): number {
  return new TZDate(p.annee, p.mois - 1, p.jour, 12, FUSEAU).getDay();
}

/** « 19.11 », ou « 26.02.27 » si l'année n'est pas l'année en cours. */
export function dateCourte(d: DateLocale, maintenant: number = Date.now()): string {
  const p = decouper(d);
  const annee = +aujourdhui(maintenant).slice(0, 4);
  const base = `${deux(p.jour)}.${deux(p.mois)}`;
  return p.annee === annee ? base : `${base}.${deux(p.annee % 100)}`;
}

/** « jeu. 19.11 », avec l'heure si elle existe : « jeu. 19.11 14:30 ». */
export function dateJour(d: DateLocale, maintenant: number = Date.now()): string {
  const p = decouper(d);
  const h = p.heure !== null ? ` ${deux(p.heure)}:${deux(p.minute ?? 0)}` : '';
  return `${JOURS[jourSemaine(p)]} ${dateCourte(d, maintenant)}${h}`;
}

/** « LUN 16.11 » pour l'en-tête de l'accueil. */
export function enteteDuJour(maintenant: number = Date.now()): string {
  const d = aujourdhui(maintenant);
  const p = decouper(d);
  return `${JOURS[jourSemaine(p)]!.replace('.', '').toUpperCase()} ${dateCourte(d, maintenant)}`;
}

/** Forme lue par VoiceOver : « jeudi 19 novembre ». */
export function dateParlee(d: DateLocale): string {
  const p = decouper(d);
  const h = p.heure !== null ? ` à ${p.heure} h ${p.minute ? deux(p.minute) : ''}`.trimEnd() : '';
  return `${JOURS_LONGS[jourSemaine(p)]} ${p.jour} ${MOIS[p.mois - 1]}${h}`;
}

export function joursParles(d: DateLocale, maintenant: number = Date.now()): string {
  const j = joursRestants(d, maintenant);
  if (j === 0) return "aujourd'hui";
  if (j === 1) return 'demain';
  if (j > 1) return `dans ${j} jours`;
  return j === -1 ? 'en retard de 1 jour' : `en retard de ${-j} jours`;
}

/** Comparaison chronologique de deux dates locales (sans heure = début de journée). */
export function comparerDates(a: DateLocale, b: DateLocale): number {
  return instant(a) - instant(b);
}
