---
phase: quick
plan: 261025-bc6
subsystem: renommage et migration de profil
tags: [orbe, orbx, renommage, migration, profil, packaging, ci]
status: complete
requires: []
provides:
  - runtime Orbx (marque, protocole orbx://, IPC orbx, window.orbx/orbxPanel, ORBX_*)
  - reprise unique et non destructive du profil Orbe vers Orbx
  - fabrication et CI Orbx (Orbx.app, Orbx.exe, archives Orbx-<version>-*)
  - lecture du coffre de mots de passe au marqueur hérité « orbe »
affects: [src/main, src/preload, src/renderer, src/shared, scripts, assets, tests, .github]
tech-stack:
  added: []
  patterns:
    - "migration Node pure, sans Electron, exécutée avant le verrou d'instance et store.load"
    - "fusion non destructive d'un profil pré-créé par Electron (hasProfileData)"
    - "réécriture JSON atomique (fichier temporaire + fsync + rename, mode conservé)"
    - "execFile avec arguments fixes pour le trousseau et le registre, sans shell"
key-files:
  created:
    - src/main/migrate-profile.js
    - tests/migrate-profile.test.js
  modified:
    - src/main/main.js
    - src/main/passwords.js
    - src/main/commands.js
    - src/main/menu.js
    - src/main/win-default.js
    - src/main/store.js
    - src/main/sessions.js
    - src/main/window.js
    - src/shared/locales.js
    - src/renderer/welcome.html
    - src/renderer/welcome.js
    - package.json
    - scripts/build-mac.js
    - scripts/build-win.js
    - .github/workflows/tests.yml
    - README.md
    - tests/accueil.js
    - tests/passwords.js
    - tests/pe-resources.test.js
    - tests/win-package.js
    - tests/finitions2.js
    - "assets/orbe.ico -> assets/orbx.ico (renommé)"
    - "assets/orbe.icns -> assets/orbx.icns (renommé)"
decisions:
  - "La migration s'exécute dans main.js avant requestSingleInstanceLock() et store.load, jamais en mode --selftest ni quand ORBX_USER_DATA est imposé."
  - "La cible userData pré-créée par Electron est détectée via hasProfileData() : un dossier de démarrage (GPUPersistentCache) ne compte pas, un vrai profil est fusionné entrée par entrée sans écrasement."
  - "Les liens symboliques sont refusés sans être suivis ; l'ancien dossier n'est retiré que s'il est vide ; aucune suppression récursive."
  - "orbx.json/history.json sont réécrits atomiquement ; un JSON invalide est laissé octet pour octet ; orbx.json.bak est migré en premier."
  - "Le coffre de mots de passe reste lisible avec l'ancien marqueur « orbe » et repasse à « orbx » au prochain enregistrement."
  - "Le soutien (menu, locales, carte de l'accueil, lien de don README) est supprimé, pas renommé."
  - "Identité de publication : Laurent Marques, com.electroheadfx.orbx, dépôt electroheadfx/orbx ; version 0.15.5 et licence MIT inchangées."
metrics:
  duration: "session entrecoupée d'un compactage ; 3 min 21 s entre le premier et le dernier commit"
  completed: 2026-10-25
  tasks: 3
  files: 188
commits: 3
plan_head_before: 8a965bdc17b4aba159db1114ff385c1d6c8215b6
plan_head_after: 96e0e412351afeec176cb5a8ccb944db746e4084
---

# Quick 261025-bc6 : Orbe → Orbx, renommage complet et reprise du profil

Renommage mécanique et manuel de tout le produit en Orbx, avec migration unique du profil utilisateur Orbe vers Orbx, nouvelle identité de publication et suppression du soutien.

## Commits

| Commit | Tâche | Contenu |
|--------|-------|---------|
| `5ec6646` | 1. Runtime | `OrbxWindow`, protocole `orbx://`, IPC `orbx`, `window.orbx`/`orbxPanel`, `ORBX_*`, `persist:orbx`, `orbx.json`, icônes renommées, migration et sa suite (17 tests), soutien retiré. 95 fichiers. |
| `8d5c035` | 2. Fabrication, CI, docs | `package.json`, scripts de build et d'outillage, CI, README, `docs/**`, en-tête de la blocklist. Identité `Laurent Marques` / `com.electroheadfx.orbx` / `github:electroheadfx/orbx`. 27 fichiers. |
| `96e0e41` | 3. Tests | 66 fichiers de tests et harnais adaptés ; accueil sans carte de soutien ; coffre hérité couvert ; PE et registre en `Laurent Marques`. |

Total : 188 fichiers, +2 805 / −2 126 depuis `8a965bd`.

## Migration du profil

`src/main/migrate-profile.js` déplace `appData/Orbe` vers `appData/Orbx` une seule fois, au démarrage :

- raisons rendues : `moved`, `copy-moved`, `merged`, `exists`, `absent`, `custom-path`, `refused`, `error` ;
- Electron crée `Orbx/` (avec `GPUPersistentCache`) **avant** `app.whenReady()` : `hasProfileData()` ne retient que les marqueurs de vrai profil (`orbx.json`, `orbe.json`, `history.json`, `passwords.json`, `Cookies`, `Local Storage`, `Partitions`, `Network`, `Extensions`, `easels`, `Telechargements`) ;
- fusion non destructive : collision conservée côté cible, aucun écrasement, aucune suppression récursive, `rmdir` seulement si l'ancien dossier est vide ;
- `orbe.json`/`.bak` et `history.json`/`.bak` réécrits atomiquement (temporaire + fsync + rename, mode d'origine conservé), adresses `orbe://app/` → `orbx://app/`, chemins `Orbe` → `Orbx` ; JSON invalide laissé intact ;
- partitions `orbe`/`orbe-*` → `orbx`/`orbx-*` ;
- lien symbolique refusé (`lstat`, jamais suivi) ;
- macOS : copie de la clé safeStorage via `/usr/bin/security` en `execFile`, arguments fixes, secret jamais journalisé, échec non fatal ; Windows : cinq suppressions `reg.exe` fixes, échec ignoré ;
- toute erreur est contenue : `migrate()` ne lève jamais.

Câblage dans `src/main/main.js`, immédiatement après la fixation de `userData` et **avant** `requestSingleInstanceLock()` et `store.load`, avec `!SELFTEST && !process.env.ORBX_USER_DATA`. Profil d'essai et profil imposé ne sont jamais migrés.

## Vérifications exécutées

| Commande | Résultat |
|----------|----------|
| `node --test tests/migrate-profile.test.js` | 17/17 réussis |
| `node --test tests/adblock.test.js tests/extensions.test.js tests/migrate-profile.test.js tests/pe-resources.test.js` | 66 tests : 59 réussis, 0 échec, 7 sautés |
| `node --check` sur tous les `.js` modifiés | OK |
| `ORBX_RUNTIME="$HOME/.orbe-dev" ORBX_SCENARIO=tests/smoke.js npm test` | code 0 ; « Orbx 0.15.5 démarre (darwin) : 48 raccourcis affichés, le premier : ⌘T » |
| Audit de marque (hors LICENSE, README, blocklist, migration et coffre) | aucune occurrence de `Orbe`/`ORBE`/`orbe` |
| Revue des fichiers exemptés | uniquement constantes/littéraux hérités et commentaires explicatifs |
| `rg 'amadoubaui/orbe|buymeacoffee|PIXEWORK'` (hors LICENSE/README) | aucune occurrence |
| README | une seule ligne `amadoubaui/orbe`, dernière ligne du fichier |
| `git diff --numstat HEAD -- assets/blocklist.txt` | `2 2` ; `forbes.com` : 2 avant, 2 après |
| `git status --porcelain --untracked-files=no .planning` | vide |
| `git status --porcelain .claude` | vide |
| `git diff --exit-code 5a87a0e -- LICENSE` | aucun diff (code 0) |

Les 7 tests sautés sont les tests sur un vrai `electron.exe` (fuses et ressources PE) : le moteur Windows n'est pas présent sur ce Mac et `ORBX_PE_SAMPLE` n'est pas défini. Comportement attendu du test, sans rapport avec le renommage.

Avertissement npm observé, sans effet : `Unknown user config "auto-install-peers"` (configuration npm de la machine).

## Écarts par rapport au plan

**1. [Rule 1 - Bug] Idempotence : `exists` quand l'ancien dossier a disparu mais que le nouveau porte un vrai profil**

- **Constat :** la première version renvoyait `absent` au deuxième appel (l'ancien dossier n'existe plus), alors que le plan exige que les démarrages suivants voient `hasProfileData(userData)` et renvoient `exists`.
- **Correction :** dans la branche où `lstat(Orbe)` échoue, `realEntry(userData)` est vérifié ; si c'est un dossier contenant un marqueur de profil, le résultat est `{ migrated: false, reason: 'exists' }`, sinon `absent`.
- **Portée :** aucun changement du contrat non destructif ; les tests d'idempotence et de registre Windows repassent de 15/17 à 17/17.
- **Fichier :** `src/main/migrate-profile.js` (commit `5ec6646`).

Aucun autre écart : les trois tâches ont suivi le plan.

## Points laissés volontairement en Orbe

- `LICENSE` : copyright d'origine (Amadou Ba / PIXEWORK), inchangé.
- `README.md` : dernière ligne, unique attribution `Projet inspiré d'[Orbe](https://github.com/amadoubaui/orbe), le navigateur d'Amadou Ba.`
- `src/main/migrate-profile.js` : constantes héritées `Orbe`, `orbe.json`, `orbe://app/`, `Orbe Safe Storage`/`Orbe Key`, clés de registre `OrbeHTML`/`StartMenuInternet\Orbe` — nécessaires à la reprise.
- `tests/migrate-profile.test.js` : littéraux de l'ancien profil utilisés comme fixtures.
- `src/main/passwords.js` : `LEGACY_VAULT_MARKER = 'orbe'` pour relire un coffre existant.
- `tests/passwords.js` : cas du marqueur hérité.
- `assets/blocklist.txt` : seules les deux lignes d'en-tête ont changé ; les domaines (dont `forbes.com`) sont intacts.
- `.claude/CLAUDE.md` : renommé localement pour la cohérence, jamais stage ni commité (`.claude/` ignoré par git).

## Notes

- Aucune dépendance ajoutée, aucune version modifiée (0.15.5), aucun configurateur ni formateur introduit, aucune icône redessinée.
- Le nom du dossier de travail (`/Users/lmarques/Dev/orbe`) n'est pas un artefact du dépôt et n'a pas été renommé.
- `npm start` n'a pas été lancé ; seul l'essai de fumée requis l'a été, avec le moteur Electron 44.7.0 existant dans `~/.orbe-dev`.

## Self-Check: PASSED

- `src/main/migrate-profile.js` présent
- `tests/migrate-profile.test.js` présent
- `261025-bc6-SUMMARY.md` présent
- Commits `5ec6646`, `8d5c035`, `96e0e41` ancêtres de HEAD
