import { slug } from '../lib/normalize';

/**
 * Fournisseurs d'email **personnels** (grand public). Quand l'utilisateur saisit
 * « gmail » dans la zone Société (ou un de ces domaines dans Domaine), on ne cherche
 * PAS l'entreprise correspondante : on génère des adresses personnelles sur le
 * domaine du fournisseur (ex. prenom.nom@gmail.com).
 */
export interface FreeProvider {
  name: string;
  domain: string;
  /** Gmail ignore les points (prenom.nom == prenomnom, même boîte). */
  dotless?: boolean;
}

const GMAIL: FreeProvider = { name: 'Gmail', domain: 'gmail.com', dotless: true };

/**
 * Table alias → fournisseur résolu. Le **domaine saisi est respecté** : « hotmail »
 * donne `@hotmail.com` (et non `@outlook.com`), « yahoo.fr » donne `@yahoo.fr`, etc.
 */
const ALIASES: Record<string, FreeProvider> = {
  // Google
  gmail: GMAIL,
  'gmail.com': GMAIL,
  googlemail: GMAIL,
  'googlemail.com': { name: 'Gmail', domain: 'googlemail.com', dotless: true },
  // Microsoft (domaines distincts, tous Microsoft)
  hotmail: { name: 'Hotmail', domain: 'hotmail.com' },
  'hotmail.com': { name: 'Hotmail', domain: 'hotmail.com' },
  'hotmail.fr': { name: 'Hotmail', domain: 'hotmail.fr' },
  outlook: { name: 'Outlook', domain: 'outlook.com' },
  'outlook.com': { name: 'Outlook', domain: 'outlook.com' },
  'outlook.fr': { name: 'Outlook', domain: 'outlook.fr' },
  live: { name: 'Live', domain: 'live.com' },
  'live.com': { name: 'Live', domain: 'live.com' },
  'live.fr': { name: 'Live', domain: 'live.fr' },
  msn: { name: 'MSN', domain: 'msn.com' },
  'msn.com': { name: 'MSN', domain: 'msn.com' },
  // Yahoo
  yahoo: { name: 'Yahoo', domain: 'yahoo.com' },
  'yahoo.com': { name: 'Yahoo', domain: 'yahoo.com' },
  'yahoo.fr': { name: 'Yahoo', domain: 'yahoo.fr' },
  ymail: { name: 'Yahoo', domain: 'yahoo.com' },
  'ymail.com': { name: 'Yahoo', domain: 'ymail.com' },
  // Proton
  proton: { name: 'Proton', domain: 'proton.me' },
  'proton.me': { name: 'Proton', domain: 'proton.me' },
  protonmail: { name: 'Proton', domain: 'protonmail.com' },
  'protonmail.com': { name: 'Proton', domain: 'protonmail.com' },
  // Apple
  icloud: { name: 'iCloud', domain: 'icloud.com' },
  'icloud.com': { name: 'iCloud', domain: 'icloud.com' },
  'me.com': { name: 'iCloud', domain: 'me.com' },
  'mac.com': { name: 'iCloud', domain: 'mac.com' },
  // FAI français
  orange: { name: 'Orange', domain: 'orange.fr' },
  'orange.fr': { name: 'Orange', domain: 'orange.fr' },
  wanadoo: { name: 'Orange (Wanadoo)', domain: 'wanadoo.fr' },
  'wanadoo.fr': { name: 'Orange (Wanadoo)', domain: 'wanadoo.fr' },
  sfr: { name: 'SFR', domain: 'sfr.fr' },
  'sfr.fr': { name: 'SFR', domain: 'sfr.fr' },
  'neuf.fr': { name: 'SFR (Neuf)', domain: 'neuf.fr' },
  laposte: { name: 'La Poste', domain: 'laposte.net' },
  'laposte.net': { name: 'La Poste', domain: 'laposte.net' },
  'free.fr': { name: 'Free', domain: 'free.fr' },
};

function normValue(v: string): string {
  return (v || '').trim().toLowerCase().replace(/^@/, '');
}

/**
 * Détecte un fournisseur personnel à partir de la Société ou du Domaine.
 * Le Domaine prime (s'il vaut hotmail.com), sinon on regarde la Société.
 */
export function detectFreeProvider(societe: string, domaine: string): FreeProvider | null {
  for (const candidate of [normValue(domaine), normValue(societe)]) {
    if (candidate && ALIASES[candidate]) return ALIASES[candidate];
  }
  return null;
}

export interface PersonalCandidate {
  email: string;
  score: number;
  note: string;
}

/**
 * Génère les formats d'adresse personnels les plus courants. Les adresses
 * personnelles sont peu prévisibles (surnoms, année de naissance…) : les scores
 * restent modestes et honnêtes — ce sont des hypothèses, non des certitudes.
 */
export function personalCandidates(prenom: string, nom: string, provider: FreeProvider): PersonalCandidate[] {
  const p = slug(prenom);
  const n = slug(nom);
  const d = provider.domain;
  if (!p && !n) return [];

  const raw: PersonalCandidate[] = [];
  const add = (local: string, score: number, note: string) => {
    if (local) raw.push({ email: `${local}@${d}`, score, note });
  };

  add(`${p}.${n}`, 55, 'prénom.nom (le plus courant)');
  add(`${p}${n}`, 48, provider.dotless ? 'prénomnom (≡ prénom.nom sur Gmail)' : 'prénomnom');
  add(`${n}.${p}`, 32, 'nom.prénom');
  add(`${p}_${n}`, 28, 'prénom_nom');
  add(`${p}${n[0] ?? ''}`, 24, 'prénom + initiale du nom');
  add(`${p[0] ?? ''}${n}`, 22, 'initiale + nom');

  const seen = new Set<string>();
  return raw.filter((c) => (seen.has(c.email) ? false : (seen.add(c.email), true))).sort((a, b) => b.score - a.score);
}
