-- Jalon 6 : partage en lecture seule. Le serveur garde un instantané chiffré
-- (clé seulement dans le lien, après le #) et l'empreinte salée de l'identifiant.
CREATE TABLE partages (
  id_hash TEXT PRIMARY KEY,
  espace TEXT NOT NULL,
  donnees TEXT NOT NULL,
  cree INTEGER NOT NULL,
  maj INTEGER NOT NULL,
  expire INTEGER
);
CREATE INDEX partages_espace ON partages (espace);
CREATE INDEX partages_expire ON partages (expire);
