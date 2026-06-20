import { lookupDomain } from './dns';
import { cap } from '../lib/normalize';
import { findWithHunter } from './providerApi';
import { revealScenario } from './revealScenario';
import { buildDnsTechCheck } from './techCheck';
import type { SearchService } from './searchService';
import type { Candidate, DomainGuess, ReasonLine, Scenario, Source } from '../types';

/**
 * Service de recherche RÉEL via **Hunter.io** (Email Finder) : Hunter renvoie
 * l'adresse la plus probable, un score, le format (pattern) et — précieux — les
 * **sources publiques réelles** où l'adresse a été observée. On vérifie ensuite le
 * domaine en DNS réel. Le signal « adresse observée publiquement » (+40 au score)
 * peut donc s'activer **honnêtement**, contrairement à la recherche LLM.
 *
 * La délivrabilité reste « non vérifiée » ici : elle se confirme via « Vérifier la
 * boîte » (SMTP local ou API Hunter/Abstract/ZeroBounce).
 */
export function createHunterSearchService(getKey: () => string): SearchService {
  return {
    run(input, handlers) {
      const controller = new AbortController();
      let cancelReveal: (() => void) | null = null;
      let cancelled = false;

      handlers.onReasoning({ text: 'Recherche via Hunter.io (base d\'adresses publiées)…', kind: 'info' });

      (async () => {
        try {
          const res = await findWithHunter(input, getKey());
          if (cancelled) return;

          if (!res.found || !res.email) {
            handlers.onReasoning({
              text: res.message || 'Hunter n\'a trouvé aucune adresse pour cette personne.',
              kind: 'fail',
            });
            handlers.onReasoning({
              text: 'Essayez le domaine exact, ou basculez sur la recherche par modèle (OpenRouter).',
              kind: 'info',
            });
            handlers.onDone(null);
            return;
          }

          const email = res.email;
          const domain = res.domain || email.split('@')[1] || '';
          const dns = await lookupDomain(domain, controller.signal);
          if (cancelled) return;

          const hasMx = dns.state === 'mx_ok';
          const nxdomain = dns.state === 'nxdomain';
          const observed = (res.sources?.length ?? 0) > 0;

          const reasoning: ReasonLine[] = [
            {
              text: `Hunter a retenu ${email}${res.position ? ` (${res.position})` : ''} avec une confiance de ${
                res.score ?? '?'
              } %.`,
              kind: 'success',
            },
          ];
          if (observed) {
            reasoning.push({
              text: `${res.sources!.length} source(s) publique(s) où cette adresse a été vue — observation réelle, pas une hypothèse.`,
              kind: 'discovery',
            });
          }
          reasoning.push({
            text: hasMx
              ? `Domaine ${domain} vérifié en DNS réel : il accepte les emails (MX présents).`
              : `Domaine ${domain} : ${nxdomain ? 'introuvable' : 'sans MX explicite'} (DNS réel).`,
            kind: hasMx ? 'info' : 'fail',
          });
          reasoning.push({
            text: 'Délivrabilité de la boîte non vérifiée ici — utilisez « Vérifier la boîte » (SMTP ou API).',
            kind: 'info',
          });

          const sources: Source[] = (res.sources ?? []).map((s) => ({
            label: s.label || 'source',
            status: 'found',
            detail: s.detail,
          }));

          const domains: DomainGuess[] = [
            {
              domain,
              score: nxdomain ? 8 : hasMx ? Math.max(res.score ?? 60, 60) : res.score ?? 35,
              mx: hasMx ? true : dns.state === 'a_only' ? 'partial' : false,
              site: 'partial',
              pub: res.sources?.length ?? 0,
            },
          ];

          const candidate: Candidate = {
            email,
            score: res.score ?? 60,
            statusFinal: nxdomain ? 'invalide' : 'incertain',
            smtp: 'unknown',
            web: observed ? 'ok' : 'none', // observé publiquement → active +40 honnêtement
          };

          const localPart = email.split('@')[0] ?? '';
          const scenario: Scenario = {
            reasoning,
            // Hunter ne fait pas de résolution d'identité → identité non émise.
            identity: {
              canonical: `${cap(input.prenom)} ${cap(input.nom)}`.trim(),
              confidence: 0,
              summary: '',
              candidates: [],
            },
            domains,
            format: {
              primary: res.pattern || 'prénom.nom',
              confidence: res.score ?? 50,
              example: localPart,
              distribution: [{ fmt: res.pattern || 'prénom.nom', pct: res.score ?? 50 }],
              samples: [email],
            },
            sources,
            candidates: [candidate],
            techCheck: buildDnsTechCheck(dns),
          };

          cancelReveal = revealScenario(scenario, handlers, { skipIdentity: true });
        } catch (e) {
          if (cancelled || controller.signal.aborted) return;
          const msg = e instanceof Error ? e.message : 'Erreur inconnue';
          handlers.onReasoning({ text: `Échec de la recherche Hunter : ${msg}`, kind: 'fail' });
          handlers.onReasoning({
            text: 'La recherche Hunter nécessite l\'app desktop (proxy natif) et une clé API valide.',
            kind: 'info',
          });
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
