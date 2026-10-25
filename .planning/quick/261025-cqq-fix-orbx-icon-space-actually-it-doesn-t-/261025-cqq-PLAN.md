---
phase: quick
plan: 261025-cqq
type: execute
wave: 1
depends_on: []
files_modified:
  - src/renderer/shell.css
  - src/renderer/shell.js
  - tests/ui/06-espaces.js
autonomous: true
must_haves:
  truths:
    - "Chaque pastille d'Espace affiche l'icône de son propre Espace, y compris quand cet Espace n'est pas affiché."
    - "L'Espace affiché reste immédiatement distinguable : pastille de 26 px, icône de 13 px à pleine opacité, animation sp-in conservée au changement d'Espace."
    - "Les icônes des Espaces inactifs restent plus petites et plus discrètes (11 px, opacité 0,55) : aucun point gris ne les remplace."
    - "Survol, glisser (dragging-self) et cible de dépôt (drop-into) restent lisibles sans le pseudo-élément point : le survol éclaircit l'icône, drop-into agrandit la pastille et remet l'icône à pleine opacité."
    - "Avec 9 Espaces et la barre à sa largeur par défaut, les 9 pastilles tiennent dans #spaces (8 × 16 px + 1 × 26 px + 8 × 1 px = 162 px pour 170 px disponibles) et restent cliquables."
  artifacts:
    - "src/renderer/shell.css : règles .sp sans pseudo-élément point, icône visible pour toutes les pastilles, états actif/survol/dépôt ajustés"
    - "src/renderer/shell.js : commentaire de drawSpaces à jour ; markup et logique inchangés"
    - "tests/ui/06-espaces.js : assertion de régression sur le texte, l'affichage et la hiérarchie visuelle des icônes de pastille"
  key_links:
    - "drawSpaces (shell.js:309) produit un <span class=\"em\"> par pastille → .sp .em (shell.css) l'affiche pour toutes, l'ancienne règle de masquage ayant disparu"
    - ".sp.active .em ↔ @keyframes sp-in : l'animation de grossissement reste déclenchée par le re-rendu de drawSpaces au changement d'Espace"
    - ".sp.drop-into .em ↔ .sp.drop-into : le dépôt d'un onglet sur une pastille reste visible sans le point pseudo-élément"
    - "budget de largeur #spaces ↔ tests/ui/06-espaces.js : la rangée de 9 pastilles doit rester sous la largeur disponible par défaut"
---

<objective>
Corriger l'affichage des pastilles d'Espace dans la barre latérale : chaque pastille montre l'icône de son Espace, pas seulement celle de l'Espace affiché.

