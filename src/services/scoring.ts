import type { SmtpStatus } from './desktopApi';

/**
 * Moteur de score de confiance **réel**. La confiance affichée pour l'adresse retenue
 * est la somme des signaux effectivement vérifiés pour ce résultat précis — et non un
 * tableau décoratif. Chaque signal porte :
 *  - `why`    : pourquoi ce poids dans la méthodologie (explication au clic) ;
 *  - `reason` : pourquoi il s'applique — ou non — à CE résultat (dynamique).
 */

export interface ScoreContext {
  /** Le domaine de l'adresse résout-il avec un MX (DNS réel vérifié) ? */
  domainVerified: boolean;
  /** État DNS lisible (ex. « nestle.ch · MX mx1.nestle.ch »). */
  domainDetail: string;
  /** Format d'email dominant déduit + sa confiance (0–100). */
  formatPrimary: string;
  formatConfidence: number;
  /** Confiance de la résolution d'identité (null si non applicable, ex. email perso). */
  identityConfidence: number | null;
  /** L'adresse exacte a-t-elle été observée dans une source publique ? */
  publiclyObserved: boolean;
  /** Résultat de la vérification SMTP à la demande (undefined si non lancée). */
  smtpStatus?: SmtpStatus;
}

export type SignalKey = 'domain' | 'format' | 'identity' | 'public' | 'smtp' | 'catchall';

export interface ScoredSignal {
  key: SignalKey;
  label: string;
  /** Poids signé (ex. +30, −30). */
  weight: number;
  /** Le signal s'applique-t-il à ce résultat ? */
  applied: boolean;
  /** Contribution réelle au total (0 si non appliqué). */
  contribution: number;
  /** Pénalité (poids négatif) ? */
  penalty: boolean;
  /** Méthodologie : pourquoi ce poids. */
  why: string;
  /** Verdict dynamique pour ce résultat. */
  reason: string;
  /** Le signal est-il en attente d'une action (ex. vérif SMTP non lancée) ? */
  pending?: boolean;
}

const FORMAT_THRESHOLD = 50;
const IDENTITY_THRESHOLD = 60;

function smtpSignal(ctx: ScoreContext): { applied: boolean; pending: boolean; reason: string } {
  switch (ctx.smtpStatus) {
    case undefined:
      return { applied: false, pending: true, reason: 'Vérification SMTP non lancée — cliquez sur « Vérifier la boîte (SMTP) ».' };
    case 'deliverable':
      return { applied: true, pending: false, reason: 'Le serveur a accepté le destinataire (RCPT TO → 250) et rejette les adresses bidon.' };
    case 'catch_all':
      return { applied: false, pending: false, reason: 'Domaine catch-all : le 250 ne prouve rien (voir la pénalité ci-dessous).' };
    case 'undeliverable':
      return { applied: false, pending: false, reason: 'Le serveur a rejeté le destinataire (550) — défavorable.' };
    default:
      return { applied: false, pending: false, reason: 'SMTP non concluant (MX injoignable, port 25 filtré, ou réponse ambiguë).' };
  }
}

/** Calcule les signaux et le total (0–100) pour l'adresse retenue. */
export function computeScore(ctx: ScoreContext): { signals: ScoredSignal[]; total: number } {
  const smtp = smtpSignal(ctx);

  const defs: Array<Omit<ScoredSignal, 'contribution'>> = [
    {
      key: 'domain',
      label: 'Domaine valide (DNS réel)',
      weight: 10,
      penalty: false,
      applied: ctx.domainVerified,
      why: "Le domaine doit exister et accepter le courrier (enregistrement MX), vérifié en DNS réel (DNS-over-HTTPS). Sans MX, aucune adresse n'est livrable. Poids modéré (+10) : c'est nécessaire mais loin d'être suffisant.",
      reason: ctx.domainVerified
        ? `Domaine vérifié : ${ctx.domainDetail}.`
        : "Le domaine n'a pas de MX vérifié — il ne reçoit peut-être pas d'emails.",
    },
    {
      key: 'format',
      label: 'Format cohérent',
      weight: 30,
      penalty: false,
      applied: ctx.formatConfidence >= FORMAT_THRESHOLD,
      why: "Si l'adresse suit le format dominant de l'organisation (ex. prénom.nom), elle a beaucoup plus de chances d'exister. C'est un signal fort observé sur de nombreuses adresses : +30.",
      reason:
        ctx.formatConfidence >= FORMAT_THRESHOLD
          ? `Format « ${ctx.formatPrimary} » déduit avec ${ctx.formatConfidence}% de cohérence.`
          : `Format peu sûr (${ctx.formatConfidence}%) — pas assez cohérent pour compter.`,
    },
    {
      key: 'identity',
      label: 'Identité résolue',
      weight: 30,
      penalty: false,
      applied: ctx.identityConfidence != null && ctx.identityConfidence >= IDENTITY_THRESHOLD,
      why: "Si la bonne personne a été identifiée avec confiance (graphies, parcours et alias rapprochés), on est sûr de viser le bon individu, pas un homonyme : +30.",
      reason:
        ctx.identityConfidence == null
          ? "Pas de résolution d'identité (adresse personnelle) — signal non applicable."
          : ctx.identityConfidence >= IDENTITY_THRESHOLD
            ? `Identité résolue avec ${ctx.identityConfidence}% de confiance.`
            : `Identité incertaine (${ctx.identityConfidence}%) — sous le seuil.`,
    },
    {
      key: 'public',
      label: 'Adresse observée publiquement',
      weight: 40,
      penalty: false,
      applied: ctx.publiclyObserved,
      why: "Le signal le plus fort : si l'adresse EXACTE apparaît dans une source publique (PDF, page web…), elle est quasi certaine. D'où le poids maximal : +40.",
      reason: ctx.publiclyObserved
        ? "L'adresse exacte a été repérée dans une source publique."
        : "Aucune source publique exploitée ici (pas de scraping) — signal non appliqué.",
    },
    {
      key: 'smtp',
      label: 'SMTP favorable',
      weight: 20,
      penalty: false,
      applied: smtp.applied,
      pending: smtp.pending,
      why: "Le serveur mail accepte le destinataire (RCPT TO → 250) tout en rejetant une adresse bidon : confirmation technique directe de l'existence de la boîte. +20.",
      reason: smtp.reason,
    },
    {
      key: 'catchall',
      label: 'Domaine catch-all',
      weight: -30,
      penalty: true,
      applied: ctx.smtpStatus === 'catch_all',
      why: "Si le domaine accepte n'importe quelle adresse (catch-all / anti-énumération), le 250 du test SMTP ne prouve rien : on retire de la confiance. −30.",
      reason:
        ctx.smtpStatus === 'catch_all'
          ? 'Le serveur accepte aussi une adresse aléatoire : impossible de distinguer une vraie boîte.'
          : "Pas de catch-all détecté (ou SMTP non lancé) — aucune pénalité.",
    },
  ];

  const signals: ScoredSignal[] = defs.map((d) => ({
    ...d,
    contribution: d.applied ? d.weight : 0,
  }));

  const raw = signals.reduce((sum, s) => sum + s.contribution, 0);
  const total = Math.max(0, Math.min(100, raw));
  return { signals, total };
}
