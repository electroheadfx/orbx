// Migration unique du profil Orbe vers Orbx (src/main/migrate-profile.js).
// Aucun import Electron : le module est du Node pur. Chaque appel passe un
// execFile factice et une platform explicite : même sur ce Mac, aucun cas ne
// doit toucher le vrai trousseau ni le vrai registre Windows.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { migrate, internals } = require('../src/main/migrate-profile');

const roots = [];
function root() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbx-migration-'));
  roots.push(dir);
  return dir;
}
after(() => {
  for (const dir of roots) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
});

function mkdir(p) { fs.mkdirSync(p, { recursive: true }); }
function write(p, data, mode) {
  mkdir(path.dirname(p));
  fs.writeFileSync(p, data);
  if (mode) fs.chmodSync(p, mode);
}
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
function exists(p) { try { fs.lstatSync(p); return true; } catch { return false; } }
function isDir(p) { try { return fs.lstatSync(p).isDirectory(); } catch { return false; } }

// Une photo complète d'un arbre : type, contenu et, pour les liens, leur cible.
function snapshot(dir) {
  const out = new Map();
  (function walk(d, rel) {
    for (const name of fs.readdirSync(d).sort()) {
      const full = path.join(d, name);
      const r = rel ? `${rel}/${name}` : name;
      const st = fs.lstatSync(full);
      if (st.isSymbolicLink()) out.set(r, `link:${fs.readlinkSync(full)}`);
      else if (st.isDirectory()) { out.set(r, 'dir'); walk(full, r); }
      else out.set(r, `file:${fs.readFileSync(full).toString('base64')}:${(st.mode & 0o777).toString(8)}`);
    }
  })(dir, '');
  return out;
}

// execFile factice : note chaque appel, répond selon le scénario fourni.
function spyExec(answers = {}) {
  const calls = [];
  const fn = (file, args, opts) => {
    calls.push({ file, args: args.slice(), opts });
    const key = args.join(' ');
    const answer = answers[key];
    if (answer instanceof Error) throw answer;
    if (typeof answer === 'function') return answer(args, opts);
    return answer === undefined ? '' : answer;
  };
  return { calls, execFile: fn, byKey: (key) => calls.find((c) => c.args.join(' ') === key) };
}

// Un profil Orbe minimal mais complet, sous appData/Orbe.
function seedOldProfile(appData) {
  const oldDir = path.join(appData, 'Orbe');
  write(path.join(oldDir, 'orbe.json'), JSON.stringify({
    'orbe://app/welcome.html': 'page interne',
    tabs: [{ url: 'orbe://app/library.html', favicon: 'https://exemple.test/i.png' }],
    downloads: [{ name: 'a.pdf', path: path.join(oldDir, 'Telechargements', 'a.pdf') }],
    nested: { 'orbe://app/notes.html': { deeper: ['orbe://app/shortcuts.html', 'orbe://app/easel.html'] } },
    plain: 'corbeille reste intacte',
  }));
  write(path.join(oldDir, 'orbe.json.bak'), JSON.stringify({ tab: 'orbe://app/easel.html' }));
  write(path.join(oldDir, 'history.json'), JSON.stringify({ 'orbe://app/welcome.html': { at: 1 } }));
  write(path.join(oldDir, 'history.json.bak'), JSON.stringify({ entries: ['orbe://app/notes.html'] }));
  write(path.join(oldDir, 'Cookies'), 'cookies');
  write(path.join(oldDir, 'Local Storage', 'leveldb', '000001.log'), 'ls');
  write(path.join(oldDir, 'Partitions', 'orbe', 'Cookies'), 'default');
  write(path.join(oldDir, 'Partitions', 'orbe-abc', 'Cookies'), 'profil');
  write(path.join(oldDir, 'Partitions', 'orbe-xyz', 'Network', 'Cookies'), 'autre');
  write(path.join(oldDir, 'Telechargements', 'a.pdf'), 'pdf');
  return oldDir;
}

