// Suivi Piano — couche de données (IndexedDB)
//
// Bases : un seul objectStore par entité, clé primaire `id` (string).
// `params` est un magasin clé/valeur (keyPath `key`).
// `_outbox` (interne, jamais exporté) : modifications locales pas encore envoyées
// à la synchronisation en ligne (voir sync.js). Clé `k` = "<magasin>/<id>".
//
// À chaque évolution du schéma : incrémenter DB_VERSION et compléter onupgradeneeded.

import { uid, nowISO } from "./util.js";

const DB_NAME = "suivi-piano";
const DB_VERSION = 2;

export const SCHEMA_VERSION = 1;

/** Magasins qui contiennent des enregistrements applicatifs (pour l'export/import). */
export const STORES = ["params", "payeurs", "eleves", "seances", "periodes"];

const OUTBOX = "_outbox";

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      if (!db.objectStoreNames.contains("params")) {
        db.createObjectStore("params", { keyPath: "key" });
      }
      for (const name of ["payeurs", "eleves", "seances", "periodes"]) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: "id" });
        }
      }
      if (!db.objectStoreNames.contains(OUTBOX)) {
        db.createObjectStore(OUTBOX, { keyPath: "k" });
      }
      void e;
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

function tx(storeNames, mode = "readonly") {
  return openDB().then((db) => {
    const t = db.transaction(storeNames, mode);
    return t;
  });
}

function reqToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(t) {
  return new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

/* ---------- Journal des modifications locales (pour la synchro) ---------- */

export function keyOf(store, record) {
  return store === "params" ? record.key : record.id;
}

let _changeListener = null;
/** sync.js s'y abonne pour planifier un envoi après chaque modification locale. */
export function onLocalChange(fn) {
  _changeListener = fn;
}
function notifyChange() {
  if (_changeListener) {
    try { _changeListener(); } catch (e) { console.error(e); }
  }
}

function logChange(t, store, id, deleted, updatedAt) {
  t.objectStore(OUTBOX).put({
    k: `${store}/${id}`,
    store,
    id,
    deleted: !!deleted,
    updatedAt: updatedAt || nowISO(),
    v: uid(),
  });
}

/* ---------- CRUD générique ---------- */

export async function getAll(store) {
  const t = await tx(store);
  return reqToPromise(t.objectStore(store).getAll());
}

export async function get(store, id) {
  const t = await tx(store);
  return reqToPromise(t.objectStore(store).get(id));
}

export async function put(store, record) {
  const t = await tx([store, OUTBOX], "readwrite");
  const now = nowISO();
  if (store !== "params") {
    if (!record.id) record.id = uid();
    if (!record.createdAt) record.createdAt = now;
  }
  record.updatedAt = now;
  t.objectStore(store).put(record);
  logChange(t, store, keyOf(store, record), false, now);
  await txDone(t);
  notifyChange();
  return record;
}

export async function remove(store, id) {
  const t = await tx([store, OUTBOX], "readwrite");
  t.objectStore(store).delete(id);
  logChange(t, store, id, true);
  await txDone(t);
  notifyChange();
}

/**
 * Écrit plusieurs enregistrements tels quels (sans toucher à `updatedAt`,
 * sauf `{ stamp: true }` qui les date de maintenant).
 */
export async function bulkPut(store, records, { stamp = false } = {}) {
  const t = await tx([store, OUTBOX], "readwrite");
  const os = t.objectStore(store);
  const now = nowISO();
  for (const r of records) {
    if (stamp || !r.updatedAt) r.updatedAt = now;
    os.put(r);
    logChange(t, store, keyOf(store, r), false, r.updatedAt);
  }
  await txDone(t);
  notifyChange();
  return records.length;
}

export async function clearStore(store) {
  const t = await tx([store, OUTBOX], "readwrite");
  const keys = await reqToPromise(t.objectStore(store).getAllKeys());
  for (const id of keys) logChange(t, store, id, true);
  t.objectStore(store).clear();
  await txDone(t);
  notifyChange();
}

/* ---------- Accès réservés à la synchronisation (sync.js) ---------- */

export async function outboxAll() {
  const t = await tx(OUTBOX);
  return reqToPromise(t.objectStore(OUTBOX).getAll());
}

/** Retire des entrées du journal, seulement si elles n'ont pas changé entre-temps. */
export async function outboxAck(entries) {
  const t = await tx(OUTBOX, "readwrite");
  const os = t.objectStore(OUTBOX);
  for (const e of entries) {
    const cur = await reqToPromise(os.get(e.k));
    if (cur && cur.v === e.v) os.delete(e.k);
  }
  await txDone(t);
}

/** Ajoute au journal tout le contenu local (premier branchement d'un appareil). */
export async function outboxMarkAll() {
  for (const store of STORES) {
    const t = await tx([store, OUTBOX], "readwrite");
    const all = await reqToPromise(t.objectStore(store).getAll());
    for (const r of all) logChange(t, store, keyOf(store, r), false, r.updatedAt || "");
    await txDone(t);
  }
  notifyChange();
}

/**
 * Applique un changement venu du serveur, sans le journaliser.
 * `record` null = suppression. Retire l'entrée du journal correspondante.
 */
export async function applyRemote(store, id, record) {
  const t = await tx([store, OUTBOX], "readwrite");
  if (record) t.objectStore(store).put(record);
  else t.objectStore(store).delete(id);
  t.objectStore(OUTBOX).delete(`${store}/${id}`);
  await txDone(t);
}

/* ---------- Paramètres ---------- */

export async function getParam(key, fallback = null) {
  const rec = await get("params", key);
  return rec ? rec.value : fallback;
}

export async function setParam(key, value) {
  return put("params", { key, value });
}

/* ---------- Export / import complet (sauvegarde JSON) ---------- */

export async function exportAll() {
  const data = {};
  for (const store of STORES) {
    data[store] = await getAll(store);
  }
  return {
    app: "suivi-piano",
    schemaVersion: SCHEMA_VERSION,
    exportedAt: nowISO(),
    data,
  };
}

/**
 * Remplace intégralement le contenu de la base par celui du fichier.
 * @returns {Promise<{stores:number, records:number}>}
 */
export async function importAll(payload) {
  if (!payload || payload.app !== "suivi-piano" || !payload.data) {
    throw new Error("Fichier de sauvegarde non reconnu.");
  }
  if (payload.schemaVersion > SCHEMA_VERSION) {
    throw new Error(
      `Sauvegarde créée avec une version plus récente de l'application (schéma ${payload.schemaVersion}).`
    );
  }
  let records = 0;
  let stores = 0;
  for (const store of STORES) {
    if (!Array.isArray(payload.data[store])) continue;
    await clearStore(store);
    // Datés de maintenant : une restauration doit l'emporter sur les autres appareils.
    await bulkPut(store, payload.data[store], { stamp: true });
    records += payload.data[store].length;
    stores += 1;
  }
  return { stores, records };
}

/* ---------- Accès applicatifs ---------- */

export const eleves = {
  all: () => getAll("eleves"),
  get: (id) => get("eleves", id),
  save: (e) => put("eleves", e),
  remove: (id) => remove("eleves", id),
};

export const payeurs = {
  all: () => getAll("payeurs"),
  get: (id) => get("payeurs", id),
  save: (p) => put("payeurs", p),
  remove: (id) => remove("payeurs", id),
};

export const seances = {
  all: () => getAll("seances"),
  get: (id) => get("seances", id),
  save: (s) => put("seances", s),
  remove: (id) => remove("seances", id),
};

/** Nombre d'élèves rattachés à un payeur donné. */
export async function elevesDuPayeur(payeurId) {
  const list = await getAll("eleves");
  return list.filter((e) => e.payeurId === payeurId);
}
