import { lookupDomain, type DomainLookup } from './dns';
import { buildUserPrompt, SYSTEM_PROMPT } from './llmPrompt';
import { revealScenario } from './revealScenario';
import { buildDnsTechCheck } from './techCheck';
import type { SearchHandlers, SearchService } from './searchService';
import type {
  Candidate,
  DomainGuess,
  EmailFormat,
  Identity,
  IdentitySignal,
  ReasonKind,
  ReasonLine,
  Scenario,
  Source,
} from '../types';

const CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
}

// --- Forme (souple) du JSON renvoyé par le LLM ---
interface LlmResult {
  reasoning?: { text?: string; kind?: string }[];
  identity?: {
    canonical?: string;
    confidence?: number;
    summary?: string;
    candidates?: { name?: string; score?: number; note?: string; canonical?: boolean }[];
    signals?: {
      title?: string;
      weight?: string;
      desc?: string;
      items?: { tag?: string; text?: string }[];
      chips?: string[];
      verdict?: string;
    }[];
  };
  domains?: { domain?: string; score?: number; reason?: string }[];
  format?: {
    primary?: string;
    confidence?: number;
    example?: string;
    distribution?: { fmt?: string; pct?: number }[];
    samples?: string[];
  };
  candidates?: { email?: string; score?: number; note?: string }[];
}

const clamp = (n: unknown, def = 0): number => {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : def;
  return Math.max(0, Math.min(100, v));
};

const REASON_KINDS: ReasonKind[] = ['info', 'discovery', 'success', 'fail'];
const asKind = (k: unknown): ReasonKind =>
  REASON_KINDS.includes(k as ReasonKind) ? (k as ReasonKind) : 'info';

/** Extrait le premier objet JSON d'une réponse LLM (tolère fences et prose). */
function parseLoose(content: string): LlmResult {
  let s = content.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start !== -1 && end > start) s = s.slice(start, end + 1);
  return JSON.parse(s) as LlmResult;
}

