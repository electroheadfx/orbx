// Icône choisie par l'utilisateur pour un Espace, un dossier ou un onglet : un
// seul émoji, ou une icône Lucide encodée « lucide:<nom> ». Le texte vient d'une
// vue de l'interface ; il est vérifié ici avant d'être enregistré, puis affiché
// comme du texte ou du SVG (jamais comme du HTML).
const MAX = 32; // un émoji composé (famille, drapeau de région) tient largement

const LUCIDE_PREFIX = 'lucide:';
const LUCIDE_NAME = /^[a-z0-9-]+$/;

const PART = String.raw`(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|[#*0-9]️?⃣)`;
// Construits au premier émoji vérifié, pas au lancement : les tables Unicode qu'ils
// chargent coûtaient 7 ms avant la fenêtre (DEM-10), pour un geste rare.
let EMOJI = null;
let segmenter = null;
function tools() {
  if (!EMOJI) {
    EMOJI = new RegExp(`^${PART}(?:[\\u200D\\uFE0F\\u{1F3FB}-\\u{1F3FF}\\u{E0020}-\\u{E007F}]|${PART})*$`, 'u');
    segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  }
}

// Jeu Lucide chargé au premier contrôle de ce type, pas au lancement : le module
// de données n'est lu que si une icône Lucide est effectivement validée.
let lucideNames = null;
function lucide() {
  if (!lucideNames) lucideNames = require('../renderer/lucide.js').LUCIDE_NAMES;
  return lucideNames;
}

// Un émoji, et rien d'autre : ni lettre, ni espace, ni deux émojis à la suite.
// Une icône Lucide est un nom en minuscules, connu du jeu vendorisé ; la liste
// blanche borne sa longueur, MAX ne s'y applique donc pas.
function valid(text) {
  if (typeof text !== 'string' || !text) return false;
  if (text.startsWith(LUCIDE_PREFIX)) {
    const name = text.slice(LUCIDE_PREFIX.length);
    return LUCIDE_NAME.test(name) && lucide().has(name);
  }
  if (text.length > MAX) return false;
  tools();
  if (!EMOJI.test(text)) return false;
  let n = 0;
  for (const _ of segmenter.segment(text)) { n += 1; if (n > 1) return false; } // eslint-disable-line no-unused-vars
  return true;
}

// Ce qui est enregistré : l'émoji ou l'icône Lucide, ou '' (icône par défaut) ;
// null si le texte est refusé.
function clean(text) {
  if (text === '' || text == null) return '';
  return valid(text) ? text : null;
}

function isLucide(value) {
  return typeof value === 'string' && value.startsWith(LUCIDE_PREFIX);
}

// Libellé texte d'un Espace dans les menus, la palette et les listes : l'icône
// et un espace avant le nom, sauf pour une icône Lucide ou absente (nom seul).
function label(icon, name, gap = ' ') {
  return typeof icon === 'string' && icon && !isLucide(icon) ? icon + gap + name : String(name);
}

module.exports = { valid, clean, label, isLucide, LUCIDE_PREFIX, MAX, get loaded() { return !!EMOJI; } };
