# Quick Task 261025-f9z: Lucide icons in the space icon picker — Research

**Researched:** 2026-10-25
**Domain:** Vendored SVG icon set + persisted icon encoding in an Electron app without bundler
**Confidence:** HIGH (codebase integration points), MEDIUM (Lucide asset/licence details)

## Summary

Orbx has exactly one icon pipeline: a single string stored on `space` / folder node / tab,
validated by `src/main/icons.js`, rendered as text by `emojiEl` in the renderer, and
interpolated into text labels (`${icon} ${name}`) in menus, the command palette, imports,
the library and the little window. Lucide support is therefore a **format extension plus a
rendering helper**, not a new subsystem.

The least costly shape that satisfies every project constraint is: vendor the curated set as
a single renderer data module (`src/renderer/lucide.js`) that is both a classic script (global
`LUCIDE_*`, like `emojis.js`) and a CommonJS module (like `theme.js` is for `window.js`); encode
values as `lucide:<name>`; validate the name against that same module's whitelist in
`icons.js` (lazy-required, so nothing loads at startup); render through a new `iconEl()` in
`common.js`; and add a two-tab strip to the existing `#icons` panel. No npm dependency, no
bundler, no protocol/MIME change, no data migration — existing emoji values keep working.

The trap is not the picker: it is the ~10 label sites that would print `lucide:home` verbatim,
and `Theme.apply`'s `length <= 8` icon guard which silently drops any Lucide value sent from
the theme editor.

**Primary recommendation:** `lucide:<name>` string + whitelist validation in `icons.js` + one
shared `src/renderer/lucide.js` data module + `iconEl()` in `common.js` + `icons.label()` for
main-process text.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Portée**
- Espaces, dossiers et onglets : le sélecteur est déjà partagé par les trois, les icônes Lucide y sont proposées partout, sans logique conditionnelle.

**Jeu d'icônes**
- Sélection curatée d'environ 80 icônes utiles pour des Espaces (maison, travail, code, musique, voyage, etc.).
- Vendorisées dans le dépôt (pas de dépendance runtime, pas de bundler — contrainte projet).
- La recherche par mots-clés doit fonctionner sur ces icônes comme sur les émojis.

**Organisation du panneau**
- Deux onglets « Émoji » et « Icônes » dans le panneau existant.
- Le champ de recherche filtre l'onglet actif.
- Le contrôle de teinte de peau reste visible uniquement côté émoji.

**Affichage hors renderer**
- Menus natifs, palette et petite fenêtre : aucune icône pour une icône Lucide, nom seul.
- Les libellés texte (`${icon} ${name}`) ne doivent plus exposer la valeur brute encodée.
- L'icône reste visible dans la barre latérale, l'interface et la page.

### Claude's Discretion
- Encodage de la valeur stockée (préfixe discriminants, ex. `lucide:home`), validation et rétrocompatibilité avec les émojis existants.
- Liste exacte des ~80 icônes et leurs mots-clés de recherche.
- Rendering helper partagé, attributs d'accessibilité et libellés i18n.
- Stratégie de test (unitaire + UI).

### Deferred Ideas (OUT OF SCOPE)
Aucune idée différée n'est mentionnée dans `261025-f9z-CONTEXT.md`.
</user_constraints>

## Project Constraints (from CLAUDE.md)

- No runtime dependency, no bundler, no transpilation, no TypeScript; CommonJS in main/preload, classic `<script>` in renderer.
- Renderer never touches Node/Electron directly; all privileged work stays in main via validated IPC.
- Performance is the first arbitration criterion: an inactive feature must not load or cost at startup.
- Tests: the repo actually uses `node --test` for unit files, `npm test` (`scripts/dev.js --selftest`) for E2E and `npm run test:ui` for Playwright. (CLAUDE.md says "vitest run"; PROJECT.md and CI contradict it — use the real commands.)
- Do not run the app/server; the author runs it. French comments/test names, 2-space indent, single quotes, `[orbx]`-prefixed `console.error`, no `console.log` in runtime paths.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Curated icon data (SVG + keywords) | Renderer asset (`src/renderer/lucide.js`) | Main (`require` for whitelist) | Must be served by `orbx://app/*`; `src/shared/` is not servable (traversal guard) and `theme.js` already sets the cross-realm precedent |
| Icon value validation | Main (`src/main/icons.js`) | Renderer (picker filtering only) | Trust boundary: values are persisted and later interpolated |
| Picker UI (tabs, search, keyboard) | Renderer (`overlay.js`) | — | Existing floating `#icons` panel |
| Icon rendering (emoji vs SVG) | Renderer (`common.js` `iconEl`) | shell / overlay / library / folderpeek | One helper for all pages |
| Text labels for native UI | Main (`icons.label`) | little window (renderer strip) | Menus/palette/imports/library are built in main |
| Persistence | Main (`store.state`, unchanged string field) | — | Additive encoding, no migration |

