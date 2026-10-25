# Quick Task 261025-f9z: Add lucide icons as a choice for the space icon picker - Context

**Gathered:** 2026-10-25
**Status:** Ready for planning

<domain>
## Task Boundary

Add Lucide icons as a choice for the space icon picker.

The picker currently offers emoji only (`src/renderer/overlay.js`, `src/renderer/emojis.js`) and the stored icon is a single emoji string validated by `src/main/icons.js`. The change adds a curated set of Lucide SVG icons to the same picker.

</domain>

<decisions>
## Implementation Decisions

### Portée
- Espaces, dossiers et onglets : le sélecteur est déjà partagé par les trois, les icônes Lucide y sont proposées partout, sans logique conditionnelle.

### Jeu d'icônes
- Sélection curatée d'environ 80 icônes utiles pour des Espaces (maison, travail, code, musique, voyage, etc.).
- Vendorisées dans le dépôt (pas de dépendance runtime, pas de bundler — contrainte projet).
- La recherche par mots-clés doit fonctionner sur ces icônes comme sur les émojis.

### Organisation du panneau
- Deux onglets « Émoji » et « Icônes » dans le panneau existant.
- Le champ de recherche filtre l'onglet actif.
- Le contrôle de teinte de peau reste visible uniquement côté émoji.

### Affichage hors renderer
- Menus natifs, palette et petite fenêtre : aucune icône pour une icône Lucide, nom seul.
- Les libellés texte (`${icon} ${name}`) ne doivent plus exposer la valeur brute encodée.
- L'icône reste visible dans la barre latérale, l'interface et la page.

### Claude's Discretion
- Encodage de la valeur stockée (préfixe discriminants, ex. `lucide:home`), validation et rétrocompatibilité avec les émojis existants.
- Liste exacte des ~80 icônes et leurs mots-clés de recherche.
- Rendering helper partagé, attributs d'accessibilité et libellés i18n.
- Stratégie de test (unitaire + UI).

</decisions>

<specifics>
## Specific Ideas

Aucune référence externe imposée — suivre lestyle visuel des symboles SVG existants (sprite 16×16, `src/renderer/shell.html`).

</specifics>

<canonical_refs>
## Canonical References

- Lucide (lucide.dev) — icônes SVG open source utilisées comme source de la sélection curatée.

</canonical_refs>
