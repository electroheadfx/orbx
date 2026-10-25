---
phase: 261025-f9z
reviewed: 2026-10-25T11:02:58Z
depth: quick
files_reviewed: 23
files_reviewed_list:
  - .github/workflows/tests.yml
  - src/main/icons.js
  - src/main/imports.js
  - src/main/library.js
  - src/main/main.js
  - src/main/palette.js
  - src/main/window.js
  - src/renderer/common.js
  - src/renderer/folderpeek.js
  - src/renderer/library.html
  - src/renderer/library.js
  - src/renderer/little.js
  - src/renderer/lucide.js
  - src/renderer/overlay.css
  - src/renderer/overlay.html
  - src/renderer/overlay.js
  - src/renderer/shell.css
  - src/renderer/shell.html
  - src/renderer/shell.js
  - src/shared/locales.js
  - tests/creation-espace.js
  - tests/finitions.js
  - tests/icons.test.js
findings:
  critical: 0
  warning: 1
  info: 4
  total: 5
status: issues_found
---

# Phase 261025-f9z: Code Review Report

**Reviewed:** 2026-10-25T11:02:58Z
**Depth:** quick
**Files Reviewed:** 23
**Status:** issues_found

## Summary

Quick task 261025-f9z adds a second tab of 84 vendored Lucide icons to the icon picker, extends the stored icon contract to `lucide:<nom>` validated in the main process against a whitelist, and routes every render/label site through shared helpers. The review covered all 23 changed files, focused on the SVG trust boundary, icon render/label completeness, picker tab/keyboard/search behavior, emoji regression risk, the generated icon data, and the internal consistency of the updated E2E scenarios.

No BLOCKER was found and no security vulnerability was identified. The XSS surface is correctly closed: only a vendored SVG-body string, retrieved from `LUCIDE_BY_NAME` after a whitelist key lookup, ever reaches `innerHTML`; every non-Lucide value is rendered as text (or `esc()`-escaped in markup), and an unknown Lucide name renders a neutral bullet rather than the stored value. All main-process labels (`icons.label`, `spaceLabel` and its callers in `palette.js`, `imports.js`, `library.js`, `main.js`) strip the encoded value, and all renderer sites use `iconEl`/`iconMarkup`/`iconLabel`. Emoji behavior is unchanged, script load order is correct in every page, and the vendored set parses cleanly (84 unique entries, no malformed fields). `node --test tests/icons.test.js` passes 10/10. The one WARNING is a renderer crash on a non-string persisted icon; the other items are informational.

The E2E and UI suites were not executed (app launch is out of scope per the review instructions); `tests/finitions.js` and `tests/creation-espace.js` were verified by reading only.

## Narrative Findings (AI reviewer)

### Warnings

#### WR-01: The icon picker throws when the stored icon is not a string

**File:** `src/renderer/overlay.js:548-549`
**Issue:** `const current = p.current || '';` only maps falsy values to `''`; a truthy non-string value passes through, and `current.startsWith(LUCIDE_PREFIX)` then throws `TypeError: current.startsWith is not a function`. Two payloads reach this line without a type check: `OrbxWindow.openIcons` sends `current: holder.icon || ''` (`src/main/window.js:2945`), and the draft path calls `openIcons({ current: draft.icon })` (`src/renderer/overlay.js:646,698`). `store.normalize` does not sanitize icon types, so a hand-edited or corrupted `orbx.json` (e.g. `"icon": 7`) turns a click on the icon button into a broken picker: `#icons` is shown but `iconsState` is never assigned, so the tab/list handlers then fail on `iconsState` too. The fix is a one-line type guard.
**Fix:**
```javascript
const current = typeof p.current === 'string' ? p.current : '';
```
Ideally also normalize icon fields in `store.normalize` (drop non-strings) so corrupted state never reaches the renderer.

### Info

#### IN-01: The theme editor's icon cap silently rejects every Lucide value

**File:** `src/renderer/theme.js:119`
**Issue:** `if (typeof patch.icon === 'string' && patch.icon.length <= 8) space.icon = patch.icon;` — the `<= 8` bound is an emoji-length heuristic; `lucide:` already occupies 7 characters, so any Lucide icon patch is discarded. This is currently unreachable from the UI (the theme editor sends only emoji pills from `ICONS`, and `#theme-icons` intentionally stays emoji-only per the locked plan decision), but it is a latent contract mismatch: if the theme editor is ever extended to Lucide icons, `Theme.apply` will silently ignore the selection. A space whose icon is Lucide also opens the theme editor with no pill selected (`src/renderer/overlay.js:301`), which is accepted per plan. No change required for this task; note it for the next theme-editor change.
**Fix:** When the editor gains Lucide support, validate through the main-process `icons.valid` path (which already whitelists names) instead of a character-count heuristic; leave `theme.js` untouched for now, as planned.

#### IN-02: Search does not fold `œ`, so "coeur" finds nothing

**File:** `src/renderer/lucide.js:139,150`
**Issue:** `lucideFold` uses `normalize('NFD')`, which does not decompose `œ` (U+0153). The heart entry's French keyword is `cœur`, so `lucideSearch('coeur')` returns `[]` while `lucideSearch('cœur')` returns `heart`. This mirrors the pre-existing limitation in `emojis.js` (`fold`), so it is consistent behavior rather than a regression, but the new icon tab makes the miss more visible for a common French word.
**Fix:**
```javascript
const lucideFold = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/œ/g, 'oe').replace(/æ/g, 'ae').toLowerCase();
```

#### IN-03: Space-label logic is duplicated between the main and renderer realms

**File:** `src/main/icons.js:60-62` and `src/renderer/common.js:191-193`
**Issue:** `label(icon, name, gap)` and `iconLabel(icon, name, gap)` implement the same rule (icon + gap + name, except Lucide or absent icons which show the name alone) in two separate files. The semantics match today, but any future adjustment (e.g. a new non-text prefix) applied to one side would leak an encoded `lucide:` value in either native menus or the little window. There is no shared module for these helpers, so the duplication is currently structural; flagging it as a drift risk.
**Fix:** Keep both implementations aligned, or move the rule into a shared module both realms can require/load (the codebase already shares `theme.js` between main and renderer), and add a unit assertion comparing the two outputs.

#### IN-04: A `keys`/locale event resets the picker hint while the Lucide tab is open

**File:** `src/renderer/overlay.html:99`, `src/renderer/common.js:197`, `src/renderer/overlay.js:484-493`
**Issue:** `#icons-input` carries `data-t-ph="icons.search"`; `syncIconsTab()` overrides the placeholder with `t('icons.searchIcon')` for the Lucide tab. But `applyI18n()` — invoked on `DOMContentLoaded`, on every `keys` event, and on language change — reassigns the placeholder from `data-t-ph`, so a shortcut change made while the picker is open (settings lives in another window) flips the Lucide hint back to "Rechercher un émoji". Cosmetic only.
**Fix:** After the `applyI18n()` call in the `keys` handler, re-apply the tab hint when the picker is open (`if (iconsState) syncIconsTab();`), or drop `data-t-ph` from `#icons-input` and let `syncIconsTab` be the sole owner of that placeholder.

---

_Reviewed: 2026-10-25T11:02:58Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: quick_
