-- Isoligne : synchro chiffrée de bout en bout.
-- Le serveur ne stocke que des identifiants, des empreintes de jetons et des blocs chiffrés.

CREATE TABLE espaces (
  id TEXT PRIMARY KEY,                -- dérivé du secret maître (32 hex)
  secours_hash TEXT NOT NULL,         -- empreinte salée du jeton de secours
  cree INTEGER NOT NULL
);

CREATE TABLE appareils (
  id TEXT PRIMARY KEY,
  espace TEXT NOT NULL REFERENCES espaces(id),
  jeton_hash TEXT NOT NULL UNIQUE,    -- empreinte salée du jeton (256 bits) ; jamais le jeton lui-même
  nom TEXT NOT NULL,
  cree INTEGER NOT NULL,
  vu INTEGER NOT NULL,
  revoque INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX appareils_espace ON appareils(espace);

-- Appairage : un code de 8 caractères, 5 minutes, confirmé sur l'appareil existant.
CREATE TABLE appairages (
  id TEXT PRIMARY KEY,
  espace TEXT NOT NULL REFERENCES espaces(id),
  code_hash TEXT NOT NULL UNIQUE,
  expire INTEGER NOT NULL,
  statut TEXT NOT NULL,               -- ouvert, reclame, confirme
  pub_ancien TEXT,                    -- clés publiques ECDH (base64url) : code saisi à la main
  pub_nouveau TEXT,
  nom_nouveau TEXT,
  enveloppe TEXT,                     -- secret maître chiffré pour le nouvel appareil (ECDH)
  jeton_nouveau TEXT                  -- remis une seule fois, puis la ligne est supprimée
);

-- Mises à jour Yjs chiffrées, en base64url (texte) : D1 relit un BLOB sous forme de tableau de
-- nombres, coûteux à convertir avec 10 ms de CPU ; le texte est stocké et renvoyé sans conversion.
-- Un bloc de plus de 1 Mo (encodé) est découpé en parties consécutives.
CREATE TABLE majs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  espace TEXT NOT NULL,
  projet TEXT NOT NULL,
  partie INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 1,
  donnees TEXT NOT NULL,
  appareil TEXT NOT NULL,
  cree INTEGER NOT NULL
);
CREATE INDEX majs_projet ON majs(espace, projet, id);

-- Dernier numéro complet de chaque projet : la synchro ne lit qu'une ligne par projet.
CREATE TABLE tetes (
  espace TEXT NOT NULL,
  projet TEXT NOT NULL,
  seq INTEGER NOT NULL,
  nombre INTEGER NOT NULL,            -- lignes depuis le dernier compactage
  PRIMARY KEY (espace, projet)
);

-- Limitation de débit (appairage, restauration, création d'espace).
CREATE TABLE limites (
  cle TEXT PRIMARY KEY,
  fenetre INTEGER NOT NULL,
  compte INTEGER NOT NULL
);
