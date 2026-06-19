import { detectProvider, type DomainLookup } from './dns';
import type { Scenario, TechTest } from '../types';

/**
 * Construit la section « Vérification technique » à partir d'une résolution DNS
 * réelle. Partagé entre la recherche LLM et la recherche « email personnel ».
 *
 * DNS et fournisseur sont réels ; catch-all / SMTP / anti-énumération restent
 * « non vérifiés » dans la révélation auto — la vérification SMTP réelle se fait à
 * la demande via le bouton « Vérifier la boîte (SMTP) » (app desktop).
 */
export function buildDnsTechCheck(primary: DomainLookup | undefined): Scenario['techCheck'] {
  const base = primary?.domain ?? 'le domaine';
  const dnsItems = primary
    ? [
        { tag: 'A', text: `${base} → ${primary.hasA ? 'résolu' : 'non résolu'}` },
        ...primary.mx.map((m) => ({ tag: 'MX', text: `${m.host} (prio ${m.priority})` })),
      ]
    : [{ tag: 'DNS', text: 'Aucun domaine à vérifier' }];

  const dnsTest: TechTest =
    primary?.state === 'mx_ok'
      ? {
          num: 1,
          title: 'Vérification DNS',
          status: 'ok',
          fiab: null,
          statusLabel: 'Vérifié',
          desc: 'Résolution réelle du domaine et de ses enregistrements MX (DNS-over-HTTPS).',
          items: dnsItems,
          verdict: `Domaine joignable via ${primary.resolver} — il accepte les emails.`,
        }
      : primary?.state === 'nxdomain'
        ? {
            num: 1,
            title: 'Vérification DNS',
            status: 'fail',
            fiab: null,
            statusLabel: 'Domaine introuvable',
            desc: 'Résolution réelle du domaine (DNS-over-HTTPS).',
            items: dnsItems,
            verdict: "Le domaine n'existe pas — il ne reçoit pas d'emails.",
          }
        : {
            num: 1,
            title: 'Vérification DNS',
            status: 'warn',
            fiab: null,
            statusLabel: 'Sans MX',
            desc: 'Résolution réelle du domaine (DNS-over-HTTPS).',
            items: dnsItems,
            verdict: 'Pas de MX explicite — réception incertaine.',
          };

  const provider = detectProvider(primary?.mx ?? []);
  const providerTest: TechTest = {
    num: 2,
    title: 'Détection du fournisseur mail',
    status: 'info',
    fiab: null,
    statusLabel: provider,
    desc: 'Déduit des noms d’hôte MX réels.',
    items: [{ tag: '✓', text: `Fournisseur déduit : ${provider}` }],
    verdict:
      provider.startsWith('Microsoft') || provider.startsWith('Google') || provider.startsWith('Proofpoint')
        ? 'Fournisseur à forte protection anti-énumération — SMTP peu fiable même avec backend.'
        : 'Fournisseur identifié à partir des MX.',
  };

  const notVerified = (num: number, title: string, desc: string): TechTest => ({
    num,
    title,
    status: 'warn',
    fiab: null,
    statusLabel: 'Non vérifié',
    desc,
    items: [{ tag: '—', text: 'Vérifiable à la demande via « Vérifier la boîte (SMTP) » (app desktop).' }],
    verdict: 'Non vérifié automatiquement — sonde SMTP active disponible côté desktop.',
  });

  return {
    tests: [
      dnsTest,
      providerTest,
      notVerified(3, 'Détection Catch-All', 'Détermine si le domaine accepte toute adresse (rend la vérif impossible).'),
      notVerified(4, 'Vérification SMTP sans envoi', 'Dialogue HELO / MAIL FROM / RCPT TO pour tester l’existence de la boîte.'),
      notVerified(5, 'Protection anti-énumération', 'Compare un compte bidon et un compte réel pour détecter le masquage.'),
    ],
  };
}
