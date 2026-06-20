// Journal réseau partagé : enregistre tous les aller-retours entre Emailor et le
// monde extérieur (DNS-over-HTTPS, API SMTP native, OpenRouter). Simple store
// pub/sub sans dépendance, consommé par useLogs() et affiché dans LogConsole.

export type LogDir = 'out' | 'in' | 'info' | 'err';

export interface LogEntry {
  id: number;
  t: number;
  dir: LogDir;
  msg: string;
}

const MAX = 600; // garde-fou mémoire (lignes les plus anciennes rognées)

let entries: LogEntry[] = [];
let seq = 0;
const listeners = new Set<(e: LogEntry[]) => void>();

function emit(): void {
  for (const l of listeners) l(entries);
}

export function logEvent(dir: LogDir, msg: string): void {
  entries = [...entries, { id: ++seq, t: Date.now(), dir, msg }];
  if (entries.length > MAX) entries = entries.slice(entries.length - MAX);
  emit();
}

/** Helpers directionnels : → sortant, ← entrant, • info, ✗ erreur. */
export const log = {
  out: (m: string) => logEvent('out', m),
  in: (m: string) => logEvent('in', m),
  info: (m: string) => logEvent('info', m),
  err: (m: string) => logEvent('err', m),
};

export function clearLog(): void {
  entries = [];
  emit();
}

export function getLog(): LogEntry[] {
  return entries;
}

export function subscribe(fn: (e: LogEntry[]) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

export function formatTime(t: number): string {
  const d = new Date(t);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

export const PREFIX: Record<LogDir, string> = { out: '→', in: '←', info: '•', err: '✗' };

/** Sérialise le journal en texte brut, prêt à coller pour analyse. */
export function dumpLog(): string {
  if (!entries.length) return '(journal vide)';
  const header = `# Emailor — journal réseau · ${new Date().toISOString()}\n# ${navigator.userAgent}\n`;
  const body = entries.map((e) => `${formatTime(e.t)}  ${PREFIX[e.dir]}  ${e.msg}`).join('\n');
  return `${header}\n${body}\n`;
}