test('déplacement direct : dossier Orbe → Orbx, état et partitions renommés', () => {
  const appData = root();
  const userData = path.join(appData, 'Orbx');
  const oldDir = seedOldProfile(appData);

  const r = migrate({ appData, userData, platform: 'linux', execFile: spyExec().execFile });
  assert.deepEqual(r, { migrated: true, reason: 'moved' });
  assert.equal(fs.existsSync(path.join(oldDir, 'orbe.json')), false);
  assert.equal(exists(oldDir), false);
  assert.equal(exists(path.join(userData, 'orbx.json')), true);
  assert.equal(exists(path.join(userData, 'orbx.json.bak')), true);
  assert.equal(exists(path.join(userData, 'orbe.json')), false);

  const state = readJson(path.join(userData, 'orbx.json'));
  assert.equal(state.tabs[0].url, 'orbx://app/library.html');
  assert.equal(state.tabs[0].favicon, 'https://exemple.test/i.png');
  assert.equal(state['orbx://app/welcome.html'], 'page interne');
  assert.equal(state.nested['orbx://app/notes.html'].deeper[0], 'orbx://app/shortcuts.html');
  assert.equal(state.nested['orbx://app/notes.html'].deeper[1], 'orbx://app/easel.html');
  assert.equal(state.downloads[0].path, path.join(userData, 'Telechargements', 'a.pdf'));
  assert.equal(state.plain, 'corbeille reste intacte');

  assert.deepEqual(readJson(path.join(userData, 'orbx.json.bak')), { tab: 'orbx://app/easel.html' });
  assert.deepEqual(readJson(path.join(userData, 'history.json')), { 'orbx://app/welcome.html': { at: 1 } });
  assert.deepEqual(readJson(path.join(userData, 'history.json.bak')), { entries: ['orbx://app/notes.html'] });

  assert.equal(exists(path.join(userData, 'Partitions', 'orbx')), true);
  assert.equal(exists(path.join(userData, 'Partitions', 'orbx-abc')), true);
  assert.equal(exists(path.join(userData, 'Partitions', 'orbx-xyz', 'Network')), true);
  assert.equal(exists(path.join(userData, 'Partitions', 'orbe')), false);
  assert.equal(exists(path.join(userData, 'Partitions', 'orbe-abc')), false);
  assert.equal(exists(path.join(userData, 'Partitions', 'orbe-xyz')), false);
});

test('le mode du fichier réécrit est conservé', () => {
  const appData = root();
  const userData = path.join(appData, 'Orbx');
  const oldDir = seedOldProfile(appData);
  fs.chmodSync(path.join(oldDir, 'orbe.json'), 0o640);

  migrate({ appData, userData, platform: 'linux', execFile: spyExec().execFile });
  assert.equal(fs.statSync(path.join(userData, 'orbx.json')).mode & 0o777, 0o640);
});

test('cible pré-créée par Electron : fusion sans écraser, raison merged', () => {
  const appData = root();
  const userData = path.join(appData, 'Orbx');
  mkdir(path.join(userData, 'GPUPersistentCache', 'GPUCache'));
  write(path.join(userData, 'GPUPersistentCache', 'GPUCache', 'data_0'), 'gpu');
  const oldDir = seedOldProfile(appData);

  const r = migrate({ appData, userData, platform: 'linux', execFile: spyExec().execFile });
  assert.deepEqual(r, { migrated: true, reason: 'merged' });
  assert.equal(fs.readFileSync(path.join(userData, 'GPUPersistentCache', 'GPUCache', 'data_0'), 'utf8'), 'gpu');
  assert.equal(exists(path.join(userData, 'orbx.json')), true);
  assert.equal(exists(path.join(userData, 'orbe.json')), false);
  assert.equal(exists(path.join(userData, 'Telechargements', 'a.pdf')), true);
  assert.equal(exists(path.join(userData, 'Partitions', 'orbx')), true);
  assert.equal(exists(path.join(userData, 'Partitions', 'orbx-abc')), true);
  assert.equal(readJson(path.join(userData, 'orbx.json')).tabs[0].url, 'orbx://app/library.html');
  // Tout a été déplacé : l'ancien dossier, vide, est retiré.
  assert.equal(exists(oldDir), false);
});

