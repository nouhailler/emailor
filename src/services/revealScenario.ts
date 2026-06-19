import type { Scenario } from '../types';
import type { CancelSearch, SearchHandlers } from './searchService';

/**
 * Révèle progressivement un `Scenario` complet via des `setTimeout`, reproduisant
 * la cadence de la maquette (~5–6 s). Utilisé aussi bien par le service simulé que
 * par le service OpenRouter (qui produit son scénario de façon asynchrone, puis le
 * fait défiler avec la même UX).
 *
 * @param baseDelay décalage initial ajouté à tous les timers (utile quand on a déjà
 *   passé du temps sur un appel réseau avant de commencer la révélation).
 */
export function revealScenario(
  sc: Scenario,
  handlers: SearchHandlers,
  baseDelay = 0,
): CancelSearch {
  const timers: ReturnType<typeof setTimeout>[] = [];
  const at = (delay: number, fn: () => void) => timers.push(setTimeout(fn, baseDelay + delay));

  const startS = 600;
  const stepS = 400;
  sc.sources.forEach((src, i) => at(startS + i * stepS, () => handlers.onSource(src)));

  const startD = 1300;
  const stepD = 350;
  sc.domains.forEach((d, i) => at(startD + i * stepD, () => handlers.onDomain(d)));

  at(2700, () => handlers.onFormat(sc.format));

  at(550, () =>
    handlers.onIdentity({
      canonical: sc.identity.canonical,
      confidence: sc.identity.confidence,
      summary: sc.identity.summary,
      candidates: sc.identity.candidates,
    }),
  );
  (sc.identity.signals ?? []).forEach((sig, i) => at(1100 + i * 450, () => handlers.onSignal(sig)));

  at(1500, () => handlers.onTechScoring(sc.techCheck.scoring));
  sc.techCheck.tests.forEach((t, i) => at(1700 + i * 480, () => handlers.onTechTest(t)));

  sc.reasoning.forEach((l, i) => at(450 + i * 600, () => handlers.onReasoning(l)));

  const startC = 850;
  const stepC = 1000;
  sc.candidates.forEach((c, i) => {
    at(startC + i * stepC, () => handlers.onCandidateTesting({ ...c, status: 'testing' }));
    at(startC + i * stepC + 720, () => handlers.onCandidateFinal(c.email, c.statusFinal));
  });

  const endR = 450 + sc.reasoning.length * 600 + 300;
  const endC = startC + sc.candidates.length * stepC + 200;
  const endS = startS + sc.sources.length * stepS + 200;
  const endD = startD + sc.domains.length * stepD + 200;
  const endF = 3000;
  const endI = 1100 + (sc.identity.signals?.length ?? 0) * 450 + 300;
  const endT = 1700 + sc.techCheck.tests.length * 480 + 300;
  const end = Math.max(endR, endC, endS, endD, endF, endI, endT);
  at(end, () => {
    const valid = sc.candidates
      .filter((c) => c.statusFinal === 'valide')
      .sort((a, b) => b.score - a.score);
    const ranked = [...sc.candidates].sort((a, b) => b.score - a.score);
    handlers.onDone(valid[0] ?? ranked[0] ?? null);
  });

  return () => {
    timers.forEach((t) => clearTimeout(t));
    timers.length = 0;
  };
}
