---
phase: quick
plan: 261025-eik
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/config.json
  - mempalace.yaml
  - README.md
  - LICENSE
autonomous: true
must_haves:
  truths:
    - "Le premier commit contient exactement deux chemins : .planning/config.json (ajout de mempalace.wing = orbx) et mempalace.yaml (wing orbx + rooms) ; aucun autre fichier n'y est embarqué."
    - "README.md est intégralement en anglais, conserve toutes ses sections, liens, commandes, versions et glyphes de raccourcis, et ne contient plus aucun embed d'image ni aucun tableau de captures."
    - "README.md contient exactement une occurrence de « Orbe », sur sa dernière ligne, la ligne de crédit."
    - "LICENSE conserve la ligne de copyright d'origine et ajoute une seconde ligne pour le nouveau mainteneur ; le corps MIT reste inchangé octet pour octet."
    - "Les deux commits portent un message en français et package.json n'est pas modifié."
  artifacts:
    - "README.md : version anglaise, sans captures, avec un crédit final unique"
    - "LICENSE : deux lignes « Copyright (c) 2026 », corps MIT intact"
    - ".planning/config.json : mempalace.wing = orbx, commité"
    - "mempalace.yaml : wing orbx et rooms, commité"
  key_links:
    - ".planning/config.json mempalace.wing ↔ mempalace.yaml wing : les deux désignent la même aile orbx"
    - "README.md dernière ligne ↔ seul crédit Orbe autorisé dans tout le fichier"
    - "LICENSE ligne 3 ↔ ligne 4 : l'ajout préserve l'avis d'origine et garde une ligne vide avant le corps MIT"
---

<objective>
Préparer le dépôt Orbx pour son nouveau domicile GitHub indépendant en deux commits atomiques : d'abord la configuration GSD/MemPalace en attente, puis le README traduit en anglais, débarrassé de ses captures et porteur d'un unique crédit, avec la licence complétée au nom du nouveau mainteneur.

Purpose: le dépôt va être publié sur `github:electroheadfx/orbx` ; README.md et LICENSE doivent refléter Orbx et son nouveau mainteneur, tandis que les deux changements de configuration (`.planning/config.json` et `mempalace.yaml`) doivent être versionnés séparément et proprement.

Output: deux commits français ; README.md en anglais sans captures ; LICENSE avec deux lignes de copyright ; `.planning/config.json` et `mempalace.yaml` commités.
</objective>

<context>
@.planning/STATE.md
@.claude/CLAUDE.md
@README.md
@LICENSE
@.planning/config.json
@mempalace.yaml

## État vérifié au moment du plan

- Branche `main`, working tree avec exactement deux changements en attente : `.planning/config.json` modifié (ajout de `"wing": "orbx"` sous `mempalace`) et `mempalace.yaml` non suivi (`wing: orbx` + rooms planning/decisions/milestones/problems/general).
- README.md fait 169 lignes, entièrement en français. Le bloc entre la ligne d'état et `## Ce qui fonctionne` (lignes 14–26) contient un embed autonome et trois tableaux comparatifs, soit 4 lignes et 7 images pointant vers le dossier `docs/captures` (fichiers PNG à conserver). Une seule occurrence de « Orbe » : ligne 169, le crédit final.
- LICENSE est le texte MIT standard avec une seule ligne de copyright : `Copyright (c) 2026 Amadou Ba (PIXEWORK)`.
- `package.json` porte déjà `"name": "orbx"`, `"productName": "Orbx"`, `"author": "Laurent Marques"`, `"repository": "github:electroheadfx/orbx"` ; il ne doit pas être touché.
- Aucun hook Git n'est installé ; les commits récents sont en français, sans trailer `Co-Authored-By`.

## Contraintes d'exécution