## Standard Stack

### Core (no new dependency)

| Asset | Version | Purpose | Why this shape |
|-------|---------|---------|----------------|
| Lucide SVG path data | Pin the Lucide release at vendoring time (record it in the file header) | ~80 icons | 24×24 stroke icons, stable names; ISC licence permits vendoring with notice |
| `src/renderer/lucide.js` (new) | — | Data + keyword search + whitelist | Served by existing `UI_TYPES['.js']`; loadable by main via `require` (same pattern as `theme.js`) |
| `iconEl()` in `src/renderer/common.js` | — | Emoji text or inline `<svg>` | `common.js` is loaded by every UI page, including `overlay.html` where `emojiEl` is currently missing |
| `icons.label()` in `src/main/icons.js` | — | Strip Lucide values from text labels | Single main-process helper instead of 8 ad-hoc branches |

Lucide default SVG attributes (24×24 canvas, `fill="none"`, `stroke="currentColor"`,
`stroke-width="2"`, round caps/joins) are documented by the project:
[CITED: lucide.dev/guide/packages/lucide-static and unpkg `lucide` `defaultAttributes`].
No package is installed; icons are copied into the repo at authoring time.

**Installation:** none. `package.json` has no `dependencies` and must stay that way.

### Alternatives Considered

| Instead of | Could use | Tradeoff |
|------------|-----------|----------|
| One shared JS data module | Inline `<symbol>` sprites in `shell.html` + `overlay.html` (extend the existing sprites, `shell.html:11-41`) | No new file, but path data duplicated in 2 pages, both parsed at startup, and the picker still needs names/keywords in JS. Reject. |
| One shared JS data module | External sprite `lucide.svg` + `<use href="lucide.svg#home">` | Single rendering source and lazy fetch, but `.svg` falls through `UI_TYPES` to `net.fetch(file://)` and external `<use>` semantics/CSP/caching were not verified here; also splits whitelist from render data. Reject for a quick task. |
| Vendored copy | `lucide-static` npm package | Forbidden by the "aucune dépendance runtime" constraint; `lucide-static` is only an authoring source. |
| Inline SVG | Icon font | Blurry at 12–16 px, no per-icon whitelist, style/font conflicts. Reject. |

## Package Legitimacy Audit

No external package is installed by this task. The only third-party artefact is Lucide's SVG
path data copied into `src/renderer/lucide.js`. Required notice (licence demands it appear in
all copies): the ISC copyright line and permission text, plus the MIT/Feather notice for any
Feather-derived icon included in the curated selection. Put both notices in the header comment
of `lucide.js`. [CITED: lucide.dev/license]

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none.

## Architecture Patterns

### System Architecture Diagram

```
Renderer (shell.html / overlay.html / library.html)
  └─ <script> lucide.js  ── data: name, keywords, SVG body, whitelist
  └─ <script> common.js  ── iconEl(value) ──► span.emoji  (emoji)
                                         └──► svg.i.lucide (whitelisted)
  └─ picker (overlay.js) ── iconSearch(tab, q) ──► em-pick buttons ──► send('icon', {icon, tone})
                                                   │
Main (window.js chooseIcon) ◄─────────────────────┘
  └─ icons.clean(value) ── emoji regex (lazy) OR lucide whitelist (lazy require)
  └─ setIcon(kind,id,value) ── store.state spaces / folder nodes / tabs
  └─ icons.label(icon,name) ──► menu.js, palette.js, imports.js, library.js, main.js
  └─ state payload ──► renderer iconEl
```

### Recommended Project Structure

```
src/
├── renderer/
│   ├── lucide.js        # NEW: curated data, search, whitelist, licence header
│   ├── common.js        # + iconEl(value), iconLabel(value, name, gap)
│   ├── emojis.js        # unchanged
│   ├── overlay.js       # + tabs, Lucide branch, theme swatches, draft preview
│   ├── shell.js         # emojiEl -> iconEl; drawSpaces markup
│   └── library.js       # + iconEl for the space dot
├── main/
│   ├── icons.js         # + lucide:<name> validation, label(), lazy data require
│   └── window.js        # spaceLabel uses icons.label
└── shared/locales.js    # + icons.tab*, icons.searchIcon, icons.noneIcon
```