test('collision pendant la fusion : la cible gagne, l’ancien reste dans Orbe', () => {
  const appData = root();
  const userData = path.join(appData, 'Orbx');
  mkdir(path.join(userData, 'GPUPersistentCache'));
  write(path.join(userData, 'notes.txt'), 'version cible');
  mkdir(path.join(userData, 'Dossier'));
  write(path.join(userData, 'Dossier', 'garde.txt'), 'cible');
  const oldDir = seedOldProfile(appData);
  write(path.join(oldDir, 'notes.txt'), 'version ancienne');
  write(path.join(oldDir, 'Dossier', 'garde.txt'), 'ancienne');
  write(path.join(oldDir, 'Dossier', 'nouveau.txt'), 'ancienne');

  const r = migrate({ appData, userData, platform: 'linux', execFile: spyExec().execFile });
  assert.equal(r.reason, 'merged');
  assert.equal(fs.readFileSync(path.join(userData, 'notes.txt'), 'utf8'), 'version cible');
  assert.equal(fs.readFileSync(path.join(userData, 'Dossier', 'garde.txt'), 'utf8'), 'cible');
  assert.equal(fs.readFileSync(path.join(userData, 'Dossier', 'nouveau.txt'), 'utf8'), 'ancienne');
  // Les collisions laissent des entrées dans l'ancien dossier : il est conservé.
  assert.equal(fs.readFileSync(path.join(oldDir, 'notes.txt'), 'utf8'), 'version ancienne');
  assert.equal(fs.readFileSync(path.join(oldDir, 'Dossier', 'garde.txt'), 'utf8'), 'ancienne');
  assert.equal(exists(path.join(oldDir, 'Dossier', 'nouveau.txt')), false);
});

test('idempotence : un second appel ne touche plus rien', () => {
  const appData = root();
  const userData = path.join(appData, 'Orbx');
  seedOldProfile(appData);
  migrate({ appData, userData, platform: 'linux', execFile: spyExec().execFile });
  const before = snapshot(userData);

  const r = migrate({ appData, userData, platform: 'linux', execFile: spyExec().execFile });
  assert.deepEqual(r, { migrated: false, reason: 'exists' });
  assert.deepEqual(snapshot(userData), before);
});

test('profil Orbx déjà présent : ancien et nouveau restent strictement intacts', () => {
  const appData = root();
  const userData = path.join(appData, 'Orbx');
  const oldDir = seedOldProfile(appData);
  write(path.join(userData, 'orbx.json'), '{"marque":"nouveau"}');
  write(path.join(userData, 'Cookies'), 'nouveaux cookies');
  const beforeOld = snapshot(oldDir);
  const beforeNew = snapshot(userData);

  const r = migrate({ appData, userData, platform: 'linux', execFile: spyExec().execFile });
  assert.deepEqual(r, { migrated: false, reason: 'exists' });
  assert.deepEqual(snapshot(oldDir), beforeOld);
  assert.deepEqual(snapshot(userData), beforeNew);
});

test('profil ancien absent : raison absent, aucune écriture', () => {
  const appData = root();
  const userData = path.join(appData, 'Orbx');
  const r = migrate({ appData, userData, platform: 'linux', execFile: spyExec().execFile });
  assert.deepEqual(r, { migrated: false, reason: 'absent' });
  assert.equal(exists(userData), false);
});

test('ancien chemin symlink ou non-dossier : refusé sans écriture', () => {
  for (const kind of ['symlink', 'file']) {
    const appData = root();
    const userData = path.join(appData, 'Orbx');
    const real = path.join(appData, 'ailleurs');
    mkdir(real);
    write(path.join(real, 'orbe.json'), '{}');
    const oldDir = path.join(appData, 'Orbe');
    if (kind === 'symlink') fs.symlinkSync(real, oldDir);
    else fs.writeFileSync(oldDir, 'fichier');
    const logs = [];
    const r = migrate({ appData, userData, platform: 'linux', execFile: spyExec().execFile, log: (...a) => logs.push(a.join(' ')) });
    assert.deepEqual(r, { migrated: false, reason: 'refused' });
    assert.equal(exists(userData), false);
    assert.equal(exists(oldDir), true);
    assert.deepEqual(fs.readdirSync(real), ['orbe.json']);
    assert.ok(logs.length > 0, 'le refus est journalisé');
  }
});

test('symlink rencontré pendant la fusion : jamais suivi, laissé en place', () => {
  const appData = root();
  const userData = path.join(appData, 'Orbx');
  mkdir(path.join(userData, 'GPUPersistentCache'));
  const outside = path.join(appData, 'secret');
  write(path.join(outside, 'fichier.txt'), 'secret');
  const oldDir = seedOldProfile(appData);
  fs.symlinkSync(outside, path.join(oldDir, 'lien'));

  const r = migrate({ appData, userData, platform: 'linux', execFile: spyExec().execFile });
  assert.equal(r.reason, 'merged');
  assert.equal(exists(path.join(userData, 'lien')), false);
  const st = fs.lstatSync(path.join(oldDir, 'lien'));
  assert.equal(st.isSymbolicLink(), true);
});

