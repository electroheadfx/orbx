---
phase: quick
plan: 261025-f9z
subsystem: ui
tags: [electron, icons, lucide, svg, i18n, sidebar, command-palette, library]

requires: []
provides:
  - "Jeu Lucide curaté de 84 icônes vendorisées, mots-clés français/anglais et recherche pliée"
  - "Validation lucide:<nom> contre liste blanche dans icons.valid/clean, plus icons.label et icons.isLucide"
  - "Helpers de rendu iconEl/iconMarkup/iconLabel et sélecteur à deux onglets Émoji/Icônes"
affects: [ui, settings, imports, library, menu, palette, little-window]

actuals:
  tokens: 19387
  tasks: 3
  commits: 3

commits: 3
plan_head_before: 0fab752feaceb90368f28abddaeef423b0fc2406
plan_head_after: 21509b21639bde794e85a20862c77d7f8a805d65

tech-stack:
  added: []
  patterns:
    - "Module de données dual-realm (script classique + CommonJS) comme emojis.js"
    - "Require paresseux du jeu vendorisé : le chemin émoji ne charge pas Lucide (DEM-10)"
    - "SVG rendu uniquement depuis le corps vendorisé indexé par nom, jamais depuis une valeur stockée"

key-files:
  created:
    - src/renderer/lucide.js
    - tests/icons.test.js
  modified:
    - .github/workflows/tests.yml
    - src/main/icons.js
    - src/main/window.js
    - src/main/palette.js
    - src/main/imports.js
    - src/main/library.js
    - src/main/main.js
    - src/renderer/common.js
    - src/renderer/shell.js
    - src/renderer/shell.html
    - src/renderer/shell.css
    - src/renderer/folderpeek.js
    - src/renderer/library.js
    - src/renderer/library.html
    - src/renderer/little.js
    - src/renderer/overlay.js
    - src/renderer/overlay.html
    - src/renderer/overlay.css
    - src/shared/locales.js
    - tests/finitions.js
    - tests/creation-espace.js

key-decisions:
  - "Valeur stockée lucide:<nom>, validée en principal contre LUCIDE_NAMES ; les émojis existants restent valides sans migration"
  - "Une seule source de vérité : LUCIDE_NAMES sert la validation, la recherche et le rendu"
  - "Le helper de recherche s'appelle lucideFold, pas fold, pour éviter la collision de const avec emojis.js dans l'environnement lexical partagé des scripts classiques"
  - "L'éditeur de thème (#theme-icons) reste réservé aux émojis ; theme.js n'est pas touché (décision verrouillée)"
  - "La clé IPC du choix d'icône passe de emoji à icon, sans alias de compatibilité"

metrics:
  duration: 7min
  completed: 2026-10-25
status: complete
---

# Quick Task 261025-f9z: Icônes Lucide dans le sélecteur

**Second onglet « Icônes » alimenté par 84 SVG Lucide vendorisés, validés contre une liste blanche, dessinés partout dans l'interface et réduits au nom seul dans tous les libellés natifs.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-10-25T10:41:42Z
- **Completed:** 2026-10-25T10:48:47Z
- **Tasks:** 3
- **Files modified:** 23

## Accomplishments

- `src/renderer/lucide.js` : 84 icônes curatées depuis `lucide-static@0.540.0` (23,8 Ko), mots-clés français/anglais, recherche sans accents, avis ISC + MIT/Feather recopié, module classique et CommonJS.
- `src/main/icons.js` valide `lucide:<nom>` par regex et appartenance à `LUCIDE_NAMES`, avec un require paresseux qui préserve DEM-10 ; `label()` et `isLucide()` sont exportés et les émojis restent inchangés.
- Rendu : `iconEl()`/`iconMarkup()`/`iconLabel()` dans `common.js` ; la barre latérale, l'en-tête d'Espace, les tuiles de favoris, les dossiers, le peek, l'aperçu du brouillon, la bulle de dépôt, la bibliothèque et la petite fenêtre suivent. Aucune valeur stockée n'entre dans `innerHTML` : seul le corps vendorisé indexé par nom est injecté, un nom inconnu rend `•`.
- Sélecteur : deux onglets Émoji/Icônes, grille plate à 9 colonnes sans `<h4>`, recherche par onglet, teintes masquées côté Icônes, ouverture sur l'onglet qui correspond à l'icône courante, contrat `.em-pick`/`data-e`/`ArrowDown: 9` conservé.
- Libellés principaux : `window.js`, `palette.js`, `imports.js`, `main.js` et `library.js` (alias `iconsLib`) affichent le nom seul pour un Espace Lucide ; message IPC renommé `icon`.
- Suite `node --test tests/icons.test.js` : 10 tests verts (liste blanche, noms malformés, émojis, `clean`, `label`, `isLucide`, laziness, recherche, sûreté des corps SVG, en-tête de licence) ; étape CI « Icônes » ajoutée.

## Task Commits

