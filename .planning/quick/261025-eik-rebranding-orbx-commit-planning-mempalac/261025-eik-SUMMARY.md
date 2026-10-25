---
phase: quick
plan: 261025-eik
subsystem: documentation publique et configuration GSD/MemPalace
tags: [readme, licence, traduction, mempalace, git, rebranding]
status: complete
requires: []
provides:
  - "README.md intégralement en anglais, sans captures, avec un unique crédit sur la dernière ligne"
  - "LICENSE avec l'avis d'origine et le nouveau mainteneur, corps MIT intact"
  - ".planning/config.json et mempalace.yaml rattachés à l'aile orbx et versionnés"
affects: [README.md, LICENSE, .planning/config.json, mempalace.yaml]
tech-stack:
  added: []
  patterns:
    - "Traduction fidèle section par section, commandes, liens, versions et glyphes conservés à l'identique"
    - "Suppression du bloc de captures sans toucher aux 7 PNG de docs/captures"
key-files:
  created:
    - mempalace.yaml
  modified:
    - .planning/config.json
    - README.md
    - LICENSE
decisions:
  - "README.md traduit en anglais à contenu constant : mêmes sections, liens, commandes, versions et glyphes ; seuls les commentaires après # du bloc de commandes changent."
  - "Crédit final unique « Inspired by [Orbe](https://github.com/amadoubaui/orbe), Amadou Ba's browser. » : c'est la seule occurrence de « Orbe » dans le fichier."
  - "LICENSE complétée par une seule ligne ajoutée, sans réécriture : le corps MIT reste identique octet pour octet."
metrics:
  duration: "1 min 5 s"
  completed: 2026-10-25
  tasks: 2
  files: 4
commits: 2
plan_head_before: 2ff7cd793fcac53e8d96c14c24313ee3a88e855e
plan_head_after: e202cdbfcf0d76c46cf9c93a1248860129092380
---

# Quick 261025-eik : rebranding Orbx pour son dépôt autonome

README traduit en anglais et débarrassé de ses captures, licence complétée au nom du nouveau mainteneur, et configuration GSD/MemPalace rattachée à l'aile orbx — en deux commits atomiques français.

## Commits

| Commit | Tâche | Contenu |
|--------|-------|---------|
| `2952958` | 1. Configuration GSD et MemPalace | `.planning/config.json` : ajout de `mempalace.wing = "orbx"`. `mempalace.yaml` : nouveau fichier, `wing: orbx` et rooms planning/decisions/milestones/problems/general. 2 fichiers, +12 / −1. |
| `e202cdb` | 2. README et licence | `README.md` : traduction anglaise intégrale, suppression de l'embed et des trois tableaux de captures, crédit final unique. `LICENSE` : ajout de `Copyright (c) 2026 Laurent Marques` sous la ligne d'origine. 2 fichiers, +133 / −147. |

Total : 4 fichiers, +145 / −148 depuis `2ff7cd7`.

## Vérifications exécutées

| Commande | Résultat |
|----------|----------|
| `git log -1 --pretty=%s` (commit 1) | `chore: rattacher GSD et MemPalace à Orbx` |
| `git diff-tree --name-only -r HEAD` (commit 1), trié | `.planning/config.json mempalace.yaml` |
| `JSON.parse` du `.planning/config.json` commité, contrôle `mempalace.wing` | `orbx` |
| `git show HEAD:mempalace.yaml \| grep -qx 'wing: orbx'` | présent |
| `git status --porcelain -- .planning/config.json mempalace.yaml` | vide |
| `grep -c 'docs/captures' README.md` / `grep -c '!\[' README.md` | `0` / `0` |
| `grep -c 'Orbe' README.md` + dernière ligne exacte | `1`, crédit conforme |
| Six titres anglais (`What works`, `Keyboard shortcuts`, `Running Orbx from source`, `Code organization`, `Roadmap`, `License`) | 1 occurrence chacun |
| Liens `docs/windows.md`, `docs/mots-de-passe.md`, `docs/etude-extensions-et-distribution.md`, `docs/feuille-de-route.md`, dépôt Git, `LICENSE` | tous présents |
| `ORBX_DRM=1 npm start`, `ORBX_TEST_VISIBLE=1`, `~/Library/Application Support/Orbx`, `⌃⇧E`, `⌥⇧⌘2`, `⇧⌘T` | tous présents |
| `LICENSE` : lignes `Copyright (c) 2026` | `2`, dont `Amadou Ba (PIXEWORK)` et `Laurent Marques` |
| `git diff --numstat HEAD^ -- LICENSE` | `1 0` (une ligne ajoutée, aucune supprimée) |
| `git diff -U0 HEAD^ -- LICENSE` | contient `+Copyright (c) 2026 Laurent Marques` |
| `package.json` parse et `git diff HEAD^` vide ; `docs/captures` inchangé, 7 PNG | OK |
| `git log -1 --pretty=%s` (commit 2) et `git diff-tree --name-only -r HEAD` | `docs: README en anglais et licence Orbx`, exactement `LICENSE README.md` |

Aucun serveur ni suite de tests n'a été lancé : ce plan ne touche que de la documentation et deux fichiers de configuration.

## Deviations from Plan

None — plan exécuté tel qu'écrit.

Aucun dépôt GitHub n'a été créé, aucun remote n'a été changé et aucun commit n'a été poussé par l'exécuteur.

## Self-Check: PASSED

- `.planning/config.json` et `mempalace.yaml` : commités dans `2952958`, `wing: orbx` vérifié dans les deux.
- `README.md` et `LICENSE` : commités dans `e202cdb`, contenus vérifiés.
- Arbre de travail propre après les deux commits, hors le répertoire de ce plan laissé au commit docs de l'orchestrateur.
