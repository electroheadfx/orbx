---
name: orbx-release
description: End-to-end signed macOS release workflow for Orbx. Use when preparing or publishing an Orbx release — version bump, automated gates, Developer ID signing, notarization, signed UAT, and the GitHub release carrying the Orbx-<version>-mac-arm64.zip asset. Adapted from the EFX Motion release skill.
---

# Orbx Release Workflow

Orbx ships **zips, not DMGs**. The release artifact is a signed, notarized, stapled
`Orbx-<version>-mac-arm64.zip` because `src/main/updates.js` looks up exactly that
asset name in the latest GitHub release. Do not improvise; every rule below comes
from a real release incident or from the Orbx build contract.

## Orbx facts (verified)

| Item | Value |
|---|---|
| Repository | `electroheadfx/orbx` |
| Version authority | `package.json` `version`; live mention in `.planning/PROJECT.md` |
| Build output | `~/.orbx-dev/dist/Orbx.app` (override with `$ORBX_RUNTIME`) |
| Inner binary | `~/.orbx-dev/dist/Orbx.app/Contents/MacOS/Orbx` |
| Bundle id | `com.electroheadfx.orbx` |
| Release asset | `Orbx-<version>-mac-arm64.zip` |
| Signing identity | `Developer ID Application: MARQUES Laurent (TCYJ9HH9RS)` |
| Update endpoint | `https://api.github.com/repos/electroheadfx/orbx/releases/latest` |
| CI reference | `.github/workflows/tests.yml` |

`src/main/updates.js` only offers the in-app download when the release asset carries
a GitHub `digest` (`sha256:...`). Without a digest it shows only the release page.

## Hard rules (non-negotiable)

1. **Push `main` (and `dev`) before any `gh release create`.** GitHub anchors a new
   tag on the remote default-branch HEAD. An unpushed local `main` publishes a stale
   commit. Verify `git rev-parse HEAD` equals `git rev-parse origin/main`.
2. **Write the release notes into the draft before publishing.** `--latest` publishes
   an empty body otherwise.
3. **Bump the version before building.** Authoritative surface: `package.json`. Update
   the live mention in `.planning/PROJECT.md`. `README.md` currently has no version
   line — do not reintroduce one.
4. **Never touch Apple credentials.** The `.p8` key and the `APPLE_*` environment file
   stay outside the repo, planning files, and agent context. Only the user-run wrapper
   sources them.
5. **Deleting a published release's tag reverts the release to draft.** To retarget:
   delete the remote tag, recreate the annotated tag on the correct commit, push it,
   then `gh release edit <tag> --draft=false --latest`.
6. **Bundle freshness is judged by the inner binary mtime and `Info.plist`**, never by
   the app directory or zip mtime.
7. **Signature, Gatekeeper, permissions and CSP behavior are proven on the packaged
   signed build**, never on the dev server.
8. **The stop-condition checklist is a hard gate.** Any active condition blocks
   publish. No warnings mode.
9. **Release phase = zero functional code changes.** A UAT bug stops the phase; fix it
   in a follow-up quick/debug, then re-run the release phase.
10. **Do not tag or publish before the targeted scope is finished and UAT'd.** Finish
    fixes → run the gates → UAT the packaged build → close audit gaps → then sign, tag
    and release. Only the publish act remains after the stop-condition checklist.
11. **A known-broken release is deleted, not patched forward.** `gh release delete
    <tag> --yes` → `git push origin :refs/tags/<tag>` → `git tag -d <tag>` → re-run.

## Sequence

### 1. Pre-flight repository state

- [ ] Scope readiness (rule 10): targeted fixes landed, packaged build UAT'd, audit
      gaps closed.
- [ ] Version bumped: `node -p "require('./package.json').version"` prints the release
      version; `.planning/PROJECT.md` mentions it.
- [ ] No live doc still references the previous version. Historical archives under
      `.planning/quick/`, `.planning/research/` and `.planning/debug/` are exempt.
- [ ] Icon assets current: `assets/icon.svg` → `assets/orbx.icns` / `assets/orbx.ico`.
      If the SVG changed, regenerate with `npm run build -- --icon` **before** the
      release commit.
- [ ] Clean tree: `git status --porcelain` empty.
- [ ] `main` pushed: `git fetch origin && test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"`.
- [ ] Tag state: if `v<version>` exists, `git rev-parse v<version>` must equal HEAD;
      otherwise it will be created by `gh release create` on the pushed HEAD.
- [ ] `gh auth status` is green for `electroheadfx`.
- [ ] Do not reuse an old `Orbx-*.zip`; the pipeline always recreates it after stapling.

### 2. Automated gates (exact order, all green)

Run from the repo root:

