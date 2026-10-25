# Orbx

**A sidebar browser, in French, built on Chromium.**

Orbx adopts the organization and keyboard shortcuts of the Arc browser — sidebar,
Spaces, pinned tabs, command bar, split view — with a fully French interface
(English available in settings).

> Free and independent project, unaffiliated with The Browser Company. Orbx
> contains no Arc code or assets: everything is rewritten.

Status: **version 0.15, macOS and Windows**. The Windows build is validated in
continuous integration, not yet tried on a real machine: see
[docs/windows.md](docs/windows.md).

## What works

- **Sidebar**: favorites as tiles, pinned tabs, folders, today's tabs, drag and
  drop, inline rename, adjustable width, hiding (⌘S) with reappearance when
  hovering the left edge.
- **Spaces**: icon and theme per Space, switching with ⌃1…⌃9, ⌥⌘←/→ or a
  two-finger swipe on the sidebar.
- **Themes** (Spaces menu → Edit Theme): one to three colors in a gradient,
  chosen by dragging points on a color picker; intensity; four textures (grain,
  sand, tweed, denim); light, dark or automatic appearance per Space; eight
  ready-made themes and three ready-made palettes. Text stays readable on any
  color (computed contrast, at least 4.5).
- **Motion**: rows slide when the list changes, loading glow, elastic bounce of
  the list, two-finger swipe on the page to go back; the system's "Reduce
  motion" setting is respected.
- **Sounds**: seven brief, original sounds made by `scripts/make-sounds.js`
  (screenshot; on demand, new tab, close, Space switch, pin, refusal), with
  volume control.
- **Command bar** (⌘T / ⌘L): address, search, switch to an open tab, history,
  actions, search engine suggestions.
- **Split view** up to four panes (⌃⇧=).
- **Link preview (Peek)**: an outgoing link from a pinned tab, or a ⇧-click,
  opens above the page; ⌘O turns it into a tab, Escape closes it.
- **Profiles**: separate cookies, logins and favorites, one profile per Space.
- **Import from Arc**: Spaces, pins, folders, favorites and profiles (Orbx menu
  → Import from Arc…). Run again later, the same command updates Orbx from Arc
  (order, names, folders, added tabs) without deleting anything, after a backup.
- **Video and sound**: the current video becomes picture-in-picture when you
  switch tabs; a mini player in the sidebar controls the sound.
- **Built-in ad and tracker blocker** (24,000 domains, under a microsecond per
  request), with a per-site exception from the shield.
- **Chrome extensions**: installation from the Chrome Web Store, signature
  verified (Settings → Extensions), buttons under the address, side panel.
  Verified on real pages: Dark Reader, Wappalyzer, uBlock Origin Lite, CSS
  Peeper and GoFullPage. The Claude extension opens through to its sign-in
  screen; the rest has not been tried.
- **Boosts**: custom CSS per site and "Zap" to hide an element.
- **Passwords**: built-in saving and filling, encrypted with the system
  keychain, CSV import and export (Safari / iCloud, Chrome). The threat model
  is in [docs/mots-de-passe.md](docs/mots-de-passe.md).
- **Notes** (⌃⇧N, ⌃⌥N next to the page) and **media** in the library.
- **Boards** (⌃⇧E), Arc's "Easels": an infinite canvas for placing text,
  pasted or dropped images, shapes, arrows, lines and sticky notes; "Capture to
  a board" (⌥⇧⌘2) sends a region of the page there, with a link to its source.
  One file per board, images separately, listed in the library. No "live"
  capture or sharing yet.
- **Archive**: ⌘W archives the tab, ⇧⌘T reopens it, inactive tabs are archived
  automatically (12 h by default).
- **Little window** (⌥⌘N), **private browsing** (⇧⌘N), multiple windows sharing
  the same sidebar.
- **Library**: history, archive, downloads.
- Find in page, zoom, screenshot, print, developer tools, per-site permissions,
  sleeping of old tabs.
- **French and English**, light, dark or automatic theme.

## Keyboard shortcuts

Identical to Arc's. The full list is in the app:
*Help → Essential keyboard shortcuts*.

| Action | Shortcut |
| --- | --- |
| New tab / command bar | ⌘T / ⌘L |
| Archive tab / reopen it | ⌘W / ⇧⌘T |
| Pin or unpin | ⌘D |
| Next / previous tab | ⌥⌘↓ / ⌥⌘↑ |
| Recent tabs | ⌃⇥ (hold ⌃) |
| Go to tab 1…9 | ⌘1 … ⌘9 |
| Next / previous Space | ⌥⌘→ / ⌥⌘← |
| Go to Space 1…9 | ⌃1 … ⌃9 |
| Hide the sidebar | ⌘S |
| Toolbar | ⇧⌘D |
| Split view / close pane | ⌃⇧= / ⌃⇧- |
| Copy URL / as Markdown | ⇧⌘C / ⌥⇧⌘C |
| Clear Today | ⇧⌘K |
| Little window / private browsing | ⌥⌘N / ⇧⌘N |
| History / library / downloads | ⌘Y / ⇧⌘L / ⇧⌘J |
| Capture the page | ⇧⌘2 |
| New board / capture to a board | ⌃⇧E / ⌥⇧⌘2 |
| Settings | ⌘, |

## Running Orbx from source

The project requires [Node.js](https://nodejs.org) 20 or newer.

```sh
git clone https://github.com/electroheadfx/orbx.git
cd orbx
npm start        # launches the browser
npm test         # end-to-end tests (over 1,500 checks)
npm run test:ui  # Playwright UI tests, real mouse and keyboard (504 checks)
npm run test:ext # extension API layer, in the real browser (175 checks)
# real-keyboard tests (they take over the keyboard): see tests/natif/
npm run build    # builds ~/.orbx-dev/dist/Orbx.app (-- --install for /Applications)
```

The tests watch themselves: no native dialog can open without a prepared
answer, an uncaught exception fails the scenario, and a test that stops making
progress stops by writing what it was waiting for (windows, pages, unanswered
calls; native call stacks if the main thread is frozen). With the screen locked
or asleep, checks that need images or sound are skipped one by one, with the
reason.

On macOS, test windows are invisible: transparent, mouse-transparent, with no
keyboard or Dock icon, so you can keep working during tests (`tests/discret.js`).
`ORBX_TEST_VISIBLE=1` shows them.

Protected videos (Widevine): `ORBX_DRM=1 npm start` uses an engine that can play
them; see [docs/etude-extensions-et-distribution.md](docs/etude-extensions-et-distribution.md).

On first launch, the engine (Electron) is downloaded into `~/.orbx-dev`, outside
the project. Browser data lives in `~/Library/Application Support/Orbx`.

## Code organization

```
src/main/       main process: windows, tabs, menus, data
src/preload/    secure bridge between the interface and the main process
src/renderer/   interface: sidebar, command bar, internal pages
src/shared/     French and English strings
tests/          end-to-end tests, UI tests (Playwright), real sites
docs/           analysis of Arc and roadmap
```

No framework or build step: plain JavaScript, HTML and CSS, for fast startup and
a smooth interface.

## Roadmap

See [docs/feuille-de-route.md](docs/feuille-de-route.md). Next projects: Chrome
extensions, synchronization, then the Windows version.

## License

The code is licensed under [MIT](LICENSE). The blocklist
(`assets/blocklist.txt`) gathers public lists that each keep their own license
(MIT and CC BY 3.0), recalled at the top of the file.

Inspired by [Orbe](https://github.com/amadoubaui/orbe), Amadou Ba's browser.
