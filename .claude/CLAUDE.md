<!-- GSD:project-start source:PROJECT.md -->

## Project

**Orbx**

Orbx est un navigateur de bureau à barre latérale, en français, construit sur Electron et Chromium. Il reprend l'organisation et les raccourcis d'Arc — Espaces, onglets épinglés, dossiers, barre de commande, vue scindée — en privilégiant la fluidité, la légèreté et la maîtrise locale des données. Version 0.15.5, distribuée sur macOS et Windows.

**Core Value:** Rester un navigateur immédiatement fluide et léger : chaque fonctionnalité s'arbitre d'abord sur son coût au démarrage et à l'usage, avant toute autre considération.

### Constraints

- **Stack** : Electron 44.7 (Chromium 152), JavaScript ES2022 en CommonJS, sans framework, sans bundler et sans transpilation.
- **Dépendances vendorisées** : xterm.js 6 et, si le spike le confirme, `node-pty` pour le PTY. `node-pty` est natif, hors asar, avec signature du `spawn-helper`. Aucune autre dépendance runtime.
- **Packaging xterm.js 6** : ESM `.mjs` et mise à jour de `UI_TYPES` / MIME à valider en Phase 0 ; pas de bundler.
- **Dépendance externe** : Herdr doit être installé et déjà lancé ; Orbx ne l'installe ni ne le démarre dans ce milestone.
- **Plateforme** : macOS d'abord (machine de l'auteur), Windows à valider ensuite.
- **Performance** : un module inactif ne doit ni se charger ni coûter au démarrage ; la latence clavier et la fluidité priment.
- **Sécurité** : accès terminal local et explicitement activé ; validation des IPC et respect de la frontière de confiance existante ; aucune page web ne doit accéder au terminal.
- **Architecture** : le processus principal garde l'état et les politiques ; le renderer passe par les preloads. Toute extension du modèle doit respecter les patterns existants ou les faire évoluer explicitement, sans aggraver `window.js`.
- **Planning** : ne pas réintroduire les chantiers déjà livrés dans les phases.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- JavaScript (ES2022, CommonJS `require`/`module.exports`) - all application code in `src/main/`, `src/preload/`, `src/renderer/`, `src/shared/`, plus `scripts/` and `tests/`
- HTML5 - renderer surfaces (`src/renderer/*.html`): shell, command bar overlay, settings, library, notes, easels, password manager, welcome
- CSS3 - plain stylesheets (`src/renderer/*.css`): `base.css`, `shell.css`, `overlay.css`, `panel.css`, `settings.css`, `page.css`, `easel.css`
- Swift (CoreGraphics) - real-keyboard test helpers only (`tests/natif/touche.swift`, `tests/natif/ctrltab.swift`)
- Bash / PowerShell - CI steps in `.github/workflows/tests.yml` and Windows diagnostics in `scripts/diagnostic-win.ps1`
- No TypeScript, no JSX, no CSS preprocessor

## Runtime

- Electron 44.7.0 (Chromium 152, bundled Node.js) - declared in `package.json` under `orbx.electron`; main entry `src/main/main.js`
- Node.js 20+ required to run from source (README); CI uses Node 22 (`.github/workflows/tests.yml`)
- Optional DRM engine: castlabs Electron 44.5.1+wvcus (`package.json` `orbx.electronDrm`), selected with `ORBX_DRM=1`
- npm, invoked by hand-written scripts
- Lockfile: missing (no `package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml`)
- No `dependencies` or `devDependencies` in `package.json`; Electron and Playwright are installed outside the repository into `~/.orbx-dev` (or `~/.orbx-dev-drm`) by `scripts/dev.js` and `scripts/test-ui.js`

## Frameworks