Purpose: le rapport utilisateur (« fix OrbX icon space, actually it doesn't show only when I am on a space, the others get circle icon instead their own ») décrit un défaut purement CSS. Le markup est déjà correct : `drawSpaces()` rend `<span class="em">` pour chaque Espace (src/renderer/shell.js:309-317), mais la règle `.sp:not(.active) .em { display: none }` et le point gris `.sp::before` remplacent l'icône des Espaces inactifs.

Output: `src/renderer/shell.css` corrigé (icônes visibles, hiérarchie actif/inactif, états survol/glisser/dépôt), commentaires à jour dans `shell.css` et `shell.js`, assertion de régression dans `tests/ui/06-espaces.js`.
</objective>

<context>
@.planning/STATE.md
@.claude/CLAUDE.md
@src/renderer/shell.css
@src/renderer/shell.js
@tests/ui/06-espaces.js
@src/main/store.js
@src/main/window.js

## État vérifié

- `src/renderer/shell.js:309-317` : `drawSpaces()` rend, pour chaque Espace, un `<button class="sp">` contenant `<span class="em">${esc(x.icon) || '•'}</span>` ; seul l'Espace courant reçoit `.active`. Le markup n'a pas à changer.
- `src/renderer/shell.css:431-453` : `.sp` fait 14 px de large ; `.sp::before` dessine un point de 5 px pour chaque pastille ; `.sp.active` passe à 26 px et masque le point ; `.sp:not(.active) .em` masque l'icône de tous les autres Espaces. C'est la cause unique du défaut.
- `src/renderer/shell.css:772-775` : `dragging-self` et `drop-into` s'appuient sur la pastille ; `drop-into` agrandit aussi le point via son pseudo-élément, à remplacer.
- `src/renderer/shell.js:308` et `src/renderer/shell.css:432` décrivent l'ancien comportement (« un point par Espace, l'icône pour l'Espace courant »).
- Icônes réelles : l'Espace initial vaut 🏠 (src/main/store.js:163) ; un Espace créé via le panneau vaut ✨ par défaut (src/main/window.js:2712) ; le repli reste le caractère `•` quand `icon` est vide.
- Dimensions disponibles : barre par défaut 250 px, padding 8 px de chaque côté, deux boutons `.ib` de 28 px et deux gaps de 4 px dans `#bottom`, soit 170 px pour `#spaces`. Le test des 9 pastilles (tests/ui/06-espaces.js:303-309) exige qu'aucune ne soit coupée.
- Aucun test existant n'affirme la visibilité des icônes ; `tests/ui/06-espaces.js` est l'endroit naturel pour la régression.
- Le markup de `little.js` réutilise une liste `#spaces` distincte et n'inclut pas `shell.css` : aucune régression de ce côté.

## Contrainte d'exécution

Ne pas lancer l'application (`npm start`), ni `npm test` (qui démarre `scripts/dev.js --selftest`), ni `npm run test:ui` : l'utilisateur lance Orbx lui-même. La vérification de ce plan est statique (`node --check`, lectures CSS, greps) ; l'assertion UI ajoutée s'exécutera en CI ou lors d'un `npm run test:ui` ultérieur. Ne pas ajouter de dépendance, ne pas modifier le JS de rendu (uniquement le commentaire de `drawSpaces`).
</context>

<tasks>

<task type="auto">
  <name>Task 1 : afficher l'icône de chaque pastille et retirer le point des Espaces inactifs</name>
  <files>src/renderer/shell.css, src/renderer/shell.js</files>
  <read_first>src/renderer/shell.css, src/renderer/shell.js, src/renderer/shell.html</read_first>
  <action>
Dans src/renderer/shell.css, sections « Espaces » (vers les lignes 431-453) et « Pastilles des Espaces » (vers les lignes 772-775) :

1. Mettre à jour le commentaire de la ligne 432 : « Comme dans Arc : chaque Espace montre son icône ; la pastille de l'Espace affiché est plus large et plus nette. »

2. Remplacer la règle `#spaces` (ligne 431) en conservant exactement la même ligne mais avec `gap: 1px` au lieu de `gap: 2px` : `#spaces { display: flex; align-items: center; justify-content: center; gap: 1px; overflow: hidden; }`.

3. `.sp` : passer `width` de 14px à 16px ; conserver `height: 26px`, `border-radius: 8px`, `display: grid`, `place-items: center`, `font-size: 13px`, `color: var(--faint)`, `transition: color 120ms, width var(--spring-bouncy), transform var(--spring-bouncy)`, `flex: none`.

4. Ajouter juste après `.sp` la règle `.sp .em { font-size: 11px; opacity: 0.55; transition: opacity 120ms; }` : les icônes inactives sont plus petites et atténuées, mais visibles.

5. Conserver `.sp:hover { color: var(--dim); }`, puis ajouter `.sp:hover .em { opacity: 0.85; }` avant les règles actives.

6. Conserver `.sp:active { transform: scale(0.86); transition: transform var(--press); }`.

7. Conserver le commentaire et `@keyframes sp-in` inchangés. Remplacer la règle `.sp.active .em` existante par `.sp.active .em { font-size: 13px; opacity: 1; animation: sp-in var(--spring-bouncy); }`.

8. Conserver `.sp.active { width: 26px; color: var(--fg); }`.

9. Supprimer entièrement le pseudo-élément point de `.sp` ainsi que ses déclinaisons au survol et sur la pastille active ; supprimer aussi la règle qui masque `.em` sur les pastilles non actives. Aucun pseudo-élément de `.sp` ne doit subsister.

10. Dans la section glisser/déposer, conserver `.sp.dragging-self { opacity: 0.35; }` et `.sp.drop-into { color: var(--accent); transform: scale(1.25); }`. Remplacer la règle du pseudo-élément de `.sp.drop-into` par `.sp.drop-into .em { opacity: 1; }` : la pastille visée reste agrandie et son icône redevient nette.

11. Dans src/renderer/shell.js, mettre à jour le commentaire de la ligne 308 : « Pastilles des Espaces, en bas : l'icône de chaque Espace ; celle de l'Espace affiché est plus grande. » Ne toucher ni au template de `drawSpaces()` ni à sa signature `_sig`.

Justification du budget de largeur : 8 pastilles inactives × 16 px + 1 active × 26 px + 8 gaps × 1 px = 162 px, sous les 170 px disponibles à la largeur de barre par défaut (250 − 16 de padding − 2 × 28 de boutons − 2 × 4 de gaps), ce qui préserve l'essai « 9 pastilles » de tests/ui/06-espaces.js. Le caractère de repli `•` reste rendu dans `.em` et suit les mêmes tailles/opacités.
  </action>
  <verify>
    <automated>node --check src/renderer/shell.js</automated>
    <automated>test "$(grep -Ec '\.sp(::before|:hover::before|\.active::before|\.drop-into::before)' src/renderer/shell.css)" -eq 0</automated>
    <automated>test "$(grep -Fc 'sp:not(.active) .em' src/renderer/shell.css)" -eq 0</automated>
    <automated>test "$(grep -Fc '.sp .em {' src/renderer/shell.css)" -eq 1 && test "$(grep -Fc '.sp.active .em {' src/renderer/shell.css)" -eq 1 && test "$(grep -Fc '.sp.drop-into .em {' src/renderer/shell.css)" -eq 1</automated>
    <automated>test "$(grep -Fc '#spaces { display: flex; align-items: center; justify-content: center; gap: 1px; overflow: hidden; }' src/renderer/shell.css)" -eq 1 && grep -Fq 'width: 16px' src/renderer/shell.css</automated>
  </verify>
  <done>Toutes les pastilles d'Espace affichent leur icône (11 px, opacité 0,55 pour les inactives ; 13 px, opacité 1 pour l'active), aucun point pseudo-élément ne subsiste, les états survol/glisser/dépôt restent lisibles, et les commentaires de shell.css et shell.js décrivent le nouveau comportement.</done>
