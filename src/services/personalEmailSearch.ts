import { lookupDomain } from './dns';
import { detectFreeProvider, personalCandidates, type FreeProvider } from './freeProviders';
import { cap } from '../lib/normalize';
import { revealScenario } from './revealScenario';
import { buildDnsTechCheck } from './techCheck';
import type { SearchService } from './searchService';
import type { Candidate, DomainGuess, ReasonLine, Scenario, SearchInput } from '../types';

function reasoning(input: SearchInput, provider: FreeProvider, dotless: boolean): ReasonLine[] {
  const who = `${cap(input.prenom)} ${cap(input.nom)}`.trim() || 'la personne';
  const lines: ReasonLine[] = [
    { text: `« ${input.societe || provider.name} » reconnu comme fournisseur d'email personnel — pas une entreprise.`, kind: 'discovery' },
    { text: `Génération des formats personnels courants pour ${who} sur ${provider.domain}.`, kind: 'info' },
  ];
  if (dotless) {
    lines.push({
      text: `Gmail ignore les points : prénom.nom et prénomnom pointent vers la même boîte.`,
      kind: 'info',
    });
  }
  lines.push({
    text: `Les adresses personnelles sont peu prévisibles (surnoms, année de naissance…) : confiance limitée, non vérifiée.`,
    kind: 'info',
  });
  return lines;
}

/**
 * Recherche dédiée aux **adresses email personnelles**. Aucun LLM, aucune résolution
 * d'identité d'entreprise : on génère les formats courants sur le domaine du
 * fournisseur (gmail.com…) et on vérifie le domaine en DNS réel. Honnête : tout reste
 * « incertain » tant qu'aucune vérification SMTP n'est faite.
 */
export function createPersonalEmailSearchService(provider: FreeProvider): SearchService {
  return {
    run(input, handlers) {
      const controller = new AbortController();
      let cancelReveal: (() => void) | null = null;
      let cancelled = false;

      const cands = personalCandidates(input.prenom, input.nom, provider);

      (async () => {
        try {
          const dns = await lookupDomain(provider.domain, controller.signal);
          if (cancelled) return;

          const hasMx = dns.state === 'mx_ok';
          const candidates: Candidate[] = cands.map((c) => ({
            email: c.email,
            score: c.score,
            statusFinal: hasMx ? 'incertain' : 'invalide',
            smtp: 'unknown',
            web: 'none',
          }));

          const domains: DomainGuess[] = [
            {
              domain: provider.domain,
              score: hasMx ? 95 : 20,
              mx: hasMx ? true : dns.state === 'a_only' ? 'partial' : false,
              site: true, // domaine grand public connu
              pub: 0,
            },
          ];

          const scenario: Scenario = {
            reasoning: reasoning(input, provider, !!provider.dotless),
            // Identité non émise (skipIdentity) : non pertinente pour une adresse perso.
            identity: {
              canonical: `${cap(input.prenom)} ${cap(input.nom)}`.trim(),
              confidence: 0,
              summary: '',
              candidates: [],
            },
            domains,
            format: {
              primary: 'prénom.nom',
              confidence: 50,
              example: cands[0]?.email.split('@')[0] ?? '',
              distribution: [
                { fmt: 'prénom.nom', pct: 50 },
                { fmt: 'prénomnom', pct: 30 },
                { fmt: 'nom.prénom', pct: 12 },
                { fmt: 'autres', pct: 8 },
              ],
              samples: cands.slice(0, 3).map((c) => c.email),
            },
            sources: [],
            candidates,
            techCheck: buildDnsTechCheck(dns),
          };

          cancelReveal = revealScenario(scenario, handlers, { skipIdentity: true });
        } catch (e) {
          if (cancelled || controller.signal.aborted) return;
          const msg = e instanceof Error ? e.message : 'Erreur inconnue';
          handlers.onReasoning({ text: `Échec de la recherche : ${msg}`, kind: 'fail' });
          handlers.onDone(null);
        }
      })();

      return () => {
        cancelled = true;
        controller.abort();
        cancelReveal?.();
      };
    },
  };
}

/** Construit le service si la saisie correspond à un fournisseur personnel, sinon null. */
export function maybePersonalSearch(input: SearchInput): SearchService | null {
  const provider = detectFreeProvider(input.societe, input.domaine);
  return provider ? createPersonalEmailSearchService(provider) : null;
}