- Electron 44.7.0 - desktop shell, Chromium sessions, `BaseWindow` + `WebContentsView` architecture (`src/main/window.js`), `orbx://` privileged protocol (`src/main/sessions.js`)
- No UI framework: the renderer is hand-written DOM code with classic `<script src="...">` tags; no React/Vue/Svelte, no bundler, no transpilation
- Inter-process pattern: `ipcMain.handle('orbx', ...)` dispatcher (`src/main/main.js`) + `contextBridge.exposeInMainWorld('orbx', ...)` (`src/preload/ui.js`)
- Node.js built-in test runner (`node:test` + `node:assert/strict`) for unit tests: `tests/adblock.test.js`, `tests/extensions.test.js`, `tests/pe-resources.test.js`
- Custom end-to-end harness: `tests/selftest.js` run by `node scripts/dev.js --selftest` through `scripts/dev.js` (`supervise`, heartbeat watchdog `src/main/test-guard.js`)
- Playwright Core for UI tests, installed ad hoc in `~/.orbx-dev`, driven by `scripts/test-ui.js` / `tests/ui/run.js` / `tests/ui/harness.js`
- Extension API tests: `scripts/test-ext.js`, scenarios `tests/ext-api.js` and `tests/ext-reelles.js`
- Native keyboard tests: compiled Swift helpers (`tests/natif/`)
- No Vitest/Jest configuration exists in the repository despite the project instruction mentioning `vitest run`
- Bespoke, dependency-free build scripts: `scripts/build-mac.js`, `scripts/build-win.js`
- Electron fuses are patched by `scripts/fuses.js` (disables `RunAsNode`, `NODE_OPTIONS`, `--inspect`)
- Windows PE icon/version resources are edited by hand-written `scripts/pe-resources.js`
- Asset generators: `scripts/make-icon.js` (SVG -> PNG via an offscreen Electron window), `scripts/make-ico.js`, `scripts/make-sounds.js` (WAV), `scripts/make-textures.js` (PNG), `scripts/make-springs.js`
- macOS system tools: `ditto`, `sips`, `iconutil`, `codesign --sign -` (ad hoc), `xattr`, `plutil`
- Windows system tools: `reg.exe` (browser registration), `tar.exe` (zip archive), PowerShell

## Key Dependencies

- Electron 44.7.0 - entire application runtime; no application code runs without it
- Chromium 152 (embedded) - page engine, sessions, cookies, downloads, certificates, extensions
- castlabs `electron-releases#v44.5.1+wvcus` - optional Widevine-capable engine, installed from GitHub via npm when `ORBX_DRM=1`
- `playwright-core` - installed at test time only, never shipped (`scripts/test-ui.js`)
- Node.js standard library only in production code (`fs`, `path`, `crypto`, `http` in tests); no third-party runtime libraries
- System binaries used at runtime: `/usr/bin/sqlite3`, `/usr/bin/security`, `/usr/bin/xattr` (macOS); `reg.exe`, `taskkill` (Windows)

## Configuration

- No `.env` files and no `.env*` present
- Runtime settings are persisted in `orbx.json` / `history.json` under `app.getPath('userData')` (`src/main/store.js`); defaults in `DEFAULT_SETTINGS` (`src/main/store.js:20`)
- Environment variables are for development, testing and packaging, not for production secrets. Key ones:
- `package.json` - scripts `start`, `test`, `test:ui`, `test:ext`, `build`, `build:win`; Electron versions under the `orbx` key
- `scripts/build-mac.js` - copies `Electron.app`, renames the binary to `Orbx`, embeds `src/`, `package.json`, `assets/blocklist.txt`, writes `Info.plist` keys (URL schemes, Handoff, camera/mic/location usage), cuts fuses, signs ad hoc; output `~/.orbx-dev/dist/Orbx.app`
- `scripts/build-win.js` - copies the Windows Electron distribution, renames `electron.exe` to `Orbx.exe`, embeds app files, cuts fuses, patches PE icon/version info, writes a zip `Orbx-<version>-windows-<arch>.zip`
- `scripts/fuses.js` - fuse table patching and verification
- `.github/workflows/tests.yml` - CI definition (see INTEGRATIONS.md)
- `assets/blocklist.txt` - generated by `scripts/update-blocklist.js`, committed, ~24,000 domains
- No `tsconfig.json`, ESLint, Prettier, Biome, or bundler config

## Platform Requirements

- Node.js 20+ and npm
- macOS or Windows for full test coverage; UI tests assume macOS paths (`tests/ui/harness.js` uses `Electron.app/Contents/MacOS/Electron`)
- Electron runtime downloaded on first `npm start` into `~/.orbx-dev`; Playwright Core downloaded on first `npm run test:ui`
- macOS native keyboard tests require `swiftc` and the `Touch`/Accessibility permissions (`tests/natif/`)
- Windows packaging requires Windows (or a pre-extracted Windows engine via `ORBX_WIN_DIST`)
- Desktop application, not a web service; no server, database, or container
- Shipped targets: macOS arm64 (`Orbx-<version>-mac-arm64.zip`) and Windows x64 (`Orbx-<version>-windows-x64.zip`), matching names expected by `src/main/updates.js:86`
- Unsigned builds: ad hoc signature on macOS (Gatekeeper confirmation), no signature on Windows (SmartScreen warning)
- Linux code paths exist in `src/main/platform.js` and `src/main/import-browsers.js`, but no Linux build script or release asset
- Version 0.15.5, MIT license

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Language and Runtime

