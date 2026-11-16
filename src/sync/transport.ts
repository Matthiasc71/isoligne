/** Échanges avec le Worker. Une interface, pour pouvoir simuler le serveur dans les tests. */

export interface Tete { projet: string; seq: number; nombre: number }
export interface Ligne { id: number; partie: number; total: number; d: string }

export interface Transport {
  tetes(): Promise<Tete[]>;
  tirer(projet: string, depuis: number): Promise<{ lignes: Ligne[]; encore: boolean }>;
  envoyer(projet: string, bloc: string, partie: number, total: number): Promise<{ seq?: number }>;
  compacter(projet: string, jusqua: number, bloc: string, partie: number, total: number): Promise<void>;
}

export class ErreurSynchro extends Error {
  constructor(readonly statut: number, message: string) { super(message); }
}

export class TransportHttp implements Transport {
  constructor(private readonly base: string, private readonly jeton: string) {}

  private async appel(chemin: string, init: RequestInit = {}): Promise<Response> {
    const r = await fetch(`${this.base}${chemin}`, {
      ...init,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      headers: { authorization: `Bearer ${this.jeton}`, ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(20_000),
    });
    if (!r.ok) throw new ErreurSynchro(r.status, `${r.status} ${chemin}`);
    return r;
  }

  async tetes(): Promise<Tete[]> {
    return (await this.appel('/sync/tetes')).json();
  }
  async tirer(projet: string, depuis: number) {
    return (await this.appel(`/sync/projet?projet=${projet}&depuis=${depuis}`)).json() as Promise<{ lignes: Ligne[]; encore: boolean }>;
  }
  async envoyer(projet: string, bloc: string, partie: number, total: number) {
    return (await this.appel(`/sync/envoi?projet=${projet}&partie=${partie}&total=${total}`, {
      method: 'POST', body: bloc, headers: { 'content-type': 'text/plain' }, keepalive: bloc.length < 60_000,
    })).json() as Promise<{ seq?: number }>;
  }
  async compacter(projet: string, jusqua: number, bloc: string, partie: number, total: number) {
    await this.appel(`/sync/compacter?projet=${projet}&jusqua=${jusqua}&partie=${partie}&total=${total}`, {
      method: 'POST', body: bloc, headers: { 'content-type': 'text/plain' },
    });
  }
}