- Ne pas créer de dépôt GitHub, ne pas changer de remote, ne pas pousser : l'orchestrateur s'en charge après le plan.
- Ne pas modifier `package.json`, les sources, ni les fichiers PNG du dossier des captures.
- Commits français, sans `-a`, sans `--amend`, sans trailer `Co-Authored-By`.
- Aucun serveur ni suite de tests à lancer (CLAUDE.md : l'utilisateur lance Orbx lui-même). Les vérifications sont statiques ou Git.
</context>

<tasks>

<task type="auto">
  <name>Task 1 : commiter la configuration GSD et MemPalace</name>
  <files>.planning/config.json, mempalace.yaml</files>
  <precondition>Le dépôt est sur `main` et le working tree présente exactement deux changements à commiter : `.planning/config.json` modifié (ajout de `mempalace.wing = orbx`) et `mempalace.yaml` non suivi (`wing: orbx` + rooms). Si l'un des deux manque ou diffère, s'arrêter sans commiter.</precondition>
  <read_first>.planning/config.json, mempalace.yaml</read_first>
  <action>
Ne modifier aucun contenu : les deux fichiers sont déjà dans l'état attendu. Exécuter `git status --short` et confirmer les deux changements. Stager uniquement ces deux chemins avec `git add -- .planning/config.json mempalace.yaml`, puis contrôler `git diff --cached --name-only` : la sortie doit être exactement `.planning/config.json` puis `mempalace.yaml`. Si un autre chemin apparaît (par exemple le fichier PLAN.md de ce plan, non suivi, ou un fichier de `.planning/quick/`), le retirer de l'index avec `git restore --staged <chemin>` et ne pas commiter tant que l'index ne contient pas exactement les deux chemins attendus. Créer ensuite un commit unique avec `git commit -m "chore: rattacher GSD et MemPalace à Orbx"`. Ne pas pousser, ne pas changer de remote, ne pas créer de dépôt.
  </action>
  <verify>
    <automated>test "$(git log -1 --pretty=%s)" = "chore: rattacher GSD et MemPalace à Orbx"</automated>
    <automated>files=$(git diff-tree --no-commit-id --name-only -r HEAD) && test "$(printf '%s\n' "$files" | sort | tr '\n' ' ')" = ".planning/config.json mempalace.yaml "</automated>
    <automated>config=$(git show HEAD:.planning/config.json) && printf '%s' "$config" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const c=JSON.parse(s);process.exit(c.mempalace && c.mempalace.wing === 'orbx' ? 0 : 1)})"</automated>
    <automated>blob=$(git show HEAD:mempalace.yaml) && printf '%s\n' "$blob" | grep -qx 'wing: orbx'</automated>
    <automated>test -z "$(git status --porcelain -- .planning/config.json mempalace.yaml)"</automated>
  </verify>
  <done>Le commit `chore: rattacher GSD et MemPalace à Orbx` existe, contient exactement `.planning/config.json` et `mempalace.yaml`, la clé `mempalace.wing` vaut `orbx` dans le fichier commité et ces deux chemins ne sont plus en attente.</done>
</task>

<task type="auto">
  <name>Task 2 : README en anglais sans captures, licence Orbx, puis commit</name>
  <files>README.md, LICENSE</files>
  <read_first>README.md, LICENSE</read_first>
  <action>
Réécrire README.md intégralement en anglais avec le même ordre de sections et le même contenu, puis mettre à jour LICENSE.

1. Conserver `# Orbx` en titre et traduire fidèlement chaque section : la phrase d'accroche, le paragraphe sur Arc, la citation d'indépendance vis-à-vis de The Browser Company, la ligne d'état avec son lien `docs/windows.md`, la liste complète « What works », la section « Keyboard shortcuts » avec son tableau, « Running Orbx from source », les paragraphes sur le harnais de tests, le DRM, le premier lancement, « Code organization », « Roadmap » et « License ». Traduire les libellés d'interface mais conserver les noms propres (Orbx, Arc, Chrome Web Store, Dark Reader, Wappalyzer, uBlock Origin Lite, CSS Peeper, GoFullPage, Claude, MIT, CC BY 3.0) et tous les liens, commandes, versions et glyphes de raccourcis à l'identique. Dans le bloc de commandes de « Running Orbx from source », ne changer que le texte des commentaires après `#` ; chaque commande, option et nombre de vérifications reste inchangé.

2. Supprimer entièrement le bloc de captures situé entre la ligne d'état et « What works » (actuellement lignes 14–26) : l'embed autonome et les trois tableaux comparatifs, donc tous les embeds d'images Markdown du fichier. Ne pas toucher aux fichiers PNG sur disque ni au reste du dossier de documentation. Laisser une seule ligne vide entre la ligne d'état et `## What works`.

