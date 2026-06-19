# Handoff — Recherche & vérification d'email assistée par IA

## Overview
Application de bureau (style GNOME/Linux) permettant de retrouver l'adresse email
professionnelle d'une personne à partir de son **prénom, nom et société**. L'outil
combine un **raisonnement IA** affiché en direct, un **moteur de résolution
d'identité** (rapprocher des graphies/profils différents d'une même personne), une
**vérification technique** des emails (DNS, SMTP, catch-all…), et un **moteur de
normalisation des noms internationaux** (règles par pays). Toute l'interface est en
**français**.

## À propos des fichiers de design
Les fichiers de ce dossier sont des **références de design réalisées en HTML** — un
prototype montrant l'apparence et le comportement attendus, **pas du code de
production à copier directement**. La tâche consiste à **recréer ces écrans dans
l'environnement du dépôt cible** (React, Vue, etc.) avec ses patterns et librairies
établis — ou, si aucun environnement n'existe, à choisir le framework le plus adapté.

- `Recherche email.dc.html` — le prototype complet (un seul fichier). Le **balisage**
  est entre `<x-dc>…</x-dc>` ; la **logique** est la classe `Component` (en bas du
  fichier). C'est un « Design Component » : `support.js` est juste le runtime du
  prototype et **n'a pas à être porté**.
- `screens/` — captures de référence (voir « Screens » ci-dessous).

## Fidélité
**Haute-fidélité (hifi).** Couleurs, typographie, espacements et interactions sont
définitifs. Recréez l'UI au pixel près avec les composants/librairies du dépôt cible.

---

## Design tokens

