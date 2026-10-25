// Reprise unique du profil de l'ancien nom (Orbe) vers le nouveau (Orbx).
// Appelé au démarrage avant le verrou d'instance et store.load : sans cet ordre,
// le verrou ou la première sauvegarde créerait un profil Orbx vide, et la
// migration ne se rejouerait jamais.
//
// Module Node pur (aucun import Electron) pour être couvert par node:test. Le
// déplacement se fait par renommage quand c'est possible ; sinon par copie avec
// conservation de l'ancien dossier. La fusion dans un dossier déjà créé par
// Electron (GPUPersistentCache) est non destructive : la cible gagne toujours,
// rien n'est supprimé récursivement, et un profil Orbx réel n'est jamais touché.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Constantes héritées : les seuls littéraux de l'ancien nom du module.
const OLD_DIR = 'Orbe';
const NEW_DIR = 'Orbx';
const OLD_STATE = 'orbe.json';
const NEW_STATE = 'orbx.json';
const OLD_INTERNAL = 'orbe://app/';
const NEW_INTERNAL = 'orbx://app/';
const KEY_OLD = { service: 'Orbe Safe Storage', account: 'Orbe Key' };
const KEY_NEW = { service: 'Orbx Safe Storage', account: 'Orbx Key' };
const REG_LEGACY = ['HKCU\\Software\\Classes\\OrbeHTML', 'HKCU\\Software\\Clients\\StartMenuInternet\\Orbe'];

// Marqueurs d'un vrai profil. Les artefacts de démarrage que Chromium crée tôt
// (GPUPersistentCache, caches, Preferences, Local State) ne comptent pas : sinon
// la migration croirait le profil déjà repris et ne ferait jamais rien.
const PROFILE_MARKERS = ['orbx.json', 'orbe.json', 'history.json', 'passwords.json', 'Cookies', 'Local Storage', 'Partitions', 'Network', 'Extensions', 'easels', 'Telechargements'];

function realEntry(file) {
  try {
    const st = fs.lstatSync(file);
    return st.isSymbolicLink() ? null : st;
  } catch {
    return null;
  }
}

function hasProfileData(dir) {
  return PROFILE_MARKERS.some((name) => {
    const st = realEntry(path.join(dir, name));
    return !!st && (st.isFile() || st.isDirectory());
  });
}

// Un nom de fichier d'état (ou de secours) se renomme seulement si la source est
// un vrai fichier régulier et si la cible n'existe pas encore.
function renameState(dir) {
  for (const [oldName, newName] of [[OLD_STATE, NEW_STATE], [OLD_STATE + '.bak', NEW_STATE + '.bak']]) {
    const src = path.join(dir, oldName);
    const dst = path.join(dir, newName);
    const st = realEntry(src);
    if (!st || !st.isFile()) continue;
    if (fs.existsSync(dst)) continue;
    fs.renameSync(src, dst);
  }
}

// Déplacement d'une entrée : renommage, puis copie de repli si le renommage
// échoue (autre volume, permission). Dans le repli, la source est conservée.
function moveEntry(src, dst) {
  try {
    fs.renameSync(src, dst);
    return true;
  } catch {
    fs.cpSync(src, dst, { recursive: true, errorOnExist: true, force: false });
    return false;
  }
}

// Fusion non destructive de `src` dans `dst`, entrée par entrée, dans l'ordre
// alphabétique pour rester prévisible. Les liens symboliques ne sont jamais
// suivis ni déplacés ; une collision de nom garde la version de la cible.
function mergeInto(src, dst) {
  for (const [oldName, newName] of [[OLD_STATE, NEW_STATE], [OLD_STATE + '.bak', NEW_STATE + '.bak']]) {
    const from = path.join(src, oldName);
    const to = path.join(dst, newName);
    const st = realEntry(from);
    if (!st || !st.isFile()) continue;
    if (fs.existsSync(to)) continue;
    fs.renameSync(from, to);
  }
  let names = [];
  try { names = fs.readdirSync(src); } catch { return; }
  for (const name of names.sort()) {
    const from = path.join(src, name);
    const to = path.join(dst, name);
    const st = realEntry(from);
    if (!st) continue; // lien symbolique : jamais suivi
    const existing = realEntry(to);
    if (!existing) {
      moveEntry(from, to);
      continue;
    }
    if (st.isDirectory() && existing.isDirectory()) mergeInto(from, to);
    // Fichier/dossier en collision : la cible reste, la source reste aussi.
  }
  try {
    if (fs.readdirSync(src).length === 0) fs.rmdirSync(src);
  } catch {}
}

