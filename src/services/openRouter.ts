import type { FreeModel } from '../types';

const MODELS_URL = 'https://openrouter.ai/api/v1/models';

/** Liste de secours affichée si l'API OpenRouter est injoignable. */
export const STATIC_FREE_MODELS: FreeModel[] = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B Instruct', ctx: 65536 },
  { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1', ctx: 64000 },
  { id: 'deepseek/deepseek-chat-v3-0324:free', name: 'DeepSeek V3 (0324)', ctx: 64000 },
  { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (exp)', ctx: 1048576 },
  { id: 'qwen/qwen-2.5-72b-instruct:free', name: 'Qwen 2.5 72B Instruct', ctx: 32768 },
  { id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Llama 3.2 3B Instruct', ctx: 131072 },
  { id: 'mistralai/mistral-nemo:free', name: 'Mistral Nemo', ctx: 128000 },
  { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B Instruct', ctx: 32768 },
];

interface OpenRouterModel {
  id?: string;
  name?: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
}

export class ModelFetchError extends Error {
  constructor(
    message: string,
    /** Liste de secours à afficher malgré l'échec. */
    public readonly fallback: FreeModel[],
  ) {
    super(message);
    this.name = 'ModelFetchError';
  }
}

/**
 * Charge la liste des modèles gratuits depuis OpenRouter (`:free` ou pricing 0),
 * triés par taille de contexte décroissante. En cas d'échec, lève une
 * `ModelFetchError` portant la liste de secours.
 */
export async function fetchFreeModels(timeoutMs = 8000): Promise<FreeModel[]> {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), timeoutMs);
    let json: { data?: OpenRouterModel[] };
    try {
      const res = await fetch(MODELS_URL, { signal: ctrl.signal });
      json = await res.json();
    } finally {
      clearTimeout(to);
    }
    const free = (json.data ?? [])
      .filter(
        (m) =>
          (m.id ?? '').endsWith(':free') ||
          (m.pricing != null &&
            m.pricing.prompt === '0' &&
            (m.pricing.completion === '0' || m.pricing.completion === undefined)),
      )
      .map<FreeModel>((m) => ({
        id: m.id ?? '',
        name: (m.name ?? m.id ?? '').replace(/\s*\(free\)\s*$/i, ''),
        ctx: m.context_length ?? 0,
      }))
      .sort((a, b) => b.ctx - a.ctx);
    if (!free.length) throw new Error('empty');
    return free;
  } catch {
    throw new ModelFetchError(
      'Liste de secours affichée — connexion à OpenRouter impossible pour le moment.',
      STATIC_FREE_MODELS,
    );
  }
}

/** Format compact du contexte (1.0M ctx · 64K ctx · …). */
export function formatCtx(n: number): string {
  if (!n) return '—';
  if (n >= 1_000_000) return (n % 1_000_000 === 0 ? n / 1_000_000 : (n / 1_000_000).toFixed(1)) + 'M ctx';
  if (n >= 1000) return Math.round(n / 1000) + 'K ctx';
  return n + ' ctx';
}

/** Nom lisible d'un modèle à partir de son id (fallback si absent de la liste). */
export function modelNameFromId(id: string, models: FreeModel[]): string {
  const m = models.find((x) => x.id === id);
  if (m) return m.name;
  return (id || '').split('/').pop()!.replace(':free', '');
}
