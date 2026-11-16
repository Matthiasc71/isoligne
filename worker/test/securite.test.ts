import { describe, expect, it } from 'vitest';
import { ipPrivee, resolutionPublique, verifierUrl } from '../src/securite';
import { composer, decoderEntites, nettoyer } from '../src/apercu';

describe('SSRF : adresses refusées', () => {
  it.each([
    'http://localhost/', 'http://LOCALHOST./', 'http://intranet.local/', 'http://api.internal/',
    'http://127.0.0.1/', 'http://127.1/', 'http://2130706433/', 'http://0x7f000001/', 'http://0177.0.0.1/',
    'http://10.0.0.1/', 'http://172.16.5.4/', 'http://192.168.1.1/', 'http://169.254.169.254/latest/meta-data',
    'http://100.64.0.1/', 'http://0.0.0.0/', 'http://224.0.0.1/',
    'http://[::1]/', 'http://[::]/', 'http://[fd00::1]/', 'http://[fe80::1]/', 'http://[::ffff:127.0.0.1]/',
    'http://[::ffff:10.0.0.1]/', 'http://[64:ff9b::a00:1]/',
    'ftp://exemple.fr/', 'file:///etc/passwd', 'javascript:alert(1)', 'http://user:mdp@exemple.fr/',
    'http://exemple.fr:8080/', 'http://serveur/', 'pas une url',
  ])('%s', (u) => {
    expect(verifierUrl(u)).toBeNull();
  });
});

describe('SSRF : adresses acceptées', () => {
  it.each(['https://exemple.fr/page?x=1', 'http://exemple.fr:80/', 'https://8.8.8.8/', 'https://[2606:4700::1111]/'])('%s', (u) => {
    expect(verifierUrl(u)).not.toBeNull();
  });
  it('reconnaît les IP privées', () => {
    expect(ipPrivee('192.168.0.10')).toBe(true);
    expect(ipPrivee('93.184.215.14')).toBe(false);
    expect(ipPrivee('2606:4700::1111')).toBe(false);
    expect(ipPrivee('fc00::5')).toBe(true);
  });
});

describe('résolution DNS', () => {
  const dns = (reponses: Record<string, { type: number; data: string }[]>) => (async (url: string) => {
    const type = new URL(url).searchParams.get('type')!;
    return new Response(JSON.stringify({ Answer: reponses[type] ?? [] }), { headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;

  it('refuse un nom qui pointe vers une adresse privée (même parmi des publiques)', async () => {
    expect(await resolutionPublique('piege.exemple', dns({ A: [{ type: 1, data: '93.184.215.14' }, { type: 1, data: '10.0.0.5' }] }))).toBe(false);
    expect(await resolutionPublique('piege6.exemple', dns({ AAAA: [{ type: 28, data: '::1' }] }))).toBe(false);
  });
  it('accepte un nom public, et refuse un nom sans réponse', async () => {
    expect(await resolutionPublique('exemple.fr', dns({ A: [{ type: 5, data: 'cdn.exemple.fr.' }, { type: 1, data: '93.184.215.14' }] }))).toBe(true);
    expect(await resolutionPublique('inexistant.exemple', dns({}))).toBe(false);
  });
});

describe('aperçu en texte seul', () => {
  it('décode les entités et retire tout HTML', () => {
    expect(decoderEntites('Caf&eacute; &amp; th&#233; &#x2014; &quot;ok&quot;')).toBe('Café & thé — "ok"');
    expect(nettoyer('<script>alert(1)</script> Titre\n\t long ', 50)).toBe('alert(1) Titre long');
    expect(nettoyer('‮abc\u0007', 10)).toBe('abc');
    expect(nettoyer('x'.repeat(20), 10)).toBe(`${'x'.repeat(9)}…`);
  });
  it('préfère Open Graph, puis le titre de la page, et nomme le site', () => {
    expect(composer({ titre: 'Titre HTML', ogTitre: 'Titre OG', description: 'Desc' }, 'https://www.exemple.fr/a'))
      .toEqual({ url: 'https://www.exemple.fr/a', titre: 'Titre OG', site: 'exemple.fr', description: 'Desc' });
    expect(composer({ titre: '  Page &amp; co ' }, 'https://exemple.fr/').titre).toBe('Page & co');
  });
});