// Les noms de partition Chromium portent l'ancien nom : persist:orbe,
// persist:orbe-<profil>. Les cookies suivent le renommage des dossiers.
function renamePartitions(dir) {
  const partitions = path.join(dir, 'Partitions');
  let names = [];
  try { names = fs.readdirSync(partitions); } catch { return; }
  for (const name of names) {
    if (name !== 'orbe' && !name.startsWith('orbe-')) continue;
    const src = path.join(partitions, name);
    const st = realEntry(src);
    if (!st || !st.isDirectory()) continue;
    const dst = path.join(partitions, 'orbx' + name.slice('orbe'.length));
    if (fs.existsSync(dst)) continue;
    try { fs.renameSync(src, dst); } catch {}
  }
}

// Réécriture JSON : adresses internes orbe://app/ → orbx://app/ et chemins
// absolus de l'ancien profil → nouveau. Les clés d'objet sont traitées comme
// les valeurs. Un fichier invalide reste octet pour octet ; toute erreur est
// journalisée et n'interrompt pas la migration.
function rewriteJson(file, oldDir, userData, log) {
  const st = realEntry(file);
  if (!st || !st.isFile()) return;
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    log('[orbx] migration du profil : JSON illisible, fichier laissé tel quel', file, err.message);
    return;
  }
  let changed = false;
  const convert = (value) => {
    if (typeof value !== 'string') return value;
    if (value.startsWith(OLD_INTERNAL)) {
      changed = true;
      return NEW_INTERNAL + value.slice(OLD_INTERNAL.length);
    }
    if (value === oldDir || value.startsWith(oldDir + path.sep)) {
      changed = true;
      return userData + value.slice(oldDir.length);
    }
    return value;
  };
  const walk = (value) => {
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === 'object') {
      const out = {};
      for (const [key, item] of Object.entries(value)) out[convert(key)] = walk(item);
      return out;
    }
    return convert(value);
  };
  try {
    const next = walk(data);
    if (!changed) return;
    const mode = (st.mode & 0o777) || 0o600;
    const tmp = `${file}.tmp-${process.pid}`;
    const fd = fs.openSync(tmp, 'w', mode);
    try {
      fs.fchmodSync(fd, mode);
      fs.writeSync(fd, JSON.stringify(next));
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(tmp, file);
  } catch (err) {
    log('[orbx] migration du profil : réécriture impossible', file, err.message);
  }
}

