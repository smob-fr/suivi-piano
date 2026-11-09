/* Le Temple qui Triche — 5 actes, 50 niveaux.
 * Moteur maison sur <canvas>, sans dépendance. Les niveaux viennent de levels.js
 * (généré par outils/niveaux.py).
 */
(() => {
  "use strict";

  const LEVELS = window.TEMPLE_LEVELS || [];
  const ACTS = window.TEMPLE_ACTS || [];

  /* ================= Constantes ================= */
  const T = 16;
  let COLS = 30, ROWS = 17, W = COLS * T, H = ROWS * T;
  const STEP = 1 / 60;
  const VIEW_TARGET = { w: 416, h: 208 }; // zoom sur mobile : ~26 × 13 cases visibles

  const PHYS = {
    gravity: 0.35, maxFall: 6.5,
    run: 1.8, accel: 0.35,
    jump: -5.2, jumpCut: -2, spring: -7.8,
    coyote: 8, buffer: 10,   // tolérances : saut accepté un peu après le bord, ou un peu avant d'atterrir
  };

  const PALETTES = {
    jungle:     { moss: "#4f8a3a", bg: "#0d1512", bg2: "#13201b", stone: "#3a5649", stoneTop: "#5f8471", stoneDark: "#25372f", crack: "#9a8656", crackDark: "#5e5232", deco: "#1f3d2c" },
    crypte:     { bg: "#16100a", bg2: "#211710", stone: "#7a5d36", stoneTop: "#a8834f", stoneDark: "#4e3a21", crack: "#cdb27c", crackDark: "#7c6440", deco: "#3a2a17" },
    mines:      { bg: "#0e1014", bg2: "#171b22", stone: "#474c58", stoneTop: "#6a7283", stoneDark: "#2c3038", crack: "#9a8660", crackDark: "#584b33", deco: "#4a3522" },
    cascades:   { moss: "#3f8a6e", bg: "#081316", bg2: "#0e2126", stone: "#2f5560", stoneTop: "#4f8796", stoneDark: "#1c373e", crack: "#a39167", crackDark: "#655a3e", deco: "#3d7f93" },
    sanctuaire: { bg: "#0f0b15", bg2: "#1a1329", stone: "#4b3a63", stoneTop: "#73598f", stoneDark: "#2d2240", crack: "#b99c60", crackDark: "#75623c", deco: "#d9a441" },
    catacombes: { bg: "#0c0d10", bg2: "#16181d", stone: "#5b5d63", stoneTop: "#84878e", stoneDark: "#36383d", crack: "#b3a481", crackDark: "#6e6448", deco: "#2a2c31" },
    engloutie:  { moss: "#2f8a7e", bg: "#05121a", bg2: "#0a1f2b", stone: "#2c5f6e", stoneTop: "#4e95a6", stoneDark: "#173a45", crack: "#a7a07a", crackDark: "#5f5b42", deco: "#2b7f95" },
    volcan:     { bg: "#140806", bg2: "#22100b", stone: "#4a2f2a", stoneTop: "#7a4a3a", stoneDark: "#2c1915", crack: "#c58a4a", crackDark: "#7a4e25", deco: "#5a1d10" },
    jardins:    { moss: "#5fae3e", bg: "#0e1a12", bg2: "#18291c", stone: "#6b6a4c", stoneTop: "#97956a", stoneDark: "#45442f", crack: "#c0a36a", crackDark: "#7a6540", deco: "#2c5a2c" },
    himalaya:   { neige: true, bg: "#0e1a28", bg2: "#16283a", stone: "#566a7c", stoneTop: "#f4f8fc", stoneDark: "#35444f", crack: "#a8b8c4", crackDark: "#5f6f7a", deco: "#c0392b" },
    glace:      { neige: true, bg: "#081622", bg2: "#0f2436", stone: "#4f7a96", stoneTop: "#e6f4ff", stoneDark: "#2a4a60", crack: "#9fc4dd", crackDark: "#4f7ea6", deco: "#9fe0ff" },
    abysses:    { moss: "#3fa88a", bg: "#04202e", bg2: "#08304a", stone: "#2f5866", stoneTop: "#c9b07a", stoneDark: "#1b3540", crack: "#b0a070", crackDark: "#6a5e3e", deco: "#1f6f8b" },
    cite:       { bg: "#2a0f0a", bg2: "#3a160c", stone: "#8c5a2a", stoneTop: "#f2c14e", stoneDark: "#5a3418", crack: "#e8a050", crackDark: "#8c4a1a", deco: "#e8621f" },
    nuages:     { bg: "#bfd7ff", bg2: "#d8e6ff", stone: "#d9dcef", stoneTop: "#fdf6ff", stoneDark: "#9aa4c8", crack: "#e8d8a0", crackDark: "#a08a50", deco: "#f28fb8" },
    tresor:     { bg: "#140f06", bg2: "#22190a", stone: "#7b6332", stoneTop: "#b8964a", stoneDark: "#4c3c1c", crack: "#e2c070", crackDark: "#8a6c2c", deco: "#e2a640" },
  };

  const C = {
    danger: "#e5483c", dangerDark: "#8c241d",
    hat: "#d9a441",
    fedora: "#7a4b27", fedoraBand: "#3b2414", fedoraTop: "#93603a",
    skin: "#e2a777", skinDark: "#b9805a", jacket: "#6b3d1f", jacketHi: "#8a5530",
    shirt: "#cdb67e", pants: "#5a5240", boots: "#2e1f15",
    satchel: "#a07a45", whip: "#3d2716", void: "#070b09",
    door: "#d9a441", doorIn: "#060a08",
    god: "#d9a441", hint: "#d8e4dc",
    text: "#efe8d8", dim: "#8aa398",
    bandage: "#d8cba6", bandageDark: "#a3956f", mummyEye: "#9cf06b",
    snake: "#5d9a3a", snakeDark: "#335f20", snakeBelly: "#d9c14a",
    bat: "#3b2a3f", batWing: "#5a4160", batEye: "#ff5a4a",
    wood: "#a07443", metal: "#5d636b", club: "#8a5a2b", clubDark: "#5a3818", gold: "#f2c14e",
    jade: "#3fd08a", jadeDark: "#1f7a4f", poison: "#b04ad8",
    rivalSuit: "#e9e2cf", rivalShade: "#bfb59a", rivalHelmet: "#efe2bd", rivalScarf: "#b8322a", rivalHair: "#3a2a1c",
  };
  let P = PALETTES.jungle;

  const TYPES = {
    exploration: { label: "Exploration", color: "#6fb58f" },
    trahison: { label: "Trahison", color: "#e5483c" },
    action: { label: "Action", color: "#e3913b" },
    histoire: { label: "Histoire", color: "#b49ae6" },
  };

  const TAUNTS = [
    "Aïe. Pendant ce temps, j'avance !",
    "Tu y étais presque. Non, en fait.",
    "Je note ça dans mon carnet de fouilles.",
    "Tu sais que tu peux sauter, hein ?",
    "Magnifique. Refais-le, j'ai besoin de temps.",
    "Gérard te salue.",
    "C'était voulu ? Dis-moi que c'était voulu.",
    "Ton chapeau a mieux atterri que toi.",
    "L'Œil de Jade me remercie.",
    "Prends ton temps, surtout.",
  ];
  const RIVAL_DOOR = [
    "Trop lent, Max ! À la salle suivante !",
    "Après moi, cher confrère !",
    "Le trésor m'attend. Toi, les pièges t'attendent.",
    "Bon courage ! Ha ha !",
    "Je te laisse mes pièges. Cadeau.",
  ];

  /* ================= Canvas, mise à l'échelle ================= */
  const isTouch = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
  document.body.classList.toggle("tactile", isTouch);

  const canvas = document.getElementById("jeu");
  let ctx = canvas.getContext("2d");
  const stage = document.getElementById("scene");
  let scale = 1, dpr = 1;
  const view = { w: W, h: H };
  const cam = { x: 0, y: 0 };
  const CAM_EXT = { x: 16, top: 24, bottom: 70 };
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Résolution : au plus 2 pixels par point (3 sur certains téléphones coûtait cher),
  // abaissée automatiquement si le téléphone peine (voir frame()).
  let maxDpr = 2;
  let lastSize = "";
  // Paysage forcé : téléphone tenu droit → on affiche tout de côté (voir #rot dans la page)
  const rotEl = document.getElementById("rot");
  function majRotation() {
    const vv = window.visualViewport;
    const vw = Math.min(innerWidth, vv ? vv.width : Infinity), vh = Math.min(innerHeight, vv ? vv.height : Infinity);
    const portrait = isTouch && vh > vw;
    document.body.classList.toggle("rot", portrait);
    if (portrait) {
      rotEl.style.width = vh + "px"; rotEl.style.height = vw + "px"; rotEl.style.left = vw + "px";
    } else { rotEl.style.width = rotEl.style.height = rotEl.style.left = ""; }
    const lw = portrait ? vh : vw, lh = portrait ? vw : vh;
    document.documentElement.style.setProperty("--lw", lw + "px");
    document.documentElement.style.setProperty("--lh", lh + "px");
    return { w: lw, h: lh };
  }
  function mesure() {
    const vp = majRotation(), el = stage.parentElement;
    // clientWidth/Height ne sont pas déformés par la rotation, contrairement à getBoundingClientRect
    return { width: Math.min(el.clientWidth || vp.w, vp.w), height: Math.min(el.clientHeight || vp.h, vp.h) };
  }
  function resize() {
    // Sur Android, après une rotation ou un passage en plein écran, la taille réelle arrive en retard :
    // on prend la plus petite des mesures disponibles pour ne jamais déborder de l'écran.
    const wrap = mesure();
    lastSize = `${Math.round(wrap.width)}x${Math.round(wrap.height)}`;
    const fit = Math.min(wrap.width / W, wrap.height / H);
    const zoom = Math.min(wrap.width / VIEW_TARGET.w, wrap.height / VIEW_TARGET.h);
    scale = Math.max(0.5, isTouch || fit < 1.6 ? Math.max(fit, zoom) : fit);
    dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const cw = Math.floor(wrap.width), ch = Math.floor(wrap.height);
    stage.style.width = cw + "px";
    stage.style.height = ch + "px";
    canvas.width = Math.floor(cw * dpr);
    canvas.height = Math.floor(ch * dpr);
    view.w = cw / scale; view.h = ch / scale;
    if (R) updateCamera(true);
    positionHero();
    checkOrientation();
  }

  /* ================= Entrées ================= */
  const input = { left: false, right: false, jump: false, fire: false, tnt: false };
  const pressed = { jump: false, fire: false, tnt: false };
  const keyMap = {
    ArrowLeft: "left", KeyA: "left", KeyQ: "left",
    ArrowRight: "right", KeyD: "right",
    ArrowUp: "jump", Space: "jump", KeyW: "jump", KeyZ: "jump",
    KeyX: "fire", KeyJ: "fire",
    KeyC: "tnt", KeyK: "tnt", ArrowDown: "tnt", KeyS: "tnt",
  };
  function setInput(name, down) {
    if (down && !input[name] && name in pressed) pressed[name] = true;
    input[name] = down;
    // saut immédiat dès l'appui (sans attendre l'image suivante)
    if (name === "jump" && down && R && game.mode === "play" && !game.paused) {
      const p = R.player;
      if (p && p.alive && !p.climb && (p.grounded || p.coyote > 0)) { p.vy = PHYS.jump; p.coyote = 0; p.buffer = 0; pressed.jump = false; p.grounded = false; sfx.jump(); }
    }
  }
  window.addEventListener("keydown", (e) => {
    if (e.target && e.target.closest && e.target.closest("input, textarea")) return; // laisser taper dans le formulaire d'avis
    unlockAudio();
    if (e.code === "Escape" || e.code === "KeyP") { togglePause(); e.preventDefault(); return; }
    if (e.code === "KeyR" && game.mode === "play" && !game.paused) { restartRoom(); return; }
    if (e.code === "KeyM") { toggleMute(); return; }
    if (e.code === "Enter" && game.mode === "title" && !overlays.titre.hidden) { ouvrirCarte(); return; }
    const n = keyMap[e.code];
    if (n && (game.mode === "play" || game.mode === "card")) { setInput(n, true); e.preventDefault(); }
  });
  window.addEventListener("keyup", (e) => { const n = keyMap[e.code]; if (n) setInput(n, false); });
  window.addEventListener("blur", releaseAll);
  function releaseAll() {
    for (const k in input) input[k] = false;
    pointerOwner.clear();
    document.querySelectorAll(".touche.on").forEach((b) => b.classList.remove("on"));
  }

  // Commandes tactiles : on note quel doigt (pointeur) appuie sur quel bouton.
  // Un relâchement perdu (écran qui s'ouvre sous le doigt, geste système…) laissait un bouton
  // « enfoncé » pour toujours : le saut ne détectait plus les nouveaux appuis. D'où la latence.
  const pointerOwner = new Map();
  const btnEls = {};
  function relacher(id) {
    const name = pointerOwner.get(id);
    if (!name) return;
    pointerOwner.delete(id);
    if (![...pointerOwner.values()].includes(name)) { setInput(name, false); btnEls[name] && btnEls[name].classList.remove("on"); }
  }
  // filets de sécurité : tout relâchement, n'importe où, libère le doigt ; plus aucun doigt à l'écran = tout est relâché
  ["pointerup", "pointercancel"].forEach((ev) => window.addEventListener(ev, (e) => relacher(e.pointerId), true));
  ["touchend", "touchcancel"].forEach((ev) => window.addEventListener(ev, (e) => {
    if (e.touches && e.touches.length === 0 && pointerOwner.size) { for (const id of [...pointerOwner.keys()]) relacher(id); }
  }, true));
  document.addEventListener("visibilitychange", () => { if (document.hidden) releaseAll(); });
  document.querySelectorAll("[data-btn]").forEach((el) => {
    const name = el.dataset.btn;
    btnEls[name] = el;
    const down = (e) => {
      e.preventDefault();
      unlockAudio();
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      pointerOwner.set(e.pointerId, name);
      setInput(name, true);
      el.classList.add("on");
    };
    const up = (e) => { if (pointerOwner.get(e.pointerId) === name) relacher(e.pointerId); };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("lostpointercapture", up);
    el.addEventListener("contextmenu", (e) => e.preventDefault());
  });

  // Croix de direction : une seule zone tactile ; la moitié sous le doigt décide, et on peut glisser d'une flèche à l'autre.
  const padG = document.querySelector(".pad.gauche");
  if (padG) {
    const dirs = { left: padG.querySelector('[data-dir="left"]'), right: padG.querySelector('[data-dir="right"]') };
    btnEls.left = dirs.left; btnEls.right = dirs.right;
    const choisir = (e) => {
      const r = padG.getBoundingClientRect();
      const name = e.clientX < r.left + r.width / 2 ? "left" : "right";
      const avant = pointerOwner.get(e.pointerId);
      if (avant === name) return;
      if (avant) relacher(e.pointerId);
      pointerOwner.set(e.pointerId, name); setInput(name, true); dirs[name].classList.add("on");
    };
    padG.addEventListener("pointerdown", (e) => { e.preventDefault(); unlockAudio(); try { padG.setPointerCapture(e.pointerId); } catch (_) {} choisir(e); });
    padG.addEventListener("pointermove", (e) => { if (pointerOwner.has(e.pointerId) && ["left", "right"].includes(pointerOwner.get(e.pointerId))) choisir(e); });
    const fin = (e) => relacher(e.pointerId);
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((ev) => padG.addEventListener(ev, fin));
    padG.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  /* ================= Son ================= */
  let audio = null, muted = false;
  try { muted = localStorage.getItem("temple-muet") === "1"; } catch (_) {}
  function unlockAudio() {
    if (audio) { if (audio.state === "suspended") audio.resume(); return; }
    try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { audio = null; }
  }
  function tone(freq, dur, type = "square", vol = 0.08, slide = 0) {
    if (!audio || muted) return;
    const t = audio.currentTime;
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(audio.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol = 0.2) {
    if (!audio || muted) return;
    const len = Math.floor(audio.sampleRate * dur);
    const buf = audio.createBuffer(1, len, audio.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = audio.createBufferSource(), g = audio.createGain();
    src.buffer = buf; g.gain.value = vol;
    src.connect(g).connect(audio.destination);
    src.start();
  }
  const sfx = {
    jump: () => tone(330, 0.12, "square", 0.05, 260),
    spring: () => tone(220, 0.25, "triangle", 0.08, 700),
    shoot: () => tone(900, 0.07, "square", 0.04, -600),
    empty: () => tone(120, 0.06, "square", 0.04),
    pick: () => { tone(660, 0.06, "square", 0.05); setTimeout(() => tone(990, 0.08, "square", 0.05), 60); },
    place: () => tone(220, 0.05, "triangle", 0.08),
    boom: () => { noise(0.5, 0.35); tone(90, 0.4, "sawtooth", 0.1, -60); },
    crumble: () => noise(0.25, 0.12),
    death: () => { tone(520, 0.08, "square", 0.06); setTimeout(() => tone(260, 0.3, "square", 0.06, -200), 80); },
    door: () => { tone(440, 0.08); setTimeout(() => tone(660, 0.08), 80); setTimeout(() => tone(880, 0.16), 160); },
    flee: () => tone(700, 0.2, "triangle", 0.06, 500),
    spike: () => tone(1400, 0.05, "square", 0.04, -900),
    god: () => tone(180, 0.18, "triangle", 0.05, 40),
    kill: () => tone(200, 0.15, "square", 0.05, -150),
    arrow: () => tone(1800, 0.04, "triangle", 0.03, -1200),
    swing: () => tone(260, 0.09, "triangle", 0.05, -140),
    bonk: () => { tone(150, 0.08, "square", 0.07, 80); setTimeout(() => tone(900, 0.12, "sine", 0.04, 300), 60); },
    invert: () => { tone(300, 0.15, "sine", 0.06, 300); setTimeout(() => tone(600, 0.15, "sine", 0.06, -300), 120); },
  };

  /* ================= Progression (navigateur du joueur) ================= */
  const progress = { unlocked: 0, best: {}, deaths: 0, stats: {}, tester: false, pieces: 0, amulettes: 3, coinsPris: {} };
  try {
    const s = JSON.parse(localStorage.getItem("temple-progres") || "null");
    if (s && typeof s.unlocked === "number") Object.assign(progress, s);
  } catch (_) {}
  // Sauvegardes d'avant les mondes : les niveaux ont changé d'ordre (monde inca en tête).
  // On retrouve chaque niveau par son numéro d'origine ; on reprend au premier niveau pas encore fini.
  if (!progress.v || progress.v < 2) {
    const vieux = { best: progress.best || {}, stats: progress.stats || {}, coins: progress.coinsPris || {} };
    const aJoue = progress.unlocked > 0 || Object.keys(vieux.best).length > 0;
    progress.best = {}; progress.stats = {}; progress.coinsPris = {};
    LEVELS.forEach((lv, i) => {
      if (!lv.orig) return;
      const o = lv.orig - 1;
      if (vieux.best[o] != null) progress.best[i] = vieux.best[o];
      if (vieux.stats[o]) progress.stats[i] = vieux.stats[o];
      if (vieux.coins[o] && !lv.monde) progress.coinsPris[i] = vieux.coins[o];   // les niveaux refaits ont de nouvelles pièces
    });
    let u = 0;
    while (u < LEVELS.length - 1 && progress.best[u] != null) u++;
    progress.unlocked = aJoue ? u : 0;
    progress.finished = false;
    LEVELS.forEach((lv, i) => { if (lv.monde && !lv.orig) { delete progress.best[i]; delete progress.stats[i]; } });
    progress.v = 4; progress.ids = LEVELS.map((lv) => lv.id);
    try { localStorage.setItem("temple-progres", JSON.stringify(progress)); } catch (_) {}
  }
  // v4 et suite : chaque niveau a un identifiant ; si l'ordre change, la sauvegarde suit les niveaux
  (function suivreLesNiveaux() {
    const ids = LEVELS.map((lv) => lv.id);
    const anciens = progress.ids || (progress.v === 3 ? window.TEMPLE_ORDRE_V3 : progress.v === 2 ? window.TEMPLE_ORDRE_V2 : null);
    if (anciens && anciens.join() !== ids.join()) {
      const ou = new Map(ids.map((id, i) => [id, i]));
      const remap = (o) => { const n = {}; for (const k in o || {}) { const j = ou.get(anciens[k]); if (j != null) n[j] = o[k]; } return n; };
      progress.best = remap(progress.best); progress.stats = remap(progress.stats); progress.coinsPris = remap(progress.coinsPris);
      const avant = progress.unlocked;
      let u = 0; while (u < LEVELS.length - 1 && progress.best[u] != null) u++;
      progress.unlocked = avant > 0 ? u : 0;
      progress.finished = false;
    }
    if (!anciens || anciens.join() !== ids.join() || progress.v !== 4) { progress.ids = ids; progress.v = 4; try { localStorage.setItem("temple-progres", JSON.stringify(progress)); } catch (_) {} }
  })();
  function saveProgress() { try { localStorage.setItem("temple-progres", JSON.stringify(progress)); } catch (_) {} }

  /* ================= État ================= */
  const game = {
    mode: "title", // title | card | play | dead | win | end
    level: 0,
    deathsByRoom: LEVELS.map(() => 0),
    ammo: { tnt: 1 }, coins: 0, coinsTotal: 0,
    timer: 0, paused: false, invert: 0, homeT: 0,
  };
  let R = null;

  // Habitants des abysses (aussi créés en cours de partie par l'action « spawn »)
  function creerAbysse(c, x, y) {
    if (c === "h") return { kind: "h", x: x * T + 3, y: y * T + 3, x0: x * T + 3, y0: y * T + 3, w: 10, h: 10, vx: 0, vy: 0, alive: true, t: (x * 17) % 90, gonfle: 0 };
    if (c === "Z") return { kind: "Z", x: x * T, y: y * T - 2, w: 28, h: 18, vx: 0, vy: 0, alive: true, t: 0, etat: "dort", face: -1 };
    if (c === "M") return { kind: "M", x: x * T + 2, y: y * T + 2, y0: y * T + 2, w: 12, h: 12, vx: 0, vy: 0, alive: true, t: (x * 23) % 100 };
    if (c === "X") return { kind: "X", x: x * T + 1, y: y * T + 4, w: 14, h: 12, vx: 0, vy: 0, alive: true, t: 0, etat: "dort", k: 0, ouv: 0 };
    if (c === "e") return { kind: "e", x: x * T + 3, y: y * T + 3, y0: y * T + 3, w: 10, h: 10, vx: 0, vy: 0, alive: true, t: 0 };
    if (c === "r") return { kind: "r", x: x * T + 2, y: y * T + 8, w: 12, h: 8, vx: -0.5, vy: 0, alive: true, t: 0 };
    return null;
  }

  function buildRoom(index) {
    const def = LEVELS[index];
    const act = ACTS[def.act] || ACTS[0];
    const pal = def.palette || (act ? act.palette : "jungle");
    P = PALETTES[pal] || PALETTES.jungle;
    const tiles = def.map.map((row) => row.split(""));
    ROWS = tiles.length; COLS = tiles[0].length; W = COLS * T; H = ROWS * T;
    const room = {
      def, index, deaths: game.deathsByRoom[index], tiles,
      shakeTiles: new Map(), spikeAnim: new Map(), springAnim: new Map(), wobble: new Set(),
      player: null, door: null, shooters: [],
      enemies: [], pickups: [], arrows: [], dynamites: [], boulders: [], blocks: [], later: [], rival: null,
      particles: [], fired: new Set(), say: null, hint: null, shake: 0, t: 0, bCount: 0,
      torches: [], stuck: [], sink: new Map(), bulles: [], braseros: [], boules: [], glaceFine: new Map(), gz: [],
      lanceurs: [], torpilles: [], fonte: new Map(), grelons: [], braises: [], alarme: 0,
    };
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = tiles[y][x];
        if (c === "P") { room.player = makePlayer(x, y); tiles[y][x] = "."; }
        else if (c === "D") { room.door = { x: x * T + 2, y: y * T - 6, w: 12, h: 22, tx: null, ty: null, moving: false, hidden: !!def.doorHidden }; tiles[y][x] = "."; }
        else if (c === "m") { room.enemies.push({ kind: "m", x: x * T + 2, y: y * T + 1, w: 12, h: 15, vx: -0.45, vy: 0, alive: true, t: Math.random() * 10 }); tiles[y][x] = "."; }
        else if (c === "s") { room.enemies.push({ kind: "s", x: x * T + 2, y: y * T + 9, w: 12, h: 7, vx: -0.9, vy: 0, alive: true, t: Math.random() * 10 }); tiles[y][x] = "."; }
        else if (c === "b") { room.enemies.push({ kind: "b", x: x * T + 3, y: y * T + 4, by: y * T + 4, w: 10, h: 7, vx: 0.7, x0: x * T - 48, x1: x * T + 56, alive: true, t: Math.random() * 10 }); tiles[y][x] = "."; }
        else if (c === "a" || c === "t" || c === "$" || c === "w") { room.pickups.push({ kind: c === "a" ? "coin" : c === "$" ? "gem" : c === "w" ? "sand" : "tnt", x: x * T + 4, y: y * T + 6, w: 8, h: 10, taken: false }); tiles[y][x] = "."; }
        else if (c === "k") { room.enemies.push({ kind: "k", x: x * T + 3, y: y * T + 4, w: 10, h: 12, vx: -0.8, vy: 0, alive: true, t: Math.random() * 10, etat: "rode", butin: 0 }); tiles[y][x] = "."; }
        else if (c === "j") { room.enemies.push({ kind: "j", x: x * T + 1, y: y * T + 6, w: 14, h: 10, vx: 0, vy: 0, alive: true, t: Math.random() * 10, etat: "guette", k: 0, face: -1 }); tiles[y][x] = "."; }
        else if (c === "T") { room.torches.push({ x, y, lit: false }); tiles[y][x] = "."; }
        else if (c === "e") { room.enemies.push({ kind: "e", x: x * T + 3, y: y * T + 3, y0: y * T + 3, w: 10, h: 10, vx: 0, vy: 0, alive: true, t: (x * 13) % 60 }); tiles[y][x] = "."; }
        else if (c === "r") { room.enemies.push({ kind: "r", x: x * T + 2, y: y * T + 8, w: 12, h: 8, vx: -0.5, vy: 0, alive: true, t: Math.random() * 10 }); tiles[y][x] = "."; }
        else if (c === "l") { const dir = x + 1 < COLS && "#B".includes(tiles[y][x + 1]) ? -1 : 1; room.enemies.push({ kind: "l", nid: dir < 0 ? (x + 1) * T : x * T, dir, x: x * T, y: y * T + 5, w: 1, h: 7, vx: 0, vy: 0, out: 0, etat: "cache", k: 0, alive: true, t: 0 }); tiles[y][x] = "."; }
        else if (c === "u") { room.bulles.push({ x, y }); tiles[y][x] = "."; }
        else if (c === "N" || c === "I" || c === "U" || c === "d") { room.enemies.push(creerOr(c, x, y)); tiles[y][x] = "."; }
        else if (c === "O" || c === "E") { room.enemies.push(creerCiel(c, x, y)); tiles[y][x] = "."; }
        else if ("hZMX".includes(c)) { room.enemies.push(creerAbysse(c, x, y)); tiles[y][x] = "."; }
        else if (c === "K") room.lanceurs.push({ x, y, t: (x * 37) % 170 });
        else if (c === "L") { room.enemies.push({ kind: "L", x: x * T + 1, y: y * T + 7, w: 14, h: 9, vx: -0.7, vy: 0, alive: true, t: Math.random() * 10, etat: "rode" }); tiles[y][x] = "."; }
        else if (c === "A") { room.enemies.push({ kind: "A", x: x * T + 2, y: y * T + 4, hx: x * T + 2, hy: y * T + 4, w: 12, h: 8, vx: 0.6, vy: 0, alive: true, t: Math.random() * 10, etat: "plane" }); tiles[y][x] = "."; }
        else if (c === "Y") { room.enemies.push({ kind: "Y", x: x * T + 1, y: y * T + 2, w: 14, h: 14, vx: 0, vy: 0, alive: true, t: (x * 29) % 120, face: -1 }); tiles[y][x] = "."; }
        else if (c === "C") { room.enemies.push({ kind: "C", x: x * T + 1, y: y * T + 5, w: 14, h: 11, vx: -0.4, vy: 0, alive: true, t: Math.random() * 10, etat: "broute" }); tiles[y][x] = "."; }
        else if (c === "S") { room.enemies.push({ kind: "S", x: x * T + 2, y: y * T + 2, w: 12, h: 14, vx: -0.35, vy: 0, alive: true, t: Math.random() * 10 }); tiles[y][x] = "."; }
        else if (c === "f") { room.braseros.push({ x, y }); tiles[y][x] = "."; }
        else if (c === "V") room.gz.push({ x, y, t: (x * 41) % 200, on: false });
        else if (c === "^" || c === "v") room.spikeAnim.set(x + "," + y, 1);
        else if (c === "<" || c === ">" || c === "(" || c === ")") {
          const left = c === "<" || c === "(";
          room.shooters.push({ x: left ? x * T : x * T + T, y: y * T + 6, dir: left ? -1 : 1, poison: c === "(" || c === ")", t: def.arrowSync ? 0 : (x * 7 + y * 13) % 60 });
        }
        else if (c === "B") room.bCount++;
      }
    }
    if (def.doorStart && room.door) { room.door.x = def.doorStart[0] * T + 2; room.door.y = def.doorStart[1] * T - 6; }
    room.decor = genDecor(room, pal);
    for (const [cx, cy] of def.coins || []) room.pickups.push({ kind: "coin", x: cx * T + 4, y: cy * T + 6, w: 8, h: 10, taken: false });
    const pris = (progress.coinsPris || {})[index] || [];
    room.pickups.forEach((it, k) => { it.id = k; if ((it.kind === "coin" || it.kind === "gem") && pris.includes(k)) it.taken = true; });
    room.secrets = room.pickups.filter((it) => it.kind === "gem").length;
    room.dark = !!def.dark;
    room.assist = Math.min(3, Math.floor(room.deaths / 3));   // 0 à 3
    room.slow = 1 - 0.12 * room.assist;                       // vitesse des pièges
    // point de sauvegarde : si Max l'a déjà atteint, il repart de là
    // drapeaux : un seul dans les anciens niveaux, deux dans les niveaux longs ; on repart du dernier atteint
    const drapeaux = def.checkpoints || (def.checkpoint ? [def.checkpoint] : []);
    room.cps = drapeaux.map(([x, y], k) => ({ x, y, k, on: game.cpLevel === index && game.cpIdx >= k }));
    room.cp = game.cpLevel === index ? room.cps[game.cpIdx] || null : null;
    if (room.cp && room.cp.on && room.player) {
      room.player.x = room.cp.x * T + 3; room.player.y = room.cp.y * T + 1;
      // on repart dans l'état du niveau au moment du drapeau : grilles ouvertes, murs détruits,
      // dalles enfoncées, objets ramassés, dynamite en poche
      const snap = game.cpSnap;
      if (snap && snap.level === index) {
        for (let y = 0; y < ROWS; y++) room.tiles[y] = snap.tiles[y].slice();
        room.bCount = snap.bCount;
        room.fired = new Set(snap.fired);
        if (room.door && snap.door) Object.assign(room.door, snap.door);
        room.pickups.forEach((it, k) => { if (snap.taken[k]) it.taken = true; });
        room.enemies.forEach((e, k) => { if (snap.dead[k]) e.alive = false; });
        game.ammo.tnt = snap.tnt;
        if (snap.torches) room.torches.forEach((t, k) => { t.lit = !!snap.torches[k]; });
      }
    }
    // plateformes mobiles : [x, y, largeur, dx, dy, vitesse] en cases
    room.movers = (def.movers || []).map(([x, y, w, dx, dy, sp, style], i) => ({ x0: x * T, y0: y * T, x: x * T, y: y * T, w: w * T, h: 6, dx: dx * T, dy: dy * T, sp, t: i * 40, mx: 0, my: 0, style: style || (def.monde === 4 ? "nuage" : null) }));
    // moulins célestes : [x, y du centre, rayon, vitesse, nombre de pales] — des pales qui tournent comme une grande roue
    for (const [cx, cy, r, sp, n, st] of def.moulins || []) for (let k = 0; k < (n || 4); k++) {
      const a = (k / (n || 4)) * Math.PI * 2, X = cx * T + 8, Y = cy * T + 8;
      room.movers.push({ x: X + Math.cos(a) * r * T - T, y: Y + Math.sin(a) * r * T, w: 2 * T, h: 6, mx: 0, my: 0, t: 0, sp, style: st || "pale", circ: { cx: X, cy: Y, r: r * T, a } });
    }
    // royaume des nuages : orage, souffleurs, pluie, grêle
    room.foudres = (def.eclairs || []).map(([x, per, ph]) => ({ x, per: per || 180, t: ph || 0, bas: 0 }));
    room.souffleurs = (def.souffleurs || []).map(([x, y, dir, len, ph]) => ({ x, y, dir, len: len || 8, t: ph || 0 }));
    room.pluies = (def.pluies || []).map(([a, b]) => ({ x0: a * T, x1: (b + 1) * T }));
    room.grele = (def.grele || []).map(([a, b, per, ph, magma]) => ({ x0: a * T, x1: (b + 1) * T, per: per || 150, t: ph || 0, magma: !!magma }));
    // cité d'or : jets de feu [x, y du sol, hauteur, période, décalage]
    room.jets = (def.jets || []).map(([x, y, h, per, ph]) => ({ x, y, h: h || 3, per: per || 170, t: ph || 0 }));
    // écraseurs : [x, ligne du haut, décalage] ; ils tombent de 3 cases puis remontent
    room.crushers = (def.crushers || []).map(([x, y, ph, drop]) => ({ x: x * T + 1, y0: y * T, y: y * T, w: T - 2, h: T, drop: (drop || 3) * T, t: ph || 0 }));
    room.winds = (def.winds || []).map(([x0, x1, f, per]) => ({ x0: x0 * T, x1: (x1 + 1) * T, f, f0: f, per: per || 0 }));
    room.flood = null; room.timer = 0;
    // eau (monde des abysses) : tout ce qui est sous la ligne `eau` est sous l'eau ; Max y nage et doit respirer
    room.eau = def.eau != null ? def.eau * T : null;
    room.o2 = 1; room.o2Alerte = false;
    // froid de l'Himalaya : une jauge qui se vide, on se réchauffe près des braseros
    room.froid = def.froid ? 1 : null; room.froidAlerte = false;
    room.ski = (def.ski || []).map(([a, b]) => ({ x0: a * T, x1: (b + 1) * T }));
    room.geysers = room.gz;
    // sas : [x, y, hauteur, période, décalage] — une porte de métal qui s'ouvre et se ferme en rythme
    room.sas = (def.sas || []).map(([x, y, h, per, ph]) => ({ x, y, h, per: per || 240, ph: ph || 0, ferme: false, alerte: false }));
    // tourbillons : [x, y, rayon] en cases — ils aspirent Max et brouillent ses commandes
    room.tourbillons = (def.tourbillons || []).map(([x, y, r]) => ({ x: x * T + 8, y: y * T + 8, r: r * T }));
    // poisson-lanterne : il éclaire les abysses noirs et avance de point en point quand Max le rejoint
    room.lanterne = def.lanterne ? { pts: def.lanterne.map(([x, y]) => [x * T + 8, y * T + 8]), i: 0, x: def.lanterne[0][0] * T + 8, y: def.lanterne[0][1] * T + 8 } : null;
    room.blizzard = !!def.blizzard;
    for (const b of room.bulles) { let y = b.y; while (y > 0 && !"#BxJ<>()gG".includes(tiles[y - 1][b.x]) && (room.eau == null || (y - 1) * T >= room.eau - T)) y--; b.top = y; }
    // lianes qui se balancent : [x, y d'accroche, longueur en cases, amplitude (rad), décalage]
    room.vines = (def.vines || []).map(([x, y, len, amp, ph], i) => ({ ax: x * T + 8, ay: y * T, L: len * T, amp: amp || 0.8, w: (2 * Math.PI) / (110 + len * 9), ph: ph != null ? ph : i * 1.7, ang: 0, px: 0, py: 0 }));
    // têtes de jaguar qui crachent du feu : [x, y, sens, longueur, décalage]
    room.flames = (def.flames || []).map(([x, y, dir, len, ph]) => ({ x, y, dir, len: len || 3, t: ph || 0, on: false, warn: false }));
    // rayons du soleil : [x, y, angle de départ, angle d'arrivée, période]
    room.beams = (def.beams || []).map(([x, y, a0, a1, per]) => ({ sx: x * T + 8, sy: y * T + 12, a0, a1, per: per || 300, ang: a0, pts: [] }));
    // salles secrètes : cachées sous de la pierre jusqu'à ce que Max y entre
    room.secretRooms = (def.secrets || []).map(([x, y, w, h]) => ({ x, y, w, h, seen: false, fade: 1 }));
    // boss : le Jaguar de pierre (on l'assomme trois fois, il s'endort)
    room.boss = null; room.rocks = []; room.bossSpikes = [];
    if (def.boss === "yeti") {
      room.boss = { kind: "yeti", x: (COLS - 8) * T, y: (ROWS - 1) * T - 44, w: 40, h: 44, face: -1, etat: "attend", k: 120, hits: 0, vx: 0, vy: 0, t: 0 };
      room.glacons = (def.glacons || []).map(([x, y]) => ({ x: x * T, y: y * T, y0: y * T, w: 2 * T, h: 3 * T, etat: "pend", vy: 0 }));
    }
    if (def.boss === "pieuvre") {
      room.boss = { kind: "pieuvre", x: (COLS - 9) * T, y: 2 * T, w: 7 * T, h: 8 * T, etat: "attend", k: 120, hits: 0, t: 0, tent: null, pause: 0, encre: [] };
      room.boss.coq = (def.coquillages || []).map(([x, y]) => ({ x: x * T - 2, y: y * T, y0: y * T, w: 20, h: 14, etat: "pend", vy: 0, k: 0 }));
    }
    if (def.boss === "oiseau") {
      const cl = (def.cloches || []).map(([x, y]) => ({ x: x * T + 2, y: y * T, sonne: 0 }));
      const ronde = [];
      cl.forEach((c, i) => { ronde.push([c.x + 6, c.y - 30]); const n = cl[(i + 1) % cl.length]; ronde.push([(c.x + n.x) / 2 + 6, Math.min(c.y, n.y) - 5 * T]); });
      room.boss = { kind: "oiseau", x: (COLS - 8) * T, y: 2 * T, w: 44, h: 30, face: -1, etat: "attend", k: 120, hits: 0, t: 0, i: 0, cloches: cl, ronde, nid: def.nid ? [def.nid[0] * T + 8, def.nid[1] * T - 20] : [W / 2, H - 4 * T] };
    }
    if (def.boss === "fouisseur") {
      const [mx, my, mw, mh] = def.machine;
      room.boss = { kind: "fouisseur", x: mx * T, y: my * T, w: mw * T, h: mh * T, etat: "attend", k: 120, hits: 0, t: 0, recharge: 0, caisse: def.caisse,
        chem: (def.cheminees || []).map(([x, y], i) => ({ x: x * T, y: y * T, ph: i * 30, bouchee: false, boum: 0 })) };
    }
    if (def.boss === "jaguar") room.boss = { x: (COLS - 10) * T, y: (ROWS - 1) * T - 41, w: 60, h: 41, face: -1, etat: "attend", k: 110, hits: 0, vx: 0, t: 0 };
    room.mirror = def.mirror ? { axis: def.mirror * T } : null;   // ligne de l'eau : le reflet est symétrique par rapport à elle
    // le professeur Archibald attend à la porte, puis file devant le joueur
    if (room.door && !def.doorHidden && !def.doorStart) room.rival = { x: room.door.x - 22, y: room.door.y + 7, w: 10, h: 15, state: "wait", t: 0, face: -1 };
    return room;
  }

  // Décors purement visuels (toiles, lianes, herbes, torches, os…), placés selon la forme du niveau.
  function genDecor(room, theme) {
    const t = room.tiles, rows = t.length, cols = t[0].length, out = [];
    const at = (x, y) => (y < 0 || y >= rows || x < 0 || x >= cols ? "#" : t[y][x]);
    const stone = (c) => c === "#" || c === "<" || c === ">";
    const rnd = (x, y, k) => { let h = (x * 73856093) ^ (y * 19349663) ^ (k * 83492791) ^ (room.index * 2654435761); h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    const pVine = { cite: 0, nuages: 0, jungle: 0.24, cascades: 0.16, crypte: 0.05, mines: 0.04, sanctuaire: 0.08, abysses: 0.02, himalaya: 0, glace: 0 }[theme] ?? 0.1;
    const eauY = room.def.eau;
    let lastTorch = -99;
    for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
      if (at(x, y) !== ".") continue;
      const up = at(x, y - 1), dn = at(x, y + 1), lf = at(x - 1, y), rt = at(x + 1, y);
      // toiles d'araignée dans les coins du haut
      if (stone(up) && (stone(lf) || stone(rt)) && rnd(x, y, 1) < 0.6) out.push({ k: "web", x, y, side: stone(lf) ? -1 : 1, s: 0.7 + rnd(x, y, 2) * 0.5 });
      // lianes (ou chaînes dans la crypte) qui pendent du plafond
      else if (stone(up) && dn === "." && rnd(x, y, 3) < pVine) {
        let len = 1 + Math.floor(rnd(x, y, 4) * 4);
        while (len > 1 && at(x, y + len - 1) !== ".") len--;
        out.push({ k: theme === "crypte" && rnd(x, y, 5) < 0.6 ? "chain" : "vine", x, y, len, ph: rnd(x, y, 6) * 6 });
      }
      // gouttes d'eau dans les cascades
      if (theme === "cascades" && stone(up) && rnd(x, y, 7) < 0.08) out.push({ k: "drip", x, y, ph: rnd(x, y, 8) * 200 });
      // au sol : herbes, os, cailloux, cristaux
      if (stone(dn) && eauY != null && y >= eauY) {
        if (rnd(x, y, 15) < 0.35) out.push({ k: "algue", x, y, h: 8 + rnd(x, y, 16) * 14, ph: rnd(x, y, 17) * 6 });
        continue;
      }
      if (stone(dn)) {
        const r = rnd(x, y, 9);
        if (r < 0.04) out.push({ k: "bones", x, y, f: rnd(x, y, 10) < 0.5 ? 1 : -1 });
        else if (theme === "sanctuaire" && r < 0.12) out.push({ k: "crystal", x, y, ph: rnd(x, y, 11) * 6 });
        else if (theme === "mines" && r < 0.22) out.push({ k: "pebbles", x, y });
        else if (theme !== "mines" && theme !== "crypte" && theme !== "himalaya" && theme !== "glace" && r < 0.42) out.push({ k: "tuft", x, y, s: rnd(x, y, 12) });
        else if (theme === "crypte" && r < 0.16) out.push({ k: "pebbles", x, y });
      }
      // torches fixées aux murs, une tous les 9 cases au plus
      const wallL = stone(lf) && stone(at(x - 1, y - 1)) && stone(at(x - 1, y + 1));
      const wallR = stone(rt) && stone(at(x + 1, y - 1)) && stone(at(x + 1, y + 1));
      if (theme !== "himalaya" && (eauY == null || y < eauY) && (wallL || wallR) && dn === "." && stone(at(x, y + 2)) && x - lastTorch > 8 && rnd(x, y, 13) < 0.55) {
        out.push({ k: "torch", x, y, side: wallL ? -1 : 1, ph: rnd(x, y, 14) * 6 });
        lastTorch = x;
      }
    }
    return out;
  }

  function makePlayer(tx, ty) {
    return { x: tx * T + 3, y: ty * T + 1, w: 10, h: 15, vx: 0, vy: 0, face: 1, grounded: false, coyote: 0, buffer: 0, alive: true, anim: 0, spring: false, club: 0, shield: 0, invuln: 0, safe: { x: tx * T + 3, y: ty * T + 1 } };
  }

  /* ================= Tuiles ================= */
  function tileAt(x, y) {
    if (x < 0 || x >= COLS) return "#";
    if (y < 0) return "#";
    if (y >= ROWS) return ".";
    return R.tiles[y][x];
  }
  // g = sol glissant, G = grille (s'ouvre avec la bonne dalle), _ = dalle à pression (non solide)
  // q = ressort fragile (casse après un rebond), n = plateforme qui coule
  const isSolid = (c) => c === "#" || c === "B" || c === "x" || c === "J" || c === "<" || c === ">" || c === "(" || c === ")" || c === "g" || c === "G" || c === "q" || c === "n" || c === "z" || c === "i" || c === "y" || c === "V" || c === "K" || c === "H" || c === "~" || c === "%" || c === "*" || c === "{" || c === "}" || c === "8";
  // planches qui clignotent : présentes ~1,6 s, absentes ~1 s, par groupes de deux décalés
  const BLINK = 160, BLINK_ON = 96;
  const blinkPhase = (x) => ((R ? R.t : 0) + (Math.floor(x / 2) % 2) * (BLINK / 2)) % BLINK;
  const blinkOn = (x) => blinkPhase(x) < BLINK_ON;
  const looksStone = (c) => c === "#" || c === "x" || c === "F" || c === "z" || c === "<" || c === ">" || c === "(" || c === ")" || c === "g";
  function solidAt(px, py) { const tx = Math.floor(px / T), c = tileAt(tx, Math.floor(py / T)); return isSolid(c) || (c === "c" && blinkOn(tx)); }
  function rectHitsSolid(x, y, w, h) {
    const x0 = Math.floor(x / T), x1 = Math.floor((x + w - 0.01) / T);
    const y0 = Math.floor(y / T), y1 = Math.floor((y + h - 0.01) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const c = tileAt(tx, ty);
      if (isSolid(c) || (c === "c" && blinkOn(tx))) return true;
    }
    return false;
  }
  function moveBody(b) {
    let hitX = false, hitY = false;
    b.x += b.vx;
    // Max monte sur une marche de quelques pixels (en sortant d'une nacelle ou d'un monte-charge)
    if (R && b === R.player && b.vy >= 0 && rectHitsSolid(b.x, b.y, b.w, b.h)) {
      const pied = b.y + b.h, marche = pied - Math.floor(pied / T) * T;
      if (marche > 0 && marche <= 4 && !rectHitsSolid(b.x, b.y - marche - 0.01, b.w, b.h)) b.y -= marche + 0.01;
    }
    if (rectHitsSolid(b.x, b.y, b.w, b.h)) {
      if (b.vx > 0) b.x = Math.floor((b.x + b.w) / T) * T - b.w;
      else if (b.vx < 0) b.x = Math.floor(b.x / T + 1) * T;
      b.vx = 0; hitX = true;
    }
    b.y += b.vy;
    b.grounded = false;
    if (rectHitsSolid(b.x, b.y, b.w, b.h)) {
      if (b.vy > 0) { b.y = Math.floor((b.y + b.h) / T) * T - b.h; b.grounded = true; }
      else if (b.vy < 0) b.y = Math.floor(b.y / T + 1) * T;
      b.vy = 0; hitY = true;
    }
    return { hitX, hitY };
  }
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  /* ================= Déclencheurs ================= */
  function runTriggers(atStart) {
    const p = R.player;
    R.def.triggers.forEach((tr, i) => {
      if (R.fired.has(i)) return;
      if (tr.after != null && !R.fired.has(tr.after)) return;   // déclencheur qui attend qu'un autre ait eu lieu
      if (tr.min != null && R.deaths < tr.min) return;
      if (tr.max != null && R.deaths > tr.max) return;
      if (tr.allB) { if (atStart || R.bCount > 0) return; }
      else if (!tr.zone) { if (!atStart) return; }
      else {
        if (atStart) return;
        const [zx, zy, zw, zh] = tr.zone;
        if (!p.alive || !overlap(p, { x: zx * T, y: zy * T, w: zw * T, h: zh * T })) return;
        if (tr.air && p.grounded) return;
        if (tr.dir && Math.sign(p.vx) !== tr.dir) return;
      }
      R.fired.add(i);
      tr.act.forEach(doAction);
    });
  }

  function setTiles(x, y, w, h, ch, anim) {
    for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) {
      if (ty < 0 || ty >= ROWS || tx < 0 || tx >= COLS) continue;
      R.tiles[ty][tx] = ch;
      if (ch === "^" || ch === "v") R.spikeAnim.set(tx + "," + ty, anim ? 0 : 1);
    }
  }

  function doAction(a) {
    const [kind, ...v] = a;
    switch (kind) {
      case "say": R.say = { text: v[0], t: 0, dur: 150 + v[0].length * 3 }; sfx.god(); break;
      case "hint": R.hint = { text: v[0], t: 0, dur: 220 }; break;
      case "shake": R.shake = Math.max(R.shake, v[0]); break;
      case "collapse": {
        const [x, y, w, h, delay] = v;
        for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) {
          if (delay > 0) R.shakeTiles.set(tx + "," + ty, delay); else dropTile(tx, ty);
        }
        if (delay <= 0) { sfx.crumble(); R.shake = Math.max(R.shake, 4); }
        break;
      }
      case "spikes": setTiles(v[0], v[1], v[2], v[3], v[4] || "^", R.t > 0); if (R.t > 0) sfx.spike(); break;
      case "set": setTiles(v[0], v[1], v[2], v[3], v[4], false); break;
      case "door": { const d = R.door; d.tx = v[0] * T + 2; d.ty = v[1] * T - 6; d.moving = true; sfx.flee(); break; }
      case "fond": for (let i = 0; i < (v[2] || 1); i++) { const k = (v[0] + i) + "," + v[1], c = tileAt(v[0] + i, v[1]); if (c !== "." && !R.fonte.has(k)) R.fonte.set(k, { t: 16, ch: c === "%" ? "%" : c }); } sfx.crumble(); break;
      case "eclair": R.foudres.push({ x: v[0], per: 0, t: 0, bas: 0 }); sfx.god(); break;
      case "showdoor": { R.door.hidden = false; burst(R.door.x + 6, R.door.y + 10, C.door, 24, 2); sfx.door(); break; }
      case "boulder": {
        const [x, y, dir, sp, casse, neige] = v; const speed = sp * R.slow;
        const t0 = neige ? 14 : 28;   // l'avalanche part petite et grossit en roulant
        R.boulders.push({ x: x * T, y: y * T + (28 - t0), w: t0, h: t0, vx: dir * speed, vy: 0, dir, speed, rot: 0, casse: !!casse, neige: !!neige });
        break;
      }
      case "fall": {
        const [x, y, w, h, delay] = v;
        R.blocks.push({ x: x * T, y: y * T, w: w * T, h: h * T, vy: 0, delay, tiles: [x, y, w, h], falling: false });
        for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) R.wobble.add(tx + "," + ty);
        break;
      }
      case "invert": game.invert = v[0]; sfx.invert(); R.shake = Math.max(R.shake, 3); break;
      case "dark": R.dark = !!v[0]; sfx.flee(); break;
      case "wobble": { const k = v[0] + "," + v[1]; R.wobble.add(k); sfx.crumble(); setTimeout(() => R && R.wobble.delete(k), (v[2] || 60) * 16); break; }
      case "flood": R.flood = { kind: v[0], speed: v[1] * (1 - 0.15 * R.assist), level: (v[2] != null ? v[2] : ROWS) * T, top: v[0] === "plafond" }; if (R.flood.top) R.flood.level = Math.min(v[2] || 0, 1) * T - T;   // un plafond qui descend part toujours du haut R.shake = 6; sfx.crumble(); break;
      case "timer": R.timer = Math.round(v[0] * 60 * (1 + 0.2 * R.assist)); break;
      case "press": R.tiles[v[1]][v[0]] = "-"; sfx.place(); break;
      case "gate": sfx.door(); R.shake = Math.max(R.shake, 3); break;
      case "appear": {
        const [x, y, w, h] = v;
        for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) {
          R.tiles[ty][tx] = "#";
          for (let i = 0; i < 4; i++) R.particles.push({ x: tx * T + Math.random() * T, y: ty * T + Math.random() * 4, vx: (Math.random() - 0.5), vy: -Math.random(), s: 2, life: 26, color: C.gold, g: 0 });
        }
        sfx.pick();
        break;
      }
      case "boum": { const o = R.enemies[v[0]]; if (o) exploserMine(o); break; }
      case "spawn": { const e = creerAbysse(v[0], v[1], v[2]) || creerCiel(v[0], v[1], v[2]); if (e) { R.enemies.push(e); if (e.kind === "Z") { e.etat = "chasse"; sfx.flee(); } burst(e.x + e.w / 2, e.y + e.h / 2, "rgba(210,245,255,0.8)", 10, 1.2); } break; }
      case "courant": R.winds.push({ x0: v[0] * T, x1: (v[1] + 1) * T, f: v[2], f0: v[2], per: 0, dur: v[3] || 180 }); R.shake = Math.max(R.shake, 2); sfx.flee(); break;
      case "later": R.later.push({ t: v[0], act: v.slice(1) }); break;   // actions retardées (pièges en deux temps)
      case "dropspike": {
        const [x, y, delay] = v;
        if (R.tiles[y][x] !== "v") break;
        R.blocks.push({ x: x * T, y: y * T, w: T, h: T, vy: 0, delay, tiles: [x, y, 1, 1], falling: false, spike: true });
        R.wobble.add(x + "," + y);
        break;
      }
    }
  }

  function dropTile(tx, ty) {
    if (ty >= ROWS || tx < 0 || tx >= COLS || tileAt(tx, ty) === ".") return;
    R.tiles[ty][tx] = ".";
    for (let i = 0; i < 3; i++)
      R.particles.push({ x: tx * T + Math.random() * T, y: ty * T + Math.random() * T, vx: (Math.random() - 0.5) * 1.2, vy: Math.random() * -1, s: 3 + Math.random() * 3, life: 60, color: P.stone, g: 0.25 });
  }

  /* ================= Mise à jour ================= */
  function update() {
    if (game.mode === "title" || game.mode === "end") { game.homeT++; return; }
    if (game.paused || game.mode === "relance" || game.mode === "recit") return;
    if (game.mode === "card") {
      pressed.jump = pressed.fire = pressed.tnt = false;
      game.cardT++;
      if (game.cardT > 80) { game.mode = "play"; runTriggers(true); }
      return;
    }
    R.t++;
    if (game.mode === "play") game.timer++;
    if (game.invert > 0) game.invert--;

    updateMovers();
    updateVines();
    if (R.bulles.length) updateBulles();
    if (R.boules.length) updateBoules();
    if (R.geysers.length) updateGeysers();
    for (const w of R.winds) if (w.per) w.f = w.f0 * (Math.floor(R.t / w.per) % 2 ? -1 : 1);
    if (R.winds.some((w) => w.dur)) { for (const w of R.winds) if (w.dur) w.dur--; R.winds = R.winds.filter((w) => w.dur !== 0 || w.dur === undefined); }
    if (R.sas.length) updateSas();
    if (R.tourbillons.length) updateTourbillons();
    if (R.lanterne) updateLanterne();
    if (R.lanceurs.length || R.torpilles.length) updateTorpilles();
    if (R.def.monde >= 4) updateCiel();
    if (R.def.monde === 5) updateOr();
    if (R.blizzard || R.def.palette === "himalaya") neigeQuiTombe();
    updatePlayer();
    updateSink();
    updateFlames();
    updateBeams();
    updateSecrets();
    if (R.boss) { if (R.boss.kind === "yeti") updateYeti(); else if (R.boss.kind === "pieuvre") updatePieuvre(); else if (R.boss.kind === "oiseau") updateOiseauTonnerre(); else if (R.boss.kind === "fouisseur") updateFouisseur(); else updateBoss(); }
    updateCrushers();
    updateFlood();
    updateTilesFx();
    updateDoor();
    updateEnemies();
    updateShooters();
    updateProjectiles();
    updateRival();
    updateDynamites();
    updateBoulders();
    updateBlocks();
    updateParticles();
    if (game.mode === "play") {
      runTriggers(false);
      if (R.later.length) { for (const l of R.later) if (--l.t <= 0) l.act.forEach(doAction); R.later = R.later.filter((l) => l.t > 0); }
      checkHazards(); updateTimer();
    }

    if (R.say) { R.say.t++; if (R.say.t > R.say.dur) R.say = null; }
    if (R.hint) { R.hint.t++; if (R.hint.t > R.hint.dur) R.hint = null; }
    if (R.shake > 0) R.shake -= 0.5;
    if (game.mode === "dead" && ++game.deadT === 32 && offrirRelance()) return;
    if (game.mode === "dead" && game.deadT > 50) restartRoom(true);
    majBoutonPasser();
    if (game.mode === "win" && ++game.winT > 40) { if (R.def.fin) montrerRecit(); else nextRoom(); }
    pressed.jump = pressed.fire = pressed.tnt = false;
  }

  function updatePlayer() {
    const p = R.player;
    if (!p.alive) return;
    if (game.mode === "win") { p.vx *= 0.8; return; }
    let dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (game.invert > 0) dir = -dir;
    if (dir) p.face = dir;
    // sol glissant : Max a du mal à accélérer et à freiner
    const under = p.grounded ? tileAt(Math.floor((p.x + p.w / 2) / T), Math.floor((p.y + p.h + 1) / T)) : "";
    const slip = under === "g";
    const neigeProfonde = under === "z";
    const enSki = R.ski.some((s) => p.x + p.w / 2 > s.x0 && p.x + p.w / 2 < s.x1);
    const inWater = R.flood && !R.flood.top && R.flood.kind === "eau" && p.y + p.h > R.flood.level;
    const run = PHYS.run * (inWater ? 0.6 : 1) * (neigeProfonde ? 0.55 : 1);
    if (enSki) { p.vx += (2.7 - p.vx) * 0.08; p.face = 1; p.ski = true; }   // pente de ski : Max glisse tout seul
    else { p.ski = false; p.vx += (dir * run - p.vx) * (slip ? 0.03 : PHYS.accel); }
    if (Math.abs(p.vx) < 0.05 && !slip) p.vx = 0;
    // vent : pousse Max sur le côté
    for (const w of R.winds) if (p.x + p.w / 2 > w.x0 && p.x + p.w / 2 < w.x1 && !rectHitsSolid(p.x + w.f, p.y, p.w, p.h)) p.x += w.f;

    const nage = R.eau != null && p.y + p.h / 2 > R.eau;
    if (nage) { p.vine = null; p.climb = false; }
    // liane qui se balance : Max s'y accroche en la touchant, SAUT pour lâcher au bon moment
    if (p.vine) {
      const v = p.vine, d = p.vineD;
      const nx = v.ax + Math.sin(v.ang) * d - p.w / 2, ny = v.ay + Math.cos(v.ang) * d - 3;
      p.vx = nx - p.x; p.vy = ny - p.y; p.x = nx; p.y = ny;
      p.face = p.vx >= 0 ? 1 : -1;
      p.anim += 0.05; p.grounded = false; p.coyote = 0;
      if (pressed.jump) {
        p.vine = null; p.vineCd = 20;
        p.vx = Math.max(-3, Math.min(3, p.vx * 1.6 + (dir || p.face) * 1.3));
        p.vy = Math.min(p.vy, 0) - 4.4; p.spring = false;
        sfx.jump();
      }
      if (rectHitsSolid(p.x, p.y, p.w, p.h)) { p.vine = null; p.vineCd = 20; p.x -= p.vx; p.y -= p.vy; }
      return finPlayer(p);
    }
    if (p.vineCd > 0) p.vineCd--;
    else if (!p.grounded) for (const v of R.vines) {
      // point le plus proche de Max sur la liane
      const hx = p.x + p.w / 2, hy = p.y + 3;
      const ux = Math.sin(v.ang), uy = Math.cos(v.ang);
      const d = Math.max(v.L * 0.35, Math.min(v.L, (hx - v.ax) * ux + (hy - v.ay) * uy));
      const qx = v.ax + ux * d, qy = v.ay + uy * d;
      if (Math.abs(hx - qx) < 7 && Math.abs(hy - qy) < 9) {
        p.vine = v; p.vineD = d; p.climb = false; sfx.pick();
        if (!progress.lianeVue) { progress.lianeVue = true; saveProgress(); R.hint = { text: "Liane : appuie sur SAUT pour lâcher au bon moment", t: 0, dur: 220 }; }
        return finPlayer(p);
      }
    }
    // cordes : SAUT maintenu = grimper, relâché = glisser doucement, ◀ ▶ = sauter de côté
    const rx = Math.floor((p.x + p.w / 2) / T);
    const surCorde = tileAt(rx, Math.floor((p.y + p.h / 2) / T)) === "|" || tileAt(rx, Math.floor((p.y + 3) / T)) === "|";
    if (p.ropeCd > 0) p.ropeCd--;
    if (!p.climb && surCorde && !(p.ropeCd > 0) && (input.jump || !p.grounded) && p.vy > -4) {
      p.climb = true; p.buffer = 0; p.spring = false;
      if (!progress.cordeVue) { progress.cordeVue = true; saveProgress(); R.hint = { text: "Maintiens SAUT pour grimper, lâche pour redescendre, ◀ ▶ pour sauter de côté", t: 0, dur: 240 }; }
    }
    if (p.climb && (!surCorde || dir)) {
      p.climb = false;
      if (dir && surCorde) { p.ropeCd = 18; p.vx = dir * PHYS.run; p.vy = -4.4; sfx.jump(); }
    }
    if (p.climb) {
      p.vx = 0;
      p.x += (rx * T + 3 - p.x) * 0.4;
      const tete = tileAt(rx, Math.floor((p.y + 2) / T)) === "|";
      p.vy = input.jump ? (tete ? -1.4 : 0) : 0.8;
      p.coyote = 0;
      moveBody(p);
      if (p.grounded && !input.jump) p.climb = false;
      p.anim += 0.12;
    } else if (nage) {
      // sous l'eau : on flotte, SAUT = une brasse ; près de la surface, SAUT fait sortir de l'eau
      p.swim = true;
      const algue = tileAt(Math.floor((p.x + p.w / 2) / T), Math.floor((p.y + p.h / 2) / T)) === "Q";
      p.vx += (dir * 1.45 * (algue ? 0.5 : 1) - p.vx) * 0.12;
      if (algue) p.vy *= 0.94;
      if (p.stroke > 0) p.stroke--;
      if (pressed.jump) {
        if (p.y < R.eau + 3 && !rectHitsSolid(p.x, p.y - 8, p.w, 8)) { p.vy = PHYS.jump * 0.95; sfx.jump(); }
        else if (!(p.stroke > 0)) { p.vy = Math.min(p.vy, -2.5); p.stroke = 10; sfx.swing(); for (let i = 0; i < 3; i++) R.particles.push({ x: p.x + 5, y: p.y + 2, vx: (Math.random() - 0.5) * 0.6, vy: -0.5 - Math.random() * 0.5, s: 2, life: 40, color: "rgba(200,240,255,0.8)", g: -0.01 }); }
      }
      if (input.jump && p.vy > -1.2) p.vy -= 0.1;   // SAUT maintenu : on remonte doucement vers la surface
      p.vy = Math.min(p.vy * 0.985 + 0.07, 1.1);
      for (const b of R.bulles) if (p.x + p.w > b.x * T + 2 && p.x < b.x * T + 14 && p.y + p.h > b.top * T && p.y < (b.y + 1) * T) { p.vy = Math.max(p.vy - 0.35, -2.6); p.dansBulles = true; }
      p.coyote = 0;
      const prevBottom = p.y + p.h;
      moveBody(p);
      landOnMovers(p, prevBottom);
      p.anim += 0.06 + Math.abs(p.vx) * 0.12;
    } else {
    p.swim = false;
    p.coyote = p.grounded ? PHYS.coyote : p.coyote - 1;
    if (pressed.jump) p.buffer = PHYS.buffer; else p.buffer--;
    if (p.buffer > 0 && p.coyote > 0) { p.vy = PHYS.jump * (neigeProfonde ? 0.82 : 1); p.buffer = 0; p.coyote = 0; sfx.jump(); if (p.onMover && Math.abs(p.onMover.mx) > 0.6) p.elan = p.onMover.mx; }
    if (p.elan) { if (p.grounded && p.vy >= 0) p.elan = 0; else { if (!rectHitsSolid(p.x + p.elan, p.y, p.w, p.h)) p.x += p.elan; p.elan *= 0.985; if (Math.abs(p.elan) < 0.05) p.elan = 0; } }
    if (!input.jump && p.vy < PHYS.jumpCut && !p.spring) p.vy = PHYS.jumpCut;
    if (p.vy >= 0) p.spring = false;
    p.vy = Math.min(p.vy + PHYS.gravity * (inWater ? 0.55 : 1), inWater ? 2.2 : PHYS.maxFall);
    if (R.pluies && R.pluies.length && R.pluies.some((z) => dansColonnes(z, p))) p.vy = Math.min(p.vy + 0.13, PHYS.maxFall);
    const prevBottom = p.y + p.h;
    moveBody(p);
    landOnMovers(p, prevBottom);
    p.anim += Math.abs(p.vx) * 0.25;
    }

    if (p.grounded) {
      const fy = Math.floor((p.y + p.h + 1) / T);
      const fx0 = Math.floor(p.x / T), fx1 = Math.floor((p.x + p.w - 0.01) / T);
      const mid = Math.floor((p.x + p.w / 2) / T);
      for (const fx of [fx0, fx1]) {
        if (tileAt(fx, fy) === "x" && !R.shakeTiles.has(fx + "," + fy)) R.shakeTiles.set(fx + "," + fy, 12);
      }
      const sous = tileAt(mid, fy);
      for (const fx of [fx0, fx1]) if (tileAt(fx, fy) === "%" && !R.fonte.has(fx + "," + fy)) R.fonte.set(fx + "," + fy, { t: 0 });
      if (sous === "{" || sous === "}") { const v = sous === "}" ? 0.95 : -0.95; if (!rectHitsSolid(p.x + v, p.y, p.w, p.h)) p.x += v; }
      if (sous === "*") {
        // nuage-trampoline : chaque rebond enchaîné monte un peu plus haut
        p.rebond = R.t - (p.dernierRebond || -99) < 50 ? Math.min(3, (p.rebond || 0) + 1) : 0; p.dernierRebond = R.t;
        p.vy = PHYS.spring * (1 + 0.09 * p.rebond); p.spring = true; p.coyote = 0;
        R.springAnim.set(mid + "," + fy, 10); sfx.spring();
      }
      if (sous === "J" || sous === "q") {
        p.vy = PHYS.spring; p.spring = true; p.coyote = 0;
        R.springAnim.set(mid + "," + fy, 10);
        sfx.spring();
        if (sous === "q") {   // ressort fragile : il casse après ce rebond
          R.tiles[fy][mid] = ".";
          R.shake = Math.max(R.shake, 2);
          for (let i = 0; i < 8; i++) R.particles.push({ x: mid * T + 8, y: fy * T + 10, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2, s: 2, life: 40, color: i % 2 ? C.metal : C.wood, g: 0.2 });
          sfx.crumble();
          if (!progress.ressortVu) { progress.ressortVu = true; saveProgress(); R.hint = { text: "Ce ressort était fragile : il s'est cassé !", t: 0, dur: 180 }; }
        }
      }
      for (const fx of [fx0, fx1]) if (tileAt(fx, fy) === "n" && !R.sink.has(fx + "," + fy)) R.sink.set(fx + "," + fy, 0);
      // planches du pont de corde : elles lâchent peu après le passage de Max
      for (const fx of [fx0, fx1]) if (tileAt(fx, fy) === "y" && !R.shakeTiles.has(fx + "," + fy)) R.shakeTiles.set(fx + "," + fy, 26);
      // glace fine : elle craque si Max reste immobile dessus
      for (const fx of new Set([fx0, fx1])) if (tileAt(fx, fy) === "i") {
        const k = fx + "," + fy, v = (R.glaceFine.get(k) || 0) + (Math.abs(p.vx) < 0.4 ? 1.6 : 0.2);
        R.glaceFine.set(k, v);
        if (v > 50 && v - 1.6 <= 50) sfx.crumble();
        if (v > 100) { R.glaceFine.delete(k); dropTile(fx, fy); sfx.crumble(); R.shake = Math.max(R.shake, 3); if (!progress.glaceVue) { progress.glaceVue = true; saveProgress(); R.hint = { text: "La glace a cédé : ne reste jamais immobile sur un lac gelé !", t: 0, dur: 200 }; } }
      }
    }

    // coup de massue : assomme ce qui se trouve juste devant
    if (pressed.fire && p.club <= 0) { p.club = 18; sfx.swing(); }
    if (p.club > 0) {
      p.club--;
      if (p.club >= 6 && p.club <= 13) {
        const hit = { x: p.face > 0 ? p.x + p.w - 2 : p.x - 14, y: p.y - 2, w: 16, h: 17 };
        for (const e of R.enemies) if (e.alive && !e.stun && overlap(hit, e)) stunEnemy(e, p.face);
        for (const a of R.arrows) if (!a.poison && !a.dead && overlap(hit, a)) breakArrow(a);
        for (const q of R.torpilles) if (!q.dead && overlap(hit, q)) { q.dead = true; burst(q.x + 3, q.y + 6, "#ffd36b", 12, 1.6); sfx.bonk(); }
        if (R.boss && !R.boss.kind && overlap(hit, gemRect(R.boss))) bossTouche();
        if (R.boss && R.boss.kind === "oiseau") for (const c of R.boss.cloches) if (overlap(hit, { x: c.x - 4, y: c.y - 6, w: 20, h: 22 })) sonnerCloche(c);
        if (R.boss && R.boss.kind === "pieuvre") for (const c of R.boss.coq) if (c.etat === "pend" && overlap(hit, { x: c.x + 6, y: T, w: 6, h: c.y - T })) { c.etat = "tombe"; c.vy = 0; sfx.swing(); burst(c.x + 9, c.y - 6, "#2e8c56", 10, 1.2); }
      }
    }
    if (pressed.tnt) {
      if (game.ammo.tnt > 0 && R.dynamites.length < 2) {
        game.ammo.tnt--;
        R.dynamites.push({ x: p.x + p.w / 2 - 3, y: p.y + p.h - 9, w: 6, h: 9, vx: 0, vy: 0, fuse: 96 });
        sfx.place();
      } else if (game.ammo.tnt <= 0) { sfx.empty(); game.flash = { what: "tnt", t: 30 }; }
    }

    for (const it of R.pickups) {
      if (!it.taken && overlap(p, it)) {
        it.taken = true;
        if (it.kind === "gem") {
          progress.pieces = (progress.pieces || 0) + 10;
          progress.secrets = (progress.secrets || 0) + 1;
          const cp = (progress.coinsPris = progress.coinsPris || {});
          (cp[R.index] = cp[R.index] || []).push(it.id);
          saveProgress();
          sfx.door(); R.shake = Math.max(R.shake, 2);
          burst(it.x + 4, it.y + 4, C.jade, 20, 2);
          R.hint = { text: "Trésor secret ! +10 pièces d'or", t: 0, dur: 180 };
        } else if (it.kind === "coin") {
          game.coins++; game.coinsTotal++;
          progress.pieces = (progress.pieces || 0) + 1;
          const cp = (progress.coinsPris = progress.coinsPris || {});
          (cp[R.index] = cp[R.index] || []).push(it.id);
          saveProgress();
        } else if (it.kind === "sand") {
          if (R.timer) R.timer += 10 * 60;
          R.hint = { text: "Sablier : +10 secondes !", t: 0, dur: 120 };
        } else if (it.kind === "coin2") {
          progress.pieces = (progress.pieces || 0) + 1; game.coins++; saveProgress();
        } else game.ammo.tnt += 1;
        sfx.pick();
        burst(it.x + 4, it.y + 4, C.hat, 8);
      }
    }
    const cpNouv = R.cps.find((c) => !c.on && overlap(p, { x: c.x * T, y: c.y * T - 8, w: T, h: T + 8 }));
    if (cpNouv) {
      for (const c of R.cps) if (c.k <= cpNouv.k) c.on = true;
      R.cp = cpNouv; game.cpLevel = R.index; game.cpIdx = cpNouv.k;
      // photo du niveau au moment du drapeau (les déclencheurs « au départ » seront rejoués)
      game.cpSnap = {
        level: R.index,
        tiles: R.tiles.map((r) => r.map((c) => (c === "-" ? "-" : c))),
        bCount: R.bCount,
        fired: [...R.fired].filter((i) => R.def.triggers[i].zone || R.def.triggers[i].allB),
        door: R.door ? { x: R.door.x, y: R.door.y, tx: R.door.tx, ty: R.door.ty, moving: false, hidden: R.door.hidden } : null,
        taken: R.pickups.map((it) => it.taken),
        dead: R.enemies.map((e) => !e.alive),
        tnt: game.ammo.tnt,
        torches: R.torches.map((t) => t.lit),
      };
      if (R.door && R.door.moving) { game.cpSnap.door.x = R.door.tx; game.cpSnap.door.y = R.door.ty; }
      sfx.pick(); burst(R.cp.x * T + 8, R.cp.y * T, C.gold, 14, 1.6);
      R.hint = { text: "Drapeau ! Si tu tombes, tu repartiras d'ici.", t: 0, dur: 160 };
    }
    for (const tc of R.torches) if (!tc.lit && overlap(p, { x: tc.x * T, y: tc.y * T - 8, w: T, h: T + 8 })) {
      tc.lit = true; sfx.pick(); burst(tc.x * T + 8, tc.y * T + 2, "#ffb347", 14, 1.4);
      if (!progress.torcheVue) { progress.torcheVue = true; saveProgress(); R.hint = { text: "Torche allumée : elle éclaire le chemin !", t: 0, dur: 160 }; }
    }
    finPlayer(p);
  }

  function sentirLeFroid(p) {
    if (R.froid == null || game.mode !== "play") return;
    const chaud = R.braseros.some((b) => Math.abs(b.x * T + 8 - (p.x + p.w / 2)) < 36 && Math.abs(b.y * T + 8 - (p.y + p.h / 2)) < 40);
    if (chaud) R.froid = Math.min(1, R.froid + 0.02);
    else R.froid -= 1 / (24 * 60) / (1 + 0.25 * R.assist);
    if (R.froid < 0.3 && !R.froidAlerte) { R.froidAlerte = true; R.hint = { text: "Max grelotte ! Vite, un brasero pour se réchauffer", t: 0, dur: 200 }; }
    if (R.froid > 0.6) R.froidAlerte = false;
    if (R.froid <= 0) { R.froid = 0; kill("Max est gelé comme un glaçon !", "flood"); }
  }

  function respirer(p) {
    if (R.eau == null || game.mode !== "play") return;
    const sousLeau = p.y + 3 > R.eau;
    if (p.dansBulles) { R.o2 = Math.min(1, R.o2 + 0.012); p.dansBulles = false; }
    else if (sousLeau) R.o2 -= 1 / (13 * 60) / (1 + 0.25 * R.assist);
    else R.o2 = Math.min(1, R.o2 + 0.04);
    if (sousLeau && R.t % 50 === 0) R.particles.push({ x: p.x + (p.face > 0 ? 8 : 2), y: p.y + 3, vx: 0, vy: -0.6, s: 2, life: 50, color: "rgba(200,240,255,0.7)", g: -0.005 });
    if (R.o2 < 0.3 && !R.o2Alerte) { R.o2Alerte = true; R.hint = { text: "Plus beaucoup d'air : remonte respirer ou trouve des bulles !", t: 0, dur: 200 }; }
    if (R.o2 > 0.6) R.o2Alerte = false;
    if (R.o2 <= 0) { R.o2 = 0; kill("Plus d'air ! Il fallait remonter respirer.", "flood"); }
  }

  function finPlayer(p) {
    respirer(p);
    sentirLeFroid(p);
    for (const gz of R.geysers) if (gz.on && p.alive && p.x + p.w > gz.x * T + 1 && p.x < gz.x * T + 15 && p.y + p.h > (gz.y - 6) * T && p.y + p.h <= gz.y * T + 2) { p.vy = Math.min(p.vy, -7.4); p.spring = true; p.grounded = false; }
    const d = R.door;
    if (d && !d.moving && !d.hidden && overlap(p, { x: d.x + 3, y: d.y + 4, w: d.w - 6, h: d.h - 4 })) {
      game.mode = "win"; game.winT = 0; sfx.door();
    }
    if (p.y > H + 20) kill(null, "fall");
    if (p.invuln > 0) p.invuln--;
    // dernier endroit sûr (pour « Repartir d'ici ») : sur de la vraie pierre, loin des pics
    if (p.grounded && !p.onMover) {
      const fx = Math.floor((p.x + p.w / 2) / T), fy = Math.floor((p.y + p.h + 1) / T), my = Math.floor((p.y + 8) / T);
      const ok = tileAt(fx, fy) === "#" && tileAt(fx - 1, fy) === "#" && tileAt(fx + 1, fy) === "#" &&
        ![-1, 0, 1].some((d) => "^v".includes(tileAt(fx + d, my))) && !R.crushers.some((c) => Math.abs(c.x - fx * T) < 32);
      if (ok) p.safe = { x: fx * T + 3, y: p.y };
    }
  }

  /* ---------- Le Yéti grognon ---------- */
  // La pieuvre géante : ses tentacules frappent le sol là où se trouve Max, puis restent coincées un moment.
  // Il faut couper l'algue qui retient un coquillage géant pour qu'il tombe sur une tentacule coincée. Trois coups.
  /* ================= Royaume des nuages ================= */
  // ~ nuage, % nuage qui fond, : faux nuage (ne porte rien), * nuage-trampoline
  function creerCiel(c, x, y) {
    if (c === "O") return { kind: "O", x: x * T + 2, y: y * T + 4, y0: y * T + 4, w: 12, h: 8, vx: 0, vy: 0, alive: true, t: (x * 7) % 30, etat: "attend" };
    if (c === "E") return { kind: "E", x: x * T + 3, y: y * T + 4, w: 10, h: 12, vx: 0, vy: 0, alive: true, t: (x * 11) % 60, c: (x * 13) % 50 };
    return null;
  }
  const dansColonnes = (z, p) => p.x + p.w / 2 > z.x0 && p.x + p.w / 2 < z.x1;
  // oiseau migrateur : il attend que Max approche, puis traverse le ciel en ligne droite
  function updateOiseau(e) {
    const p = R.player;
    if (e.etat === "attend") { e.y = e.y0 + Math.sin(R.t / 12 + e.x) * 2; if (p.alive && e.x - p.x < 230 && e.x - p.x > -40) { e.etat = "vole"; e.vx = -1.35 * R.slow; } return; }
    e.x += e.vx; e.y = e.y0 + Math.sin(R.t / 9 + e.x / 30) * 3;
    if (e.x < -30) e.alive = false;
  }
  // petit éclair vivant : il sautille sur son nuage, sans jamais tomber
  function updateEtincelle(e) {
    const p = R.player;
    e.vy = Math.min(e.vy + PHYS.gravity, PHYS.maxFall);
    if (e.vx) {
      const devant = e.vx > 0 ? e.x + e.w + 2 : e.x - 2;
      let sol = false; for (let k = 0; k < 4; k++) if (solidAt(devant, e.y + e.h + 1 + k * T)) sol = true;
      if (!sol) e.vx = 0;
    }
    const avant = e.grounded;
    moveBody(e);
    if (e.grounded) { e.vx = 0; if (!avant) burst(e.x + 5, e.y + e.h, "#ffe680", 4, 0.8); }
    if (e.grounded && ++e.c > 46) {
      e.c = 0; e.vy = -3.6;
      if (p.alive && Math.abs(p.x - e.x) < 140 && Math.abs(p.y - e.y) < 60) e.vx = (p.x > e.x ? 0.7 : -0.7) * R.slow;
    }
    if (e.y > H + 20) e.alive = false;
  }
  function updateCiel() {
    const p = R.player;
    // nuages qui fondent sous les pieds, puis reviennent
    for (const [k, f] of R.fonte) {
      const [x, y] = k.split(",").map(Number);
      if (f.t >= 0) { if (++f.t >= 38) { R.tiles[y][x] = "."; f.t = -1; f.back = 260; burst(x * T + 8, y * T + 6, "rgba(255,255,255,0.9)", 6, 0.8); } }
      else if (--f.back <= 0) {
        if (p.alive && overlap(p, { x: x * T, y: y * T, w: T, h: T })) f.back = 20;
        else { R.tiles[y][x] = f.ch || "%"; R.fonte.delete(k); }
      }
    }
    // orage : une ombre annonce l'éclair qui frappe toute la colonne
    for (const f of R.foudres) {
      f.t += f.per ? R.slow : 1;
      const per = f.per || 1e9, ph = f.per ? f.t % per : f.t;
      const avant = f.per ? per - 70 : 0, frappe = f.per ? per - 14 : 56;
      f.warn = ph >= avant && ph < frappe; f.on = ph >= frappe && ph < frappe + 14;
      if (f.on && !f.son) { f.son = true; sfx.boom(); R.shake = Math.max(R.shake, 4); }
      if (!f.on) f.son = false;
      if (!f.per && f.t > 74) f.fini = true;
      if (f.on || f.warn) { let y = 0; while (y < ROWS && !isSolid(tileAt(f.x, y))) y++; f.bas = y * T; }
    }
    R.foudres = R.foudres.filter((f) => !f.fini);
    // nuages souffleurs : ils gonflent les joues, puis soufflent Max hors des nuages
    for (const s of R.souffleurs) {
      s.t += R.slow;
      const ph = s.t % 220;
      s.joues = ph > 110 && ph < 145; s.souffle = ph >= 145;
      if (s.souffle && p.alive) {
        const x0 = s.dir > 0 ? (s.x + 1) * T : (s.x - s.len) * T, x1 = x0 + s.len * T;
        if (p.x + p.w > x0 && p.x < x1 && p.y + p.h > (s.y - 3) * T && p.y < (s.y + 3) * T && !rectHitsSolid(p.x + s.dir * 0.95, p.y, p.w, p.h)) p.x += s.dir * 0.95;
      }
    }
    // grêle : des grêlons tombent par vagues, leur ombre les annonce
    for (const g of R.grele) {
      if ((g.t += R.slow) >= g.per) {
        g.t = 0;
        const n = 3;
        for (let i = 0; i < n; i++) R.grelons.push({ x: g.x0 + Math.random() * (g.x1 - g.x0 - 8), y: cam.y - 20 - i * 26, vy: 0, warn: 50 + i * 12, w: 7, h: 7, magma: g.magma });
      }
    }
    for (const q of R.grelons) {
      if (q.warn > 0) { q.warn--; continue; }
      q.vy = Math.min(q.vy + 0.18, 4.2); q.y += q.vy;
      if (solidAt(q.x + 3, q.y + 7)) { q.dead = true; burst(q.x + 3, q.y + 5, q.magma ? "#ff9a2a" : "#e8f4ff", 6, 1); sfx.crumble(); }
      if (q.y > H + 20) q.dead = true;
    }
    R.grelons = R.grelons.filter((q) => !q.dead);
  }
  function solDessous(x) { let y = Math.max(0, Math.floor(cam.y / T)); while (y < ROWS && !isSolid(tileAt(x, y))) y++; return y; }
  function dangersCiel(p) {
    for (const f of R.foudres) if (f.on && p.x + p.w > f.x * T + 2 && p.x < f.x * T + T - 2 && p.y < f.bas) return kill("Foudroyé ! L'ombre sur le nuage annonce l'éclair.");
    for (const q of R.grelons) if (q.warn <= 0 && overlap(p, q)) return kill(q.magma ? "Une pierre en fusion ! Son ombre l'annonçait." : "Un grêlon sur le chapeau ! Regarde les ombres.");
    return false;
  }

  // ----- l'Oiseau-tonnerre : on fait sonner la cloche quand il passe à côté -----
  function updateOiseauTonnerre() {
    const b = R.boss, p = R.player;
    b.t++;
    for (const c of b.cloches) if (c.sonne > 0) c.sonne--;
    if (b.etat === "attend") { if (--b.k <= 0) b.etat = "vole"; }
    if (b.etat === "dort") {
      b.x += (b.nid[0] - b.x) * 0.04; b.y += (b.nid[1] - b.y) * 0.04;
      if (b.k > 0 && --b.k === 0) doAction(["showdoor"]);
      if (R.t % 50 === 0) R.particles.push({ zzz: true, x: b.x + b.w / 2, y: b.y - 2, vx: 0.2, vy: -0.4, s: 6, life: 70, color: C.text, g: 0 });
      return;
    }
    if (b.etat === "sonne") {
      b.y += Math.sin(b.t / 6) * 0.6 + 0.15; b.x += Math.sin(b.t / 9) * 0.5;
      if (--b.k <= 0) b.etat = "vole";
      return;
    }
    if (b.etat !== "vole") return;
    // vol : il suit sa ronde, et passe juste au-dessus de chaque cloche
    const cible = b.ronde[b.i], dx = cible[0] - (b.x + b.w / 2), dy = cible[1] - (b.y + b.h / 2), d = Math.hypot(dx, dy);
    const v = (1.25 + 0.3 * b.hits) * R.slow;
    if (d < v + 1) b.i = (b.i + 1) % b.ronde.length;
    else { b.x += (dx / d) * v; b.y += (dy / d) * v; b.face = dx < 0 ? -1 : 1; }
    // il fait tomber la foudre sur Max
    if (p.alive && b.t % Math.max(120, 190 - 30 * b.hits) === 0) {
      R.foudres.push({ x: Math.floor((p.x + p.w / 2) / T), per: 0, t: 0 }); sfx.god();
    }
  }
  function sonnerCloche(c) {
    const b = R.boss;
    if (c.sonne > 0) return;
    c.sonne = 40; sfx.bonk(); setTimeout(() => sfx.door(), 90);
    for (let i = 0; i < 3; i++) R.particles.push({ x: c.x + 6, y: c.y, vx: (i - 1) * 0.8, vy: -0.8, s: 3, life: 30, color: C.gold, g: 0 });
    if (b.etat !== "vole") return;
    const d = Math.hypot(b.x + b.w / 2 - (c.x + 6), b.y + b.h / 2 - (c.y + 6));
    if (d < 64) {
      b.hits++; R.shake = 10; burst(b.x + b.w / 2, b.y + b.h / 2, "#ffe680", 24, 2.4);
      if (b.hits >= 3) { b.etat = "dort"; b.k = 90; R.foudres = []; R.hint = { text: "BONG ! L'Oiseau-tonnerre est tout étourdi… il se pose et s'endort, la tête sous l'aile.", t: 0, dur: 260 }; }
      else { b.etat = "sonne"; b.k = 130; R.hint = { text: b.hits === 1 ? "BONG ! Il est étourdi ! Encore deux cloches…" : "BONG ! Plus qu'une !", t: 0, dur: 160 }; }
    } else if (!R.hint && b.hits === 0) R.hint = { text: "Trop tôt ! Sonne quand l'oiseau passe juste au-dessus de la cloche", t: 0, dur: 170 };
  }
  function drawOiseauTonnerre() {
    const b = R.boss, dort = b.etat === "dort", sonne = b.etat === "sonne";
    // nid
    const [nx, ny] = b.nid;
    ctx.fillStyle = "#a0784a"; ctx.beginPath(); ctx.ellipse(nx, ny + 22, 34, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#6e5030"; ctx.lineWidth = 1; for (let i = -30; i < 30; i += 5) { ctx.beginPath(); ctx.moveTo(nx + i, ny + 16); ctx.lineTo(nx + i + 8, ny + 27); ctx.stroke(); }
    // cloches
    for (const c of b.cloches) {
      const sw = c.sonne > 0 ? Math.sin(c.sonne / 2) * 0.5 : Math.sin(R.t / 40 + c.x) * 0.05;
      ctx.strokeStyle = "#8a6a3a"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(c.x + 6, c.y - 22); ctx.lineTo(c.x + 6, c.y - 2); ctx.stroke();
      ctx.save(); ctx.translate(c.x + 6, c.y - 2); ctx.rotate(sw);
      ctx.fillStyle = "#e0b040"; ctx.beginPath(); ctx.moveTo(-3, 0); ctx.quadraticCurveTo(-4, 6, -8, 13); ctx.lineTo(8, 13); ctx.quadraticCurveTo(4, 6, 3, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#fff1c1"; ctx.fillRect(-3, 3, 2, 7);
      ctx.fillStyle = "#8a6a2a"; ctx.beginPath(); ctx.arc(0, 14, 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (c.sonne > 0) { ctx.strokeStyle = `rgba(255,230,128,${c.sonne / 40})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(c.x + 6, c.y + 6, 14 + (40 - c.sonne) * 0.6, 0, Math.PI * 2); ctx.stroke(); }
    }
    // l'oiseau, fait de nuages et d'éclairs
    ctx.save();
    ctx.translate(Math.round(b.x + b.w / 2), Math.round(b.y + b.h / 2));
    if (b.face < 0) ctx.scale(-1, 1);
    const bat = dort ? 0 : Math.sin(b.t / (sonne ? 4 : 7));
    ctx.fillStyle = sonne ? "#d6d0f2" : "#b8c0e8";
    // ailes
    if (dort) { ctx.beginPath(); ctx.ellipse(-2, 4, 24, 12, 0, 0, Math.PI * 2); ctx.fill(); }
    else for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(-4, -2); ctx.quadraticCurveTo(-26, -18 - bat * 14 * s, -38, -4 - bat * 18 * s); ctx.quadraticCurveTo(-22, 2, -4, 6); ctx.fill();
    }
    // corps nuageux
    ctx.fillStyle = sonne ? "#f0ecff" : "#e2e6fb";
    for (const [cx, cy, r] of [[-10, 2, 11], [2, -2, 13], [12, 3, 10], [0, 8, 10]]) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); }
    // queue en éclairs
    ctx.strokeStyle = "#ffd34a"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-20, 4); ctx.lineTo(-28, 0); ctx.lineTo(-26, 6); ctx.lineTo(-36, 3); ctx.stroke();
    if (!dort) {
      // tête et bec
      ctx.fillStyle = "#e2e6fb"; ctx.beginPath(); ctx.arc(18, -8, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f2c14e"; ctx.beginPath(); ctx.moveTo(24, -9); ctx.lineTo(33, -6); ctx.lineTo(24, -4); ctx.fill();
      ctx.fillStyle = "#2a2f4a";
      if (sonne) { ctx.font = "bold 7px monospace"; ctx.fillText("@", 16, -6); } else ctx.fillRect(19, -11, 3, 3);
      ctx.fillStyle = "#ffd34a"; ctx.beginPath(); ctx.moveTo(14, -16); ctx.lineTo(17, -24); ctx.lineTo(19, -15); ctx.fill();
    }
    ctx.restore();
    if (sonne) drawStars(b.x + b.w / 2 + 14 * b.face, b.y + 2, b.k);
  }

  function drawNuage(px, py, x, y, alpha, teinte) {
    const g = (xx) => { const c = tileAt(xx, y); return c === "~" || c === "%" || c === ":" || c === "*"; };
    const gch = g(x - 1), dr = g(x + 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = teinte || "#ffffff";
    ctx.fillRect(px + (gch ? 0 : 3), py + 4, T - (gch ? 0 : 3) - (dr ? 0 : 3), 9);
    ctx.beginPath(); ctx.arc(px + 8, py + 5 + ((x * 5) % 3) * 0.5, 6 + (x % 2), 0, Math.PI * 2); ctx.fill();
    if (!gch) { ctx.beginPath(); ctx.arc(px + 4, py + 9, 5, 0, Math.PI * 2); ctx.fill(); }
    if (!dr) { ctx.beginPath(); ctx.arc(px + 12, py + 9, 5, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "rgba(120,140,215,0.75)"; ctx.fillRect(px + (gch ? 0 : 3), py + 12, T - (gch ? 0 : 3) - (dr ? 0 : 3), 2);
    ctx.fillStyle = "rgba(90,105,180,0.55)"; ctx.fillRect(px + (gch ? 0 : 4), py + 14, T - (gch ? 0 : 4) - (dr ? 0 : 4), 1);
    ctx.globalAlpha = 1;
  }
  function drawTuileCiel(c, px, py, x, y) {
    if (c === "~") { const f = R.fonte.get(x + "," + y), k = f && f.t > 0 ? f.t / 38 : 0; drawNuage(px + (k ? Math.sin(R.t) * k : 0), py + k * 3, x, y, 1 - 0.7 * k); return true; }
    if (c === ":") { drawNuage(px, py, x, y, 0.93 + 0.05 * Math.sin(R.t / 7 + x * 2)); return true; }
    if (c === "%") {
      const f = R.fonte.get(x + "," + y), k = f && f.t > 0 ? f.t / 38 : 0;
      drawNuage(px + (k ? Math.sin(R.t) * k : 0), py + k * 3, x, y, 1 - 0.7 * k, "#ffe9f4");
      ctx.fillStyle = "rgba(242,143,184,0.6)"; ctx.fillRect(px + 4, py + 7, 2, 1); ctx.fillRect(px + 10, py + 6, 2, 1);
      return true;
    }
    if (c === "*") {
      const sq = R.springAnim.get(x + "," + y) || 0;
      drawNuage(px, py + (sq > 5 ? 3 : 0), x, y, 1, "#ffd6ea");
      ctx.strokeStyle = "#f28fb8"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(px + 8, py + 9 + (sq > 5 ? 3 : 0), 3, 0.2, Math.PI - 0.2); ctx.stroke();
      return true;
    }
    if (c === "c") {
      // arc-en-ciel : un pont de lumière qui apparaît et disparaît
      const ph = blinkPhase(x), on = ph < BLINK_ON, warn = on && ph > BLINK_ON - 36;
      ctx.globalAlpha = on ? (warn && Math.floor(ph / 4) % 2 ? 0.3 : 0.95) : 0.1;
      const cols = ["#f25c5c", "#f2a65c", "#f2e05c", "#6cd47a", "#5ca8f2", "#9a6cf2"];
      cols.forEach((cc, i) => { ctx.fillStyle = cc; ctx.fillRect(px, py + i, T, 1); });
      ctx.globalAlpha = 1;
      return true;
    }
    if (c === "^" || c === "v") {
      // épines d'orage : de petits éclairs figés
      const a = R.spikeAnim.get(x + "," + y) ?? 1, hgt = 10 * a, up = c === "^";
      ctx.fillStyle = "#ffd34a"; ctx.strokeStyle = "#8a6ad0"; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const bx = px + 1 + i * 5;
        if (up) { ctx.moveTo(bx, py + T); ctx.lineTo(bx + 1.5, py + T - hgt * 0.6); ctx.lineTo(bx + 3.5, py + T - hgt * 0.5); ctx.lineTo(bx + 2.5, py + T - hgt); ctx.lineTo(bx + 5, py + T); }
        else { ctx.moveTo(bx, py); ctx.lineTo(bx + 1.5, py + hgt * 0.6); ctx.lineTo(bx + 3.5, py + hgt * 0.5); ctx.lineTo(bx + 2.5, py + hgt); ctx.lineTo(bx + 5, py); }
      }
      ctx.fill(); ctx.stroke();
      return true;
    }
    if (c === "#") {
      // marbre du palais céleste
      ctx.fillStyle = "#e4e2f2"; ctx.fillRect(px, py, T, T);
      ctx.fillStyle = "#fdf6ff"; ctx.fillRect(px, py, T, 2);
      ctx.fillStyle = "#c2c4e0"; ctx.fillRect(px + (y % 2 ? 0 : 8), py + 2, 1, T - 2); ctx.fillRect(px, py + T - 1, T, 1);
      ctx.fillStyle = "rgba(242,193,78,0.5)"; if ((x * 7 + y * 3) % 5 === 0) ctx.fillRect(px + 3, py + 6, 6, 1);
      return true;
    }
    return false;
  }
  function drawCiel() {
    // pluie
    for (const z of R.pluies) {
      for (let x = z.x0; x < z.x1; x += 28) {
        const cy = Math.max(cam.y + 6, 10);
        drawNuage(x, cy - 6, -1, -1, 0.9, "#8a94b0");
        drawNuage(x + 12, cy - 9, -1, -1, 0.9, "#7a84a0");
      }
      ctx.strokeStyle = "rgba(120,150,210,0.6)"; ctx.lineWidth = 1;
      for (let i = 0; i < (z.x1 - z.x0) / 6; i++) {
        const x = z.x0 + ((i * 37) % (z.x1 - z.x0)), y = cam.y + ((R.t * 5 + i * 53) % (view.h + 20));
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 1, y + 6); ctx.stroke();
      }
    }
    // souffleurs : un nuage avec un visage
    for (const s of R.souffleurs) {
      const px = s.x * T, py = s.y * T;
      ctx.save(); ctx.translate(px + 8, py + 8); if (s.dir < 0) ctx.scale(-1, 1);
      const j = s.joues ? 2.5 : s.souffle ? 1.5 : 0;
      ctx.fillStyle = "#f4f6ff"; ctx.beginPath(); ctx.arc(0, 0, 10 + j, 0, Math.PI * 2); ctx.arc(-8, 3, 7, 0, Math.PI * 2); ctx.arc(-4, -7, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#2a2f4a"; ctx.fillRect(1, -4, 2, 2); ctx.fillRect(-5, -4, 2, 2);
      ctx.fillStyle = "#f28fb8"; ctx.beginPath(); ctx.arc(6, 2, s.souffle ? 2.5 : 1.5, 0, Math.PI * 2); ctx.fill();
      if (s.joues) { ctx.fillStyle = "rgba(242,143,184,0.5)"; ctx.beginPath(); ctx.arc(4, 4, 3, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      if (s.souffle) {
        ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 1.2;
        for (let i = 0; i < 6; i++) {
          const k = ((R.t * 3 + i * 23) % (s.len * T)), x = s.dir > 0 ? px + 16 + k : px - k, y = py - 18 + ((i * 13) % 36);
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - s.dir * 9, y); ctx.stroke();
        }
      }
    }
    // grêle
    for (const q of R.grelons) {
      if (q.warn > 0) {
        const fy = solDessous(Math.floor((q.x + 3) / T)) * T;
        ctx.fillStyle = `rgba(40,50,90,${0.2 + 0.2 * Math.sin(R.t / 3)})`; ctx.beginPath(); ctx.ellipse(q.x + 3, fy - 1, 5, 1.6, 0, 0, Math.PI * 2); ctx.fill();
        continue;
      }
      ctx.fillStyle = q.magma ? "#e8621f" : "#eef6ff"; ctx.beginPath(); ctx.arc(q.x + 3.5, q.y + 3.5, q.magma ? 4.5 : 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = q.magma ? "#ffd34a" : "#a8c4e0"; ctx.fillRect(q.x + 4, q.y + 4, 2, 2);
      if (q.magma && R.t % 3 === 0) R.particles.push({ x: q.x + 3, y: q.y, vx: 0, vy: -0.3, s: 2, life: 14, color: "#ffb347", g: 0 });
    }
    // foudre
    for (const f of R.foudres) {
      const x = f.x * T + 8;
      if (f.warn) {
        ctx.fillStyle = `rgba(40,40,80,${0.25 + 0.2 * Math.sin(R.t / 2)})`; ctx.beginPath(); ctx.ellipse(x, f.bas - 1, 9, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(255,230,128,0.25)"; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(x, cam.y); ctx.lineTo(x, f.bas); ctx.stroke(); ctx.setLineDash([]);
      }
      if (f.on) {
        ctx.strokeStyle = "#fff6c0"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, cam.y - 10);
        for (let y = cam.y; y < f.bas; y += 12) ctx.lineTo(x + ((y / 12 + R.t) % 2 ? 5 : -5), y);
        ctx.lineTo(x, f.bas); ctx.stroke();
        ctx.strokeStyle = "#ffd34a"; ctx.lineWidth = 1; ctx.stroke();
      }
    }
  }
  function drawOiseau(e) {
    const x = e.x, y = Math.round(e.y), flap = Math.sin(R.t / 4 + e.x) > 0;
    ctx.fillStyle = "#4a5a8a";
    ctx.beginPath();
    if (flap) { ctx.moveTo(x + 4, y + 3); ctx.lineTo(x + 8, y - 4); ctx.lineTo(x + 9, y + 3); }
    else { ctx.moveTo(x + 4, y + 3); ctx.lineTo(x + 8, y + 9); ctx.lineTo(x + 9, y + 3); }
    ctx.fill();
    ctx.fillStyle = "#6a7ab0"; ctx.beginPath(); ctx.ellipse(x + 6, y + 4, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f2c14e"; ctx.beginPath(); ctx.moveTo(x, y + 3); ctx.lineTo(x - 3, y + 4); ctx.lineTo(x, y + 5); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.fillRect(x + 2, y + 2, 2, 2); ctx.fillStyle = "#000"; ctx.fillRect(x + 2, y + 2, 1, 1);
  }
  function drawEtincelle(e) {
    const x = e.x + 5, y = e.y + 6, s = 1 + 0.15 * Math.sin(R.t / 3);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = "#ffe680"; ctx.strokeStyle = "#e0a020"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-1, -7); ctx.lineTo(4, -7); ctx.lineTo(1, -1); ctx.lineTo(5, -1); ctx.lineTo(-3, 7); ctx.lineTo(-1, 1); ctx.lineTo(-5, 1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#2a2f4a"; ctx.fillRect(-2, -3, 1, 2); ctx.fillRect(1, -3, 1, 2);
    ctx.restore();
  }
  function drawMoverCiel(m) {
    if (m.style === "ballon") {
      const cx = m.x + m.w / 2;
      ctx.strokeStyle = "#8a6a3a"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(m.x + 2, m.y); ctx.lineTo(cx - 6, m.y - 22); ctx.moveTo(m.x + m.w - 2, m.y); ctx.lineTo(cx + 6, m.y - 22); ctx.stroke();
      ctx.fillStyle = "#f28fb8"; ctx.beginPath(); ctx.ellipse(cx, m.y - 34, 13, 15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffd36b"; ctx.fillRect(cx - 13, m.y - 36, 26, 4);
      ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.beginPath(); ctx.ellipse(cx - 5, m.y - 40, 3, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#9a7444"; ctx.fillRect(m.x, m.y, m.w, m.h); ctx.fillStyle = "#c79a5e"; ctx.fillRect(m.x, m.y, m.w, 1.5);
      return;
    }
    if (m.style === "cerf") {
      const cx = m.x + m.w / 2;
      ctx.strokeStyle = "rgba(90,70,40,0.6)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, m.y + 4); ctx.quadraticCurveTo(cx - 20, m.y + 30, cx - 40, m.y + 60); ctx.stroke();
      ctx.fillStyle = "#5ca8f2"; ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(cx, m.y - 9); ctx.lineTo(m.x + m.w, m.y); ctx.lineTo(cx, m.y + 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#f25c5c"; ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(cx, m.y - 9); ctx.lineTo(cx, m.y + 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.fillRect(m.x + 2, m.y, m.w - 4, 1);
      return;
    }
    if (m.style === "engrenage") {
      const { cx, cy, r } = m.circ;
      if (m === R.movers.find((q) => q.circ && q.circ.cx === cx && q.circ.cy === cy)) {
        // la grande roue dentée, dessinée une fois
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(R.t * 0.004);
        ctx.strokeStyle = "#b8862a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "#e2a640"; for (let k = 0; k < 10; k++) { ctx.rotate(Math.PI / 5); ctx.fillRect(r * 0.55 - 2, -3, 7, 6); }
        ctx.fillStyle = "#8c5a1a"; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      ctx.strokeStyle = "#8c5a1a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(m.x + m.w / 2, m.y + 3); ctx.stroke();
      ctx.fillStyle = "#e2b040"; ctx.fillRect(m.x, m.y, m.w, m.h); ctx.fillStyle = "#fff1c1"; ctx.fillRect(m.x, m.y, m.w, 1); ctx.fillStyle = "#8c5a1a"; for (let k = 3; k < m.w; k += 6) ctx.fillRect(m.x + k, m.y + m.h - 2, 3, 2);
      return;
    }
    if (m.style === "wagon") {
      ctx.strokeStyle = "#6a5a4a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(m.x0, m.y0 + 8); ctx.lineTo(m.x0 + m.dx + m.w, m.y0 + 8); ctx.stroke();
      ctx.fillStyle = "#4a3a2a"; for (let k = m.x0; k < m.x0 + m.dx + m.w; k += 8) ctx.fillRect(k, m.y0 + 7, 2, 4);
      ctx.save(); ctx.translate(m.x + m.w / 2, m.y); if (m.vy) ctx.rotate(Math.min(0.9, m.vy * 0.1));
      ctx.fillStyle = "#8c5a2a"; ctx.fillRect(-m.w / 2, -6, m.w, 12); ctx.fillStyle = "#e2a640"; ctx.fillRect(-m.w / 2, -6, m.w, 2); ctx.fillRect(-m.w / 2, 4, m.w, 2);
      ctx.fillStyle = "#2a2a2a"; ctx.beginPath(); ctx.arc(-m.w / 2 + 6, 8, 3, 0, Math.PI * 2); ctx.arc(m.w / 2 - 6, 8, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      return;
    }
    if (m.style === "pale") {
      ctx.strokeStyle = "#a08a6a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(m.circ.cx, m.circ.cy); ctx.lineTo(m.x + m.w / 2, m.y + 3); ctx.stroke();
      ctx.fillStyle = "#fdf6ff"; ctx.fillRect(m.x, m.y, m.w, m.h); ctx.fillStyle = "#f28fb8"; ctx.fillRect(m.x, m.y + m.h - 2, m.w, 2);
      return;
    }
    // nuage voyageur
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < m.w; i += 8) { ctx.beginPath(); ctx.arc(m.x + i + 4, m.y + 3, 5, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillRect(m.x, m.y + 1, m.w, 6);
    ctx.fillStyle = "rgba(143,168,232,0.5)"; ctx.fillRect(m.x + 1, m.y + 6, m.w - 2, 2);
  }

  /* ================= La cité d'or ================= */
  // R = lave, { } = tapis roulants (vers la gauche / la droite), % = pont qui fond (dans la cité)
  function creerOr(c, x, y) {
    if (c === "N") return { kind: "N", x: x * T + 1, y: y * T + 1, w: 14, h: 15, vx: -0.35, vy: 0, alive: true, t: 0, armure: true };
    if (c === "I") return { kind: "I", x: x * T + 1, y: y * T + 10, w: 14, h: 6, vx: -1.25, vy: 0, alive: true, t: 0 };
    if (c === "U") return { kind: "U", x: x * T + 1, y: y * T, w: 14, h: 16, vx: 0, vy: 0, alive: true, t: 0, bouge: false };
    if (c === "d") return { kind: "d", x: x * T + 2, y: y * T + 2, w: 12, h: 14, vx: -0.5, vy: 0, alive: true, t: 0, repos: 0 };
    return null;
  }
  function updateOrEnnemi(e) {
    const p = R.player;
    if (e.choc > 0) e.choc--;
    if (e.kind === "I") {
      // salamandre : elle file, et laisse une traînée de feu derrière elle
      if (R.t % 7 === 0 && e.grounded) R.braises.push({ x: e.x + (e.vx > 0 ? 0 : e.w - 6), y: e.y, w: 6, h: 6, life: 70 });
      return false;
    }
    if (e.kind === "U") {
      // gardien d'or : il ne bouge que quand Max lui tourne le dos
      const dx = p.x - e.x, dos = p.alive && Math.abs(dx) < 200 && Math.abs(p.y - e.y) < 60 && Math.sign(dx) === p.face;
      e.bouge = dos;
      e.vy = Math.min(e.vy + PHYS.gravity, PHYS.maxFall);
      e.vx = dos ? (dx > 0 ? 1 : -1) * 0.95 * R.slow : 0;
      if (e.vx && e.grounded && !solidAt(e.vx > 0 ? e.x + e.w + 1 : e.x - 1, e.y + e.h + 2)) e.vx = 0;
      moveBody(e);
      return true;
    }
    if (e.kind === "d") {
      // robot d'Archibald : s'il voit Max devant lui, il sonne l'alarme
      if (e.repos > 0) e.repos--;
      const dx = p.x - e.x;
      if (!e.repos && p.alive && Math.abs(dx) < 120 && Math.abs(p.y - e.y) < 40 && Math.sign(dx) === Math.sign(e.vx || -1)) {
        e.repos = 420; R.alarme = 300; sfx.flee(); setTimeout(() => sfx.flee(), 160);
        R.hint = { text: "ALARME ! Le robot d'Archibald t'a vu : pluie de magma !", t: 0, dur: 160 };
      }
      return false;
    }
    return false;
  }
  function updateOr() {
    const p = R.player;
    for (const b of R.braises) b.life--;
    R.braises = R.braises.filter((b) => b.life > 0);
    // jets de feu : la grille fume, puis la flamme jaillit
    for (const j of R.jets) {
      j.t += R.slow;
      const ph = j.t % j.per;
      j.warn = ph >= j.per - 110 && ph < j.per - 50; j.on = ph >= j.per - 50;
      if (j.on && ph < j.per - 49) sfx.flee();
    }
    // alarme : du magma tombe autour de Max
    if (R.alarme > 0) {
      R.alarme--;
      if (R.alarme % 45 === 0 && p.alive) for (const dx of [-30, 26]) R.grelons.push({ x: p.x + dx + Math.random() * 12, y: cam.y - 20, vy: 0, warn: 50, w: 7, h: 7, magma: true });
    }
  }
  function dangersOr(p) {
    // lave
    const x0 = Math.floor((p.x + 2) / T), x1 = Math.floor((p.x + p.w - 2) / T), yb = Math.floor((p.y + p.h - 3) / T);
    for (let tx = x0; tx <= x1; tx++) if (tileAt(tx, yb) === "R") return kill("Dans la lave ! Ça brûle les bottes.");
    for (const j of R.jets) if (j.on && p.x + p.w > j.x * T + 3 && p.x < j.x * T + 13 && p.y + p.h > (j.y - j.h + 1) * T && p.y < (j.y + 1) * T) return kill("Le jet de feu ! Quand la grille fume, attends.");
    for (const b of R.braises) if (overlap(p, b)) return kill("La traînée de feu de la salamandre !");
    return false;
  }
  function drawOr() {
    for (const b of R.braises) { const a = b.life / 70; ctx.fillStyle = `rgba(255,${120 + 80 * a},40,${a})`; ctx.beginPath(); ctx.moveTo(b.x, b.y + 6); ctx.lineTo(b.x + 3, b.y + 6 - 6 * a - Math.sin(R.t / 3 + b.x) * 1.5); ctx.lineTo(b.x + 6, b.y + 6); ctx.fill(); }
    for (const j of R.jets) {
      const x = j.x * T, y = (j.y + 1) * T;
      ctx.fillStyle = "#3a1e10"; ctx.fillRect(x + 2, y - 3, 12, 3);
      ctx.fillStyle = j.warn ? (Math.floor(R.t / 4) % 2 ? "#ffd34a" : "#ff8a3a") : "#8a4a20"; for (let k = 3; k < 13; k += 3) ctx.fillRect(x + k, y - 2, 1, 2);
      if (j.warn && R.t % 5 === 0) R.particles.push({ x: x + 4 + Math.random() * 8, y: y - 3, vx: 0, vy: -0.6, s: 3, life: 26, color: "rgba(90,80,80,0.6)", g: -0.01 });
      if (j.on) {
        const hh = j.h * T, f = 0.85 + 0.15 * Math.sin(R.t / 2);
        const gr = ctx.createLinearGradient(0, y, 0, y - hh); gr.addColorStop(0, "#fff1a0"); gr.addColorStop(0.4, "#ff9a2a"); gr.addColorStop(1, "rgba(229,72,30,0)");
        ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x + 2, y - 2); ctx.quadraticCurveTo(x + 8 + Math.sin(R.t / 2) * 3, y - hh * f, x + 14, y - 2); ctx.fill();
      }
    }
  }
  function drawTuileOr(c, px, py, x, y) {
    if (c === "R") {
      // lave : surface qui ondule et qui luit
      const top = tileAt(x, y - 1) !== "R";
      ctx.fillStyle = "#c2381a"; ctx.fillRect(px, py + (top ? 3 : 0), T, T - (top ? 3 : 0));
      ctx.fillStyle = "#ff7a2a"; if (top) { for (let k = 0; k < T; k += 4) ctx.fillRect(px + k, py + 3 + Math.sin(R.t / 10 + x * 2 + k) * 1.2, 4, 2); }
      ctx.fillStyle = "rgba(255,210,90,0.6)"; ctx.fillRect(px + ((x * 7 + R.t / 6) % 12), py + 8, 3, 1);
      if (top && (R.t + x * 13) % 90 === 0) R.particles.push({ x: px + 8, y: py + 3, vx: (Math.random() - 0.5) * 0.6, vy: -1.4, s: 2, life: 30, color: "#ffb347", g: 0.06 });
      return true;
    }
    if (c === "{" || c === "}") {
      drawStone(px, py, x, y);
      const d = c === "}" ? 1 : -1;
      ctx.fillStyle = "#3a2a1a"; ctx.fillRect(px, py, T, 4);
      ctx.fillStyle = "#e2a640"; for (let k = 0; k < 4; k++) { const ox = ((R.t * 0.9 * d + k * 4) % T + T) % T; ctx.fillRect(px + ox, py + 1, 2, 2); }
      return true;
    }
    if (c === "%") {
      // dalle d'or qui fond
      const f = R.fonte.get(x + "," + y), k = f && f.t > 0 ? f.t / 38 : 0;
      ctx.globalAlpha = 1 - 0.6 * k;
      ctx.fillStyle = k ? "#ff9a2a" : "#e2b040"; ctx.fillRect(px, py + k * 3, T, 6);
      ctx.fillStyle = "#fff1c1"; ctx.fillRect(px, py + k * 3, T, 1);
      ctx.fillStyle = "#8a6020"; ctx.fillRect(px + 7, py + 1 + k * 3, 1, 5);
      if (k) { ctx.fillStyle = "#ffb347"; ctx.fillRect(px + 3, py + 6 + k * 6, 2, 3); ctx.fillRect(px + 11, py + 6 + k * 4, 2, 2); }
      ctx.globalAlpha = 1;
      return true;
    }
    return false;
  }
  function drawEnnemiOr(e) {
    const x = Math.round(e.x), y = Math.round(e.y), f = e.vx > 0 ? 1 : e.vx < 0 ? -1 : (R.player.x > e.x ? 1 : -1);
    ctx.save(); ctx.translate(x + e.w / 2, y); if (f < 0) ctx.scale(-1, 1); ctx.translate(-e.w / 2, 0);
    if (e.kind === "N") {
      // golem de lave : deux coups pour l'assommer
      const s = Math.sin(R.t / 8 + e.x) * 1;
      ctx.fillStyle = "#4a2a22"; ctx.fillRect(1, 3, 12, 10); ctx.fillRect(3, 0, 8, 5);
      ctx.fillStyle = "#3a1e18"; ctx.fillRect(2, 12, 4, 3 + s); ctx.fillRect(8, 12, 4, 3 - s);
      ctx.fillStyle = e.armure ? "#ff7a2a" : "#ffd34a"; ctx.fillRect(4, 6, 1, 4); ctx.fillRect(8, 4, 1, 6); ctx.fillRect(5, 9, 4, 1);
      if (!e.armure) { ctx.fillStyle = "#ffd34a"; ctx.fillRect(2, 4, 2, 1); ctx.fillRect(10, 8, 3, 1); }
      ctx.fillStyle = "#ffd34a"; ctx.fillRect(8, 1, 2, 2);
    } else if (e.kind === "I") {
      const s = Math.sin(R.t / 2) * 1.5;
      ctx.fillStyle = "#e8621f"; ctx.fillRect(2, 2, 10, 3); ctx.fillRect(11, 1, 4, 3);
      ctx.fillStyle = "#f2c14e"; ctx.fillRect(3, 2, 2, 1); ctx.fillRect(7, 2, 2, 1);
      ctx.fillStyle = "#8c2a12"; ctx.fillRect(3, 5, 2, 1 + s); ctx.fillRect(9, 5, 2, 1 - s);
      ctx.strokeStyle = "#e8621f"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(2, 3); ctx.quadraticCurveTo(-3, 3 + s, -5, 0); ctx.stroke();
      ctx.fillStyle = "#000"; ctx.fillRect(13, 1, 1, 1);
    } else if (e.kind === "U") {
      // gardien d'or : une statue… qui bouge quand on ne la regarde pas
      ctx.fillStyle = "#b8963a"; ctx.fillRect(2, 4, 10, 12); ctx.fillRect(3, 0, 8, 5);
      ctx.fillStyle = "#f2c14e"; ctx.fillRect(2, 4, 2, 12); ctx.fillRect(3, 0, 2, 5);
      ctx.fillStyle = "#7a5a1a"; ctx.fillRect(12, 6, 2, 6); ctx.fillRect(0, 6, 2, 6);
      ctx.fillStyle = e.bouge ? "#e5483c" : "#5a4010"; ctx.fillRect(8, 2, 2, 1); ctx.fillRect(5, 2, 2, 1);
    } else if (e.kind === "d") {
      ctx.fillStyle = "#8a8f99"; ctx.fillRect(1, 4, 12, 8); ctx.fillStyle = "#b0b6c0"; ctx.fillRect(1, 4, 12, 2);
      ctx.fillStyle = "#4a4f59"; ctx.beginPath(); ctx.arc(4, 13, 2.5, 0, Math.PI * 2); ctx.arc(10, 13, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#2a2f39"; ctx.fillRect(9, 6, 4, 3); ctx.fillStyle = e.repos > 300 ? (Math.floor(R.t / 5) % 2 ? "#ff3020" : "#600") : "#7fe0ff"; ctx.fillRect(11, 7, 2, 1);
      ctx.fillStyle = "#c0392b"; ctx.fillRect(6, 0, 2, 4); ctx.fillStyle = e.repos > 300 && Math.floor(R.t / 5) % 2 ? "#ff3020" : "#6a1a10"; ctx.fillRect(5, 0, 4, 2);
    }
    ctx.restore();
  }

  // ----- le Fouisseur d'Archibald : de la dynamite dans ses trois cheminées -----
  function updateFouisseur() {
    const b = R.boss, p = R.player;
    if (b.etat === "combat") b.t++;   // sonnée, la machine ne crache plus rien : le rythme reprend où il en était
    for (const c of b.chem) {
      if (c.bouchee) continue;
      // la cheminée crache du feu en rythme (une fumée noire l'annonce)
      if (b.etat === "combat") c.t = (c.t || 0) + 1;
      const per = Math.max(150, 230 - 30 * b.hits), ph = ((c.t || 0) + c.ph) % per;
      c.warn = ph >= per - 100 && ph < per - 45; c.feu = ph >= per - 45 && b.etat === "combat";
      if (c.feu && p.alive && p.x + p.w > c.x - 6 && p.x < c.x + 22 && p.y + p.h > c.y - 4 * T && p.y < c.y + 4) kill("La cheminée crache du feu ! Attends la fumée noire, puis lâche la dynamite.");
      // une dynamite posée sur la cheminée tombe dedans
      for (const d of R.dynamites) if (!d.dans && Math.abs(d.x + 3 - (c.x + 8)) < 10 && d.y + d.h >= c.y - 4 && d.y + d.h <= c.y + 6) { d.dans = true; d.fuse = 9999; c.boum = 40; sfx.place(); }
      if (c.boum > 0 && --c.boum === 0) {
        R.dynamites = R.dynamites.filter((d) => !(d.dans && Math.abs(d.x + 3 - (c.x + 8)) < 12));
        c.bouchee = true; b.hits++; for (const q of b.chem) q.t = 0;   // nouveau rythme : chaque cheminée refume avant de cracher R.shake = 14; sfx.boom(); burst(c.x + 8, c.y - 6, "#3a3a3a", 30, 2.5); burst(c.x + 8, c.y, C.hat, 20, 2);
        if (b.hits >= 3) { b.etat = "cale"; b.k = 160; R.grelons = []; R.hint = { text: "Pfffff… La machine cale ! Archibald sort, tout noir de suie.", t: 0, dur: 260 }; }
        else { b.etat = "sonne"; b.k = 140; R.hint = { text: b.hits === 1 ? "BOUM ! Une cheminée bouchée ! Encore deux…" : "BOUM ! Plus qu'une cheminée !", t: 0, dur: 160 }; }
      }
    }
    // de la dynamite revient quand Max n'en a plus
    if (b.etat !== "cale" && game.ammo.tnt <= 0 && !R.dynamites.some((d) => !d.dans) && !R.pickups.some((it) => it.kind === "tnt" && !it.taken)) {
      if (++b.recharge > 90) { b.recharge = 0; R.pickups.push({ kind: "tnt", x: b.caisse[0] * T + 4, y: b.caisse[1] * T + 6, w: 8, h: 10, taken: false, id: -1 }); burst(b.caisse[0] * T + 8, b.caisse[1] * T + 8, C.hat, 10, 1.2); }
    } else b.recharge = 0;
    switch (b.etat) {
      case "attend": if (--b.k <= 0) b.etat = "combat"; return;
      case "sonne": if (--b.k <= 0) b.etat = "combat"; if (R.t % 6 === 0) R.particles.push({ x: b.x + Math.random() * b.w, y: b.y, vx: 0, vy: -0.5, s: 4, life: 40, color: "rgba(60,60,60,0.6)", g: -0.01 }); return;
      case "cale":
        if (b.k > 0 && --b.k === 0) doAction(["showdoor"]);
        if (R.t % 10 === 0) R.particles.push({ x: b.x + Math.random() * b.w, y: b.y, vx: 0, vy: -0.4, s: 5, life: 50, color: "rgba(60,60,60,0.5)", g: -0.01 });
        return;
    }
    // la foreuse : elle lance des pierres en fusion vers Max
    if (b.t % Math.max(90, 150 - 25 * b.hits) === 0 && p.alive) {
      R.grelons.push({ x: p.x + p.w / 2 - 3 + (Math.random() - 0.5) * 20, y: cam.y - 20, vy: 0, warn: 55, w: 7, h: 7, magma: true });
      sfx.god();
    }
    b.foret = (b.foret || 0) + 0.3 + 0.1 * b.hits;
  }
  function drawFouisseur() {
    const b = R.boss, x = b.x, y = b.y, w = b.w, h = b.h, cale = b.etat === "cale";
    // corps de la machine (les tuiles 8 sont dessinées ici)
    ctx.fillStyle = "#5a3a2a"; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#8c5a2a"; ctx.fillRect(x, y, w, 4);
    ctx.fillStyle = "#3a2418"; for (let k = 8; k < w; k += 16) ctx.fillRect(x + k, y + 6, 2, h - 8);
    ctx.fillStyle = "#e2a640"; for (let k = 4; k < w; k += 16) { ctx.beginPath(); ctx.arc(x + k, y + 10, 1.5, 0, Math.PI * 2); ctx.fill(); }
    // hublot d'Archibald
    ctx.fillStyle = "#e2a640"; ctx.beginPath(); ctx.arc(x + w - 30, y + 30, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = cale ? "#2a2a2a" : "#7fc0e0"; ctx.beginPath(); ctx.arc(x + w - 30, y + 30, 8, 0, Math.PI * 2); ctx.fill();
    if (!cale) { ctx.fillStyle = "#e2a777"; ctx.fillRect(x + w - 34, y + 27, 8, 7); ctx.fillStyle = "#2a1a10"; ctx.fillRect(x + w - 35, y + 25, 10, 2); ctx.fillRect(x + w - 33, y + 33, 6, 1); }
    // la foreuse à l'avant
    ctx.save(); ctx.translate(x, y + h - 26);
    ctx.fillStyle = "#a0a6b0"; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(-30, 0); ctx.lineTo(0, 12); ctx.fill();
    ctx.strokeStyle = "#5a606a"; ctx.lineWidth = 1; for (let k = 0; k < 4; k++) { const o = ((b.foret || 0) * 4 + k * 8) % 30; ctx.beginPath(); ctx.moveTo(-o, -12 * (1 - o / 30)); ctx.lineTo(-o, 12 * (1 - o / 30)); ctx.stroke(); }
    ctx.restore();
    // chenilles
    ctx.fillStyle = "#2a2a2a"; ctx.fillRect(x - 2, y + h - 10, w + 4, 10); ctx.fillStyle = "#4a4a4a"; for (let k = 0; k < w; k += 6) ctx.fillRect(x + ((k + (cale ? 0 : R.t)) % w), y + h - 8, 3, 6);
    // cheminées
    for (const c of b.chem) {
      ctx.fillStyle = c.bouchee ? "#2a2a2a" : "#7a4a2a"; ctx.fillRect(c.x + 1, c.y, 14, b.y - c.y);
      ctx.fillStyle = "#e2a640"; ctx.fillRect(c.x - 1, c.y, 18, 3);
      if (c.warn && R.t % 4 === 0) R.particles.push({ x: c.x + 8 + (Math.random() - 0.5) * 6, y: c.y - 2, vx: (Math.random() - 0.5) * 0.4, vy: -1, s: 5, life: 40, color: "rgba(40,40,40,0.7)", g: -0.01 });
      if (c.feu) {
        const gr = ctx.createLinearGradient(0, c.y, 0, c.y - 4 * T); gr.addColorStop(0, "#fff1a0"); gr.addColorStop(0.5, "#ff7a2a"); gr.addColorStop(1, "rgba(229,72,30,0)");
        ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(c.x - 4, c.y); ctx.quadraticCurveTo(c.x + 8 + Math.sin(R.t / 2) * 4, c.y - 4 * T, c.x + 20, c.y); ctx.fill();
      }
      if (c.boum > 0) { ctx.fillStyle = C.hat; ctx.fillRect(c.x + 6, c.y - 3 + Math.sin(R.t) * 1, 4, 3); }
    }
    if (cale && b.k <= 0) {
      // Archibald sort, couvert de suie
      const ax = x + w - 34, ay = y - 18;
      ctx.fillStyle = "#3a3a3a"; ctx.fillRect(ax, ay + 4, 10, 12); ctx.fillStyle = "#4a4040"; ctx.fillRect(ax + 1, ay - 2, 8, 7);
      ctx.fillStyle = "#fff"; ctx.fillRect(ax + 2, ay + 1, 2, 2); ctx.fillRect(ax + 6, ay + 1, 2, 2);
    }
  }

  function updatePieuvre() {
    const b = R.boss, p = R.player;
    b.t++;
    const sol = (ROWS - 1) * T;
    // coquillages
    for (const c of b.coq) {
      if (c.etat === "tombe") {
        c.vy = Math.min(c.vy + 0.14, 3.4); c.y += c.vy;
        const t = b.tent;
        if (t && (t.etat === "coince" || t.etat === "frappe") && b.etat !== "dort" && Math.abs(c.x + 10 - t.x) < 20 && c.y + c.h > sol - 40) {
          c.etat = "casse"; c.k = 420; burst(c.x + 10, c.y + 7, "#f2e6a0", 30, 3); R.shake = 12; sfx.boom();
          b.hits++; t.etat = "remonte"; t.k = 20;
          if (b.hits >= 3) { b.etat = "dort"; b.k = 70; b.tent = null; R.hint = { text: "La pieuvre a le tournis… elle s'endort dans sa grotte. La porte s'ouvre !", t: 0, dur: 260 }; }
          else { b.etat = "sonne"; b.k = 150; R.hint = { text: b.hits === 1 ? "Bien visé ! Encore deux coquillages." : "Plus qu'un ! Elle commence à voir trente-six étoiles…", t: 0, dur: 180 }; }
        } else if (c.y + c.h >= sol) { c.y = sol - c.h; c.etat = "casse"; c.k = 360; burst(c.x + 10, sol, "#f2e6a0", 14, 1.6); sfx.crumble(); }
        if (p.alive && c.etat === "tombe" && overlap(p, c)) { c.etat = "casse"; c.k = 360; kill("Un coquillage géant sur la tête !"); }
      } else if (c.etat === "casse" && b.etat !== "dort") { if (--c.k <= 0) { c.etat = "pend"; c.y = c.y0; burst(c.x + 10, c.y, "#2e8c56", 8, 1); } }
    }
    // encre : un nuage noir qui gêne la vue
    for (const n of b.encre) { n.x += n.vx; n.r = Math.min(n.r + 0.4, n.rmax); n.life--; }
    b.encre = b.encre.filter((n) => n.life > 0);
    switch (b.etat) {
      case "attend": if (--b.k <= 0) b.etat = "combat"; return;
      case "sonne": if (--b.k <= 0) b.etat = "combat"; if (R.t % 8 === 0) R.particles.push({ x: b.x + b.w / 2 + (Math.random() - 0.5) * 40, y: b.y + 10, vx: 0, vy: -0.4, s: 3, life: 30, color: C.gold, g: 0 }); break;
      case "dort":
        if (b.k > 0 && --b.k === 0) doAction(["showdoor"]);
        if (R.t % 50 === 0) R.particles.push({ zzz: true, x: b.x + b.w / 2, y: b.y - 2, vx: 0.2, vy: -0.4, s: 6, life: 70, color: C.text, g: 0 });
        return;
    }
    if (b.etat === "combat" && b.t % Math.max(260, 420 - b.hits * 60) === 0) {
      for (let i = 0; i < 3; i++) b.encre.push({ x: b.x - 10 - i * 30, y: b.y + 30 + (Math.random() - 0.5) * 60, vx: -0.5 - Math.random() * 0.4, r: 8, rmax: 34 + Math.random() * 14, life: 260 });
      sfx.flee();
    }
    // tentacule
    let t = b.tent;
    if (!t) {
      if (b.etat !== "combat") return;
      if (--b.pause > 0) return;
      const cible = Math.max(3 * T, Math.min(b.x - 2 * T, p.x + p.w / 2));
      t = b.tent = { x: cible, etat: "vise", k: Math.round((62 - b.hits * 8) * (1 + 0.25 * R.assist)), bout: 0 };
      sfx.god();
    }
    if (t.etat === "vise") { t.bout = Math.min(1, t.bout + 0.04); if (--t.k <= 0) { t.etat = "frappe"; t.k = 8; } }
    else if (t.etat === "frappe") {
      if (--t.k <= 0) { t.etat = "coince"; t.k = Math.round(230 * (1 + 0.2 * R.assist)); R.shake = 10; sfx.boom(); burst(t.x, sol, "rgba(220,240,255,0.8)", 20, 2.2); }
      if (p.alive && Math.abs(p.x + p.w / 2 - t.x) < 13) return kill("La tentacule ! Regarde son ombre au sol et écarte-toi.");
    } else if (t.etat === "coince") { if (t.k === Math.round(230 * (1 + 0.2 * R.assist)) - 1 && R.hint == null && b.hits === 0) R.hint = { text: "La tentacule est coincée ! Coupe l'algue d'un coquillage au-dessus (COUP)", t: 0, dur: 220 }; if (--t.k <= 0) { t.etat = "remonte"; t.k = 30; } }
    else if (t.etat === "remonte") { if (--t.k <= 0) { b.tent = null; b.pause = 50; } }
  }
  function drawPieuvre() {
    const b = R.boss, sol = (ROWS - 1) * T;
    const dort = b.etat === "dort", sonne = b.etat === "sonne";
    // tête
    const cx = b.x + b.w / 2, cy = b.y + 44 + Math.sin(b.t / 30) * 3;
    ctx.fillStyle = "#7a3b6e";
    for (let i = 0; i < 6; i++) { const a = 0.6 + i * 0.4; ctx.beginPath(); ctx.ellipse(cx - 30 + i * 12, cy + 50, 7, 30, (i - 2.5) * 0.15 + Math.sin(b.t / 20 + i) * 0.1, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#8e4880"; ctx.beginPath(); ctx.ellipse(cx, cy, 46, 40, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#a95c98"; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(cx - 26 + (i % 3) * 22, cy - 18 + Math.floor(i / 3) * 14, 4, 0, Math.PI * 2); ctx.fill(); }
    // yeux
    for (const ex of [-18, 14]) {
      ctx.fillStyle = "#f4ecd8"; ctx.beginPath(); ctx.ellipse(cx + ex, cy + 8, 10, dort ? 2 : 9, 0, 0, Math.PI * 2); ctx.fill();
      if (!dort) {
        if (sonne) { ctx.strokeStyle = "#2a1020"; ctx.lineWidth = 2; ctx.beginPath(); for (let a = 0; a < 12; a += 0.4) { const r = a * 0.6; const px = cx + ex + Math.cos(a + b.t * 0.3) * r, py = cy + 8 + Math.sin(a + b.t * 0.3) * r; if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.stroke(); }
        else { const px = Math.max(-4, Math.min(4, (R.player.x - (cx + ex)) / 40)); ctx.fillStyle = "#2a1020"; ctx.fillRect(cx + ex - 3 + px, cy + 5, 6, 7); }
      }
    }
    if (sonne && R.t % 20 < 10) drawStars(cx, cy - 46, 60);
    // tentacule active : ombre au sol pendant la visée, puis le coup
    const t = b.tent;
    if (t) {
      if (t.etat === "vise") {
        ctx.fillStyle = `rgba(20,0,20,${0.25 + 0.3 * t.bout})`; ctx.beginPath(); ctx.ellipse(t.x, sol - 1, 14 + 6 * t.bout, 3, 0, 0, Math.PI * 2); ctx.fill();
        if (R.t % 10 < 5) { ctx.fillStyle = "rgba(255,80,60,0.5)"; ctx.fillRect(t.x - 1, sol - 12, 2, 6); }
      }
      const bas = t.etat === "vise" ? 2 * T + t.bout * 30 : t.etat === "frappe" ? sol - (t.k / 8) * (sol - 3 * T) : t.etat === "remonte" ? 2 * T + (t.k / 30) * (sol - 3 * T) : sol;
      const w = Math.sin(R.t / 6) * (t.etat === "coince" ? 3 : 1);
      ctx.fillStyle = "#8e4880";
      ctx.beginPath(); ctx.moveTo(t.x - 9, 0); ctx.quadraticCurveTo(t.x - 9 + w, bas / 2, t.x - 7, bas); ctx.lineTo(t.x + 7, bas); ctx.quadraticCurveTo(t.x + 9 + w, bas / 2, t.x + 9, 0); ctx.fill();
      ctx.fillStyle = "#e7b3d6"; for (let y = 20; y < bas - 4; y += 12) { ctx.beginPath(); ctx.arc(t.x - 4 + w * 0.5, y, 2.4, 0, Math.PI * 2); ctx.fill(); }
      if (t.etat === "coince") { ctx.fillStyle = "rgba(255,240,180,0.6)"; ctx.fillRect(t.x - 10, sol - 3, 20, 3); }
    }
    // coquillages et algues
    for (const c of b.coq) {
      if (c.etat === "pend") {
        ctx.strokeStyle = "#2e8c56"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(c.x + 10, T); ctx.quadraticCurveTo(c.x + 10 + Math.sin(R.t / 25 + c.x) * 4, (T + c.y) / 2, c.x + 10, c.y); ctx.stroke();
      }
      if (c.etat !== "casse") {
        ctx.fillStyle = "#f2e6a0"; ctx.beginPath(); ctx.moveTo(c.x, c.y + c.h); ctx.lineTo(c.x + 10, c.y); ctx.lineTo(c.x + 20, c.y + c.h); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "#c9a25a"; ctx.lineWidth = 1; for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(c.x + 10, c.y + 1); ctx.lineTo(c.x + i * 4, c.y + c.h); ctx.stroke(); }
      }
    }
    for (const n of b.encre) { ctx.fillStyle = `rgba(12,6,20,${Math.min(0.92, n.life / 60)})`; ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill(); }
  }

  function updateYeti() {
    const b = R.boss, p = R.player;
    b.t++;
    const sol = (ROWS - 1) * T - b.h;
    const dx = p.x + p.w / 2 - (b.x + b.w / 2);
    switch (b.etat) {
      case "attend": if (--b.k <= 0) b.etat = "marche"; break;
      case "marche":
        b.face = dx < 0 ? -1 : 1;
        b.x += b.face * (0.75 + b.hits * 0.15) * R.slow;
        if (rectHitsSolid(b.x, b.y, b.w, b.h - 2)) b.x -= b.face * (0.75 + b.hits * 0.15) * R.slow;
        if (Math.abs(dx) < 54 && p.alive) { b.etat = "prepare"; b.k = Math.round(42 * (1 + 0.2 * R.assist)); sfx.god(); }
        else if (Math.abs(dx) > 140 && b.t % 140 === 0) {
          const tt = Math.max(40, Math.min(80, Math.abs(dx) / 2));
          R.boules.push({ x: b.x + b.w / 2, y: b.y + 6, vx: dx / tt, vy: -(0.5 * 0.18 * tt), r: 6 }); sfx.swing();
        }
        break;
      case "prepare": if (--b.k <= 0) { b.etat = "saute"; b.vy = -4.6; } break;
      case "saute":
        b.vy += PHYS.gravity; b.y += b.vy;
        if (b.y >= sol) {
          b.y = sol; b.vy = 0; b.etat = "frappe"; b.k = 70; R.shake = 12; sfx.boom();
          burst(b.x + b.w / 2, b.y + b.h, "#f4f8fc", 24, 2.6);
          // onde de choc : Max doit être en l'air
          if (p.alive && p.grounded && Math.abs(dx) < 70 && !(p.invuln > 0)) kill("L'onde de choc du yéti ! Il fallait sauter.");
          // les petites stalactites tombent un peu partout
          for (let i = 0; i < 3 + b.hits; i++) R.rocks.push({ x: (2 + Math.random() * (COLS - 4)) * T, y: T * 2, w: 8, h: 10, vy: 0, warn: 40 + i * 15, glace: true });
          // et la grosse stalactite juste au-dessus du yéti se décroche
          for (const gl of R.glacons) if (gl.etat === "pend" && Math.abs(gl.x + gl.w / 2 - (b.x + b.w / 2)) < 30) { gl.etat = "tombe"; sfx.crumble(); }
        }
        break;
      case "frappe": if (--b.k <= 0) b.etat = "marche"; break;
      case "sonne": if (--b.k <= 0) { b.etat = "marche"; } break;
      case "dort":
        if (b.k > 0 && --b.k === 0) doAction(["showdoor"]);
        if (R.t % 50 === 0) R.particles.push({ zzz: true, x: b.x + b.w / 2, y: b.y - 2, vx: 0.2, vy: -0.4, s: 6, life: 70, color: C.text, g: 0 });
        break;
    }
    // grosses stalactites
    for (const gl of R.glacons) {
      gl.proche = gl.etat === "pend" && Math.abs(gl.x + gl.w / 2 - (b.x + b.w / 2)) < 30 && b.etat !== "dort";
      if (gl.etat !== "tombe") continue;
      gl.vy = Math.min(gl.vy + 0.45, 9); gl.y += gl.vy;
      if (b.etat !== "dort" && overlap(gl, { x: b.x + 4, y: b.y, w: b.w - 8, h: b.h })) {
        gl.etat = "cassee"; burst(gl.x + gl.w / 2, b.y, "#cfeaff", 30, 3); R.shake = 10; sfx.bonk();
        b.hits++;
        if (b.hits >= 3) { b.etat = "dort"; b.k = 60; R.rocks = []; R.boules = []; R.hint = { text: "Le Yéti grognon s'endort en ronflant… La porte s'ouvre !", t: 0, dur: 240 }; }
        else { b.etat = "sonne"; b.k = 150; R.hint = { text: b.hits === 1 ? "En plein sur la tête ! Encore deux stalactites." : "Plus qu'une ! Il est de plus en plus grognon…", t: 0, dur: 180 }; }
      } else if (gl.y > (ROWS - 1) * T - gl.h) { gl.etat = "cassee"; burst(gl.x + gl.w / 2, (ROWS - 1) * T, "#cfeaff", 20, 2); }
      if (p.alive && gl.etat === "tombe" && overlap(p, gl)) return kill("Une énorme stalactite !");
    }
    // petites stalactites et boules de neige
    for (const r of R.rocks) {
      if (r.warn > 0) { r.warn--; continue; }
      r.vy = Math.min(r.vy + PHYS.gravity, 7); r.y += r.vy;
      if (rectHitsSolid(r.x, r.y, r.w, r.h)) { r.done = true; burst(r.x + 4, r.y + 8, "#cfeaff", 8, 1.4); sfx.crumble(); }
    }
    R.rocks = R.rocks.filter((r) => !r.done && r.y < H + 20);
    if (!p.alive || game.mode !== "play") return;
    for (const r of R.rocks) if (r.warn <= 0 && overlap(p, r)) return kill("Un glaçon sur la tête. Ouille.");
    const vif = b.etat === "marche" || b.etat === "prepare" || b.etat === "saute";
    if (vif && overlap(p, { x: b.x + 6, y: b.y + 6, w: b.w - 12, h: b.h - 6 })) return kill("Le yéti t'a écrasé comme une boule de neige !");
  }
  function drawYeti() {
    const b = R.boss;
    for (const gl of R.glacons) {
      if (gl.etat === "cassee") continue;
      const sh = gl.proche ? Math.sin(R.t) * 1.2 : 0, x = gl.x + sh, y = gl.y;
      // repère au sol sous chaque grosse stalactite
      if (gl.etat === "pend") {
        ctx.fillStyle = `rgba(160,220,255,${0.25 + 0.2 * Math.sin(R.t / 10)})`; ctx.fillRect(gl.x + 4, (ROWS - 1) * T - 2, gl.w - 8, 2);
        ctx.fillStyle = "rgba(160,220,255,0.6)"; const ay = y + gl.h + 8 + Math.sin(R.t / 8) * 3;
        ctx.beginPath(); ctx.moveTo(gl.x + gl.w / 2 - 4, ay); ctx.lineTo(gl.x + gl.w / 2 + 4, ay); ctx.lineTo(gl.x + gl.w / 2, ay + 5); ctx.fill();
      }
      ctx.fillStyle = gl.proche ? "#ffffff" : "#bfe4ff";
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + gl.w, y); ctx.lineTo(x + gl.w / 2, y + gl.h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(90,150,200,0.5)"; ctx.beginPath(); ctx.moveTo(x + gl.w / 2, y); ctx.lineTo(x + gl.w, y); ctx.lineTo(x + gl.w / 2, y + gl.h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.fillRect(x + 6, y + 2, 2, 12);
    }
    for (const r of R.rocks) {
      if (r.warn > 0) { ctx.fillStyle = `rgba(0,0,0,${0.2 + 0.2 * Math.sin(R.t / 3)})`; ctx.beginPath(); ctx.ellipse(r.x + 4, (ROWS - 1) * T - 1, 6, 2, 0, 0, Math.PI * 2); ctx.fill(); continue; }
      ctx.fillStyle = "#cfeaff"; ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + 8, r.y); ctx.lineTo(r.x + 4, r.y + 10); ctx.closePath(); ctx.fill();
    }
    const x = Math.round(b.x), y = Math.round(b.y), f = b.face, pr = b.etat === "prepare" || b.etat === "saute";
    const dors = b.etat === "dort", sonne = b.etat === "sonne", ph = b.etat === "marche" ? Math.sin(b.t * 0.15) : 0;
    const sq = dors ? 10 : 0;
    ctx.fillStyle = "#e8eef4";
    ctx.fillRect(x + 4, y + 10 + sq, 32, 26 - sq);                                // corps
    ctx.fillRect(x + 8 + ph * 2, y + 34, 9, 10); ctx.fillRect(x + 23 - ph * 2, y + 34, 9, 10);   // jambes
    ctx.fillRect(x + 8, y + sq, 24, 14);                                          // tête
    ctx.fillStyle = "#cfdbe6"; for (let i = 0; i < 6; i++) ctx.fillRect(x + 6 + i * 5, y + 12 + sq + (i % 2) * 3, 2, 4);
    // bras : levés quand il va frapper
    ctx.fillStyle = "#e8eef4";
    if (pr) { ctx.fillRect(x - 2, y - 8, 8, 20); ctx.fillRect(x + 34, y - 8, 8, 20); }
    else if (!dors) { ctx.fillRect(x - 2, y + 12 + ph * 2, 8, 18); ctx.fillRect(x + 34, y + 12 - ph * 2, 8, 18); }
    // visage
    ctx.fillStyle = "#9fc4dd"; ctx.fillRect(x + 12, y + 3 + sq, 16, 10);
    if (dors) { ctx.fillStyle = "#2a3a4a"; ctx.fillRect(x + 14, y + 7 + sq, 4, 1); ctx.fillRect(x + 22, y + 7 + sq, 4, 1); }
    else {
      ctx.fillStyle = pr ? "#ff3a2a" : "#2a3a4a"; ctx.fillRect(x + (f > 0 ? 17 : 14), y + 6, 3, 3); ctx.fillRect(x + (f > 0 ? 24 : 21), y + 6, 3, 3);
      ctx.fillStyle = "#2a3a4a"; ctx.fillRect(x + 14, y + 4, 5, 1); ctx.fillRect(x + 21, y + 4, 5, 1);   // sourcils grognons
      ctx.fillStyle = "#fff"; ctx.fillRect(x + 16, y + 11, 2, 2); ctx.fillRect(x + 22, y + 11, 2, 2);  // crocs
    }
    if (sonne) drawStars(x + b.w / 2, y - 4, b.k);
    if (b.etat === "prepare" && Math.floor(b.k / 5) % 2) { ctx.fillStyle = C.danger; ctx.fillRect(x + b.w / 2 - 1, y - 18, 3, 7); ctx.fillRect(x + b.w / 2 - 1, y - 9, 3, 2); }
    for (let i = 0; i < 3; i++) {
      const cx = b.x + b.w / 2 - 12 + i * 12, cy = b.y - 22 + (dors ? sq : 0);
      ctx.fillStyle = i < 3 - b.hits ? "#bfe4ff" : "rgba(191,228,255,0.2)";
      ctx.beginPath(); ctx.moveTo(cx - 3, cy - 3); ctx.lineTo(cx + 3, cy - 3); ctx.lineTo(cx, cy + 5); ctx.closePath(); ctx.fill();
    }
  }

  /* ---------- Le Jaguar de pierre ---------- */
  const BOSS_K = 60 / 44;   // le dessin est fait à l'échelle 44×30, agrandi
  const gemRect = (b) => ({ x: b.face > 0 ? b.x + 29 * BOSS_K : b.x + b.w - 41 * BOSS_K, y: b.y - 2, w: 12 * BOSS_K, h: 13 * BOSS_K });
  function updateBoss() {
    const b = R.boss, p = R.player;
    b.t++;
    const vif = b.etat === "gratte" || b.etat === "charge" || b.etat === "attend";
    switch (b.etat) {
      case "attend": if (--b.k <= 0) { b.etat = "gratte"; b.k = 70 - b.hits * 12; } break;
      case "reveil":
        if (--b.k <= 0) {
          b.etat = "gratte"; b.k = 70 - b.hits * 12;
          // il se secoue : si Max est sur son dos, il est éjecté sur le côté
          if (p.alive && p.x + p.w > b.x && p.x < b.x + b.w && p.y + p.h <= b.y + 6 && p.y + p.h > b.y - 30) {
            const cote = p.x + p.w / 2 < b.x + b.w / 2 ? -1 : 1;
            p.vx = cote * 3; p.vy = -5; p.x = cote < 0 ? b.x - p.w - 1 : b.x + b.w + 1; p.invuln = Math.max(p.invuln, 40);
          } else if (p.alive && overlap(p, b)) { p.x = p.x + p.w / 2 < b.x + b.w / 2 ? b.x - p.w - 1 : b.x + b.w + 1; }
        }
        break;
      case "gratte":
        b.face = p.x + p.w / 2 < b.x + b.w / 2 ? -1 : 1;
        if (R.t % 4 === 0) R.particles.push({ x: b.x + b.w / 2 - b.face * 18, y: b.y + b.h, vx: -b.face * (0.5 + Math.random()), vy: -0.6, s: 2, life: 20, color: P.stoneDark, g: 0.05 });
        if (--b.k <= 0) { b.etat = "charge"; b.vx = b.face * (2.9 + b.hits * 0.45) * R.slow; sfx.boom(); R.shake = Math.max(R.shake, 3); }
        break;
      case "charge": {
        b.x += b.vx;
        if (R.t % 3 === 0) R.particles.push({ x: b.x + b.w / 2 - b.face * 22, y: b.y + b.h - 2, vx: -b.face, vy: -0.5, s: 3, life: 18, color: P.stoneDark, g: 0.05 });
        if (rectHitsSolid(b.x, b.y + 4, b.w, b.h - 8)) {
          b.x = b.vx > 0 ? Math.floor((b.x + b.w) / T) * T - b.w : Math.floor(b.x / T + 1) * T;
          b.vx = 0; b.etat = "sonne"; b.k = Math.round(190 * (1 + 0.15 * R.assist)); b.touche = false;
          R.shake = 10; sfx.boom(); burst(b.face > 0 ? b.x + b.w : b.x, b.y + 12, P.stoneTop, 20, 2.5);
          // le choc fait tomber des pierres du plafond
          const n = 3 + b.hits;
          for (let i = 0; i < n; i++) {
            let rx = (2 + Math.random() * (COLS - 4)) * T;
            if (i === 0) rx = p.x + (Math.random() - 0.5) * 20;
            R.rocks.push({ x: rx, y: T, w: 10, h: 10, vy: 0, warn: 40 + i * 18 });
          }
          if (b.hits === 2) bossPics();
          if (!progress.bossVu) { progress.bossVu = true; saveProgress(); R.hint = { text: "Il est sonné ! Frappe la pierre de jade sur son front (massue, ou saute-lui sur la tête)", t: 0, dur: 260 }; }
        }
        break;
      }
      case "sonne":
        if (--b.k <= 0) { b.etat = "reveil"; b.k = 30; b.face = -b.face; }
        break;
      case "dort":
        if (b.k > 0 && --b.k === 0) doAction(["showdoor"]);
        if (R.t % 50 === 0) R.particles.push({ zzz: true, x: b.x + b.w / 2, y: b.y - 2, vx: 0.2, vy: -0.4, s: 6, life: 70, color: C.text, g: 0 });
        break;
    }
    // pierres qui tombent
    for (const r of R.rocks) {
      if (r.warn > 0) { r.warn--; if (r.warn % 6 === 0) R.particles.push({ x: r.x + Math.random() * 10, y: T + 2, vx: 0, vy: 0.5, s: 2, life: 16, color: P.stoneTop, g: 0.1 }); continue; }
      r.vy = Math.min(r.vy + PHYS.gravity, 7); r.y += r.vy;
      if (rectHitsSolid(r.x, r.y, r.w, r.h)) { r.done = true; burst(r.x + 5, r.y + 8, P.stoneTop, 8, 1.4); sfx.crumble(); }
    }
    R.rocks = R.rocks.filter((r) => !r.done && r.y < H + 20);
    // pics qui sortent du sol à la dernière phase
    for (const s of R.bossSpikes) {
      s.t--;
      if (s.t === 120) { setTiles(s.x, s.y, s.w, 1, "^", true); sfx.spike(); }
      if (s.t === 0) setTiles(s.x, s.y, s.w, 1, ".", false);
      if (s.t > 120 && s.t % 8 === 0) for (let i = 0; i < s.w; i++) R.particles.push({ x: (s.x + i) * T + 8, y: (s.y + 1) * T, vx: 0, vy: -0.8, s: 2, life: 12, color: C.danger, g: 0 });
    }
    R.bossSpikes = R.bossSpikes.filter((s) => s.t > 0);
    if (!p.alive || game.mode !== "play") return;
    for (const r of R.rocks) if (r.warn <= 0 && overlap(p, r)) return kill("Une pierre sur la tête. Le temple se venge.");
    if (vif && overlap(p, { x: b.x + 6, y: b.y + 8, w: b.w - 12, h: b.h - 8 })) return kill("Écrasé par le Jaguar de pierre !");
  }
  function bossPics() {
    const p = R.player, px = Math.floor((p.x + p.w / 2) / T), y = ROWS - 2;
    const zones = [];
    for (let essai = 0; essai < 40 && zones.length < 2; essai++) {
      const x = 4 + Math.floor(Math.random() * (COLS - 12));
      if (Math.abs(x + 1 - px) < 5 || zones.some((z) => Math.abs(z - x) < 6)) continue;
      zones.push(x);
    }
    for (const x of zones) R.bossSpikes.push({ x, y, w: 3, t: 160 });
  }
  function bossTouche() {
    const b = R.boss;
    if (b.etat !== "sonne" || b.touche) return false;
    b.touche = true; b.hits++;
    sfx.bonk(); R.shake = 6;
    burst(gemRect(b).x + 6, gemRect(b).y + 5, C.jade, 22, 2.4);
    if (b.hits >= 3) {
      b.etat = "dort"; b.k = 0;
      R.rocks = [];
      for (const s of R.bossSpikes) setTiles(s.x, s.y, s.w, 1, ".", false);
      R.bossSpikes = [];
      R.hint = { text: "Le Jaguar de pierre s'endort… pour mille ans. La porte s'ouvre !", t: 0, dur: 240 };
      b.k = 60;   // la porte apparaît une seconde plus tard
    } else {
      b.etat = "reveil"; b.k = 50; b.face = -b.face;
      R.hint = { text: b.hits === 1 ? "Touché ! Encore deux fois." : "Touché ! Une dernière fois… attention, il s'énerve !", t: 0, dur: 160 };
    }
    return true;
  }

  function neigeQuiTombe() {
    const n = R.blizzard ? 3 : 1;
    if (R.t % (R.blizzard ? 1 : 3) !== 0) return;
    const vent = R.winds.length ? R.winds[0].f * 3 : 0;
    for (let i = 0; i < n; i++) R.particles.push({ x: cam.x + Math.random() * (view.w + 80) - 40, y: cam.y - 4, vx: (R.blizzard ? -2.2 : -0.3) + vent + Math.random() * 0.4, vy: 0.6 + Math.random() * 0.6, s: 1.5 + Math.random() * 1.5, life: 260, color: "rgba(255,255,255,0.85)", g: 0, flocon: true });
  }

  function updateBulles() {
    for (const b of R.bulles) if (R.t % 5 === 0) R.particles.push({ x: b.x * T + 4 + Math.random() * 8, y: (b.y + 1) * T - 2, vx: (Math.random() - 0.5) * 0.3, vy: -1.4 - Math.random() * 0.8, s: 2 + Math.random() * 2, life: Math.max(10, (b.y + 1 - b.top) * T / 1.8), color: "rgba(210,245,255,0.75)", g: 0, bulle: true });
  }

  function updateVines() {
    for (const v of R.vines) { v.ang = v.amp * Math.sin(R.t * v.w * R.slow + v.ph); }
  }
  // plateformes qui coulent : une fois qu'on s'y pose, elles s'enfoncent d'une case toutes les ~0,4 s
  function updateSink() {
    for (const [k, t] of R.sink) {
      const [x, y] = k.split(",").map(Number);
      if (R.tiles[y][x] !== "n") { R.sink.delete(k); continue; }
      const nt = t + R.slow;
      if (Math.floor(nt / 34) > Math.floor(t / 34) && nt > 36) {
        R.tiles[y][x] = ".";
        R.sink.delete(k);
        if (y + 1 < ROWS && tileAt(x, y + 1) === ".") { R.tiles[y + 1][x] = "n"; R.sink.set(x + "," + (y + 1), nt); }
        for (let i = 0; i < 3; i++) R.particles.push({ x: x * T + Math.random() * T, y: y * T + 14, vx: (Math.random() - 0.5), vy: -0.6, s: 2, life: 20, color: "#8a6a3a", g: 0.05 });
      } else R.sink.set(k, nt);
    }
  }
  const FLAME_PER = 200;
  function flameRect(f) {
    const len = f.len * T;
    return f.dir > 0 ? { x: (f.x + 1) * T, y: f.y * T + 4, w: len, h: 9 } : { x: f.x * T - len, y: f.y * T + 4, w: len, h: 9 };
  }
  function updateFlames() {
    for (const f of R.flames) {
      f.t += R.slow;
      const ph = (f.t + 1000) % FLAME_PER;
      f.warn = ph >= 70 && ph < 110;
      f.on = ph >= 110 && ph < 165 && R.t > 100;
      if (f.on && R.t % 2 === 0) R.particles.push({ x: flameRect(f).x + Math.random() * f.len * T, y: f.y * T + 6 + Math.random() * 5, vx: f.dir * (0.6 + Math.random()), vy: -0.4 - Math.random() * 0.6, s: 2 + Math.random() * 2, life: 14, color: Math.random() < 0.5 ? "#ffb347" : "#e8621f", g: -0.02 });
    }
  }
  function updateBeams() {
    for (const b of R.beams) {
      const k = 0.5 - 0.5 * Math.cos((2 * Math.PI * R.t * R.slow) / b.per);
      b.ang = b.a0 + (b.a1 - b.a0) * k;
      b.pts = [];
      if (R.t < 100) continue;
      const dx = Math.sin(b.ang), dy = Math.cos(b.ang);
      let x = b.sx, y = b.sy;
      for (let i = 0; i < 400; i++) {
        x += dx * 3; y += dy * 3;
        if (x < 0 || x > W || y > H || isSolid(tileAt(Math.floor(x / T), Math.floor(y / T)))) break;
        if (i % 2 === 0) b.pts.push([x, y]);
      }
      b.end = [x, y];
    }
  }
  function updateSecrets() {
    const p = R.player;
    for (const s of R.secretRooms) {
      if (!s.seen && p.alive && overlap(p, { x: s.x * T, y: s.y * T, w: s.w * T, h: s.h * T })) {
        s.seen = true; sfx.door(); burst(p.x + 5, p.y + 4, C.jade, 16, 1.6);
        R.hint = { text: "Salle secrète !", t: 0, dur: 140 };
      }
      if (s.seen && s.fade > 0) s.fade = Math.max(0, s.fade - 0.06);
    }
  }

  function updateMovers() {
    const p = R.player;
    for (const m of R.movers) {
      m.t++;
      let nx, ny;
      if (m.style === "wagon") {
        // wagonnet : il attend Max, file jusqu'au bout des rails… et bascule dans la lave
        const p2 = R.player;
        if (!m.parti && p2 && p2.onMover === m) { m.parti = true; sfx.flee(); }
        nx = m.x; ny = m.y;
        if (m.parti && !m.fin) { m.v = Math.min((m.v || 0) + 0.035, 2.1 * R.slow); nx = m.x + m.v; if (nx >= m.x0 + m.dx) { nx = m.x0 + m.dx; m.fin = true; m.k = 70; m.v = 0; } }
        else if (m.fin && --m.k < 0) { m.vy = (m.vy || 0) + 0.15; ny = m.y + m.vy; }
      }
      else if (m.circ) { const a = m.circ.a + m.t * m.sp * 0.01 * R.slow; nx = m.circ.cx + Math.cos(a) * m.circ.r - m.w / 2; ny = m.circ.cy + Math.sin(a) * m.circ.r; }
      else { const s = (1 - Math.cos(m.t * m.sp * 0.02)) / 2; nx = m.x0 + m.dx * s; ny = m.y0 + m.dy * s; }
      m.mx = nx - m.x; m.my = ny - m.y; m.x = nx; m.y = ny;
      // Max est transporté s'il se tient dessus
      if (p && p.alive && p.onMover === m) { p.x += m.mx; p.y += m.my; if (rectHitsSolid(p.x, p.y, p.w, p.h)) { p.x -= m.mx; } }
    }
  }
  function landOnMovers(p, prevBottom) {
    p.onMover = null;
    if (p.vy < 0) return;
    const bs = R.boss;
    if (bs && !bs.kind && (bs.etat === "sonne" || bs.etat === "dort" || bs.etat === "reveil") && p.x + p.w > bs.x + 4 && p.x < bs.x + bs.w - 4 && prevBottom <= bs.y + 3 && p.y + p.h >= bs.y - 0.5) {
      // sur le dos du jaguar sonné : un saut sur la tête compte comme un coup
      if (bossTouche()) { p.vy = -4.8; p.spring = false; return; }
      p.y = bs.y - p.h; p.vy = 0; p.grounded = true; return;
    }
    for (const s of R.stuck) {
      if (p.x + p.w <= s.x || p.x >= s.x + s.w) continue;
      if (prevBottom <= s.y + 2 && p.y + p.h >= s.y - 0.5) { p.y = s.y - p.h; p.vy = 0; p.grounded = true; return; }
    }
    for (const m of R.movers) {
      if (p.x + p.w <= m.x + 1 || p.x >= m.x + m.w - 1) continue;
      if (prevBottom <= m.y + 2 + Math.max(0, m.my) && p.y + p.h >= m.y - 0.5) {
        p.y = m.y - p.h; p.vy = 0; p.grounded = true; p.onMover = m; return;
      }
    }
  }
  function updateCrushers() {
    for (const c of R.crushers) {
      const prevT = c.t;
      c.t = (c.t + R.slow) % 170;
      const t = c.t;
      let off;
      if (t < 70) off = 0;                                   // en haut, au repos
      else if (t < 74) off = 0.02;                           // il frémit
      else if (t < 84) off = ((t - 74) / 10) ** 2;           // chute
      else if (t < 120) off = 1;                             // en bas
      else off = 1 - (t - 120) / 50;                         // remonte
      const before = c.y;
      c.y = c.y0 + off * c.drop + (t >= 70 && t < 74 ? (Math.random() - 0.5) * 2 : 0);
      if (prevT < 84 && t >= 84) { R.shake = Math.max(R.shake, 4); sfx.crumble(); burst(c.x + c.w / 2, c.y + c.h, P.stoneTop, 6, 1.2); }
      c.down = off > 0.15 && c.y >= before;
    }
  }
  function updateFlood() {
    const f = R.flood;
    if (!f || game.mode !== "play") return;
    f.level += f.top ? f.speed : -f.speed;
    if (!f.top && f.level < 0) f.level = 0;
  }
  function updateTimer() {
    if (!R.timer || game.mode !== "play") return;
    R.timer--;
    if (R.timer === 0) { R.shake = 10; kill("Trop tard, Max ! La salle s'effondre !", "timer"); }
  }

  function updateTilesFx() {
    for (const [k, v] of R.shakeTiles) {
      if (v <= 1) {
        R.shakeTiles.delete(k);
        const [x, y] = k.split(",").map(Number);
        dropTile(x, y);
        sfx.crumble();
        R.shake = Math.max(R.shake, 3);
      } else R.shakeTiles.set(k, v - 1);
    }
    for (const [k, v] of R.spikeAnim) if (v < 1) R.spikeAnim.set(k, Math.min(1, v + 0.25));
    for (const [k, v] of R.springAnim) { if (v <= 1) R.springAnim.delete(k); else R.springAnim.set(k, v - 1); }
  }

  function updateDoor() {
    const d = R.door;
    if (!d || !d.moving) return;
    const dx = d.tx - d.x, dy = d.ty - d.y, dist = Math.hypot(dx, dy), sp = 6;
    if (dist <= sp) { d.x = d.tx; d.y = d.ty; d.moving = false; }
    else { d.x += (dx / dist) * sp; d.y += (dy / dist) * sp; }
    if (R.t % 3 === 0) R.particles.push({ x: d.x + 6, y: d.y + 20, vx: 0, vy: -0.3, s: 2, life: 20, color: C.door, g: 0 });
  }

  function updateEnemies() {
    const reveil = R.t > 90;   // les ennemis attendent 1,5 s à l'arrivée
    for (const e of R.enemies) {
      if (!e.alive) continue;
      e.t += 0.1;
      if (!reveil) continue;
      if (e.stun > 0 && e.kind === "O") { e.y += 2; if (e.y > H + 20) e.alive = false; continue; }
      if (e.stun > 0 && e.kind === "A") { e.stun--; e.y = Math.min(e.y + 1, e.hy + 60); continue; }
      if (e.stun > 0 && (e.kind === "h" || e.kind === "Z")) { e.stun--; if (e.kind === "Z") { e.x += e.vx; e.vx *= 0.95; if (rectHitsSolid(e.x, e.y, e.w, e.h)) { e.x -= e.vx; e.vx = 0; } } continue; }
      if (e.stun > 0 && (e.kind === "e" || e.kind === "l")) { e.stun--; if (e.kind === "l") { e.out = Math.max(0, e.out - 0.05); placeAnguille(e); } continue; }
      if (e.stun > 0) {
        e.stun--;
        if (e.kind !== "b") { e.vx = 0; e.vy = Math.min((e.vy || 0) + PHYS.gravity, PHYS.maxFall); moveBody(e); if (e.y > H + 20) e.alive = false; }
        if (e.stun === 0) { e.vx = e.dirBack || (e.kind === "s" ? -0.9 : e.kind === "m" ? -0.45 : e.kind === "k" ? -0.8 : e.kind === "r" ? -0.5 : e.kind === "L" ? -0.7 : e.kind === "C" ? -0.4 : e.kind === "S" ? -0.35 : 0.7); if (e.kind === "L" || e.kind === "C") e.etat = "rode"; if (e.kind === "j") { e.etat = "repos"; e.k = 40; e.vx = 0; } }
        continue;
      }
      if (e.kind === "e") { updateMeduse(e); continue; }
      if (e.kind === "h") { updateGlobe(e); continue; }
      if (e.kind === "Z") { updateRequin(e); continue; }
      if (e.kind === "M") { updateMine(e); continue; }
      if (e.kind === "X") { updateCoffre(e); continue; }
      if (e.kind === "A") { updateAigle(e); continue; }
      if (e.kind === "O") { updateOiseau(e); continue; }
      if ((e.kind === "N" || e.kind === "I" || e.kind === "U" || e.kind === "d") && updateOrEnnemi(e)) continue;
      if (e.kind === "E") { updateEtincelle(e); continue; }
      if (e.kind === "Y") { updateYetiPetit(e); continue; }
      if (e.kind === "L" || e.kind === "C") updateChasseur(e);
      if (e.kind === "l") { updateAnguille(e); continue; }
      if (e.kind === "k" && updateSinge(e)) continue;
      if (e.kind === "j") { updateJaguar(e); continue; }
      if (e.kind === "b") {
        e.x += e.vx;
        if (e.x < e.x0 || e.x + e.w > e.x1 || rectHitsSolid(e.x, e.y, e.w, e.h)) { e.x -= e.vx; e.vx = -e.vx; }
        const ny = e.by + Math.sin(e.t * 0.9) * 7;
        if (!rectHitsSolid(e.x, ny, e.w, e.h)) e.y = ny;
        continue;
      }
      e.vy = Math.min((e.vy || 0) + PHYS.gravity, PHYS.maxFall);
      const before = e.vx;
      const hit = moveBody(e);
      if (hit.hitX) e.vx = -before;
      else if (e.grounded) {
        const aheadX = before > 0 ? e.x + e.w + 1 : e.x - 1;
        if (!solidAt(aheadX, e.y + e.h + 2)) { e.vx = -before; e.x -= before; }
        else e.vx = before;
      } else e.vx = before;
      if (e.y > H + 20) e.alive = false;
    }
  }

  function updateShooters() {
    const rate = Math.round((R.def.arrowRate || 110) * (1 + 0.25 * R.assist));
    const p = R.player;
    if (R.t < 100) return;   // à l'arrivée, on laisse le temps de regarder avant les premières flèches
    for (const s of R.shooters) {
      s.t++;
      if (s.t % rate !== 0) continue;
      if (Math.abs(s.x - p.x) > 300) continue;
      R.arrows.push({ x: s.dir < 0 ? s.x - 9 : s.x + 1, y: s.y, w: 8, h: 3, vx: s.dir * 2.4 * R.slow, poison: s.poison });
      sfx.arrow();
    }
  }

  function updateProjectiles() {
    for (const a of R.arrows) {
      a.x += a.vx;
      if (rectHitsSolid(a.x, a.y, a.w, a.h) || a.x < -20 || a.x > W + 20) {
        a.dead = true;
        // niveau « flèches plantées » : une flèche en bois reste fichée dans la pierre et sert de marche
        if (R.def.planter && !a.poison && a.x > 0 && a.x < W) {
          const sx = a.vx > 0 ? Math.floor((a.x + a.w) / T) * T - 7 : Math.floor(a.x / T + 1) * T - 3;
          R.stuck.push({ x: sx, y: a.y, w: 10, h: 3, vx: a.vx, life: 300 });
          if (R.stuck.length > 6) R.stuck.shift();
        } else burst(a.x + 4, a.y + 1, C.wood, 3, 0.5);
      }
    }
    for (const s of R.stuck) s.life--;
    R.stuck = R.stuck.filter((s) => s.life > 0);
    R.arrows = R.arrows.filter((a) => !a.dead);
  }

  // Loup (chasse quand il voit Max) et chèvre (fonce tête baissée) : ils accélèrent vers Max
  function updateChasseur(e) {
    const p = R.player, dx = p.x - e.x, vu = p.alive && Math.abs(dx) < (e.kind === "L" ? 110 : 90) && Math.abs(p.y + p.h - (e.y + e.h)) < 18;
    if (e.kind === "L") {
      if (vu) { if (e.etat !== "chasse") { e.etat = "chasse"; sfx.god(); } e.vx = Math.sign(dx || 1) * 2.0 * R.slow; }
      else if (e.etat === "chasse") { e.etat = "rode"; e.vx = Math.sign(e.vx || -1) * 0.7; }
    } else {
      if (e.etat === "broute" && vu) { e.etat = "prepare"; e.k = 30; e.vx = 0; e.dirCharge = Math.sign(dx || 1); }
      else if (e.etat === "prepare") { e.vx = 0; if (--e.k <= 0) { e.etat = "charge"; sfx.flee(); } }
      else if (e.etat === "charge") { e.vx = e.dirCharge * 2.6 * R.slow; if (R.t % 4 === 0) R.particles.push({ x: e.x + 7, y: e.y + 10, vx: -e.dirCharge, vy: -0.4, s: 2, life: 14, color: "#f4f8fc", g: 0.05 }); }
    }
  }
  // Aigle : plane en hauteur ; quand Max saute près de lui, il pique droit sur lui
  function updateAigle(e) {
    const p = R.player;
    e.t++;
    if (e.etat === "plane") {
      e.x += e.vx; if (Math.abs(e.x - e.hx) > 50 || rectHitsSolid(e.x, e.y, e.w, e.h)) e.vx = -e.vx;
      e.y = e.hy + Math.sin(e.t * 0.05) * 4;
      if (p.alive && !p.grounded && !p.swim && Math.abs(p.x - e.x) < 90 && p.y > e.y) { e.etat = "pique"; e.k = 0; const d = Math.hypot(p.x - e.x, p.y - e.y) || 1; e.dx = ((p.x - e.x) / d) * 3.2 * R.slow; e.dy = ((p.y - e.y) / d) * 3.2 * R.slow; sfx.flee(); }
    } else if (e.etat === "pique") {
      e.x += e.dx; e.y += e.dy;
      if (++e.k > 50 || rectHitsSolid(e.x, e.y, e.w, e.h)) e.etat = "remonte";
    } else {
      const d = Math.hypot(e.hx - e.x, e.hy - e.y);
      if (d < 2) { e.etat = "plane"; e.x = e.hx; e.y = e.hy; }
      else { e.x += ((e.hx - e.x) / d) * 1.4; e.y += ((e.hy - e.y) / d) * 1.4; }
    }
  }
  // Petit yéti : lance des boules de neige en cloche vers Max
  function updateYetiPetit(e) {
    const p = R.player;
    e.c = (e.c || 0) + 1; e.face = p.x < e.x ? -1 : 1;
    e.vy = Math.min((e.vy || 0) + PHYS.gravity, PHYS.maxFall); e.vx = 0; moveBody(e);
    const per = Math.round(150 * (1 + 0.25 * R.assist));
    e.lance = (e.c + Math.round(e.t * 10)) % per > per - 24;
    if ((e.c + Math.round(e.t * 10)) % per === 0 && p.alive && Math.abs(p.x - e.x) < 220 && Math.abs(p.y - e.y) < 90) {
      const dx = p.x + 5 - (e.x + 7), tt = Math.max(30, Math.min(70, Math.abs(dx) / 2.2));
      R.boules.push({ x: e.x + 7, y: e.y + 2, vx: dx / tt, vy: -(0.5 * 0.18 * tt) + (p.y - e.y) / tt, r: 3.5 });
      sfx.swing();
    }
  }
  function updateBoules() {
    const p = R.player;
    for (const b of R.boules) {
      b.vy += 0.18; b.x += b.vx; b.y += b.vy;
      if (isSolid(tileAt(Math.floor(b.x / T), Math.floor(b.y / T))) || b.y > H + 20) { b.done = true; burst(b.x, b.y, "#f4f8fc", 6, 1); }
      else if (p.alive && game.mode === "play" && Math.hypot(p.x + 5 - b.x, p.y + 8 - b.y) < 8) { b.done = true; burst(b.x, b.y, "#f4f8fc", 10, 1.4); kill("Une boule de neige en pleine figure !"); }
    }
    R.boules = R.boules.filter((b) => !b.done);
  }
  function updateGeysers() {
    for (const gz of R.geysers) {
      gz.t += R.slow;
      const ph = (gz.t + 1000) % 200;
      gz.warn = ph >= 110 && ph < 140;
      gz.on = ph >= 140 && ph < 185 && R.t > 60;
      if ((gz.on || (gz.warn && R.t % 3 === 0)) && R.t % 2 === 0) R.particles.push({ x: gz.x * T + 4 + Math.random() * 8, y: gz.y * T, vx: (Math.random() - 0.5) * 0.6, vy: gz.on ? -3 - Math.random() * 2 : -0.8, s: 3 + Math.random() * 3, life: gz.on ? 30 : 16, color: "rgba(235,245,255,0.75)", g: 0.02 });
    }
  }

  // Méduse : monte et descend doucement ; de temps en temps elle se charge et lance une décharge
  function updateMeduse(e) {
    e.t++;
    const ny = e.y0 + Math.sin(e.t * 0.025) * 22;
    if (!rectHitsSolid(e.x, ny, e.w, e.h)) e.y = ny;
    const ph = (e.t + 1000) % 220;
    e.charge = ph >= 150 && ph < 180;
    e.zap = ph >= 180 && ph < 210;
  }
  // Poisson-globe : il flotte tranquillement, puis se gonfle quand Max approche et le repousse fort
  function updateGlobe(e) {
    const p = R.player;
    e.t++;
    const ny = e.y0 + Math.sin(e.t * 0.03) * 8;
    if (!rectHitsSolid(e.x, ny, e.w, e.h)) e.y = ny;
    const cx = e.x + 5, cy = e.y + 5, d = Math.hypot(p.x + p.w / 2 - cx, p.y + p.h / 2 - cy);
    if (p.alive && d < 46) { if (e.gonfle < 1) { if (e.gonfle === 0) sfx.flee(); e.gonfle = Math.min(1, e.gonfle + 0.08); } }
    else e.gonfle = Math.max(0, e.gonfle - 0.01);
    const r = 5 + e.gonfle * 9;
    if (p.alive && d < r + 6) {
      const a = Math.atan2(p.y + p.h / 2 - cy, p.x + p.w / 2 - cx);
      p.vx = Math.cos(a) * (2 + 2.5 * e.gonfle); p.vy = Math.sin(a) * (2 + 2.5 * e.gonfle) - 0.5;
      p.x += Math.cos(a) * 3; if (!rectHitsSolid(p.x, p.y + Math.sin(a) * 3, p.w, p.h)) p.y += Math.sin(a) * 3;
      if (rectHitsSolid(p.x, p.y, p.w, p.h)) p.x -= Math.cos(a) * 3;
      sfx.bonk();
    }
  }
  // Requin : il dort, puis poursuit Max sous l'eau ; trop gros pour entrer dans les petites grottes
  function updateRequin(e) {
    const p = R.player;
    e.t++;
    const dx = p.x + p.w / 2 - (e.x + e.w / 2), dy = p.y + p.h / 2 - (e.y + e.h / 2);
    if (e.etat === "dort") { if (p.alive && Math.abs(dx) < 190 && Math.abs(dy) < 120 && p.swim) { e.etat = "chasse"; sfx.flee(); R.shake = Math.max(R.shake, 3); } else return; }
    const vmax = 1.2 * R.slow;
    e.vx += Math.sign(dx) * 0.05; e.vx = Math.max(-vmax, Math.min(vmax, e.vx));
    e.vy += Math.sign(dy) * 0.04; e.vy = Math.max(-0.9, Math.min(0.9, e.vy));
    if (Math.abs(dx) > 6) e.face = Math.sign(dx);
    e.x += e.vx; if (rectHitsSolid(e.x, e.y, e.w, e.h)) { e.x -= e.vx; e.vx *= -0.3; }
    e.y += e.vy; if (rectHitsSolid(e.x, e.y, e.w, e.h) || (R.eau != null && e.y < R.eau + 4)) { e.y -= e.vy; e.vy = 0; }
  }
  // Mine flottante : elle explose au contact ; un coup de massue la pousse droit devant
  function updateMine(e) {
    const p = R.player;
    e.t++;
    if (e.vx) {
      e.x += e.vx;
      if (rectHitsSolid(e.x, e.y, e.w, e.h)) return exploserMine(e);
      for (const o of R.enemies) if (o !== e && o.alive && o.kind === "M" && overlap(e, o)) { exploserMine(o); return exploserMine(e); }
    } else e.y = e.y0 + Math.sin(e.t * 0.04) * 3;
    if (p.alive && overlap(p, { x: e.x + 2, y: e.y + 2, w: e.w - 4, h: e.h - 4 })) exploserMine(e);
  }
  function exploserMine(e) {
    if (!e.alive) return;
    e.alive = false;
    const cx = e.x + 6, cy = e.y + 6;
    sfx.crumble(); sfx.flee(); R.shake = Math.max(R.shake, 9);
    burst(cx, cy, "#ffb347", 26, 2.6); burst(cx, cy, "rgba(220,240,255,0.8)", 16, 1.5);
    const tx = Math.floor(cx / T), ty = Math.floor(cy / T);
    for (let y = ty - 2; y <= ty + 2; y++) for (let x = tx - 2; x <= tx + 2; x++) {
      if (tileAt(x, y) === "B" && Math.hypot(x - tx, y - ty) <= 2.3) { dropTile(x, y); R.bCount--; }
    }
    for (const o of R.enemies) if (o.alive && o.kind === "M" && Math.hypot(o.x + 6 - cx, o.y + 6 - cy) < 34) R.later.push({ t: 8, act: [["boum", R.enemies.indexOf(o)]] });
    const p = R.player;
    if (p.alive && Math.hypot(p.x + p.w / 2 - cx, p.y + p.h / 2 - cy) < 30) kill("Boum ! Une mine, ça ne se touche pas. Ça se pousse avec la massue.");
  }
  // Coffre piégé : il ressemble à un trésor… et il mord quand on s'approche. Assommé, il donne de l'or.
  function updateCoffre(e) {
    const p = R.player;
    const dx = Math.abs(p.x + p.w / 2 - (e.x + 7)), dy = Math.abs(p.y + p.h / 2 - (e.y + 6));
    if (e.etat === "dort") { e.ouv = Math.max(0, e.ouv - 0.1); if (p.alive && dx < 30 && dy < 22) { e.etat = "ouvre"; e.k = Math.round(20 / R.slow); sfx.flee(); } }
    else if (e.etat === "ouvre") { e.ouv = Math.min(1, e.ouv + 0.08); if (--e.k <= 0) { e.etat = "mord"; e.k = 10; sfx.bonk(); R.shake = Math.max(R.shake, 3); if (p.alive && overlap(p, { x: e.x - 9, y: e.y - 8, w: e.w + 18, h: e.h + 8 })) kill("Ce trésor avait des dents !"); } }
    else if (e.etat === "mord") { e.ouv = 0; if (--e.k <= 0) { e.etat = "repos"; e.k = 70; } }
    else if (e.etat === "repos") { if (--e.k <= 0) e.etat = "dort"; }
  }
  function ouvrirCoffre(e) {
    e.alive = false; sfx.door();
    for (let i = 0; i < 3; i++) R.pickups.push({ kind: "coin2", x: e.x + i * 5, y: e.y - 6, w: 8, h: 10, taken: false, id: -1 });
    burst(e.x + 7, e.y + 4, C.gold, 14, 1.6);
    R.hint = { text: "Coffre assommé : il crache son or !", t: 0, dur: 120 };
  }
  function updateSas() {
    for (const g of R.sas) {
      const ph = (R.t * R.slow + g.ph) % g.per;
      const ferme = ph >= g.per / 2;
      g.alerte = !ferme && ph >= g.per / 2 - 40;
      if (ferme !== g.ferme) {
        g.ferme = ferme;
        for (let y = g.y; y < g.y + g.h; y++) R.tiles[y][g.x] = ferme ? "H" : ".";
        sfx.place();
        const p = R.player;
        if (ferme && p.alive && overlap(p, { x: g.x * T + 2, y: g.y * T, w: T - 4, h: g.h * T })) kill("Coincé dans le sas ! Il se referme en rythme.");
      }
    }
  }
  function updateTourbillons() {
    const p = R.player;
    for (const w of R.tourbillons) {
      if (R.t % 3 === 0) { const a = Math.random() * 6.28, r = Math.random() * w.r; R.particles.push({ x: w.x + Math.cos(a) * r, y: w.y + Math.sin(a) * r, vx: -Math.sin(a) * 1.4, vy: Math.cos(a) * 1.4, s: 2, life: 26, color: "rgba(200,240,255,0.6)", g: 0, bulle: true }); }
      if (!p.alive) continue;
      const dx = w.x - (p.x + p.w / 2), dy = w.y - (p.y + p.h / 2), d = Math.hypot(dx, dy);
      if (d < w.r) {
        game.invert = Math.max(game.invert, 40);
        p.vx += (dx / (d || 1)) * 0.06 - (dy / (d || 1)) * 0.12;
        p.vy += (dy / (d || 1)) * 0.06 + (dx / (d || 1)) * 0.12;
      }
    }
  }
  function updateLanterne() {
    const L = R.lanterne, p = R.player;
    const [tx, ty] = L.pts[L.i];
    const dx = tx - L.x, dy = ty - L.y, d = Math.hypot(dx, dy);
    if (d > 1) { const v = Math.min(d, 1.1); L.x += (dx / d) * v; L.y += (dy / d) * v; }
    else if (L.i < L.pts.length - 1 && Math.hypot(p.x + p.w / 2 - L.x, p.y + p.h / 2 - L.y) < 64) L.i++;
  }
  function updateTorpilles() {
    const p = R.player;
    for (const l of R.lanceurs) {
      l.t += R.slow;
      if (l.t >= 170) { l.t = 0; if (Math.abs(p.x - l.x * T) < 300) { R.torpilles.push({ x: l.x * T + 5, y: l.y * T - 12, w: 6, h: 12, vy: -0.4 }); sfx.flee(); } }
    }
    for (const q of R.torpilles) {
      q.vy = Math.max(q.vy - 0.04, -1.9 * R.slow); q.y += q.vy;
      if (R.t % 3 === 0) R.particles.push({ x: q.x + 3, y: q.y + 13, vx: 0, vy: 0.3, s: 2, life: 16, color: "rgba(210,245,255,0.7)", g: 0, bulle: true });
      if (rectHitsSolid(q.x, q.y, q.w, 4) || (R.eau != null && q.y < R.eau - 4)) { q.dead = true; burst(q.x + 3, q.y, "#ffb347", 10, 1.4); }
      else if (p.alive && overlap(p, q)) { q.dead = true; burst(q.x + 3, q.y, "#ffb347", 16, 2); kill("Torpille ! Le sous-marin d'Archibald tire depuis le fond."); }
    }
    R.torpilles = R.torpilles.filter((q) => !q.dead);
  }

  // Anguille : cachée dans un trou du rocher, elle jaillit quand Max passe devant
  function placeAnguille(e) {
    const len = 6 + e.out * 38;
    e.w = len; e.x = e.dir < 0 ? e.nid - len : e.nid;
  }
  function updateAnguille(e) {
    const p = R.player;
    e.t++;
    const devant = e.dir < 0 ? e.nid - p.x : p.x - e.nid;
    if (e.etat === "cache") {
      e.out = Math.max(0, e.out - 0.08);
      if (p.alive && devant > -8 && devant < 64 && Math.abs(p.y + 8 - (e.y + 3)) < 20) { e.etat = "guette"; e.k = Math.round(22 / R.slow); }
    } else if (e.etat === "guette") { if (--e.k <= 0) { e.etat = "sort"; e.k = 70; sfx.flee(); } }
    else if (e.etat === "sort") { e.out = Math.min(1, e.out + 0.12); if (--e.k <= 0) { e.etat = "rentre"; e.k = 60; } }
    else if (e.etat === "rentre") { e.out = Math.max(0, e.out - 0.06); if (--e.k <= 0) e.etat = "cache"; }
    placeAnguille(e);
  }

  // Singe voleur : rôde, fonce sur Max, lui chipe 3 pièces et s'enfuit. Assommé, il les lâche.
  function updateSinge(e) {
    const p = R.player;
    if (e.etat === "fuite") {
      e.vy = Math.min((e.vy || 0) + PHYS.gravity, PHYS.maxFall);
      e.vx = e.fuit * 2.5;
      const hit = moveBody(e);
      if (hit.hitX && e.grounded) e.vy = -5.6;
      else if (hit.hitX) e.fuit = -e.fuit;
      if (e.grounded && !solidAt(e.fuit > 0 ? e.x + e.w + 3 : e.x - 3, e.y + e.h + 2)) e.vy = -5.2;
      if (R.t % 5 === 0) R.particles.push({ x: e.x + 5, y: e.y + 2, vx: 0, vy: -0.4, s: 2, life: 14, color: C.gold, g: 0 });
      if (e.x < -30 || e.x > W + 30 || e.y > H + 20) { e.alive = false; if (e.butin) R.hint = { text: `Le singe s'est enfui avec ${e.butin} pièce${e.butin > 1 ? "s" : ""}…`, t: 0, dur: 150 }; }
      return true;
    }
    if (e.etat === "rode" && p.alive && Math.abs(p.x - e.x) < 90 && Math.abs(p.y - e.y) < 26) { e.etat = "fonce"; sfx.flee(); }
    if (e.etat === "fonce") e.vx = Math.sign(p.x - e.x || 1) * 2.1;
    return false;
  }
  function volParSinge(e) {
    const p = R.player;
    const n = Math.min(3, progress.pieces || 0);
    progress.pieces = (progress.pieces || 0) - n; saveProgress();
    e.butin = n; e.etat = "fuite"; e.fuit = Math.sign(e.x - p.x) || 1; e.vy = -4;
    p.vx = -e.fuit * 2.4; p.vy = -2.5; p.invuln = Math.max(p.invuln, 30);
    sfx.flee(); R.shake = Math.max(R.shake, 2);
    R.hint = { text: n ? `Un singe t'a volé ${n} pièce${n > 1 ? "s" : ""} ! Assomme-le pour les récupérer` : "Le singe n'a rien trouvé dans tes poches !", t: 0, dur: 200 };
  }
  // Jeune jaguar : guette, se ramasse quand Max passe devant lui, puis bondit
  function updateJaguar(e) {
    const p = R.player;
    e.vy = Math.min((e.vy || 0) + PHYS.gravity, PHYS.maxFall);
    if (e.etat === "guette") {
      e.vx = 0;
      const dx = p.x - e.x;
      if (p.alive && Math.abs(dx) < 7 * T && Math.abs(p.y + p.h - (e.y + e.h)) < 20) { e.etat = "ramasse"; e.k = Math.round(40 / R.slow); e.face = Math.sign(dx) || 1; sfx.god(); }
    } else if (e.etat === "ramasse") {
      e.vx = 0;
      if (--e.k <= 0) { e.etat = "bond"; e.vx = e.face * 3.1 * R.slow; e.vy = -3.8; }
    } else if (e.etat === "bond") {
      if (e.grounded && e.vy >= 0) { e.etat = "repos"; e.k = 70; e.vx = 0; }
    } else if (e.etat === "repos") {
      e.vx = 0;
      if (--e.k <= 0) { e.etat = "guette"; e.face = Math.sign(p.x - e.x) || e.face; }
    }
    const hit = moveBody(e);
    if (hit.hitX) e.vx = 0;
    if (e.grounded && e.etat === "bond") { e.etat = "repos"; e.k = 70; e.vx = 0; }
    if (e.y > H + 20) e.alive = false;
  }

  // Assommé : l'ennemi ne bouge plus et devient inoffensif pendant ~4 secondes
  function stunEnemy(e, dir) {
    if (e.kind === "M") { if (!e.vx) { e.vx = (dir || R.player.face) * 2.2; sfx.swing(); } return; }   // on pousse la mine
    if (e.kind === "Z") { e.stun = 110; e.vx = (dir || 1) * 2; e.vy = 0; sfx.bonk(); burst(e.x + 14, e.y + 6, C.gold, 8, 1.2); return; }
    if (e.kind === "h") { e.stun = 200; e.gonfle = 0; sfx.bonk(); burst(e.x + 5, e.y + 5, C.gold, 6, 1); return; }
    if (e.kind === "X") { ouvrirCoffre(e); return; }
    if (e.kind === "S") { burst(e.x + 6, e.y + 6, "#f4f8fc", 16, 1.6); }
    if (e.kind === "N" && e.choc > 0) return;
    if (e.kind === "N" && e.armure) { e.armure = false; e.choc = 24; sfx.bonk(); burst(e.x + 7, e.y + 4, "#ff7a2a", 10, 1.4); R.shake = Math.max(R.shake, 3); if (!progress.golemVu) { progress.golemVu = true; saveProgress(); R.hint = { text: "Golem de lave : sa carapace est fendue… encore un coup !", t: 0, dur: 180 }; } return; }
    if (e.kind === "O") { e.stun = 999; e.vx = 0; sfx.bonk(); burst(e.x + 6, e.y + 4, C.gold, 6, 1); return; }
    if (e.kind === "A") { e.stun = 200; e.etat = "remonte"; sfx.bonk(); burst(e.x + 6, e.y + 4, C.gold, 6, 1); return; }
    if (e.kind === "e" || e.kind === "l") { e.stun = 220; sfx.bonk(); burst(e.x + 5, e.y + 4, C.gold, 6, 1); if (e.kind === "l") e.etat = "rentre"; return; }
    if (e.kind === "k" && e.butin) {
      // le singe lâche les pièces volées
      for (let i = 0; i < e.butin; i++) R.pickups.push({ kind: "coin2", x: e.x + i * 6 - 4, y: e.y - 4, w: 8, h: 10, taken: false, id: -1 });
      R.hint = { text: "Tu as récupéré tes pièces !", t: 0, dur: 120 };
      e.butin = 0;
    }
    if (e.kind === "k") e.etat = "rode";
    if (e.vx) e.dirBack = e.vx;
    e.stun = 260;
    if (e.kind !== "b") { e.vx = 0; e.vy = -2; e.x += (dir || 0) * 3; }
    sfx.bonk();
    R.shake = Math.max(R.shake, 2);
    for (let i = 0; i < 6; i++) R.particles.push({ x: e.x + e.w / 2, y: e.y, vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random(), s: 2, life: 22, color: C.gold, g: 0.08 });
  }

  // Le rival attend devant la porte ; quand le joueur approche, il file dedans en le narguant.
  function updateRival() {
    const r = R.rival, p = R.player;
    if (!r || r.state === "gone") return;
    r.t++;
    const d = R.door;
    if (r.state === "wait") {
      r.face = p.x < r.x ? -1 : 1;
      if (Math.abs(p.x - r.x) < 150 && Math.abs(p.y - r.y) < 70 && game.mode === "play") {
        r.state = "run";
        if (!R.say && !R.def.monde) R.say = { text: RIVAL_DOOR[(R.index + R.deaths) % RIVAL_DOOR.length], t: 0, dur: 140 };
        sfx.flee();
      }
    } else if (r.state === "run") {
      r.face = 1;
      const tx = d.x + 1;
      r.x += Math.sign(tx - r.x) * Math.min(2.6, Math.abs(tx - r.x));
      if (Math.abs(tx - r.x) < 1) { r.state = "gone"; burst(d.x + 6, d.y + 12, C.rivalHelmet, 10, 1.2); }
    }
  }

  function updateDynamites() {
    for (const d of R.dynamites) {
      d.vy = Math.min(d.vy + PHYS.gravity, PHYS.maxFall);
      moveBody(d);
      d.fuse--;
      if (d.fuse % 8 === 0) R.particles.push({ x: d.x + 3, y: d.y - 2, vx: (Math.random() - 0.5) * 0.6, vy: -0.6, s: 2, life: 14, color: C.hat, g: 0 });
      if (d.fuse <= 0) explode(d.x + d.w / 2, d.y + d.h / 2);
    }
    R.dynamites = R.dynamites.filter((d) => d.fuse > 0);
  }

  function explode(cx, cy) {
    const rad = 30;
    sfx.boom();
    R.shake = 8;
    for (let ty = Math.floor((cy - rad) / T); ty <= Math.floor((cy + rad) / T); ty++)
      for (let tx = Math.floor((cx - rad) / T); tx <= Math.floor((cx + rad) / T); tx++) {
        if (tileAt(tx, ty) !== "B") continue;
        if (Math.hypot(tx * T + 8 - cx, ty * T + 8 - cy) <= rad) {
          R.tiles[ty][tx] = "."; R.bCount--;
          for (let i = 0; i < 6; i++)
            R.particles.push({ x: tx * T + 8, y: ty * T + 8, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.8) * 4, s: 3 + Math.random() * 3, life: 50, color: P.crack, g: 0.2 });
        }
      }
    for (const e of R.enemies) if (e.alive && Math.hypot(e.x + 6 - cx, e.y + 7 - cy) < rad + 6) stunEnemy(e, Math.sign(e.x - cx));
    for (const b of R.boulders) if (Math.hypot(b.x + 14 - cx, b.y + 14 - cy) < rad + 12) { b.dead = true; burst(b.x + 14, b.y + 14, P.stoneTop, 18, 2.5); }
    R.boulders = R.boulders.filter((b) => !b.dead);
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 3.5;
      R.particles.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, s: 2 + Math.random() * 4, life: 24 + Math.random() * 16, color: Math.random() < 0.5 ? C.hat : C.danger, g: 0.05 });
    }
    R.particles.push({ ring: true, x: cx, y: cy, r: 4, life: 14 });
    const p = R.player;
    if (p.alive && game.mode === "play" && Math.hypot(p.x + 5 - cx, p.y + 7 - cy) < rad) kill();
  }

  function updateBoulders() {
    for (const b of R.boulders) {
      b.vy = Math.min(b.vy + PHYS.gravity, PHYS.maxFall);
      b.vx = b.dir * b.speed;
      if (b.casse) {
        const fx = Math.floor((b.dir > 0 ? b.x + b.w + 2 : b.x - 2) / T);
        for (let ty = Math.floor(b.y / T); ty <= Math.floor((b.y + b.h - 1) / T); ty++) if (tileAt(fx, ty) === "B") {
          R.tiles[ty][fx] = "."; R.bCount--; R.shake = Math.max(R.shake, 5); sfx.boom();
          for (let i = 0; i < 6; i++) R.particles.push({ x: fx * T + 8, y: ty * T + 8, vx: b.dir * Math.random() * 3, vy: -Math.random() * 3, s: 3 + Math.random() * 3, life: 50, color: P.crack, g: 0.2 });
        }
      }
      if (b.neige && b.w < 40 && b.grounded && R.t % 4 === 0) {
        // la boule de neige grossit (elle reste posée au sol)
        const k = 1; if (!rectHitsSolid(b.x - (b.dir < 0 ? k : 0), b.y - k, b.w + k, b.h + k)) { b.y -= k; b.w += k; b.h += k; if (b.dir < 0) b.x -= k; }
      }
      const hit = moveBody(b);
      if (hit.hitX) b.dir = -b.dir;
      b.rot += (b.dir * b.speed) / 14;
      if (b.grounded && R.t % 6 === 0) R.particles.push({ x: b.x + 14 - b.dir * 12, y: b.y + 27, vx: -b.dir * 0.5, vy: -0.4, s: 2, life: 18, color: P.stoneDark, g: 0.05 });
      if (b.grounded && !b.wasGrounded) R.shake = Math.max(R.shake, 3);
      b.wasGrounded = b.grounded;
      if (b.y > H + 40) b.dead = true;
    }
    R.boulders = R.boulders.filter((b) => !b.dead);
  }

  function updateBlocks() {
    for (const k of R.blocks) {
      if (!k.falling) {
        if (--k.delay <= 0) {
          k.falling = true;
          const [x, y, w, h] = k.tiles;
          for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) { R.tiles[ty][tx] = "."; R.wobble.delete(tx + "," + ty); }
          sfx.crumble();
        }
        continue;
      }
      k.vy = Math.min(k.vy + PHYS.gravity * 1.2, 8);
      k.y += k.vy;
      if (rectHitsSolid(k.x, k.y, k.w, k.h)) {
        k.y = Math.floor((k.y + k.h) / T) * T - k.h;
        const tx = Math.round(k.x / T), ty = Math.round(k.y / T);
        if (k.spike) { if (ty < ROWS) { R.tiles[ty][tx] = "^"; R.spikeAnim.set(tx + "," + ty, 1); } }
        else for (let yy = 0; yy < k.h / T; yy++) for (let xx = 0; xx < k.w / T; xx++) if (ty + yy < ROWS) R.tiles[ty + yy][tx + xx] = "#";
        k.done = true;
        R.shake = Math.max(R.shake, 5);
        sfx.crumble();
        burst(k.x + k.w / 2, k.y + k.h, P.stoneTop, 10, 1.5);
      }
      if (k.y > H + 40) k.done = true;
    }
    R.blocks = R.blocks.filter((k) => !k.done);
  }

  function updateParticles() {
    for (const q of R.particles) {
      q.life--;
      if (q.ring) { q.r += 3; continue; }
      q.x += q.vx; q.y += q.vy; q.vy += q.g || 0;
    }
    R.particles = R.particles.filter((q) => q.life > 0);
  }

  function burst(x, y, color, n, sp = 1.2) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = Math.random() * sp + 0.3;
      R.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.5, s: 2 + Math.random() * 2, life: 30 + Math.random() * 20, color, g: 0.12 });
    }
  }

  function checkHazards() {
    const p = R.player;
    if (!p.alive) return;
    const x0 = Math.floor(p.x / T), x1 = Math.floor((p.x + p.w - 0.01) / T);
    const y0 = Math.floor(p.y / T), y1 = Math.floor((p.y + p.h - 0.01) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const c = tileAt(tx, ty);
      if (c === "^" && overlap(p, { x: tx * T + 2, y: ty * T + 7, w: 12, h: 9 })) return kill();
      if (c === "v" && overlap(p, { x: tx * T + 2, y: ty * T, w: 12, h: 12 })) return kill();
    }
    for (const e of R.enemies) {
      if (!e.alive || e.stun || e.kind === "h" || e.kind === "M" || e.kind === "X") continue;
      if (!overlap(p, { x: e.x + 1, y: e.y + 1, w: e.w - 2, h: e.h - 1 })) continue;
      if (p.vy > 0.5 && p.y + p.h - e.y < 10) { stunEnemy(e, 0); p.vy = e.kind === "C" ? -7.2 : -4.6; p.spring = e.kind === "C"; continue; }
      if (e.kind === "k") { if (e.etat !== "fuite" && !(p.invuln > 0)) volParSinge(e); continue; }
      if (e.kind === "l" && e.out < 0.25) continue;
      return kill(e.kind === "j" ? "Croqué par un bébé jaguar. Il est mignon, pourtant." : e.kind === "Z" ? "Le requin avait faim. Cache-toi dans les petites grottes !" : null);
    }
    for (const e of R.enemies) if (e.kind === "e" && e.alive && !e.stun && e.zap && Math.hypot(p.x + 5 - (e.x + 5), p.y + 8 - (e.y + 5)) < 26) return kill("Bzzz ! La méduse t'a électrocuté.");
    if (R.def.monde === 5) dangersOr(p);
    if (R.def.monde >= 4) {
      if (dangersCiel(p)) return;
      const b = R.boss;
      if (b && b.kind === "oiseau" && b.etat === "vole" && overlap(p, { x: b.x + 8, y: b.y + 6, w: b.w - 16, h: b.h - 10 })) return kill("Percuté par l'Oiseau-tonnerre !");
    }
    for (const f of R.flames) {
      if (!f.on) continue;
      const fr = flameRect(f);
      if (overlap(p, fr)) return kill("Grillé par la tête de jaguar !");
    }
    for (const b of R.beams) for (const q of b.pts) if (q[0] > p.x - 2 && q[0] < p.x + p.w + 2 && q[1] > p.y && q[1] < p.y + p.h) return kill("Le rayon du dieu Soleil ! Il fallait rester à l'ombre.");
    for (const a of R.arrows) {
      if (a.dead || !overlap(p, a)) continue;
      if (!a.poison && p.vy > 0.3 && p.y + p.h - a.y < 8) { breakArrow(a); p.vy = -4.6; p.spring = false; continue; }
      return kill();
    }
    R.arrows = R.arrows.filter((a) => !a.dead);
    for (const b of R.boulders) {
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      const nx = Math.max(p.x, Math.min(cx, p.x + p.w)), ny = Math.max(p.y, Math.min(cy, p.y + p.h));
      if (Math.hypot(nx - cx, ny - cy) < b.w / 2 - 1) return kill(b.neige ? "Emporté par l'avalanche !" : null);
    }
    for (const k of R.blocks) if (k.falling && overlap(p, k)) return kill();
    for (const c of R.crushers) if (c.y > c.y0 + 3 && overlap(p, { x: c.x + 1, y: c.y, w: c.w - 2, h: c.h })) return kill();
    if (R.flood) {
      const f = R.flood;
      if (f.top ? p.y < f.level - 2 : (f.kind === "eau" ? p.y + 3 > f.level : p.y + p.h - 5 > f.level))
        return kill({ eau: "Glouglou ! Tu ne savais pas nager ?", sable: "Englouti par le sable. Classique.", lave: "Ouille. C'était chaud, hein ?", plafond: "Aplati comme une crêpe !" }[f.kind], "flood");
    }
    if (R.mirror) {
      // le reflet copie Max en miroir ; s'il touche des pics de son côté, c'est perdu
      const g = mirrorPos(), gr = { x: g.x, y: g.y, w: p.w, h: p.h };
      for (let ty = Math.floor(g.y / T); ty <= Math.floor((g.y + p.h) / T); ty++)
        for (let tx = Math.floor(g.x / T); tx <= Math.floor((g.x + p.w) / T); tx++)
          if (tileAt(tx, ty) === "^" && overlap(gr, { x: tx * T + 2, y: ty * T + 7, w: 12, h: 9 })) return kill("Ton reflet s'est piqué ! Ha ha !");
    }
    // écrasé seulement par de la vraie pierre (une planche qui réapparaît ne tue pas)
    const cx0 = Math.floor((p.x + 1) / T), cx1 = Math.floor((p.x + p.w - 1.01) / T), cy0 = Math.floor((p.y + 1) / T), cy1 = Math.floor((p.y + p.h - 1.01) / T);
    for (let ty = cy0; ty <= cy1; ty++) for (let tx = cx0; tx <= cx1; tx++) if (isSolid(tileAt(tx, ty))) return kill();
  }

  function mirrorPos() { const p = R.player; return { x: p.x, y: 2 * R.mirror.axis - (p.y + p.h) }; }

  function kill(msg, cause) {
    const p = R.player;
    if (!p.alive) return;
    const absorbable = cause !== "fall" && cause !== "flood" && cause !== "timer";
    if (absorbable && p.invuln > 0) return;
    if (absorbable && p.shield > 0) {
      p.shield--; p.invuln = 75; p.vy = -3.5; p.vx = -p.face * 2;
      sfx.bonk(); R.shake = 5;
      burst(p.x + 5, p.y + 7, C.jade, 16, 2);
      R.hint = { text: p.shield ? "L'amulette t'a protégé ! Encore 1 coup." : "L'amulette s'est brisée !", t: 0, dur: 120 };
      return;
    }
    p.alive = false;
    game.mode = "dead"; game.deadT = 0;
    game.deathsByRoom[R.index]++;
    progress.deaths++;
    statOf(R.index).morts++;
    saveProgress();
    sfx.death();
    R.shake = 6;
    burst(p.x + 5, p.y + 7, C.jacket, 12, 2.2);
    burst(p.x + 5, p.y + 7, C.shirt, 8, 2);
    R.hat = { x: p.x, y: p.y, vx: -p.face * 1.2, vy: -4, r: 0 };
    R.say = { text: msg || TAUNTS[Math.floor(Math.random() * TAUNTS.length)], t: 0, dur: 100 };
  }

  /* ================= Déroulement ================= */
  function playFrom(i) {
    unlockAudio();
    if (isTouch) enterFullscreen();
    game.timer = 0;
    startLevel(Math.max(0, Math.min(LEVELS.length - 1, i)));
    showOverlay(null);
  }

  function startLevel(i) {
    game.level = i;
    game.cpLevel = -1;   // nouvelle tentative depuis le menu : on repart du début
    statOf(i).essais++; saveProgress();
    const am = LEVELS[i].ammo || [6, 1];
    game.ammo = { tnt: am[1] };
    game.coins = 0;
    game.invert = 0;
    R = buildRoom(i);
    resize();
    updateCamera(true);
    game.mode = "card"; game.cardT = 0;
    game.paused = false;
    releaseAll();
  }

  function restartRoom(fromDeath) {
    if (!R) return;
    if (!fromDeath && game.mode === "play") { game.deathsByRoom[R.index]++; progress.deaths++; saveProgress(); }
    const am = LEVELS[game.level].ammo || [6, 1];
    game.ammo = { tnt: am[1] };
    game.coins = 0;
    game.invert = 0;
    const keep = fromDeath ? R.say : null;
    R = buildRoom(game.level);
    updateCamera(true);
    game.mode = "play";
    runTriggers(true);
    if (keep && !R.say) R.say = keep;
    if (fromDeath && R.deaths > 0 && R.deaths % 3 === 0 && R.assist <= 3)
      R.say = { text: ["Bon… je relâche un peu mes pièges. Par pitié.", "Je ralentis encore tout. Ne le dis à personne.", "Là, même Gérard roule au ralenti. Allez, Max !"][R.assist - 1] || "Courage, Max !", t: 0, dur: 200 };
    game.paused = false;
    showOverlay(null);
  }

  function statOf(i) { return (progress.stats[i] = progress.stats[i] || { morts: 0, essais: 0, fini: 0, temps: 0 }); }

  /* ---------- Passer un niveau en regardant une vidéo sponsorisée ----------
   * Dans l'appli des stores (Capacitor + @capacitor-community/admob), c'est une vraie
   * vidéo récompensée AdMob. Sur le web, un écran de démonstration la remplace. */
  const PUB = {
    // identifiant AdMob de la vidéo récompensée ; celui-ci est l'identifiant de TEST de Google,
    // à remplacer par le tien dans la version des stores
    adId: "ca-app-pub-3940256099942544/5224354917",
    admob() { const P = window.Capacitor && window.Capacitor.Plugins; return P && P.AdMob; },
    async regarder() {
      const admob = this.admob();
      if (admob) {
        try {
          await admob.prepareRewardVideoAd({ adId: this.adId });
          const r = await admob.showRewardVideoAd();
          return !!r;
        } catch (_) { return false; }
      }
      return demoPub();
    },
  };
  const PASSER_APRES = 10;    // « passer le niveau » : dernier recours, après 10 chutes
  const AMULETTE_APRES = 3;   // proposer l'amulette après 3 chutes
  const PIECES_PAR_AMULETTE = 30;
  let pubEnCours = false;
  function demoPub() {
    return new Promise((res) => {
      const el = document.getElementById("pub-compte"), lancer = document.getElementById("btn-pub-lancer");
      let n = 5; el.textContent = n; lancer.disabled = true; lancer.textContent = "Vidéo en cours…";
      const t = setInterval(() => { n--; el.textContent = n; if (n <= 0) { clearInterval(t); res(true); } }, 1000);
    });
  }
  let pubRetour = null;
  function ouvrirPubAmulette(retour) {
    pubBut = "amulette"; pubRetour = retour;
    document.getElementById("pub-titre").textContent = "Gagner une amulette de jade";
    document.getElementById("pub-etiquette").textContent = PUB.admob() ? "VIDÉO SPONSORISÉE" : "VIDÉO SPONSORISÉE · DÉMO";
    document.getElementById("pub-video").hidden = !!PUB.admob();
    document.getElementById("pub-compte").textContent = "5";
    const lancer = document.getElementById("btn-pub-lancer");
    lancer.disabled = false; lancer.textContent = "▶ Regarder la vidéo";
    document.getElementById("pub-texte").textContent = "Regarde la vidéo jusqu'au bout : tu gagnes une amulette, qui absorbe 2 coups.";
    showOverlay("pub");
  }
  function ouvrirPub() {
    if (!R || R.index >= LEVELS.length - 1) return;
    pubBut = "passer"; pubRetour = null;
    if (!game.paused) { game.paused = true; releaseAll(); }
    document.getElementById("pub-titre").textContent = `Passer « ${R.def.name} »`;
    document.getElementById("pub-etiquette").textContent = PUB.admob() ? "VIDÉO SPONSORISÉE" : "VIDÉO SPONSORISÉE · DÉMO";
    document.getElementById("pub-video").hidden = !!PUB.admob();
    document.getElementById("pub-compte").textContent = "5";
    const lancer = document.getElementById("btn-pub-lancer");
    lancer.disabled = false; lancer.textContent = "▶ Regarder la vidéo";
    document.getElementById("pub-texte").textContent = "Regarde la vidéo jusqu'au bout pour passer ce niveau. Archibald, lui, n'a pas besoin de publicité pour tricher.";
    showOverlay("pub");
  }
  let pubBut = "passer";   // « passer » le niveau ou gagner une « amulette »
  async function lancerPub() {
    if (pubEnCours) return;
    pubEnCours = true;
    const ok = await PUB.regarder();
    pubEnCours = false;
    if (ok && pubBut === "amulette") { gagnerAmulettes(1, "Merci ! +1 amulette de jade."); showOverlay(pubRetour); return; }
    if (!ok) {
      document.getElementById("pub-texte").textContent = "Pas de vidéo disponible pour le moment. Réessaie un peu plus tard, ou retente le niveau !";
      const lancer = document.getElementById("btn-pub-lancer"); lancer.disabled = false; lancer.textContent = "▶ Réessayer";
      return;
    }
    passerNiveau();
  }
  function passerNiveau() {
    const i = game.level;
    statOf(i).passe = 1;
    progress.unlocked = Math.max(progress.unlocked, Math.min(LEVELS.length - 1, i + 1));
    progress.passes = (progress.passes || 0) + 1;
    saveProgress();
    game.paused = false;
    showOverlay(null);
    startLevel(i + 1);
    R.say = { text: "Tu as sauté un niveau ? Tricheur ! … Bon, je suis mal placé pour dire ça.", t: 0, dur: 200 };
  }
  const btnPasser = document.getElementById("btn-passer");
  const btnAmulette = document.getElementById("btn-amulette");
  function majBoutonPasser() {
    const enJeu = !!R && game.mode === "play" && !game.paused;
    const voirPasser = enJeu && R.index < LEVELS.length - 1 && game.deathsByRoom[R.index] >= PASSER_APRES;
    if (btnPasser.hidden === voirPasser) btnPasser.hidden = !voirPasser;
    const voirAmu = enJeu && !voirPasser && game.deathsByRoom[R.index] >= AMULETTE_APRES && !(R.player && R.player.shield > 0);
    if (btnAmulette.hidden === voirAmu) btnAmulette.hidden = !voirAmu;
    if (voirAmu) {
      const t = (progress.amulettes || 0) > 0 ? `✦ Activer une amulette (${progress.amulettes})` : "✦ Une amulette ? ▶ vidéo";
      if (btnAmulette.textContent !== t) btnAmulette.textContent = t;
    }
  }

  /* ---------- Amulettes de jade ---------- */
  function gagnerAmulettes(n, msg) {
    progress.amulettes = (progress.amulettes || 0) + n; saveProgress();
    sfx.pick(); majBoutique();
    if (msg) { const el = document.getElementById("boutique-retour"); if (el) { el.textContent = msg; el.hidden = false; } }
  }
  function activerAmulette() {
    if (!R || !R.player || !R.player.alive) return false;
    if ((progress.amulettes || 0) <= 0) return false;
    progress.amulettes--; saveProgress();
    R.player.shield = 2;
    burst(R.player.x + 5, R.player.y + 7, C.jade, 18, 1.8); sfx.spring();
    R.hint = { text: "Amulette de jade : elle absorbe 2 coups (pas les chutes dans le vide).", t: 0, dur: 180 };
    return true;
  }
  btnAmulette.addEventListener("click", (e) => {
    e.preventDefault();
    if ((progress.amulettes || 0) > 0) activerAmulette();
    else { game.paused = true; releaseAll(); ouvrirPubAmulette(null); pubRetour = null; }
  });

  /* « Repartir d'ici ? » : après une chute où Max avait bien avancé */
  let relanceT = null;
  function offrirRelance() {
    const p = R.player;
    if (!p || !p.safe) return false;
    const depart = R.cp && R.cp.on ? R.cp.x * T : 3 * T;
    if (p.safe.x - depart < W * 0.2) return false;               // trop près du départ : on recommence simplement
    game.mode = "relance";
    const n = progress.amulettes || 0;
    document.getElementById("btn-relance-amulette").hidden = n <= 0;
    document.getElementById("btn-relance-amulette").textContent = `✦ Oui, avec une amulette (il t'en reste ${n})`;
    let reste = 4;
    const cpt = document.getElementById("relance-compte"); cpt.textContent = reste;
    clearInterval(relanceT);
    relanceT = setInterval(() => { reste--; cpt.textContent = reste; if (reste <= 0) refuserRelance(); }, 1000);
    showOverlay("relance");
    return true;
  }
  function refuserRelance() {
    clearInterval(relanceT);
    if (game.mode !== "relance") return;
    game.mode = "dead"; game.deadT = 51;
    showOverlay(null);
  }
  function relancer() {
    clearInterval(relanceT);
    const p = R.player;
    p.alive = true; p.x = p.safe.x; p.y = p.safe.y; p.vx = 0; p.vy = 0;
    p.shield = 2; p.invuln = 90; R.hat = null;
    R.boulders = R.boulders.filter((b) => Math.abs(b.x - p.x) > 140);
    R.arrows = [];
    if (R.flood && !R.flood.top) R.flood.level = Math.max(R.flood.level, p.y + p.h + 56);
    if (R.flood && R.flood.top) R.flood.level = Math.min(R.flood.level, p.y - 56);
    if (R.timer !== undefined && R.timer < 15 * 60 && R.def.triggers.some((t) => t.act.some((a) => a[0] === "timer"))) R.timer += 15 * 60;
    game.deathsByRoom[R.index] = Math.max(0, game.deathsByRoom[R.index]);
    game.mode = "play";
    R.say = { text: "Quoi ?! Tu reviens ? Avec une amulette ? C'est de la triche ! … J'adore.", t: 0, dur: 150 };
    showOverlay(null);
  }
  document.getElementById("btn-relance-amulette").addEventListener("click", () => {
    if ((progress.amulettes || 0) <= 0) return;
    progress.amulettes--; saveProgress(); relancer();
  });
  document.getElementById("btn-relance-video").addEventListener("click", async () => {
    clearInterval(relanceT);
    const b = document.getElementById("btn-relance-video"); b.disabled = true; b.textContent = "Vidéo en cours…";
    const ok = await PUB.regarder();
    b.disabled = false; b.textContent = "▶ Oui, avec une vidéo";
    if (ok) relancer(); else refuserRelance();
  });
  document.getElementById("btn-relance-non").addEventListener("click", refuserRelance);

  /* Boutique : pièces → amulettes, vidéo, packs (vrais achats seulement dans l'appli des stores) */
  const ACHAT = {
    produits: {
      "amulettes_10": { prix: "0,99 €", amulettes: 10, nom: "10 amulettes de jade" },
      "pack_aventurier": { prix: "2,99 €", amulettes: 40, chapeau: true, nom: "Pack aventurier : 40 amulettes + chapeau doré" },
    },
    // l'appli native fournira window.MaxStore.purchase(id) → Promise<boolean> (achat intégré Google Play / App Store)
    natif() { return window.MaxStore && typeof window.MaxStore.purchase === "function"; },
    async acheter(id) {
      if (this.natif()) { try { return !!(await window.MaxStore.purchase(id)); } catch (_) { return false; } }
      return demoAchat(id);
    },
  };
  let achatRes = null;
  function demoAchat(id) {
    const pr = ACHAT.produits[id];
    document.getElementById("achat-nom").textContent = pr.nom;
    document.getElementById("achat-prix").textContent = pr.prix;
    showOverlay("achat");
    return new Promise((res) => { achatRes = res; });
  }
  document.getElementById("btn-achat-ok").addEventListener("click", () => { showOverlay("boutique"); achatRes && achatRes(true); achatRes = null; });
  document.getElementById("btn-achat-non").addEventListener("click", () => { showOverlay("boutique"); achatRes && achatRes(false); achatRes = null; });
  async function acheter(id) {
    const pr = ACHAT.produits[id];
    const ok = await ACHAT.acheter(id);
    if (!ok) return;
    if (pr.chapeau) progress.chapeauOr = true;
    gagnerAmulettes(pr.amulettes, `Merci ! +${pr.amulettes} amulettes${pr.chapeau ? " et le chapeau doré" : ""}.`);
  }
  let boutiqueRetour = "options";
  function majBoutique() {
    const el = document.getElementById("boutique-solde");
    if (!el) return;
    el.textContent = `${progress.pieces || 0} pièces · ${progress.amulettes || 0} amulettes`;
    const ech = document.getElementById("btn-echange");
    ech.disabled = (progress.pieces || 0) < PIECES_PAR_AMULETTE;
    ech.textContent = `Échanger ${PIECES_PAR_AMULETTE} pièces → 1 amulette`;
    document.getElementById("boutique-demo").hidden = ACHAT.natif();
  }
  function ouvrirBoutique() {
    boutiqueRetour = game.mode === "title" ? "options" : "pause";
    document.getElementById("boutique-retour").hidden = true;
    majBoutique(); showOverlay("boutique");
  }
  document.querySelectorAll("[data-boutique]").forEach((b) => b.addEventListener("click", ouvrirBoutique));
  document.getElementById("btn-retour-boutique").addEventListener("click", () => showOverlay(boutiqueRetour));
  document.getElementById("btn-echange").addEventListener("click", () => {
    if ((progress.pieces || 0) < PIECES_PAR_AMULETTE) return;
    progress.pieces -= PIECES_PAR_AMULETTE; gagnerAmulettes(1, "Échange fait : +1 amulette.");
  });
  document.getElementById("btn-video-amulette").addEventListener("click", () => ouvrirPubAmulette("boutique"));
  document.getElementById("btn-pack-10").addEventListener("click", () => acheter("amulettes_10"));
  document.getElementById("btn-pack-aventurier").addEventListener("click", () => acheter("pack_aventurier"));
  document.getElementById("btn-utiliser-amulette").addEventListener("click", () => {
    if (activerAmulette()) { game.paused = false; showOverlay(null); }
  });

  function nextRoom() {
    const i = game.level;
    const st = statOf(i);
    st.fini++; st.temps = st.temps ? Math.min(st.temps, Math.round(R.t / 60)) : Math.round(R.t / 60);
    const d = game.deathsByRoom[i];
    if (progress.best[i] == null || d < progress.best[i]) progress.best[i] = d;
    progress.unlocked = Math.max(progress.unlocked, Math.min(LEVELS.length - 1, i + 1));
    if (i + 1 >= LEVELS.length) progress.finished = true;
    saveProgress();
    if (window.MondesUI && MondesUI.finitUnMonde(i)) { game.mode = "title"; R = null; releaseAll(); resize(); MondesUI.finDeMonde(i); }
    else if (i + 1 < LEVELS.length) startLevel(i + 1);
    else { game.mode = "end"; R = null; showEnd(); }
  }

  // Fin de niveau : Archibald raconte la suite de l'histoire (on a le temps de lire)
  function montrerRecit() {
    game.mode = "recit";
    releaseAll();
    const d = R.def, nm = window.MondesUI ? MondesUI.NIV : 20;
    document.getElementById("recit-surtitre").textContent = `Niveau ${(R.index % nm) + 1} terminé · ${d.name}`;
    const t = d.fin.replace(/^Histoire\.\s*/, "");
    document.getElementById("recit-texte").textContent = t;
    document.getElementById("recit-histoire").hidden = !/^Histoire\./.test(d.fin) && !d.boss;
    const img = document.getElementById("recit-archibald");
    if (img && !img.src.startsWith("data:")) img.src = lesSprites().archibald;
    const morts = game.deathsByRoom[R.index];
    document.getElementById("recit-morts").textContent = morts ? `${morts} chute${morts > 1 ? "s" : ""}` : "Sans une chute !";
    showOverlay("recit");
    setTimeout(() => document.getElementById("btn-recit-suite").focus(), 50);
  }
  document.getElementById("btn-recit-suite").addEventListener("click", () => { if (game.mode === "recit") { showOverlay(null); nextRoom(); } });

  function goHome() {
    game.mode = "title"; game.paused = false; R = null;
    releaseAll();
    resize();
    showOverlay("titre");
    refreshHome();
  }

  /* ================= Caméra ================= */
  function updateCamera(snap) {
    const p = R.player;
    const fx = p.x + p.w / 2 + p.face * 24, fy = p.y + p.h / 2 - 6;
    let tx, ty;
    if (view.w >= W + CAM_EXT.x * 2) tx = (W - view.w) / 2;
    else tx = Math.max(-CAM_EXT.x, Math.min(W + CAM_EXT.x - view.w, fx - view.w / 2));
    if (view.h >= H + CAM_EXT.top + CAM_EXT.bottom) ty = (H - view.h) / 2;
    else ty = Math.max(-CAM_EXT.top, Math.min(H + CAM_EXT.bottom - view.h, fy - view.h / 2));
    if (view.h >= H && view.h < H + CAM_EXT.top + CAM_EXT.bottom) ty = Math.min(ty, (H - view.h) / 2 + 30);
    if (snap) { cam.x = tx; cam.y = ty; }
    else { cam.x += (tx - cam.x) * 0.12; cam.y += (ty - cam.y) * 0.12; }
  }

  /* ================= Rendu du jeu ================= */
  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = C.void;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (game.mode === "title" && !overlays.titre.hidden) return; // l'accueil est une illustration en fond de page
    if (game.mode === "title" || game.mode === "end" || !R) { drawHome(); return; }
    const k = scale * dpr;
    if (game.mode !== "card") updateCamera(false);
    let sx = 0, sy = 0;
    if (R.shake > 0 && !reducedMotion) { sx = (Math.random() - 0.5) * R.shake; sy = (Math.random() - 0.5) * R.shake; }
    ctx.setTransform(k, 0, 0, k, Math.round((sx - cam.x) * k), Math.round((sy - cam.y) * k));
    ctx.fillStyle = P.bg;
    ctx.fillRect(0, 0, W, H);
    drawBackground();
    drawTiles(false);
    drawDecor();
    drawDoor();
    for (const c of R.cps) drawCheckpoint(c);
    if (R.def.traces) { ctx.fillStyle = "rgba(90,110,130,0.55)"; for (const [x, y] of R.def.traces) if (inView(x, y)) { const px = x * T, py = (y + 1) * T - 1; ctx.fillRect(px + 3, py, 2, 1); ctx.fillRect(px + 6, py - 1, 2, 1); ctx.fillRect(px + 10, py, 2, 1); ctx.fillRect(px + 13, py - 1, 2, 1); } }
    for (const it of R.pickups) if (!it.taken) drawPickup(it);
    for (const e of R.enemies) if (e.alive) drawEnemy(e);
    for (const k2 of R.blocks) drawBlock(k2);
    for (const d of R.dynamites) drawDynamite(d);
    for (const b of R.boulders) drawBoulder(b);
    for (const a of R.arrows) drawArrow(a);
    if (R.rival && R.rival.state !== "gone") drawRival(R.rival);
    drawMovers();
    drawCrushers();
    drawStuck();
    drawTorches();
    drawBraseros();
    for (const b of R.boules) { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#c8d6e2"; ctx.fillRect(b.x, b.y, 2, 2); }
    drawFlames();
    drawVines();
    if (R.mirror) drawMirror();
    drawPlayer();
    if (R.eau != null) drawAbyssesDessus();
    if (R.player && R.player.ski && R.player.alive) { const p = R.player; ctx.fillStyle = "#c0392b"; ctx.fillRect(p.x - 4, p.y + p.h, 18, 2); ctx.fillRect(p.x + 13, p.y + p.h - 2, 2, 2); }
    drawBeams();
    drawSecrets();
    if (R.boss) { if (R.boss.kind === "yeti") drawYeti(); else if (R.boss.kind === "pieuvre") drawPieuvre(); else if (R.boss.kind === "oiseau") drawOiseauTonnerre(); else if (R.boss.kind === "fouisseur") drawFouisseur(); else drawBoss(); }
    drawWinds();
    if (R.def.monde >= 4) drawCiel();
    if (R.def.monde === 5) drawOr();
    if (R.eau != null) drawEau();
    drawFlood();
    drawTiles(true); // faux murs par-dessus le joueur
    drawParticles();
    drawTorchLight();
    ctx.setTransform(k, 0, 0, k, 0, 0);
    if (R.dark) drawDarkness(k); else drawVignette();
    if (R.blizzard) drawBlizzard(k);
    drawHud();
    drawOxygene();
    drawFroid();
    drawSpeech();
    if (game.invert > 0) drawInvert();
    drawTimerHud();
    if (game.mode === "card") drawCard();
    if (game.mode === "win") { ctx.fillStyle = `rgba(7,11,9,${Math.min(1, game.winT / 40)})`; ctx.fillRect(0, 0, view.w, view.h); }
  }

  function drawBackground() {
    const decor = R.def.decor || R.def.palette || (ACTS[R.def.act] || {}).palette;
    if (decor === "himalaya") {
      const ciel = ctx.createLinearGradient(0, cam.y, 0, cam.y + view.h);
      ciel.addColorStop(0, R.blizzard ? "#8a9aaa" : "#3d6c9c"); ciel.addColorStop(1, R.blizzard ? "#d0d8e0" : "#c8e0f2");
      ctx.fillStyle = ciel; ctx.fillRect(cam.x - 10, cam.y - 10, view.w + 20, view.h + 20);
      // montagnes lointaines (parallaxe)
      for (const [k, col, hh, pas] of [[0.15, "rgba(150,175,200,0.55)", 0.55, 140], [0.35, "rgba(110,135,160,0.6)", 0.4, 90]]) {
        const ox = cam.x * (1 - k), base = cam.y + view.h;
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(cam.x - 10, base);
        for (let i = Math.floor((cam.x - ox) / pas) - 1; i <= Math.ceil((cam.x + view.w - ox) / pas) + 1; i++) {
          const x = ox + i * pas, pic = base - view.h * hh * (0.6 + 0.4 * Math.abs(Math.sin(i * 1.7)));
          ctx.lineTo(x, base - view.h * hh * 0.35); ctx.lineTo(x + pas / 2, pic); ctx.lineTo(x + pas, base - view.h * hh * 0.35);
        }
        ctx.lineTo(cam.x + view.w + 10, base); ctx.closePath(); ctx.fill();
        if (k === 0.15) { ctx.fillStyle = "rgba(255,255,255,0.65)"; for (let i = Math.floor((cam.x - ox) / pas) - 1; i <= Math.ceil((cam.x + view.w - ox) / pas) + 1; i++) { const x = ox + i * pas + pas / 2, pic = base - view.h * hh * (0.6 + 0.4 * Math.abs(Math.sin(i * 1.7))); ctx.beginPath(); ctx.moveTo(x, pic); ctx.lineTo(x - 12, pic + 14); ctx.lineTo(x + 12, pic + 14); ctx.fill(); } }
      }
      return;
    }
    if (decor === "cite") {
      const g = ctx.createLinearGradient(0, cam.y, 0, cam.y + view.h);
      g.addColorStop(0, "#2a0f0a"); g.addColorStop(0.7, "#5a1d10"); g.addColorStop(1, "#a8401a");
      ctx.fillStyle = g; ctx.fillRect(cam.x - 10, cam.y - 10, view.w + 20, view.h + 20);
      // temples d'or lointains et étincelles qui montent
      for (const [k, col, pas] of [[0.2, "rgba(140,90,40,0.35)", 170], [0.45, "rgba(90,50,25,0.6)", 120]]) {
        const ox = cam.x * (1 - k), base = cam.y + view.h;
        ctx.fillStyle = col;
        for (let i = Math.floor((cam.x - ox) / pas) - 1; i <= Math.ceil((cam.x + view.w - ox) / pas) + 1; i++) {
          const x = ox + i * pas + ((i * 37) % 30), hh = 60 + ((i * 53) % 50) * (k === 0.2 ? 1.4 : 1);
          ctx.fillRect(x, base - hh, 40, hh); for (let st = 0; st < 4; st++) ctx.fillRect(x - 6 + st * 3, base - hh - 8 - st * 7, 52 - st * 6, 8);
          if (k === 0.2 && i % 2 === 0) { ctx.fillStyle = "rgba(242,193,78,0.25)"; ctx.fillRect(x + 16, base - hh + 10, 8, 12); ctx.fillStyle = col; }
        }
      }
      ctx.fillStyle = "rgba(255,120,40,0.18)";
      for (let i = 0; i < 12; i++) { const x = cam.x + ((i * 97 + R.t * 0.3) % (view.w + 40)) - 20, y = cam.y + view.h - ((R.t * (0.5 + (i % 3) * 0.2) + i * 41) % view.h); ctx.fillRect(x, y, 2, 2); }
      return;
    }
    if (decor === "nuages") {
      const ciel = ctx.createLinearGradient(0, cam.y, 0, cam.y + view.h);
      ciel.addColorStop(0, R.def.orage ? "#6a6a9a" : "#8fa8e8"); ciel.addColorStop(0.6, R.def.orage ? "#a4a0c8" : "#bfd7ff"); ciel.addColorStop(1, "#fdf6ff");
      ctx.fillStyle = ciel; ctx.fillRect(cam.x - 10, cam.y - 10, view.w + 20, view.h + 20);
      // arc-en-ciel lointain, îles flottantes et nuages en parallaxe
      ctx.globalAlpha = 0.18; ["#f25c5c", "#f2a65c", "#f2e05c", "#6cd47a", "#5ca8f2", "#9a6cf2"].forEach((cc, i) => { ctx.strokeStyle = cc; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cam.x * 0.9 + view.w * 0.7, cam.y + view.h + 40, 150 - i * 4, Math.PI, 2 * Math.PI); ctx.stroke(); }); ctx.globalAlpha = 1;
      for (const [k, a, pas, dy] of [[0.2, 0.3, 150, 0.35], [0.45, 0.42, 110, 0.62]]) {
        const ox = cam.x * (1 - k);
        for (let i = Math.floor((cam.x - ox) / pas) - 1; i <= Math.ceil((cam.x + view.w - ox) / pas) + 1; i++) {
          const cx = ox + i * pas + ((i * 53) % 40), cy = cam.y + view.h * dy + ((i * 29) % 30) - 15;
          ctx.fillStyle = `rgba(255,255,255,${a})`;
          ctx.beginPath(); ctx.ellipse(cx, cy, 26, 8, 0, 0, Math.PI * 2); ctx.ellipse(cx + 14, cy - 6, 14, 8, 0, 0, Math.PI * 2); ctx.ellipse(cx - 12, cy - 3, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
          if (k === 0.2 && i % 3 === 0) { ctx.fillStyle = "rgba(160,150,200,0.35)"; ctx.fillRect(cx - 6, cy - 22, 12, 16); ctx.beginPath(); ctx.moveTo(cx - 9, cy - 22); ctx.lineTo(cx, cy - 32); ctx.lineTo(cx + 9, cy - 22); ctx.fill(); }
        }
      }
      return;
    }
    if (decor === "glace") {
      ctx.fillStyle = "#0f2a40"; ctx.fillRect(cam.x - 10, cam.y - 10, view.w + 20, view.h + 20);
      ctx.fillStyle = "rgba(160,220,255,0.10)";
      for (let i = Math.floor(cam.x / 40) - 1; i <= Math.ceil((cam.x + view.w) / 40) + 1; i++) { const x = i * 40 + cam.x * 0.3; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 18, 0); ctx.lineTo(x + 9, 30 + (i * 37 % 40)); ctx.fill(); }
      return;
    }
    if (decor === "abysses") {
      const e = R.eau != null ? R.eau : 0;
      const ciel = ctx.createLinearGradient(0, 0, 0, e);
      ciel.addColorStop(0, "#6fb4d8"); ciel.addColorStop(1, "#cdeef5");
      ctx.fillStyle = ciel; ctx.fillRect(cam.x - 10, -40, view.w + 20, e + 40);
      const mer = ctx.createLinearGradient(0, e, 0, H);
      mer.addColorStop(0, "#1a6f90"); mer.addColorStop(1, "#04182a");
      ctx.fillStyle = mer; ctx.fillRect(cam.x - 10, e, view.w + 20, H - e + 60);
      // nuages lointains et silhouettes de poissons
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      for (let i = Math.floor(cam.x / 120) - 1; i <= Math.ceil((cam.x + view.w) / 120) + 1; i++) {
        const cx = i * 120 + cam.x * 0.5 + 30, cy = 20 + (i * 37 % 3) * 8;
        if (cy + 10 < e) { ctx.beginPath(); ctx.ellipse(cx, cy, 18, 5, 0, 0, Math.PI * 2); ctx.ellipse(cx + 10, cy - 3, 10, 5, 0, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.fillStyle = "rgba(4,24,42,0.35)";
      for (let i = 0; i < 6; i++) {
        const fx = ((R.t * (0.3 + i * 0.07) + i * 211) % (W + 200)) - 100, fy = e + 40 + ((i * 53) % Math.max(20, H - e - 60));
        ctx.beginPath(); ctx.ellipse(fx, fy, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(fx - 6, fy); ctx.lineTo(fx - 10, fy - 3); ctx.lineTo(fx - 10, fy + 3); ctx.fill();
      }
      return;
    }
    // mur du fond : grandes briques sombres, légèrement décalées par la parallaxe
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    ctx.translate(cam.x * 0.35, cam.y * 0.2);
    ctx.fillStyle = P.bg2; ctx.globalAlpha = 0.55;
    const bw = 28, bh = 14;
    const sx0 = Math.floor((cam.x * 0.65) / bw) - 1, sx1 = Math.ceil((cam.x * 0.65 + view.w) / bw) + 1;
    const sy0 = Math.floor((cam.y * 0.8) / bh) - 1, sy1 = Math.ceil((cam.y * 0.8 + view.h) / bh) + 1;
    for (let j = sy0; j <= sy1; j++) for (let i = sx0; i <= sx1; i++) {
      const off = j % 2 ? bw / 2 : 0;
      ctx.fillRect(i * bw + off + 1, j * bh + 1, bw - 2, bh - 2);
    }
    ctx.restore();
    ctx.fillStyle = P.bg2;
    const x0 = Math.max(0, Math.floor(cam.x / 56) - 1), x1 = Math.ceil((cam.x + view.w) / 56) + 1;
    if (decor === "pillars" || decor === "sanctuaire" || decor === "eye") {
      for (let i = Math.floor(x0 * 56 / 68); i <= Math.ceil(x1 * 56 / 68); i++) {
        const x = 30 + i * 68;
        ctx.fillRect(x, 40, 22, H - 72); ctx.fillRect(x - 4, 36, 30, 6); ctx.fillRect(x - 4, H - 38, 30, 6);
      }
      if (decor === "eye" || decor === "pillars") {
        const cx = W / 2, cy = 70, open = 0.5 + 0.5 * Math.sin(R.t / 40);
        ctx.strokeStyle = "rgba(217,164,65,0.28)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(cx, cy, 34, 13 * open + 2, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "rgba(217,164,65,0.28)";
        const px = R.player ? Math.max(-10, Math.min(10, (R.player.x - cx) / 20)) : 0;
        ctx.beginPath(); ctx.arc(cx + px, cy, 5 * open + 1, 0, Math.PI * 2); ctx.fill();
      }
    } else if (decor === "jungle") {
      ctx.strokeStyle = P.deco; ctx.lineWidth = 2;
      for (let i = x0; i <= x1; i++) {
        const x = i * 56 + 20, len = 50 + ((i * 37) % 60);
        ctx.beginPath(); ctx.moveTo(x, 0);
        for (let yy = 0; yy < len; yy += 6) ctx.lineTo(x + Math.sin((yy + R.t * 0.3) / 14 + i) * 3, yy);
        ctx.stroke();
        ctx.fillStyle = P.deco; ctx.fillRect(x - 3, len - 2, 6, 4);
      }
    } else if (decor === "crypte" || decor === "glyphs") {
      ctx.fillStyle = P.deco;
      for (let i = x0; i <= x1; i++) {
        const x = i * 56 + 14;
        for (let j = 0; j < 3; j++) {
          const y = 40 + j * 22 + ((i * 11) % 9), g = (i * 3 + j) % 4;
          if (g === 0) { ctx.fillRect(x, y, 8, 2); ctx.fillRect(x + 3, y - 5, 2, 10); }
          else if (g === 1) { ctx.beginPath(); ctx.arc(x + 4, y, 4, 0, Math.PI * 2); ctx.fill(); }
          else if (g === 2) { ctx.fillRect(x, y - 4, 2, 8); ctx.fillRect(x + 4, y - 4, 2, 8); ctx.fillRect(x, y - 4, 6, 2); }
          else { ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x + 4, y - 4); ctx.lineTo(x + 8, y + 4); ctx.fill(); }
        }
      }
    } else if (decor === "mines" || decor === "beams") {
      ctx.fillStyle = P.deco;
      for (let i = x0; i <= x1; i++) {
        const x = i * 56 + 10;
        ctx.fillRect(x, 0, 5, H); ctx.fillRect(x + 36, 0, 5, H); ctx.fillRect(x - 2, 24, 45, 5);
      }
    } else if (decor === "cascades" || decor === "water") {
      for (let i = x0; i <= x1; i++) {
        const x = i * 56 + 24;
        ctx.fillStyle = "rgba(77,150,170,0.12)"; ctx.fillRect(x, 0, 8, H);
        ctx.fillStyle = "rgba(160,220,235,0.18)";
        for (let j = 0; j < 6; j++) { const y = ((R.t * 2 + j * 47 + i * 31) % (H + 20)) - 20; ctx.fillRect(x + (j % 3) * 2, y, 2, 10); }
      }
    }
  }

  function inView(x, y, m = 2) {
    return x * T > cam.x - m * T && x * T < cam.x + view.w + m * T && y * T > cam.y - m * T && y * T < cam.y + view.h + m * T;
  }

  function drawMovers() {
    for (const m of R.movers) {
      if (m.style) { drawMoverCiel(m); continue; }
      ctx.fillStyle = C.wood; ctx.fillRect(m.x, m.y, m.w, m.h);
      ctx.fillStyle = "#c79a5e"; ctx.fillRect(m.x, m.y, m.w, 1.5);
      ctx.fillStyle = "#5a3a1c"; for (let i = 6; i < m.w; i += 8) ctx.fillRect(m.x + i, m.y + 1, 1, m.h - 1);
      ctx.fillStyle = C.metal; ctx.fillRect(m.x + 2, m.y + m.h - 1, 3, 2); ctx.fillRect(m.x + m.w - 5, m.y + m.h - 1, 3, 2);
      // cordes vers le haut pour les monte-charges
      if (m.dy) { const top = Math.min(m.y0, m.y0 + m.dy) - 40; ctx.strokeStyle = "rgba(160,120,70,.6)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(m.x + 3, m.y); ctx.lineTo(m.x + 3, top); ctx.moveTo(m.x + m.w - 3, m.y); ctx.lineTo(m.x + m.w - 3, top); ctx.stroke(); }
    }
  }
  function drawCrushers() {
    for (const c of R.crushers) {
      ctx.fillStyle = C.metal; ctx.fillRect(c.x + c.w / 2 - 2, c.y0 - 2, 4, c.y - c.y0 + 3);   // tige
      ctx.fillStyle = P.stoneDark; ctx.fillRect(c.x - 1, c.y, c.w + 2, c.h - 4);
      ctx.fillStyle = P.stoneTop; ctx.fillRect(c.x - 1, c.y, c.w + 2, 2);
      ctx.fillStyle = C.danger; ctx.beginPath();
      for (let i = 0; i < 3; i++) { const bx = c.x + i * (c.w / 3); ctx.moveTo(bx, c.y + c.h - 4); ctx.lineTo(bx + c.w / 6, c.y + c.h); ctx.lineTo(bx + c.w / 3, c.y + c.h - 4); }
      ctx.fill();
    }
  }
  function drawWinds() {
    for (const w of R.winds) {
      ctx.strokeStyle = "rgba(220,240,255,0.35)"; ctx.lineWidth = 1;
      for (let i = 0; i < 10; i++) {
        const span = w.x1 - w.x0, k = ((R.t * Math.abs(w.f) * 2 + i * 53) % span);
        const x = w.f > 0 ? w.x0 + k : w.x1 - k, y = 30 + ((i * 37) % (H - 60));
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.sign(w.f) * 10, y); ctx.stroke();
      }
    }
  }
  function drawFlood() {
    const f = R.flood;
    if (!f) return;
    const wave = (x) => Math.sin(x / 9 + R.t / 12) * 1.5;
    const col = { eau: ["rgba(60,150,200,0.55)", "rgba(170,225,250,0.8)"], sable: ["rgba(196,160,92,0.92)", "rgba(230,200,140,1)"], lave: ["rgba(230,80,20,0.9)", "rgba(255,200,80,1)"], plafond: ["rgba(40,30,26,0.97)", "rgba(229,72,60,1)"] }[f.kind] || ["rgba(60,150,200,0.55)", "#fff"];
    const x0 = cam.x - 10, x1 = cam.x + view.w + 10;
    if (f.top) {
      ctx.fillStyle = col[0]; ctx.fillRect(x0, -40, x1 - x0, f.level + 40);
      ctx.fillStyle = col[1]; ctx.beginPath();
      for (let x = Math.floor(x0 / 8) * 8; x < x1; x += 8) { ctx.moveTo(x, f.level); ctx.lineTo(x + 4, f.level + 7); ctx.lineTo(x + 8, f.level); }
      ctx.fill();
      return;
    }
    ctx.fillStyle = col[0];
    ctx.beginPath(); ctx.moveTo(x0, H + 80);
    for (let x = x0; x <= x1; x += 4) ctx.lineTo(x, f.level + wave(x));
    ctx.lineTo(x1, H + 80); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = col[1]; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let x = x0; x <= x1; x += 4) { const y = f.level + wave(x); if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    if (f.kind === "lave" && R.t % 4 === 0) R.particles.push({ x: x0 + Math.random() * (x1 - x0), y: f.level, vx: 0, vy: -0.8 - Math.random(), s: 2, life: 30, color: "#ffb347", g: 0.02 });
  }
  function drawMirror() {
    // reflet à l'envers sous la surface de l'eau, légèrement bleuté et transparent
    const a = R.mirror.axis;
    ctx.save();
    ctx.translate(0, 2 * a); ctx.scale(1, -1);
    ctx.globalAlpha = 0.6;
    drawPlayer();
    ctx.restore();
    const p = R.player, g = mirrorPos();
    ctx.fillStyle = "rgba(90,170,230,0.18)"; ctx.fillRect(g.x - 3, g.y, p.w + 6, p.h);
    ctx.strokeStyle = "rgba(170,220,255,0.35)"; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = cam.x - 10; x < cam.x + view.w + 10; x += 6) { const y = a + Math.sin(x / 7 + R.t / 10) * 0.8; if (x === cam.x - 10) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
  }

  function drawDecor() {
    for (const d of R.decor) {
      if (!inView(d.x, d.y)) continue;
      const px = d.x * T, py = d.y * T;
      switch (d.k) {
        case "algue": {
          ctx.strokeStyle = (d.x % 3) ? "#3fa88a" : "#2f8a6e"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(px + 8, py + T);
          for (let k = 2; k <= d.h; k += 2) ctx.lineTo(px + 8 + Math.sin(R.t / 25 + d.ph + k / 5) * (k / 6), py + T - k);
          ctx.stroke();
          break;
        }
        case "web": {
          const s = 12 * d.s, ox = d.side < 0 ? px : px + T, dir = -d.side;
          ctx.strokeStyle = "rgba(225,225,215,0.38)"; ctx.lineWidth = 0.6;
          ctx.beginPath();
          for (let i = 0; i <= 4; i++) { const a = (i / 4) * Math.PI / 2; ctx.moveTo(ox, py); ctx.lineTo(ox + dir * Math.cos(a) * s, py + Math.sin(a) * s); }
          for (let r = 0.35; r <= 1.01; r += 0.32) {
            for (let i = 0; i <= 4; i++) { const a = (i / 4) * Math.PI / 2, xx = ox + dir * Math.cos(a) * s * r, yy = py + Math.sin(a) * s * r; if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); }
          }
          ctx.stroke();
          if (d.s > 1.05) { ctx.fillStyle = "#1a1a1a"; ctx.fillRect(ox + dir * s * 0.55 - 1, py + s * 0.5 - 1, 2, 2); }
          break;
        }
        case "vine": {
          const sway = Math.sin(R.t / 40 + d.ph) * 1.6;
          ctx.strokeStyle = "#2f6a2a"; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(px + 8, py);
          const L = d.len * T - 4;
          for (let i = 1; i <= 8; i++) { const f = i / 8; ctx.lineTo(px + 8 + Math.sin(f * 4 + d.ph) * 1.5 + sway * f, py + L * f); }
          ctx.stroke();
          ctx.fillStyle = "#4f9a3a";
          for (let i = 1; i < d.len * 3; i++) {
            const f = i / (d.len * 3), lx = px + 8 + Math.sin(f * 4 + d.ph) * 1.5 + sway * f, ly = py + L * f;
            ctx.beginPath(); ctx.ellipse(lx + (i % 2 ? 2.5 : -2.5), ly, 2.2, 1.2, i % 2 ? 0.5 : -0.5, 0, Math.PI * 2); ctx.fill();
          }
          break;
        }
        case "chain": {
          const sway = Math.sin(R.t / 50 + d.ph) * 1;
          ctx.strokeStyle = "#6b6f76"; ctx.lineWidth = 1;
          for (let i = 0; i < d.len * 4; i++) { const yy = py + i * 4 + 2, xx = px + 8 + sway * (i / (d.len * 4)); ctx.beginPath(); ctx.ellipse(xx, yy, i % 2 ? 1 : 1.8, 2, 0, 0, Math.PI * 2); ctx.stroke(); }
          break;
        }
        case "drip": {
          const k = ((R.t + d.ph) % 160) / 160;
          ctx.fillStyle = "rgba(170,225,240,0.8)";
          if (k < 0.5) ctx.fillRect(px + 8, py + 1, 1, 1 + k * 3);
          else ctx.fillRect(px + 8, py + (k - 0.5) * 2 * T * 1.6, 1, 2);
          break;
        }
        case "tuft": {
          ctx.fillStyle = P.moss || "#4f8a3a";
          const bx = px + 3 + d.s * 8, by = py + T;
          for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(bx + i * 2, by); ctx.lineTo(bx + i * 2 + (i - 1.5) * 1.2, by - 3 - (i % 2) * 2 - d.s * 2); ctx.lineTo(bx + i * 2 + 1.2, by); ctx.fill(); }
          if (d.s > 0.8) { ctx.fillStyle = "#e3c14e"; ctx.fillRect(bx + 3, by - 6, 2, 2); }
          break;
        }
        case "bones": {
          ctx.fillStyle = "#d9d2bd";
          const bx = px + 3, by = py + T - 4;
          ctx.beginPath(); ctx.arc(bx + (d.f > 0 ? 3 : 8), by, 2.6, 0, Math.PI * 2); ctx.fill();          // crâne
          ctx.fillStyle = "#2a241c"; ctx.fillRect(bx + (d.f > 0 ? 2 : 7), by - 1, 1, 1); ctx.fillRect(bx + (d.f > 0 ? 4 : 9), by - 1, 1, 1);
          ctx.fillStyle = "#d9d2bd"; ctx.fillRect(bx + (d.f > 0 ? 6 : 0), by + 2, 6, 1.4); ctx.fillRect(bx + (d.f > 0 ? 6 : 0), by + 1.4, 1.4, 2.6);
          break;
        }
        case "pebbles": {
          ctx.fillStyle = P.stoneTop;
          ctx.beginPath(); ctx.ellipse(px + 4, py + T - 1.5, 2.5, 1.5, 0, 0, Math.PI * 2); ctx.ellipse(px + 9, py + T - 1, 1.6, 1, 0, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case "crystal": {
          const g = 0.5 + 0.5 * Math.sin(R.t / 30 + d.ph);
          ctx.fillStyle = `rgba(190,120,255,${0.15 + g * 0.15})`; ctx.beginPath(); ctx.arc(px + 8, py + T - 4, 7, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#b884ff";
          ctx.beginPath(); ctx.moveTo(px + 6, py + T); ctx.lineTo(px + 7.5, py + T - 8); ctx.lineTo(px + 9, py + T); ctx.fill();
          ctx.fillStyle = "#e0c8ff";
          ctx.beginPath(); ctx.moveTo(px + 9, py + T); ctx.lineTo(px + 11, py + T - 5); ctx.lineTo(px + 12, py + T); ctx.fill();
          break;
        }
        case "torch": {
          const wx = d.side < 0 ? px + 1 : px + T - 3, fy = py + 4;
          ctx.fillStyle = "#4a3018"; ctx.fillRect(wx, py + 6, 2, 7);
          ctx.fillStyle = C.metal; ctx.fillRect(wx - 1, py + 5, 4, 2);
          const fl = 1 + Math.sin(R.t / 4 + d.ph) * 0.18 + Math.sin(R.t / 7.3 + d.ph * 2) * 0.12;
          ctx.fillStyle = "#ff8a2a"; ctx.beginPath(); ctx.ellipse(wx + 1, fy, 2.4 * fl, 3.6 * fl, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#ffe08a"; ctx.beginPath(); ctx.ellipse(wx + 1, fy + 0.8, 1.1, 2, 0, 0, Math.PI * 2); ctx.fill();
          break;
        }
      }
    }
  }

  // halos chauds des torches, ajoutés par-dessus la scène
  function drawTorchLight() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const d of R.decor) {
      if (d.k !== "torch" || !inView(d.x, d.y, 5)) continue;
      const wx = d.side < 0 ? d.x * T + 2 : d.x * T + T - 2, wy = d.y * T + 4;
      const fl = 1 + Math.sin(R.t / 4 + d.ph) * 0.06;
      const g = ctx.createRadialGradient(wx, wy, 2, wx, wy, 64 * fl);
      g.addColorStop(0, "rgba(255,150,60,0.30)"); g.addColorStop(1, "rgba(255,120,40,0)");
      ctx.fillStyle = g; ctx.fillRect(wx - 66, wy - 66, 132, 132);
    }
    ctx.restore();
  }

  const darkCanvas = document.createElement("canvas");
  function drawDarkness(k) {
    if (darkCanvas.width !== canvas.width || darkCanvas.height !== canvas.height) { darkCanvas.width = canvas.width; darkCanvas.height = canvas.height; }
    const d = darkCanvas.getContext("2d");
    d.setTransform(1, 0, 0, 1, 0, 0);
    d.globalCompositeOperation = "source-over";
    d.clearRect(0, 0, darkCanvas.width, darkCanvas.height);
    d.fillStyle = "rgba(2,3,4,0.97)";
    d.fillRect(0, 0, darkCanvas.width, darkCanvas.height);
    d.globalCompositeOperation = "destination-out";
    const hole = (wx, wy, r) => {
      const sx = (wx - cam.x) * k, sy = (wy - cam.y) * k, rr = r * k;
      const g = d.createRadialGradient(sx, sy, rr * 0.25, sx, sy, rr);
      g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(0.7, "rgba(0,0,0,0.75)"); g.addColorStop(1, "rgba(0,0,0,0)");
      d.fillStyle = g; d.beginPath(); d.arc(sx, sy, rr, 0, Math.PI * 2); d.fill();
    };
    const p = R.player;
    const flick = 1 + Math.sin(R.t / 6) * 0.03;
    if (p) hole(p.x + p.w / 2, p.y + p.h / 2 - 2, (p.alive ? (R.lanterne ? 34 : 58) : 40) * flick);
    if (R.lanterne) hole(R.lanterne.x, R.lanterne.y, 92 + Math.sin(R.t / 9) * 4);
    const dr = R.door;
    if (dr && !dr.hidden) hole(dr.x + dr.w / 2, dr.y + dr.h / 2, 30 + Math.sin(R.t / 15) * 3);
    for (const t of R.decor) if (t.k === "torch") hole(t.x * T + 8, t.y * T + 6, 26);
    for (const t of R.torches) if (t.lit) hole(t.x * T + 8, t.y * T, 64 + Math.sin(R.t / 5 + t.x) * 3); else hole(t.x * T + 8, t.y * T, 9);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(darkCanvas, 0, 0);
    ctx.setTransform(k, 0, 0, k, 0, 0);
  }

  // pénombre douce sur les bords de l'écran, plus claire autour de Max
  function drawVignette() {
    const p = R.player;
    const cx = p ? p.x + p.w / 2 - cam.x : view.w / 2, cy = p ? p.y + p.h / 2 - cam.y : view.h / 2;
    const g = ctx.createRadialGradient(cx, cy, 60, cx, cy, Math.max(view.w, view.h) * 0.75);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.42)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, view.w, view.h);
  }

  function drawStone(px, py, x, y) {
    ctx.fillStyle = P.stone; ctx.fillRect(px, py, T, T);
    // joints de maçonnerie : briques décalées d'une rangée à l'autre
    ctx.fillStyle = P.stoneDark;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(px, py + 7, T, 1);
    ctx.fillRect(px + (y % 2 ? 4 : 11), py, 1, 7);
    ctx.fillRect(px + (y % 2 ? 12 : 3), py + 8, 1, 8);
    ctx.globalAlpha = 1;
    const h = hash(x, y);
    if (h % 7 === 0) { ctx.fillStyle = P.stoneTop; ctx.globalAlpha = 0.35; ctx.fillRect(px + 2, py + 2, 5, 1); ctx.globalAlpha = 1; }
    const up = tileAt(x, y - 1), dn = tileAt(x, y + 1);
    if (!looksStone(up) && up !== "B" && P.neige) {
      // couche de neige sur le dessus, avec de petits paquets qui débordent
      ctx.fillStyle = P.stoneTop; ctx.fillRect(px, py - 1, T, 4);
      ctx.fillRect(px + (h % 7), py + 3, 4, 1 + (h % 2)); ctx.fillRect(px + 9 + (h % 4), py + 3, 3, 2);
      ctx.fillStyle = "rgba(160,200,230,0.6)"; ctx.fillRect(px, py + 3, T, 1);
    } else if (!looksStone(up) && up !== "B") {
      ctx.fillStyle = P.stoneTop; ctx.fillRect(px, py, T, 2);
      if (P.moss && h % 3 !== 0) {
        // mousse qui déborde sur la face
        ctx.fillStyle = P.moss; ctx.fillRect(px, py, T, 2);
        ctx.fillRect(px + (h % 9), py + 2, 3, 1 + (h % 2)); ctx.fillRect(px + 9 + (h % 5), py + 2, 2, 2 + (h % 3));
      }
    }
    if (!looksStone(dn) && dn !== "B") { ctx.fillStyle = P.stoneDark; ctx.fillRect(px, py + T - 2, T, 2); }
  }

  // petit hachage déterministe pour placer les décors toujours au même endroit
  function hash(x, y) { let h = (x * 374761393 + y * 668265263 + (R ? R.index * 1442695 : 0)) | 0; h = (h ^ (h >>> 13)) * 1274126177; return Math.abs(h ^ (h >>> 16)); }

  function drawTiles(onlyFake) {
    const x0 = Math.max(0, Math.floor(cam.x / T) - 1), x1 = Math.min(COLS - 1, Math.ceil((cam.x + view.w) / T) + 1);
    const y0 = Math.max(0, Math.floor(cam.y / T) - 1), y1 = Math.min(ROWS - 1, Math.ceil((cam.y + view.h) / T) + 1);
    const p = R.player;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const c = R.tiles[y][x];
      if (c === ".") continue;
      if (onlyFake !== (c === "F")) continue;
      let ox = 0, oy = 0;
      if (R.shakeTiles.get(x + "," + y) || R.wobble.has(x + "," + y)) { ox = (Math.random() - 0.5) * 2; oy = (Math.random() - 0.5) * 1.5; }
      const px = x * T + ox, py = y * T + oy;
      if (c === "|") {
        const haut = tileAt(x, y - 1) !== "|", sway = Math.sin(R.t / 45 + x) * 0.8;
        ctx.strokeStyle = "#9a7444"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(px + 8, py); ctx.lineTo(px + 8 + sway, py + T); ctx.stroke();
        ctx.fillStyle = "#6e5030";
        for (let k = 3; k < T; k += 6) ctx.fillRect(px + 7 + sway * k / T, py + k, 3, 2);
        if (haut) { ctx.fillStyle = C.wood; ctx.fillRect(px + 3, py - 2, 11, 3); ctx.fillStyle = C.metal; ctx.fillRect(px + 7, py - 4, 3, 3); }
        continue;
      }
      if (c === "Q") continue;   // algues : dessinées par-dessus Max
      if (R.def.monde === 4 && drawTuileCiel(c, px, py, x, y)) continue;
      if (R.def.monde === 5 && (c === "8" || drawTuileOr(c, px, py, x, y))) continue;
      if (c === "K") {
        ctx.fillStyle = "#2f3a42"; ctx.fillRect(px + 1, py + 6, 14, 10); ctx.fillStyle = "#47545e"; ctx.fillRect(px + 4, py + 1, 8, 6);
        ctx.fillStyle = "#c0392b"; ctx.fillRect(px + 6, py, 4, 2); ctx.fillStyle = "#ffd36b"; ctx.fillRect(px + 3, py + 9, 2, 2); ctx.fillRect(px + 11, py + 9, 2, 2);
        continue;
      }
      if (c === "H") {
        ctx.fillStyle = "#59636b"; ctx.fillRect(px + 2, py, 12, T); ctx.fillStyle = "#7d8891";
        for (let k = 0; k < T; k += 4) ctx.fillRect(px + 2, py + k, 12, 1);
        ctx.fillStyle = "#f2c94c"; ctx.fillRect(px + 2, py, 2, T); ctx.fillRect(px + 12, py, 2, T);
        continue;
      }
      if (c === "#" || c === "x") drawStone(px, py, x, y);
      else if (c === "g") {
        drawStone(px, py, x, y);
        ctx.fillStyle = "rgba(150,220,255,0.55)"; ctx.fillRect(px, py, T, 2);
        ctx.fillStyle = "rgba(220,245,255,0.7)"; ctx.fillRect(px + ((x * 5) % 10), py + 1, 4, 1);
        ctx.fillStyle = "rgba(150,220,255,0.25)"; ctx.fillRect(px + 3, py + 2, 2, 3 + (x % 3));
      } else if (c === "G") {
        ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(px, py, T, T);
        ctx.fillStyle = "#7d828a"; for (let i = 2; i < T; i += 4) ctx.fillRect(px + i, py, 2, T);
        ctx.fillStyle = "#5d636b"; ctx.fillRect(px, py + 3, T, 2); ctx.fillRect(px, py + 11, T, 2);
      } else if (c === "_" || c === "-") {
        const down = c === "-";
        ctx.fillStyle = P.stoneDark; ctx.fillRect(px + 2, py + T - (down ? 1 : 3), T - 4, down ? 1 : 3);
        ctx.fillStyle = down ? P.stone : C.gold; ctx.fillRect(px + 3, py + T - (down ? 2 : 4), T - 6, 1);
      }
      else if (c === "F") {
        const inside = p && p.alive && overlap(p, { x: x * T - 4, y: y * T - 4, w: T + 8, h: T + 8 });
        ctx.globalAlpha = inside ? 0.45 : 1;
        drawStone(px, py, x, y);
        ctx.globalAlpha = 1;
      } else if (c === "B") {
        ctx.fillStyle = P.crack; ctx.fillRect(px, py, T, T);
        ctx.strokeStyle = P.crackDark; ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(px + 3, py + 1); ctx.lineTo(px + 8, py + 7); ctx.lineTo(px + 5, py + 11); ctx.lineTo(px + 9, py + 15);
        ctx.moveTo(px + 8, py + 7); ctx.lineTo(px + 14, py + 5);
        ctx.stroke();
      } else if ((c === "^" || c === "v") && P.neige) {
        // pics de glace
        const a = R.spikeAnim.get(x + "," + y) ?? 1, hgt = 11 * a;
        ctx.fillStyle = "#cfeaff";
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const bx = px + 1 + i * 5;
          if (c === "^") { ctx.moveTo(bx, py + T); ctx.lineTo(bx + 2.5, py + T - hgt); ctx.lineTo(bx + 5, py + T); }
          else { ctx.moveTo(bx, py); ctx.lineTo(bx + 2.5, py + hgt + (i === 1 ? 2 : 0)); ctx.lineTo(bx + 5, py); }
        }
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fillRect(px + 3, c === "^" ? py + T - hgt + 3 : py + 1, 1, 4);
      } else if ((c === "^" || c === "v") && R.eau != null && y * T >= R.eau) {
        // corail urticant (les pics des abysses)
        const sw = Math.sin(R.t / 20 + x) * 1, up = c === "^";
        const base = up ? py + T : py, dirY = up ? -1 : 1;
        ctx.strokeStyle = (x + y) % 2 ? "#f28c6b" : "#e8624a"; ctx.lineWidth = 2; ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(px + 4, base); ctx.lineTo(px + 4 + sw, base + dirY * 10); ctx.moveTo(px + 4 + sw * 0.5, base + dirY * 5); ctx.lineTo(px + 1 + sw, base + dirY * 8);
        ctx.moveTo(px + 11, base); ctx.lineTo(px + 11 + sw, base + dirY * 12); ctx.moveTo(px + 11 + sw * 0.5, base + dirY * 6); ctx.lineTo(px + 14 + sw, base + dirY * 9);
        ctx.stroke(); ctx.lineCap = "butt";
        ctx.fillStyle = "#ffd0c0"; ctx.fillRect(px + 3 + sw, base + dirY * 10 - 1, 2, 2); ctx.fillRect(px + 10 + sw, base + dirY * 12 - 1, 2, 2);
      } else if (c === "^" || c === "v") {
        const a = R.spikeAnim.get(x + "," + y) ?? 1, hgt = 10 * a;
        ctx.fillStyle = C.danger;
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const bx = px + 1 + i * 5;
          if (c === "^") { ctx.moveTo(bx, py + T); ctx.lineTo(bx + 2.5, py + T - hgt); ctx.lineTo(bx + 5, py + T); }
          else { ctx.moveTo(bx, py); ctx.lineTo(bx + 2.5, py + hgt); ctx.lineTo(bx + 5, py); }
        }
        ctx.fill();
      } else if (c === "<" || c === ">" || c === "(" || c === ")") {
        drawStone(px, py, x, y);
        const left = c === "<" || c === "(";
        if (c === "(" || c === ")") { ctx.fillStyle = "rgba(176,74,216,0.45)"; ctx.fillRect(left ? px : px + 8, py + 3, 8, 9); }
        ctx.fillStyle = P.stoneDark;
        ctx.fillRect(left ? px : px + 10, py + 5, 6, 5);
        ctx.fillStyle = C.danger;
        ctx.fillRect(left ? px + 8 : px + 5, py + 3, 2, 2);
        ctx.fillRect(left ? px + 12 : px + 1, py + 3, 2, 2);
      } else if (c === "c") {
        const ph = blinkPhase(x), on = ph < BLINK_ON;
        const warn = on && ph > BLINK_ON - 36;
        ctx.globalAlpha = on ? (warn && Math.floor(ph / 4) % 2 ? 0.35 : 1) : 0.12;
        ctx.fillStyle = C.wood; ctx.fillRect(px, py, T, 6);
        ctx.fillStyle = "#c79a5e"; ctx.fillRect(px, py, T, 1.5);
        ctx.fillStyle = "#5a3a1c"; ctx.fillRect(px + 4, py + 1, 1, 5); ctx.fillRect(px + 11, py + 1, 1, 5); ctx.fillRect(px, py + 5, T, 1);
        ctx.globalAlpha = 1;
      } else if (c === "o") {
        // plateforme fantôme : à peine un reflet
        ctx.globalAlpha = 0.1 + 0.06 * Math.sin(R.t / 20 + x);
        ctx.strokeStyle = C.gold; ctx.lineWidth = 0.8; ctx.setLineDash([2, 2]);
        ctx.strokeRect(px + 1, py + 1, T - 2, T - 2);
        ctx.setLineDash([]); ctx.globalAlpha = 1;
      } else if (c === "z") {
        // neige profonde : un épais matelas de neige
        drawStone(px, py, x, y);
        if (!isSolid(tileAt(x, y - 1))) { ctx.fillStyle = "#f4f8fc"; ctx.fillRect(px, py - 4, T, 8); ctx.fillStyle = "#dfe9f2"; ctx.fillRect(px + (x % 3) * 4, py - 5, 6, 2); ctx.fillStyle = "rgba(160,200,230,0.7)"; ctx.fillRect(px, py + 4, T, 1); }
      } else if (c === "i") {
        // glace fine d'un lac gelé : elle se fissure si Max reste dessus
        const v = R.glaceFine.get(x + "," + y) || 0;
        ctx.fillStyle = "rgba(170,220,250,0.78)"; ctx.fillRect(px, py, T, 5);
        ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fillRect(px + (x * 5) % 9, py + 1, 5, 1);
        if (v > 30) { ctx.strokeStyle = "rgba(30,60,90,0.9)"; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(px + 3, py); ctx.lineTo(px + 7, py + 3); ctx.lineTo(px + 12, py + 1); if (v > 65) { ctx.moveTo(px + 7, py + 3); ctx.lineTo(px + 6, py + 5); ctx.moveTo(px + 1, py + 4); ctx.lineTo(px + 15, py + 2); } ctx.stroke(); }
      } else if (c === "y") {
        // planche de pont de corde
        ctx.strokeStyle = "#8a6a3a"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, py - 6); ctx.lineTo(px + T, py - 6); ctx.stroke();
        ctx.fillStyle = "#9a7444"; ctx.fillRect(px + 1, py, T - 2, 4);
        ctx.fillStyle = "#c79a5e"; ctx.fillRect(px + 1, py, T - 2, 1);
        ctx.fillStyle = "#6e5030"; ctx.fillRect(px + 1, py - 6, 1, 6); ctx.fillRect(px + T - 2, py - 6, 1, 6);
      } else if (c === "V") {
        // bouche de geyser : une source chaude dans la roche
        drawStone(px, py, x, y);
        const gz = R.geysers.find((q) => q.x === x && q.y === y);
        ctx.fillStyle = "#3a2a1a"; ctx.fillRect(px + 4, py, 8, 3);
        ctx.fillStyle = gz && gz.warn ? (Math.floor(R.t / 4) % 2 ? "#ffd34a" : "#ff8a3a") : "#6e8a9a"; ctx.fillRect(px + 5, py + 1, 6, 1);
        if (gz && gz.on) { const gr = ctx.createLinearGradient(0, py, 0, py - 6 * T); gr.addColorStop(0, "rgba(240,250,255,0.75)"); gr.addColorStop(1, "rgba(240,250,255,0)"); ctx.fillStyle = gr; ctx.fillRect(px + 2, py - 6 * T, 12, 6 * T); }
      } else if (c === "g" && P.neige) {
        // glace vive
        ctx.fillStyle = "#9fd0ee"; ctx.fillRect(px, py, T, T);
        ctx.fillStyle = "#d8f0ff"; ctx.fillRect(px, py, T, 3); ctx.fillRect(px + (x * 7) % 10, py + 5, 4, 1);
        ctx.fillStyle = "rgba(60,110,150,0.4)"; ctx.fillRect(px, py + T - 3, T, 3);
      } else if (c === "n") {
        // plateforme de bois qui flotte (et coule)
        const s = R.sink.get(x + "," + y) || 0, wob = s ? Math.sin(R.t / 3) * 0.8 : 0;
        ctx.fillStyle = "#7a5230"; ctx.fillRect(px, py + 2 + wob, T, 6);
        ctx.fillStyle = "#a8774a"; ctx.fillRect(px, py + 2 + wob, T, 1.5);
        ctx.fillStyle = "#4a3018"; ctx.fillRect(px + 5, py + 3 + wob, 1, 5); ctx.fillRect(px + 11, py + 3 + wob, 1, 5);
        if (s) { ctx.fillStyle = "rgba(160,220,235,0.5)"; ctx.fillRect(px + (R.t % 12), py + 8, 2, 1); }
      } else if (c === "J" || c === "q") {
        const sq = R.springAnim.get(x + "," + y) || 0;
        const top = py + 4 + (sq > 5 ? 3 : 0);
        ctx.fillStyle = C.metal; ctx.fillRect(px + 1, py + T - 4, T - 2, 4);
        ctx.strokeStyle = C.hat; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(px + 4, py + T - 4);
        const n = 4, hh = (py + T - 4 - top - 2) / n;
        for (let i = 0; i < n; i++) ctx.lineTo(px + (i % 2 ? 4 : 12), py + T - 4 - (i + 1) * hh);
        ctx.stroke();
        ctx.fillStyle = C.wood; ctx.fillRect(px, top, T, 3);
        ctx.fillStyle = C.danger; ctx.fillRect(px + 6, top - 1, 4, 1);
        if (c === "q") {   // ressort fragile : bois fendu et ressort rouillé
          ctx.strokeStyle = "#3a2210"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(px + 2, top); ctx.lineTo(px + 5, top + 2); ctx.lineTo(px + 8, top); ctx.moveTo(px + 11, top + 1); ctx.lineTo(px + 14, top + 3); ctx.stroke();
          ctx.fillStyle = "#a0522d"; ctx.fillRect(px + 4, py + T - 7, 2, 2); ctx.fillRect(px + 10, py + T - 10, 2, 2);
        }
      }
    }
  }

  function drawBoss() {
    const b = R.boss;
    for (const r of R.rocks) {
      if (r.warn > 0) {   // ombre au sol qui annonce la chute
        let fy = Math.floor(r.y / T); while (fy < ROWS - 1 && !isSolid(tileAt(Math.floor((r.x + 5) / T), fy + 1))) fy++;
        ctx.fillStyle = `rgba(0,0,0,${0.25 + 0.25 * Math.sin(R.t / 3)})`; ctx.beginPath(); ctx.ellipse(r.x + 5, (fy + 1) * T - 1, 7, 2, 0, 0, Math.PI * 2); ctx.fill();
        continue;
      }
      ctx.fillStyle = P.stone; ctx.beginPath(); ctx.arc(r.x + 5, r.y + 5, 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = P.stoneTop; ctx.fillRect(r.x + 2, r.y + 2, 3, 2);
    }
    const f = b.face;
    const dors = b.etat === "dort", sonne = b.etat === "sonne", gr = b.etat === "gratte";
    ctx.save();
    ctx.translate(Math.round(b.x), Math.round(b.y));
    if (f < 0) { ctx.translate(b.w, 0); ctx.scale(-1, 1); }
    ctx.scale(BOSS_K, BOSS_K);
    const x = 0, y = 0;
    const sq = dors ? 6 : sonne ? 3 : 0, run = b.etat === "charge" ? Math.sin(b.t * 0.6) * 2 : gr ? Math.sin(b.t * 0.9) : 0;
    // queue
    ctx.strokeStyle = "#7d6a4a"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x + 4, y + 12 + sq); ctx.quadraticCurveTo(x - 8, y + 6 + sq, x - 6, y - 2 + sq + Math.sin(b.t / 10) * 2); ctx.stroke();
    // pattes
    ctx.fillStyle = "#6e5a3e";
    if (!dors) { ctx.fillRect(x + 6 + run, y + 22, 6, 8); ctx.fillRect(x + 16 - run, y + 22, 6, 8); ctx.fillRect(x + 26 + run, y + 22, 6, 8); ctx.fillRect(x + 34 - run, y + 22, 6, 8); }
    // corps de pierre
    ctx.fillStyle = "#9c8a66"; ctx.fillRect(x + 2, y + 8 + sq, 36, 16 - (dors ? 2 : 0));
    ctx.fillStyle = "#b8a27a"; ctx.fillRect(x + 2, y + 8 + sq, 36, 3);
    ctx.fillStyle = "#7d6a4a"; for (let i = 0; i < 5; i++) ctx.fillRect(x + 6 + i * 7, y + 13 + sq + (i % 2) * 4, 3, 3);   // taches sculptées
    ctx.strokeStyle = "#5a4a32"; ctx.lineWidth = 1; ctx.strokeRect(x + 2.5, y + 8.5 + sq, 35, 15);
    // tête
    const hy = y + sq + (gr ? 3 : 0);
    ctx.fillStyle = "#a8946e"; ctx.fillRect(x + 28, hy, 16, 16);
    ctx.fillStyle = "#8a7a5a"; ctx.fillRect(x + 29, hy - 4, 4, 5); ctx.fillRect(x + 39, hy - 4, 4, 5);   // oreilles
    ctx.fillStyle = "#7d6a4a"; ctx.fillRect(x + 38, hy + 9, 6, 6);                                    // museau
    ctx.fillStyle = "#f2e0c0"; ctx.fillRect(x + 39, hy + 14, 2, 3); ctx.fillRect(x + 42, hy + 14, 2, 3); // crocs
    // yeux : rouges quand il charge, fermés quand il dort, étoiles quand il est sonné
    if (dors) { ctx.fillStyle = "#3a2a1a"; ctx.fillRect(x + 35, hy + 7, 5, 1); }
    else { ctx.fillStyle = b.etat === "charge" || gr ? "#ff3a2a" : "#2a1a10"; ctx.fillRect(x + 36, hy + 5, 3, 3); }
    // pierre de jade sur le front
    const g = sonne ? 0.5 + 0.5 * Math.sin(R.t / 4) : 0;
    if (sonne) { ctx.fillStyle = `rgba(63,208,138,${0.25 + g * 0.3})`; ctx.beginPath(); ctx.arc(x + 35, hy + 3, 8, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = b.hits >= 3 ? "#2a6a4a" : C.jade; ctx.beginPath(); ctx.moveTo(x + 35, hy - 2); ctx.lineTo(x + 39, hy + 3); ctx.lineTo(x + 35, hy + 8); ctx.lineTo(x + 31, hy + 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#d9ffe9"; ctx.fillRect(x + 33, hy + 1, 2, 2);
    // fissures selon les coups reçus
    ctx.strokeStyle = "#3a2a1a"; ctx.lineWidth = 1;
    if (b.hits >= 1) { ctx.beginPath(); ctx.moveTo(x + 30, hy + 2); ctx.lineTo(x + 33, hy + 7); ctx.lineTo(x + 31, hy + 12); ctx.stroke(); }
    if (b.hits >= 2) { ctx.beginPath(); ctx.moveTo(x + 12, y + 9 + sq); ctx.lineTo(x + 15, y + 15 + sq); ctx.lineTo(x + 12, y + 20 + sq); ctx.stroke(); }
    ctx.restore();
    if (sonne) drawStars(b.x + b.w / 2 + f * 12, b.y - 4, b.k);
    // vies du boss : trois pierres de jade
    for (let i = 0; i < 3; i++) {
      const cx = b.x + b.w / 2 - 12 + i * 12, cy = b.y - 14;
      ctx.fillStyle = i < 3 - b.hits ? C.jade : "rgba(63,208,138,0.2)";
      ctx.beginPath(); ctx.moveTo(cx, cy - 4); ctx.lineTo(cx + 3, cy); ctx.lineTo(cx, cy + 4); ctx.lineTo(cx - 3, cy); ctx.closePath(); ctx.fill();
    }
  }
  function drawEau() {
    const y0 = R.eau, x0 = cam.x - 10, x1 = cam.x + view.w + 10;
    const vague = (x) => Math.sin(x / 11 + R.t / 14) * 1.6 + Math.sin(x / 5 - R.t / 9) * 0.6;
    const g = ctx.createLinearGradient(0, y0, 0, H);
    g.addColorStop(0, "rgba(40,150,190,0.30)"); g.addColorStop(1, "rgba(4,30,60,0.55)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x0, H + 40);
    for (let x = x0; x <= x1; x += 4) ctx.lineTo(x, y0 + vague(x));
    ctx.lineTo(x1, H + 40); ctx.closePath(); ctx.fill();
    // rayons de lumière qui traversent la surface
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (let i = Math.floor(x0 / 70); i <= Math.ceil(x1 / 70); i++) {
      const bx = i * 70 + Math.sin(R.t / 90 + i) * 12, a = 0.05 + 0.03 * Math.sin(R.t / 40 + i * 2);
      ctx.fillStyle = `rgba(180,235,255,${a})`;
      ctx.beginPath(); ctx.moveTo(bx, y0); ctx.lineTo(bx + 14, y0); ctx.lineTo(bx + 54, Math.min(H, y0 + 160)); ctx.lineTo(bx + 30, Math.min(H, y0 + 160)); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // la surface
    ctx.strokeStyle = "rgba(210,245,255,0.85)"; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let x = x0; x <= x1; x += 4) { const y = y0 + vague(x); if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
  }
  // jauge de froid (Himalaya) : en haut à gauche, sous le bandeau
  function drawFroid() {
    if (R.froid == null) return;
    const w = 70, x = 8, y = 19, bas = R.froid < 0.3;
    ctx.fillStyle = "rgba(6,10,8,0.72)"; ctx.fillRect(x - 2, y - 2, w + 34, 11);
    ctx.font = `7px ${FONT_PIX}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillStyle = bas && Math.floor(R.t / 8) % 2 ? C.danger : "#ffb347"; ctx.fillText("CHAUD", x, y + 3.5);
    ctx.fillStyle = "rgba(160,200,230,0.35)"; ctx.fillRect(x + 30, y, w, 6);
    ctx.fillStyle = bas ? "#7fb8e6" : "#ffb347"; ctx.fillRect(x + 30, y, w * R.froid, 6);
  }
  function drawBlizzard(k) {
    // tempête : on n'y voit pas loin
    const p = R.player; if (!p) return;
    const cx = p.x + p.w / 2 - cam.x, cy = p.y + p.h / 2 - cam.y;
    const g = ctx.createRadialGradient(cx, cy, 50, cx, cy, 150);
    g.addColorStop(0, "rgba(235,242,250,0)"); g.addColorStop(1, "rgba(235,242,250,0.88)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, view.w, view.h);
  }
  // jauge d'air au-dessus de la tête de Max quand il est sous l'eau
  function drawOxygene() {
    if (R.eau == null || !R.player || !R.player.alive) return;
    const p = R.player, sous = p.y + 3 > R.eau;
    if (!sous && R.o2 >= 0.999) return;
    const bas = R.o2 < 0.3, w = 22, x = Math.round(p.x + p.w / 2 - w / 2 - cam.x), y = Math.round(p.y - 12 - cam.y);
    ctx.fillStyle = "rgba(6,10,8,0.75)"; ctx.fillRect(x - 1, y - 1, w + 2, 5);
    ctx.fillStyle = bas && Math.floor(R.t / 6) % 2 ? C.danger : bas ? "#ff9a7a" : "#7fd7e6";
    ctx.fillRect(x, y, w * R.o2, 3);
    if (bas && Math.floor(R.t / 10) % 2) { ctx.font = `7px ${FONT_PIX}`; ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillStyle = C.danger; ctx.fillText("AIR !", x + w / 2, y - 2); }
  }
  function drawVines() {
    for (const v of R.vines) {
      const ex = v.ax + Math.sin(v.ang) * v.L, ey = v.ay + Math.cos(v.ang) * v.L;
      ctx.fillStyle = C.wood; ctx.fillRect(v.ax - 5, v.ay - 2, 10, 3);
      ctx.strokeStyle = "#3f7a45"; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(v.ax, v.ay);
      const mx = v.ax + Math.sin(v.ang * 0.8) * v.L * 0.5, my = v.ay + Math.cos(v.ang * 0.8) * v.L * 0.5;
      ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
      ctx.fillStyle = "#5f9a55";
      for (let k = 0.2; k < 1; k += 0.2) {
        const lx = v.ax + Math.sin(v.ang) * v.L * k, ly = v.ay + Math.cos(v.ang) * v.L * k;
        ctx.beginPath(); ctx.ellipse(lx + 3, ly, 3, 1.5, 0.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "#2f5d3a"; ctx.beginPath(); ctx.arc(ex, ey, 2.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  function drawFlames() {
    for (const f of R.flames) {
      if (!inView(f.x, f.y, 8)) continue;
      const px = f.x * T, py = f.y * T;
      // tête de jaguar sculptée
      drawStone(px, py, f.x, f.y);
      ctx.fillStyle = "#c9a24a"; ctx.fillRect(px + 2, py + 2, 12, 12);
      ctx.fillStyle = "#8a6a2a"; ctx.fillRect(px + 2, py + 2, 12, 2); ctx.fillRect(px + 3, py, 2, 3); ctx.fillRect(px + 11, py, 2, 3);
      const eyeX = f.dir > 0 ? px + 9 : px + 4;
      ctx.fillStyle = f.warn || f.on ? "#ff4a2a" : "#2a1a10"; ctx.fillRect(eyeX, py + 5, 3, 2);
      ctx.fillStyle = "#2a1a10"; ctx.fillRect(f.dir > 0 ? px + 11 : px + 1, py + 9, 4, 3);
      if (f.warn && R.t % 4 < 2) { ctx.fillStyle = "#ffb347"; ctx.fillRect(f.dir > 0 ? px + 15 : px - 1, py + 9 + (R.t % 3), 2, 2); }
      if (f.on) {
        const r = flameRect(f);
        const g = ctx.createLinearGradient(f.dir > 0 ? r.x : r.x + r.w, 0, f.dir > 0 ? r.x + r.w : r.x, 0);
        g.addColorStop(0, "rgba(255,240,170,0.95)"); g.addColorStop(0.5, "rgba(255,150,50,0.85)"); g.addColorStop(1, "rgba(232,80,30,0.1)");
        ctx.fillStyle = g;
        const fl = Math.sin(R.t / 2) * 1.5;
        ctx.beginPath(); ctx.moveTo(f.dir > 0 ? r.x : r.x + r.w, r.y + 4);
        ctx.quadraticCurveTo(r.x + r.w / 2, r.y - 2 + fl, f.dir > 0 ? r.x + r.w : r.x, r.y + 4);
        ctx.quadraticCurveTo(r.x + r.w / 2, r.y + r.h + 2 - fl, f.dir > 0 ? r.x : r.x + r.w, r.y + 4);
        ctx.fill();
      }
    }
  }
  function drawBeams() {
    for (const b of R.beams) {
      // miroir solaire au plafond
      ctx.fillStyle = "#8a6a2a"; ctx.fillRect(b.sx - 7, b.sy - 12, 14, 4);
      ctx.fillStyle = "#ffd34a"; ctx.beginPath(); ctx.arc(b.sx, b.sy - 4, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff3c4"; ctx.beginPath(); ctx.arc(b.sx - 2, b.sy - 6, 2, 0, Math.PI * 2); ctx.fill();
      if (!b.end) {
        // avant de s'allumer : un mince trait montre où le rayon passera
        ctx.strokeStyle = "rgba(255,211,74,0.25)"; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(b.sx, b.sy); ctx.lineTo(b.sx + Math.sin(b.ang) * 200, b.sy + Math.cos(b.ang) * 200); ctx.stroke(); ctx.setLineDash([]);
        continue;
      }
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(255,200,80,0.25)"; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(b.sx, b.sy); ctx.lineTo(b.end[0], b.end[1]); ctx.stroke();
      ctx.strokeStyle = "rgba(255,240,180,0.85)"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(b.sx, b.sy); ctx.lineTo(b.end[0], b.end[1]); ctx.stroke();
      ctx.fillStyle = "rgba(255,220,120,0.5)"; ctx.beginPath(); ctx.arc(b.end[0], b.end[1], 5 + Math.sin(R.t / 3), 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
  function drawSecrets() {
    for (const s of R.secretRooms) {
      if (s.fade <= 0) continue;
      ctx.globalAlpha = s.fade;
      for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) if (inView(x, y)) drawStone(x * T, y * T, x, y);
      ctx.globalAlpha = 1;
    }
  }
  function drawTorches() {
    for (const tc of R.torches) {
      const px = tc.x * T, py = tc.y * T;
      ctx.fillStyle = C.wood; ctx.fillRect(px + 7, py + 4, 2, 12);
      ctx.fillStyle = "#4a3018"; ctx.fillRect(px + 5, py + 2, 6, 3);
      if (tc.lit) {
        const fl = Math.sin(R.t / 3 + tc.x) * 1.2;
        ctx.fillStyle = "#e8621f"; ctx.beginPath(); ctx.ellipse(px + 8, py - 1, 3, 5 + fl, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ffd34a"; ctx.beginPath(); ctx.ellipse(px + 8, py, 1.6, 3 + fl / 2, 0, 0, Math.PI * 2); ctx.fill();
      } else { ctx.fillStyle = "rgba(255,211,74,0.35)"; ctx.fillRect(px + 7, py, 2, 2); }
    }
  }
  function drawBraseros() {
    for (const b of R.braseros) {
      const px = b.x * T, py = b.y * T;
      ctx.fillStyle = "#4a3a2a"; ctx.fillRect(px + 3, py + 9, 10, 4); ctx.fillRect(px + 5, py + 13, 2, 3); ctx.fillRect(px + 9, py + 13, 2, 3);
      const fl = Math.sin(R.t / 3 + b.x) * 1.5;
      ctx.fillStyle = "#e8621f"; ctx.beginPath(); ctx.ellipse(px + 8, py + 6, 4, 6 + fl, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffd34a"; ctx.beginPath(); ctx.ellipse(px + 8, py + 7, 2, 3.5 + fl / 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const gr = ctx.createRadialGradient(px + 8, py + 6, 2, px + 8, py + 6, 36); gr.addColorStop(0, "rgba(255,150,60,0.30)"); gr.addColorStop(1, "rgba(255,120,40,0)");
      ctx.fillStyle = gr; ctx.fillRect(px - 30, py - 30, 76, 76); ctx.restore();
    }
  }
  function drawStuck() {
    for (const s of R.stuck) {
      ctx.globalAlpha = s.life < 60 && Math.floor(s.life / 5) % 2 ? 0.4 : 1;
      ctx.fillStyle = C.wood; ctx.fillRect(s.x, s.y, s.w, 2);
      ctx.fillStyle = "#3fbf7f"; ctx.fillRect(s.vx > 0 ? s.x : s.x + s.w - 3, s.y - 1, 3, 4);
      ctx.globalAlpha = 1;
    }
  }

  // drapeau de sauvegarde : terne tant qu'il n'est pas atteint, doré et flottant ensuite
  function drawCheckpoint(cp) {
    const x = cp.x * T + 6, y = cp.y * T + T;
    ctx.fillStyle = C.wood; ctx.fillRect(x, y - 18, 2, 18);
    ctx.fillStyle = C.metal; ctx.fillRect(x - 2, y - 2, 6, 2);
    const wave = Math.sin(R.t / 8) * (cp.on ? 1.5 : 0.4);
    ctx.fillStyle = cp.on ? C.gold : "#6d6a5c";
    ctx.beginPath(); ctx.moveTo(x + 2, y - 18); ctx.lineTo(x + 11, y - 15 + wave); ctx.lineTo(x + 2, y - 11); ctx.closePath(); ctx.fill();
    if (cp.on) { ctx.fillStyle = "rgba(242,193,78,0.18)"; ctx.beginPath(); ctx.arc(x + 4, y - 12, 12, 0, Math.PI * 2); ctx.fill(); }
  }

  function drawDoor() {
    const d = R.door;
    if (!d || d.hidden) return;
    const glow = 0.5 + 0.5 * Math.sin(R.t / 12);
    ctx.fillStyle = `rgba(217,164,65,${0.12 + glow * 0.1})`;
    ctx.fillRect(d.x - 4, d.y - 4, d.w + 8, d.h + 4);
    ctx.fillStyle = C.door; ctx.fillRect(d.x - 2, d.y - 2, d.w + 4, d.h + 2);
    ctx.fillStyle = C.doorIn; ctx.fillRect(d.x + 1, d.y + 1, d.w - 2, d.h - 1);
    if (d.moving) {
      ctx.fillStyle = C.door;
      const ph = Math.sin(R.t / 2) * 3;
      ctx.fillRect(d.x + 1 + ph, d.y + d.h, 2, 4);
      ctx.fillRect(d.x + d.w - 3 - ph, d.y + d.h, 2, 4);
    }
  }

  function drawPickup(it) {
    if (it.kind === "gem") {
      const bob = Math.sin(R.t / 12 + it.x) * 1.5, cx = it.x + 4, cy = it.y + 4 + bob;
      const g = 0.5 + 0.5 * Math.sin(R.t / 8);
      ctx.fillStyle = `rgba(63,208,138,${0.18 + g * 0.18})`; ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.jade; ctx.beginPath(); ctx.moveTo(cx, cy - 6); ctx.lineTo(cx + 5, cy - 1); ctx.lineTo(cx, cy + 6); ctx.lineTo(cx - 5, cy - 1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.jadeDark; ctx.beginPath(); ctx.moveTo(cx, cy + 6); ctx.lineTo(cx + 5, cy - 1); ctx.lineTo(cx, cy + 1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#d9ffe9"; ctx.fillRect(cx - 2, cy - 3, 2, 2);
      return;
    }
    const bob = Math.sin(R.t / 10 + it.x) * 1.5;
    if (it.kind === "sand") {
      const x = it.x, y = it.y + bob;
      ctx.fillStyle = C.wood; ctx.fillRect(x - 1, y - 1, 10, 2); ctx.fillRect(x - 1, y + 10, 10, 2);
      ctx.fillStyle = "rgba(220,240,255,0.55)"; ctx.beginPath(); ctx.moveTo(x, y + 1); ctx.lineTo(x + 8, y + 1); ctx.lineTo(x + 4, y + 5.5); ctx.lineTo(x + 8, y + 10); ctx.lineTo(x, y + 10); ctx.lineTo(x + 4, y + 5.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#e8c060"; ctx.fillRect(x + 2, y + 2, 4, 2); ctx.fillRect(x + 1, y + 8, 6, 2); ctx.fillRect(x + 3.5, y + 5, 1, 3);
      return;
    }
    if (it.kind === "tnt") {
      ctx.fillStyle = C.danger; ctx.fillRect(it.x + 1, it.y + bob, 6, 10);
      ctx.fillStyle = C.text; ctx.fillRect(it.x + 1, it.y + 4 + bob, 6, 1);
      ctx.fillStyle = C.hat; ctx.fillRect(it.x + 3, it.y - 3 + bob, 1, 3);
    } else {
      // pièce d'or qui tourne
      const w = Math.abs(Math.cos(R.t / 12 + it.x)) * 7 + 1;
      ctx.fillStyle = "#b8862a"; ctx.beginPath(); ctx.ellipse(it.x + 4, it.y + 5 + bob, w / 2 + 0.5, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.gold; ctx.beginPath(); ctx.ellipse(it.x + 4, it.y + 5 + bob, w / 2, 4, 0, 0, Math.PI * 2); ctx.fill();
      if (w > 4) { ctx.fillStyle = "#fff3c4"; ctx.fillRect(it.x + 3, it.y + 2 + bob, 1, 3); }
    }
  }

  function drawEnemy(e) {
    const f = e.kind === "j" ? e.face : (e.stun ? e.dirBack || e.vx : e.vx) > 0 ? 1 : -1;
    ctx.save();
    if (e.stun) {
      // assommé : écrasé et un peu penché
      ctx.translate(e.x + e.w / 2, e.y + e.h); ctx.rotate(0.12 * f); ctx.scale(1.08, 0.78); ctx.translate(-(e.x + e.w / 2), -(e.y + e.h));
    }
    if (f < 0) { ctx.translate(e.x * 2 + e.w, 0); ctx.scale(-1, 1); }
    if ("hZMX".includes(e.kind)) { ctx.restore(); drawAbysse(e); if (e.stun) drawStars(e.x + e.w / 2, e.y - 3, e.stun); return; }
    if (e.kind === "m") drawMummy(e);
    else if (e.kind === "s") drawSnake(e);
    else if (e.kind === "k") drawSinge(e);
    else if (e.kind === "e") { ctx.restore(); drawMeduse(e); if (e.stun) drawStars(e.x + 5, e.y - 3, e.stun); return; }
    else if (e.kind === "r") drawCrabe(e);
    else if (e.kind === "L") drawLoup(e);
    else if (e.kind === "C") drawChevre(e);
    else if (e.kind === "S") drawBonhomme(e);
    else if (e.kind === "Y") { ctx.restore(); drawYetiPetit(e); if (e.stun) drawStars(e.x + 7, e.y - 3, e.stun); return; }
    else if (e.kind === "N" || e.kind === "I" || e.kind === "U" || e.kind === "d") { ctx.restore(); drawEnnemiOr(e); if (e.stun) drawStars(e.x + e.w / 2, e.y - 3, e.stun); return; }
    else if (e.kind === "O") { ctx.restore(); drawOiseau(e); if (e.stun) drawStars(e.x + 6, e.y - 3, e.stun); return; }
    else if (e.kind === "E") { ctx.restore(); drawEtincelle(e); if (e.stun) drawStars(e.x + 5, e.y - 3, e.stun); return; }
    else if (e.kind === "A") { ctx.restore(); drawAigle(e); if (e.stun) drawStars(e.x + 6, e.y - 3, e.stun); return; }
    else if (e.kind === "l") { ctx.restore(); drawAnguille(e); if (e.stun) drawStars(e.nid + e.dir * 10, e.y - 3, e.stun); return; }
    else if (e.kind === "j") drawJaguar(e);
    else drawBat(e);
    ctx.restore();
    if (e.stun) drawStars(e.x + e.w / 2, e.y - 3, e.stun);
  }

  function drawStars(cx, cy, t) {
    for (let i = 0; i < 3; i++) {
      const a = R.t / 9 + (i * Math.PI * 2) / 3;
      const x = cx + Math.cos(a) * 7, y = cy + Math.sin(a) * 2.5;
      ctx.globalAlpha = t < 60 ? (Math.floor(t / 6) % 2 ? 0.4 : 1) : 1;
      ctx.fillStyle = C.gold;
      ctx.fillRect(x - 0.5, y - 2, 1, 4); ctx.fillRect(x - 2, y - 0.5, 4, 1);
    }
    ctx.globalAlpha = 1;
  }

  // Professeur Archibald : chapeau de feutre beige, lunettes rondes, nœud papillon rouge, veste beige
  function drawRival(r) {
    const run = r.state === "run";
    const ph = run ? Math.sin(r.t * 0.6) : 0, bob = run ? Math.abs(ph) : Math.sin(r.t / 10) * 0.4;
    const x = Math.round(r.x), y = Math.round(r.y - bob);
    ctx.save();
    if (r.face < 0) { ctx.translate(x + 10, y); ctx.scale(-1, 1); } else ctx.translate(x, y);
    // jambes (pantalon brun) et chaussures
    ctx.fillStyle = "#6b5236"; ctx.fillRect(2 + ph * 2, 10, 3, 3); ctx.fillRect(5 - ph * 2, 10, 3, 3);
    ctx.fillStyle = "#2b1c10"; ctx.fillRect(2 + ph * 2, 13, 3, 2); ctx.fillRect(5 - ph * 2, 13, 4, 2);
    // veste beige à pans
    ctx.fillStyle = "#d8c7a0"; ctx.fillRect(1, 5, 8, 6);
    ctx.fillStyle = "#a8946a"; ctx.fillRect(1, 5, 1, 6); ctx.fillRect(4, 7, 1, 4); ctx.fillRect(0, 10, 2, 1);
    ctx.fillStyle = "#f4ecd8"; ctx.fillRect(5, 5, 2, 3);            // chemise
    ctx.fillStyle = "#c62f22"; ctx.fillRect(4, 5, 1, 1); ctx.fillRect(6, 5, 2, 1); ctx.fillRect(5, 5, 1, 1); // nœud papillon
    // bras tendu (il pointe le trésor)
    ctx.fillStyle = "#d8c7a0"; ctx.fillRect(7, 6 + (run ? 0 : 1), 3, 2);
    ctx.fillStyle = C.skin; ctx.fillRect(10, 6 + (run ? 0 : 1), 1, 2);
    // tête, cheveux gris, grand sourire
    ctx.fillStyle = C.skin; ctx.fillRect(3, 0, 6, 5);
    ctx.fillStyle = "#cfcfcf"; ctx.fillRect(2, 1, 1, 3); ctx.fillRect(3, 0, 1, 1);
    ctx.fillStyle = "#3a2010"; ctx.fillRect(5, 4, 4, 1);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(6, 4, 2, 1);
    // lunettes rondes
    ctx.strokeStyle = "#2a1a10"; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.arc(7.6, 2.2, 1.2, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#2a1a10"; ctx.fillRect(7.3, 1.9, 0.8, 0.8);
    // chapeau de feutre beige à large bord, ruban brun (comme sur l'affiche)
    ctx.fillStyle = "#b39a6a";
    ctx.beginPath(); ctx.ellipse(6, 0.6, 7.4, 1.5, -0.05, 0, Math.PI * 2); ctx.fill();          // bord
    ctx.fillStyle = "#cdb688";
    ctx.beginPath(); ctx.moveTo(2.2, 0.4); ctx.lineTo(2.8, -3.6); ctx.quadraticCurveTo(6, -5.2, 9.2, -3.6); ctx.lineTo(9.8, 0.4); ctx.closePath(); ctx.fill(); // calotte
    ctx.fillStyle = "#9c8457"; ctx.fillRect(5.4, -4.6, 1.4, 1);                                   // creux du dessus
    ctx.fillStyle = "#6b4a2a"; ctx.fillRect(2.4, -1.1, 7.2, 1.2);                                 // ruban
    ctx.fillStyle = "#e4d3a8"; ctx.fillRect(3.4, -3.2, 1.6, 0.8);                                 // reflet
    ctx.restore();
  }

  // Momie : bandages, bras tendus vers l'avant, yeux verts
  function drawMummy(e) {
    const x = e.x, y = Math.round(e.y);
    const wob = Math.sin(e.t * 2.2), legA = wob > 0 ? 1 : 0;
    ctx.fillStyle = C.bandage;
    ctx.fillRect(x + 2, y + 1, 7, 6);
    ctx.fillRect(x + 1, y + 6, 9, 6);
    ctx.fillRect(x + 2, y + 12, 3, 3 - legA);
    ctx.fillRect(x + 6, y + 12 + legA, 3, 3 - legA);
    ctx.fillRect(x + 8, y + 7 + (wob > 0 ? 0 : 1), 5, 2);
    ctx.fillRect(x + 8, y + 9 + (wob > 0 ? 1 : 0), 4, 2);
    ctx.fillStyle = C.bandageDark;
    ctx.fillRect(x + 2, y + 3, 7, 1);
    ctx.fillRect(x + 1, y + 8, 9, 1);
    ctx.fillRect(x + 1, y + 11, 9, 1);
    ctx.fillRect(x + 3, y + 6, 1, 2);
    ctx.fillStyle = C.bandage;
    ctx.fillRect(x - 1, y + 10 + Math.round(wob), 2, 1);
    ctx.fillRect(x - 3, y + 11 + Math.round(wob), 2, 1);
    ctx.fillStyle = C.void; ctx.fillRect(x + 5, y + 4, 4, 2);
    ctx.fillStyle = C.mummyEye; ctx.fillRect(x + 6, y + 4, 1, 1); ctx.fillRect(x + 8, y + 4, 1, 1);
  }

  // Serpent : corps ondulant, langue fourchue
  function drawSnake(e) {
    const x = e.x, y = Math.round(e.y);
    for (let i = 0; i < 6; i++) {
      const sx = x + i * 2, sy = y + 3 + Math.round(Math.sin(e.t * 3 + i * 0.9) * 1.5);
      ctx.fillStyle = i % 2 ? C.snakeDark : C.snake; ctx.fillRect(sx, sy, 3, 3);
      ctx.fillStyle = C.snakeBelly; ctx.fillRect(sx, sy + 2, 2, 1);
    }
    const hy = y + 1 + Math.round(Math.sin(e.t * 3 + 6));
    ctx.fillStyle = C.snake; ctx.fillRect(x + 11, hy, 4, 4);
    ctx.fillStyle = C.snakeDark; ctx.fillRect(x + 11, hy, 4, 1);
    ctx.fillStyle = C.snakeBelly; ctx.fillRect(x + 13, hy + 1, 1, 1);
    if (Math.sin(e.t * 1.7) > 0.3) { ctx.fillStyle = C.danger; ctx.fillRect(x + 15, hy + 2, 2, 1); ctx.fillRect(x + 17, hy + 1, 1, 1); ctx.fillRect(x + 17, hy + 3, 1, 1); }
  }

  // Singe voleur : pelage brun, longue queue enroulée, sac de pièces quand il a volé
  function drawSinge(e) {
    const x = e.x, y = Math.round(e.y), run = e.etat !== "rode" || Math.abs(e.vx) > 0.5, ph = Math.sin(e.t * (run ? 6 : 3));
    ctx.strokeStyle = "#6b4426"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x + 1, y + 8); ctx.quadraticCurveTo(x - 5, y + 6 + ph * 2, x - 3, y + 1); ctx.stroke();
    ctx.fillStyle = "#8a5a32"; ctx.fillRect(x + 1, y + 5, 8, 5);
    ctx.fillRect(x + 1 + (ph > 0 ? 1 : 0), y + 10, 2, 2); ctx.fillRect(x + 6 - (ph > 0 ? 1 : 0), y + 10, 2, 2);
    ctx.fillRect(x + 7, y + 6 + Math.round(ph), 4, 2);
    ctx.fillStyle = "#8a5a32"; ctx.fillRect(x + 4, y, 7, 6);
    ctx.fillStyle = "#e0b98a"; ctx.fillRect(x + 6, y + 2, 5, 4); ctx.fillRect(x + 3, y + 1, 2, 2);
    ctx.fillStyle = C.void; ctx.fillRect(x + 8, y + 2, 1, 1); ctx.fillRect(x + 10, y + 2, 1, 1); ctx.fillRect(x + 8, y + 4, 3, 1);
    if (e.butin) { ctx.fillStyle = "#c9a24a"; ctx.beginPath(); ctx.arc(x + 4, y + 4, 3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#fff3c4"; ctx.fillRect(x + 3, y + 3, 1, 1); }
  }

  function drawLoup(e) {
    const x = e.x, y = Math.round(e.y), ch = e.etat === "chasse", ph = Math.sin(e.t * (ch ? 8 : 4));
    ctx.fillStyle = "#8a96a2"; ctx.fillRect(x + 1, y + 2, 10, 4);
    ctx.fillStyle = "#b8c4ce"; ctx.fillRect(x + 2, y + 5, 8, 1);
    ctx.fillStyle = "#6e7a86"; ctx.fillRect(x + 1 + (ph > 0 ? 1 : 0), y + 6, 2, 3); ctx.fillRect(x + 8 - (ph > 0 ? 1 : 0), y + 6, 2, 3);
    ctx.fillStyle = "#8a96a2"; ctx.fillRect(x + 10, y, 4, 4); ctx.fillRect(x + 10, y - 2, 1, 2); ctx.fillRect(x + 12, y - 2, 1, 2); ctx.fillRect(x + 13, y + 2, 2, 2);
    ctx.fillStyle = ch ? "#ffd34a" : C.void; ctx.fillRect(x + 12, y + 1, 1, 1);
    ctx.strokeStyle = "#8a96a2"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 1, y + 3); ctx.lineTo(x - 3, y + (ch ? 1 : 5)); ctx.stroke();
    if (ch) { ctx.fillStyle = "#fff"; ctx.fillRect(x + 13, y + 3, 1, 1); }
  }
  function drawChevre(e) {
    const x = e.x, y = Math.round(e.y), ch = e.etat === "charge", pr = e.etat === "prepare", ph = Math.sin(e.t * (ch ? 8 : 3));
    ctx.fillStyle = "#e8e0d0"; ctx.fillRect(x + 1, y + 2, 10, 5);
    ctx.fillStyle = "#c8bca8"; ctx.fillRect(x + 1, y + 6, 10, 1);
    ctx.fillStyle = "#5a4a3a"; ctx.fillRect(x + 2 + (ph > 0 ? 1 : 0), y + 7, 2, 4); ctx.fillRect(x + 8 - (ph > 0 ? 1 : 0), y + 7, 2, 4);
    const hy = y + (ch || pr ? 3 : 0);
    ctx.fillStyle = "#e8e0d0"; ctx.fillRect(x + 10, hy, 4, 4);
    ctx.fillStyle = "#7a6a5a"; ctx.fillRect(x + 10, hy - 2, 2, 2); ctx.fillRect(x + 9, hy - 3, 2, 1);   // cornes
    ctx.fillStyle = C.void; ctx.fillRect(x + 12, hy + 1, 1, 1);
    ctx.fillStyle = "#c8bca8"; ctx.fillRect(x + 12, hy + 4, 1, 2);                                      // barbiche
    if (pr && Math.floor(e.k / 4) % 2) { ctx.fillStyle = C.danger; ctx.fillRect(x + 6, y - 6, 2, 4); ctx.fillRect(x + 6, y - 1, 2, 1); }
  }
  function drawBonhomme(e) {
    const x = e.x, y = Math.round(e.y);
    if (e.stun > 0) {
      // en morceaux… il se reconstruit petit à petit
      const k = 1 - e.stun / 260;
      ctx.fillStyle = "#f4f8fc"; ctx.beginPath(); ctx.arc(x + 6, y + 11, 4, 0, Math.PI * 2); ctx.fill();
      if (k > 0.4) { ctx.beginPath(); ctx.arc(x + 6, y + 6 + (1 - k) * 6, 3, 0, Math.PI * 2); ctx.fill(); }
      if (k > 0.8) { ctx.fillStyle = "#e8622a"; ctx.fillRect(x + 7, y + 4, 3, 1); }
      return;
    }
    const w = Math.sin(e.t * 3) * 0.5;
    ctx.fillStyle = "#f4f8fc"; ctx.beginPath(); ctx.arc(x + 6, y + 10, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 6 + w, y + 3, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#dfe9f2"; ctx.fillRect(x + 2, y + 12, 8, 2);
    ctx.fillStyle = C.void; ctx.fillRect(x + 7 + w, y + 2, 1, 1); ctx.fillRect(x + 6, y + 8, 1, 1); ctx.fillRect(x + 6, y + 11, 1, 1);
    ctx.fillStyle = "#e8622a"; ctx.fillRect(x + 8 + w, y + 3, 3, 1);
    ctx.fillStyle = "#c0392b"; ctx.fillRect(x + 3, y + 6, 7, 1);
    ctx.strokeStyle = "#6e5030"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 10, y + 8); ctx.lineTo(x + 13, y + 5 + w); ctx.stroke();
  }
  function drawYetiPetit(e) {
    const x = e.x, y = Math.round(e.y), f = e.face, l = e.lance;
    ctx.fillStyle = "#e8eef4"; ctx.fillRect(x + 2, y + 3, 10, 9);
    ctx.fillRect(x + 3, y, 8, 4);
    ctx.fillStyle = "#9fc4dd"; ctx.fillRect(x + 4, y + 2, 6, 4);
    ctx.fillStyle = C.void; ctx.fillRect(x + (f > 0 ? 7 : 5), y + 3, 1, 1); ctx.fillRect(x + (f > 0 ? 9 : 4), y + 3, 1, 1);
    ctx.fillStyle = "#c8d6e2"; ctx.fillRect(x + 3, y + 12, 3, 2); ctx.fillRect(x + 8, y + 12, 3, 2);
    // bras levé avec une boule de neige quand il va lancer
    ctx.fillStyle = "#e8eef4";
    if (l) { ctx.fillRect(x + (f > 0 ? 11 : 0), y - 3, 3, 6); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x + (f > 0 ? 13 : 1), y - 4, 3, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.fillRect(x, y + 5, 2, 5); ctx.fillRect(x + 12, y + 5, 2, 5); }
  }
  function drawAigle(e) {
    const x = e.x, y = Math.round(e.y), pq = e.etat === "pique", flap = Math.sin(e.t * (pq ? 0 : 0.25)) > 0;
    ctx.fillStyle = "#5a3a1a";
    ctx.beginPath();
    if (pq) { ctx.moveTo(x + 6, y); ctx.lineTo(x - 1, y - 6); ctx.lineTo(x + 4, y + 3); ctx.moveTo(x + 6, y); ctx.lineTo(x + 13, y - 6); ctx.lineTo(x + 8, y + 3); }
    else if (flap) { ctx.moveTo(x + 4, y + 2); ctx.lineTo(x - 6, y - 4); ctx.lineTo(x + 3, y + 5); ctx.moveTo(x + 8, y + 2); ctx.lineTo(x + 18, y - 4); ctx.lineTo(x + 9, y + 5); }
    else { ctx.moveTo(x + 4, y + 2); ctx.lineTo(x - 6, y + 6); ctx.lineTo(x + 3, y + 5); ctx.moveTo(x + 8, y + 2); ctx.lineTo(x + 18, y + 6); ctx.lineTo(x + 9, y + 5); }
    ctx.fill();
    ctx.fillStyle = "#7a5228"; ctx.fillRect(x + 3, y + 1, 6, 5);
    ctx.fillStyle = "#f4f8fc"; ctx.fillRect(x + 7, y - 1, 4, 3);
    ctx.fillStyle = "#ffd34a"; ctx.fillRect(x + 10, y, 2, 2);
    ctx.fillStyle = C.void; ctx.fillRect(x + 8, y, 1, 1);
  }
  function drawAbysse(e) {
    const x = Math.round(e.x), y = Math.round(e.y);
    if (e.kind === "h") {
      const r = 5 + e.gonfle * 9, cx = x + 5, cy = y + 5;
      ctx.fillStyle = e.stun ? "#c9b98a" : "#e8c35a"; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f5e3a6"; ctx.beginPath(); ctx.arc(cx, cy + r * 0.35, r * 0.6, 0, Math.PI); ctx.fill();
      if (e.gonfle > 0.3) { ctx.strokeStyle = "#8a6a2a"; ctx.lineWidth = 1; for (let i = 0; i < 12; i++) { const a = i * 0.52 + 0.2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.lineTo(cx + Math.cos(a) * (r + 3), cy + Math.sin(a) * (r + 3)); ctx.stroke(); } }
      const f = R.player.x > e.x ? 1 : -1;
      ctx.fillStyle = "#fff"; ctx.fillRect(cx + f * r * 0.4 - 1, cy - r * 0.4 - 1, 3, 3); ctx.fillStyle = "#1a1a1a"; ctx.fillRect(cx + f * r * 0.4 + (f > 0 ? 0 : 0), cy - r * 0.4, 1, 1);
      ctx.fillStyle = "#d9a83e"; ctx.fillRect(cx - f * (r + 2), cy - 2, 3, 4);
      return;
    }
    if (e.kind === "Z") {
      ctx.save(); ctx.translate(x + 14, y + 9); if (e.face < 0) ctx.scale(-1, 1);
      const q = Math.sin(e.t * 0.25) * 2;
      ctx.fillStyle = e.etat === "dort" ? "#5c6f80" : "#6f8597";
      ctx.beginPath(); ctx.ellipse(0, 0, 14, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-19, -6 + q); ctx.lineTo(-17, 0); ctx.lineTo(-19, 6 + q); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-2, -5); ctx.lineTo(3, -12); ctx.lineTo(5, -5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#dfe7ec"; ctx.beginPath(); ctx.ellipse(1, 2.5, 11, 3, 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = "#111"; ctx.fillRect(8, -2, 2, 2);
      if (e.etat !== "dort") { ctx.fillStyle = "#fff"; for (let i = 0; i < 4; i++) ctx.fillRect(5 + i * 2, 3, 1, 2); }
      else { ctx.fillStyle = "rgba(230,240,255,0.8)"; ctx.font = `7px ${FONT_PIX}`; ctx.fillText("z", 6, -9 - (R.t / 20 % 4)); }
      ctx.restore();
      return;
    }
    if (e.kind === "M") {
      const cx = x + 6, cy = y + 6, clig = Math.floor(R.t / 12) % 2;
      ctx.strokeStyle = "#3a3f44"; ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) { const a = i * 0.785; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8); ctx.stroke(); }
      ctx.fillStyle = "#4b5157"; ctx.beginPath(); ctx.arc(cx, cy, 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#6c747b"; ctx.fillRect(cx - 3, cy - 4, 2, 2);
      ctx.fillStyle = clig ? "#ff4a3a" : "#7a1a12"; ctx.fillRect(cx - 1, cy - 1, 2, 2);
      if (!e.vx && !e.lien) { ctx.strokeStyle = "rgba(60,70,60,0.6)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, cy + 6); ctx.lineTo(cx + Math.sin(R.t / 30) * 2, cy + 22); ctx.stroke(); }
      return;
    }
    if (e.kind === "X") {
      const o = e.ouv;
      ctx.fillStyle = "#6b4423"; ctx.fillRect(x, y + 5, 14, 7);
      ctx.fillStyle = "#c9a227"; ctx.fillRect(x, y + 8, 14, 1); ctx.fillRect(x + 6, y + 7, 2, 3);
      ctx.save(); ctx.translate(x, y + 5); ctx.rotate(-o * 0.7);
      ctx.fillStyle = "#7d5230"; ctx.fillRect(0, -4, 14, 4); ctx.fillStyle = "#c9a227"; ctx.fillRect(0, -1, 14, 1);
      if (o > 0.2) { ctx.fillStyle = "#f4f0e0"; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(1 + i * 3, 0); ctx.lineTo(2.5 + i * 3, 3); ctx.lineTo(4 + i * 3, 0); ctx.fill(); } }
      ctx.restore();
      if (o > 0.2) { ctx.fillStyle = "#f4f0e0"; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(1 + x + i * 3, y + 5); ctx.lineTo(2.5 + x + i * 3, y + 2); ctx.lineTo(4 + x + i * 3, y + 5); ctx.fill(); } ctx.fillStyle = "#e33"; ctx.fillRect(x + 3, y + 3, 2, 1); ctx.fillRect(x + 9, y + 3, 2, 1); }
      else if (Math.floor(R.t / 40) % 6 === 0) { ctx.fillStyle = "rgba(255,240,180,0.9)"; ctx.fillRect(x + 10, y + 4, 1, 1); }
      return;
    }
  }
  function drawAbyssesDessus() {
    for (const g of R.sas) if (!g.ferme) {
      ctx.fillStyle = "#59636b"; ctx.fillRect(g.x * T + 1, g.y * T - 4, 14, 4); ctx.fillRect(g.x * T + 1, (g.y + g.h) * T, 14, 4);
      if (g.alerte && Math.floor(R.t / 5) % 2) { ctx.fillStyle = "rgba(255,90,60,0.35)"; ctx.fillRect(g.x * T + 2, g.y * T, 12, g.h * T); }
    }
    // algues : par-dessus Max et les ennemis (on s'y cache)
    const x0 = Math.max(0, Math.floor(cam.x / T) - 1), x1 = Math.min(COLS - 1, Math.ceil((cam.x + view.w) / T) + 1);
    const y0 = Math.max(0, Math.floor(cam.y / T) - 1), y1 = Math.min(ROWS - 1, Math.ceil((cam.y + view.h) / T) + 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (R.tiles[y][x] !== "Q") continue;
      for (let i = 0; i < 3; i++) {
        const bx = x * T + 3 + i * 5, sw = Math.sin(R.t / 25 + x * 0.7 + i) * 3;
        ctx.strokeStyle = i === 1 ? "rgba(46,140,86,0.92)" : "rgba(30,110,70,0.9)"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(bx, y * T + T); ctx.quadraticCurveTo(bx + sw, y * T + 8, bx - sw * 0.5, y * T - 1); ctx.stroke();
      }
    }
    for (const w of R.tourbillons) {
      ctx.strokeStyle = "rgba(200,240,255,0.35)"; ctx.lineWidth = 1.5;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); for (let a = 0; a < 9; a += 0.2) { const r = w.r * (a / 9), aa = a + R.t * 0.06 + k * 2.1; const px = w.x + Math.cos(aa) * r, py = w.y + Math.sin(aa) * r; if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.stroke(); }
    }
    for (const q of R.torpilles) {
      ctx.fillStyle = "#5a636b"; ctx.fillRect(q.x, q.y + 2, 6, 10); ctx.fillStyle = "#c0392b"; ctx.beginPath(); ctx.arc(q.x + 3, q.y + 3, 3, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "#3a4046"; ctx.fillRect(q.x - 1, q.y + 10, 8, 2);
    }
    if (R.lanterne) {
      const L = R.lanterne, f = L.pts[Math.min(L.i + 1, L.pts.length - 1)][0] >= L.x ? 1 : -1;
      ctx.save(); ctx.translate(L.x, L.y + Math.sin(R.t / 18) * 2); ctx.scale(f, 1);
      ctx.fillStyle = "#3d2c4a"; ctx.beginPath(); ctx.ellipse(0, 0, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-12, -4); ctx.lineTo(-12, 4); ctx.fill();
      ctx.strokeStyle = "#3d2c4a"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(3, -4); ctx.quadraticCurveTo(8, -12, 11, -7); ctx.stroke();
      ctx.fillStyle = "#fff6b0"; ctx.beginPath(); ctx.arc(11, -7, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f4f0e0"; ctx.fillRect(5, 1, 3, 1); ctx.fillStyle = "#fff"; ctx.fillRect(3, -2, 2, 2);
      ctx.restore();
    }
  }
  function drawMeduse(e) {
    const x = e.x, y = Math.round(e.y), pul = Math.sin(e.t * 0.12);
    if (e.zap && !e.stun) {
      ctx.strokeStyle = "rgba(190,240,255,0.85)"; ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) { const a = i * 1.05 + e.t * 0.3; ctx.beginPath(); ctx.moveTo(x + 5, y + 5); ctx.lineTo(x + 5 + Math.cos(a) * 12, y + 5 + Math.sin(a) * 12); ctx.lineTo(x + 5 + Math.cos(a + 0.4) * 22, y + 5 + Math.sin(a + 0.4) * 22); ctx.stroke(); }
      ctx.fillStyle = "rgba(160,230,255,0.15)"; ctx.beginPath(); ctx.arc(x + 5, y + 5, 26, 0, Math.PI * 2); ctx.fill();
    }
    const glow = e.charge && Math.floor(e.t / 3) % 2;
    ctx.fillStyle = e.stun ? "rgba(200,170,220,0.6)" : glow ? "rgba(220,250,255,0.95)" : "rgba(242,140,200,0.8)";
    ctx.beginPath(); ctx.ellipse(x + 5, y + 4, 6 + pul * 0.6, 4.5 - pul * 0.5, 0, Math.PI, 0); ctx.fill();
    ctx.fillRect(x - 1, y + 4, 12, 2);
    ctx.strokeStyle = "rgba(242,160,210,0.7)"; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) { const tx = x + 1 + i * 3; ctx.beginPath(); ctx.moveTo(tx, y + 6); ctx.quadraticCurveTo(tx + Math.sin(e.t * 0.1 + i) * 2, y + 10, tx + Math.sin(e.t * 0.1 + i + 1) * 2, y + 14); ctx.stroke(); }
    ctx.fillStyle = "#fff"; ctx.fillRect(x + 3, y + 1, 2, 1);
  }
  function drawCrabe(e) {
    const x = e.x, y = Math.round(e.y), leg = Math.sin(e.t * 5) > 0 ? 1 : 0;
    ctx.fillStyle = "#c4473a"; ctx.fillRect(x + 2, y + 2, 9, 4);
    ctx.fillStyle = "#e8624a"; ctx.fillRect(x + 3, y + 1, 7, 2);
    ctx.fillStyle = "#8c2a1a"; for (let i = 0; i < 3; i++) { ctx.fillRect(x + 2 + i * 3, y + 6, 1, 2 - leg * (i % 2)); ctx.fillRect(x + 3 + i * 3, y + 6, 1, 1 + leg * (i % 2)); }
    ctx.fillStyle = "#e8624a"; ctx.fillRect(x + 10, y, 3, 3); ctx.fillRect(x - 1, y, 3, 3);   // pinces
    ctx.fillStyle = "#fff"; ctx.fillRect(x + 5, y - 1, 1, 2); ctx.fillRect(x + 8, y - 1, 1, 2);
    ctx.fillStyle = C.void; ctx.fillRect(x + 5, y - 1, 1, 1); ctx.fillRect(x + 8, y - 1, 1, 1);
  }
  function drawAnguille(e) {
    // le trou dans la roche
    const nx = e.nid, y = e.y;
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.beginPath(); ctx.ellipse(nx, y + 3, 3, 5, 0, 0, Math.PI * 2); ctx.fill();
    if (e.out < 0.05) { if (e.etat === "guette" && Math.floor(R.t / 4) % 2) { ctx.fillStyle = "#fff36b"; ctx.fillRect(nx + e.dir * 2 - 1, y + 1, 2, 2); } return; }
    const len = e.w;
    ctx.strokeStyle = "#5a7a3a"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(nx, y + 3);
    for (let i = 1; i <= 8; i++) { const k = i / 8; ctx.lineTo(nx + e.dir * len * k, y + 3 + Math.sin(R.t * 0.3 + k * 6) * 2 * k); }
    ctx.stroke(); ctx.lineCap = "butt";
    const hx = nx + e.dir * len, hy = y + 3 + Math.sin(R.t * 0.3 + 6) * 2;
    ctx.fillStyle = "#7a9a4a"; ctx.beginPath(); ctx.ellipse(hx, hy, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff36b"; ctx.fillRect(hx + e.dir * 1, hy - 2, 2, 2);
    ctx.fillStyle = "#f2e0c0"; ctx.fillRect(hx + e.dir * 3, hy + 1, 2, 1);
  }

  // Jeune jaguar : tacheté, se ramasse avant de bondir (yeux qui brillent)
  function drawJaguar(e) {
    const x = e.x, y = Math.round(e.y), cr = e.etat === "ramasse", air = e.etat === "bond";
    const low = cr ? 2 : 0, wag = Math.sin(e.t * 4);
    ctx.fillStyle = "#d99a3a";
    ctx.fillRect(x + 1, y + 3 + low, 10, 5 - (air ? 1 : 0));
    ctx.fillRect(x + 9, y + 1 + low, 5, 5);                       // tête
    ctx.fillRect(x + 9, y, 1, 2); ctx.fillRect(x + 12, y, 1, 2);  // oreilles
    ctx.strokeStyle = "#d99a3a"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x + 1, y + 4 + low); ctx.quadraticCurveTo(x - 3, y + 2 + wag * 2, x - 3, y - 1 + wag); ctx.stroke();
    const leg = air ? 0 : Math.sin(e.t * 5) * (e.vx ? 1 : 0);
    ctx.fillStyle = "#b07a2a";
    if (air) { ctx.fillRect(x, y + 6, 3, 2); ctx.fillRect(x + 11, y + 5, 3, 2); }
    else { ctx.fillRect(x + 2, y + 8, 2, 2 - low / 2 + leg); ctx.fillRect(x + 8, y + 8, 2, 2 - low / 2 - leg); }
    ctx.fillStyle = "#5a3a14";
    ctx.fillRect(x + 3, y + 4 + low, 1, 1); ctx.fillRect(x + 6, y + 5 + low, 1, 1); ctx.fillRect(x + 8, y + 4 + low, 1, 1); ctx.fillRect(x + 4, y + 6 + low, 1, 1);
    ctx.fillStyle = cr ? "#fff36b" : C.void; ctx.fillRect(x + 12, y + 2 + low, 1, 1);
    ctx.fillStyle = "#f2e0c0"; ctx.fillRect(x + 12, y + 4 + low, 2, 1);
    if (cr && Math.floor(e.k / 4) % 2) { ctx.fillStyle = C.danger; ctx.fillRect(x + 6, y - 6, 2, 4); ctx.fillRect(x + 6, y - 1, 2, 1); }
  }

  // Chauve-souris : ailes qui battent, yeux rouges
  function drawBat(e) {
    const x = e.x, y = Math.round(e.y);
    const flap = Math.sin(e.t * 6) > 0;
    ctx.fillStyle = C.batWing;
    ctx.beginPath();
    if (flap) {
      ctx.moveTo(x + 3, y + 3); ctx.lineTo(x - 4, y - 2); ctx.lineTo(x - 2, y + 4); ctx.lineTo(x + 3, y + 5);
      ctx.moveTo(x + 7, y + 3); ctx.lineTo(x + 14, y - 2); ctx.lineTo(x + 12, y + 4); ctx.lineTo(x + 7, y + 5);
    } else {
      ctx.moveTo(x + 3, y + 3); ctx.lineTo(x - 4, y + 7); ctx.lineTo(x - 1, y + 4); ctx.lineTo(x + 3, y + 5);
      ctx.moveTo(x + 7, y + 3); ctx.lineTo(x + 14, y + 7); ctx.lineTo(x + 11, y + 4); ctx.lineTo(x + 7, y + 5);
    }
    ctx.fill();
    ctx.fillStyle = C.bat; ctx.fillRect(x + 2, y + 1, 6, 6);
    ctx.fillRect(x + 2, y, 1, 1); ctx.fillRect(x + 7, y, 1, 1);
    ctx.fillStyle = C.batEye; ctx.fillRect(x + 3, y + 2, 1, 1); ctx.fillRect(x + 6, y + 2, 1, 1);
    ctx.fillStyle = C.text; ctx.fillRect(x + 4, y + 5, 1, 1); ctx.fillRect(x + 6, y + 5, 1, 1);
  }

  // flèche en bois (pointe grise, plumes vertes) : se casse ; flèche empoisonnée (pointe rouge, traînée violette) : mortelle
  function drawArrow(a) {
    const left = a.vx < 0;
    if (a.poison) {
      ctx.fillStyle = "rgba(176,74,216,0.35)"; ctx.fillRect(left ? a.x + 8 : a.x - 8, a.y, 9, 3);
      ctx.fillStyle = "#3a2a3e"; ctx.fillRect(a.x + 1, a.y + 1, 7, 1);
      ctx.fillStyle = C.danger; ctx.fillRect(left ? a.x - 2 : a.x + 7, a.y - 0.5, 3, 4);
      ctx.fillStyle = C.poison; ctx.fillRect(left ? a.x + 7 : a.x, a.y, 2, 1); ctx.fillRect(left ? a.x + 7 : a.x, a.y + 2, 2, 1);
    } else {
      ctx.fillStyle = C.wood; ctx.fillRect(a.x + 1, a.y + 1, 7, 1);
      ctx.fillStyle = "#b8bcc2"; ctx.fillRect(left ? a.x - 1 : a.x + 7, a.y, 2, 3);
      ctx.fillStyle = "#5fae3e"; ctx.fillRect(left ? a.x + 7 : a.x, a.y, 2, 1); ctx.fillRect(left ? a.x + 7 : a.x, a.y + 2, 2, 1);
    }
  }
  function breakArrow(a) {
    a.dead = true; sfx.bonk();
    for (let i = 0; i < 5; i++) R.particles.push({ x: a.x + 4, y: a.y + 1, vx: (Math.random() - 0.5) * 2.5, vy: -Math.random() * 2, s: 2, life: 26, color: i % 2 ? C.wood : "#5fae3e", g: 0.15 });
  }

  function drawBlock(k) {
    if (!k.falling) return;
    if (k.spike) {
      ctx.fillStyle = C.danger; ctx.beginPath();
      for (let i = 0; i < 3; i++) { const bx = k.x + 1 + i * 5; ctx.moveTo(bx, k.y); ctx.lineTo(bx + 2.5, k.y + 11); ctx.lineTo(bx + 5, k.y); }
      ctx.fill();
      return;
    }
    ctx.fillStyle = P.stone; ctx.fillRect(k.x, k.y, k.w, k.h);
    ctx.fillStyle = P.stoneTop; ctx.fillRect(k.x, k.y, k.w, 2);
  }

  function drawDynamite(d) {
    const blink = d.fuse < 40 && Math.floor(d.fuse / 4) % 2 === 0;
    ctx.fillStyle = blink ? C.text : C.danger; ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.fillStyle = C.hat; ctx.fillRect(d.x + 2, d.y - 4, 1, 4);
  }

  function drawBoulder(b) {
    if (b.neige) {
      const r = b.w / 2, cx = b.x + r, cy = b.y + r;
      ctx.fillStyle = "#f4f8fc"; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#c8d6e2"; ctx.beginPath(); ctx.arc(cx + r * 0.25, cy + r * 0.25, r * 0.7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f4f8fc"; ctx.beginPath(); ctx.arc(cx - r * 0.1, cy - r * 0.1, r * 0.72, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#9fb4c6";
      for (let i = 0; i < 4; i++) { const a = b.rot + i * 1.6; ctx.fillRect(cx + Math.cos(a) * r * 0.6 - 1, cy + Math.sin(a) * r * 0.6 - 1, 3, 2); }
      return;
    }
    const cx = b.x + 14, cy = b.y + 14;
    ctx.fillStyle = P.stoneTop;
    ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = P.stone;
    ctx.beginPath(); ctx.arc(cx + 3, cy + 3, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = P.stoneDark; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const a = b.rot + (i * Math.PI * 2) / 3;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 4, cy + Math.sin(a) * 4); ctx.lineTo(cx + Math.cos(a) * 11, cy + Math.sin(a) * 11); ctx.stroke();
    }
  }

  function drawFedora(x, y) {
    const or = progress.chapeauOr;
    ctx.fillStyle = or ? "#e2b23c" : C.fedora;
    ctx.fillRect(x - 3, y + 3, 16, 2);
    ctx.fillRect(x, y - 1, 10, 4);
    ctx.fillStyle = C.fedoraTop; ctx.fillRect(x + 1, y - 2, 8, 1);
    ctx.fillStyle = C.void; ctx.fillRect(x + 4, y - 2, 2, 1);
    ctx.fillStyle = C.fedoraBand; ctx.fillRect(x, y + 2, 10, 1);
  }

  function drawPlayer() {
    const p = R.player;
    if (!p.alive) {
      const h = R.hat;
      if (h) {
        h.vy += 0.25; h.x += h.vx; h.y += h.vy; h.r += 0.2;
        ctx.save(); ctx.translate(h.x + 5, h.y); ctx.rotate(h.r); drawFedora(-5, -2); ctx.restore();
      }
      return;
    }
    if (p.invuln > 0 && Math.floor(p.invuln / 4) % 2) return;
    if (p.shield > 0) {
      const g = 0.5 + 0.5 * Math.sin(R.t / 8);
      ctx.fillStyle = `rgba(63,208,138,${0.12 + g * 0.12})`; ctx.beginPath(); ctx.arc(p.x + p.w / 2, p.y + 6, 13, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(63,208,138,${0.5 + g * 0.3})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x + p.w / 2, p.y + 6, 12, 0, Math.PI * 2); ctx.stroke();
    }
    const run = p.grounded && Math.abs(p.vx) > 0.3;
    const air = !p.grounded, ph = Math.sin(p.anim), bob = run ? Math.abs(ph) : 0;
    const x = Math.round(p.x), y = Math.round(p.y - bob);
    // sous l'eau, Max nage à l'horizontale : tête devant, il bat des jambes, la tête plonge quand il coule
    const nageH = p.swim && !p.grounded;
    ctx.save();
    if (nageH) {
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2 + 2 + Math.sin(R.t / 14) * 0.6);
      if (p.face < 0) ctx.scale(-1, 1);
      ctx.rotate(Math.PI / 2 + Math.max(-0.45, Math.min(0.45, p.vy * 0.2)));
      ctx.translate(-5, -6);
    } else if (p.face < 0) { ctx.translate(x + p.w, y); ctx.scale(-1, 1); } else ctx.translate(x, y);
    const kick = nageH ? Math.sin(p.anim * 2.2) * 1.6 : 0;
    const legA = nageH ? kick : run ? ph * 2 : air ? -1 : 0, legB = nageH ? -kick : run ? -ph * 2 : air ? 1 : 0;
    ctx.fillStyle = C.pants; ctx.fillRect(2 + legA, 10, 3, 3); ctx.fillRect(5 + legB, 10, 3, 3);
    ctx.fillStyle = C.boots; ctx.fillRect(2 + legA, 13, 3, 2); ctx.fillRect(5 + legB, 13, 4, 2);
    ctx.fillStyle = C.shirt; ctx.fillRect(2, 5, 6, 5);
    ctx.fillStyle = C.jacket; ctx.fillRect(1, 5, 3, 6); ctx.fillRect(7, 5, 2, 6);
    ctx.fillStyle = C.jacketHi; ctx.fillRect(1, 5, 1, 6);
    ctx.fillStyle = C.fedoraBand; ctx.fillRect(2, 9, 6, 1);
    ctx.fillStyle = C.satchel; ctx.fillRect(4, 5, 1, 1); ctx.fillRect(5, 6, 1, 1); ctx.fillRect(6, 7, 1, 1); ctx.fillRect(0, 8, 3, 3);
    ctx.strokeStyle = C.whip; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(8.5, 10.5, 1.6, 0, Math.PI * 2); ctx.stroke();
    const arm = run ? -ph * 1.5 : 0;
    if (nageH && p.stroke > 0) {
      // brasse : le bras part devant la tête puis revient le long du corps
      const k = p.stroke / 10, ay = Math.round(-3 + (1 - k) * 8);
      ctx.fillStyle = C.jacket; ctx.fillRect(7, ay, 2, 4);
      ctx.fillStyle = C.skin; ctx.fillRect(7, ay - 1, 2, 1);
    } else if (nageH) {
      ctx.fillStyle = C.jacket; ctx.fillRect(7, 6, 2, 4);
      ctx.fillStyle = C.skin; ctx.fillRect(7, 10, 2, 1);
    } else {
    ctx.fillStyle = C.jacket; ctx.fillRect(7 + (arm > 0 ? 1 : 0), 6, 2, 3);
    ctx.fillStyle = C.skin; ctx.fillRect(8 + (arm > 0 ? 1 : 0), 9 + Math.round(arm * 0.5), 2, 1);
    }
    if (p.club > 0) {
      // massue : grand arc de haut en bas devant le héros
      const k = 1 - p.club / 18, ang = -2.2 + k * 3.0;
      ctx.save(); ctx.translate(9, 8); ctx.rotate(ang);
      ctx.fillStyle = C.club; ctx.fillRect(0, -1, 9, 2);
      ctx.fillStyle = C.clubDark; ctx.beginPath(); ctx.ellipse(10, 0, 3.4, 2.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.club; ctx.fillRect(9, -1.5, 2, 1);
      ctx.restore();
      if (p.club >= 6 && p.club <= 13) { ctx.strokeStyle = "rgba(255,240,200,.5)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(9, 8, 12, -1.6, 0.6); ctx.stroke(); }
    }
    ctx.fillStyle = C.skin; ctx.fillRect(3, 1, 6, 4);
    ctx.fillStyle = C.void; ctx.fillRect(7, 2, 1, 1);
    ctx.fillStyle = C.skinDark; ctx.fillRect(4, 4, 5, 1);
    drawFedora(0, -3);
    ctx.restore();
  }

  function drawParticles() {
    for (const q of R.particles) {
      if (q.ring) {
        ctx.strokeStyle = `rgba(239,232,216,${q.life / 14})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.stroke();
        continue;
      }
      ctx.globalAlpha = Math.min(1, q.life / 20);
      if (q.flocon) { ctx.fillStyle = q.color; ctx.fillRect(q.x, q.y, q.s, q.s); continue; }
      if (q.bulle) { ctx.strokeStyle = q.color; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(q.x, q.y, q.s / 2 + 0.5, 0, Math.PI * 2); ctx.stroke(); continue; }
      if (q.zzz) { ctx.fillStyle = q.color; ctx.font = `8px ${FONT_PIX}`; ctx.textAlign = "center"; ctx.fillText("z", q.x, q.y); continue; }
      ctx.fillStyle = q.color; ctx.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s);
    }
    ctx.globalAlpha = 1;
  }

  const FONT_PIX = '"Silkscreen", "Courier New", monospace';
  const FONT_TXT = '"JetBrains Mono", ui-monospace, "Courier New", monospace';

  function drawHud() {
    ctx.fillStyle = "rgba(6,10,8,0.72)"; ctx.fillRect(0, 0, view.w, 15);
    const ty = TYPES[R.def.type];
    ctx.textBaseline = "middle"; ctx.font = `8px ${FONT_PIX}`;
    ctx.fillStyle = ty.color; ctx.fillRect(6, 4, 7, 7);
    ctx.fillStyle = C.text; ctx.textAlign = "left";
    const nm = window.MondesUI ? MondesUI.NIV : 20, etiq = `${Math.floor(R.index / nm) + 1}-${(R.index % nm) + 1}  ${R.def.name.toUpperCase()}`;
    ctx.fillText(etiq, 18, 8);
    if (R.def.defi) {
      const nw = ctx.measureText(etiq).width;
      ctx.fillStyle = C.danger; ctx.fillRect(24 + nw, 3, 30, 10);
      ctx.fillStyle = C.text; ctx.fillText("DÉFI", 27 + nw, 8);
    }
    let x = view.w - 192 - 52 / scale;
    const fl = game.flash && game.flash.t > 0 ? game.flash : null;
    if (fl) fl.t--;
    ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(x + 3, 7.5, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#b8862a"; ctx.fillRect(x + 2.5, 5.5, 1, 4);
    ctx.fillStyle = C.text; ctx.fillText(String(progress.pieces || 0), x + 9, 8);
    x += 38;
    ctx.fillStyle = C.jade; ctx.beginPath(); ctx.moveTo(x + 3, 3); ctx.lineTo(x + 7, 7.5); ctx.lineTo(x + 3, 12); ctx.lineTo(x - 1, 7.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.text; ctx.fillText(String(progress.amulettes || 0) + (R.player && R.player.shield ? ` ✦${R.player.shield}` : ""), x + 10, 8);
    x += 42;
    ctx.fillStyle = fl && fl.what === "tnt" && fl.t % 8 < 4 ? C.text : C.danger; ctx.fillRect(x, 4, 4, 8);
    ctx.fillStyle = C.text; ctx.fillText(String(game.ammo.tnt), x + 9, 8);
    x += 34;
    ctx.beginPath(); ctx.arc(x + 3, 7, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(x + 1, 9, 5, 3);
    ctx.fillStyle = C.void; ctx.fillRect(x + 1, 6, 2, 2); ctx.fillRect(x + 4, 6, 2, 2);
    ctx.fillStyle = C.text; ctx.fillText(String(game.deathsByRoom[R.index]), x + 11, 8);
  }

  function drawTimerHud() {
    if (!R.timer) return;
    const s = Math.ceil(R.timer / 60), urgent = s <= 5;
    ctx.font = `12px ${FONT_PIX}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const txt = `${s}`;
    ctx.fillStyle = "rgba(6,10,8,0.8)"; ctx.fillRect(view.w / 2 - 22, 18, 44, 18);
    ctx.fillStyle = urgent && Math.floor(R.t / 8) % 2 ? C.text : C.danger;
    ctx.fillText(txt, view.w / 2, 28);
  }

  function drawInvert() {
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(R.t / 5);
    ctx.font = `8px ${FONT_PIX}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const txt = "COMMANDES INVERSÉES", w = ctx.measureText(txt).width + 14;
    ctx.fillStyle = "rgba(180,154,230,0.9)"; ctx.fillRect((view.w - w) / 2, view.h - 64, w, 14);
    ctx.fillStyle = C.void; ctx.fillText(txt, view.w / 2, view.h - 57);
    ctx.globalAlpha = 1;
  }

  function wrapText(text, maxW) {
    const words = text.split(" "), lines = [];
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  function drawSpeech() {
    if (R.say) {
      const s = R.say, shown = Math.min(s.text.length, Math.floor(s.t * 1.2)), a = Math.min(1, (s.dur - s.t) / 20);
      ctx.globalAlpha = a;
      ctx.font = `8px ${FONT_TXT}`;
      const bw = Math.min(330, view.w - 24), lines = wrapText(s.text, bw - 20), bh = 16 + lines.length * 11;
      const bx = (view.w - bw) / 2, by = 20;
      R.sayBottom = by + bh;
      ctx.fillStyle = "rgba(6,10,8,0.86)"; ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = C.god; ctx.fillRect(bx, by, 2, bh);
      ctx.font = `6px ${FONT_PIX}`; ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText("PROFESSEUR ARCHIBALD", bx + 10, by + 4);
      ctx.font = `8px ${FONT_TXT}`; ctx.fillStyle = C.text;
      let left = shown;
      lines.forEach((ln, i) => { ctx.fillText(ln.slice(0, Math.max(0, left)), bx + 10, by + 13 + i * 11); left -= ln.length + 1; });
      ctx.globalAlpha = 1;
    }
    if (R.hint && game.mode === "play") {
      const h = R.hint, a = Math.min(1, h.t / 10, (h.dur - h.t) / 20);
      ctx.globalAlpha = a;
      ctx.font = `8px ${FONT_TXT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const w = ctx.measureText(h.text).width + 16, hy = R.say ? (R.sayBottom || 50) + 6 : 22;
      ctx.fillStyle = "rgba(6,10,8,0.78)"; ctx.fillRect((view.w - w) / 2, hy, w, 14);
      ctx.fillStyle = C.hint; ctx.fillText(h.text, view.w / 2, hy + 7);
      ctx.globalAlpha = 1;
    }
  }

  function drawCard() {
    const t = game.cardT, a = t < 64 ? 1 : 1 - (t - 64) / 16;
    const VW2 = view.w / 2, VH2 = view.h / 2;
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, view.w, view.h);
    const ty = TYPES[R.def.type], act = ACTS[R.def.act] || { nom: "" };
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `8px ${FONT_PIX}`; ctx.fillStyle = C.dim;
    const MO = window.MondesUI, nm = MO ? MO.NIV : 20, k = Math.floor(R.index / nm);
    const nomMonde = MO && MO.MONDES[k] ? MO.MONDES[k].nom.toUpperCase() : act.nom.toUpperCase();
    ctx.fillText(`MONDE ${k + 1} · ${nomMonde}  —  NIVEAU ${(R.index % nm) + 1} SUR ${nm}`, VW2, VH2 - 32);
    ctx.font = `16px ${FONT_PIX}`; ctx.fillStyle = C.text;
    ctx.fillText(R.def.name.toUpperCase(), VW2, VH2 - 8);
    ctx.font = `8px ${FONT_PIX}`;
    const lw = ctx.measureText(ty.label.toUpperCase()).width + 16;
    ctx.fillStyle = ty.color; ctx.fillRect(VW2 - lw / 2, VH2 + 14, lw, 14);
    ctx.fillStyle = C.void; ctx.fillText(ty.label.toUpperCase(), VW2, VH2 + 21.5);
    if (R.def.defi) {
      const dw = ctx.measureText("DÉFI").width + 16, bx = VW2 + lw / 2 + 6;
      ctx.fillStyle = C.danger; ctx.fillRect(bx, VH2 + 14, dw, 14);
      ctx.fillStyle = C.text; ctx.fillText("DÉFI", bx + dw / 2, VH2 + 21.5);
    }
    if (R.def.dark) { ctx.fillStyle = C.dim; ctx.font = `8px ${FONT_TXT}`; ctx.fillText("Salle plongée dans le noir", VW2, VH2 + 58); ctx.font = `8px ${FONT_PIX}`; }
    if (R.secrets) {
      const trouves = ((progress.coinsPris || {})[R.index] || []).filter((id) => R.pickups[id] && R.pickups[id].kind === "gem").length;
      ctx.fillStyle = C.jade; ctx.font = `8px ${FONT_TXT}`;
      ctx.fillText(trouves >= R.secrets ? "Trésor secret trouvé ★" : "Un trésor secret se cache ici…", VW2, VH2 + 70);
    }
    if (game.deathsByRoom[R.index] === 0 && progress.best[R.index] != null) {
      ctx.fillStyle = C.dim; ctx.font = `8px ${FONT_TXT}`;
      ctx.fillText(`Ton record : ${progress.best[R.index]} mort${progress.best[R.index] > 1 ? "s" : ""}`, VW2, VH2 + 44);
    }
    ctx.globalAlpha = 1;
  }

  /* ================= Accueil : l'explorateur fuit le rocher ================= */
  const homeDust = [];
  function drawHome() {
    const t = game.homeT;
    const hs = canvas.height / 200;
    ctx.setTransform(hs, 0, 0, hs, 0, 0);
    const Wd = canvas.width / hs;
    const cx = Wd > 300 ? Wd * 0.7 : Wd / 2;
    const vy = 74, fw = 30, fh = 26;
    ctx.translate(0, reducedMotion ? 0 : Math.sin(t * 0.55) * 0.8);

    const far = { l: cx - fw, r: cx + fw, t: vy - fh, b: vy + fh };
    const poly = (pts, fill) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); };
    poly([0, -4, Wd, -4, far.r, far.t, far.l, far.t], "#1d140c");
    poly([0, 204, Wd, 204, far.r, far.b, far.l, far.b], "#3a2a18");
    poly([0, -4, far.l, far.t, far.l, far.b, 0, 204], "#2a1d11");
    poly([Wd, -4, far.r, far.t, far.r, far.b, Wd, 204], "#2a1d11");
    ctx.fillStyle = "#070503"; ctx.fillRect(far.l, far.t, fw * 2, fh * 2);

    const speed = reducedMotion ? 0 : 0.012;
    ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      const d = (((i / 9) - t * speed) % 1 + 1) % 1, e = d * d * d;   // le couloir file vers le fond
      const yb = far.b + (204 - far.b) * e, yt = far.t + (-4 - far.t) * e;
      const xl = far.l + (0 - far.l) * e, xr = far.r + (Wd - far.r) * e;
      ctx.beginPath(); ctx.moveTo(xl, yb); ctx.lineTo(xr, yb); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xl, yt); ctx.lineTo(xl, yb); ctx.moveTo(xr, yt); ctx.lineTo(xr, yb); ctx.stroke();
    }
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    for (let j = 1; j < 6; j++) {
      const f = j / 6;
      ctx.beginPath(); ctx.moveTo(0, -4 + 208 * f); ctx.lineTo(far.l, far.t + fh * 2 * f); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(Wd, -4 + 208 * f); ctx.lineTo(far.r, far.t + fh * 2 * f); ctx.stroke();
    }
    for (let i = 0; i < 4; i++) {
      const d = (((i / 4) - t * speed + 0.12) % 1 + 1) % 1, e = d * d * d;
      const side = i % 2 ? 1 : -1;
      const x = side < 0 ? far.l + (0 - far.l) * e * 0.92 : far.r + (Wd - far.r) * e * 0.92;
      const y = far.t + 14 + (40 - far.t - 14) * e;
      const s = 0.25 + e * 2.2;
      const fl = 1 + Math.sin(t * 0.7 + i * 2) * 0.15 + (reducedMotion ? 0 : Math.random() * 0.1);
      const g = ctx.createRadialGradient(x, y, 0, x, y, 40 * s * fl);
      g.addColorStop(0, "rgba(255,170,70,0.45)"); g.addColorStop(1, "rgba(255,120,40,0)");
      ctx.fillStyle = g; ctx.fillRect(x - 40 * s * fl, y - 40 * s * fl, 80 * s * fl, 80 * s * fl);
      ctx.fillStyle = "#4a3018"; ctx.fillRect(x - 1.2 * s, y, 2.4 * s, 10 * s);
      ctx.fillStyle = "#ffb347"; ctx.beginPath(); ctx.ellipse(x, y - 3 * s, 3 * s * fl, 5 * s * fl, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff1b8"; ctx.beginPath(); ctx.ellipse(x, y - 2 * s, 1.4 * s, 2.6 * s, 0, 0, Math.PI * 2); ctx.fill();
    }

    const bounce = reducedMotion ? 0 : Math.abs(Math.sin(t * 0.11)) * 4;
    const br = 68, bx = cx, by = 104 - bounce;
    drawHomeBoulder(bx, by, br, t);
    if (!reducedMotion && t % 3 === 0) homeDust.push({ x: bx + (Math.random() - 0.5) * br * 1.6, y: 176, vx: (Math.random() - 0.5) * 1.4, vy: -Math.random() * 1.2, life: 40 });
    for (const d of homeDust) { d.x += d.vx; d.y += d.vy; d.vy += 0.02; d.life--; ctx.fillStyle = `rgba(170,140,100,${Math.max(0, d.life / 80)})`; ctx.fillRect(d.x, d.y, 3, 3); }
    while (homeDust.length && homeDust[0].life <= 0) homeDust.shift();

    // ombre de l'explorateur (le personnage lui-même est une illustration SVG posée par-dessus)
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath(); ctx.ellipse(cx, 197, 30, 4.5, 0, 0, Math.PI * 2); ctx.fill();

    const vg = ctx.createRadialGradient(cx, 110, 40, cx, 110, Wd * 0.8);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.7)");
    ctx.fillStyle = vg; ctx.fillRect(0, -4, Wd, 208);
    const lg = ctx.createLinearGradient(0, 0, Wd * 0.55, 0);
    lg.addColorStop(0, "rgba(10,6,3,0.85)"); lg.addColorStop(1, "rgba(10,6,3,0)");
    ctx.fillStyle = lg; ctx.fillRect(0, -4, Wd * 0.55, 208);
  }

  // Rocher : une sphère dont la surface (cratères, bosses) tourne vers le spectateur.
  const ROCK_SPOTS = (() => {
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const pts = [];
    for (let i = 0; i < 46; i++) {
      const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      pts.push({ x: r * Math.cos(a), y: u, z: r * Math.sin(a), s: 0.05 + rnd() * 0.11, k: rnd() });
    }
    return pts;
  })();
  function drawHomeBoulder(bx, by, br, t) {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath(); ctx.ellipse(bx, 176, br * 0.95, 11, 0, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(bx - br * 0.35, by - br * 0.4, br * 0.1, bx, by, br * 1.02);
    g.addColorStop(0, "#c3a57a"); g.addColorStop(0.45, "#8a6f4c"); g.addColorStop(0.85, "#4a3925"); g.addColorStop(1, "#2a1f14");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.clip();
    // rotation autour de l'axe horizontal : la face visible descend, le rocher roule vers nous
    const th = reducedMotion ? 0.6 : t * 0.045, c = Math.cos(th), sn = Math.sin(th);
    const spots = ROCK_SPOTS.map((p) => ({ x: p.x, y: p.y * c + p.z * sn, z: -p.y * sn + p.z * c, s: p.s, k: p.k })).filter((p) => p.z > 0.05).sort((a, b) => a.z - b.z);
    for (const p of spots) {
      const sx = bx + p.x * br, sy = by + p.y * br, r = p.s * br;
      const squash = Math.max(0.2, p.z);
      const light = 0.55 - p.x * 0.25 - p.y * 0.3;
      if (p.k < 0.6) {
        // cratère : creux sombre, bord éclairé en haut à gauche
        ctx.fillStyle = `rgba(35,24,14,${0.35 + 0.35 * p.z})`;
        ctx.beginPath(); ctx.ellipse(sx, sy, r, r * squash, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(230,205,160,${Math.max(0, light) * 0.6 * p.z})`; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(sx, sy + r * squash * 0.15, r, r * squash, 0, Math.PI * 0.95, Math.PI * 1.75); ctx.stroke();
      } else {
        // bosse : tache claire
        ctx.fillStyle = `rgba(214,188,145,${Math.max(0, light) * 0.45 * p.z})`;
        ctx.beginPath(); ctx.ellipse(sx - r * 0.2, sy - r * 0.2 * squash, r * 0.8, r * 0.8 * squash, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    // une grande fissure qui tourne avec la pierre
    const crack = [[-0.5, -0.2, 0.83], [-0.25, -0.05, 0.96], [0.05, 0.1, 0.99], [0.3, 0.02, 0.95], [0.55, 0.15, 0.82]];
    ctx.strokeStyle = "rgba(30,20,12,0.7)"; ctx.lineWidth = 2.4; ctx.beginPath();
    let started = false;
    for (const [x, y, z] of crack) {
      const yy = y * c + z * sn, zz = -y * sn + z * c;
      if (zz <= 0.05) { started = false; continue; }
      const sx = bx + x * br, sy = by + yy * br;
      if (!started) { ctx.moveTo(sx, sy); started = true; } else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    // reflet de torche et ombre propre
    const rim = ctx.createRadialGradient(bx, by + br * 0.55, br * 0.2, bx, by + br * 0.3, br * 1.1);
    rim.addColorStop(0, "rgba(0,0,0,0)"); rim.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = rim; ctx.fillRect(bx - br, by - br, br * 2, br * 2);
    ctx.restore();
    ctx.strokeStyle = "rgba(255,190,110,0.25)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(bx, by, br - 1, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
  }

  // Place l'illustration SVG de l'explorateur au pied du rocher, à l'échelle du décor.
  const heros = document.getElementById("heros");
  function positionHero() {
    if (!heros) return;
    const r = canvas.getBoundingClientRect();
    const unit = r.height / 200, Wd = r.width / unit;
    const cx = (Wd > 300 ? Wd * 0.7 : Wd / 2) * unit;
    const h = 118 * unit, w = h * 240 / 340;
    heros.style.width = w + "px"; heros.style.height = h + "px";
    heros.style.left = (r.left + cx - w / 2) + "px";
    heros.style.top = (r.top + 197 * unit - h * (330 / 340)) + "px";
  }

  // L'explorateur vu de face, en gros pixels (u = taille d'un pixel)
  function drawRunner(cx, feetY, t) {
    const u = 3.5;
    const cyc = reducedMotion ? 0 : t * 0.32;
    const s = Math.sin(cyc), bob = Math.abs(Math.cos(cyc)) * 2.2;
    const ox = cx - 8 * u, oy = feetY - 30 * u - bob * u * 0.5;
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(ox + x * u, oy + y * u, w * u, h * u); };
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath(); ctx.ellipse(cx, feetY, 9 * u, 1.6 * u, 0, 0, Math.PI * 2); ctx.fill();
    const lUp = s > 0, liftL = lUp ? Math.round(s * 3) : 0, liftR = !lUp ? Math.round(-s * 3) : 0;
    px(4, 20, 3, 6 - liftL, C.pants); px(9, 20, 3, 6 - liftR, C.pants);
    px(3.5, 26 - liftL, 4, 2 + (lUp ? 1 : 0), C.boots); px(8.5, 26 - liftR, 4, 2 + (!lUp ? 1 : 0), C.boots);
    px(3, 12, 10, 8, C.jacket);
    px(6, 12, 4, 7, C.shirt);
    px(3, 12, 1, 8, C.jacketHi);
    px(4, 19, 8, 1, C.fedoraBand);
    px(7.5, 19, 1, 1, C.hat);
    for (let i = 0; i < 6; i++) px(4 + i, 12 + i, 1, 1, C.satchel);
    px(10, 17, 3, 3, C.satchel);
    px(2, 18, 1, 2, C.whip); px(1, 19, 1, 1, C.whip);
    const aL = Math.round(-s * 2.5), aR = Math.round(s * 2.5);
    px(1, 12 + aL, 2, 5, C.jacket); px(1, 17 + aL, 2, 2, C.skin);
    px(13, 12 + aR, 2, 5, C.jacket); px(13, 17 + aR, 2, 2, C.skin);
    px(4, 5, 8, 7, C.skin);
    px(4, 11, 8, 1, C.skinDark);
    px(5, 7, 2, 2, "#ffffff"); px(9, 7, 2, 2, "#ffffff");
    px(6, 8, 1, 1, C.void); px(9, 8, 1, 1, C.void);
    px(5, 6, 2, 0.6, C.fedoraBand); px(9, 6, 2, 0.6, C.fedoraBand);
    px(7, 9.5, 2, 1.6 + Math.abs(s) * 0.6, "#3a1a10");
    const hatLift = reducedMotion ? 0 : Math.max(0, Math.sin(cyc * 0.5)) * 1.2;
    px(0, 4 - hatLift, 16, 1.5, C.fedora);
    px(3, 0.5 - hatLift, 10, 3.5, C.fedora);
    px(3, 3 - hatLift, 10, 1, C.fedoraBand);
    px(4, 0 - hatLift, 8, 0.8, C.fedoraTop);
    if (!reducedMotion) {
      const k = (t % 50) / 50;
      ctx.fillStyle = "#bfe6ff";
      ctx.beginPath(); ctx.arc(ox + (2 - k * 4) * u, oy + (6 - k * 3 + k * k * 6) * u, 0.9 * u, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ox + (14 + k * 4) * u, oy + (5 - k * 2 + k * k * 6) * u, 0.8 * u, 0, Math.PI * 2); ctx.fill();
    }
  }

  /* ================= Interface DOM ================= */
  const overlays = {
    titre: document.getElementById("ecran-titre"),
    mondes: document.getElementById("ecran-mondes"),
    options: document.getElementById("ecran-options"),
    avis: document.getElementById("ecran-avis"),
    stats: document.getElementById("ecran-stats"),
    pub: document.getElementById("ecran-pub"),
    relance: document.getElementById("ecran-relance"),
    boutique: document.getElementById("ecran-boutique"),
    achat: document.getElementById("ecran-achat"),
    quitter: document.getElementById("ecran-quitter"),
    pause: document.getElementById("ecran-pause"),
    fin: document.getElementById("ecran-fin"),
    recit: document.getElementById("ecran-recit"),
  };
  function showOverlay(name) {
    for (const k in overlays) overlays[k].hidden = k !== name;
    document.body.classList.toggle("en-jeu", !name);
    if (heros) heros.hidden = name !== "titre";
  }

  function togglePause() {
    if (game.mode === "title" || game.mode === "end" || game.mode === "relance" || game.mode === "recit") return;
    const ua = document.getElementById("btn-utiliser-amulette");
    ua.hidden = !R || !R.player || R.player.shield > 0 || (progress.amulettes || 0) <= 0;
    ua.textContent = `✦ Activer une amulette (${progress.amulettes || 0})`;
    document.getElementById("btn-passer-pause").hidden = !R || R.index >= LEVELS.length - 1;
    game.paused = !game.paused;
    releaseAll();
    showOverlay(game.paused ? "pause" : null);
  }

  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem("temple-muet", muted ? "1" : "0"); } catch (_) {}
    updateMuteLabel();
  }
  function updateMuteLabel() {
    document.querySelectorAll("[data-son]").forEach((b) => { b.textContent = muted ? "Son : coupé" : "Son : activé"; b.setAttribute("aria-pressed", String(!muted)); });
  }

  const QUOTES = [
    "« L'Œil de Jade sera à moi, Max. J'ai piégé tout le temple. »",
    "« Le sol est solide. Enfin, la plupart du temps. »",
    "« Gérard, mon rocher, ne roule que pour toi. »",
    "« Il y a une porte au bout. Elle bouge un peu. »",
    "« Tricher ? Moi ? Je préfère dire : prendre de l'avance. »",
    "« Chaque fois que tu tombes, je fais un pas de plus vers le trésor. »",
  ];
  let quoteI = 0;
  function refreshHome() {
    const u = progress.unlocked;
    const btn = document.getElementById("btn-jouer");
    btn.setAttribute("aria-label", progress.finished ? "Jouer : recommencer depuis le début" : u > 0 ? `Jouer : continuer au niveau ${u + 1}` : "Jouer");
    btn.dataset.level = progress.finished ? 0 : u;
    const nm = window.MondesUI ? MondesUI.NIV : 20, nbM = Math.ceil(LEVELS.length / nm);
    document.getElementById("accueil-stats").textContent = u > 0 || progress.deaths
      ? `Monde ${Math.floor(Math.min(u, LEVELS.length - 1) / nm) + 1} · niveau ${(Math.min(u, LEVELS.length - 1) % nm) + 1} · ${progress.deaths} chute${progress.deaths > 1 ? "s" : ""}`
      : `${nbM} mondes · ${LEVELS.length} niveaux`;
  }
  setInterval(() => {
    if (overlays.titre.hidden || !document.getElementById("accueil-citation")) return;
    quoteI = (quoteI + 1) % QUOTES.length;
    const q = document.getElementById("accueil-citation");
    q.classList.add("fondu");
    setTimeout(() => { q.textContent = QUOTES[quoteI]; q.classList.remove("fondu"); }, 350);
  }, 5000);

  function fmtTime(frames) { const s = Math.floor(frames / 60); return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`; }
  function showEnd() {
    document.getElementById("fin-morts").textContent = String(progress.deaths);
    const arr = game.deathsByRoom, mx = Math.max(...arr), worst = arr.indexOf(mx);
    document.getElementById("fin-pire").textContent = mx > 0 ? `${LEVELS[worst].name} (${mx})` : "aucune, bravo";
    document.getElementById("fin-pieces").textContent = String(game.coinsTotal);
    document.getElementById("fin-mot").textContent = progress.deaths < 100
      ? "« Moins de 100 chutes ? Tu as triché. C'est mon métier, pas le tien ! » — Archibald"
      : "« Bon, d'accord, tu as gagné. Mais j'ai déjà une piste pour un autre trésor… » — Archibald";
    showOverlay("fin");
  }

  /* ---------- Testeurs : avis, statistiques, mode testeur ---------- */
  let avisDepuis = "titre";
  function resumeStats() {
    const lignes = [];
    const ids = Object.keys(progress.stats).map(Number);
    const finis = ids.filter((i) => progress.stats[i].fini > 0).length;
    lignes.push(`Niveau atteint : ${Math.min(progress.unlocked + 1, LEVELS.length)}/${LEVELS.length} · niveaux finis : ${finis} · chutes : ${progress.deaths}${progress.secrets ? ` · trésors secrets : ${progress.secrets}` : ""}${progress.passes ? ` · niveaux passés en vidéo : ${progress.passes}` : ""}${progress.tester ? " · mode testeur" : ""}`);
    const pires = ids.filter((i) => progress.stats[i].morts > 0).sort((a, b) => progress.stats[b].morts - progress.stats[a].morts).slice(0, 5);
    if (pires.length) lignes.push("Les plus durs : " + pires.map((i) => `n°${i + 1} ${LEVELS[i].name} (${progress.stats[i].morts} chute${progress.stats[i].morts > 1 ? "s" : ""}${progress.stats[i].fini ? "" : ", pas fini"})`).join(" ; "));
    return lignes.join("\n");
  }
  function messageAvis() {
    const ressenti = (document.querySelector('input[name="ressenti"]:checked') || {}).value || "";
    const nom = document.getElementById("avis-nom").value.trim();
    const texte = document.getElementById("avis-texte").value.trim();
    const lv = R ? `n°${R.index + 1} ${R.def.name}` : `dernier niveau atteint n°${Math.min(progress.unlocked + 1, LEVELS.length)}`;
    const appareil = `${isTouch ? "tactile" : "clavier"} · ${window.innerWidth}×${window.innerHeight} · ${navigator.userAgent.match(/iPhone|iPad|Android|Mac|Windows|Linux/)?.[0] || "?"}`;
    return [
      `🎮 Avis sur « Max et l'Œil de Jade »${nom ? " — " + nom : ""}`,
      `Niveau : ${lv}`,
      `Ressenti : ${ressenti}`,
      texte ? `Message : ${texte}` : "",
      resumeStats(),
      `Appareil : ${appareil}`,
    ].filter(Boolean).join("\n");
  }
  function ouvrirAvis() {
    avisDepuis = game.mode === "title" ? "options" : "pause";
    document.getElementById("avis-contexte").textContent = R
      ? `Ton message parlera du niveau ${R.index + 1} (« ${R.def.name} »), avec tes statistiques.`
      : "Ton message sera envoyé avec tes statistiques de partie.";
    document.getElementById("avis-retour").hidden = true;
    document.getElementById("avis-apercu").hidden = true;
    showOverlay("avis");
  }
  function retourAvis(texte) {
    const el = document.getElementById("avis-retour");
    el.textContent = texte; el.hidden = false;
  }
  document.querySelectorAll("[data-avis]").forEach((b) => b.addEventListener("click", ouvrirAvis));
  document.getElementById("btn-retour-avis").addEventListener("click", () => showOverlay(avisDepuis));
  document.getElementById("form-avis").addEventListener("submit", async (e) => {
    e.preventDefault();
    const txt = messageAvis();
    if (navigator.share) {
      try { await navigator.share({ title: "Avis sur Max et l'Œil de Jade", text: txt }); retourAvis("Merci ! Ton avis est parti."); return; }
      catch (err) { if (err && err.name === "AbortError") return; }
    }
    copier(txt, "Le partage n'est pas disponible ici : ton message est copié, colle-le dans un SMS ou un e-mail.");
  });
  document.getElementById("btn-copier").addEventListener("click", () => copier(messageAvis(), "Message copié ! Colle-le dans un SMS, WhatsApp ou un e-mail."));
  function copier(txt, ok) {
    const apercu = document.getElementById("avis-apercu");
    const fallback = () => {
      apercu.textContent = txt; apercu.hidden = false;
      const r = document.createRange(); r.selectNodeContents(apercu);
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
      retourAvis("Sélectionne le texte ci-dessous et copie-le pour l'envoyer.");
    };
    try { navigator.clipboard.writeText(txt).then(() => retourAvis(ok), fallback); } catch (_) { fallback(); }
  }

  document.getElementById("btn-stats").addEventListener("click", () => {
    const ids = Object.keys(progress.stats).map(Number);
    const finis = ids.filter((i) => progress.stats[i].fini > 0).length;
    const essais = ids.reduce((a, i) => a + progress.stats[i].essais, 0);
    const tot = document.getElementById("stats-totaux");
    tot.innerHTML = "";
    [["Niveaux finis", `${finis} / ${LEVELS.length}`], ["Chutes", progress.deaths], ["Parties lancées", essais]].forEach(([k, v]) => {
      const d = document.createElement("div"); const dt = document.createElement("dt"); const dd = document.createElement("dd");
      dt.textContent = k; dd.textContent = String(v); d.append(dt, dd); tot.appendChild(d);
    });
    const ol = document.getElementById("stats-pires"); ol.innerHTML = "";
    const pires = ids.filter((i) => progress.stats[i].morts > 0).sort((a, b) => progress.stats[b].morts - progress.stats[a].morts).slice(0, 8);
    if (!pires.length) { const li = document.createElement("li"); li.textContent = "Aucune chute pour l'instant. Ça ne va pas durer."; ol.appendChild(li); }
    pires.forEach((i) => {
      const st = progress.stats[i], li = document.createElement("li");
      li.textContent = `${i + 1}. ${LEVELS[i].name} — ${st.morts} chute${st.morts > 1 ? "s" : ""} `;
      const sp = document.createElement("span"); sp.textContent = st.fini ? `(fini, meilleur temps ${st.temps} s)` : "(pas encore fini)"; li.appendChild(sp);
      ol.appendChild(li);
    });
    showOverlay("stats");
  });
  document.getElementById("btn-retour-stats").addEventListener("click", () => showOverlay("options"));
  const testeur = document.getElementById("mode-testeur");
  testeur.checked = !!progress.tester;
  testeur.addEventListener("change", () => { progress.tester = testeur.checked; saveProgress(); });

  btnPasser.addEventListener("click", (e) => { e.preventDefault(); ouvrirPub(); });
  document.getElementById("btn-passer-pause").addEventListener("click", ouvrirPub);
  document.getElementById("btn-pub-lancer").addEventListener("click", lancerPub);
  document.getElementById("btn-pub-annuler").addEventListener("click", () => {
    if (pubEnCours) return;
    if (pubBut === "amulette" && pubRetour) { showOverlay(pubRetour); return; }
    game.paused = false; showOverlay(null);
  });

  /* ---------- Carte des mondes ---------- */
  // les personnages de la carte sont dessinés par les mêmes fonctions que dans le jeu
  function sprite(dessin) {
    const c = document.createElement("canvas"), k = 8;
    c.width = 20 * k; c.height = 24 * k;
    const vrai = ctx, vraiR = R;
    ctx = c.getContext("2d"); ctx.imageSmoothingEnabled = false; ctx.scale(k, k);
    try { dessin(); } catch (_) {} finally { ctx = vrai; R = vraiR; }
    return c.toDataURL();
  }
  let sprites = null;
  function lesSprites() {
    if (sprites) return sprites;
    sprites = {
      max: sprite(() => { R = { t: 0, hat: null, player: { x: 5, y: 7, w: 10, h: 15, vx: 0, vy: 0, face: 1, grounded: true, alive: true, anim: 0, club: 0, shield: 0, invuln: 0 } }; drawPlayer(); }),
      archibald: sprite(() => { R = { t: 0 }; drawRival({ x: 4, y: 7, state: "wait", t: 0, face: -1 }); }),
    };
    return sprites;
  }
  function ouvrirCarte() {
    unlockAudio();
    if (!window.MondesUI) { playFrom(Number(document.getElementById("btn-jouer").dataset.level || 0)); return; }
    MondesUI.afficherCarte();
  }
  function quitterVersMonde() {
    const i = R ? R.index : game.level;
    game.mode = "title"; game.paused = false; R = null;
    releaseAll(); resize();
    MondesUI.afficherMonde(MondesUI.mondeDe(i));
  }
  if (window.MondesUI) MondesUI.init({ progress, LEVELS, playFrom, showOverlay, goHome, get sprites() { return lesSprites(); } });
  document.getElementById("btn-jouer").addEventListener("click", ouvrirCarte);
  document.getElementById("btn-niveaux").addEventListener("click", ouvrirCarte);
  document.getElementById("btn-carte-pause").addEventListener("click", quitterVersMonde);
  document.getElementById("btn-options").addEventListener("click", () => { unlockAudio(); showOverlay("options"); });
  document.getElementById("btn-retour-options").addEventListener("click", () => { showOverlay("titre"); refreshHome(); });
  document.getElementById("btn-rester").addEventListener("click", () => showOverlay("titre"));
  document.getElementById("btn-quitter").addEventListener("click", () => {
    // dans l'appli installée (Capacitor), on ferme vraiment ; sur le web, on ne peut pas fermer l'onglet
    const app = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (app && app.exitApp) app.exitApp(); else showOverlay("quitter");
  });
  document.getElementById("btn-reprendre").addEventListener("click", togglePause);
  document.getElementById("btn-recommencer").addEventListener("click", () => { game.paused = false; restartRoom(); });
  document.getElementById("btn-accueil").addEventListener("click", goHome);
  document.getElementById("btn-fin-accueil").addEventListener("click", goHome);
  document.getElementById("btn-pause").addEventListener("click", togglePause);
  document.querySelectorAll("[data-son]").forEach((b) => b.addEventListener("click", toggleMute));
  updateMuteLabel();

  /* ---------- Plein écran ---------- */
  const root = document.documentElement;
  const fsSupported = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled) && !!(root.requestFullscreen || root.webkitRequestFullscreen);
  const standalone = matchMedia("(display-mode: fullscreen), (display-mode: standalone)").matches || navigator.standalone === true;
  const inFrame = (() => { try { return window.self !== window.top; } catch (_) { return true; } })();
  const isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  function enterFullscreen() {
    if (!fsSupported || isFs()) return;
    try {
      const r = (root.requestFullscreen || root.webkitRequestFullscreen).call(root, { navigationUI: "hide" });
      Promise.resolve(r).then(() => screen.orientation?.lock?.("landscape")).catch(() => {});
    } catch (_) {}
  }
  function toggleFullscreen() { if (isFs()) (document.exitFullscreen || document.webkitExitFullscreen).call(document); else enterFullscreen(); }
  document.querySelectorAll("[data-plein]").forEach((b) => { b.hidden = !fsSupported || standalone; b.addEventListener("click", toggleFullscreen); });
  const astuce = document.getElementById("astuce-plein");
  if (astuce && !fsSupported && !standalone) {
    astuce.hidden = false;
    astuce.textContent = inFrame
      ? "Plein écran indisponible dans cet aperçu : il le sera dans la version installée."
      : "Plein écran : Partager, puis « Sur l'écran d'accueil ».";
  }
  ["fullscreenchange", "webkitfullscreenchange"].forEach((ev) => document.addEventListener(ev, () => setTimeout(resize, 50)));

  const orient = document.getElementById("tourner");
  function checkOrientation() {
    // plus besoin de demander de tourner le téléphone : le jeu s'affiche de côté tout seul
    orient.hidden = true;
  }

  /* ================= Boucle ================= */
  let last = performance.now(), acc = 0;
  let frameN = 0, slowAvg = 16;
  function frame(now) {
    const dt = now - last;
    acc += Math.min(0.1, dt / 1000);
    last = now;
    // recadrage : vérifie régulièrement que la taille de l'écran n'a pas changé
    if (++frameN % 15 === 0) {
      const m = mesure();
      if (`${Math.round(m.width)}x${Math.round(m.height)}` !== lastSize) resize();
    }
    // téléphone lent : on baisse la résolution pour garder des commandes réactives
    if (game.mode === "play" && dt > 0 && dt < 200) {
      slowAvg = slowAvg * 0.97 + dt * 0.03;
      if (slowAvg > 24 && maxDpr > 1) { maxDpr = Math.max(1, maxDpr - 0.5); slowAvg = 16; resize(); }
    }
    while (acc >= STEP) { update(); acc -= STEP; }
    render();
    requestAnimationFrame(frame);
  }

  function boot(saved) {
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", () => { resize(); setTimeout(resize, 250); setTimeout(resize, 700); });
    if (window.visualViewport) visualViewport.addEventListener("resize", resize);
    if (window.ResizeObserver) new ResizeObserver(() => resize()).observe(stage.parentElement);
    resize();
    if (saved && typeof saved.level === "number" && saved.mode && saved.mode !== "title" && saved.mode !== "end") {
      game.deathsByRoom = saved.deathsByRoom || game.deathsByRoom;
      startLevel(saved.level);
      showOverlay(null);
    } else { showOverlay("titre"); refreshHome(); }
    window.claude?.hot?.snapshot?.(() => ({ level: game.level, mode: game.mode, deathsByRoom: game.deathsByRoom }));
    requestAnimationFrame(frame);
  }
  // version installée (GitHub Pages) : le jeu reste jouable hors ligne
  if ("serviceWorker" in navigator && location.protocol === "https:" && !inFrame) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  const start = (data) => boot(data || null);
  function go() { window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {}); }
  if (document.fonts && document.fonts.load) {
    Promise.race([
      Promise.all([document.fonts.load(`8px "Silkscreen"`), document.fonts.load(`8px "JetBrains Mono"`)]),
      new Promise((r) => setTimeout(r, 1200)),
    ]).catch(() => {}).finally(go);
  } else go();

  function mesurePerf(n = 120) {
    const t0 = performance.now();
    for (let i = 0; i < n; i++) { update(); render(); }
    return (performance.now() - t0) / n;
  }
  // Aperçu d'un niveau entier (outil de relecture des niveaux, sans effet sur le jeu)
  function apercuNiveau(i, k = 1) {
    const vraiR = R, vraiCtx = ctx, vc = { ...cam }, vv = { ...view };
    R = buildRoom(i); R.t = 1;
    const c = document.createElement("canvas"); c.width = W * k; c.height = H * k;
    ctx = c.getContext("2d"); ctx.scale(k, k);
    cam.x = 0; cam.y = 0; view.w = W; view.h = H;
    try {
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      drawBackground(); drawTiles(false); drawDecor(); drawDoor();
      for (const cp of R.cps) drawCheckpoint(cp);
      for (const it of R.pickups) drawPickup(it);
      for (const e of R.enemies) drawEnemy(e);
      drawMovers(); drawCrushers(); drawTorches(); drawFlames(); drawVines(); drawPlayer(); drawTiles(true);
      if (R.boss) { if (R.boss.kind === "yeti") drawYeti(); else if (R.boss.kind === "pieuvre") drawPieuvre(); else if (R.boss.kind === "oiseau") drawOiseauTonnerre(); else if (R.boss.kind === "fouisseur") drawFouisseur(); else drawBoss(); }
      // marquer les pièges déclenchés (zones) pour la relecture
      ctx.strokeStyle = "rgba(255,80,120,0.7)"; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
      for (const tr of R.def.triggers) for (const a of tr.act) if (["collapse", "spikes", "fall", "dropspike", "appear", "boulder", "door"].includes(a[0])) ctx.strokeRect(a[1] * T, a[2] * T, (a[3] && a[0] !== "boulder" && a[0] !== "door" ? a[3] : 1) * T, (a[4] && ["collapse", "spikes", "fall", "appear"].includes(a[0]) ? Math.min(a[4], 3) : 1) * T);
      ctx.setLineDash([]);
      for (const b of R.beams) { ctx.strokeStyle = "rgba(255,220,120,0.6)"; ctx.beginPath(); ctx.moveTo(b.sx, b.sy); ctx.lineTo(b.sx + Math.sin(b.a0) * 300, b.sy + Math.cos(b.a0) * 300); ctx.moveTo(b.sx, b.sy); ctx.lineTo(b.sx + Math.sin(b.a1) * 300, b.sy + Math.cos(b.a1) * 300); ctx.stroke(); }
      for (const s of R.secretRooms) { ctx.strokeStyle = "rgba(63,208,138,0.9)"; ctx.setLineDash([2, 2]); ctx.strokeRect(s.x * T, s.y * T, s.w * T, s.h * T); ctx.setLineDash([]); }
      return c.toDataURL("image/png");
    } finally { R = vraiR; ctx = vraiCtx; Object.assign(cam, vc); Object.assign(view, vv); }
  }
  window.__temple = { mesurePerf, game, get room() { return R; }, LEVELS, input, pressed, startLevel, playFrom, progress, apercuNiveau, camera: () => updateCamera(true) };
})();
