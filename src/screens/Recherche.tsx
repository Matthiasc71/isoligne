import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useStockage } from '../app/contexte';
import { lien } from '../app/route';
import { CarreCalque } from '../design/signature';
import './secondaires.css';

const normaliser = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** Recherche dans les titres de projets. La recherche plein texte (MiniSearch) arrive au jalon 6. */
export default function Recherche() {
  const stockage = useStockage();
  const [q, setQ] = useState('');
  const projets = useLiveQuery(() => stockage.index.projets.toArray(), [stockage]);
  const resultats = useMemo(() => {
    const n = normaliser(q.trim());
    if (!n || !projets) return [];
    return projets.filter((p) => normaliser(p.titre).includes(n));
  }, [q, projets]);
  return (
    <div className="ecran">
      <label className="visuellement-cache" htmlFor="recherche">Rechercher</label>
      <input id="recherche" type="search" className="champ t-corps recherche-champ" placeholder="Rechercher"
        value={q} onChange={(e) => setQ(e.target.value)} autoFocus enterKeyHint="search" />
      {q.trim() && resultats.length === 0 && <p className="t-cote recherche-vide">Aucun résultat</p>}
      <ul className="liste-simple">
        {resultats.map((p) => (
          <li key={p.id}>
            <a className="ligne-agenda" href={lien({ ecran: 'projet', id: p.id, branche: null, vue: 'page' })}>
              <CarreCalque couleur={p.couleur} />
              <span className="t-corps">{p.titre}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