### Pattern 1: Vendored data module, dual realm

`src/renderer/lucide.js` follows `emojis.js` (browser global + `module.exports` guard) rather
than `theme.js`'s UMD factory because it has no DOM/Node dependency:

```js
// Icônes Lucide (ISC) — voir NOTICE en tête de fichier.
// Une ligne : « nom|mots français|english|svg interne », comme emojis.js.
const LUCIDE_PREFIX = 'lucide:';
const LUCIDE_GROUPS = [['general', `home|maison accueil|home house|<path d="…"/>`], …];
// … build LUCIDE_LIST [{ name, words, body }], LUCIDE_NAMES Set, lucideSearch(q)
if (typeof module !== 'undefined') module.exports = { LUCIDE_PREFIX, LUCIDE_LIST, LUCIDE_NAMES, lucideSearch, LUCIDE_GROUP_LABELS };
```

Why this earns its keep:
- `orbx://app/lucide.js` is served from memory by the existing `UI_TYPES['.js']` entry
  `[VERIFIED: src/main/sessions.js:40]` — quote: `const UI_TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };`
  No session change, no `.svg` MIME work, no external use.
- Main can `require('../renderer/lucide.js')` exactly as `window.js:13` requires
  `./renderer/theme.js`; one whitelist for validation, picker search and rendering.
- Startup cost is one small deferred script in `shell.html` (and one in `overlay.html`,
  which already parses the larger `emojis.js`). Keep the format compact (pipe lines) and
  keep the main-process require lazy (pattern 2).

### Pattern 2: Encoding and validation

Persisted value: `lucide:<kebab-name>` (e.g. `lucide:home`, `lucide:message-circle`).
Emoji values are untouched; a string starting with `lucide:` can never be a valid emoji
because the emoji regex rejects letters `[VERIFIED: src/main/icons.js:6,19-26]` — quote of the
current contract: `const PART = String.raw`…`;` / `function valid(text) {` /
`if (!EMOJI.test(text)) return false;`.

`icons.js` changes:
- `valid(text)`: if `text.startsWith(LUCIDE_PREFIX)` → name must be in the lazy whitelist
  (and match `/^[a-z0-9-]+$/`); otherwise the existing emoji path with `MAX = 32`
  `[VERIFIED: src/main/icons.js:4]` — quote: `const MAX = 32; // un émoji composé (famille, drapeau de région) tient largement`.
  Do **not** apply `MAX` to Lucide values; the whitelist bounds their length.
- `clean(text)`: unchanged semantics (`''` → default, `null` → refused)
  `[VERIFIED: src/main/icons.js:28-32]`.
- New `label(icon, name, gap = ' ')`: returns `${icon}${gap}${name}` for emoji, `name` for
  `lucide:` values and for empty icons. New `isLucide(value)` for renderer-facing checks.
- Lazily `require('../renderer/lucide.js')` inside the Lucide branch so the emoji-tool
  laziness test keeps its meaning (`tests/performances.js:561-568`, DEM-10).

Every writer already funnels through `icons`: `checkSpace` `[VERIFIED: src/main/window.js:2730]`
— quote: `if (!icons.valid(a.icon)) return null;`; `chooseIcon` `[VERIFIED: src/main/window.js:2952]`
— quote: `const emoji = icons.clean(a.emoji);`; `setIcon` `[VERIFIED: src/main/window.js:2961]`
— quote: `if (!holder || (emoji && !icons.valid(emoji))) return false;`. The theme editor is
the exception that must be added (see Pitfall 1).

### Pattern 3: Rendering helper

Add to `common.js` (loaded by every page):

```js
function iconEl(value) {
  if (typeof value === 'string' && value.startsWith('lucide:')) {
    const ic = typeof LUCIDE_LIST !== 'undefined' && LUCIDE_BY_NAME.get(value.slice(7));
    if (!ic) return document.createElement('span'); // never print the raw value
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'i lucide');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.innerHTML = ic.body; // trusted, vendored constant only
    return svg;
  }
  return Object.assign(document.createElement('span'), { className: 'emoji', textContent: value == null ? '' : value });
}
```

