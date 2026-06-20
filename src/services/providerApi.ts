// Pont front → backend natif pour la recherche d'email via fournisseur (Hunter).
// La vérification de délivrabilité, elle, passe par desktopApi.verifyEmail().

import { log } from '../lib/logStore';
import type { SearchInput } from '../types';

export interface HunterSource {
  label: string;
  detail: string;
}

export interface HunterFindResult {
  found: boolean;
  email?: string;
  score?: number;
  domain?: string;
  pattern?: string;
  position?: string;
  company?: string;
  sources?: HunterSource[];
  message?: string;
  trace?: string[];
}

/** Recherche l'adresse la plus probable via Hunter Email Finder (relayé par le backend). */
export async function findWithHunter(input: SearchInput, key: string): Promise<HunterFindResult> {
  const params = new URLSearchParams({ source: 'hunter', first: input.prenom, last: input.nom, key });
  if (input.domaine) params.set('domain', input.domaine);
  else if (input.societe) params.set('company', input.societe);

  log.out(`GET /api/find?source=hunter (${input.domaine || input.societe}, ${input.prenom} ${input.nom})`);
  const r = await fetch(`/api/find?${params.toString()}`, { cache: 'no-store' });
  if (!r.ok) {
    log.err(`/api/find → HTTP ${r.status}`);
    throw new Error(`HTTP ${r.status}`);
  }
  const result = (await r.json()) as HunterFindResult;
  log.info(`── trace Hunter find (${input.prenom} ${input.nom}) ──`);
  for (const line of result.trace ?? []) log.info(`  ${line}`);
  log.in(`/api/find (hunter) → ${result.found ? `${result.email} (score ${result.score})` : 'aucune adresse'}`);
  return result;
}