```bash
node --test tests/*.test.js
node scripts/dev.js --selftest
node scripts/test-ext.js
npm run test:ui
```

`tests/*.test.js` covers adblock, extensions, icons, migrate-profile and PE resources.
`npm run test:ui` needs Playwright in `~/.orbx-dev` (downloaded on first run) and a real
desktop session; it is not in CI but is part of release confidence.

> The project instruction mentioning `vitest run` is stale: the repository has no
> Vitest configuration and uses `node:test` (recorded in `.planning/STATE.md`
> blockers). Do not add Vitest for a release.

Any failure: stop and flag; the user decides fix-and-rerun vs defer.

### 3. Credentialed release (user-run, the only credentialed step)

Created once during the first release, **outside Git**:

- `~/.config/orbx/scripts/orbx-release` (mode 700): prompts for the trusted Apple
  environment file, sources it, validates the four variables, exports them, runs
  `bash scripts/macos-release.sh release`, and trap-unsets them on exit.
- The environment file (mode 600) contains exactly:

  ```sh
  export APPLE_SIGNING_IDENTITY="Developer ID Application: MARQUES Laurent (TCYJ9HH9RS)"
  export APPLE_API_ISSUER="..."
  export APPLE_API_KEY="..."
  export APPLE_API_KEY_PATH="/absolute/path/to/AuthKey_XXX.p8"
  ```

- `scripts/macos-release.sh` (credential-free, committed) implements `preflight`,
  `release`, and `verify-downloaded <zip>`. Create it during the first execution if
  absent.

The user runs in their own terminal:

```bash
~/.config/orbx/scripts/orbx-release
```

At the prompt, drag the **environment file**, never the `.p8` (dragging the `.p8`
fails with `command not found: -----BEGIN`).

`scripts/macos-release.sh release` performs, in order:

1. `npm run build` — fresh `Orbx.app`, fuses cut, ad hoc signature.
2. Verify the build: `node scripts/build-mac.js --fuses` and
   `plutil -p "$APP/Contents/Info.plist" | grep -E 'CFBundleShortVersionString|CFBundleIdentifier'`.