- `svg.i` already provides 16×16, `fill:none`, `stroke:currentColor`, `stroke-width:1.7`
  `[VERIFIED: src/renderer/base.css:122]` — quote: `svg.i { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; flex: none; }`.
  Override only size/stroke-width per context; do not fight the existing sprite.
- For `drawSpaces` (single `innerHTML` assignment, `shell.js:314-315`) add
  `iconMarkup(value)` returning the same trusted markup; emoji branch stays
  `esc(value)`. Quote of the target: `<span class="em">${esc(x.icon) || '•'}</span>`.
- Replace the five `emojiEl` call sites (`shell.js:21,34,77,137,926`), `folderpeek.js:63`
  and `overlay.js:773`. **`overlay.js:773` is a live latent bug today**: `overlay.html`
  loads only `common.js`, `theme.js`, `emojis.js`, `overlay.js` `[VERIFIED: src/renderer/overlay.html:131-134]`
  and `emojiEl` is defined only in `shell.js` `[VERIFIED: src/renderer/shell.js:21]`
  — quote: `const emojiEl = (text) => Object.assign(document.createElement('span'), { className: 'emoji', textContent: text });`.
  Moving the helper to `common.js` fixes it.

CSS contexts to size explicitly:
- sidebar rows `.ic .emoji` 13 px / `.tile .ic .emoji` 19 px `[VERIFIED: src/renderer/shell.css:277-279]`
- space pills `.sp .em` 12 px, active 14 px `[VERIFIED: src/renderer/shell.css:444,448]`
- space header `#space-icon, .g-icon { font-size: 13px; }` `[VERIFIED: src/renderer/shell.css:250]`
- overlay draft `#space-icon` 34×34, `font-size:18px`; swatches `.sw-icon` 26 px, `.em-pick` 19 px `[VERIFIED: src/renderer/overlay.css:174,188,225]`

### Pattern 4: One helper for text labels (main)

Replace every `${icon} ${name}` with `icons.label(icon, name[, gap])`:

| Site | Verbatim current value |
|------|------------------------|
| `src/main/window.js:123` | ``const base = `${sp.icon}${gap}${sp.name}`;`` (used by `menu.js:187`, `window.js:4478,4537`) |
| `src/main/palette.js:112` | ``const name = `${s.icon} ${s.name}`;`` |
| `src/main/imports.js:30` | ``name: `${sp.icon} ${sp.name}`,`` |
| `src/main/imports.js:146` | ``spaceName: `${space.icon} ${space.name}`,`` |
| `src/main/library.js:53` | ``space: sp ? `${sp.icon} ${sp.name}` : ''`` |
| `src/main/library.js:304` | ``spaceNames: s.spaces.map((sp) => ({ id: sp.id, name: `${sp.icon} ${sp.name}` })),`` |
| `src/main/main.js:194` | ``map((sp) => `${sp.icon} ${sp.name}`)`` (profile cards in settings) |
| `src/main/main.js:268` | ``spaces: s.spaces.map((sp) => ({ id: sp.id, name: `${sp.icon} ${sp.name}` })),`` (settings dropdowns) |
| `src/renderer/little.js:57` | ``b.textContent = `${sp.icon}  ${sp.name}`;`` (name only for Lucide; use a renderer strip helper, no data load) |
| `src/renderer/library.js:233` | `const dot = el('span', 'dot', r.icon);` (render via `iconEl`, load `lucide.js` in `library.html`) |

Quotes above are `[VERIFIED: <path>:<line>]` and must be re-checked when editing. The
settings/import/library labels are user-visible dropdowns/tosts, not just menus — they are
the easiest place to leak `lucide:home`.

### Pattern 5: Picker tabs

Current picker contract:
- Buttons are `.em-pick` with `b.dataset.e = e` `[VERIFIED: src/renderer/overlay.js:480,497-499]`
  — quote: `const iconButtons = () => [...iconsList.querySelectorAll('.em-pick')];` and
  `b.dataset.e = e;`.
- Enter picks the designated button or the first result `[VERIFIED: src/renderer/overlay.js:538-543]`.
- `pickIcon` sends `{ emoji, tone }` and, for a draft space, only updates `draft`
  `[VERIFIED: src/renderer/overlay.js:562-568]`.
- Draft preview is text: `$('space-icon').textContent = draft.icon;` `[VERIFIED: src/renderer/overlay.js:585]`.
- Theme swatches compare by text and are built from raw emoji `[VERIFIED: src/renderer/overlay.js:301,320,424-430]`
  — quote: `for (const b of $('theme-icons').children) b.classList.toggle('sel', b.textContent === theme.icon);`
  and `$('theme-icons').innerHTML = ICONS.map((e) => `<button class="sw-icon">${e}</button>`).join('');`.

