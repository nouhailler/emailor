// Types du domaine — partagés entre le searchService (données simulées ou réelles)
// et les composants d'affichage.

export type Phase = 'idle' | 'searching' | 'done';

export type ReasonKind = 'info' | 'fail' | 'success' | 'discovery';

export interface ReasonLine {
  text: string;
  kind: ReasonKind;
}

export type CandidateStatus = 'testing' | 'valide' | 'invalide' | 'incertain';
export type SmtpResult = 'ok' | 'fail' | 'unknown';
export type WebResult = 'ok' | 'none';

export interface Candidate {
  email: string;
  score: number;
  statusFinal: Exclude<CandidateStatus, 'testing'>;
  smtp: SmtpResult;
  web: WebResult;
  /** Statut courant pendant la révélation progressive. */
  status?: CandidateStatus;
}

export type SourceStatus = 'found' | 'partial' | 'none';

export interface Source {
  label: string;
  status: SourceStatus;
  detail: string;
}

export type TriState = boolean | 'partial';

export interface DomainGuess {
  domain: string;
  score: number;
  site: TriState;
  mx: TriState;
  pub: number;
}

export interface FormatDistribution {
  fmt: string;
  pct: number;
}

export interface EmailFormat {
  primary: string;
  confidence: number;
  example: string;
  samples: string[];
  distribution: FormatDistribution[];
}

export interface IdentityCandidate {
  name: string;
  score: number;
  note: string;
  canonical?: boolean;
}

export interface SignalItem {
  tag: string;
  text: string;
}

export interface IdentitySignal {
  num: number;
  title: string;
  weight: string;
  desc: string;
  items?: SignalItem[];
  chips?: string[];
  verdict: string;
}

export interface Identity {
  canonical: string;
  confidence: number;
  summary: string;
  candidates: IdentityCandidate[];
  signals?: IdentitySignal[];
}

/** L'identité consolidée affichée d'abord, sans les signaux (révélés ensuite). */
export type IdentityHeader = Omit<Identity, 'signals'>;

export type TechStatus = 'ok' | 'info' | 'warn' | 'fail';

export interface TechTest {
  num: number;
  title: string;
  status: TechStatus;
  fiab: string | null;
  statusLabel?: string;
  desc: string;
  items: SignalItem[];
  verdict: string;
}

export interface ScoringRow {
  signal: string;
  weight: string;
  pos: boolean;
}

export interface TechCheck {
  scoring: ScoringRow[];
  tests: TechTest[];
}

export interface Scenario {
  reasoning: ReasonLine[];
  candidates: Candidate[];
  sources: Source[];
  domains: DomainGuess[];
  format: EmailFormat;
  identity: Identity;
  techCheck: TechCheck;
}

export interface SearchInput {
  prenom: string;
  nom: string;
  societe: string;
  domaine: string;
}

// --- Données de normalisation des noms (Paramètres) ---

export interface NameRuleExample {
  name: string;
  note?: string;
  emails: string[];
}

export interface NameRule {
  code: string;
  pays: string;
  particularite: string;
  paragraphs: string[];
  examples: NameRuleExample[];
}

// --- OpenRouter ---

export interface FreeModel {
  id: string;
  name: string;
  ctx: number;
}
