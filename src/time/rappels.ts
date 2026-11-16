import { TZDate } from '@date-fns/tz';
import type { DateLocale, Rappel } from '../data/schema';
import { FUSEAU, aujourdhui, dateJour, decouper, instant } from './dates';

/** Rappels posés sur une nouvelle échéance (brief temps, choix du 16.11.2026). */
export const RAPPELS_DEFAUT: readonly Rappel[] = ['J-7', 'J-1', 'J9h'];

let defauts: readonly Rappel[] = RAPPELS_DEFAUT;
export function rappelsParDefaut(): Rappel[] { return [...defauts]; }
export function poserRappelsParDefaut(r: readonly Rappel[]): void { defauts = [...r]; }

/** `null` : jamais réglés → réglages par défaut. */
export function rappelsEffectifs(r: readonly Rappel[] | null | undefined): Rappel[] {
  return r ? [...r] : rappelsParDefaut();
}

export type GenreRappel = Rappel | 'perso';
export interface InstantRappel { genre: GenreRappel; quand: number }

const HEURE_MATIN = 9;

/** 9 h (Paris) le jour `d` décalé de `decalage` jours. */
function matin(d: DateLocale, decalage: number): number {
  const p = decouper(d);
  return new TZDate(p.annee, p.mois - 1, p.jour + decalage, HEURE_MATIN, 0, FUSEAU).getTime();
}

/**
 * Instants des rappels d'une échéance, heure de Paris (heure d'été comprise) :
 * J-7 et J-1 à 9 h, le jour J à 9 h (sauf si l'échéance est plus tôt ce jour-là),
 * 1 h avant (seulement si l'échéance a une heure), et un rappel personnalisé.
 */
export function instantsRappels(date: DateLocale, rappels: readonly Rappel[], perso: DateLocale | null = null): InstantRappel[] {
  const p = decouper(date);
  const res: InstantRappel[] = [];
  for (const r of rappels) {
    if (r === 'J-7') res.push({ genre: r, quand: matin(date, -7) });
    else if (r === 'J-1') res.push({ genre: r, quand: matin(date, -1) });
    else if (r === 'J9h') {
      if (p.heure === null || p.heure * 60 + (p.minute ?? 0) > HEURE_MATIN * 60) res.push({ genre: r, quand: matin(date, 0) });
    } else if (r === 'H-1' && p.heure !== null) res.push({ genre: r, quand: instant(date) - 3_600_000 });
  }
  if (perso) res.push({ genre: 'perso', quand: instant(perso) });
  const vus = new Set<number>();
  return res.filter((x) => (vus.has(x.quand) ? false : (vus.add(x.quand), true))).sort((a, b) => a.quand - b.quand);
}

const ETIQUETTES: Record<GenreRappel, string> = {
  'J-7': 'J-7', 'J-1': 'J-1', J9h: 'Aujourd’hui', 'H-1': 'Dans 1 h', perso: 'Rappel',
};

// ───────────────────────────── Planning des notifications ─────────────────────────────

export interface EcheancePlan {
  projetId: string;
  projet: string;
  cible: string;
  genre: 'noeud' | 'bloc';
  titre: string;
  date: DateLocale;
  rappels: readonly Rappel[] | null;
  perso: DateLocale | null;
}

export interface Notif {
  /** Identifiant stable (même calcul sur chaque appareil). */
  id: string;
  quand: number;
  titre: string;
  texte: string;
  /** Ancre de l'app à ouvrir au toucher. */
  url: string;
}

export interface OptionsPlan {
  maintenant: number;
  /** Fenêtre planifiée (par défaut 14 jours). */
  horizon?: number;
  /** Résumé quotidien à « HH:mm », ou null. */
  resume?: string | null;
}

export const HORIZON = 14 * 86_400_000;

export function ancre(e: Pick<EcheancePlan, 'projetId' | 'cible' | 'genre'>): string {
  return `#/p/${encodeURIComponent(e.projetId)}?${e.genre === 'bloc' ? 'bloc' : 'noeud'}=${encodeURIComponent(e.cible)}`;
}

/** Notifications à venir (entre maintenant et l'horizon), triées. Pur et déterministe. */
export function planifier(echeances: readonly EcheancePlan[], o: OptionsPlan): Notif[] {
  const fin = o.maintenant + (o.horizon ?? HORIZON);
  const res: Notif[] = [];
  for (const e of echeances) {
    for (const r of instantsRappels(e.date, rappelsEffectifs(e.rappels), e.perso)) {
      if (r.quand <= o.maintenant || r.quand > fin) continue;
      res.push({
        id: `${e.projetId}:${e.cible}:${r.genre}`,
        quand: r.quand,
        titre: `${ETIQUETTES[r.genre]} · ${e.titre || 'Sans titre'}`,
        texte: `${e.projet || 'Sans titre'} · ${dateJour(e.date, r.quand)}`,
        url: ancre(e),
      });
    }
  }
  if (o.resume && /^\d{2}:\d{2}$/.test(o.resume)) res.push(...resumes(echeances, o.maintenant, fin, o.resume));
  return res.sort((a, b) => a.quand - b.quand || (a.id < b.id ? -1 : 1));
}

/** Résumé du jour : seulement s'il y a une échéance ce jour-là ou un retard. */
function resumes(echeances: readonly EcheancePlan[], maintenant: number, fin: number, hhmm: string): Notif[] {
  const [h, m] = hhmm.split(':').map(Number) as [number, number];
  const res: Notif[] = [];
  const debut = decouper(aujourdhui(maintenant));
  for (let k = 0; k <= 15; k++) {
    const quand = new TZDate(debut.annee, debut.mois - 1, debut.jour + k, h, m, FUSEAU).getTime();
    if (quand <= maintenant || quand > fin) continue;
    const jour = aujourdhui(quand);
    let duJour = 0;
    let retard = 0;
    for (const e of echeances) {
      const j = e.date.slice(0, 10);
      if (j === jour) duJour++;
      else if (j < jour) retard++;
    }
    if (duJour + retard === 0) continue;
    const parts = [duJour ? `${duJour} échéance${duJour > 1 ? 's' : ''}` : '', retard ? `${retard} en retard` : ''].filter(Boolean);
    res.push({ id: `resume:${jour}`, quand, titre: 'Aujourd’hui', texte: parts.join(', '), url: '#/calendrier' });
  }
  return res;
}
