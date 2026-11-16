import { useEffect, useState } from 'react';

/** Heure courante, rafraîchie chaque minute et au retour au premier plan. */
export function useMaintenant(): number {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setT(Date.now()), 60_000);
    const v = () => { if (document.visibilityState === 'visible') setT(Date.now()); };
    document.addEventListener('visibilitychange', v);
    return () => { clearInterval(i); document.removeEventListener('visibilitychange', v); };
  }, []);
  return t;
}