</task>

<task type="auto">
  <name>Task 2 : ajouter l'assertion de régression sur les icônes des pastilles</name>
  <files>tests/ui/06-espaces.js</files>
  <read_first>tests/ui/06-espaces.js, src/main/store.js, src/main/window.js</read_first>
  <action>
Dans tests/ui/06-espaces.js, étendre le test existant « deux pastilles en bas, la seconde active, chacune avec son nom en infobulle » (vers la ligne 63), après l'assertion sur les infobulles :

1. Lire les deux icônes via `pastilles.evaluateAll` : pour chaque pastille, prendre `el.querySelector('.em')`, puis `getComputedStyle(em)`, et renvoyer un objet `{ texte: em.textContent, affichee: cs.display !== 'none', taille: parseFloat(cs.fontSize), opacite: Number(cs.opacity) }`. Garder le style du fichier (helper local, 2 espaces, français).

2. Ajouter trois assertions avec des messages explicites :
   - `assert.deepEqual(icones.map((x) => x.texte), ['🏠', '✨'], 'chaque pastille porte l’icône de son Espace')` — l'Espace initial vient de src/main/store.js:163, le nouveau du panneau vaut ✨ par défaut (src/main/window.js:2712).
   - `assert.deepEqual(icones.map((x) => x.affichee), [true, true], 'les icônes des Espaces inactifs restent affichées : ' + JSON.stringify(icones))`.
   - `assert.ok(icones[1].taille > icones[0].taille && icones[0].opacite < 1, 'l’Espace affiché a une icône plus grande, l’inactif une icône atténuée : ' + JSON.stringify(icones))`.

3. Ne pas comparer l'opacité de l'icône active à 1 : l'animation `sp-in` peut encore être en cours au moment du contrôle, et son opacité calculée serait alors transitoire. Le test reste ainsi stable sans attendre la fin de l'animation et sans dépendre de `prefers-reduced-motion`.

