import { useEffect, useMemo, useState, type ReactNode } from 'react';
import * as Y from 'yjs';
import { initialiserProjet } from '../data/projet';
import { LIBELLES_COULEUR, LIBELLES_TYPE } from '../data/schema';
import { CarreCalque } from '../design/signature';
import { markdownVersElements } from '../echange/riche';
import { ecrireProjet, type BlocEch, type NoeudEch, type ProjetEch } from '../echange/projet';
import { radial } from '../graph/dispositions';
import { lireLiens } from '../graph/liens';
import { ADRESSE_WORKER } from '../media/lien';
import { HAUTEUR, LARGEUR } from '../media/croquis';
import { Traits } from '../media/Figure';
import { depuisBase64Url } from '../sync/crypto';
import { lireArbre } from '../tree/arbre';
import { aujourdhui, dateJour } from '../time/dates';
import { dechiffrerInstantane, type Instantane } from './partage';
import '../screens/projet.css';
import '../media/medias.css';
import './partage.css';

type Etat = { genre: 'chargement' } | { genre: 'invalide' } | { genre: 'ok'; i: Instantane; maj: number };

/** Vue du destinataire d'un lien de partage : lecture seule, sans navigation (brief bonus §4). */
export default function VuePartage({ id, cle }: { id: string; cle: string }) {
  const [etat, setEtat] = useState<Etat>({ genre: 'chargement' });
  const [vue, setVue] = useState<'page' | 'graphe'>('page');

  useEffect(() => {
    let actif = true;
    void (async () => {
      try {
        if (!ADRESSE_WORKER) throw new Error('sans serveur');
        const r = await fetch(`${ADRESSE_WORKER}/s/${id}`, { credentials: 'omit', referrerPolicy: 'no-referrer' });
        if (!r.ok) throw new Error(String(r.status));
        const d = (await r.json()) as { donnees: string; maj: number };
        const i = await dechiffrerInstantane(d.donnees, depuisBase64Url(cle));
        if (actif) setEtat({ genre: 'ok', i, maj: d.maj });
      } catch {
        if (actif) setEtat({ genre: 'invalide' });
      }
    })();
    return () => { actif = false; };
  }, [id, cle]);

  if (etat.genre === 'chargement') return <div className="ecran"><p className="t-cote" role="status">Ouverture de l’instantané…</p></div>;
  if (etat.genre === 'invalide') return <div className="ecran"><p className="t-corps" role="alert">Ce lien n’est plus valable.</p></div>;

  const p = etat.i.projet;
  return (
    <div className="ecran partage">
      <p className="t-cote partage-tete">Instantané du {dateJour(aujourdhui(etat.maj))} · lecture seule</p>
      <h1 className="t-titre partage-titre">{p.titre || 'Sans titre'}</h1>
      <dl className="partage-cartouche">
        <div><dt className="t-label">Type</dt><dd className="t-corps">{LIBELLES_TYPE[p.type] ?? '—'}</dd></div>
        <div><dt className="t-label">Calque</dt><dd className="t-corps"><CarreCalque couleur={p.couleur} /> {LIBELLES_COULEUR[p.couleur] ?? ''}</dd></div>
        {p.fin && <div><dt className="t-label">Échéance finale</dt><dd className="t-corps">{dateJour(p.fin)}</dd></div>}
      </dl>
      <div className="onglets partage-onglets" role="tablist" aria-label="Vue">
        {(['page', 'graphe'] as const).map((v) => (
          <button key={v} type="button" role="tab" aria-selected={vue === v} className={`onglet t-label${vue === v ? ' actif' : ''}`}
            onClick={() => setVue(v)}>{v === 'page' ? 'Page' : 'Graphe'}</button>
        ))}
      </div>
      {vue === 'page' ? <Page p={p} /> : <GrapheFige p={p} />}
    </div>
  );
}

function Page({ p }: { p: ProjetEch }) {
  let figure = 0;
  return (
    <div className="partage-page">
      {p.blocs.map((b, i) => {
        if (b.type === 'croquis') figure++;
        return <section key={i} className="partage-bloc">{bloc(b, p, figure)}</section>;
      })}
    </div>
  );
}

