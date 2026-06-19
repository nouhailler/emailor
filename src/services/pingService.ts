// « Ping » d'une adresse email réalisable depuis le navigateur.
//
// Rappel technique : on ne peut pas vérifier l'existence réelle d'une boîte mail
// depuis un navigateur (le handshake SMTP RCPT TO exige un backend — ports SMTP
// bloqués + CORS). En revanche, on peut interroger le DNS en DNS-over-HTTPS pour
// savoir si le domaine existe et s'il sait recevoir des emails (enregistrements MX).
// Cette sonde est passive et publique : compatible avec le mode « sources publiques
// uniquement ».

export type PingStatus =
  | 'invalid_syntax' // l'adresse n'est pas une adresse email valide
  | 'mx_ok' //          le domaine a des MX → peut recevoir des emails
  | 'a_only' //         pas de MX mais le domaine résout (MX implicite possible)
  | 'no_mail' //        le domaine existe mais ne semble pas recevoir d'emails
  | 'domain_error' //   le domaine n'existe pas / introuvable
  | 'network_error'; // impossible de joindre le résolveur DNS

export interface MxRecord {
  priority: number;
  host: string;
}

export interface PingResult {
  email: string;
  domain: string;
  status: PingStatus;
  ok: boolean;
  mx: MxRecord[];
  message: string;
  resolver: string;
  elapsedMs: number;
  checkedAt: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

async function doh(resolver: string, name: string, type: 'MX' | 'A'): Promise<DohResponse> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(`${resolver}?name=${encodeURIComponent(name)}&type=${type}`, {
      headers: { accept: 'application/dns-json' },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as DohResponse;
  } finally {
    clearTimeout(to);
  }
}

/** Parse une donnée MX DoH (« 10 mx1.example.com. ») en { priority, host }. */
function parseMx(data: string): MxRecord {
  const m = data.trim().match(/^(\d+)\s+(.+?)\.?$/);
  if (m) return { priority: Number(m[1]), host: m[2] };
  return { priority: 0, host: data.replace(/\.$/, '') };
}

const MESSAGES: Record<PingStatus, string> = {
  invalid_syntax: "Syntaxe d'adresse invalide.",
  mx_ok: 'Domaine joignable — il accepte les emails (enregistrements MX présents).',
  a_only: 'Domaine actif mais sans MX explicite — réception possible via MX implicite.',
  no_mail: "Le domaine existe mais ne semble pas configuré pour recevoir des emails.",
  domain_error: 'Domaine introuvable — il ne reçoit pas d\'emails.',
  network_error: 'Résolveur DNS injoignable — réessayez.',
};

function build(
  email: string,
  domain: string,
  status: PingStatus,
  mx: MxRecord[],
  resolver: string,
  startedAt: number,
): PingResult {
  return {
    email,
    domain,
    status,
    ok: status === 'mx_ok' || status === 'a_only',
    mx,
    message: MESSAGES[status],
    resolver,
    elapsedMs: Math.round(performance.now() - startedAt),
    checkedAt: Date.now(),
  };
}

/**
 * « Ping » d'une adresse : vérifie la syntaxe puis interroge le DNS (MX, sinon A)
 * en DNS-over-HTTPS pour déterminer si le domaine sait recevoir des emails.
 */
export async function pingEmail(rawEmail: string): Promise<PingResult> {
  const email = rawEmail.trim();
  const startedAt = performance.now();
  const domain = email.split('@')[1] ?? '';

  if (!EMAIL_RE.test(email)) {
    return build(email, domain, 'invalid_syntax', [], '—', startedAt);
  }

  let lastError = false;
  for (const r of RESOLVERS) {
    try {
      const mxRes = await doh(r.url, domain, 'MX');
      // NXDOMAIN = 3 : le domaine n'existe pas.
      if (mxRes.Status === 3) return build(email, domain, 'domain_error', [], r.name, startedAt);

      const mx = (mxRes.Answer ?? [])
        .filter((a) => a.type === 15)
        .map((a) => parseMx(a.data))
        .sort((a, b) => a.priority - b.priority);
      if (mx.length) return build(email, domain, 'mx_ok', mx, r.name, startedAt);

      // Pas de MX : on regarde si le domaine résout (MX implicite via A).
      const aRes = await doh(r.url, domain, 'A');
      if (aRes.Status === 3) return build(email, domain, 'domain_error', [], r.name, startedAt);
      const hasA = (aRes.Answer ?? []).some((a) => a.type === 1);
      return build(email, domain, hasA ? 'a_only' : 'no_mail', [], r.name, startedAt);
    } catch {
      lastError = true;
      // on tente le résolveur suivant
    }
  }

  return build(email, domain, lastError ? 'network_error' : 'no_mail', [], '—', startedAt);
}