Recommended changes:
- Add `<div id="icons-tabs" role="tablist">` with two buttons (`data-tab="emoji"`, `data-tab="lucide"`) above `#icons-head`; CSS in `overlay.css` next to the existing `#icons` block.
- `iconsState.tab`: default `'emoji'`; open on `'lucide'` when `p.current` starts with `lucide:` so the current icon is visible/selected.
- `drawIcons()` branches on the tab: emoji path unchanged (keeps `emojiSearch`, `emojiTone`, groups, tone strip); Lucide path uses `lucideSearch(q)` and `iconEl(value)` inside buttons, hides `#icons-tones`, uses a per-tab empty message.
- Keep the `.em-pick` class and `data.e` for both tabs: every existing test queries `.em-pick`, and the 9-column grid/keyboard math (`ArrowDown: 9`) stays valid `[VERIFIED: src/renderer/overlay.css:224]`
  — quote: `.icons-grid { display: grid; grid-template-columns: repeat(9, 1fr); gap: 2px; }` and `overlay.js:536` `{ ArrowRight: 1, ArrowLeft: -1, ArrowDown: 9, ArrowUp: -9 }`.
- Rename the IPC field to `{ icon, tone }` (and `chooseIcon` reads `a.icon`); update the 3 tests that post `{ emoji: … }`. Keeping the old key is possible but makes the contract misleading.
- `#icons-reset` keeps its semantics: hidden for space/draft, clears folder/tab to the site/default icon.
- i18n: add `icons.tabEmoji`, `icons.tabIcons`, `icons.searchIcon`, `icons.noneIcon` (fr+en). The placeholder/empty message must switch with the tab because `applyI18n` only runs at load/language change.

The theme editor also changes space icons through `#theme-icons` (32 emoji). Once the icon
format is broader, `theme.icon` may be Lucide: the swatch comparison must key on
`dataset.v`, not `textContent`, and either add the curated Lucide set to that scrollable grid
(recommended, keeps the editor coherent) or accept that no swatch is selected. If Lucide
swatches are added, `Theme.apply`'s guard must be relaxed — see Pitfall 1.

### Anti-Patterns to Avoid

- **Interpolating the stored value into HTML.** `drawSpaces`, `#theme-icons` and any other
  `innerHTML` site may only receive markup generated from the vendored whitelist; emoji goes
  through `esc()` as today.
- **Eagerly requiring the Lucide data in main.** It defeats the DEM-10 laziness pattern and
  the project's startup budget.
- **A second source of truth** (sprite + whitelist + picker list). Validation, search and
  rendering must read the same `lucide.js`.
- **Conditional pickers per kind.** Locked decision: same picker everywhere.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Icon search | Fuzzy matcher / new dependency | Mirror `emojiSearch` semantics (`emojis.js:534-544`): fold accents, every term must prefix a keyword | Existing UX and tests already define the behaviour |
| SVG loading | Sprite loader, fetch, DOM parser, bundler step | Inline trusted SVG body from `lucide.js` | Chromium renders inline SVG; no MIME/CSP work |
| Icon normalization | Runtime SVG optimizer | Vendor already-normalized Lucide markup | One-off authoring concern, not runtime |
| Label formatting | Branch at each call site | `icons.label()` | 8+ sites, all identical logic |

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `orbx.json` holds `spaces[].icon`, folder `node.icon`, `tabs[].icon` as plain strings (`store.js` persists state; no migration layer) | None — new `lucide:*` values are additive; emoji values remain valid |
| Live service config | None — no external service stores icons | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | Packaged app embeds `src/renderer`; no asar exclusion for renderer files | Rebuild (`npm run build` / `build:win`) after adding `lucide.js`; nothing else |
| In-memory undo/redo | Undo stacks hold previous icon strings (`window.js:2967` `record('undo.changeIcon', () => put(before), …)`) | Compatible — strings are opaque |
| Arc import | `import-arc.js:186` copies Arc's emoji icon over the Orbx icon on every sync (`if (sp.icon && space.icon !== sp.icon) { space.icon = sp.icon; … }`) | Existing behaviour, not a regression; do not "fix" in this task. Optionally mention in plan |

## Common Pitfalls

