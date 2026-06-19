// Résolution DNS réelle depuis le navigateur via DNS-over-HTTPS (Cloudflare, repli
// Google). Passif et public — utilisé pour vérifier qu'un domaine sait recevoir des
// emails (MX) et pour déduire le fournisseur mail. Aucune donnée n'est inventée.

export interface MxRecord {
  priority: number;
  host: string;
}

export type DomainState = 'mx_ok' | 'a_only' | 'no_mail' | 'nxdomain' | 'error';

export interface DomainLookup {
  domain: string;
  state: DomainState;
  mx: MxRecord[];
  hasA: boolean;
  resolver: string;
}

interface DohAnswer {
  name: string;
  type: number;
  data: string;
}
interface DohResponse {
  Status: number;
  Answer?: DohAnswer[];
}

const RESOLVERS = [
  { name: 'Cloudflare', url: 'https://cloudflare-dns.com/dns-query' },
  { name: 'Google', url: 'https://dns.google/resolve' },
];

async function doh(
  url: string,
  name: string,
  type: 'MX' | 'A',
  signal?: AbortSignal,
): Promise<DohResponse> {
  const res = await fetch(`${url}?name=${encodeURIComponent(name)}&type=${type}`, {
    headers: { accept: 'application/dns-json' },
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as DohResponse;
}

/** Parse une donnée MX DoH (« 10 mx1.example.com. ») en { priority, host }. */
export function parseMx(data: string): MxRecord {
  const m = data.trim().match(/^(\d+)\s+(.+?)\.?$/);
  if (m) return { priority: Number(m[1]), host: m[2] };
  return { priority: 0, host: data.replace(/\.$/, '') };
}

/** Interroge le DNS d'un domaine (MX puis, à défaut, A) en DNS-over-HTTPS. */
export async function lookupDomain(domain: string, signal?: AbortSignal): Promise<DomainLookup> {
  for (const r of RESOLVERS) {
    try {
      const mxRes = await doh(r.url, domain, 'MX', signal);
      if (mxRes.Status === 3) return { domain, state: 'nxdomain', mx: [], hasA: false, resolver: r.name };

      const mx = (mxRes.Answer ?? [])
        .filter((a) => a.type === 15)
        .map((a) => parseMx(a.data))
        .sort((a, b) => a.priority - b.priority);
      if (mx.length) return { domain, state: 'mx_ok', mx, hasA: true, resolver: r.name };

      const aRes = await doh(r.url, domain, 'A', signal);
      if (aRes.Status === 3) return { domain, state: 'nxdomain', mx: [], hasA: false, resolver: r.name };
      const hasA = (aRes.Answer ?? []).some((a) => a.type === 1);
      return { domain, state: hasA ? 'a_only' : 'no_mail', mx: [], hasA, resolver: r.name };
    } catch {
      // résolveur suivant
    }
  }
  return { domain, state: 'error', mx: [], hasA: false, resolver: '—' };
}

/** Déduit le fournisseur mail à partir du nom d'hôte MX (heuristique sur réels MX). */
export function detectProvider(mx: MxRecord[]): string {
  const host = mx.map((m) => m.host.toLowerCase()).join(' ');
  if (/outlook|protection\.outlook|office365|microsoft/.test(host)) return 'Microsoft 365 (Exchange Online)';
  if (/google|googlemail|aspmx|gmail/.test(host)) return 'Google Workspace';
  if (/pphosted|proofpoint/.test(host)) return 'Proofpoint';
  if (/mimecast/.test(host)) return 'Mimecast';
  if (/iphmx|cisco|ironport/.test(host)) return 'Cisco (IronPort)';
  if (/barracuda/.test(host)) return 'Barracuda';
  if (!mx.length) return 'Indéterminé';
  return 'Serveur dédié / autre';
}
