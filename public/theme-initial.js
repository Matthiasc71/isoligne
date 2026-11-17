/* Thème choisi dans les Réglages, posé avant le premier affichage (évite un éclair de l'autre thème à l'ouverture). */
try {
  var t = localStorage.getItem('isoligne-theme');
  if (t === 'clair' || t === 'sombre') document.documentElement.setAttribute('data-theme', t);
} catch (e) { /* stockage indisponible : thème du système */ }
