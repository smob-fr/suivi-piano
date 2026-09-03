# Suivi Piano

Application web installable (PWA) pour le suivi des cours de piano :
élèves, planning, cours effectués, tarifs et paiements.

- **Données** : stockées uniquement sur l'appareil (IndexedDB). Rien n'est envoyé sur un serveur.
- **Hébergement** : GitHub Pages sert uniquement le code de l'application (aucune donnée personnelle).
- **Hors ligne** : géré par le service worker (`sw.js`).

## État

Version 0 — squelette technique. Les écrans métier seront ajoutés après le cahier des charges.

## Développement

Site statique, sans étape de build. Pour tester en local :

```bash
python -m http.server 8000
```

puis ouvrir http://localhost:8000

À chaque mise en ligne, incrémenter `VERSION` dans `sw.js` et `BUILD` dans `app.js`.
