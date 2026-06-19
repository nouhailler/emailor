# Prompt de démarrage — Claude Code

> Copiez-collez ce prompt dans Claude Code, à la racine du dépôt cible. Il suppose
> que les fichiers de ce dossier (`README.md`, `Recherche email.dc.html`, dossier
> `screens/`) sont accessibles.

---

Tu es chargé d'implémenter une application web : **un moteur de recherche et de
vérification d'adresses email professionnelles assisté par IA**.

Une maquette HTML de référence existe : `Recherche email.dc.html` (un « Design
Component » autonome, ouvrable dans un navigateur). Le dossier `screens/` contient
des captures de chaque écran. **Ces fichiers sont des références de design — pas du
code à copier tel quel.** Ta mission : recréer fidèlement cette interface et son
comportement dans une vraie application, en utilisant les conventions du dépôt cible.

## Étapes attendues

1. **Inspecte le dépôt cible.** Détecte le framework (React, Vue, Svelte, etc.), le
   gestionnaire d'état, la librairie de style et les patterns existants. Si le dépôt
   est vide, choisis une stack moderne adaptée (recommandé : **React + Vite +
   TypeScript**, état local via hooks).
2. **Lis `README.md`** de ce dossier : il décrit chaque écran, chaque composant, les
   tokens de design exacts (couleurs, typo, espacements), les interactions, l'état et
   les règles métier (résolution d'identité, vérification technique, normalisation des
   noms).
3. **Ouvre `Recherche email.dc.html`** pour relever les valeurs exactes (hex,
   tailles, libellés FR) — la logique se trouve dans la classe `Component` en bas du
   fichier ; le balisage est entre `<x-dc>…</x-dc>`.
4. **Implémente** l'UI au pixel près (fidélité haute), puis branche la logique.
5. **Découpe en composants** propres : `SearchForm`, `ReasoningPanel`,
   `IdentityResolution`, `TechnicalVerification`, `ResultsList`, `SettingsDialog`,
   `NameNormalizationRules`.

## Périmètre fonctionnel

L'app prend **Prénom / Nom / Société / Domaine (optionnel)** et, à la recherche,
révèle progressivement (effet « streaming », ~5–6 s) :

1. **Raisonnement de l'IA** — journal de déduction ligne à ligne (panneau gauche).
2. **Résolution d'identité** — identité consolidée + identités candidates scorées +
   5 signaux de rapprochement (alias web, historique de profils, analyse de carrière
   avec grille de points, emails exposés, particules/noms tronqués).
3. **Adresse identifiée** — meilleure adresse + score de confiance + bouton Copier.
4. **Domaines probables**, **Format principal** (distribution), **Sources analysées**.
5. **Vérification technique** — 5 tests (DNS, fournisseur mail, catch-all, SMTP sans
   envoi, anti-énumération) + tableau de pondération du score.
6. **Adresses testées** — chaque candidat avec statut SMTP/Web et score.

Les **Paramètres** contiennent : connexion OpenRouter (clé API + sélection de modèle
gratuit chargé depuis l'API OpenRouter) et le **moteur de normalisation des noms
internationaux** (accordéon de 11 pays cliquables).

## Démo vs production

La maquette **simule** la recherche avec des données scénarisées et des `setTimeout`
(cas vedette : « Roger Dupont » → « Roger Dupont de la Torte » chez Nestlé). Pour la
production, conserve cette UX de révélation progressive mais remplace les données
simulées par les vrais appels :

- Modèle LLM via **OpenRouter** (`https://openrouter.ai/api/v1/chat/completions`) pour
  le raisonnement, la résolution d'identité et la génération de variantes.
- Vérifications réseau (DNS/MX, détection fournisseur, SMTP) côté **backend**
  (jamais depuis le navigateur — CORS + ports SMTP). Prévois une API serveur.

⚠️ **Conformité** : la vérification SMTP/scraping d'identité touche au RGPD et aux
CGU des plateformes. Ajoute un encart de conformité et un mode « sources publiques
uniquement ». Demande validation produit avant d'activer les vérifications réseau
réelles.

## Important

- Toute l'UI et la copie sont en **français** — conserve les libellés exacts.
- Respecte la palette et la typo du README (look « application de bureau GNOME »).
- Commence par reproduire la maquette à l'identique avec données simulées, puis
  abstrais une couche `searchService` pour brancher l'IA/le backend ensuite.