test('JSON invalide : fichier laissé octet pour octet, le reste migre', () => {
  const appData = root();
  const userData = path.join(appData, 'Orbx');
  const oldDir = path.join(appData, 'Orbe');
  const bytes = '{"abime": tru';
  write(path.join(oldDir, 'orbe.json'), bytes);
  write(path.join(oldDir, 'history.json'), '{"a":"orbe://app/welcome.html"}');
  const bad = path.join(userData, 'orbx.json');
  const logs = [];

  const r = migrate({ appData, userData, platform: 'linux', execFile: spyExec().execFile, log: (...a) => logs.push(a.join(' ')) });
  assert.equal(r.reason, 'moved');
  assert.equal(fs.readFileSync(bad, 'utf8'), bytes);
  assert.equal(fs.readFileSync(path.join(userData, 'history.json'), 'utf8'), '{"a":"orbx://app/welcome.html"}');
  assert.ok(logs.some((l) => l.includes('migration du profil')));
});

test('fichier d’état symlinké : jamais réécrit', () => {
  const appData = root();
  const userData = path.join(appData, 'Orbx');
  mkdir(path.join(userData, 'GPUPersistentCache'));
  const outside = path.join(appData, 'externe.json');
  const external = '{"lien":"orbe://app/welcome.html"}';
  write(outside, external);
  fs.symlinkSync(outside, path.join(userData, 'orbx.json'));
  seedOldProfile(appData);
  // La cible contient un marqueur de profil (symlink) : hasProfileData l'ignore,
  // et la réécriture doit l'ignorer aussi.
  const r = migrate({ appData, userData, platform: 'linux', execFile: spyExec().execFile });
  assert.equal(r.reason, 'merged');
  assert.equal(fs.readFileSync(outside, 'utf8'), external);
  assert.equal(fs.lstatSync(path.join(userData, 'orbx.json')).isSymbolicLink(), true);
});

test('userData hors de appData/Orbx : custom-path, aucune écriture', () => {
  const appData = root();
  const oldDir = seedOldProfile(appData);
  const before = snapshot(oldDir);
  for (const userData of [path.join(appData, 'Ailleurs'), path.join(root(), 'Orbx')]) {
    const r = migrate({ appData, userData, platform: 'linux', execFile: spyExec().execFile });
    assert.deepEqual(r, { migrated: false, reason: 'custom-path' });
  }
  assert.deepEqual(snapshot(oldDir), before);
  assert.equal(exists(path.join(appData, 'Ailleurs')), false);
});

test('trousseau macOS : find puis add seulement si l’ancien existe et le nouveau non', () => {
  const appData = root();
  const userData = path.join(appData, 'Orbx');
  seedOldProfile(appData);
  const spy = spyExec({
    'find-generic-password -s Orbe Safe Storage -a Orbe Key -w': ' s3cret \n',
    'find-generic-password -s Orbx Safe Storage -a Orbx Key': new Error('introuvable'),
    'add-generic-password -s Orbx Safe Storage -a Orbx Key -w s3cret': '',
  });
  const logs = [];

  const r = migrate({ appData, userData, platform: 'darwin', execFile: spy.execFile, log: (...a) => logs.push(a.join(' ')) });
  assert.equal(r.reason, 'moved');
  assert.equal(spy.calls.length, 3);
  assert.deepEqual(spy.calls[0].args, ['find-generic-password', '-s', 'Orbe Safe Storage', '-a', 'Orbe Key', '-w']);
  assert.deepEqual(spy.calls[1].args, ['find-generic-password', '-s', 'Orbx Safe Storage', '-a', 'Orbx Key']);
  assert.deepEqual(spy.calls[2].args, ['add-generic-password', '-s', 'Orbx Safe Storage', '-a', 'Orbx Key', '-w', 's3cret']);
  assert.equal(spy.calls[0].file, '/usr/bin/security');
  assert.equal(spy.calls[0].opts.timeout, 60000);
  assert.equal(spy.calls[2].opts.timeout, 60000);
  assert.ok(!logs.some((l) => l.includes('s3cret')), 'le secret ne doit jamais être journalisé');
});

