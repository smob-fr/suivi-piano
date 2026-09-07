// Suivi Piano — rappel quotidien (évènement calendrier + notifications best-effort)

import { downloadFile } from "./backup.js";
import { parseYmd, ymd, today } from "./planning.js";

/* ---------- Évènement de calendrier (.ics) ---------- */

function pad(n) {
  return String(n).padStart(2, "0");
}

/** Prochaine occurrence : demain à l'heure choisie (heure locale « flottante »). */
function dtstart(heure) {
  const [hh, mm] = String(heure || "19:00").split(":").map(Number);
  const d = parseYmd(today());
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(hh || 19)}${pad(mm || 0)}00`;
}

function dtstamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function genererICS(heure) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Suivi Piano//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:suivi-piano-rappel-quotidien@smob-fr.github.io",
    `DTSTAMP:${dtstamp()}`,
    `DTSTART:${dtstart(heure)}`,
    "DURATION:PT15M",
    "RRULE:FREQ=DAILY",
    "SUMMARY:Suivi Piano — cours à saisir / préparer demain",
    "DESCRIPTION:Ouvre l'application Suivi Piano.",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Suivi Piano",
    "TRIGGER:PT0S",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}

export function telechargerRappelICS(heure) {
  downloadFile("suivi-piano-rappel.ics", genererICS(heure), "text/calendar;charset=utf-8");
}

/* ---------- Notifications best-effort ---------- */

export function etatNotifications() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission; // "default" | "granted" | "denied"
}

export async function activerNotifications() {
  if (!("Notification" in window)) return "unsupported";
  let perm = Notification.permission;
  if (perm === "default") perm = await Notification.requestPermission();
  if (perm !== "granted") return perm;

  // Rappel périodique (Periodic Background Sync) — non garanti, dépend du navigateur.
  try {
    const reg = await navigator.serviceWorker.ready;
    if ("periodicSync" in reg) {
      const status = await navigator.permissions.query({ name: "periodic-background-sync" });
      if (status.state === "granted") {
        await reg.periodicSync.register("verif-quotidienne", { minInterval: 12 * 60 * 60 * 1000 });
      }
    }
  } catch {
    /* best-effort */
  }
  return "granted";
}