### Pitfall 1: `Theme.apply` silently drops Lucide values
**What goes wrong:** The theme editor sends `{ icon }` through `setTheme` → `Theme.apply`; the
guard only accepts strings of ≤8 chars `[VERIFIED: src/renderer/theme.js:119]` — quote:
`if (typeof patch.icon === 'string' && patch.icon.length <= 8) space.icon = patch.icon;`.
`lucide:home` (11 chars) is ignored without error.
**How to avoid:** relax the guard to accept the `lucide:` form (e.g. length ≤ 40 + regex) and
validate the whitelist in `setTheme` (`icons.clean(patch.icon)`) before applying. Keep the
existing emoji tests (`tests/ui/18-annuler.js:202` sets `icon: '🚀'`) green.

### Pitfall 2: Raw value leaks in labels
**What goes wrong:** ten call sites interpolate the icon string (Pattern 4). Missing one prints
`lucide:home` in a native menu, the command palette, a settings dropdown, an import toast or
the little window — exactly what CONTEXT forbids.
**How to avoid:** centralise on `icons.label()`, grep for ``${.*icon`` and ``.icon} ${`` after
the change, and add an E2E assertion that `spaceLabel()` and the palette title contain no
`lucide:`.

### Pitfall 3: `emojiEl` is undefined on overlay pages
**What goes wrong:** `overlay.js:773` calls `emojiEl`, defined only in `shell.js:21`; the
modal/drop pages load a different script set. Today this throws when dragging an
icon-bearing tab over the split drop zone.
**How to avoid:** move the helper to `common.js` as `iconEl` (Pattern 3) and use it everywhere.

### Pitfall 4: Losing the laziness/startup budget
**What goes wrong:** requiring `lucide.js` from `icons.js` at module load, or adding a
non-deferred script to `shell.html`, breaks the DEM-10 laziness test and the "all shell
scripts deferred" test.
**How to avoid:** lazy `require` inside the Lucide branch; add `lucide.js` with `defer` in
`shell.html` (order: `common.js` → `lucide.js` → `theme.js` → … → `shell.js`) so
`tests/performances.js:35-38` (`r.differes === r.n`, order starts with `common.js`) still
passes. Re-measure the modal page's script parse (it already loads `emojis.js`).

### Pitfall 5: Breaking existing picker tests by changing the default tab
**What goes wrong:** `tests/finitions.js:79-117` and `tests/ui/28-finitions.js:13,43-90`
count/grep `.em-pick`, expect >100 emoji, 10 `<h4>` groups and 6 tones on open — all on the
emoji tab.
**How to avoid:** default to the emoji tab unless the current value is Lucide; keep emoji
buttons' `textContent`, `.em-pick` class, group headings and tone strip unchanged.

### Pitfall 6: Wrong SVG sizing in the pill/header/row contexts
**What goes wrong:** `.emoji` sizing uses `font-size`; an inline SVG ignores it and can
overflow the 16×16 slots or the 12/14 px pills.
**How to avoid:** add `.lucide` rules per context (`.ic`, `.tile .ic`, `.sp .em`, `#space-icon`,
`.g-icon`, `.sw-icon`, `.em-pick`) using the existing numbers quoted in Pattern 3.

### Pitfall 7: Tone applied to Lucide / tone strip left visible
**What goes wrong:** `emojiTone()` is meaningless for SVG and the strip must disappear on the
Icônes tab (locked decision).
**How to avoid:** hide `#icons-tones` on the Lucide tab; do not send a tone modifier for
Lucide values (sending the remembered tone integer is harmless but keep the semantics clear).

### Pitfall 8: Unknown/stale `lucide:` value
**What goes wrong:** a curated icon is renamed/removed in a future release; stored values no
longer resolve, and a naive renderer prints the raw string.
**How to avoid:** `iconEl`/`iconMarkup` must return an empty/neutral glyph for unknown names,
and `icons.valid` must reject unknown names going forward.

## Code Examples

### Validation (`src/main/icons.js`)

```js
const LUCIDE_PREFIX = 'lucide:';
let lucideNames = null;
function lucide() {
  if (!lucideNames) lucideNames = require('../renderer/lucide.js').LUCIDE_NAMES;
  return lucideNames;
}
function valid(text) {
  if (typeof text !== 'string' || !text) return false;
  if (text.startsWith(LUCIDE_PREFIX)) {
    const name = text.slice(LUCIDE_PREFIX.length);
    return /^[a-z0-9-]+$/.test(name) && lucide().has(name);
  }
  if (text.length > MAX) return false;
  tools();
  if (!EMOJI.test(text)) return false;
  // … segmenter check unchanged
}
function label(icon, name, gap = ' ') {
  return typeof icon === 'string' && icon && !icon.startsWith(LUCIDE_PREFIX) ? icon + gap + name : String(name);
}
```

### Picker branch (`src/renderer/overlay.js`)

```js
function drawIcons() {
  const q = iconsInput.value.trim();
  const found = iconsState.tab === 'lucide' ? lucideSearch(q) : emojiSearch(q);
  iconsList.textContent = '';
  …
  for (const x of found) {
    const value = iconsState.tab === 'lucide' ? 'lucide:' + x.name : emojiTone(x.e, iconsState.tone);
    const b = Object.assign(document.createElement('button'), { className: 'em-pick' + (value === iconsState.current ? ' sel' : '') });
    b.dataset.e = value;
    if (iconsState.tab === 'lucide') b.appendChild(iconEl(value));
    else b.textContent = value;
    grid.appendChild(b);
  }
  $('icons-tones').hidden = iconsState.tab === 'lucide';
}
```

### Theme swatch selection (`src/renderer/overlay.js`)

```js
$('theme-icons').innerHTML = [...ICONS.map((e) => [e, e]), ...LUCIDE_LIST.map((x) => ['lucide:' + x.name, x])]
  .map(([v]) => `<button class="sw-icon" data-v="${esc(v)}"></button>`).join('');
// then fill each button with iconEl(v)
for (const b of $('theme-icons').children) b.classList.toggle('sel', b.dataset.v === theme.icon);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Emoji-only icon string | Prefix-encoded string (`lucide:<name>`) with whitelist | This task | No schema migration; validation becomes type-aware |
| `emojiEl` text span | `iconEl` emoji/SVG helper | This task | One helper for all pages; fixes overlay's undefined `emojiEl` |

**Deprecated/outdated:** none relevant.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Exact list of ~80 Lucide names/keywords (to be copied from a pinned Lucide release) | Standard Stack / picker | Renaming a name changes stored values; validate against lucide.dev before writing the list |
| A2 | `lucide.js` adds ~15–25 KB raw and parses in ~1 ms per page | Pattern 1 / Pitfall 4 | If heavier, split keywords from path data or move search data to overlay only |
| A3 | `svg.innerHTML = '<path …/>'` works on SVG elements in Chromium 152 | Pattern 3 | Low; fallback is `DOMParser` on the trusted markup |
| A4 | Importing `lucide.js` in main has negligible cost and no Electron dependency | Pattern 2 | Keep it Node-safe (no DOM globals) |
| A5 | The theme editor should also offer Lucide swatches | Pattern 5 / Open Q1 | If emoji-only there, skip the `theme.js` guard change but accept the inconsistency |

## Open Questions (RESOLVED)

1. **Theme-editor swatches:** include the curated Lucide set in `#theme-icons` (recommended,
   coherent, small cost) or leave it emoji-only and accept that a Lucide space icon shows no
   selected swatch? Including them requires Pitfall 1's guard change.