function bloc(b: BlocEch, p: ProjetEch, figure: number): ReactNode {
  switch (b.type) {
    case 'arbre': return p.arbre.length ? <Arbre noeuds={p.arbre} prefixe="" /> : null;
    case 'texte': return <Riche md={b.md} />;
    case 'separateur': return <hr className="trace" />;
    case 'echeance': return (
      <p className={`partage-echeance${b.fait ? ' faite' : ''}`}>
        <Case fait={b.fait} tache />
        <span className="t-corps">{b.titre || 'Échéance'}</span>
        <span className="t-cote">{b.date ? dateJour(b.date) : '--.--'}</span>
      </p>
    );
    case 'lien': return (
      <p className="partage-lien">
        <a className="t-corps lien-souligne" href={/^https?:\/\//.test(b.url) ? b.url : undefined} target="_blank" rel="noopener noreferrer nofollow">{b.titre || b.url}</a>
        {b.site && <span className="t-cote">{b.site}</span>}
      </p>
    );
    case 'croquis': return (
      <figure className="figure">
        <div className="figure-dessin">
          <svg viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`} role="img" aria-label={`FIG. ${figure}${b.legende ? `, ${b.legende}` : ''}`}>
            <g style={{ ['--calque-courant' as string]: `var(--calque-${p.couleur})` }}><Traits traits={b.traits} /></g>
          </svg>
          <span className="reperes" aria-hidden="true"><i /><i /><i /><i /></span>
        </div>
        <figcaption className="t-cote figure-legende">FIG. {figure}{b.legende && <> — {b.legende}</>}</figcaption>
      </figure>
    );
  }
}

function Case({ fait, tache }: { fait: boolean; tache: boolean }) {
  if (!tache) return null;
  return (
    <svg className="partage-case" width="16" height="16" viewBox="0 0 16 16" role="img" aria-label={fait ? 'Tâche faite' : 'Tâche'}>
      <rect x=".5" y=".5" width="15" height="15" className="case-cadre" />
      {fait && <g className="partage-croix"><line x1="3.5" y1="3.5" x2="12.5" y2="12.5" /><line x1="12.5" y1="3.5" x2="3.5" y2="12.5" /></g>}
    </svg>
  );
}

function Arbre({ noeuds, prefixe }: { noeuds: NoeudEch[]; prefixe: string }) {
  return (
    <ol className="partage-arbre">
      {noeuds.map((n, i) => {
        const num = prefixe ? `${prefixe}.${i + 1}` : String(i + 1);
        return (
          <li key={num}>
            <div className={`partage-noeud${n.fait ? ' faite' : ''}`}>
              <span className="t-cote partage-num">{num}</span>
              <Case fait={n.fait} tache={n.tache} />
              {n.couleur && <CarreCalque couleur={n.couleur} taille={8} />}
              <span className="t-corps partage-texte">{n.texte || ' '}</span>
              {n.echeance && <span className="t-cote">{dateJour(n.echeance)}</span>}
            </div>
            {n.note && <div className="partage-note"><Riche md={n.note} /></div>}
            {n.enfants.length > 0 && <Arbre noeuds={n.enfants} prefixe={num} />}
          </li>
        );
      })}
    </ol>
  );
}

/** Rendu du texte riche (Markdown de l'instantané), sans HTML brut. */
function Riche({ md }: { md: string }) {
  const elements = useMemo(() => {
    const f = new Y.Doc().getXmlFragment('f');
    f.insert(0, markdownVersElements(md));
    return f.toArray() as Y.XmlElement[];
  }, [md]);
  return <div className="partage-riche t-corps">{elements.map((e, i) => <Element key={i} e={e} />)}</div>;
}

function Element({ e }: { e: Y.XmlElement }): ReactNode {
  const enfants = e.toArray().map((x, i) => (x instanceof Y.XmlText ? <Texte key={i} t={x} /> : <Element key={i} e={x as Y.XmlElement} />));
  switch (e.nodeName) {
    case 'heading': return Number(e.getAttribute('level')) >= 3 ? <h4 className="t-corps partage-h">{enfants}</h4> : <h3 className="t-corps partage-h">{enfants}</h3>;
    case 'bulletList': return <ul>{enfants}</ul>;
    case 'orderedList': return <ol>{enfants}</ol>;
    case 'listItem': return <li>{enfants}</li>;
    case 'blockquote': return <blockquote>{enfants}</blockquote>;
    case 'codeBlock': return <pre><code>{enfants}</code></pre>;
    case 'horizontalRule': return <hr className="trace" />;
    case 'hardBreak': return <br />;
    default: return <p>{enfants}</p>;
  }
}

function Texte({ t }: { t: Y.XmlText }) {
  return (
    <>
      {(t.toDelta() as { insert: string; attributes?: Record<string, { href?: string }> }[]).map((d, i) => {
        const a = d.attributes ?? {};
        let n: ReactNode = d.insert;
        if (a.code) n = <code>{n}</code>;
        if (a.bold) n = <strong>{n}</strong>;
        if (a.italic) n = <em>{n}</em>;
        if (a.strike) n = <s>{n}</s>;
        const href = a.link?.href;
        if (href && /^https?:\/\//.test(href)) n = <a className="lien-souligne" href={href} target="_blank" rel="noopener noreferrer nofollow">{n}</a>;
        return <span key={i}>{n}</span>;
      })}
    </>
  );
}

/** Graphe radial dessiné ici, dans le thème du destinataire, à partir de l'instantané. */
function GrapheFige({ p }: { p: ProjetEch }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let actif = true;
    void (async () => {
      const doc = new Y.Doc();
      initialiserProjet(doc, { titre: p.titre, type: p.type, couleur: p.couleur, calque: 0 });
      ecrireProjet(doc, p);
      const arbre = lireArbre(doc);
      const { versSvg } = await import('../graph/export');
      const r = await versSvg({ plan: radial(arbre), arbre, liens: lireLiens(doc, arbre), titre: p.titre, couleur: p.couleur, urgente: null, dateUrgente: null });
      if (actif) setSvg(r.svg);
    })();
    return () => { actif = false; };
  }, [p]);
  if (!svg) return <p className="t-cote" role="status">Dessin du graphe…</p>;
  // Image (et non SVG en ligne) : le contenu de l'instantané reste inerte.
  return <img className="partage-graphe" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt={`Graphe radial de ${p.titre}`} />;
}
