// Suivi Piano — synchronisation en ligne (Firebase : Authentication + Firestore)
//
// Principe :
// - IndexedDB reste la base de travail : l'appli fonctionne hors ligne comme avant.
// - Chaque modification locale est notée dans le journal `_outbox` (db.js).
// - Une synchro = 1) récupérer les changements du serveur, 2) envoyer le journal.
// - Conflit (même fiche modifiée sur deux appareils) : la version la plus récente
//   (`updatedAt`) l'emporte.
//
// Rangement côté Firestore : users/{uid}/{magasin}/{id}
//   { json: "<enregistrement en JSON>", updatedAt: ISO, deleted: bool, syncedAt: horodatage serveur }
// Les suppressions restent sous forme de « pierre tombale » (deleted: true) pour que
// les autres appareils les voient.

import { firebaseConfig } from "./firebaseConfig.js";
import {
  STORES, onLocalChange, outboxAll, outboxAck, outboxMarkAll, applyRemote, get,
} from "./db.js";

const SDK = "https://www.gstatic.com/firebasejs/10.14.1";
const BATCH_MAX = 400;
const PERIODE_MS = 2 * 60 * 1000;

let fb = null;           // modules + instances Firebase une fois chargés
let user = null;
let enCours = null;      // promesse de la synchro en cours
let relance = false;     // une modif est arrivée pendant la synchro
let timer = null;
let etat = { statut: "off", message: "", derniere: null, erreur: null };
const ecouteurs = new Set();
const ecouteursDonnees = new Set();

/* ---------- État observable (écran Paramètres, bandeau) ---------- */

export function syncConfiguree() {
  return !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId);
}

export function etatSync() {
  return { ...etat, email: user?.email || null, configuree: syncConfiguree() };
}

export function surEtatSync(fn) {
  ecouteurs.add(fn);
  return () => ecouteurs.delete(fn);
}

/** Appelé quand des données venues d'un autre appareil ont été appliquées. */
export function surDonneesDistantes(fn) {
  ecouteursDonnees.add(fn);
  return () => ecouteursDonnees.delete(fn);
}

function majEtat(patch) {
  etat = { ...etat, ...patch };
  for (const fn of ecouteurs) {
    try { fn(etatSync()); } catch (e) { console.error(e); }
  }
}

/* ---------- Mémo local (dernier relevé serveur, par compte) ---------- */

function memoKey() {
  return `suivi-piano.sync.${user.uid}`;
}
function lireMemo() {
  try { return JSON.parse(localStorage.getItem(memoKey()) || "{}"); } catch { return {}; }
}
function ecrireMemo(m) {
  try { localStorage.setItem(memoKey(), JSON.stringify(m)); } catch { /* sans effet */ }
}

/* ---------- Chargement de Firebase (à la demande, depuis le CDN) ---------- */