- Plain JavaScript (CommonJS), HTML and CSS. No TypeScript, no JSX, no bundler, no framework, and no compilation step (`README.md`, "Organisation du code").
- Runtime is Electron `44.7.0` (or `44.5.1+wvcus` for DRM), installed outside the repository in `~/.orbx-dev` by `scripts/dev.js`. `package.json` declares no dependencies.
- Node.js 24 is used locally; CI pins Node 22 (`.github/workflows/tests.yml`).
- Four source layers: `src/main/` (Electron main process), `src/preload/` (context bridge), `src/renderer/` (UI pages), `src/shared/locales.js` (French/English strings).
- Code comments, UI text, test names and commit messages are in French. Identifiers are predominantly English in runtime code, French in test harness code and scenario files. Follow the language of the file you are editing.

## Naming Patterns

- Lowercase kebab-case or single word: `src/main/import-arc.js`, `src/main/page-color.js`, `src/main/win-default.js`, `src/renderer/common.js`.
- Feature modules are named after the concept they own: `src/main/adblock.js`, `src/main/passwords.js`, `src/main/downloads.js`, `src/main/shortcuts.js`.
- A few modules use the French domain term: `src/main/veille.js` (sleep), `src/main/empreinte.js` (fingerprint). Keep the existing name when extending them.
- Renderer pages ship as a trio with the same basename: `src/renderer/shell.js`, `shell.html`, `shell.css`; `settings.*`, `overlay.*`, `easel.*`. Small scripts that only decorate another page have a `.js` file alone (e.g., `src/renderer/fx.js`, `src/renderer/theme.js`).
- Tests: scenario files use French descriptive nouns (`tests/laterale.js`, `tests/securite.js`, `tests/mises-a-jour.js`); `node:test` suites end in `.test.js`; UI groups are numbered `NN-french-name.js` in `tests/ui/`.
- Build/generator scripts: `scripts/build-mac.js`, `scripts/build-win.js`, `scripts/make-ico.js`, `scripts/test-ui.js`, `scripts/test-ext.js`.
- `lowerCamelCase`, verb-first for actions: `shouldBlock`, `registrableDomain`, `openUrl`, `resetTab`, `place`, `boundsOf` (`src/main/adblock.js`, `src/main/motion.js`).
- Named `function` declarations for module logic and anything hoisted; `const fn = (...) => ...` for short helpers and callbacks (`src/main/commands.js:16`, `src/renderer/shell.js:15-16`).
- Test harness helpers are French: `jusqua`, `delai`, `lancer`, `servir`, `constater`, `verrouillee` (`tests/ui/harness.js`, `tests/outils.js`).
- Boolean predicates read as assertions: `isEnabled`, `isSiteAllowed`, `inFlight`, `arretInattendu`, `commandeOuverte`.
- `lowerCamelCase`. Domain state gets descriptive names (`sidebarWidth`, `maxLiveTabs`, `blockedByTab`, `historyFile`).
- Short locals (`w`, `wc`, `rt`, `el`, `n`, `i`) are accepted in tight rendering or event code and in test helpers; use them only when the scope is a few lines.
- Module-level constants are `UPPER_SNAKE_CASE`: `HISTORY_MAX`, `ARCHIVE_MAX`, `DEFAULT_SETTINGS` (`src/main/store.js:9-84`), `FILTER`, `CANCEL`, `NOTIFY_MS` (`src/main/adblock.js:24-28`), `MOTION` (`src/main/motion.js:6`).
- Module-level mutable singleton state is `lowerCamelCase`: `flights`, `watched`, `allow`, `domains` (`src/main/adblock.js:30-46`, `src/main/motion.js:24-25`).
- No type annotations, no JSDoc types, no `.d.ts`. Shapes are documented in French comments.
- `class` is reserved for stateful objects with behavior: `Store` (`src/main/store.js:86`), `OrbxWindow` (`src/main/window.js:323`), `LittleWindow` (`src/main/little.js:77`). Everything else is a plain object or closure.
- Use `Map`, `Set`, `WeakMap`, `WeakSet` for caches and registries (`src/main/adblock.js:39-46`, `src/main/motion.js:24-25`).

