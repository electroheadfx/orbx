---
phase: quick
plan: 261025-cqq
subsystem: barre latérale — pastilles des Espaces
tags: [css, espaces, barre-laterale, icones, regression, playwright]
status: complete
requires: []
provides:
  - "Chaque pastille d'Espace affiche l'icône de son propre Espace, active ou non"
  - "Hiérarchie visuelle conservée : icône active 13 px/opacité 1, inactives 11 px/opacité 0,55"
  - "Assertion de régression sur le texte, l'affichage et la hiérarchie des icônes dans tests/ui/06-espaces.js"
affects: [src/renderer/shell.css, src/renderer/shell.js, tests/ui/06-espaces.js]
tech-stack:
  added: []
  patterns:
    - "CSS pur, sans changement de markup : drawSpaces() rendait déjà un <span class=\"em\"> par pastille"
    - "États survol/dépôt portés par .em et la pastille, sans pseudo-élément point"
key-files:
  created: []
  modified:
    - src/renderer/shell.css
    - src/renderer/shell.js
    - tests/ui/06-espaces.js
decisions:
  - "Suppression complète du point pseudo-élément .sp::before et de la règle .sp:not(.active) .em : l'icône de chaque Espace est désormais rendue par le markup existant de drawSpaces."
  - "Pastilles de 16 px et gap de 1 px : 8 × 16 + 1 × 26 + 8 × 1 = 162 px, sous les 170 px disponibles à la largeur de barre par défaut, ce qui préserve l'essai « 9 pastilles »."
  - "L'assertion ne compare pas l'opacité de l'icône active à 1, car l'animation sp-in peut être en cours : le test reste stable sans attendre sa fin ni dépendre de prefers-reduced-motion."
metrics:
  duration: "1 min 15 s"
  completed: 2026-10-25
  tasks: 2
  files: 3
commits: 2
plan_head_before: c9928b874a97899b09ed34d274412ebab281b939
plan_head_after: 45b65c1774232d25a85359a2587c8583b81aefc4
---

# Quick 261025-cqq : l'icône de chaque Espace dans les pastilles

Correction CSS du défaut signalé : les pastilles des Espaces inactifs affichaient un point gris au lieu de leur propre icône. Les icônes de tous les Espaces sont maintenant visibles, avec une hiérarchie active/inactive conservée et une assertion de régression ajoutée.

## Commits

| Commit | Tâche | Contenu |
|--------|-------|---------|
| `709e4d5` | 1. Icônes des pastilles | `shell.css` : suppression de `.sp::before` et de `.sp:not(.active) .em`, `.sp` à 16 px, gap de 1 px, icônes inactives 11 px/0,55, active 13 px/1 avec `sp-in`, survol et `drop-into` ajustés ; commentaire de `drawSpaces` dans `shell.js` à jour. 2 fichiers. |
| `45b65c1` | 2. Assertion de régression | `tests/ui/06-espaces.js` : lit le texte, l'affichage, la taille et l'opacité calculés de chaque `.em` et vérifie 🏠/✨, la visibilité des inactives et la hiérarchie visuelle. 1 fichier. |

Total : 3 fichiers, +16 / −10 depuis `c9928b8`.

## Vérification statique exécutée

| Commande | Résultat |
|----------|----------|
| `node --check src/renderer/shell.js` | OK |
| `node --check tests/ui/06-espaces.js` | OK |
| `grep -Ec '\.sp(::before\|:hover::before\|\.active::before\|\.drop-into::before)' src/renderer/shell.css` | `0` |
| `grep -Fc 'sp:not(.active) .em' src/renderer/shell.css` | `0` |
| `grep -Fc '.sp .em {'`, `.sp.active .em {`, `.sp.drop-into .em {` | `1 / 1 / 1` |
| `grep -Fc '#spaces { display: flex; align-items: center; justify-content: center; gap: 1px; overflow: hidden; }'` | `1` |
| `grep -Fq 'width: 16px'` sur `shell.css` | présent (8 occurrences, dont `.sp`) |
| Greps de l'assertion : `el.querySelector('.em')`, `getComputedStyle(em)`, message « chaque pastille porte l'icône de son Espace » | `1 / 1 / 1` |

La suite UI **n'a pas été lancée volontairement** (`npm run test:ui` et `node tests/ui/06-espaces.js` démarrent Electron ; l'utilisateur lance Orbx lui-même). L'assertion ajoutée s'exécutera en CI ou au prochain `npm run test:ui`. Le contrôle visuel est laissé à l'utilisateur : avec au moins deux Espaces, chaque pastille du bas montre l'icône de son Espace, l'Espace affiché restant plus large et plus net ; survol, glisser et dépôt d'un onglet restent lisibles.

## Deviations from Plan

None — plan exécuté tel qu'écrit.

## Self-Check: PASSED

- `src/renderer/shell.css` : modifié et commité (`709e4d5`).
- `src/renderer/shell.js` : commentaire modifié et commité (`709e4d5`).
- `tests/ui/06-espaces.js` : assertion ajoutée et commitée (`45b65c1`).
- Arbre de travail propre après les deux commits code (`git status --short` ne montre que ce SUMMARY, laissé au commit docs de l'orchestrateur).
