// Pont vers l'API native locale exposée par le lanceur desktop (desktop/emailor_app.py).
// En mode web/dev, ces endpoints n'existent pas → capacités désactivées, et l'UI de
// vérification SMTP reste masquée. Aucune dépendance, mêmes origines (127.0.0.1).

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
}

let capsPromise: Promise<Capabilities> | null = null;

/** Détecte (une seule fois) si on tourne dans le shell natif avec SMTP réel. */
export function getCapabilities(): Promise<Capabilities> {
  if (!capsPromise) {
    capsPromise = fetch('/api/health', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('no api'))))
      .then((j) => ({ desktop: !!j.desktop, smtp: !!j.smtp }))
      .catch(() => ({ desktop: false, smtp: false }));
  }
  return capsPromise;
}

/** Vérification SMTP réelle (RCPT TO sans envoi) via le processus natif. */
export async function verifySmtp(email: string): Promise<SmtpResult> {
  const r = await fetch(`/api/smtp?email=${encodeURIComponent(email)}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.json()) as SmtpResult;
}
