// Suivi Piano — configuration Firebase (synchronisation entre appareils)
//
// Configuration « Web » du projet Firebase `suivi-piano`.
// Ces valeurs ne sont PAS des secrets : la protection des données repose sur la
// connexion (e-mail + mot de passe) et sur les règles Firestore (voir docs/synchronisation.md).
//
// Mettre `null` = synchronisation désactivée, l'appli reste 100 % locale.

export const firebaseConfig = {
  apiKey: "AIzaSyArMvbS1pBz0GlXJYKvKXRi1Xpcc_mTmsk",
  authDomain: "suivi-piano.firebaseapp.com",
  projectId: "suivi-piano",
  storageBucket: "suivi-piano.firebasestorage.app",
  messagingSenderId: "984723652660",
  appId: "1:984723652660:web:5c4b84c532ed9a52c0ca61",
};
