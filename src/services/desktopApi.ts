// Pont vers l'API native locale exposée par le lanceur desktop (desktop/emailor_app.py).
// En mode web/dev, ces endpoints n'existent pas → capacités désactivées, et l'UI de
// vérification SMTP reste masquée. Aucune dépendance, mêmes origines (127.0.0.1).

import { log } from '../lib/logStore';

export interface Capabilities {
  desktop: boolean;
  smtp: boolean;
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
  | 'invalid_syntax';

export interface SmtpResult {
  email: string;
  domain?: string;
  mx?: string;
  status: SmtpStatus;
  code?: number;
  code_catchall?: number | null;
  catch_all?: boolean;
  message?: string;
  /** Trace détaillée du dialogue (DNS → TCP:25 → SMTP) renvoyée par le backend natif. */
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
        const caps = { desktop: !!j.desktop, smtp: !!j.smtp };
        log.in(`/api/health → desktop=${caps.desktop} smtp=${caps.smtp} (mode natif)`);
        return caps;
      })
      .catch(() => {
        log.info('/api/health absent → mode navigateur (vérif SMTP indisponible)');
        return { desktop: false, smtp: false };
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
