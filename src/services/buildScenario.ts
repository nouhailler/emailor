import { cap, slug } from '../lib/normalize';
import type { ReasonKind, ReasonLine, Scenario, SearchInput } from '../types';

function line(text: string, kind: ReasonKind): ReasonLine {
  return { text, kind };
}

/**
 * Construit le scénario de recherche (données simulées).
 *
 * En production, cette fonction serait remplacée par la sortie d'un LLM (via
 * OpenRouter) couplée à la recherche web et aux vérifications réseau côté backend,
 * mais en gardant exactement la même forme de données pour ne pas toucher à l'UI.
 *
 * Deux cas : le cas vedette « Dupont » (détaillé) et un cas générique.
 */
export function buildScenario(input: SearchInput): Scenario {
  const { prenom, nom, societe, domaine } = input;
  const p = slug(prenom) || 'prenom';
  const n = slug(nom) || 'nom';
  const base = slug(domaine).replace(/\.(com|ch|fr|org|net|io)$/, '') || slug(societe) || 'societe';
  const disp = `${cap(prenom)} ${cap(nom)}`.trim();
  const isDemo = n === 'dupont';

  if (isDemo) {
    const ext = 'dupont-de-la-torte';
    const extDot = 'dupont.de.la.torte';
    const extCat = 'dupontdelatorte';
    return {
      reasoning: [
        line(`Analyse de ${disp} chez ${societe || 'la société'}…`, 'info'),
        line(`Génération des formats standards : prénom.nom, p.nom, nom.prénom.`, 'info'),
        line(`Test SMTP de ${p}.${n}@${base}.com → rejeté (550, utilisateur inconnu).`, 'fail'),
        line(`Aucune correspondance directe. Exploration des sources publiques…`, 'info'),
        line(`Profil identifié : ${cap(prenom)} Dupont de la Torte, basé à Vevey (Suisse).`, 'discovery'),
        line(`Nom à particule + filiale suisse → le domaine ${base}.ch devient prioritaire.`, 'info'),
        line(`Génération des variantes étendues : points, tirets, concaténation.`, 'info'),
        line(`Test SMTP de ${p}.${ext}@${base}.ch → accepté (250 OK), enregistrement MX valide.`, 'success'),
        line(`Adresse retenue avec une confiance de 94 %.`, 'success'),
      ],
      candidates: [
        { email: `${p}.${n}@${base}.com`, score: 42, statusFinal: 'invalide', smtp: 'fail', web: 'none' },
        { email: `${p}.${n}@${base}.ch`, score: 35, statusFinal: 'invalide', smtp: 'fail', web: 'none' },
        { email: `${p}.${extDot}@${base}.com`, score: 58, statusFinal: 'incertain', smtp: 'unknown', web: 'ok' },
        { email: `${p}.${extCat}@${base}.com`, score: 47, statusFinal: 'invalide', smtp: 'fail', web: 'none' },
        { email: `${p}.${ext}@${base}.ch`, score: 94, statusFinal: 'valide', smtp: 'ok', web: 'ok' },
      ],
      sources: [
        { label: 'LinkedIn', status: 'found', detail: 'Profil « Roger Dupont · Nestlé » (nom tronqué)' },
        { label: 'Site corporate', status: 'found', detail: 'nestle.com — filiale suisse nestle.ch' },
        { label: 'Communiqués de presse', status: 'found', detail: '2 documents citant « R. Dupont de la Torte »' },
        { label: 'Interventions publiques', status: 'partial', detail: 'Table ronde 2024, nom partiel' },
        { label: 'Organigrammes', status: 'found', detail: 'Direction — site de Vevey' },
        { label: 'PDF', status: 'found', detail: 'Rapport annuel : nom complet confirmé' },
        { label: 'Conférences', status: 'partial', detail: 'Panéliste, affiliation Nestlé' },
        { label: 'Brevets', status: 'none', detail: 'Aucun résultat' },
        { label: 'Publications scientifiques', status: 'none', detail: 'Aucun résultat' },
        { label: 'Réseaux sociaux professionnels', status: 'found', detail: 'Xing, Viadeo — cohérent' },
      ],
      domains: [
        { domain: `${base}.ch`, score: 90, site: true, mx: true, pub: 3 },
        { domain: `${base}.com`, score: 85, site: true, mx: true, pub: 5 },
        { domain: `${base}.fr`, score: 40, site: true, mx: 'partial', pub: 0 },
        { domain: `${base}healthscience.com`, score: 25, site: true, mx: false, pub: 0 },
        { domain: `${base}professional.com`, score: 18, site: true, mx: false, pub: 0 },
      ],
      format: {
        primary: 'prénom.nom',
        confidence: 97,
        example: `${p}.${n}`,
        samples: [`jean.dupont@${base}.com`, `marie.martin@${base}.com`, `luc.bernard@${base}.com`],
        distribution: [
          { fmt: 'prénom.nom', pct: 97 },
          { fmt: 'p.nom', pct: 2 },
          { fmt: 'nom.prénom', pct: 1 },
        ],
      },
      identity: {
        canonical: `${cap(prenom)} Dupont de la Torte`,
        confidence: 94,
        summary: '4 graphies rapprochées · 5 signaux concordants · trace publique',
        candidates: [
          { name: `${cap(prenom)} Dupont`, score: 100, note: 'requête initiale' },
          { name: `${cap(prenom)} Dupont de la Torte`, score: 94, note: 'nom complet à particule', canonical: true },
          { name: `${cap(prenom)} D. de la Torte`, score: 88, note: 'prénom + initiale + particule' },
          { name: `R. Dupont de la Torte`, score: 82, note: 'initiale + nom complet' },
        ],
        signals: [
          {
            num: 1,
            title: 'Alias observés sur Internet',
            weight: '+25',
            desc: 'Cooccurrences du nom dans LinkedIn, le site corporate, les conférences, articles, PDFs et réseaux professionnels, sous des graphies différentes.',
            items: [
              { tag: '2021', text: '« Roger Dupont » — communiqué de presse Nestlé' },
              { tag: '2023', text: '« Roger Dupont de la Torte » — organigramme interne' },
              { tag: '2026', text: '« R. Dupont de la Torte » — table ronde, Vevey' },
            ],
            verdict: 'Changement de graphie probable · confiance 85 %',
          },
          {
            num: 2,
            title: 'Historique des profils',
            weight: '+20',
            desc: 'Comparaison des versions successives du profil professionnel (le profil est régulièrement modifié).',
            chips: ['Même entreprise', 'Même ville', 'Même poste', 'Même photo', 'Même parcours'],
            verdict: 'Très forte probabilité : Roger Dupont = Roger Dupont de la Torte',
          },
          {
            num: 3,
            title: 'Analyse de carrière',
            weight: '+30',
            desc: 'Méthode la plus efficace : même quand le nom varie légèrement, la trajectoire professionnelle est souvent unique.',
            items: [
              { tag: '2018', text: 'Chef de produit · Nestlé · Vevey' },
              { tag: '2020', text: 'Responsable marketing · Nestlé · Vevey' },
              { tag: '2024', text: 'Directeur marketing · Nestlé · Vevey' },
            ],
            chips: ['Même entreprise +30', 'Même ville +20', 'Même fonction +20', 'Même école +15', 'Même photo +15'],
            verdict: 'Trajectoire unique · forte corrélation',
          },
          {
            num: 4,
            title: 'Emails déjà exposés',
            weight: '+15',
            desc: 'Adresses retrouvées dans des documents publics, rapprochées par département et fonction.',
            items: [
              { tag: '2021', text: 'roger.dupont@nestle.com — PDF rapport annuel' },
              { tag: '2025', text: 'roger.dupontdelatorte@nestle.ch — PDF interne' },
            ],
            verdict: 'Même département, même fonction → identités rapprochées',
          },
          {
            num: 5,
            title: 'Particules et noms tronqués',
            weight: '+20',
            desc: 'Rapprochement lexical des graphies avec et sans particule — plus fréquent que les vrais changements de nom.',
            items: [
              { tag: '≈', text: 'Roger Dupont' },
              { tag: '≈', text: 'Roger Dupont de la Torte' },
              { tag: '≈', text: 'Roger Dupont-De-La-Torte' },
              { tag: '≈', text: 'Roger De La Torte' },
            ],
            verdict: "Variantes d'une même racine lexicale",
          },
        ],
      },
      techCheck: {
        tests: [
          {
            num: 1,
            title: 'Vérification DNS',
            status: 'ok',
            fiab: '10 %',
            desc: "Vérifier que le domaine existe et qu'il possède des enregistrements MX.",
            items: [
              { tag: 'A', text: `${base}.ch → résolu` },
              { tag: 'MX', text: `mx1.${base}.ch` },
              { tag: 'MX', text: `mx2.${base}.ch` },
            ],
            verdict: 'Le domaine existe, mais pas forcément la boîte.',
          },
          {
            num: 2,
            title: 'Détection du fournisseur mail',
            status: 'info',
            fiab: '20 %',
            desc: "Identifier l'hébergeur (Microsoft 365, Google Workspace, Proofpoint, Mimecast, Cisco…) pour savoir quelles techniques seront possibles.",
            items: [
              { tag: '✓', text: `Serveur dédié · mx1.${base}.ch` },
              { tag: '—', text: 'Microsoft 365 · Google Workspace · Proofpoint · Mimecast · Cisco' },
            ],
            verdict: 'Serveur dédié détecté — vérification SMTP envisageable.',
          },
          {
            num: 3,
            title: 'Détection Catch-All',
            status: 'ok',
            fiab: null,
            statusLabel: 'Non Catch-All',
            desc: "Un domaine Catch-All accepte n'importe quelle adresse sans erreur SMTP : la vérification technique devient alors impossible.",
            items: [
              { tag: 'TEST', text: `azertyuiop123456@${base}.ch` },
              { tag: '550', text: 'Mailbox unavailable — adresse rejetée' },
            ],
            verdict: 'Non Catch-All → les adresses peuvent être vérifiées techniquement.',
          },
          {
            num: 4,
            title: 'Vérification SMTP sans envoi',
            status: 'ok',
            fiab: '70–90 %',
            desc: "Dialogue HELO / MAIL FROM / RCPT TO sans envoyer de message ; le serveur répond 250 OK ou 550 User Unknown.",
            items: [
              { tag: 'HELO', text: `mx1.${base}.ch` },
              { tag: 'RCPT', text: `roger.dupontdelatorte@${base}.ch → 250 OK` },
            ],
            verdict: 'Le compte existe probablement · fiabilité 70 à 90 %.',
          },
          {
            num: 5,
            title: 'Détection de protection anti-énumération',
            status: 'ok',
            fiab: null,
            statusLabel: 'Non détectée',
            desc: "Microsoft 365, Google Workspace ou Proofpoint répondent souvent 250 OK à tout le monde, masquant l'existence réelle du compte.",
            items: [
              { tag: 'TEST', text: `toto.tata.inexistant@${base}.ch → 550` },
              { tag: 'OK', text: `roger.dupontdelatorte@${base}.ch → 250` },
            ],
            verdict: 'Réponses distinctes → ce serveur révèle encore les comptes existants.',
          },
        ],
      },
    };
  }

  // Cas générique
  const pc = cap(prenom);
  const nc = cap(nom);
  return {
    reasoning: [
      line(`Analyse de ${disp || 'la personne'} chez ${societe || 'la société'}…`, 'info'),
      line(`Génération des formats courants : prénom.nom, p.nom, nom.prénom, prénomnom.`, 'info'),
      line(`Déduction du domaine d'entreprise → ${base}.com.`, 'info'),
      line(`Test SMTP de ${p}.${n}@${base}.com → accepté (250 OK).`, 'success'),
      line(`Vérification croisée avec les sources web → cohérent.`, 'success'),
      line(`Adresse retenue avec une confiance de 88 %.`, 'success'),
    ],
    candidates: [
      { email: `${p}${n}@${base}.com`, score: 44, statusFinal: 'invalide', smtp: 'fail', web: 'none' },
      { email: `${n}.${p}@${base}.com`, score: 52, statusFinal: 'incertain', smtp: 'unknown', web: 'ok' },
      { email: `${p[0]}${n}@${base}.com`, score: 49, statusFinal: 'invalide', smtp: 'fail', web: 'none' },
      { email: `${p}.${n}@${base}.com`, score: 88, statusFinal: 'valide', smtp: 'ok', web: 'ok' },
    ],
    sources: [
      { label: 'LinkedIn', status: 'found', detail: 'Profil correspondant trouvé' },
      { label: 'Site corporate', status: 'found', detail: "Domaine d'entreprise confirmé" },
      { label: 'Communiqués de presse', status: 'partial', detail: 'Mentions ponctuelles' },
      { label: 'Interventions publiques', status: 'none', detail: 'Aucun résultat' },
      { label: 'Organigrammes', status: 'partial', detail: 'Service identifié' },
      { label: 'PDF', status: 'none', detail: 'Aucun résultat' },
      { label: 'Conférences', status: 'none', detail: 'Aucun résultat' },
      { label: 'Brevets', status: 'none', detail: 'Aucun résultat' },
      { label: 'Publications scientifiques', status: 'none', detail: 'Aucun résultat' },
      { label: 'Réseaux sociaux professionnels', status: 'found', detail: 'Présence confirmée' },
    ],
    domains: [
      { domain: `${base}.com`, score: 82, site: true, mx: true, pub: 2 },
      { domain: `${base}.fr`, score: 41, site: true, mx: 'partial', pub: 0 },
      { domain: `${base}.net`, score: 22, site: false, mx: false, pub: 0 },
    ],
    format: {
      primary: 'prénom.nom',
      confidence: 88,
      example: `${p}.${n}`,
      samples: [`jean.martin@${base}.com`, `marie.durand@${base}.com`],
      distribution: [
        { fmt: 'prénom.nom', pct: 88 },
        { fmt: 'prénomnom', pct: 8 },
        { fmt: 'p.nom', pct: 4 },
      ],
    },
    identity: {
      canonical: disp || 'Identité recherchée',
      confidence: 90,
      summary: '3 graphies rapprochées · 3 signaux concordants · trace publique',
      candidates: [
        { name: disp || 'Identité recherchée', score: 100, note: 'requête initiale', canonical: true },
        { name: `${pc} ${nc[0] || 'N'}.`, score: 84, note: 'prénom + initiale' },
        { name: `${pc[0] || 'P'}. ${nc}`, score: 80, note: 'initiale + nom' },
      ],
      signals: [
        {
          num: 1,
          title: 'Alias observés sur Internet',
          weight: '+25',
          desc: 'Cooccurrences du nom (LinkedIn, site corporate, conférences, articles, PDFs, réseaux professionnels) sous des graphies différentes au fil du temps.',
          items: [
            { tag: '2022', text: `« ${disp} » — profil LinkedIn` },
            { tag: '2026', text: `« ${pc} ${nc} » — ${societe || 'entreprise'}` },
          ],
          verdict: 'Graphies cohérentes · confiance 85 %',
        },
        {
          num: 3,
          title: 'Analyse de carrière',
          weight: '+30',
          desc: 'La trajectoire professionnelle est souvent unique, même quand le nom varie légèrement.',
          chips: ['Même entreprise +30', 'Même ville +20', 'Même fonction +20'],
          verdict: 'Trajectoire cohérente · forte corrélation',
        },
        {
          num: 5,
          title: 'Particules et noms tronqués',
          weight: '+20',
          desc: 'Rapprochement lexical des graphies avec et sans particule ou initiale.',
          items: [
            { tag: '≈', text: disp },
            { tag: '≈', text: `${pc} ${nc[0] || 'N'}.` },
            { tag: '≈', text: `${pc[0] || 'P'}. ${nc}` },
          ],
          verdict: "Variantes d'une même racine lexicale",
        },
      ],
    },
    techCheck: {
      tests: [
        {
          num: 1,
          title: 'Vérification DNS',
          status: 'ok',
          fiab: '10 %',
          desc: "Vérifier que le domaine existe et qu'il possède des enregistrements MX.",
          items: [
            { tag: 'A', text: `${base}.com → résolu` },
            { tag: 'MX', text: `mx1.${base}.com` },
            { tag: 'MX', text: `mx2.${base}.com` },
          ],
          verdict: 'Le domaine existe, mais pas forcément la boîte.',
        },
        {
          num: 2,
          title: 'Détection du fournisseur mail',
          status: 'info',
          fiab: '20 %',
          desc: "Identifier l'hébergeur (Microsoft 365, Google Workspace, Proofpoint, Mimecast, Cisco…) pour savoir quelles techniques seront possibles.",
          items: [
            { tag: '✓', text: 'Microsoft 365 (Exchange Online)' },
            { tag: '—', text: 'Google Workspace · Proofpoint · Mimecast · Cisco' },
          ],
          verdict: "Microsoft 365 détecté — protections d'énumération fréquentes.",
        },
        {
          num: 3,
          title: 'Détection Catch-All',
          status: 'ok',
          fiab: null,
          statusLabel: 'Non Catch-All',
          desc: "Un domaine Catch-All accepte n'importe quelle adresse sans erreur SMTP : la vérification technique devient alors impossible.",
          items: [
            { tag: 'TEST', text: `azertyuiop123456@${base}.com` },
            { tag: '550', text: 'Recipient rejected — adresse rejetée' },
          ],
          verdict: 'Non Catch-All → les adresses peuvent être vérifiées techniquement.',
        },
        {
          num: 4,
          title: 'Vérification SMTP sans envoi',
          status: 'warn',
          fiab: null,
          statusLabel: 'Non concluant',
          desc: "Dialogue HELO / MAIL FROM / RCPT TO sans envoyer de message ; le serveur répond 250 OK ou 550 User Unknown.",
          items: [
            { tag: 'HELO', text: `mx1.${base}.com` },
            { tag: 'RCPT', text: `${p}.${n}@${base}.com → 250 OK` },
          ],
          verdict: 'Réponse 250 OK peu fiable sur ce fournisseur — voir test 5.',
        },
        {
          num: 5,
          title: 'Détection de protection anti-énumération',
          status: 'warn',
          fiab: null,
          statusLabel: 'Active',
          desc: "Microsoft 365, Google Workspace ou Proofpoint répondent souvent 250 OK à tout le monde, masquant l'existence réelle du compte.",
          items: [
            { tag: 'TEST', text: `toto.tata.inexistant@${base}.com → 250` },
            { tag: 'OK', text: `${p}.${n}@${base}.com → 250` },
          ],
          verdict: "Réponses identiques → on s'appuie sur le format et l'identité résolue.",
        },
      ],
    },
  };
}
