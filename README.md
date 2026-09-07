# Suivi Piano

Application web installable (PWA) pour le suivi des cours de piano :
élèves, planning, cours effectués, tarifs et paiements.

- **Données** : stockées uniquement sur l'appareil (IndexedDB). Rien n'est envoyé sur un serveur.
- **Hébergement** : GitHub Pages sert uniquement le code de l'application (aucune donnée personnelle).
- **Hors ligne** : géré par le service worker (`sw.js`).

## État

Étapes 1 et 2 du plan (voir `docs/cahier-des-charges.md` §15) :

- couche de données IndexedDB + sauvegarde / restauration JSON ;
- gestion des élèves (liste, fiche complète, archivage, suppression) ;
- gestion des payeurs / foyers ;
- import CSV des élèves (modèle téléchargeable, aperçu avant import).

Les autres écrans (Accueil, Agenda, Séances, Synthèse) sont des espaces réservés.

## Architecture

Site statique, sans étape de build. Modules ES natifs sous `js/` :

- `db.js` — IndexedDB + export/import
- `model.js` — fabriques et règles métier
- `csv.js` — analyse et import CSV
- `router.js` — routeur `#/`
- `screens/` — un module par écran

## Développement

```bash
python -m http.server 8000
```

puis ouvrir http://localhost:8000

À chaque mise en ligne : incrémenter `VERSION` dans `sw.js` et `SUIVI_BUILD` dans
`js/app.js`.