2. **Picker default tab on open:** prefer "emoji always" (most conservative for tests) or
   "match current icon" (recommended; opens the Icônes tab when a Lucide icon is set)?
3. **Curated list composition/groups:** flat grid vs. 5–8 groups with `icons.group.*` keys.
   Search is mandated; groups are optional. Flat is cheaper.
4. **Value for unknown Lucide names:** render nothing (current recommendation) vs. fall back to
   a generic `circle-help` glyph.

## Environment Availability

No external dependencies are introduced. Node 20+ / Electron 44.7 are already required by the
project; Lucide assets are copied into the repo, not installed. Section otherwise skipped.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node built-in `node:test` + `node:assert/strict`; custom E2E harness (`tests/*.js`) via `node scripts/dev.js --selftest`; Playwright Core via `npm run test:ui` |
| Config file | None for unit tests; `tests/selftest.js` imports scenarios; `tests/ui/run.js` auto-globs `NN-*.js` |
| Quick run command | `node --test tests/icons.test.js` (new file) |
| Full suite command | `npm test` then `npm run test:ui` (and the CI unit steps in `.github/workflows/tests.yml`) |

### Phase Requirements → Test Map

| Behavior | Test Type | Automated Command / File | File Exists? |
|----------|-----------|--------------------------|--------------|
| `lucide:<known>` accepted; unknown/oversized/malformed rejected; emoji still accepted | unit | `node --test tests/icons.test.js` | ❌ Wave 0 |
| Every curated icon name passes `valid`; every body is safe JSON/string data | unit | same | ❌ Wave 0 |
| Picker opens, switches tab, searches, Enter/arrow selection, sets folder/tab/space icon | E2E | extend `tests/finitions.js` (`openIcons`, `.em-pick`, `data-e`) | ✅ extend |
| Draft space picks a Lucide icon; `checkSpace` accepts it; created space stores `lucide:*` | E2E | extend `tests/creation-espace.js:34-44,99-137` | ✅ extend |
| Sidebar rows/header/pills render SVG, not raw text | UI | extend `tests/ui/28-finitions.js` and `tests/ui/06-espaces.js:64-76` | ✅ extend |
| No `lucide:` leaks in native menu labels, palette titles, settings/import/library labels | E2E/unit | `spaceLabel()`, palette `dynamicList()`, `icons.label()` assertions | ❌ Wave 0 (small) |
| Theme editor accepts a Lucide icon (if Q1 = yes) | E2E/UI | extend `tests/ui/22-themes.js` or `tests/ui/28-finitions.js` | ✅ extend |

