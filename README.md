# Emailor — Recherche & vérification d'email assistée par IA

Application web **desktop plein écran** qui retrouve l'adresse email professionnelle
d'une personne à partir de son **prénom, nom, société** (et domaine optionnel). Elle
combine un **raisonnement IA** affiché en direct, un **moteur de résolution
d'identité**, une **vérification technique** (DNS, SMTP, catch-all…) et un **moteur de
normalisation des noms internationaux**. Toute l'interface est en français.

Cette implémentation reproduit fidèlement la maquette de référence
(`design_handoff_email_finder/Recherche email.dc.html`) en **React + Vite +
TypeScript**, avec données simulées et révélation progressive (~5–6 s).

## Démarrer

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck (tsc -b) + bundle de production
npm run preview  # sert le build
```

## Architecture

État local via hooks ; aucun store global. Style inline fidèle à la maquette,
converti depuis des chaînes CSS via `lib/style.ts#sx`.

```
src/
  App.tsx                     Bandeau titre plein écran, layout 2 colonnes, câblage
  types.ts                    Types du domaine
  lib/
    style.ts                  sx() : chaîne CSS → objet style React
    normalize.ts              norm() / slug() / cap()
    theme.ts                  Tokens de couleur
  data/
    nameRules.ts              Base de règles de normalisation (11 pays)
  services/
    searchService.ts          Interfaces (SearchService/handlers) + service simulé
    openRouterSearch.ts       Service RÉEL : LLM OpenRouter + DNS réel → scénario honnête
    llmPrompt.ts              Invite système/utilisateur du LLM (honnêteté stricte)
    revealScenario.ts         Scheduler de révélation progressive (partagé)
    buildScenario.ts          Scénario FICTIF (démo : cas « Dupont » + générique)
    dns.ts                    Résolution DNS réelle (DoH, MX/A) + détection fournisseur
    openRouter.ts             Chargement des modèles gratuits OpenRouter (+ secours)
    pingService.ts            Ping DNS réel (DNS-over-HTTPS, MX/A) d'une adresse
  hooks/
    useEmailSearch.ts         Orchestration recherche + streaming des résultats
    useSettings.ts            Clé API + modèle, persistés en localStorage
  components/
    SearchForm.tsx            Formulaire (Prénom/Nom/Société/Domaine)
    PingAddress.tsx           Ping DNS réel de l'adresse trouvée (sous la recherche)
    ReasoningPanel.tsx        Journal de raisonnement de l'IA (colonne gauche)
    IdentityResolution.tsx    Identité consolidée + candidats + 5 signaux
    TechnicalVerification.tsx 5 tests techniques + tableau de pondération
    ResultsList.tsx           Adresse identifiée, domaines, format, sources, candidats
    SettingsDialog.tsx        Dialogue Paramètres
    NameNormalizationRules.tsx Accordéon des 11 pays
    ComplianceNotice.tsx      Encart RGPD + mode « sources publiques uniquement »
```

### La couche `SearchService`

Tout service expose `run(input, handlers): cancel` et émet les mêmes callbacks dans
le même ordre ; le hook `useEmailSearch` les branche sur l'état React, sans rien
connaître de la source. `revealScenario()` fait défiler un `Scenario` complet à la
cadence de la maquette. Deux implémentations :

- **`openRouterSearch` (réel, par défaut quand configuré)** — interroge le modèle
  OpenRouter pour le raisonnement, la résolution d'identité, le format et les
  hypothèses d'adresses, **vérifie les domaines en DNS réel** (DoH), puis fait défiler
  le résultat. **Aucune donnée n'est inventée** (cf. ci-dessous).
- **`simulatedSearchService` (démo)** — scénario **fictif** (`buildScenario`, cas
  vedette « Dupont »), lancé via le bouton « Lancer une démo (données fictives) ».

L'App choisit le service réel dès qu'une **clé API + un modèle** sont configurés ;
sinon elle affiche une notice invitant à configurer OpenRouter (ou à lancer la démo).

### Honnêteté du service réel

Le prompt (`llmPrompt.ts`) interdit au modèle d'inventer des faits (fausses sources,
dates, URLs, emails « exposés ») et lui impose une **confiance faible** sans info
publique fiable. Côté code :

- **DNS** des domaines : réel (DoH) → chips MX ✓/~/— et test « Vérification DNS »
  marqué *Vérifié*.
- **Fournisseur mail** : déduit des vrais enregistrements MX.
- **Catch-all / SMTP / anti-énumération** : marqués **« Non vérifié — backend
  requis »**, jamais simulés en « valide ».
- **Candidats** : tous **incertains** (aucune vérif SMTP), `SMTP ?`, `Web —`.
- **Sources analysées** : section masquée (rien n'est réellement scrapé).

### Étape suivante (hors périmètre actuel)

Les vérifications réseau **actives** (SMTP `RCPT TO`, catch-all, anti-énumération)
exigent un **backend** (ports SMTP + CORS) et la validation conformité ci-dessous.
Il suffira d'une 3ᵉ implémentation de `SearchService` côté serveur, émettant les
mêmes callbacks.

## Ping de l'adresse

Sous le bouton de recherche, la section **« Ping de l'adresse »** est pré-remplie avec
l'adresse trouvée. Le ping est **réel** : il interroge le DNS en **DNS-over-HTTPS**
(Cloudflare, repli Google) pour vérifier que le domaine existe et possède des
enregistrements **MX** (donc qu'il sait recevoir des emails), et affiche les serveurs
MX, le temps de réponse et le résolveur utilisé.

Cette sonde est **passive et publique** (DNS) — compatible avec le mode « sources
publiques uniquement ». Elle confirme que le *domaine* reçoit des emails, **pas** que la
boîte existe : ça, c'est un test SMTP (`RCPT TO`) impossible depuis le navigateur (ports
bloqués + CORS), qui exige le **backend** décrit ci-dessus.

## ⚠️ Conformité (RGPD / CGU)

La vérification SMTP et l'agrégation d'identité depuis des sources publiques touchent
au **RGPD** et aux CGU des plateformes. L'app inclut un **encart de conformité** et un
mode **« sources publiques uniquement »** (activé par défaut, dans les Paramètres) qui
désactive toute sonde réseau active. **Faire valider le périmètre par l'équipe produit
avant d'activer les vérifications réseau réelles.**

## Référence de design

`design_handoff_email_finder/` contient la maquette HTML d'origine, le handoff
détaillé (`README.md`) et les captures de chaque écran (`screens/`). Ces fichiers sont
des **références** ; le code de production vit dans `src/`.