### Couleurs
| Rôle | Hex |
| --- | --- |
| Fond fenêtre (bureau, dégradé radial) | `#6486b8` → `#3f5f92` → `#233a5d` |
| Barre GNOME (haut d'écran) | `rgba(18,20,26,0.92)` |
| Surface app / panneaux clairs | `#fafafb` |
| Colonne gauche (formulaire) | `#ededef` |
| Cartes | `#ffffff` |
| Bordures | `rgba(0,0,0,0.09)` |
| Texte principal | `rgba(0,0,0,0.85)` |
| Texte secondaire | `rgba(0,0,0,0.5)` |
| Labels (uppercase) | `rgba(0,0,0,0.42)` |
| **Accent bleu** (primaire, technique) | `#3584e4` / foncé `#1c64c4` / fond `#eaf2fd` |
| **Vert** (succès / valide / +points) | `#2ec27e` / texte `#1a8f57` / fond `#eafaf1` |
| **Violet** (résolution d'identité) | `#9141ac` / texte `#7d2e9b` / fond `#f7eefb` / bordure `#e8d6f3` |
| **Ambre** (incertain / warn) | `#e5a50a` / texte `#9a6700` / fond `#fdf6e3` |
| **Rouge** (invalide / -points / fermer) | `#e01b24` / texte `#c01c28` / fond `#fdecec` |

### Typographie
- **Sans-serif** : `Cantarell` (Google Fonts), poids 400 / 700. Fallback
  `-apple-system, 'Segoe UI', sans-serif`.
- **Monospace** : `JetBrains Mono` (Google Fonts), poids 400 / 600 — pour emails,
  domaines, codes SMTP, codes pays.
- Échelle : labels section 11px/700/uppercase/letter-spacing 0.6px · corps 12–13px ·
  titres carte 14px/700 · nom de personne / titre 17px/700 · gros score 22px/700 ·
  email vedette 18–19px/600.

### Rayons, ombres, espacements
- Rayons : fenêtre 13px · cartes 10–12px · pills/badges 6–8px · pastilles 999px.
- Ombre fenêtre : `0 24px 64px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,0,0,0.07)`.
- Ombre carte « retenue » : `0 1px 8px rgba(46,194,126,0.12)` (vert) /
  `rgba(145,65,172,0.1)` (violet).
- Espacements récurrents : padding panneau 22px · padding carte 13–18px · gaps 7–12px.

### Animations (clés)
- `fadeUp` 0.25–0.3s ease (apparition des cartes : `opacity 0 → 1`, `translateY 6px → 0`).
- `spin` 0.7s linéaire infini (spinners).
- `shimmer` 1.1s (barre de progression d'un test en cours).
- `pulse` 1s (point « recherche en cours »).

---

## Layout général
Fenêtre applicative centrée (max-width **1180px**, hauteur ≈ plein écran) avec :
1. **Barre GNOME** (30px) en haut de l'écran : « Activités » · date/heure · icônes.
2. **Barre de titre app** (50px) : bouton menu (hamburger → ouvre Paramètres),
   titre « Recherche d'email » + puce modèle (cliquable → Paramètres), boutons
   fenêtre (min/max/✕).
3. **Corps en deux colonnes** :
   - **Gauche (386px, fond `#ededef`)** : formulaire de recherche + panneau
     « Raisonnement de l'IA ».
   - **Droite (flex, fond `#fafafb`)** : « Résultats » (scroll vertical).

---

## Screens / Views

### 01 — État initial (`screens/01-idle.png`)
- **Formulaire** (carte blanche, champs empilés séparés par bordures) : Prénom
  (`Roger`), Nom (`Dupont`), Société (`Nestlé`), Domaine connu optionnel (`nestle.com`,
  en monospace). Bouton plein bleu **« Lancer la recherche »** (`#3584e4`, radius 9px).
- **Raisonnement de l'IA** : état vide, encart pointillé explicatif.
- **Résultats** : état vide centré, icône enveloppe (trait `rgba(0,0,0,0.2)`) +
  invite « Renseignez le prénom, le nom et la société… ».

### 02 — Résolution d'identité (`screens/02-resolution-identite.png`)
Apparaît **en premier** dans les résultats (avant l'adresse). Objectif affiché :
« Cette personne trouvée sur Internet est-elle la même que celle que vous cherchez ? ».
- **Carte « Identité consolidée »** (violet `#f7eefb`/`#e8d6f3`) : avatar rond violet,
  nom canonique (`Roger Dupont de la Torte`), résumé (`4 graphies rapprochées · 5
  signaux concordants · trace publique`), score de confiance à droite (`94 %`).
- **Identités candidates** : liste de lignes (nom + note + barre de score + %).
  Ex. `Roger Dupont 100%` (requête initiale), `… de la Torte 94%` (badge « Retenu »
  violet), `Roger D. de la Torte 88%`, `R. Dupont de la Torte 82%`. Barre violette,
  couleur dégradée selon score (≥90 `#9141ac`, ≥80 `#b16cc9`, sinon `#c9ccd1`).

### 03 — Signaux de rapprochement (`screens/03-signaux-rapprochement.png`)
5 cartes numérotées (badge carré violet) ; chacune : titre, badge poids vert
(`+25`…), description, **preuves**, **verdict** (texte violet préfixé `→`).
1. **Alias observés sur Internet** (+25) — timeline d'années (2021/2023/2026) avec
   graphies du nom. Verdict : « Changement de graphie probable · confiance 85 % ».
2. **Historique des profils** (+20) — chips verts « Même entreprise / ville / poste /
   photo / parcours ». Verdict de forte probabilité.
3. **Analyse de carrière** (+30) — timeline de postes (Chef de produit → Resp.
   marketing → Directeur, Nestlé Vevey) **+** chips de pondération
   (`Même entreprise +30`, `Même ville +20`, `Même fonction +20`, `Même école +15`,
   `Même photo +15`).
4. **Emails déjà exposés** (+15) — deux emails trouvés dans des PDF d'années
   différentes, rapprochés par département/fonction.
5. **Particules et noms tronqués** (+20) — liste de variantes lexicales préfixées `≈`.

Tags de preuve : monospace, couleur violette, largeur min 38–44px (année / `≈` / code).

### 04 — Domaines probables & Format (`screens/04-domaines-probables.png`)
- **Domaines probables** : cartes avec domaine (monospace), badge « Retenu » sur le
  top, score % + barre (vert ≥70 / ambre ≥40 / gris sinon), chips `Site ✓/~/—`,
  `MX ✓/~/—`, `Emails publics · N`.
- **Format principal** : pill bleue du format (`prénom.nom`), exemple, confiance,
  barre, **distribution** (formats + % en mini-barres), et échantillon d'adresses
  publiques.
- **Sources analysées** : grille 2 colonnes (LinkedIn, site corporate, PDF, etc.)
  avec pastille statut (Trouvé / Indirect / Aucun).

### 05 — Vérification technique (`screens/05-verification-technique.png`)
Section « Vérification technique des emails · 5 ». 5 cartes numérotées (badge bleu),
chacune : titre, badge de fiabilité ou de statut (ex. `Fiabilité 10 %`, `Non
Catch-All`), description, lignes de preuve (monospace, tag bleu), verdict bleu `→`.
1. **Vérification DNS** — `Fiabilité 10 %`. A/MX (`mx1.nestle.ch`, `mx2.nestle.ch`).
2. **Détection du fournisseur mail** — `Fiabilité 20 %`. Microsoft 365 / Google
   Workspace / Proofpoint / Mimecast / Cisco.
3. **Détection Catch-All** — test `azertyuiop123456@…` → 550 → « Non Catch-All ».
4. **Vérification SMTP sans envoi** — HELO / MAIL FROM / RCPT TO → 250 OK,
   `Fiabilité 70–90 %`.
5. **Protection anti-énumération** — compare un compte bidon et un compte réel.

### 06 — SMTP + pondération (`screens/06-smtp-et-ponderation.png`)
**Tableau de score** (en-tête `SIGNAL` / `POIDS`, poids en monospace, vert si +, rouge
si -) :

| Signal | Poids |
| --- | --- |
| Domaine valide | +10 |
| Format observé chez l'entreprise | +30 |
| Identité résolue avec confiance | +30 |
| Adresse observée publiquement | +40 |
| SMTP favorable | +20 |
| Domaine Catch-All | -30 |

### 07 — Adresses testées (`screens/07-adresses-testees.png`)
Carte « Adresse identifiée » (vert) en tête de section résultats : email vedette
(monospace), score, bouton **Copier** (passe à « Copié ! » 1,8 s). Puis liste
**Adresses testées** : chaque candidat = email + badge statut (Valide / Invalide /
Incertain / Test en cours…), barre de score (shimmer si en cours), chips `SMTP 250/550/?`
et `Web ✓/—`. La carte « valide » a bordure verte + légère ombre.

### 08 — Paramètres : OpenRouter (`screens/08-parametres-openrouter.png`)
Dialogue modal (560px) ouvert via le menu ou la puce modèle.
- **Connexion OpenRouter** : champ Clé API (masqué/affichable), stockée en
  `localStorage`, lien vers openrouter.ai/keys.
- **Modèle gratuit · N** : liste chargée depuis l'API OpenRouter (filtrée sur
  `:free` / pricing 0), badge contexte (`1.0M ctx`…), sélection avec ✓ bleu, bouton
  « Actualiser ». Liste de secours si l'API échoue.
- Pied : boutons « Fermer » / « Enregistrer ».

### 09 — Normalisation des noms : liste (`screens/09-normalisation-noms-liste.png`)
Section dans les Paramètres. Accordéon de **11 pays**, chaque ligne = badge code pays
(monospace, ex. `FR`, `ES`), nom du pays, particularité, chevron.

| Pays | Particularité |
| --- | --- |
| France | particules : de, du, de la, des |
| Espagne | double nom de famille |
| Portugal | plusieurs noms de famille possibles |
| Pays-Bas | van, van der, van den |
| Belgique | particules françaises et néerlandaises |
| Allemagne | noms composés / tréma (ä→ae…) |
| Suisse | mélange FR / DE / IT |
| Royaume-Uni | double-barrel (Smith-Jones) |
| Chine | ordre Nom-Prénom |
| Japon | ordre Nom-Prénom (documents officiels) |
| Pays arabes | Al, El, Ben, Ibn… |

### 10 — Normalisation des noms : règle ouverte (`screens/10-normalisation-noms-espagne.png`)
Au clic, la ligne se déplie : badge passe en bleu, explication (paragraphes), puis un
ou plusieurs **exemples** = nom source + chips monospace bleus des emails générés.
Ex. Espagne / `Juan Garcia Lopez` → `juan.garcia`, `juan.garcialopez`,
`juan.garcia.lopez`, `jgarcia`, `jgarcialopez` (+ cas prénom composé `Juan Carlos…`).

---

## Interactions & comportement
- **Lancer la recherche** (bouton ou touche Entrée dans un champ) : passe en phase
  `searching`, vide les résultats, puis **révèle progressivement** via `setTimeout` :
  identité ≈550 ms, signaux ≈1100 ms +450/élément, sources ≈600 ms +400, domaines
  ≈1300 ms +350, format ≈2700 ms, vérif technique ≈1700 ms +480/test, candidats
  ≈850 ms +1000 (chacun « testing » → statut final après ~720 ms). À la fin, phase
  `done`, meilleure adresse sélectionnée.
- **Nouvelle recherche** : réinitialise à l'état vide.
- **Copier** : `navigator.clipboard.writeText`, libellé temporaire « Copié ! ».
- **Pays (normalisation)** : un seul ouvert à la fois (accordéon).
- **Paramètres** : ouverture/fermeture modale ; clé API et modèle persistés en
  `localStorage` (`oremail_apikey`, `oremail_model`).

## State management
État local (équivalent hooks/store) :
- Formulaire : `prenom, nom, societe, domaine`.
- `phase` : `idle | searching | done`.
- Données révélées : `reasoning[]`, `identity{canonical,confidence,summary,candidates[]}`,
  `idSignals[]`, `candidates[]`, `best`, `sources[]`, `domains[]`, `format`,
  `techTests[]`, `techScoring[]`.
- UI : `copied`, `settingsOpen`.
- Réglages : `apiKey, showKey, models[], loadingModels, modelError, selectedModel`.

## Règles métier (à porter / brancher)
- **Normalisation** : `norm()` (NFD + suppression accents + minuscules),
  `slug()` (alphanumérique), `cap()`. Base de règles par pays (voir
  `NAME_RULES()` dans le prototype) — données statiques à conserver/étendre.
- **Résolution d'identité** : scénario `buildScenario()` (un cas « démo » Dupont
  détaillé + un cas générique). En production, c'est la sortie d'un LLM + recherche
  web.
- **Vérification technique** : tests DNS/MX, détection fournisseur, catch-all, SMTP,
  anti-énumération + tableau de pondération. En production : **backend obligatoire**.

## Données fetchées
- **OpenRouter** : `GET https://openrouter.ai/api/v1/models` (liste des modèles,
  filtrée gratuits). En production, `POST …/chat/completions` pour le raisonnement.
- Tout ce qui est SMTP/DNS/scraping doit passer par un **service serveur** (CORS,
  ports, conformité).

## Assets
Aucune image binaire. Icônes = SVG inline simples (enveloppe, personne, jauges) +
glyphes texte (✓, ✕, →, ≈). Polices via Google Fonts (Cantarell, JetBrains Mono).

## Conformité ⚠️
La vérification SMTP et l'agrégation d'identité depuis des sources publiques touchent
au **RGPD** et aux CGU des plateformes. Prévoir un encart de conformité, un mode
« sources publiques uniquement », et faire valider le périmètre par l'équipe produit
avant d'activer les vérifications réseau réelles.

## Fichiers
- `Recherche email.dc.html` — prototype de référence (markup `<x-dc>` + classe
  `Component`).
- `support.js` — runtime du prototype (non porté).
- `screens/01…10-*.png` — captures de référence.
- `PROMPT_CLAUDE_CODE.md` — prompt de démarrage pour Claude Code.
