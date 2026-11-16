import type { SVGProps } from 'react';

/** Icônes maison : grille de 24, trait de 1,5, angles vifs. Jamais de bibliothèque ni d'emoji. */
type P = SVGProps<SVGSVGElement>;

function Icone({ children, ...props }: P & { children: React.ReactNode }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IcProjets = (p: P) => (
  <Icone {...p}><path d="M5 7h14M5 12h10M5 17h12" /></Icone>
);
export const IcCalendrier = (p: P) => (
  <Icone {...p}><path d="M4.75 6.75h14.5v12.5H4.75zM4.75 10.25h14.5M8.5 4.5v4M15.5 4.5v4" /></Icone>
);
export const IcRecherche = (p: P) => (
  <Icone {...p}><circle cx="10.5" cy="10.5" r="5.25" /><path d="M14.5 14.5 19 19" /></Icone>
);
export const IcPlus = (p: P) => (
  <Icone {...p}><path d="M12 5v14M5 12h14" /></Icone>
);
export const IcRetour = (p: P) => (
  <Icone {...p}><path d="M14.5 6.5 9 12l5.5 5.5" /></Icone>
);
export const IcSuite = (p: P) => (
  <Icone {...p} strokeWidth="2"><path d="M6 12h.01M12 12h.01M18 12h.01" /></Icone>
);
export const IcFermer = (p: P) => (
  <Icone {...p}><path d="m6.5 6.5 11 11M17.5 6.5l-11 11" /></Icone>
);
export const IcIndenter = (p: P) => (
  <Icone {...p}><path d="M5 6h14M11 12h8M11 18h8M5 9.5l3.5 2.5L5 14.5" /></Icone>
);
export const IcDesindenter = (p: P) => (
  <Icone {...p}><path d="M5 6h14M11 12h8M11 18h8M8.5 9.5 5 12l3.5 2.5" /></Icone>
);
export const IcCocher = (p: P) => (
  <Icone {...p}><path d="M5.75 5.75h12.5v12.5H5.75zM9 9l6 6M15 9l-6 6" /></Icone>
);
export const IcDate = (p: P) => (
  <Icone {...p}><path d="M5.75 7.75h12.5v10.5H5.75zM5.75 11h12.5M9 5.5v3.5M15 5.5v3.5M9 14.5h2" /></Icone>
);
export const IcCouleur = (p: P) => (
  <Icone {...p}><path d="M5.75 5.75h8.5v8.5h-8.5z" fill="currentColor" /><path d="M9.75 9.75h8.5v8.5h-8.5z" /></Icone>
);
export const IcHaut = (p: P) => (
  <Icone {...p}><path d="M12 19V5.5M6.5 11 12 5.5l5.5 5.5" /></Icone>
);
export const IcBas = (p: P) => (
  <Icone {...p}><path d="M12 5v13.5M6.5 13l5.5 5.5 5.5-5.5" /></Icone>
);
export const IcOuvrir = (p: P) => (
  <Icone {...p}><path d="M5.75 5.75h12.5v12.5H5.75zM10 14l5-5M10.5 9H15v4.5" /></Icone>
);
export const IcSupprimer = (p: P) => (
  <Icone {...p}><path d="M5 7h14M9.5 7V4.75h5V7M7 7l.75 12.25h8.5L17 7M10.5 10.5v5.5M13.5 10.5v5.5" /></Icone>
);
export const IcAnnuler = (p: P) => (
  <Icone {...p}><path d="M9 6.5 5 10.5l4 4M5.5 10.5H15a4 4 0 0 1 0 8h-3" /></Icone>
);
export const IcReglages = (p: P) => (
  <Icone {...p}><path d="M5 7h3M12 7h7M5 17h9M18 17h1M8 4.75v4.5M14 14.75v4.5" /></Icone>
);
export const IcRattacher = (p: P) => (
  <Icone {...p}><path d="M5.75 4.75h5.5v4.5h-5.5zM12.75 14.75h5.5v4.5h-5.5zM8.5 9.25V17h4.25" /></Icone>
);
export const IcTexte = (p: P) => (
  <Icone {...p}><path d="M6 6.5h12M12 6.5v12M9.5 18.5h5" /></Icone>
);
export const IcArbre = (p: P) => (
  <Icone {...p}><path d="M5.75 4.75h4.5v4.5h-4.5zM8 9.25v9.5M8 12.5h5.75M8 18h5.75M13.75 10.25h4.5v4.5h-4.5zM13.75 15.75h4.5v4.5h-4.5z" /></Icone>
);
export const IcEcheance = (p: P) => (
  <Icone {...p}><path d="M5.75 7.75h12.5v10.5H5.75zM5.75 11h12.5M9 5.5v3.5M15 5.5v3.5" /><path d="M12 13.25v2.5l1.5 1" /></Icone>
);
export const IcSeparateur = (p: P) => (
  <Icone {...p}><path d="M4 12h16M4 8.5v7M20 8.5v7" /></Icone>
);
export const IcGraphe = (p: P) => (
  <Icone {...p}><path d="M9.75 9.75h4.5v4.5h-4.5zM4.75 4.75h2.5v2.5h-2.5zM16.75 4.75h2.5v2.5h-2.5zM10.75 17.75h2.5v2.5h-2.5zM7 7l3 3M17 7l-3 3M12 14.25v3.5" /></Icone>
);
export const IcRelier = (p: P) => (
  <Icone {...p}><path d="M4.75 4.75h4.5v4.5h-4.5zM14.75 14.75h4.5v4.5h-4.5z" /><path d="M9.25 9.25C14 9.5 14.5 10 14.75 14.75" strokeDasharray="2 2" /></Icone>
);
export const IcReplier = (p: P) => (
  <Icone {...p}><path d="M5.75 5.75h12.5v12.5H5.75zM9 12h6" /></Icone>
);
export const IcDeplier = (p: P) => (
  <Icone {...p}><path d="M5.75 5.75h12.5v12.5H5.75zM9 12h6M12 9v6" /></Icone>
);
export const IcExporter = (p: P) => (
  <Icone {...p}><path d="M8.5 9.5H5.75v9.75h12.5V9.5H15.5M12 4.5v10M8.75 7.75 12 4.5l3.25 3.25" /></Icone>
);
export const IcReorganiser = (p: P) => (
  <Icone {...p}><path d="M5 12a7 7 0 0 1 12.2-4.7M19 12a7 7 0 0 1-12.2 4.7M17.5 4v3.5H14M6.5 20v-3.5H10" /></Icone>
);
export const IcSuivant = (p: P) => (
  <Icone {...p}><path d="M9.5 6.5 15 12l-5.5 5.5" /></Icone>
);
