-- Jalon 5 : notifications. Le serveur ne voit que des heures et des blocs chiffrés pour chaque abonnement.

-- Abonnements push des appareils (l'adresse du service de push du navigateur ; ses clés restent dans l'espace chiffré).
CREATE TABLE abonnements (
  id TEXT PRIMARY KEY,
  espace TEXT NOT NULL,
  appareil TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  cree INTEGER NOT NULL
);
CREATE INDEX abonnements_espace ON abonnements (espace);
CREATE INDEX abonnements_appareil ON abonnements (appareil);

-- Planning d'un espace : une seule ligne, liste JSON de { a: abonnement, i: id, q: quand (ms), c: corps chiffré }.
CREATE TABLE plannings (
  espace TEXT PRIMARY KEY,
  empreinte TEXT NOT NULL,
  envois TEXT NOT NULL,
  prochain INTEGER,
  maj INTEGER NOT NULL
);
CREATE INDEX plannings_prochain ON plannings (prochain);