async function callLLM(
  input: Parameters<SearchService['run']>[0],
  config: OpenRouterConfig,
  signal: AbortSignal,
): Promise<LlmResult> {
  const res = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': typeof location !== 'undefined' ? location.origin : 'https://emailor.local',
      'X-Title': 'Emailor',
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.3,
      max_tokens: 2200,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(input) },
      ],
    }),
    signal,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${res.status} — ${body.slice(0, 160)}`);
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content ?? '';
  if (!content) throw new Error('Réponse vide du modèle.');
  return parseLoose(content);
}

// --- Construction d'un Scenario HONNÊTE à partir du LLM + DNS réel ---

function buildIdentity(llm: LlmResult, input: { prenom: string; nom: string }): Identity {
  const id = llm.identity ?? {};
  const fallbackName = `${input.prenom} ${input.nom}`.trim() || 'Identité recherchée';
  const candidates = (id.candidates ?? []).map((c) => ({
    name: c.name ?? fallbackName,
    score: clamp(c.score, 50),
    note: c.note ?? '',
    canonical: !!c.canonical,
  }));
  if (!candidates.length) {
    candidates.push({ name: fallbackName, score: 100, note: 'requête initiale', canonical: true });
  }
  const signals: IdentitySignal[] = (id.signals ?? []).slice(0, 5).map((s, i) => ({
    num: i + 1,
    title: s.title ?? 'Signal',
    weight: s.weight ?? '',
    desc: s.desc ?? '',
    items: (s.items ?? []).map((it) => ({ tag: it.tag ?? '≈', text: it.text ?? '' })),
    chips: s.chips ?? [],
    verdict: s.verdict ?? '',
  }));
  return {
    canonical: id.canonical ?? fallbackName,
    confidence: clamp(id.confidence, 30),
    summary: id.summary ?? 'Hypothèse déduite — aucune trace publique confirmée.',
    candidates,
    signals,
  };
}

function buildFormat(llm: LlmResult): EmailFormat {
  const f = llm.format ?? {};
  const distribution = (f.distribution ?? [])
    .map((d) => ({ fmt: d.fmt ?? '', pct: clamp(d.pct) }))
    .filter((d) => d.fmt);
  return {
    primary: f.primary ?? 'prénom.nom',
    confidence: clamp(f.confidence, 40),
    example: f.example ?? '',
    distribution: distribution.length ? distribution : [{ fmt: f.primary ?? 'prénom.nom', pct: clamp(f.confidence, 40) }],
    samples: (f.samples ?? []).slice(0, 4),
  };
}

function buildDomains(llm: LlmResult, lookups: Map<string, DomainLookup>): DomainGuess[] {
  return (llm.domains ?? []).slice(0, 5).map((d) => {
    const domain = d.domain ?? '';
    const dns = lookups.get(domain);
    const mxOk = dns?.state === 'mx_ok';
    const aOnly = dns?.state === 'a_only';
    const nxdomain = dns?.state === 'nxdomain';
    const score = nxdomain ? 8 : mxOk ? Math.max(clamp(d.score, 60), 55) : clamp(d.score, 30);
    return {
      domain,
      score,
      mx: mxOk ? true : aOnly ? 'partial' : false,
      site: 'partial', // non vérifiable côté navigateur (CORS) → marqué « ~ »
      pub: 0, // aucune adresse publique scrappée
    };
  });
}

function buildCandidates(llm: LlmResult, primaryState: DomainLookup['state'] | undefined): Candidate[] {
  // Aucune vérif SMTP → rien n'est « valide ». Tout est « incertain », sauf domaine
  // inexistant → « invalide ».
  return (llm.candidates ?? [])
    .map((c) => {
      const email = c.email ?? '';
      const domainOfEmail = email.split('@')[1] ?? '';
      const noDomain = primaryState === 'nxdomain' && domainOfEmail && email.endsWith(domainOfEmail);
      return {
        email,
        score: clamp(c.score, 40),
        statusFinal: (noDomain ? 'invalide' : 'incertain') as Candidate['statusFinal'],
        smtp: 'unknown' as const,
        web: 'none' as const,
      };
    })
    .filter((c) => c.email.includes('@'))
    .sort((a, b) => b.score - a.score);
}

function buildReasoning(llm: LlmResult): ReasonLine[] {
  const lines: ReasonLine[] = (llm.reasoning ?? [])
    .map((r) => ({ text: r.text ?? '', kind: asKind(r.kind) }))
    .filter((r) => r.text);
  lines.push({
    text: 'Aucune vérification SMTP réelle effectuée (nécessite un backend) — adresses non confirmées.',
    kind: 'info',
  });
  return lines;
}

/** Domaines à résoudre en DNS : ceux du LLM + le domaine fourni, dédupliqués. */
function domainsToResolve(llm: LlmResult, providedDomain: string): string[] {
  const set = new Set<string>();
  const add = (d?: string) => {
    const clean = (d ?? '').trim().toLowerCase().replace(/^@/, '');
    if (clean && clean.includes('.')) set.add(clean);
  };
  add(providedDomain);
  (llm.domains ?? []).forEach((d) => add(d.domain));
  (llm.candidates ?? []).forEach((c) => add((c.email ?? '').split('@')[1]));
  return [...set].slice(0, 6);
}

/**
 * Service de recherche RÉEL : interroge le modèle OpenRouter pour le raisonnement,
 * la résolution d'identité et les hypothèses d'adresses, puis vérifie les domaines en
 * DNS réel. Rien n'est inventé ; la vérification SMTP reste marquée « non vérifiée ».
 */
export function createOpenRouterSearchService(getConfig: () => OpenRouterConfig): SearchService {
  return {
    run(input, handlers: SearchHandlers) {
      const controller = new AbortController();
      let cancelReveal: (() => void) | null = null;
      let cancelled = false;

      const config = getConfig();
      const shortModel = config.model.split('/').pop()?.replace(':free', '') ?? config.model;
      handlers.onReasoning({ text: `Interrogation du modèle ${shortModel}…`, kind: 'info' });

      (async () => {
        try {
          if (!config.apiKey.trim()) throw new Error('Clé API OpenRouter manquante.');
          if (!config.model) throw new Error('Aucun modèle sélectionné.');

          const llm = await callLLM(input, config, controller.signal);
          if (cancelled) return;

          // DNS réel des domaines candidats (en parallèle).
          const domains = domainsToResolve(llm, input.domaine);
          const results = await Promise.all(domains.map((d) => lookupDomain(d, controller.signal)));
          if (cancelled) return;
          const lookups = new Map(results.map((r) => [r.domain, r]));

          const domainGuesses = buildDomains(llm, lookups);
          const primary =
            [...domainGuesses].sort((a, b) => b.score - a.score).map((d) => lookups.get(d.domain))[0] ??
            results[0];

          const scenario: Scenario = {
            reasoning: buildReasoning(llm),
            identity: buildIdentity(llm, input),
            domains: domainGuesses,
            format: buildFormat(llm),
            sources: [] as Source[], // aucune source réellement consultée → section masquée
            candidates: buildCandidates(llm, primary?.state),
            techCheck: buildDnsTechCheck(primary),
          };

          cancelReveal = revealScenario(scenario, handlers);
        } catch (e) {
          if (cancelled || controller.signal.aborted) return;
          const msg = e instanceof Error ? e.message : 'Erreur inconnue';
          handlers.onReasoning({ text: `Échec de la recherche réelle : ${msg}`, kind: 'fail' });
          handlers.onReasoning({
            text: 'Vérifiez votre clé API et le modèle sélectionné dans les Paramètres.',
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