async function chargerFirebase() {
  if (fb) return fb;
  const [appMod, authMod, fsMod] = await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-auth.js`),
    import(`${SDK}/firebase-firestore-lite.js`),
  ]);
  const app = appMod.initializeApp(firebaseConfig);
  const auth = authMod.getAuth(app);
  const db = fsMod.getFirestore(app);
  fb = { auth, db, A: authMod, F: fsMod };
  return fb;
}

/**
 * Démarre la synchro (appelé une fois au lancement de l'appli).
 * Sans configuration Firebase, ne fait rien : l'appli reste 100 % locale.
 */
export async function initSync() {
  onLocalChange(() => planifier(3000));
  if (!syncConfiguree()) {
    majEtat({ statut: "off", message: "Synchronisation non configurée." });
    return;
  }
  majEtat({ statut: "chargement", message: "Connexion au service…" });
  try {
    await chargerFirebase();
  } catch (e) {
    console.warn("Firebase indisponible", e);
    majEtat({ statut: "horsligne", message: "Service en ligne injoignable (hors ligne ?)." });
    window.addEventListener("online", () => { if (!fb) initSync(); }, { once: true });
    return;
  }
  fb.A.onAuthStateChanged(fb.auth, async (u) => {
    const avant = user?.uid;
    user = u;
    if (!u) {
      majEtat({ statut: "deconnecte", message: "Non connecté : les données restent sur cet appareil." });
      return;
    }
    if (avant !== u.uid) {
      const memo = lireMemo();
      if (!memo.branche) {
        // Premier branchement de cet appareil sur ce compte : tout le contenu local
        // part dans le journal, il sera fusionné avec ce qui est déjà en ligne.
        await outboxMarkAll();
        ecrireMemo({ ...memo, branche: true });
      }
    }
    majEtat({ statut: "connecte", message: "" });
    synchroniser();
  });

  window.addEventListener("online", () => planifier(500));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") planifier(500);
  });
  setInterval(() => {
    if (document.visibilityState === "visible") planifier(0);
  }, PERIODE_MS);
}

function planifier(ms) {
  if (!user) return;
  clearTimeout(timer);
  timer = setTimeout(() => synchroniser(), ms);
}

/* ---------- Compte ---------- */

function messageErreurAuth(e) {
  const code = e?.code || "";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found"))
    return "E-mail ou mot de passe incorrect.";
  if (code.includes("email-already-in-use")) return "Un compte existe déjà avec cet e-mail : utilise « Se connecter ».";
  if (code.includes("weak-password")) return "Mot de passe trop court (6 caractères minimum).";
  if (code.includes("invalid-email")) return "Adresse e-mail invalide.";
  if (code.includes("network")) return "Pas de connexion réseau.";
  if (code.includes("too-many-requests")) return "Trop de tentatives, réessaie dans quelques minutes.";
  if (code.includes("operation-not-allowed")) return "Connexion par e-mail non activée dans la console Firebase.";
  return e?.message || "Échec de la connexion.";
}

export async function connecter(email, motDePasse, { creer = false } = {}) {
  await chargerFirebase();
  try {
    if (creer) await fb.A.createUserWithEmailAndPassword(fb.auth, email, motDePasse);
    else await fb.A.signInWithEmailAndPassword(fb.auth, email, motDePasse);
  } catch (e) {
    throw new Error(messageErreurAuth(e));
  }
}

export async function motDePasseOublie(email) {
  await chargerFirebase();
  try {
    await fb.A.sendPasswordResetEmail(fb.auth, email);
  } catch (e) {
    throw new Error(messageErreurAuth(e));
  }
}

export async function deconnecter() {
  if (!fb) return;
  // Envoie ce qui reste avant de partir.
  try { await synchroniser(); } catch { /* tant pis */ }
  await fb.A.signOut(fb.auth);
}

/* ---------- Synchronisation ---------- */

/** Lance une synchro (ou rejoint celle en cours). */
export function synchroniser() {
  if (!user || !fb) return Promise.resolve();
  if (enCours) {
    relance = true;
    return enCours;
  }
  enCours = (async () => {
    try {
      do {
        relance = false;
        await cycle();
      } while (relance);
      majEtat({ statut: "connecte", derniere: new Date().toISOString(), erreur: null, message: "" });
    } catch (e) {
      console.error("synchro", e);
      const horsLigne = !navigator.onLine || /unavailable|network|offline/i.test(String(e?.code || e?.message));
      majEtat({
        statut: "connecte",
        erreur: horsLigne ? "Hors ligne : les modifications partiront au retour du réseau." : (e?.message || String(e)),
      });
    } finally {
      enCours = null;
    }
  })();
  return enCours;
}

async function cycle() {
  majEtat({ statut: "synchro" });
  const recus = await recuperer();
  await envoyer();
  if (recus) {
    for (const fn of ecouteursDonnees) {
      try { await fn(recus); } catch (e) { console.error(e); }
    }
  }
}

/** Récupère les changements du serveur depuis le dernier relevé. @returns nb appliqués */
async function recuperer() {
  const { F, db } = fb;
  const memo = lireMemo();
  const depuis = memo.depuis || {};
  const journal = new Map((await outboxAll()).map((e) => [e.k, e]));
  let appliques = 0;

  for (const store of STORES) {
    const col = F.collection(db, "users", user.uid, store);
    const q = depuis[store]
      // Marge d'une minute : ré-appliquer un changement déjà vu est sans effet.
      ? F.query(col, F.where("syncedAt", ">", F.Timestamp.fromMillis(Math.max(0, depuis[store] - 60000))))
      : col;
    const snap = await F.getDocs(q);
    let max = depuis[store] || 0;

    for (const d of snap.docs) {
      const r = d.data();
      const ms = r.syncedAt?.toMillis?.() || 0;
      if (ms > max) max = ms;
      const id = d.id;
      const distantTs = r.updatedAt || "";

      const enAttente = journal.get(`${store}/${id}`);
      let localTs;
      if (enAttente) {
        localTs = enAttente.deleted ? enAttente.updatedAt : ((await get(store, id))?.updatedAt || enAttente.updatedAt);
      } else {
        const local = await get(store, id);
        localTs = local ? (local.updatedAt || "") : null;
        if (!local && r.deleted) continue;               // déjà absent ici
      }
      // La version locale est au moins aussi récente : on garde la locale.
      if (localTs != null && localTs >= distantTs && (enAttente || !r.deleted)) continue;

      let rec = null;
      if (!r.deleted) {
        try { rec = JSON.parse(r.json); } catch { continue; }
      }
      await applyRemote(store, id, rec);
      appliques += 1;
    }
    depuis[store] = max;
  }
  ecrireMemo({ ...lireMemo(), depuis });
  return appliques;
}

/** Envoie le journal des modifications locales. */
async function envoyer() {
  const { F, db } = fb;
  const entrees = await outboxAll();
  if (!entrees.length) return;
  majEtat({ message: `Envoi de ${entrees.length} modification(s)…` });

  for (let i = 0; i < entrees.length; i += BATCH_MAX) {
    const lot = entrees.slice(i, i + BATCH_MAX);
    const batch = F.writeBatch(db);
    for (const e of lot) {
      const ref = F.doc(db, "users", user.uid, e.store, String(e.id));
      const rec = e.deleted ? null : await get(e.store, e.id);
      if (rec) {
        batch.set(ref, {
          json: JSON.stringify(rec),
          updatedAt: rec.updatedAt || e.updatedAt || "",
          deleted: false,
          syncedAt: F.serverTimestamp(),
        });
      } else {
        batch.set(ref, {
          json: null,
          updatedAt: e.updatedAt || new Date().toISOString(),
          deleted: true,
          syncedAt: F.serverTimestamp(),
        });
      }
    }
    await batch.commit();
    await outboxAck(lot);
  }
  majEtat({ message: "" });
}
