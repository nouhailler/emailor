import { useCallback, useEffect, useRef, useState } from 'react';
import type { CancelSearch, SearchService } from '../services/searchService';
import type {
  Candidate,
  DomainGuess,
  EmailFormat,
  IdentityHeader,
  IdentitySignal,
  Phase,
  ReasonLine,
  ScoringRow,
  SearchInput,
  Source,
  TechTest,
} from '../types';

const EMPTY = {
  reasoning: [] as ReasonLine[],
  candidates: [] as Candidate[],
  sources: [] as Source[],
  domains: [] as DomainGuess[],
  format: null as EmailFormat | null,
  identity: null as IdentityHeader | null,
  idSignals: [] as IdentitySignal[],
  techTests: [] as TechTest[],
  techScoring: [] as ScoringRow[],
  best: null as Candidate | null,
};

export interface EmailSearchState {
  phase: Phase;
  reasoning: ReasonLine[];
  candidates: Candidate[];
  sources: Source[];
  domains: DomainGuess[];
  format: EmailFormat | null;
  identity: IdentityHeader | null;
  idSignals: IdentitySignal[];
  techTests: TechTest[];
  techScoring: ScoringRow[];
  best: Candidate | null;
  copied: boolean;
}

export interface EmailSearch extends EmailSearchState {
  run(input: SearchInput, service: SearchService): void;
  reset(): void;
  copyBest(): void;
}

/**
 * Orchestre la recherche et la révélation progressive des résultats. Branche les
 * callbacks du `searchService` sur l'état React.
 */
export function useEmailSearch(): EmailSearch {
  const [state, setState] = useState<EmailSearchState>({ phase: 'idle', ...EMPTY, copied: false });
  const cancelRef = useRef<CancelSearch | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = useCallback(() => {
    cancelRef.current?.();
    cancelRef.current = null;
  }, []);

  useEffect(() => () => {
    cancel();
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, [cancel]);

  const run = useCallback(
    (input: SearchInput, service: SearchService) => {
      cancel();
      setState({ phase: 'searching', ...EMPTY, copied: false });
      cancelRef.current = service.run(input, {
        onReasoning: (line) => setState((s) => ({ ...s, reasoning: [...s.reasoning, line] })),
        onSource: (src) => setState((s) => ({ ...s, sources: [...s.sources, src] })),
        onDomain: (d) => setState((s) => ({ ...s, domains: [...s.domains, d] })),
        onFormat: (format) => setState((s) => ({ ...s, format })),
        onIdentity: (identity) => setState((s) => ({ ...s, identity })),
        onSignal: (sig) => setState((s) => ({ ...s, idSignals: [...s.idSignals, sig] })),
        onTechScoring: (rows) => setState((s) => ({ ...s, techScoring: rows })),
        onTechTest: (t) => setState((s) => ({ ...s, techTests: [...s.techTests, t] })),
        onCandidateTesting: (c) => setState((s) => ({ ...s, candidates: [...s.candidates, c] })),
        onCandidateFinal: (email, statusFinal) =>
          setState((s) => ({
            ...s,
            candidates: s.candidates.map((x) =>
              x.email === email ? { ...x, status: statusFinal } : x,
            ),
          })),
        onDone: (best) => setState((s) => ({ ...s, phase: 'done', best })),
      });
    },
    [cancel],
  );

  const reset = useCallback(() => {
    cancel();
    setState({ phase: 'idle', ...EMPTY, copied: false });
  }, [cancel]);

  const copyBest = useCallback(() => {
    setState((s) => {
      if (!s.best) return s;
      void navigator.clipboard?.writeText(s.best.email).catch(() => {});
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setState((p) => ({ ...p, copied: false })), 1800);
      return { ...s, copied: true };
    });
  }, []);

  return { ...state, run, reset, copyBest };
}