1. **Task 1 : vendoriser le jeu Lucide et étendre le contrat d'icône** — `61319aa` (feat)
2. **Task 2 : rendre les icônes Lucide dans la barre latérale et la bibliothèque** — `289f4cf` (feat)
3. **Task 3 : onglets du sélecteur, message IPC et libellés principaux** — `21509b2` (feat)

Commits mesurés sur le registre du plan : 3 (`0fab752..21509b2`).

## Files Created/Modified

- `src/renderer/lucide.js` — jeu vendorisé, mot-clés, recherche, liste blanche, licence.
- `tests/icons.test.js` — suite unitaire du contrat d'icône.
- `src/main/icons.js` — validation Lucide, `label`, `isLucide`, require paresseux.
- `src/renderer/common.js` — `emojiEl`, `iconEl`, `iconMarkup`, `iconLabel`.
- `src/renderer/shell.js`, `folderpeek.js`, `library.js`, `little.js` — rendu des icônes par les helpers partagés.
- `src/renderer/shell.html`, `library.html`, `overlay.html` — chargement de `lucide.js` et bandeau d'onglets.
- `src/renderer/shell.css`, `overlay.css` — dimensions des SVG par contexte, styles des onglets.
- `src/renderer/overlay.js` — onglets, recherche par onglet, `pickIcon({ icon })`, aperçus.
- `src/shared/locales.js` — quatre clés `icons.*` en français et en anglais.
- `src/main/window.js` — `spaceLabel` via `icons.label`, `chooseIcon` lit `icon`.
- `src/main/palette.js`, `imports.js`, `library.js`, `main.js` — libellés d'Espace sans valeur encodée.
- `.github/workflows/tests.yml` — étape « Icônes ».
- `tests/finitions.js`, `tests/creation-espace.js` — contrat `icon` et parcours Lucide (E2E à exécuter par l'auteur).

## Decisions Made

- Stockage `lucide:<nom>` validé à l'écriture ; pas de champ parallèle ni de migration.
- Le jeu vendorisé reste la seule source : validation, recherche et rendu lisent la même liste.
- L'éditeur de thème n'offre pas de pastilles Lucide (décision verrouillée) ; une icône Lucide survit aux changements de couleur.
- L'onglet par défaut reste Émoji, sauf si l'icône courante est déjà Lucide.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking prevention] Helper de recherche nommé `lucideFold` au lieu de `fold`**
- **Found during:** Task 1 (génération de `src/renderer/lucide.js`)
- **Issue:** `emojis.js` déclare déjà un `const fold` au niveau supérieur et les deux fichiers sont chargés comme scripts classiques dans le même environnement lexical global ; un second `const fold` aurait levé `Identifier 'fold' has already been declared` au chargement d'`overlay.html` et de `shell.html`.
- **Fix:** le helper du jeu Lucide s'appelle `lucideFold`.
- **Files modified:** `src/renderer/lucide.js`
- **Verification:** `node --check src/renderer/lucide.js` et suite `node --test tests/icons.test.js`.
- **Committed in:** `61319aa` (Task 1)

**2. [Plan typo] `win.spaceLabel` plutôt que `w.spaceLabel` dans le scénario E2E**
- **Found during:** Task 3 (`tests/finitions.js`)
- **Issue:** `spaceLabel` est une fonction exportée par le module `src/main/window.js`, pas une méthode de l'instance de fenêtre ; le scénario importe déjà ce module sous le nom `win`.
- **Fix:** l'assertion appelle `win.spaceLabel(space)`.
- **Files modified:** `tests/finitions.js`
- **Verification:** `node --check tests/finitions.js` ; non exécuté par l'exécuteur (E2E).
- **Committed in:** `21509b2` (Task 3)

---

**Total deviations:** 2 (1 préventive de blocage, 1 correction de coquille du plan)
**Impact on plan:** Aucun changement de comportement ni de portée ; les deux corrections étaient nécessaires pour que le code et le test soient valides.

## Issues Encountered

Aucun. Les téléchargements épinglés ont tous abouti, les 84 noms sont présents. Les scénarios E2E et UI n'ont pas été lancés, conformément à la contrainte d'environnement : l'auteur les exécute (`npm test`, `npm run test:ui`). Toutes les vérifications autorisées (suite unitaire, `node --check`, greps du plan) passent.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Le sélecteur est prêt pour Espaces, dossiers et onglets ; aucune dépendance ni build ajoutés.
- Reste à lancer la suite E2E et les tests UI côté auteur pour confirmer le parcours visuel du second onglet.

## Self-Check: PASSED

- Fichiers attendus présents : `src/renderer/lucide.js`, `tests/icons.test.js`, SUMMARY, `src/main/icons.js`, `tests/finitions.js`, `tests/creation-espace.js`.
- Commits `61319aa`, `289f4cf` et `21509b2` sont ancêtres de HEAD.
- Aucune modification de source non commitée ; seul le dossier `.planning/quick/261025-f9z-…` reste à committer par l'orchestrateur.
