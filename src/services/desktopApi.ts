// Pont vers l'API native locale exposée par le lanceur desktop (desktop/emailor_app.py).
// En mode web/dev, ces endpoints n'existent pas → capacités désactivées, et l'UI de
// vérification SMTP reste masquée. Aucune dépendance, mêmes origines (127.0.0.1).

import { log } from '../lib/logStore';

export interface Capabilities {
  desktop: boolean;
  smtp: boolean;
  /** Le backend peut relayer les API tierces (Hunter/Abstract/ZeroBounce). */
  providers: boolean;
}

export type SmtpStatus =
  | 'deliverable'
  | 'undeliverable'
  | 'catch_all'
  | 'unknown'
  | 'no_mx'
  | 'timeout'
  | 'unreachable'
  | 'smtp_error'
  | 'provider_error'
  | 'invalid_syntax';

/** Méthode de vérification : sonde SMTP locale, ou API d'un fournisseur tiers. */
export type VerifyMethod = 'smtp' | 'hunter' | 'abstract' | 'zerobounce';

export interface SmtpResult {
  email: string;
  domain?: string;
  mx?: string;
  status: SmtpStatus;
  code?: number;
  code_catchall?: number | null;
  catch_all?: boolean;
  message?: string;
  /** Fournisseur ayant produit le résultat (si vérif via API tierce). */
  provider?: string;
  /** Score de fiabilité 0–100 renvoyé par le fournisseur (si disponible). */
  score?: number;
  /** Trace détaillée du dialogue (DNS → TCP:25 → SMTP, ou appel API) renvoyée par le backend. */
  trace?: string[];
}

let capsPromise: Promise<Capabilities> | null = null;

/** Détecte (une seule fois) si on tourne dans le shell natif avec SMTP réel. */
export function getCapabilities(): Promise<Capabilities> {
  if (!capsPromise) {
    log.out('GET /api/health (détection du shell natif)');
    capsPromise = fetch('/api/health', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('no api'))))
      .then((j) => {
        const caps = { desktop: !!j.desktop, smtp: !!j.smtp, providers: !!j.providers };
        log.in(`/api/health → desktop=${caps.desktop} smtp=${caps.smtp} providers=${caps.providers} (mode natif)`);
        return caps;
      })
      .catch(() => {
        log.info('/api/health absent → mode navigateur (vérif SMTP/API indisponible)');
        return { desktop: false, smtp: false, providers: false };
      });
  }
  return capsPromise;
}

/** Vérification SMTP réelle (RCPT TO sans envoi) via le processus natif. */
export async function verifySmtp(email: string): Promise<SmtpResult> {
  log.out(`GET /api/smtp?email=${email} (vérification SMTP native)`);
  let r: Response;
  try {
    r = await fetch(`/api/smtp?email=${encodeURIComponent(email)}`, { cache: 'no-store' });
  } catch (e) {
    log.err(`/api/smtp injoignable — ${e instanceof Error ? e.message : e}`);
    throw e;
  }
  if (!r.ok) {
    log.err(`/api/smtp → HTTP ${r.status}`);
    throw new Error(`HTTP ${r.status}`);
  }
  const result = (await r.json()) as SmtpResult;

  // Rejoue la trace détaillée du backend (DNS → TCP:25 → SMTP) dans le journal.
  log.info(`── trace backend SMTP (${email}) ──`);
  for (const line of result.trace ?? []) log.info(`  ${line}`);
  const detail = [
    `statut=${result.status}`,
    result.mx ? `mx=${result.mx}` : '',
    typeof result.code === 'number' ? `rcpt=${result.code}` : '',
    result.catch_all ? 'catch-all' : '',
  ]
    .filter(Boolean)
    .join(' · ');
  log.in(`/api/smtp → ${detail}`);
  return result;
}

/** Vérification via une API tierce (Hunter/Abstract/ZeroBounce) relayée par le backend. */
async function verifyViaProvider(email: string, provider: VerifyMethod, key: string): Promise<SmtpResult> {
  log.out(`GET /api/verify?provider=${provider}&email=${email} (vérification via ${provider})`);
  let r: Response;
  try {
    r = await fetch(
      `/api/verify?provider=${provider}&email=${encodeURIComponent(email)}&key=${encodeURIComponent(key)}`,
      { cache: 'no-store' },
    );
  } catch (e) {
    log.err(`/api/verify injoignable — ${e instanceof Error ? e.message : e}`);
    throw e;
  }
  if (!r.ok) {
    log.err(`/api/verify → HTTP ${r.status}`);
    throw new Error(`HTTP ${r.status}`);
  }
  const result = (await r.json()) as SmtpResult;
  log.info(`── trace ${provider} (${email}) ──`);
  for (const line of result.trace ?? []) log.info(`  ${line}`);
  log.in(`/api/verify (${provider}) → ${result.status}${result.catch_all ? ' · catch-all' : ''}`);
  return result;
}

/**
 * Vérifie une adresse par la méthode choisie : sonde SMTP locale (port 25) ou API
 * d'un fournisseur tiers (insensible au blocage du port 25). Toutes renvoient le
 * même `SmtpResult`, donc l'UI et le score restent identiques.
 */
export function verifyEmail(email: string, method: VerifyMethod, key = ''): Promise<SmtpResult> {
  return method === 'smtp' ? verifySmtp(email) : verifyViaProvider(email, method, key);
}