test('trousseau macOS : rien à faire si la clé existe déjà ou si l’ancienne est absente', () => {
  // La nouvelle clé existe : ni lecture du secret, ni add.
  let appData = root();
  seedOldProfile(appData);
  let spy = spyExec({
    'find-generic-password -s Orbe Safe Storage -a Orbe Key -w': 'secret',
    'find-generic-password -s Orbx Safe Storage -a Orbx Key': '',
  });
  migrate({ appData, userData: path.join(appData, 'Orbx'), platform: 'darwin', execFile: spy.execFile });
  assert.equal(spy.calls.length, 2);
  assert.equal(spy.calls.some((c) => c.args[0] === 'add-generic-password'), false);

  // L'ancienne clé est absente : aucune tentative d'écriture.
  appData = root();
  seedOldProfile(appData);
  const logs = [];
  spy = spyExec({ 'find-generic-password -s Orbe Safe Storage -a Orbe Key -w': new Error('introuvable') });
  migrate({ appData, userData: path.join(appData, 'Orbx'), platform: 'darwin', execFile: spy.execFile, log: (...a) => logs.push(a.join(' ')) });
  assert.equal(spy.calls.length, 1);
  assert.equal(spy.calls.some((c) => c.args[0] === 'add-generic-password'), false);
  assert.ok(logs.some((l) => l.includes('[orbx] migration trousseau')));
});

test('trousseau macOS : un échec d’écriture reste non fatal et ne journalise pas le secret', () => {
  const appData = root();
  seedOldProfile(appData);
  const spy = spyExec({
    'find-generic-password -s Orbe Safe Storage -a Orbe Key -w': 'tres-secret',
    'find-generic-password -s Orbx Safe Storage -a Orbx Key': new Error('introuvable'),
    'add-generic-password -s Orbx Safe Storage -a Orbx Key -w tres-secret': new Error('trousseau verrouillé'),
  });
  const logs = [];
  const r = migrate({ appData, userData: path.join(appData, 'Orbx'), platform: 'darwin', execFile: spy.execFile, log: (...a) => logs.push(a.join(' ')) });
  assert.deepEqual(r, { migrated: true, reason: 'moved' });
  assert.ok(logs.some((l) => l.includes('trousseau verrouillé')));
  assert.ok(!logs.some((l) => l.includes('tres-secret')));
});

test('registre Windows : cinq suppressions fixes, rien si la migration n’a pas lieu', () => {
  const appData = root();
  seedOldProfile(appData);
  const spy = spyExec({});
  const r = migrate({ appData, userData: path.join(appData, 'Orbx'), platform: 'win32', execFile: spy.execFile });
  assert.equal(r.reason, 'moved');
  assert.equal(spy.calls.length, 5);
  for (const c of spy.calls) assert.match(c.file, /System32[\\/]reg\.exe$/);
  assert.deepEqual(spy.calls.map((c) => c.args), [
    ['delete', 'HKCU\\Software\\Classes\\OrbeHTML', '/f'],
    ['delete', 'HKCU\\Software\\Clients\\StartMenuInternet\\Orbe', '/f'],
    ['delete', 'HKCU\\Software\\RegisteredApplications', '/v', 'Orbe', '/f'],
    ['delete', 'HKCU\\Software\\Classes\\.htm\\OpenWithProgids', '/v', 'OrbeHTML', '/f'],
    ['delete', 'HKCU\\Software\\Classes\\.html\\OpenWithProgids', '/v', 'OrbeHTML', '/f'],
  ]);
  assert.equal(spy.calls[0].opts.timeout, 5000);

  // Profil Orbx déjà présent : la migration ne se fait pas, le registre non plus.
  const spy2 = spyExec({});
  const r2 = migrate({ appData, userData: path.join(appData, 'Orbx'), platform: 'win32', execFile: spy2.execFile });
  assert.deepEqual(r2, { migrated: false, reason: 'exists' });
  assert.equal(spy2.calls.length, 0);
});

test('aucune exception ne sort de migrate, même avec des entrées invalides', () => {
  for (const options of [{}, { appData: null, userData: null }, { appData: 42, userData: 43 }]) {
    assert.doesNotThrow(() => {
      const r = migrate(options);
      assert.equal(typeof r, 'object');
      assert.equal(r.migrated, false);
    });
  }
  const appData = root();
  assert.doesNotThrow(() => migrate({ appData, userData: path.join(appData, 'Orbx'), platform: 'linux', execFile: () => { throw new Error('boom'); } }));
});