// Trousseau macOS : la clé safeStorage de l'ancien nom est recopiée une fois.
// Jamais de shell, jamais le secret dans un journal, jamais fatal. Le secret
// transite brièvement dans l'argv de `security` : risque résiduel assumé, faute
// de saisie stdin non interactive fiable.
function copyKeychain(execFile, log) {
  let secret;
  try {
    secret = execFile('/usr/bin/security', ['find-generic-password', '-s', KEY_OLD.service, '-a', KEY_OLD.account, '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 60000 });
  } catch (err) {
    log('[orbx] migration trousseau', String((err && err.message) || err));
    return;
  }
  try {
    execFile('/usr/bin/security', ['find-generic-password', '-s', KEY_NEW.service, '-a', KEY_NEW.account], { stdio: 'ignore', timeout: 60000 });
    return; // la nouvelle clé existe : ne rien réécrire
  } catch {}
  try {
    execFile('/usr/bin/security', ['add-generic-password', '-s', KEY_NEW.service, '-a', KEY_NEW.account, '-w', String(secret).trim()], { stdio: 'ignore', timeout: 60000 });
  } catch (err) {
    log('[orbx] migration trousseau', String((err && err.message) || err));
  }
}

// Registre Windows : cinq suppressions fixes, best-effort, sans shell ni
// fichier .reg temporaire. L'inscription au nom actuel est recréée par le
// bouton « Définir Orbx par défaut ».
function cleanRegistry(execFile) {
  const regExe = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'reg.exe');
  const run = (args) => {
    try { execFile(regExe, args, { stdio: 'ignore', timeout: 5000, windowsHide: true }); } catch {}
  };
  for (const key of REG_LEGACY) run(['delete', key, '/f']);
  run(['delete', 'HKCU\\Software\\RegisteredApplications', '/v', 'Orbe', '/f']);
  run(['delete', 'HKCU\\Software\\Classes\\.htm\\OpenWithProgids', '/v', 'OrbeHTML', '/f']);
  run(['delete', 'HKCU\\Software\\Classes\\.html\\OpenWithProgids', '/v', 'OrbeHTML', '/f']);
}

function migrate(options = {}) {
  const { appData, userData } = options;
  const platform = options.platform || process.platform;
  const execFile = options.execFile || execFileSync;
  const log = options.log || console.error;
  try {
    // La migration n'écrit que dans appData/Orbx : jamais dans un dossier choisi
    // par un appelant (ORBX_USER_DATA, essai de fumée).
    if (!appData || !userData) return { migrated: false, reason: 'custom-path' };
    const expected = path.join(appData, NEW_DIR);
    if (path.resolve(userData) !== path.resolve(expected)) return { migrated: false, reason: 'custom-path' };

    const oldDir = path.join(appData, OLD_DIR);
    let oldLstat = null;
    try {
      oldLstat = fs.lstatSync(oldDir);
    } catch {
      // Déjà migré : l'ancien dossier a disparu, mais le nouveau porte un vrai
      // profil (c'était le but de la migration). Les démarrages suivants doivent
      // le voir et ne plus rien toucher.
      const newStat = realEntry(userData);
      if (newStat && newStat.isDirectory() && hasProfileData(userData)) {
        log('[orbx] migration du profil : profil Orbx déjà présent, rien à faire');
        return { migrated: false, reason: 'exists' };
      }
      return { migrated: false, reason: 'absent' };
    }
    if (oldLstat.isSymbolicLink() || !oldLstat.isDirectory()) {
      log('[orbx] migration du profil : ancien dossier refusé (lien symbolique ou non-dossier)');
      return { migrated: false, reason: 'refused' };
    }

    let reason;
    let newLstat = null;
    try { newLstat = fs.lstatSync(userData); } catch (err) {
      if (!err || err.code !== 'ENOENT') throw err;
    }
    if (!newLstat) {
      try {
        fs.renameSync(oldDir, userData);
        reason = 'moved';
      } catch {
        const tmp = userData + '.migration-tmp';
        if (fs.existsSync(tmp)) {
          log('[orbx] migration du profil : refusée, dossier temporaire déjà présent');
          return { migrated: false, reason: 'refused' };
        }
        fs.cpSync(oldDir, tmp, { recursive: true, errorOnExist: true, force: false });
        fs.renameSync(tmp, userData);
        reason = 'copy-moved';
      }
    } else if (newLstat.isSymbolicLink() || !newLstat.isDirectory()) {
      log('[orbx] migration du profil : cible refusée (lien symbolique ou non-dossier)');
      return { migrated: false, reason: 'refused' };
    } else if (hasProfileData(userData)) {
      log('[orbx] migration du profil : un profil Orbx existe déjà, rien à faire');
      return { migrated: false, reason: 'exists' };
    } else {
      mergeInto(oldDir, userData);
      reason = 'merged';
    }

    // Renommage de l'état, réécriture des adresses et chemins, partitions.
    renameState(userData);
    for (const name of [NEW_STATE, NEW_STATE + '.bak', 'history.json', 'history.json.bak']) {
      rewriteJson(path.join(userData, name), oldDir, userData, log);
    }
    renamePartitions(userData);

    if (platform === 'darwin') copyKeychain(execFile, log);
    if (platform === 'win32') cleanRegistry(execFile);

    return { migrated: true, reason };
  } catch (err) {
    log('[orbx] migration du profil', String((err && err.message) || err));
    return { migrated: false, reason: 'error' };
  }
}

module.exports = {
  migrate,
  internals: { OLD_DIR, NEW_DIR, OLD_STATE, NEW_STATE, OLD_INTERNAL, NEW_INTERNAL, KEY_OLD, KEY_NEW, REG_LEGACY, PROFILE_MARKERS },
};
