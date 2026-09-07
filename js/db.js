// Suivi Piano — couche de données (IndexedDB)
//
// Bases : un seul objectStore par entité, clé primaire `id` (string).
// `params` est un magasin clé/valeur (keyPath `key`).
//
// À chaque évolution du schéma : incrémenter DB_VERSION et compléter onupgradeneeded.

import { uid, nowISO } from "./util.js";

const DB_NAME = "suivi-piano";
const DB_VERSION = 1;

export const SCHEMA_VERSION = 1;

/** Magasins qui contiennent des enregistrements applicatifs (pour l'export/import). */
export const STORES = ["params", "payeurs", "eleves", "seances", "periodes"];

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
  const t = await tx(store, "readwrite");
  const now = nowISO();
  if (store !== "params") {
    if (!record.id) record.id = uid();
    if (!record.createdAt) record.createdAt = now;
    record.updatedAt = now;
  }
  await reqToPromise(t.objectStore(store).put(record));
  return record;
}

export async function remove(store, id) {
  const t = await tx(store, "readwrite");
  await reqToPromise(t.objectStore(store).delete(id));
}

export async function bulkPut(store, records) {
  const t = await tx(store, "readwrite");
  const os = t.objectStore(store);
  for (const r of records) os.put(r);
  return new Promise((resolve, reject) => {
    t.oncomplete = () => resolve(records.length);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export async function clearStore(store) {
  const t = await tx(store, "readwrite");
  await reqToPromise(t.objectStore(store).clear());
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
    await bulkPut(store, payload.data[store]);
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
