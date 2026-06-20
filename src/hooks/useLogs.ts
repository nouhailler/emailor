import { useSyncExternalStore } from 'react';
import { getLog, subscribe, type LogEntry } from '../lib/logStore';

/** Abonne un composant au journal réseau partagé (re-render à chaque nouvelle ligne). */
export function useLogs(): LogEntry[] {
  return useSyncExternalStore(subscribe, getLog, getLog);
}
