# Emailor — Recherche & vérification d'email assistée par IA

Application web **desktop plein écran** qui retrouve l'adresse email professionnelle
d'une personne à partir de son **prénom, nom, société** (et domaine optionnel). Elle
combine un **raisonnement IA** affiché en direct, un **moteur de résolution
d'identité**, une **vérification technique** (DNS, SMTP, catch-all…) et un **moteur de
normalisation des noms internationaux**. Toute l'interface est en français.

Cette implémentation reproduit fidèlement la maquette de référence
(`design_handoff_email_finder/Recherche email.dc.html`) en **React + Vite +
TypeScript**, avec données simulées et révélation progressive (~5–6 s).

## Démarrer (web)

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck (tsc -b) + bundle de production
npm run preview  # sert le build
```

## Application desktop Debian (sans navigateur)

L'app peut tourner comme une **application native**, dans sa propre fenêtre, **sans
ouvrir de navigateur**. Le dossier `desktop/` contient un lanceur Python qui sert le
build `dist/` en local (sur `127.0.0.1`, invisible) et l'affiche dans une fenêtre
**GTK** via le webview système **WebKit2GTK** — déjà présent sur GNOME/Debian. Aucune
réécriture, aucune dépendance lourde (ni Electron, ni Rust).

Prérequis (Debian/GNOME, généralement déjà installés) :
`gir1.2-webkit2-4.1`, `gir1.2-gtk-3.0`, `python3-gi`.

```bash
# Lancer directement (build + fenêtre native)
npm run desktop