### Sampling Rate

- **Per task commit:** `node --test tests/icons.test.js` plus the relevant scenario
  (`ORBX_SCENARIO=tests/finitions.js node scripts/dev.js --selftest`).
- **Per wave merge:** `npm test` (full selftest).
- **Phase gate:** `npm test` + `npm run test:ui` green.

### Wave 0 Gaps

- [ ] `tests/icons.test.js` — new unit suite; add a CI step `node --test tests/icons.test.js` in `.github/workflows/tests.yml` (it currently runs only adblock/extensions/pe-resources explicitly).
- [ ] Extend `tests/finitions.js` (the icon scenario) with the Lucide flow and label-leak checks.
- [ ] No framework install needed.

## Security Domain

`security_enforcement` is enabled (absent in config.json means enabled; config only overrides workflow keys).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | `icons.clean()` whitelist in main before any store write; regex on the name; length bound |
| V6 Cryptography | no | — |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stored XSS via icon string injected into `innerHTML` (`drawSpaces`, `#theme-icons`) | Tampering | Never interpolate stored values; `iconMarkup` only from the vendored whitelist; emoji via `esc()` |
| Arbitrary string persisted as an icon and later printed in native menus | Information disclosure / spoofing | `icons.valid`/`clean` only accept emoji or whitelisted `lucide:<name>` |
| Renderer payload bypassing UI constraints | Tampering | IPC payload still validated in `chooseIcon`/`setIcon`/`checkSpace`; no new IPC channel |

## Sources

### Primary (HIGH confidence)
- `src/main/icons.js:1-34`, `src/main/window.js:2725-2743,2928-2969,3089-3098`, `src/renderer/overlay.js:473-568`, `src/renderer/shell.js:20-42,308-317,396,942`, `src/renderer/theme.js:119`, `src/renderer/common.js:142-152`, `src/main/sessions.js:40` — read verbatim this session.
- Test coverage: `tests/finitions.js:44-146`, `tests/creation-espace.js:34-44,99-137`, `tests/ui/28-finitions.js:13-90`, `tests/ui/06-espaces.js:64-76`, `tests/performances.js:35-38,561-568`, `.github/workflows/tests.yml`.

### Secondary (MEDIUM confidence)
- [Lucide licence](https://lucide.dev/license) — ISC; Feather-derived icons MIT; notices must accompany copies.
- [Lucide static package guide](https://lucide.dev/guide/packages/lucide-static) — individual SVGs / sprite / JS exports.
- [Lucide default attributes](https://app.unpkg.com/lucide@0.540.0/files/dist/esm/defaultAttributes.js.map) — viewBox 24×24, stroke currentColor, stroke-width 2, round caps/joins.

### Tertiary (LOW confidence)
- Exact curated icon names/keywords (A1) — must be verified against the pinned Lucide release at implementation time.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependency; data-module pattern already used by `theme.js`/`emojis.js`.
- Architecture: HIGH — every integration point read with line-level verification.
- Pitfalls: HIGH for codebase pitfalls (quoted), MEDIUM for size/parse estimates.

**Research date:** 2026-10-25
**Valid until:** 2026-11-24 (stable codebase; Lucide names should be pinned at vendoring)