4. Ne pas lancer la suite UI dans cette tâche : elle démarre Electron et l'utilisateur lance l'application lui-même. Se contenter de `node --check` et des greps de présence ci-dessous ; l'assertion s'exécutera en CI ou au prochain `npm run test:ui`.
  </action>
  <verify>
    <automated>node --check tests/ui/06-espaces.js</automated>
    <automated>grep -Fq "el.querySelector('.em')" tests/ui/06-espaces.js && grep -Fq 'getComputedStyle(em)' tests/ui/06-espaces.js && grep -Fq 'chaque pastille porte l’icône de son Espace' tests/ui/06-espaces.js</automated>
  </verify>
  <done>tests/ui/06-espaces.js vérifie que chaque pastille affiche le texte de sa propre icône, que les icônes inactives ne sont pas masquées et que l'Espace actif a une icône plus grande et plus nette ; la suite UI n'a pas été lancée dans cette tâche.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| aucune nouvelle | Changement de présentation CSS dans une vue renderer sandboxée ; aucune entrée, aucun IPC, aucun état, aucun chemin de données utilisateur n'est touché. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-CQQ-01 | Tampering | règles `.sp` de src/renderer/shell.css | low | accept | CSS de présentation exécuté dans le renderer isolé ; sélecteurs limités au markup existant de `drawSpaces`, aucune valeur issue d'une page ou d'un utilisateur. Aucune donnée persistée ni IPC concerné. |
| T-CQQ-SC | Tampering | npm/pip/cargo installs | high | mitigate | Aucune installation : ce plan ne modifie ni package.json ni aucune dépendance ; seuls shell.css, un commentaire de shell.js et tests/ui/06-espaces.js changent. |
</threat_model>

<verification>
Vérification statique uniquement — l'application et la suite UI ne sont pas lancées (l'utilisateur lance Orbx lui-même) :

1. `node --check src/renderer/shell.js` et `node --check tests/ui/06-espaces.js`.
2. Absence de tout pseudo-élément point sur les pastilles : le grep sur `.sp(::before|:hover::before|.active::before|.drop-into::before)` doit renvoyer 0 (4 occurrences au départ : lignes 444, 446, 452, 775).
3. Absence de la règle de masquage : le grep sur `sp:not(.active) .em` doit renvoyer 0 (1 occurrence au départ : ligne 453).
4. Présence des trois règles attendues, une occurrence chacune : `.sp .em {`, `.sp.active .em {`, `.sp.drop-into .em {` (0, 1 et 0 au départ).
5. `#spaces` avec `gap: 1px` et `.sp` avec `width: 16px` (1 et 0 au départ pour ces formulations).
6. Assertion de test présente : `el.querySelector('.em')`, `getComputedStyle(em)` et le message « chaque pastille porte l’icône de son Espace ».

Non exécuté volontairement : `npm run test:ui` et `node tests/ui/06-espaces.js` (ils démarrent Electron). Contrôle visuel laissé à l'utilisateur : avec au moins deux Espaces, chaque pastille du bas montre l'icône de son Espace ; l'Espace affiché est plus large et plus net ; le survol, le glisser et le dépôt d'un onglet sur une pastille restent lisibles.
</verification>

<success_criteria>
- Chaque pastille d'Espace montre l'icône de son propre Espace ; plus aucun point gris ne remplace les icônes inactives.
- L'Espace affiché reste distinguable par sa pastille de 26 px, son icône de 13 px à pleine opacité et l'animation `sp-in` conservée.
- Les icônes inactives restent plus petites (11 px) et atténuées (opacité 0,55), dans une pastille de 16 px.
- Les états survol, `dragging-self` et `drop-into` restent lisibles sans pseudo-élément point.
- La rangée reste compacte : 9 pastilles tiennent dans les 170 px disponibles à la largeur de barre par défaut, sans régression de l'essai existant.
- Aucun changement de comportement JS, aucune dépendance, aucun lancement de l'application ; les vérifications statiques passent et l'assertion UI est ajoutée pour la CI.
</success_criteria>

<output>
Créer `.planning/quick/261025-cqq-fix-orbx-icon-space-actually-it-doesn-t-/261025-cqq-SUMMARY.md` à la fin, avec les commandes exécutées, leurs résultats, et la mention explicite que la suite UI n'a pas été lancée (contrôle visuel laissé à l'utilisateur).
</output>