# …ou installer une entrée de menu + icône
./desktop/install.sh        # crée ~/.local/share/applications/emailor.desktop
```

Les réglages (clé API OpenRouter, modèle, mode conformité) sont persistés dans
`~/.local/share/emailor`.

### Vérification SMTP réelle (natif uniquement)

Le shell natif expose une **API locale** (`127.0.0.1`, non exposée au réseau) que le
front appelle pour une **vraie vérification SMTP** — impossible dans un navigateur :

- `desktop/smtp_verify.py` — résout les MX (DoH), ouvre une connexion SMTP et déroule
  `HELO / MAIL FROM:<> / RCPT TO` **sans envoyer de message**, lit le code (250 / 550…),
  et teste une adresse aléatoire pour détecter un domaine **catch-all** / anti-énumération.
- Endpoints : `GET /api/health` (capacités) et `GET /api/smtp?email=…`.
- Dans l'UI : bouton **« Vérifier la boîte (SMTP) »** sous l'adresse identifiée →
  *Boîte confirmée* (vert) / *Boîte inexistante* (rouge) / *Indéterminé · catch-all*
  (ambre) / *MX injoignable* (port 25 filtré).

⚠️ **Compliance & limites** : la sonde SMTP est une action **active** → désactivée tant
que le mode « Sources publiques uniquement » est actif (un indice invite à le couper).
Le **port 25 sortant est souvent bloqué** par les FAI → statut *MX injoignable*. Les
fournisseurs anti-énumération (M365, Google, Proofpoint) répondent 250 à tout le monde
→ détecté comme *catch-all / indéterminé*. En mode web (navigateur), `/api/*` n'existe
pas → la fonctionnalité est simplement masquée.

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
    personalEmailSearch.ts    Exception : adresses perso (gmail…) sans LLM
    freeProviders.ts          Détection des fournisseurs perso + génération de formats
    techCheck.ts              Section « vérif technique » à partir du DNS réel (partagé)
    scoring.ts                Score de confiance CALCULÉ (signaux vérifiés) + explications
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
    TechnicalVerification.tsx 5 tests techniques (DNS/fournisseur/catch-all/SMTP…)
    ScorePanel.tsx            Score de confiance calculé, lignes cliquables (explications)
    ResultsList.tsx           Adresse identifiée, domaines, format, sources, candidats
    SettingsDialog.tsx        Dialogue Paramètres
    NameNormalizationRules.tsx Accordéon des 11 pays
    ComplianceNotice.tsx      Encart RGPD + mode « sources publiques uniquement »
```

### La couche `SearchService`

Tout service expose `run(input, handlers): cancel` et émet les mêmes callbacks dans
le même ordre ; le hook `useEmailSearch` les branche sur l'état React, sans rien
connaître de la source. `revealScenario()` fait défiler un `Scenario` complet à la
cadence de la maquette. Trois implémentations :

- **`personalEmailSearch` (exception, prioritaire)** — si la Société (ou le Domaine)
  est un **fournisseur d'email personnel** (`gmail`, `outlook`, `hotmail`, `yahoo`,
  `proton`, `icloud`, `orange`…), on ne cherche PAS l'entreprise correspondante : on
  génère les formats personnels (`prénom.nom`, `prénomnom`, `nom.prénom`…) sur le bon
  domaine et on vérifie celui-ci en DNS réel. Sans LLM, sans section identité.
  Le **domaine saisi est respecté** :
  - `gmail` → `roger.dupont@gmail.com`
  - `yahoo` → `roger.dupont@yahoo.com` (et `yahoo.fr` → `…@yahoo.fr`)
  - `hotmail` → `roger.dupont@hotmail.com` · `outlook` → `…@outlook.com`
- **`openRouterSearch` (réel, par défaut quand configuré)** — interroge le modèle
  OpenRouter pour le raisonnement, la résolution d'identité, le format et les
  hypothèses d'adresses, **vérifie les domaines en DNS réel** (DoH), puis fait défiler
  le résultat. **Aucune donnée n'est inventée** (cf. ci-dessous).
- **`simulatedSearchService` (démo)** — scénario **fictif** (`buildScenario`, cas
  vedette « Dupont »), lancé via le bouton « Lancer une démo (données fictives) ».

À la recherche, l'App teste d'abord l'exception « email personnel » ; sinon elle
choisit le service réel dès qu'une **clé API + un modèle** sont configurés ; sinon
elle affiche une notice invitant à configurer OpenRouter (ou à lancer la démo).

### Honnêteté du service réel

Le prompt (`llmPrompt.ts`) interdit au modèle d'inventer des faits (fausses sources,
dates, URLs, emails « exposés ») et lui impose une **confiance faible** sans info
publique fiable. Côté code :

- **DNS** des domaines : réel (DoH) → chips MX ✓/~/— et test « Vérification DNS »
  marqué *Vérifié*.
- **Fournisseur mail** : déduit des vrais enregistrements MX.
- **Catch-all / SMTP / anti-énumération** dans la révélation auto : marqués
  **« Non vérifié »**, jamais simulés en « valide ».
- **Candidats** : tous **incertains** dans la révélation auto, `SMTP ?`, `Web —`.
- **Sources analysées** : section masquée (rien n'est réellement scrapé).

La **vérification SMTP réelle** (`RCPT TO`) est désormais disponible **à la demande**
dans l'application desktop native (voir plus haut) — pas dans le navigateur.

### Score de confiance calculé (`scoring.ts` + `ScorePanel`)

La confiance affichée pour l'adresse retenue n'est **pas** décorative : c'est la
**somme des signaux réellement vérifiés** pour ce résultat précis, calculée par
`computeScore()` :

| Signal | Poids | Appliqué quand |
| --- | --- | --- |
| Domaine valide (DNS réel) | +10 | le domaine résout avec un MX (DoH) |
| Format cohérent | +30 | le format dominant est déduit avec ≥ 50 % de confiance |
| Identité résolue | +30 | identité résolue avec ≥ 60 % (jamais en mode email perso) |
| Adresse observée publiquement | +40 | l'adresse exacte est vue dans une source publique |
| SMTP favorable | +20 | la vérif SMTP (desktop) renvoie *deliverable* |
| Domaine catch-all | −30 | la vérif SMTP révèle un catch-all |

Seuls les signaux appliqués comptent ; le total est borné à 0–100. **Cliquer une
ligne** du panneau « Score de confiance · calculé » explique le poids (méthodologie)
et **pourquoi il s'applique — ou non — à ce résultat**. Le score se **recalcule** quand
on lance la vérification SMTP (qui peut activer +20 ou la pénalité −30).

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
