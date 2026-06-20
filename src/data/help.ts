// Contenu de l'aide : étapes de la visite guidée (onboarding) + astuces (tips).
// Centralisé ici pour rester cohérent et facile à faire évoluer.

export interface TourStep {
  /** Sélecteur CSS de l'élément à mettre en surbrillance (absent = carte centrée). */
  selector?: string;
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    title: 'Bienvenue dans Emailor 👋',
    body:
      "Emailor retrouve l'adresse email professionnelle d'une personne à partir de son nom et de sa société, " +
      "avec un raisonnement IA, une vérification DNS/SMTP réelle et un score de confiance calculé. " +
      'Cette visite prend 30 secondes — vous pouvez la passer à tout moment.',
  },
  {
    selector: '[data-tour="search"]',
    title: '1 · Renseignez la personne',
    body:
      'Prénom, Nom, Société, et le Domaine si vous le connaissez (ça fiabilise le résultat). ' +
      'Astuce : tapez un fournisseur perso (gmail, outlook, yahoo…) dans Société pour générer ' +
      'directement des adresses personnelles, sans appeler le modèle.',
  },
  {
    selector: '[data-tour="ping"]',
    title: '2 · Ping de l\'adresse',
    body:
      "Sonde passive et publique : elle interroge le DNS (DNS-over-HTTPS) pour vérifier que le domaine " +
      "sait recevoir des emails (enregistrements MX), sans rien envoyer. Compatible « sources publiques uniquement ».",
  },
  {
    selector: '[data-tour="reasoning"]',
    title: '3 · Raisonnement de l\'IA',
    body:
      "Le déroulé de l'analyse s'affiche ici en direct : sources, format dominant, résolution d'identité. " +
      'Rien n\'est inventé — sans information publique fiable, la confiance reste volontairement basse.',
  },
  {
    selector: '[data-tour="results"]',
    title: '4 · Résultats & score',
    body:
      "L'adresse retenue, les domaines vérifiés en DNS, le format, les candidats et le score de confiance " +
      '(cliquez une ligne pour savoir pourquoi un poids s\'applique). En desktop, le bouton « Vérifier la ' +
      'boîte (SMTP) » lance une vérification réelle.',
  },
  {
    selector: '[data-tour="model"]',
    title: '5 · Modèle & journal réseau',
    body:
      'Cliquez ici (ou ☰) pour ouvrir les Paramètres : clé API OpenRouter, modèle gratuit, conformité, ' +
      'et le Journal réseau (vert sur fond noir) qui trace les échanges DNS/SMTP — utile pour diagnostiquer ' +
      'un port 25 bloqué.',
  },
  {
    title: 'Prêt à essayer ?',
    body:
      'Lancez une démo à données fictives (le cas « Roger Dupont ») pour voir tout le flux animé, ' +
      'sans configurer de modèle. Vous pourrez relancer cette visite à tout moment via le bouton « ? ».',
  },
];

export interface Tip {
  title: string;
  body: string;
}

export const TIPS: Tip[] = [
  {
    title: 'Adresses personnelles',
    body:
      'Tapez « gmail » (ou outlook, yahoo, proton…) dans Société pour générer prénom.nom@gmail.com, ' +
      'sans appeler le modèle.',
  },
  {
    title: 'Ping = passif',
    body:
      'Le « Ping de l\'adresse » vérifie via DNS que le domaine peut recevoir des emails — il n\'envoie ' +
      'jamais de message.',
  },
  {
    title: 'SMTP = desktop only',
    body:
      'La vérification SMTP réelle (RCPT TO) n\'existe que dans l\'app desktop native, jamais dans un navigateur.',
  },
  {
    title: 'Port 25 bloqué ?',
    body:
      'Ouvrez Paramètres → Journal réseau, lancez la vérif SMTP, puis copiez la trace pour voir où ça coince.',
  },
  {
    title: 'Score explicable',
    body:
      'Le score de confiance est calculé : cliquez chaque ligne du panneau pour savoir pourquoi un poids s\'applique.',
  },
  {
    title: 'Domaines catch-all',
    body:
      'M365 / Google répondent 250 à tout le monde (anti-énumération) : impossible de confirmer une boîte précise.',
  },
  {
    title: 'Indiquez le domaine',
    body:
      'Si vous connaissez le domaine (ex. nestle.com), renseignez-le : le format et le score deviennent plus fiables.',
  },
];