## Code Style

- 2-space indentation; tabs are not used anywhere in `src/`.
- Semicolons are always used.
- Single quotes for strings; template literals for interpolation (`${...}`) and multi-line HTML fragments.
- Spaces inside object braces (`{ name: 'x' }`); `} else {` on the same line.
- Single-line guard bodies are common and accepted: `if (!f) return;`, `try { ... } catch {}`.
- No maximum line length is enforced. Long single-line expressions are used deliberately in hot paths (`src/main/adblock.js`, `src/main/window.js`). Prefer the neighboring file's density over reformatting.
- No committed linter or formatter configuration: no `.eslintrc*`, `eslint.config.*`, `.prettierrc*`, `.editorconfig`, `biome.json`, or `tsconfig.json` at the repository root.
- Sparse inline suppressions exist and must be preserved when touching those lines: `// eslint-disable-next-line no-eval` (`tests/ui/harness.js:150`), `no-control-regex` (`src/main/updates.js:94`, `src/main/import-bookmarks.js:28`, `src/main/boosts.js:109`), `no-unused-vars` (`src/main/icons.js:24`), `no-undef` in UI tests (`tests/ui/22-themes.js:303`).
- Match the style of the file you edit. Do not introduce a formatter config as part of an unrelated change.
- Shared tokens live in `:root` in `src/renderer/base.css` as `--kebab-case` custom properties (`--accent`, `--fg`, `--dim`, `--line`, `--spring-snappy`).
- Dark mode is driven by `prefers-color-scheme` plus `html[data-scheme]` overrides (`src/renderer/base.css`).
- Class names are lowercase with hyphens (`.row`, `.row.tab`, `.act.x`, `.addr-host`); state is expressed as extra classes (`active`, `sel`, `out`, `shown`, `live`, `audible`, `changed`) and on `document.body` (`no-tab`, `dragging`).
- Lowercase tags and attributes; viewport/CSP meta tags in each page head (`src/renderer/shell.html`).
- Localization is declared in markup via `data-t` (text), `data-t-title`, `data-t-tip`, `data-t-ph`, and `data-key` for shortcut labels; `applyI18n()` in `src/renderer/common.js:26-34` fills them.
- UI keys use `area.camelCaseKey` (`app.about`, `side.empty`, `import.syncDetail`) with French as the reference locale and English fallback in `src/shared/locales.js`; placeholders are `{n}`.

## Import Organization

- None. Use relative paths only (`./`, `../`).
- Lazy `require()` inside a function is used to break circular dependencies: `require('./window')` inside `src/main/trace.js:23`, `require('./capture')` inside `tests/selftest.js:71`.
- Renderer pages never touch Node or Electron APIs directly. They use the `window.orbx` bridge exposed by `src/preload/ui.js` (aliased `const O = window.orbx` in `src/renderer/common.js:2`).
- The preload validates the page origin (`location.protocol === 'orbx:'`) and whitelists forwarded events before exposing them (`src/preload/ui.js:4-27`).
- Shared renderer helpers (`t`, `esc`, `host`, `applyI18n`, `faviconEl`, …) are globals defined in `src/renderer/common.js` and loaded before page scripts; do not duplicate them in page files.

## Error Handling

- Best-effort operations use an empty catch: `try { ... } catch {}`. This is deliberate — 152 occurrences in `src/main/`. Examples: reading a missing backup file (`src/main/store.js:97-101`), probing Electron animation options (`src/main/motion.js:17`), removing a temp file (`scripts/dev.js:105`).
- Unexpected failures that matter are logged with a context string and the message, then execution continues:
- `throw new Error('...')` is used for invalid state and for test assertions/timeouts: 42 occurrences in `src/main/`, e.g., `src/main/main.js:51-53` refusing `--selftest` on a packaged app.
- No custom error classes, no Result types.
- The main process installs `process.on('uncaughtException')` and writes the stack to `erreurs.log` in the userData directory instead of letting Electron open a blocking native dialog (`src/main/main.js:61-68`).
- In test mode, `src/main/test-guard.js` replaces every native dialog function with a refusing stub; a scenario that requests a dialog without preparing an answer fails and is reported.
- Guard against destroyed Electron objects before use (`isDestroyed()`, `rt.wc.isDestroyed()` in `src/main/window.js`; `try { ... } catch {}` around `getBounds` in `src/main/motion.js:35`).

