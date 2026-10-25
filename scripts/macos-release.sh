#!/bin/bash
# Pipeline de release macOS d'Orbx, sans identifiants en dur.
#   preflight                        vérifie l'outillage et le dépôt, sans credentials
#   release                          build + signature Developer ID + notarisation + zip
#   verify-downloaded <zip> [sha256] vérifie une archive téléchargée
#
# La signature et la notarisation exigent quatre variables, fournies uniquement
# par le wrapper utilisateur : APPLE_SIGNING_IDENTITY, APPLE_API_ISSUER,
# APPLE_API_KEY, APPLE_API_KEY_PATH.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RUNTIME="${ORBX_RUNTIME:-$HOME/.orbx-dev}"
APP="$RUNTIME/dist/Orbx.app"
ENT="$ROOT/build/entitlements.mac.plist"
DEFAULT_IDENTITY="Developer ID Application: MARQUES Laurent (TCYJ9HH9RS)"
VERSION="$(node -p "require('$ROOT/package.json').version")"
ZIP="$RUNTIME/dist/Orbx-$VERSION-mac-arm64.zip"

say() { printf '\n== %s ==\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

check_arch() {
  [ "$(uname -m)" = "arm64" ] || die "release macOS arm64 uniquement (machine : $(uname -m))"
  [ "$(node -p 'process.arch')" = "arm64" ] || die "Node doit être arm64"
}

preflight() {
  say "Préflight"
  check_arch
  command -v codesign >/dev/null || die "codesign absent"
  command -v xcrun >/dev/null || die "xcrun absent"
  xcrun notarytool --version >/dev/null || die "notarytool absent"
  command -v ditto >/dev/null || die "ditto absent"
  command -v gh >/dev/null || die "gh absent"
  [ -f "$ENT" ] || die "entitlements absent : $ENT"
  [ -z "$(git status --porcelain)" ] || die "arbre de travail non propre"
  ID="${APPLE_SIGNING_IDENTITY:-$DEFAULT_IDENTITY}"
  security find-identity -v -p codesigning | grep -Fq "$ID" || die "identité absente du trousseau : $ID"
  node -e "const v=require('$ROOT/package.json').version; if(!/^\\d+\\.\\d+\\.\\d+$/.test(v)) process.exit(1)" || die "version illisible"
  gh auth status >/dev/null 2>&1 || die "gh non authentifié"
  printf 'Version : %s\nIdentité : %s\nApplication : %s\nArchive : %s\n' "$VERSION" "$ID" "$APP" "$ZIP"
  echo "PREFLIGHT PASS"
}

release() {
  say "Release $VERSION"
  check_arch
  : "${APPLE_SIGNING_IDENTITY:?APPLE_SIGNING_IDENTITY manquant}"
  : "${APPLE_API_ISSUER:?APPLE_API_ISSUER manquant}"
  : "${APPLE_API_KEY:?APPLE_API_KEY manquant}"
  : "${APPLE_API_KEY_PATH:?APPLE_API_KEY_PATH manquant}"
  [ -f "$APPLE_API_KEY_PATH" ] || die "clé API illisible : $APPLE_API_KEY_PATH"
  [ -f "$ENT" ] || die "entitlements absent : $ENT"

  say "Fabrication"
  npm run build

  say "Vérification de la fabrication"
  node scripts/build-mac.js --fuses
  PLIST_VERSION="$(plutil -extract CFBundleShortVersionString raw "$APP/Contents/Info.plist")"
  [ "$PLIST_VERSION" = "$VERSION" ] || die "Info.plist $PLIST_VERSION ≠ package.json $VERSION"
  PLIST_ID="$(plutil -extract CFBundleIdentifier raw "$APP/Contents/Info.plist")"
  [ "$PLIST_ID" = "com.electroheadfx.orbx" ] || die "bundle id inattendu : $PLIST_ID"

  say "Signature Developer ID"
  # Tous les binaires imbriqués d'abord : `--deep` omettait les dylibs de
  # Libraries et ShipIt, que la notarisation refuse (pas de Developer ID, pas
  # d'horodatage, pas de hardened runtime).
  find "$APP/Contents/Frameworks" "$APP/Contents/MacOS" -type f -print0 |
    while IFS= read -r -d '' f; do
      file -b "$f" | grep -q 'Mach-O' || continue
      case "$f" in
        */Contents/MacOS/*) codesign --force --options runtime --timestamp --entitlements "$ENT" --sign "$APPLE_SIGNING_IDENTITY" "$f" ;;
        *) codesign --force --options runtime --timestamp --sign "$APPLE_SIGNING_IDENTITY" "$f" ;;
      esac
    done
  find "$APP/Contents/Frameworks" -maxdepth 1 -name '*.framework' -type d -print0 |
    while IFS= read -r -d '' framework; do
      codesign --force --options runtime --timestamp --sign "$APPLE_SIGNING_IDENTITY" "$framework"
    done
  find "$APP/Contents/Frameworks" -maxdepth 1 -name '*.app' -type d -print0 |
    while IFS= read -r -d '' helper; do
      codesign --force --options runtime --timestamp --entitlements "$ENT" --sign "$APPLE_SIGNING_IDENTITY" "$helper"
    done
  codesign --force --options runtime --timestamp --entitlements "$ENT" --sign "$APPLE_SIGNING_IDENTITY" "$APP"

  say "Vérification de la signature"
  codesign --verify --deep --strict --verbose=2 "$APP"
  INFO="$(codesign -dv --verbose=4 "$APP" 2>&1)"
  printf '%s\n' "$INFO" | grep -q 'Developer ID Application' || die "signature Developer ID absente"
  printf '%s\n' "$INFO" | grep -q 'TeamIdentifier=TCYJ9HH9RS' || die "TeamIdentifier inattendu"
  printf '%s\n' "$INFO" | grep -q 'flags=.*runtime' || die "hardened runtime absent"
  # Chaque binaire doit porter Developer ID, horodatage et hardened runtime :
  # c'est exactement ce que la notarisation vérifie.
  BAD="$(mktemp -t orbx-sign)"
  find "$APP/Contents/Frameworks" "$APP/Contents/MacOS" -type f -print0 |
    while IFS= read -r -d '' f; do
      file -b "$f" | grep -q 'Mach-O' || continue
      D="$(codesign -dv --verbose=2 "$f" 2>&1 || true)"
      printf '%s\n' "$D" | grep -q 'Authority=Developer ID Application' || printf '%s (Developer ID)\n' "$f" >> "$BAD"
      printf '%s\n' "$D" | grep -q 'Timestamp=' || printf '%s (horodatage)\n' "$f" >> "$BAD"
      printf '%s\n' "$D" | grep -q 'flags=.*runtime' || printf '%s (hardened runtime)\n' "$f" >> "$BAD"
    done
  if [ -s "$BAD" ]; then cat "$BAD"; rm -f "$BAD"; die "signature incomplète"; fi
  rm -f "$BAD"
  for helper in "$APP"/Contents/Frameworks/*Helper*.app; do
    [ -d "$helper" ] || continue
    codesign -d --entitlements :- "$helper" 2>/dev/null | grep -q 'allow-jit' || die "entitlement JIT absent : $helper"
  done

  say "Notarisation"
  rm -f "$ZIP"
  ditto -c -k --sequesterRsrc --keepParent "$APP" "$ZIP"
  NOTARY_LOG="$(mktemp -t orbx-notary)"
  xcrun notarytool submit "$ZIP" \
    --issuer "$APPLE_API_ISSUER" --key "$APPLE_API_KEY_PATH" --key-id "$APPLE_API_KEY" \
    --wait 2>&1 | tee "$NOTARY_LOG"
  if ! grep -q 'status: Accepted' "$NOTARY_LOG"; then
    SUB_ID="$(awk '/Submission ID received/{seen=1; next} seen && /id:/{print $2; exit}' "$NOTARY_LOG")"
    if [ -n "${SUB_ID:-}" ]; then
      echo "Journal de notarisation :"
      xcrun notarytool log "$SUB_ID" --issuer "$APPLE_API_ISSUER" --key "$APPLE_API_KEY_PATH" --key-id "$APPLE_API_KEY" || true
    fi
    die "notarisation refusée"
  fi

  say "Agrafage"
  xcrun stapler staple "$APP"
  xcrun stapler validate "$APP"
  spctl --assess --type execute --verbose=4 "$APP"

  say "Archive finale"
  rm -f "$ZIP"
  ditto -c -k --sequesterRsrc --keepParent "$APP" "$ZIP"
  HASH="$(shasum -a 256 "$ZIP" | awk '{print $1}')"
  printf 'ARCHIVE : %s\nSHA256  : %s\n' "$ZIP" "$HASH"
  printf 'RELEASE PASS\n'
}

verify_downloaded() {
  local zip="${1:-}" expected="${2:-}"
  [ -n "$zip" ] || die "usage : verify-downloaded <zip> [sha256]"
  [ -f "$zip" ] || die "archive introuvable : $zip"
  if [ -n "$expected" ]; then
    local actual
    actual="$(shasum -a 256 "$zip" | awk '{print $1}')"
    [ "$actual" = "$expected" ] || die "SHA-256 différent : $actual"
  fi
  local tmp
  tmp="$(mktemp -d -t orbx-download)"
  ditto -x -k "$zip" "$tmp"
  local app="$tmp/Orbx.app"
  [ -d "$app" ] || die "Orbx.app absent de l'archive"
  codesign --verify --deep --strict --verbose=2 "$app"
  spctl --assess --type execute --verbose=4 "$app"
  xcrun stapler validate "$app"
  local v
  v="$(plutil -extract CFBundleShortVersionString raw "$app/Contents/Info.plist")"
  printf 'Version : %s\n' "$v"
  echo "DOWNLOADED ARTIFACT PASS"
}

case "${1:-}" in
  preflight) preflight ;;
  release) release ;;
  verify-downloaded) shift; verify_downloaded "$@" ;;
  *) echo "usage : $0 {preflight|release|verify-downloaded <zip> [sha256]}" >&2; exit 2 ;;
esac