3. Terminer README.md par exactement cette dernière ligne, suivie d'un saut de ligne final : `Inspired by [Orbe](https://github.com/amadoubaui/orbe), Amadou Ba's browser.` Ce doit être la seule occurrence de « Orbe » dans tout le fichier : n'employer ce nom nulle part ailleurs, y compris dans la citation d'indépendance et la liste des fonctionnalités.

4. Mettre à jour LICENSE avec l'outil Edit, sans réécrire le fichier : conserver tel quel `Copyright (c) 2026 Amadou Ba (PIXEWORK)` et insérer immédiatement après cette ligne `Copyright (c) 2026 Laurent Marques`. Laisser une ligne vide entre ce bloc de copyright et `Permission is hereby granted...` ; le corps MIT doit rester identique octet pour octet.

5. Commiter uniquement ces deux fichiers : `git add -- README.md LICENSE`, vérifier que `git diff --cached --name-only` liste exactement `LICENSE` puis `README.md`, puis créer le commit `git commit -m "docs: README en anglais et licence Orbx"`. Ne pas pousser, ne pas changer de remote, ne pas créer de dépôt, ne pas inclure le PLAN.md ni le SUMMARY dans ce commit.
  </action>
  <verify>
    <automated>test "$(grep -c 'docs/captures' README.md)" = "0"</automated>
    <automated>test "$(grep -c '!\[' README.md)" = "0"</automated>
    <automated>test "$(grep -c 'Orbe' README.md)" = "1" && grep -Fqx "Inspired by [Orbe](https://github.com/amadoubaui/orbe), Amadou Ba's browser." README.md && test "$(tail -n 1 README.md)" = "Inspired by [Orbe](https://github.com/amadoubaui/orbe), Amadou Ba's browser."</automated>
    <automated>for h in '## What works' '## Keyboard shortcuts' '## Running Orbx from source' '## Code organization' '## Roadmap' '## License'; do test "$(grep -cF "$h" README.md)" = "1" || exit 1; done</automated>
    <automated>grep -Fq '(docs/windows.md)' README.md && grep -Fq '(docs/mots-de-passe.md)' README.md && grep -Fq '(docs/etude-extensions-et-distribution.md)' README.md && grep -Fq '(docs/feuille-de-route.md)' README.md && grep -Fq 'https://github.com/electroheadfx/orbx.git' README.md && grep -Fq '(LICENSE)' README.md</automated>
    <automated>grep -Fq 'ORBX_DRM=1 npm start' README.md && grep -Fq 'ORBX_TEST_VISIBLE=1' README.md && grep -Fq '~/Library/Application Support/Orbx' README.md && grep -Fq '⌃⇧E' README.md && grep -Fq '⌥⇧⌘2' README.md && grep -Fq '⇧⌘T' README.md</automated>
    <automated>test "$(grep -c 'Copyright (c) 2026' LICENSE)" = "2" && grep -qx 'Copyright (c) 2026 Amadou Ba (PIXEWORK)' LICENSE && grep -qx 'Copyright (c) 2026 Laurent Marques' LICENSE</automated>
    <automated>stat=$(git diff --numstat HEAD^ -- LICENSE) && test "$(printf '%s' "$stat" | awk '{print $1" "$2}')" = "1 0"</automated>
    <automated>delta=$(git diff -U0 HEAD^ -- LICENSE) && printf '%s\n' "$delta" | grep -qx '+Copyright (c) 2026 Laurent Marques'</automated>
    <automated>node -e "JSON.parse(require('fs').readFileSync('package.json'))" && git diff --quiet HEAD^ -- package.json && git diff --quiet HEAD^ -- docs/captures && test "$(ls docs/captures/*.png | wc -l | tr -d ' ')" = "7"</automated>
    <automated>test "$(git log -1 --pretty=%s)" = "docs: README en anglais et licence Orbx" && files=$(git diff-tree --no-commit-id --name-only -r HEAD) && test "$(printf '%s\n' "$files" | sort | tr '\n' ' ')" = "LICENSE README.md " && test -z "$(git status --porcelain -- README.md LICENSE)"</automated>
  </verify>
  <done>README.md est entièrement en anglais, ses six sections traduites existent une fois chacune, tous ses liens/commandes/versions/glyphes sont présents, aucun embed d'image ne subsiste, et « Orbe » n'apparaît qu'une fois, sur la dernière ligne. LICENSE contient les deux lignes de copyright et un corps MIT inchangé (une seule ligne ajoutée, aucune supprimée). Le commit `docs: README en anglais et licence Orbx` contient exactement README.md et LICENSE ; package.json et les PNG du dossier des captures n'ont pas changé.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| working tree → historique Git | Les deux commits publient du contenu qui partira vers un nouveau dépôt distant ; un staging trop large y ferait entrer des fichiers non voulus. |
| README/LICENSE → dépôt public | Documentation publique ; aucun secret, aucune donnée utilisateur, aucune modification de code d'exécution. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-EIK-01 | Tampering | index Git des deux commits | medium | mitigate | Staging par chemins explicites uniquement, contrôle de `git diff --cached --name-only` avant chaque commit et vérification de `git diff-tree` après : exactement deux chemins au premier commit, deux au second. Aucun `git add .`, `git add -A` ni `git commit -a`. |
| T-EIK-02 | Repudiation | attribution des commits | low | accept | Messages français conformes à l'historique ; aucun trailer `Co-Authored-By` n'est ajouté, l'auteur Git configuré reste responsable des commits. |
| T-EIK-SC | Tampering | npm/pip/cargo installs | high | mitigate | Aucune installation ni modification de dépendance : le plan ne touche ni package.json ni aucun manifeste ; la vérification confirme que package.json est identique à `HEAD^`. |
</threat_model>

<verification>
Vérifications statiques et Git uniquement, exécutées depuis la racine du dépôt. Bases relevées avant travaux : 4 lignes contiennent `docs/captures` et 4 lignes contiennent un embed d'image dans README.md ; « Orbe » apparaît 1 fois (ligne 169) ; LICENSE contient 1 ligne `Copyright (c) 2026` ; les six titres anglais sont absents ; les liens, commandes et glyphes listés sont déjà présents.

1. Après Task 1 : le dernier sujet est le message français attendu, `git diff-tree` liste exactement `.planning/config.json` et `mempalace.yaml`, le JSON commité parse et `mempalace.wing` vaut `orbx`, et les deux chemins ne sont plus en attente.
2. Après Task 2 : les comptes `docs/captures` et embeds d'images valent 0 (grep sort en 1 pour un compte nul : c'est attendu, le test porte sur la sortie « 0 ») ; « Orbe » vaut 1 et la dernière ligne correspond exactement au crédit ; chaque titre anglais apparaît une fois ; les liens, commandes, variables d'environnement et glyphes de raccourcis sont présents ; LICENSE a deux lignes de copyright.
3. Le diff de LICENSE par rapport à `HEAD^` ajoute exactement une ligne (le nouveau copyright) et n'en supprime aucune, ce qui prouve que le corps MIT est intact.
4. `package.json` parse encore et est identique à `HEAD^` ; le dossier `docs/captures` est identique à `HEAD^` et contient toujours ses 7 PNG.
5. Le second commit contient exactement `LICENSE` et `README.md` ; plus aucune modification n'est en attente sur ces deux fichiers.

Aucun serveur ni suite de tests n'est lancé : ce plan ne touche que de la documentation et deux fichiers de configuration déjà modifiés.
</verification>

<success_criteria>
- Deux commits atomiques en français : `chore: rattacher GSD et MemPalace à Orbx` puis `docs: README en anglais et licence Orbx`.
- Le premier commit contient uniquement `.planning/config.json` et `mempalace.yaml`, avec `wing: orbx` dans les deux.
- README.md est intégralement en anglais, conserve toutes les sections, liens, commandes, versions et glyphes, n'a plus aucun embed d'image ni tableau de captures, et ne contient qu'une seule occurrence de « Orbe », sur la dernière ligne.
- LICENSE conserve `Copyright (c) 2026 Amadou Ba (PIXEWORK)` et ajoute `Copyright (c) 2026 Laurent Marques` ; le corps MIT est inchangé octet pour octet.
- `package.json`, les sources et les PNG du dossier des captures sont intacts ; aucun dépôt, remote ou push n'est créé par l'exécuteur.
</success_criteria>

<output>
Créer `.planning/quick/261025-eik-rebranding-orbx-commit-planning-mempalac/261025-eik-SUMMARY.md` à la fin, avec les deux hashes de commit, les messages, la liste des fichiers commités et le résultat des vérifications. Mentionner explicitement que l'exécuteur n'a créé aucun dépôt GitHub, changé aucun remote et poussé aucun commit.
</output>
