# Synchronisation entre appareils (Firebase)

Depuis la v0.14.0, Suivi Piano peut partager ses données entre plusieurs appareils
(téléphone, ordinateur…) via **Firebase** (Google) : Authentication + Firestore.

- La base locale (IndexedDB) reste la base de travail : l'appli marche toujours hors ligne.
- Chaque modification est envoyée en ligne dès que possible ; les autres appareils la
  récupèrent à l'ouverture, au retour sur l'appli et toutes les 2 minutes.
- Si une même fiche est modifiée sur deux appareils, **la modification la plus récente l'emporte**.
- Sans configuration, l'appli reste 100 % locale comme avant.

## Mise en place (une seule fois, ~10 min)

1. **Créer le projet** : <https://console.firebase.google.com> → « Ajouter un projet »
   (ex. `suivi-piano`). Google Analytics : inutile, décocher.
2. **Activer la connexion par e-mail** : Build → *Authentication* → « Commencer » →
   onglet *Sign-in method* → **E-mail/Mot de passe** → Activer → Enregistrer.
3. **Autoriser le domaine du site** : Authentication → *Settings* → *Authorized domains* →
   ajouter `smob-fr.github.io`.
4. **Créer la base** : Build → *Firestore Database* → « Créer une base de données » →
   emplacement **europe-west** (ex. `eur3` ou `europe-west9` Paris) → mode **production**.
5. **Règles de sécurité** : Firestore → onglet *Règles*, remplacer tout par :

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```

   → Publier. Chaque compte ne peut lire et écrire que ses propres données.
6. **Récupérer la configuration web** : roue crantée → *Paramètres du projet* →
   « Vos applications » → icône **</>** (Web) → nom `suivi-piano` (pas besoin de Hosting) →
   copier l'objet `firebaseConfig` affiché.
7. Coller cet objet dans `js/firebaseConfig.js` (à la place de `null`) et publier le site.
   Ces valeurs ne sont pas secrètes : la protection repose sur la connexion et les règles.

## Utilisation

1. Sur l'appareil qui contient déjà les données (le téléphone) : **Paramètres →
   Synchronisation entre appareils → « Créer le compte »** (e-mail + mot de passe).
   Tout le contenu local est envoyé en ligne.
2. Sur l'ordinateur : ouvrir l'appli → Paramètres → **« Se connecter »** avec le même compte.
   Les données arrivent en quelques secondes.
3. L'icône ☁ en haut indique l'état : point vert = synchronisé, point orange = hors ligne,
   non connecté ou erreur (toucher l'icône ouvre les Paramètres).

> Conseil : faire une sauvegarde JSON (Paramètres) avant le tout premier branchement.

## Fonctionnement technique

- `js/db.js` note chaque écriture locale dans le magasin interne `_outbox`.
- `js/sync.js` : récupère les documents modifiés depuis le dernier relevé (`syncedAt`),
  applique ceux qui sont plus récents que la version locale, puis envoie le journal.
- Firestore : `users/{uid}/{magasin}/{id}` → `{ json, updatedAt, deleted, syncedAt }`.
  Les suppressions sont conservées (`deleted: true`) pour être propagées.
- Les séances générées automatiquement ont un identifiant déterministe
  (`auto_<élève>_<jour>_<heure>_<date>`) : deux appareils ne créent pas de doublons.
  Les doublons d'anciennes séances « prévues » sont nettoyés par `genererHorizon()`.
- Le SDK Firebase est chargé à la demande depuis `www.gstatic.com` (version 10.14.1).
- Volumes : très loin des limites de l'offre gratuite (Spark).
