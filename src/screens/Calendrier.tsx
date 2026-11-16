import { useLiveQuery } from 'dexie-react-hooks';
import { useStockage } from '../app/contexte';
import { lien } from '../app/route';
import { useMaintenant } from '../app/temps';
import { CarreCalque } from '../design/signature';
import { compteARebours, dateJour, dateParlee, enRetard } from '../time/dates';
import './secondaires.css';

/** Agenda des échéances ouvertes. Les vues mois et semaine arrivent au jalon 5. */
export default function Calendrier() {
  const stockage = useStockage();
  const maintenant = useMaintenant();
  const donnees = useLiveQuery(async () => {
    const [echeances, projets] = await Promise.all([
      stockage.index.echeances.orderBy('date').toArray(),
      stockage.index.projets.toArray(),
    ]);
    const parId = new Map(projets.map((p) => [p.id, p]));
    return echeances
      .map((e) => ({ e, p: parId.get(e.projetId) }))
      .filter((x) => x.p && x.p.statut !== 'archive');
  }, [stockage]);

  return (
    <div className="ecran">
      <h1 className="t-titre ecran-titre">Agenda</h1>
      {donnees && donnees.length === 0 && <p className="t-cote">Aucune échéance</p>}
      <ul className="liste-simple">
        {donnees?.map(({ e, p }, i) => {
          const retard = enRetard(e.date, maintenant);
          return (
            <li key={e.id}>
              <a href={lien({ ecran: 'projet', id: e.projetId, branche: null, vue: 'page' })} className="ligne-agenda"
                aria-label={`${e.titre || 'Sans titre'}, ${p!.titre}, ${dateParlee(e.date)}${retard ? ', en retard' : ''}`}>
                <span className="t-cote">{dateJour(e.date, maintenant)}</span>
                <span className="ligne-agenda-titre">
                  <span className="t-corps">{e.titre || 'Sans titre'}</span>
                  <span className="t-cote ligne-agenda-projet"><CarreCalque couleur={p!.couleur} taille={8} />{p!.titre}</span>
                </span>
                <span className={`t-cote${retard || i === 0 ? ' redline' : ''}`}>{compteARebours(e.date, maintenant)}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
