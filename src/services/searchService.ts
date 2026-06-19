import { buildScenario } from './buildScenario';
import { revealScenario } from './revealScenario';
import type {
  Candidate,
  DomainGuess,
  EmailFormat,
  IdentityHeader,
  IdentitySignal,
  ReasonLine,
  Source,
  ScoringRow,
  SearchInput,
  TechTest,
} from '../types';

/**
 * Callbacks émis au fil de la « révélation progressive ». Le hook les branche sur
 * l'état React ; le service ne connaît pas React.
 */
export interface SearchHandlers {
  onReasoning(line: ReasonLine): void;
  onSource(src: Source): void;
  onDomain(domain: DomainGuess): void;
  onFormat(format: EmailFormat): void;
  onIdentity(identity: IdentityHeader): void;
  onSignal(signal: IdentitySignal): void;
  onTechScoring(rows: ScoringRow[]): void;
  onTechTest(test: TechTest): void;
  onCandidateTesting(candidate: Candidate): void;
  onCandidateFinal(email: string, statusFinal: Candidate['statusFinal']): void;
  /** `null` quand aucune adresse n'a pu être retenue (ex. erreur LLM). */
  onDone(best: Candidate | null): void;
}

/** Fonction d'annulation : stoppe tous les timers / requêtes en vol. */
export type CancelSearch = () => void;

export interface SearchService {
  run(input: SearchInput, handlers: SearchHandlers): CancelSearch;
}

/**
 * Implémentation de démonstration : construit un scénario **fictif** et le diffuse.
 * Conservée pour la démo (cas vedette « Dupont ») et les tests ; les données ne sont
 * pas réelles. Le service réel est `openRouterSearch`.
 */
export function createSimulatedSearchService(): SearchService {
  return {
    run(input, handlers) {
      return revealScenario(buildScenario(input), handlers);
    },
  };
}

export const simulatedSearchService = createSimulatedSearchService();
