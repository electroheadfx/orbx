// Scénario Windows : inscription d'Orbx comme navigateur, puis retrait.
//   ORBX_SCENARIO=tests/win-default.js ORBX_USER_DATA=<dossier> Orbx.exe --selftest --orbx-test
// Passe par les vraies commandes (« Définir Orbx par défaut », puis
// « Retirer Orbx des navigateurs de Windows ») et relit le registre avec
// « reg query ». L'ouverture des Paramètres de Windows est interceptée.
// ORBX_WIN_DEFAULT_STEP=register ou unregister : une seule moitié, pour que
// l'intégration continue relise le registre entre les deux.
// À ne lancer que sur une machine d'essai : l'inscription réelle d'Orbx est retirée.
const path = require('path');

module.exports = async function winDefault({ commands }) {
  const { app, shell } = require('electron');
  if (process.platform !== 'win32') throw new Error('Scénario réservé à Windows.');
  const wd = require(path.join(app.getAppPath(), 'src', 'main', 'win-default.js'));
  const step = process.env.ORBX_WIN_DEFAULT_STEP || 'cycle';
  let n = 0;
  const ok = (cond, label) => { if (!cond) throw new Error('Échec : ' + label); n++; console.log('  ✓ ' + label); };
  const exists = (key, value) => wd.reg(['query', key, ...(value === undefined ? [] : value === '' ? ['/ve'] : ['/v', value])]).then(() => true, () => false);
  // « reg query » rend « nom    TYPE    donnée » ; seule la donnée est comparée.
  const read = async (key, name) => {
    const out = await wd.reg(['query', key, ...(name === '' ? ['/ve'] : ['/v', name])]);
    const m = /\s(REG_[A-Z_]+)(?: {4}(.*))?\r?$/m.exec(out);
    if (!m) throw new Error('Valeur illisible : ' + out);
    return m[1] === 'REG_DWORD' ? parseInt(m[2], 16) : (m[2] || '');
  };

  // « reg query » écrit dans le jeu de caractères de la console : les lettres
  // accentuées et les tirets longs n'y survivent pas, on compare sans eux
  // (l'intégration continue relit le texte exact avec PowerShell).
  const plain = (v) => (typeof v === 'string' ? v.replace(/[^\x20-\x7e]|[?-]/g, '') : v);

  const exe = process.execPath;
  const plan = wd.plan({ exe, args: app.isPackaged ? [] : [app.getAppPath()] });
  const opened = [];
  shell.openExternal = async (url) => { opened.push(url); };

  if (step !== 'unregister') {
    // Le lancement seul n'écrit rien : il faut le clic.
    if (process.env.CI) ok(!(await wd.registered()) && !(await exists(plan.roots[0])) && !(await exists(plan.roots[1])), 'au démarrage, rien n’est inscrit dans le registre');
    await commands.makeDefault();
    ok(opened.length === 1 && opened[0].startsWith('ms-settings:defaultapps'), 'les Paramètres de Windows sont ouverts (' + opened[0] + ')');
    let values = 0;
    for (const k of plan.keys) for (const [name, value] of Object.entries(k.values)) {
      const got = await read(k.key, name);
      if (plain(got) !== plain(value)) throw new Error(`Échec : ${k.key} [${name || 'défaut'}] = ${got}, attendu ${value}`);
      values++;
    }
    ok(true, `${plan.keys.length} clés et ${values} valeurs écrites sous HKCU, relues à l’identique`);
    for (const v of plan.values) ok((await read(v.key, v.name)) === v.value, `${v.key.replace('HKEY_CURRENT_USER', 'HKCU')} : ${v.name}`);
    ok((await read(plan.roots[0] + '\\shell\\open\\command', '')) === `"${exe}"${app.isPackaged ? '' : ` "${app.getAppPath()}"`} "%1"`, 'la commande d’ouverture désigne cet exécutable : ' + exe);
    ok(await wd.registered(), 'Orbx figure dans RegisteredApplications, avec ses capacités http et https');
    // Refaire l'inscription ne casse rien (dossier déplacé, second clic).
    await commands.makeDefault();
    ok(await wd.registered(), 'un second clic laisse l’inscription en place');
  }

  if (step !== 'register') {
    const undo = commands.byName.get('undoDefaultBrowser');
    ok(!!undo, 'la commande « Retirer Orbx des navigateurs de Windows » existe');
    const shared = 'HKEY_CURRENT_USER\\Software\\RegisteredApplications';
    await wd.reg(['add', shared, '/v', 'OrbxTemoin', '/d', 'temoin', '/f']);
    await undo.run(null);
    for (const root of plan.roots) ok(!(await exists(root)), 'clé retirée : ' + root.replace('HKEY_CURRENT_USER', 'HKCU'));
    for (const v of plan.values) ok(!(await exists(v.key, v.name)), `valeur retirée : ${v.key.replace('HKEY_CURRENT_USER', 'HKCU')} [${v.name}]`);
    ok(!(await wd.registered()), 'Orbx ne figure plus dans RegisteredApplications');
    // Les clés partagées, elles, restent : seule la valeur d'Orbx est partie.
    ok(await exists(shared, 'OrbxTemoin'), 'les autres inscriptions de RegisteredApplications sont intactes');
    await wd.reg(['delete', shared, '/v', 'OrbxTemoin', '/f']);
    await undo.run(null);
    ok(!(await wd.registered()), 'retirer deux fois ne fait pas d’erreur');
  }
  console.log(`Navigateur par défaut (Windows), étape « ${step} » : ${n} vérifications réussies`);
};