## Logging

- Application errors use `console.error` with the `[orbx]` prefix and a short French context: `[orbx] partage d’écran`, `[orbx] corbeille`, `[orbx] adblock onCount` (`src/main/display-media.js`, `src/main/downloads.js`, `src/main/adblock.js`).
- `console.log` is reserved for scripts, benchmarks and tests (4 occurrences in `src/main/`, generally diagnostics). Do not add `console.log` to runtime paths.
- User-facing feedback goes through the localization layer and toasts (`w.toast(t('...'))`), never through console output.
- Diagnostic traces are opt-in: `src/main/trace.js` records Chromium traces with explicit privacy guardrails; `src/main/test-guard.js` records stalls and dialog requests only in test mode.

## Comments

- Comments are dense, in French, and explain *why* and what was measured, not *what* the line does. See `src/main/motion.js:56-77` (observed Electron animation behavior), `src/main/store.js:102-116` (why history lives in its own file), `src/main/adblock.js:1-20` (module contract and the single-listener constraint).
- Module headers start with a one-to-four-line summary of the module's responsibility.
- Section dividers use `// --- Titre ---...` padded with dashes to roughly the 78th column: `src/main/adblock.js:48`, `src/main/motion.js`, `tests/ui/harness.js:37`, `src/renderer/shell.js:18`.
- Inline comments after a branch explain edge cases: `// point final`, `// identifiants@` (`src/main/adblock.js:69-77`).
- Not used. Do not introduce JSDoc blocks; follow the existing prose style.
- Backticks and symbol names are written directly in comments (`onChange({ enabled, allowlist })`).

## Function Design

- Use an options object with defaults when a function has more than two optional knobs: `configure(opts = {})` (`src/main/adblock.js`), `place(view, rect, ms = 0, easing = 'ease-out')` (`src/main/motion.js:78`), `glisser(de, vers, { pause = 120, avantLacher = null } = {})` (`tests/ui/harness.js:325`).
- Inject dependencies explicitly for testability: the Electron session is passed to `adblock.attach(session)`; `src/main/display-media.js` takes an `env` object; test scenarios receive a `ctx`.
- Environment-dependent behavior is switched with `ORBX_*` environment variables, never hardcoded test branches in production logic.
- Return early for impossible or empty cases (`if (!f) return null;`).
- Async functions use `async`/`await`; callback-style Electron APIs are wrapped in promises where a promise reads better.
- Modules that maintain state expose small query helpers rather than returning the internal object (`stats()`, `info()`, `state: () => ({...})` in `src/main/adblock.js`, `src/main/boost-editor.js`).

## Module Design

- CommonJS only. `module.exports = { ... }` at the bottom of each file (60 occurrences in `src/main/`), listing public functions in call order or grouped by purpose.
- Testing seams are exported deliberately and labeled in a comment: `internals` (`src/main/auth.js:120`), `hooks`, `state`, `loadSync`, `setDomains` (`src/main/adblock.js:372-378`).
- Classes are exported as named properties (`OrbxWindow`, `store`), not as default exports.
- None. Import the specific module path.
- Feature modules keep private module-level state and expose `setup`/`install`/`configure`/`attach`; `src/main/main.js` wires them once.
- Cross-module callbacks use a `hooks` object of no-op defaults, replaced by `main.js`, to avoid circular imports:
- When a direct dependency is unavoidable and circular, require it lazily inside the function (`src/main/trace.js:23`).
- Put main-process features in `src/main/<feature>.js`; wire them from `src/main/main.js` and expose actions through `src/main/commands.js`.
- Put renderer pages in `src/renderer/` with matching `.html`/`.css`; add UI strings to `src/shared/locales.js` under a new `area.key` and mark elements with `data-t`.
- Keep new pure logic free of Electron imports so it can be covered by `node --test` (see `src/main/adblock.js:19-20`).
- Use French comments and French test descriptions, English identifiers, 2-space indentation, single quotes, and `[orbx]`-prefixed `console.error` for unexpected failures.

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## System Overview

