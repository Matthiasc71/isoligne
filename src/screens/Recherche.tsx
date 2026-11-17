import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useStockage } from '../app/contexte';
import { lien } from '../app/route';
import { useMaintenant } from '../app/temps';
import { CarreCalque } from '../design/signature';
import { chercher, creerIndex, extrait, FILTRES, grouper, type Filtre, type Resultat } from '../search/moteur';
import { dateJour } from '../time/dates';
import './secondaires.css';

const PAR_GROUPE = 5;

function lienResultat(r: Resultat): string {
  if (r.genre === 'projet') return lien({ ecran: 'projet', id: r.projetId, branche: null, vue: 'page' });
  return lien({ ecran: 'projet', id: r.projetId, branche: null, vue: 'page', ...(r.genre === 'bloc' ? { bloc: r.cible } : { noeud: r.cible }) });
}

/** Recherche plein texte locale (brief : design/briefs/bonus.md §1). */
export default function Recherche() {
  const stockage = useStockage();
  const maintenant = useMaintenant();
  const [q, setQ] = useState('');
  const [filtres, setFiltres] = useState<Filtre[]>([]);
  const [ouverts, setOuverts] = useState<Set<string>>(new Set());
  const textes = useLiveQuery(() => stockage.index.textes.toArray(), [stockage]);
  const projets = useLiveQuery(() => stockage.index.projets.toArray(), [stockage]);
  const recentes = useLiveQuery(() => stockage.reglage<string[]>('recherchesRecentes', []), [stockage]) ?? [];

  const index = useMemo(() => (textes ? creerIndex(textes) : null), [textes]);
  const parProjet = useMemo(() => new Map((projets ?? []).map((p) => [p.id, p])), [projets]);
  const groupes = useMemo(() => {
    if (!index) return [];
    return grouper(chercher(index, q, filtres, maintenant));
  }, [index, q, filtres, maintenant]);
  const total = groupes.reduce((n, g) => n + g.resultats.length, 0);

  const memoriser = () => {
    const t = q.trim();
    if (!t) return;
    void stockage.poserReglage('recherchesRecentes', [t, ...recentes.filter((x) => x !== t)].slice(0, 5));
  };
  const basculer = (f: Filtre) => setFiltres((l) => (l.includes(f) ? l.filter((x) => x !== f) : [...l, f]));

  return (
    <div className="ecran recherche">
      <form role="search" onSubmit={(e) => { e.preventDefault(); memoriser(); }}>
        <label className="visuellement-cache" htmlFor="recherche">Rechercher</label>
        <input id="recherche" type="search" className="champ t-corps recherche-champ" placeholder="Rechercher"
          value={q} onChange={(e) => setQ(e.target.value)} autoFocus enterKeyHint="search" autoComplete="off" spellCheck={false} />
      </form>
      <div className="puces recherche-filtres" role="group" aria-label="Filtres">
        {FILTRES.map((f) => (
          <button key={f.valeur} type="button" role="checkbox" aria-checked={filtres.includes(f.valeur)}
            className={`puce t-cote${filtres.includes(f.valeur) ? ' actif' : ''}`} onClick={() => basculer(f.valeur)}>{f.libelle}</button>
        ))}
      </div>

      {!q.trim() && recentes.length > 0 && (
        <section className="recherche-recentes" aria-labelledby="r-recentes">
          <div className="recherche-recentes-tete">
            <h2 id="r-recentes" className="t-label">Récentes</h2>
            <button type="button" className="t-cote lien-action" onClick={() => void stockage.poserReglage('recherchesRecentes', [])}>Effacer</button>
          </div>
          <ul className="liste-simple">
            {recentes.map((r) => (
              <li key={r}><button type="button" className="ligne-recente t-corps" onClick={() => setQ(r)}>{r}</button></li>
            ))}
          </ul>
        </section>
      )}

      {q.trim() && (
        <p className="t-cote recherche-compte" role="status">
          {total === 0 ? 'Aucun résultat' : `${total} résultat${total > 1 ? 's' : ''} dans ${groupes.length} projet${groupes.length > 1 ? 's' : ''}`}
        </p>
      )}

      {groupes.map((g) => {
        const p = parProjet.get(g.projetId);
        const deplie = ouverts.has(g.projetId);
        const visibles = deplie ? g.resultats : g.resultats.slice(0, PAR_GROUPE);
        return (
          <section key={g.projetId} className="recherche-groupe" aria-label={p?.titre || 'Sans titre'}>
            <h2 className="recherche-projet t-label">
              {p && <CarreCalque couleur={p.couleur} taille={10} />}
              <span>{p?.titre || 'Sans titre'}</span>
            </h2>
            <ul className="liste-simple">
              {visibles.map((r) => (
                <li key={r.id}>
                  <a className="ligne-resultat" href={lienResultat(r)} onClick={memoriser}>
                    <span className="t-cote">{r.repere}{r.date && r.nature !== 'projet' ? ` · ${dateJour(r.date, maintenant)}` : ''}{r.fait ? ' · faite' : ''}</span>
                    <span className="t-corps ligne-resultat-extrait">
                      {extrait(r.texte, r.termes).map((s, i) => (s.trouve ? <mark key={i}>{s.texte}</mark> : <span key={i}>{s.texte}</span>))}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            {g.resultats.length > PAR_GROUPE && !deplie && (
              <button type="button" className="t-cote lien-action recherche-plus"
                onClick={() => setOuverts((s) => new Set(s).add(g.projetId))}>{g.resultats.length - PAR_GROUPE} de plus</button>
            )}
          </section>
        );
      })}
    </div>
  );
}
