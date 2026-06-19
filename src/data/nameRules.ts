import type { NameRule } from '../types';

/**
 * Moteur de normalisation des noms internationaux — base de règles statique
 * portée verbatim depuis la maquette de référence (`NAME_RULES()`).
 * Données conservées telles quelles, prêtes à être étendues.
 */
export const NAME_RULES: NameRule[] = [
  {
    code: 'FR',
    pays: 'France',
    particularite: 'Particules : de, du, de la, des',
    paragraphs: [
      "Les particules (de, du, de la, des) font partie du nom mais sont traitées différemment selon les entreprises : conservées, accolées au nom ou purement supprimées.",
    ],
    examples: [
      { name: 'Jean de La Fontaine', emails: ['jean.delafontaine', 'jean.lafontaine', 'jean.de.la.fontaine', 'jdelafontaine'] },
      { name: 'Marie du Pont', emails: ['marie.dupont', 'marie.pont', 'mdupont'] },
    ],
  },
  {
    code: 'ES',
    pays: 'Espagne',
    particularite: 'Double nom de famille (père + mère)',
    paragraphs: [
      "Dans les pays hispanophones, une personne porte traditionnellement deux noms de famille : Prénom + nom du père + nom de la mère.",
      "Exemple : Juan Garcia Lopez — Garcia est le nom du père, Lopez celui de la mère. Contrairement à la France, les deux noms font officiellement partie du nom complet.",
      "Les entreprises choisissent des formats variés et ignorent parfois complètement le second nom. En Amérique latine, on rencontre aussi des prénoms composés (Juan Carlos).",
    ],
    examples: [
      { name: 'Juan Garcia Lopez', emails: ['juan.garcia', 'juan.garcialopez', 'juan.garcia.lopez', 'jgarcia', 'jgarcialopez'] },
      { name: 'Juan Carlos Garcia Lopez', note: 'prénom composé (Amérique latine)', emails: ['juan.garcia', 'juan.carlos.garcia', 'jcgarcia', 'juan.garcia.lopez'] },
    ],
  },
  {
    code: 'PT',
    pays: 'Portugal',
    particularite: 'Plusieurs noms de famille possibles',
    paragraphs: [
      "Au Portugal et au Brésil, une personne peut porter deux à quatre noms de famille. Contrairement à l'Espagne, le nom du père est généralement placé en dernier et constitue le nom usuel.",
    ],
    examples: [
      { name: 'João Carlos Sousa Santos', note: 'nom usuel : Santos', emails: ['joao.santos', 'joao.sousasantos', 'joao.sousa.santos', 'jsantos'] },
    ],
  },
  {
    code: 'NL',
    pays: 'Pays-Bas',
    particularite: 'Préfixes : van, van der, van den',
    paragraphs: [
      "Les préfixes (tussenvoegsels) van, van der, van den, de précèdent le nom. Ils sont ignorés dans le classement alphabétique mais peuvent être conservés, accolés, abrégés ou supprimés dans l'email.",
    ],
    examples: [
      { name: 'Jan van der Berg', emails: ['jan.vanderberg', 'jan.berg', 'j.vanderberg', 'jvdberg'] },
    ],
  },
  {
    code: 'BE',
    pays: 'Belgique',
    particularite: 'Particules françaises et néerlandaises',
    paragraphs: [
      "La Belgique combine les conventions française et néerlandaise : on rencontre aussi bien des particules françaises (de, du) que des préfixes néerlandais (van, vande). Les noms sont souvent accolés.",
    ],
    examples: [
      { name: 'Marie Vanden Bossche', emails: ['marie.vandenbossche', 'marie.bossche', 'mvandenbossche'] },
      { name: 'Luc De Smet', emails: ['luc.desmet', 'luc.smet', 'ldesmet'] },
    ],
  },
  {
    code: 'DE',
    pays: 'Allemagne',
    particularite: 'Noms composés et tréma fréquents',
    paragraphs: [
      "Les trémas se transcrivent souvent ä→ae, ö→oe, ü→ue et ß→ss, mais pas toujours. Les noms composés à trait d'union sont fréquents.",
    ],
    examples: [
      { name: 'Jürgen Müller', emails: ['juergen.mueller', 'jurgen.muller', 'j.mueller'] },
      { name: 'Anna Schmidt-Bauer', emails: ['anna.schmidt-bauer', 'anna.schmidtbauer', 'aschmidtbauer'] },
    ],
  },
  {
    code: 'CH',
    pays: 'Suisse',
    particularite: 'Conventions FR, DE et IT mélangées',
    paragraphs: [
      "La Suisse mêle les conventions françaises, allemandes et italiennes selon la région. Le traitement des accents et des particules dépend de la langue d'origine du nom.",
    ],
    examples: [
      { name: 'Stéphane Hügli', emails: ['stephane.huegli', 'stephane.hugli', 's.huegli'] },
    ],
  },
  {
    code: 'GB',
    pays: 'Royaume-Uni',
    particularite: 'Double-barrel surnames (Smith-Jones)',
    paragraphs: [
      "Les noms à trait d'union (double-barrel) combinent deux patronymes. Ils peuvent être conservés avec le trait d'union, accolés, ou réduits à une initiale.",
    ],
    examples: [
      { name: 'Emily Smith-Jones', emails: ['emily.smith-jones', 'emily.smithjones', 'esmith-jones', 'esmithjones'] },
    ],
  },
  {
    code: 'CN',
    pays: 'Chine',
    particularite: 'Ordre Nom-Prénom',
    paragraphs: [
      "En chinois, le nom de famille précède le prénom. Zhang Wei signifie « famille Zhang, prénom Wei ». Il faut inverser l'ordre pour générer un email au format occidental.",
    ],
    examples: [
      { name: 'Zhang Wei', note: 'famille : Zhang', emails: ['wei.zhang', 'zhang.wei', 'wzhang', 'zwei'] },
    ],
  },
  {
    code: 'JP',
    pays: 'Japon',
    particularite: 'Ordre Nom-Prénom dans les documents officiels',
    paragraphs: [
      "Dans les documents officiels japonais, le nom de famille précède le prénom (Tanaka Haruki = famille Tanaka). À l'international, l'ordre est souvent inversé, d'où une ambiguïté à lever.",
    ],
    examples: [
      { name: 'Tanaka Haruki', note: 'famille : Tanaka', emails: ['haruki.tanaka', 'tanaka.haruki', 'htanaka'] },
    ],
  },
  {
    code: 'AR',
    pays: 'Pays arabes',
    particularite: 'Al, El, Ben, Ibn, etc.',
    paragraphs: [
      "Les éléments Al / El (« le ») et Ben / Bin / Ibn (« fils de ») font partie du nom. Ils peuvent être conservés, accolés ou supprimés, et la translittération varie (Mohammed / Mohamed / Muhammad).",
    ],
    examples: [
      { name: 'Mohammed Al-Rashid', emails: ['mohammed.alrashid', 'mohammed.rashid', 'm.alrashid', 'mohamed.alrashid'] },
      { name: 'Youssef Ben Ali', emails: ['youssef.benali', 'youssef.ali', 'ybenali'] },
    ],
  },
];