```text

```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| App bootstrap | `app.whenReady`, single-instance lock, protocol registration, module wiring, IPC router, first window | `src/main/main.js` |
| Window hub | `OrbxWindow`: tabs, `WebContentsView` lifecycle, splits, Peek, sidebar layout, state view-model | `src/main/window.js` |
| State store | Single JSON state, debounced atomic writes, history file, archive, downloads, settings defaults | `src/main/store.js` |
| Sessions | `orbx://` protocol, per-profile Chromium sessions, user-agent cleanup, per-session service attach | `src/main/sessions.js` |
| Commands | Canonical action table (menu, palette, shortcuts) with accelerators and labels | `src/main/commands.js` |
| Native menu | Menu bar and Dock menu, rebuilt only when labels change | `src/main/menu.js` |
| Shortcut mapping | User overrides over command defaults, accelerator parsing/display | `src/main/shortcuts.js` |
| Settings | Validation of settable values, profile-scoped overrides, link routing rules, dev mode | `src/main/prefs.js`, `src/main/panes.js` |
| UI bridge | `window.orbx` (`send`, `on`, locales, keys, platform) — UI pages only | `src/preload/ui.js` |
| Sidebar UI | Full-state render with per-row reconciliation, drag/drop, space paging, rename, downloads, players | `src/renderer/shell.js` |
| Floating UI | Command bar, tab switcher, theme editor, find bar, toasts, Peek chrome, status, drop zone, swipe | `src/renderer/overlay.js` |
| Security services | Sheets, permissions, display media, certs, HTTP auth, popups, unload guard | `src/main/essentials.js` + peers |
| Extensions | CRX install/verify, `chrome.*` compatibility, host model, side panel, debugger, UI | `src/main/extensions.js`, `ext-api.js`, `ext-host.js`, `ext-panel.js`, `ext-more.js`, `ext-debug.js`, `ext-ui.js`, `ext-access.js` |
| Persistence extras | Local snapshots/restore, easel documents, password vault, history import | `src/main/backups.js`, `easels.js`, `passwords.js`, `import-*.js` |
| Platform abstraction | Window chrome, shortcuts notation, paths, default-browser registration | `src/main/platform.js`, `win-default.js` |
| Shared i18n | French reference strings and English translations | `src/shared/locales.js` |
| Shared theme engine | DOM-free theme model/validation/palette used by main and renderer | `src/renderer/theme.js` |

## Pattern Overview

- One state owner: only the main process mutates `store.state` (`src/main/store.js`); the renderer never writes state directly.
- Services are plain modules that expose functions plus a mutable `hooks` object and a `configure({...})`/`setup({...})` function; `main.js` injects dependencies (`src/main/main.js:430-508`).
- IPC is action-based: `ipcRenderer.invoke('orbx', action, payload)` → validated sender → prefix routing → handler (`src/main/main.js:371-391`).
- Every tab is a `WebContentsView` created lazily and tracked in a module-level `live` Map (`src/main/window.js:67-70`, `1046-1083`).
- UI views are sandboxed with `contextIsolation`, no Node integration, and no `<webview>` (`src/main/window.js:39-42`, `551-554`).
- No transpilation, no npm dependencies: Electron is installed outside the repo in `~/.orbx-dev` (`scripts/dev.js`).
- French is the source language for code identifiers' domain vocabulary, comments, and user-facing strings.

## Layers

- Purpose: owns browser state, policy, windows, views, persistence, and all privileged operations.
- Location: `src/main/`
- Contains: 61 CommonJS modules: orchestration (`main.js`, `window.js`, `little.js`, `panes.js`), services (`sessions.js`, `store.js`, `sheets.js`, …), platform code.
- Depends on: Electron APIs, Node core, `src/shared/locales.js`, `src/renderer/theme.js`.
- Used by: preload/renderer exclusively through IPC.
- Purpose: minimal, auditable bridges between isolated renderer worlds and main.
- Location: `src/preload/`
- Contains: `ui.js` (UI pages), `page.js` (password form observer, registered per profile session), `ext.js` (extension API shim), `media.js`, `panel.js`, `swipe.js`.
- Depends on: `electron` (`contextBridge`, `ipcRenderer`, `webFrame`).
- Used by: UI views (`UI_PRELOAD` in `src/main/window.js:34`) or registered via `session.registerPreloadScript` (`src/main/passwords.js:1079`, `src/main/ext-api.js:1046-1047`, `src/main/media.js:273`, `src/main/swipe.js:146`).
- Purpose: all user-visible chrome and internal pages.
- Location: `src/renderer/`
- Contains: 16 HTML pages, 24 scripts, shared CSS (`base.css`, `shell.css`, `overlay.css`, `settings.css`, `panel.css`, `page.css`, `easel.css`), sounds and textures.
- Depends on: `window.orbx` bridge only (plus `window.orbxPanel` in `panel.html`).
- Used by: `OrbxWindow.makeUiView`, sheets, settings window, password manager, Boost editor, internal tabs.
- Purpose: code used by both processes without DOM/Node assumptions.
- Location: `src/shared/locales.js` (i18n table), `src/renderer/theme.js` (also required by `src/main/window.js:13`).
- Purpose: development launcher, test launchers, packaging, asset generation, measurements.
- Location: `scripts/`
- Key files: `dev.js`, `test-ui.js`, `test-ext.js`, `build-mac.js`, `build-win.js`, `fuses.js`, `make-*.js`, `mesures.js`, `update-blocklist.js`.
- Purpose: end-to-end scenarios in the real app, Playwright UI tests, extension API tests, Node unit tests.
- Location: `tests/`, `tests/ui/`, `tests/fixtures/`, `tests/ext-fixture*/`, `tests/natif/`.

