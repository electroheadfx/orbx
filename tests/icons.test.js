// Contrat d'icône : émojis comme avant, plus les icônes Lucide vendorisées.
// Vérifie la liste blanche, le libellé, le chargement paresseux, la recherche
// et la sûreté des corps SVG du jeu.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const icons = require('../src/main/icons');
const lucide = require('../src/renderer/lucide');

const ICONS = require.resolve('../src/main/icons');
const LUCIDE = require.resolve('../src/renderer/lucide');
const SOURCE = fs.readFileSync(LUCIDE, 'utf8');
const SAFE_TAGS = ['path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'g'];

test('jeu Lucide : noms uniques et conformes, corps non vides, tous acceptés', () => {
  assert.ok(lucide.LUCIDE_LIST.length >= 76 && lucide.LUCIDE_LIST.length <= 90, `taille ${lucide.LUCIDE_LIST.length}`);
  const seen = new Set();
  for (const { name, body } of lucide.LUCIDE_LIST) {
    assert.match(name, /^[a-z0-9-]+$/, name);
    assert.ok(!seen.has(name), `nom en double : ${name}`);
    seen.add(name);
    assert.ok(body.trim().length > 0, `corps vide : ${name}`);
    assert.equal(icons.valid('lucide:' + name), true, name);
  }
  assert.equal(lucide.LUCIDE_NAMES.size, lucide.LUCIDE_LIST.length);
  assert.equal(lucide.LUCIDE_BY_NAME.size, lucide.LUCIDE_LIST.length);
});

test('validation : noms Lucide inconnus, vides ou mal formés refusés', () => {
  for (const bad of ['lucide:inconnue', 'lucide:', 'lucide:Home', 'lucide:home ', 'lucide:home/x', 'lucide:home-x_y', 'lucide:home\n']) {
    assert.equal(icons.valid(bad), false, JSON.stringify(bad));
  }
  assert.equal(icons.valid({}), false);
  assert.equal(icons.valid(null), false);
  assert.equal(icons.valid(undefined), false);
});

test('émojis : le comportement existant ne change pas', () => {
  for (const ok of ['🏠', '👍🏽', '👨‍👩‍👧', '🇫🇷', '❤️']) assert.equal(icons.valid(ok), true, ok);
  for (const bad of ['ab', '<b>', '🏠 ', '🏠🏠', 'x'.repeat(33)]) assert.equal(icons.valid(bad), false, JSON.stringify(bad));
});

test('clean : même valeur pour un Lucide connu, vide pour la chaîne vide, null pour un refus', () => {
  assert.equal(icons.clean('lucide:home'), 'lucide:home');
  assert.equal(icons.clean('🏠'), '🏠');
  assert.equal(icons.clean(''), '');
  assert.equal(icons.clean(null), '');
  assert.equal(icons.clean(undefined), '');
  assert.equal(icons.clean('lucide:inconnue'), null);
  assert.equal(icons.clean('ab'), null);
});

test('label : nom seul pour un Lucide ou une icône absente, icône et nom sinon', () => {
  assert.equal(icons.label('lucide:home', 'Maison'), 'Maison');
  assert.equal(icons.label('', 'Maison'), 'Maison');
  assert.equal(icons.label(null, 'Maison'), 'Maison');
  assert.equal(icons.label(undefined, 'Maison'), 'Maison');
  assert.equal(icons.label('🏠', 'Maison'), '🏠 Maison');
  assert.equal(icons.label('🏠', 'Maison', '  '), '🏠  Maison');
  assert.equal(icons.label('x', 'y'), 'x y');
  assert.equal(icons.label('lucide:home', 'Maison', '  '), 'Maison');
});

test('isLucide : préfixe seul, sur une chaîne', () => {
  assert.equal(icons.isLucide('lucide:home'), true);
  assert.equal(icons.isLucide('lucide:inconnue'), true);
  assert.equal(icons.isLucide('🏠'), false);
  assert.equal(icons.isLucide(''), false);
  assert.equal(icons.isLucide(null), false);
  assert.equal(icons.isLucide(42), false);
});

test('chargement paresseux : un émoji ne lit pas le jeu Lucide, un Lucide ne construit pas les tables d’émojis', () => {
  const keptIcons = require.cache[ICONS];
  const keptLucide = require.cache[LUCIDE];
  try {
    delete require.cache[ICONS];
    delete require.cache[LUCIDE];
    let fresh = require(ICONS);
    assert.equal(fresh.loaded, false);
    assert.equal(fresh.valid('🏠'), true);
    assert.equal(fresh.loaded, true);
    assert.equal(require.cache[LUCIDE], undefined, 'le jeu Lucide est lu pour un émoji');

    delete require.cache[ICONS];
    delete require.cache[LUCIDE];
    fresh = require(ICONS);
    assert.equal(fresh.valid('lucide:home'), true);
    assert.equal(fresh.loaded, false, 'les tables d’émojis sont construites pour un Lucide');
    assert.ok(require.cache[LUCIDE], 'le jeu Lucide n’est pas lu au premier contrôle Lucide');
  } finally {
    if (keptIcons) require.cache[ICONS] = keptIcons; else delete require.cache[ICONS];
    if (keptLucide) require.cache[LUCIDE] = keptLucide; else delete require.cache[LUCIDE];
  }
});

test('recherche : français et anglais, accents repliés, requête vide = tout', () => {
  assert.ok(lucide.lucideSearch('maison').some((x) => x.name === 'home'));
  assert.deepEqual(lucide.lucideSearch('etoile').map((x) => x.name), ['star']);
  assert.ok(lucide.lucideSearch('message').some((x) => x.name === 'message-circle'));
  assert.ok(lucide.lucideSearch('travel').some((x) => x.name === 'plane'));
  assert.deepEqual(lucide.lucideSearch('zzzzqq'), []);
  assert.equal(lucide.lucideSearch('').length, lucide.LUCIDE_LIST.length);
  assert.equal(lucide.lucideSearch(undefined).length, lucide.LUCIDE_LIST.length);
});

test('corps vendorisés : aucun élément actif, aucun attribut de navigation', () => {
  for (const { name, body } of lucide.LUCIDE_LIST) {
    assert.doesNotMatch(body, /<script/i, name);
    assert.doesNotMatch(body, /\son[a-z]+\s*=/i, name);
    assert.doesNotMatch(body, /javascript:/i, name);
    assert.doesNotMatch(body, /\b(?:href|src)=/i, name);
    assert.doesNotMatch(body, /[`|]/, name);
    for (const tag of body.matchAll(/<\/?([a-zA-Z0-9-]+)/g)) {
      assert.ok(SAFE_TAGS.includes(tag[1]), `élément inattendu ${tag[1]} dans ${name}`);
    }
  }
});

test('en-tête : licence ISC, mention MIT/Feather et version épinglée de lucide-static', () => {
  assert.match(SOURCE, /lucide-static@\d+\.\d+\.\d+/);
  assert.match(SOURCE, /ISC License/);
  assert.match(SOURCE, /MIT License/);
  assert.match(SOURCE, /Feather/);
});