3. Re-sign **inside-out**, every nested Mach-O explicitly — never rely on `--deep`.
   `--deep` skips `Electron Framework.framework/.../Libraries/*.dylib` and
   `Squirrel.framework/.../Resources/ShipIt`; Apple rejects them at notarization
   ("not signed with a valid Developer ID certificate", "does not include a secure
   timestamp", "does not have the hardened runtime enabled"). `scripts/macos-release.sh`
   signs, in order:

   ```bash
   # 1. Every Mach-O under Contents/Frameworks and Contents/MacOS.
   find "$APP/Contents/Frameworks" "$APP/Contents/MacOS" -type f -print0 |
     while IFS= read -r -d '' f; do
       file -b "$f" | grep -q 'Mach-O' || continue
       case "$f" in
         */Contents/MacOS/*) codesign --force --options runtime --timestamp --entitlements build/entitlements.mac.plist --sign "$APPLE_SIGNING_IDENTITY" "$f" ;;
         *) codesign --force --options runtime --timestamp --sign "$APPLE_SIGNING_IDENTITY" "$f" ;;
       esac
     done
   # 2. Framework bundles, then helper app bundles, then the app bundle.
   ```

   Minimal `build/entitlements.mac.plist`:

   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
     <key>com.apple.security.cs.allow-jit</key><true/>
     <key>com.apple.security.cs.allow-unsigned-executable-memory</key><true/>
   </dict>
   </plist>
   ```

   DRM builds (`ORBX_DRM=1`, `ORBX_EVS`) additionally need the castlabs VMP signature
   **before** codesign and may need `com.apple.security.cs.disable-library-validation`;
   prove them separately.

4. Verify the signature:

   ```bash
   codesign --verify --deep --strict --verbose=2 "$APP"
   ```

   A green `codesign --verify` is necessary but not sufficient: walk every Mach-O and
   require `Authority=Developer ID Application`, a `Timestamp=`, and
   `flags=...runtime`. This check caught the three binaries Apple rejected. Confirm the
   helper apps and the main app carry `com.apple.security.cs.allow-jit`.

5. Create the notarization zip:

   ```bash
   ditto -c -k --sequesterRsrc --keepParent "$APP" "$ZIP"
   ```

6. Notarize with the API key:

   ```bash
   xcrun notarytool submit "$ZIP" \
     --issuer "$APPLE_API_ISSUER" --key "$APPLE_API_KEY_PATH" --key-id "$APPLE_API_KEY" --wait
   ```

   On `Invalid`, the script extracts the submission id and prints
   `xcrun notarytool log <id> …` automatically; read `issues` before retrying. A common
   cause is exactly the nested signing above, not a problem with the Developer ID.

7. Staple and assess:

   ```bash
   xcrun stapler staple "$APP"
   xcrun stapler validate "$APP"
   spctl --assess --type execute --verbose "$APP"
   ```

8. Recreate the zip **after stapling**, with the exact asset name, and record the
   SHA-256:

   ```bash
   rm -f "$ZIP"
   ditto -c -k --sequesterRsrc --keepParent "$APP" "$ZIP"
   shasum -a 256 "$ZIP"
   ```

Expected ledger: `RELEASE PASS` with Developer ID authority, TeamIdentifier
`TCYJ9HH9RS`, `flags=...runtime`, notarization `Accepted`, and a stapled app.

### 4. Signed packaged-app UAT (user oracle, one pass)

The user launches `~/.orbx-dev/dist/Orbx.app` **normally** (double-click, no
Control-click bypass) and verifies:

- no Gatekeeper prompt; macOS reports version `<version>`;
- a page opens, Spaces switch, pinned tabs and the command bar work;
- Chrome extensions load and the side panel opens;
- the password vault unlocks (re-signing changes the code identity — verify Keychain
  access);
- camera/mic/screen-share prompts still appear and work (TCC may reset after re-signing);
- DRM playback only if the DRM engine was built.

Any failure: flag with step + screenshot; no in-phase fix.

### 5. GitHub draft + notes + downloaded-artifact verification

```bash
gh release create "v<version>" --draft --title "Orbx v<version>" \
  --notes-file /tmp/orbx-<version>-notes.md \
  "$ZIP"
```

Fill the notes before any publish (template below). Then the user downloads the asset
from the draft through a separate path (browser), reports the absolute path, and:

```bash
shasum -a 256 "<downloaded zip>"        # must equal the recorded SHA-256
ditto -x -k "<downloaded zip>" /tmp/orbx-download-check
codesign --verify --deep --strict --verbose=2 "/tmp/orbx-download-check/Orbx.app"
spctl --assess --type execute --verbose "/tmp/orbx-download-check/Orbx.app"
xcrun stapler validate "/tmp/orbx-download-check/Orbx.app"
```

The user installs into `/Applications` and launches normally; no Gatekeeper prompt.

### 6. Stop-condition checklist + publish

Record every "do not publish if" condition as individually NOT ACTIVE. Only then:

```bash
gh release edit "v<version>" --draft=false --latest
gh api repos/electroheadfx/orbx/releases/latest --jq '.tag_name'
gh api repos/electroheadfx/orbx/releases/latest --jq '.assets[] | {name, size, digest}'
```

The `digest` must be a `sha256:...` value; without it `updates.js` will not offer the
in-app download.

### 7. Post-publish tag verification (mandatory)

```bash
git ls-remote --tags origin "v<version>"
git show "v<version>:package.json" | grep '"version"'
```

Both must match the shipped version. If the tag points at the wrong commit: push
`main`, delete the remote tag (`git push origin --delete "v<version>"`), recreate the
annotated tag at the correct commit, push it, then
`gh release edit "v<version>" --draft=false --latest`.

## Release notes template

```markdown
## What shipped

### <Headline feature 1>
### <Headline feature 2>

---

**Release verification:** signed with Apple Developer ID (Team TCYJ9HH9RS), hardened
runtime, notarized and stapled; passed Gatekeeper assessment, downloaded-artifact
verification, and normal launch without security overrides.
```

## Failure handling

- **Gate/UAT failure mid-window**: stop and flag (step + evidence). Fix in a follow-up
  quick/debug, then re-run the release phase.
- **Wrapper fails on credentials**: confirm the dragged file is the env file with the
  four `export APPLE_` lines; the `.p8` appears only as the quoted value of
  `APPLE_API_KEY_PATH`.
- **Notarization slow**: 2–10 minutes is normal; do not close the terminal.
- **Hardened-runtime breakage (extensions, Keychain, DRM)**: adjust entitlements and
  re-sign; never publish a broken artifact.
- **GitHub asset has no digest**: do not publish as-is; re-upload with
  `gh release upload --clobber` and re-check.

## References

- `scripts/build-mac.js` — build, fuses, ad hoc signature, `Info.plist`.
- `scripts/dev.js` — runtime location (`~/.orbx-dev`).
- `scripts/fuses.js` — fuse cutting and verification.
- `src/main/updates.js` — release lookup, asset name, digest requirement.
- `.github/workflows/tests.yml` — CI gates.
- `scripts/macos-release.sh`, `build/entitlements.mac.plist`,
  `~/.config/orbx/scripts/orbx-release` — created during the first release execution;
  the wrapper and environment file are never committed.