## Data Flow

### Primary Request Path (sidebar click → state update → repaint)

### Startup Path

### Tab View Lifecycle

### Link Routing and Peek

### Profile / Session Flow

### Extension API Flow

### Password Flow

- Authority: `store.state` (spaces, tabs, favs, archive, profiles, settings, permissions, boosts, notes, downloads, updates).
- History is a separate lazily loaded `history.json` with cap 8 000 (`src/main/store.js:104-116`, `240-284`).
- Incognito and blank windows hold their own detached `data` object instead of `store.state` (`src/main/window.js:355-363`).
- Shared windows all reference the same state object; only one persistent window records bounds/space (`src/main/window.js:644-653`).
- The renderer holds only the last received view-model `S` and pending local interactions (drag, rename, selection).

## Key Abstractions

- Purpose: one native window with one shell view, its content views, overlays, and undo history.
- Examples: `src/main/window.js:323-4992`; auxiliary `LittleWindow` in `src/main/little.js`.
- Pattern: large cohesive class; registries `windows` and `live` at module scope; hooks for services.
- Purpose: pairs a tab id with its `WebContentsView`, `webContents`, owner, loading/lastUsed state, and runtime-only flags.
- Examples: `live` Map (`src/main/window.js:68`), `wire()` listener installation (`1085-1305`).
- Pattern: tab metadata persisted; heavy view state ephemeral and reconstructed.
- Purpose: break dependency cycles and let `main.js` own composition.
- Examples: `win.hooks` (`src/main/window.js:90-105`), `sessions.hooks` (`src/main/sessions.js:19`), `passwords.configure` (`src/main/main.js:457`), `essentials.setup` (`src/main/essentials.js:176-266`).
- Pattern: modules export defaults (no-op hooks) so they can be required before wiring; `main.js` replaces them at startup.
- Purpose: only Orbx UI pages may call privileged IPC.
- Examples: `trusted` WeakSet, `INTERNAL = 'orbx://app/'`, `UI_PREFS` (`src/main/window.js:34-42`, `69`), `tab.internal` boolean set at creation, not inferred from URL (`src/main/window.js:1063-1065`; `src/main/store.js:154-155`).
- Pattern: sender check plus frame URL prefix; page content never decides privileges.
- Purpose: Orbx-owned overlays stacked per tab for permissions, screen share, HTTP auth, certificate warnings, crash/hang.
- Examples: `src/main/sheets.js:137-207`, `src/renderer/sheet.js`.
- Pattern: one view per sheet, bounded stack, result promise, message sender identified by view id.
- Purpose: pre-create auxiliary overlay views in the shell's renderer process to cut per-view process cost.
- Examples: `SPARES = 3`, `adoptSpare`, `fillSpares`, `makeUiView` (`src/main/window.js:485-570`).
- Pattern: shell `window.open`s only URLs registered in `wanted`; privileged views bypass this path and keep their own process.
- Purpose: single definition of user actions, accelerators, labels, palette visibility.
- Examples: `COMMANDS` in `src/main/commands.js:18-200`; consumed by `menu.js`, `shortcuts.js`, `window.commandList`.
- Pattern: entries `{ name, label, accel?, keys?, palette?, global?, run(w) }`.
- Purpose: Orbx UI served over a custom scheme instead of remote/dev-server content.
- Examples: `orbx://app/shell.html`, `overlay.html`, `settings.html`, `library.html`, `sheet.html`, `pw-overlay.html`, `panel.html`.
- Pattern: `protocol.handle('orbx', serveInternal)` serves `src/renderer` from memory with traversal protection (`src/main/sessions.js:55-67`); `INTERNAL_PAGES` decides which may open as tabs (`src/main/window.js:127`).

