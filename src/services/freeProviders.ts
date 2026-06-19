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
  aliases: string[];
  /** Gmail ignore les points (prenom.nom == prenomnom, même boîte). */
  dotless?: boolean;
}

const PROVIDERS: FreeProvider[] = [
  { name: 'Gmail', domain: 'gmail.com', aliases: ['gmail', 'googlemail', 'gmail.com', 'googlemail.com'], dotless: true },
  {
    name: 'Outlook / Hotmail',
    domain: 'outlook.com',
    aliases: ['outlook', 'hotmail', 'live', 'msn', 'outlook.com', 'hotmail.com', 'hotmail.fr', 'live.com', 'live.fr', 'msn.com'],
  },
  { name: 'Yahoo', domain: 'yahoo.com', aliases: ['yahoo', 'ymail', 'yahoo.com', 'yahoo.fr', 'ymail.com'] },
  { name: 'Proton', domain: 'proton.me', aliases: ['proton', 'protonmail', 'proton.me', 'protonmail.com'] },
  { name: 'iCloud', domain: 'icloud.com', aliases: ['icloud', 'icloud.com', 'me.com', 'mac.com'] },
  { name: 'Orange', domain: 'orange.fr', aliases: ['orange', 'orange.fr', 'wanadoo', 'wanadoo.fr'] },
  { name: 'SFR', domain: 'sfr.fr', aliases: ['sfr', 'sfr.fr', 'neuf.fr'] },
  { name: 'La Poste', domain: 'laposte.net', aliases: ['laposte', 'laposte.net'] },
  { name: 'Free', domain: 'free.fr', aliases: ['free.fr'] },
];

function normValue(v: string): string {
  return (v || '').trim().toLowerCase();
}

/**
 * Détecte un fournisseur personnel à partir de la Société ou du Domaine.
 * Le Domaine prime (s'il vaut gmail.com), sinon on regarde la Société.
 */
export function detectFreeProvider(societe: string, domaine: string): FreeProvider | null {
  const dom = normValue(domaine);
  const soc = normValue(societe);
  for (const candidate of [dom, soc]) {
    if (!candidate) continue;
    const found = PROVIDERS.find(
      (p) => p.aliases.includes(candidate) || candidate === p.domain || candidate.endsWith('@' + p.domain),
    );
    if (found) return found;
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

  // Déduplication (sur Gmail, prénom.nom et prénomnom mènent à la même boîte,
  // mais restent deux graphies distinctes à proposer).
  const seen = new Set<string>();
  return raw.filter((c) => (seen.has(c.email) ? false : (seen.add(c.email), true))).sort((a, b) => b.score - a.score);
}