## Entry Points

- Location: `src/main/main.js` (declared in `package.json` `main`)
- Triggers: `npm start` → `scripts/dev.js`; packaged app launch; `open-url`, `open-file`, `continue-activity`, second-instance.
- Responsibilities: lifecycle, security switches, module wiring, IPC router, first window, test scenario runner.
- Location: invoked via `scripts/dev.js --selftest`; scenario `tests/selftest.js` orchestrated from `src/main/main.js:525-541`.
- Triggers: `npm test`, `ORBX_SCENARIO=...`; `scripts/test-ext.js` for extension scenarios.
- Responsibilities: drive real app, assert behavior, fail on uncaught exceptions or unanswered native dialogs.
- Location: `scripts/test-ui.js` → `tests/ui/run.js`; each `tests/ui/NN-*.js` starts a fresh browser via `tests/ui/harness.js`.
- Triggers: `npm run test:ui`.
- Location: `scripts/build-mac.js`, `scripts/build-win.js`
- Triggers: `npm run build`, `npm run build:win`; CI `.github/workflows/tests.yml` on macOS and Windows.
- Outputs: `~/.orbx-dev/dist/Orbx.app` or `Orbx/Orbx.exe` + zip (outside the repo).

## Architectural Constraints

- **Threading:** All orchestration runs on the single Node main thread; expensive work must be deferred, incremental, or moved to a `WebContentsView`. The renderer UI is a separate process.
- **Global state:** `store` singleton (`src/main/store.js`), `windows`, `live`, `trusted`, `wcOwner`, `spareSeq` (`src/main/window.js:67-72`), extension registries (`ext-api.js`, `ext-host.js`, `ext-panel.js`), password vault state (`passwords.js`). Treat these as single-owner main-process registries.
- **Circular imports:** `window.js` is imported by `little.js`, `menu.js`, `imports.js`, extension modules and others. Break cycles with the `hooks` seam or a lazy `require('./window')` inside a function (`src/main/commands.js:479-486`, `src/main/ext-panel.js:31-32`, `src/main/extra` patterns).
- **Window and view lifecycle:** a tab view belongs to exactly one window at a time; `ensureView` re-parents it and updates the previous owner's layout (`src/main/window.js:1046-1060`). Anything deferred must check `gone`/`isDestroyed()`.
- **IPC surface:** only `i18n` uses `sendSync` (bootstrap); everything else is `invoke`/`send`. New IPC must be validated in main and routed through an existing namespace or `OrbxWindow.handle`.
- **Security defaults:** sandbox, context isolation, no Node in renderers, no `<webview>`, navigation guards on UI views, `http(s)`-only for page-supplied URLs, text-only rendering of page data.
- **No build step:** source files ship as-is; do not add TypeScript, JSX, or bundler-only syntax. CommonJS in main/preload; plain classic scripts in renderer.
- **Platform code:** platform differences belong in `src/main/platform.js`; callers do not branch on `process.platform` except where a feature is inherently OS-specific (Dock menu, PowerShell diagnostics).

## Anti-Patterns

### Creating tab views outside `ensureView`

### Requiring `./window` at module top level from a window dependency

### Mutating `store.state` silently

### Trusting renderer or page payloads

### Adding timers or listeners tied to a window without cleanup

### Creating a fresh auxiliary view for every overlay

## Error Handling

- Uncaught main-process exceptions are logged to console and `userData/erreurs.log`, then execution continues; in selftest they fail the run (`src/main/main.js:55-68`, `525-541`).
- Commands are wrapped in `try/catch` and log `[orbx] commande …` (`src/main/commands.js:498-509`).
- Page failures load an Orbx error page (`error.html`), while certificate failures open an Orbx warning sheet (`src/main/window.js:1240-1249`, `src/main/certs.js`).
- Page crash/hang/unload produce sheets with explicit choices (`src/main/essentials.js:231-251`, `unload.js`).
- Test guard forbids unanswered native dialogs and aborts stalled scenarios with a state dump (`src/main/test-guard.js`, `src/main/main.js:75-93`, `scripts/dev.js`).
- Promise rejections from Electron APIs are generally caught and logged where the result matters; background failures are not allowed to escape.

## Cross-Cutting Concerns

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-fast` for a trivial task inline, with no subagents and no PLAN.md
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
