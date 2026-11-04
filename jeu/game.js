/* Le Temple qui Triche — prototype (acte 1, 5 salles)
 * Moteur maison sur <canvas>, sans dépendance.
 * Grille de 30 × 17 tuiles de 16 px (480 × 272 unités de jeu).
 */
(() => {
  "use strict";

  /* ================= Constantes ================= */
  const T = 16, COLS = 30, ROWS = 17;
  const W = COLS * T, H = ROWS * T;
  const STEP = 1 / 60;

  const PHYS = {
    gravity: 0.35, maxFall: 6.5,
    run: 1.8, accel: 0.35,
    jump: -5.2, jumpCut: -2,
    coyote: 6, buffer: 7,
  };

  const C = {
    bg: "#0d1512", bg2: "#13201b",
    stone: "#3a5649", stoneTop: "#5f8471", stoneDark: "#25372f",
    crack: "#9a8656", crackDark: "#5e5232",
    danger: "#e5483c", dangerDark: "#8c241d",
    player: "#efe8d8", hat: "#d9a441",
    enemy: "#7c8c84", eye: "#e5483c",
    door: "#d9a441", doorIn: "#060a08",
    god: "#d9a441", hint: "#bfd3c8",
    text: "#efe8d8", dim: "#7f978b",
  };

  const TYPES = {
    exploration: { label: "Exploration", color: "#6fb58f" },
    trahison: { label: "Trahison", color: "#e5483c" },
    action: { label: "Action", color: "#e3913b" },
    histoire: { label: "Histoire", color: "#b49ae6" },
  };

  /* ================= Salles =================
   * Légende : # pierre · B mur fissuré (dynamite) · ^ pics · P départ
   *           D porte · e gardien · a balles (+3) · t dynamite (+1)
   * Déclencheurs : zone [x, y, w, h] en tuiles (absente = au début de la salle),
   *   min / max = nombre de morts dans la salle, air = seulement en saut.
   */
  const ROOMS = [
    {
      name: "Le seuil", type: "exploration",
      map: [
        "##############################",
        "#.......................#....#",
        "#.......................#....#",
        "#.......................#....#",
        "#.......................#....#",
        "#.......................#....#",
        "#.......................#....#",
        "#.......................#....#",
        "#.......................#....#",
        "#.......................#....#",
        "#.......................#....#",
        "#.......................B....#",
        "#.......................B....#",
        "#.......................B....#",
        "#.......t...............B....#",
        "#.P...####^^####...e....B..D.#",
        "##############################",
      ],
      triggers: [
        { max: 0, act: [["say", "Bienvenue dans mon temple, petit aventurier."]] },
        { min: 1, act: [["say", "Déjà ? On n'a même pas commencé."]] },
        { zone: [4, 1, 1, 15], act: [["hint", "Saute par-dessus les pics"]] },
        { zone: [9, 1, 1, 15], act: [["hint", "Ramasse la dynamite"]] },
        { zone: [15, 1, 1, 15], act: [["hint", "Tire sur le gardien"]] },
        { zone: [21, 1, 1, 15], act: [["hint", "Pose la dynamite contre le mur fissuré, puis recule"]] },
      ],
    },
    {
      name: "Le couloir honnête", type: "trahison",
      map: [
        "##############################",
        "##############################",
        "##############################",
        "##############################",
        "##############################",
        "##############################",
        "##############################",
        "##############################",
        "##############################",
        "##############################",
        "##############################",
        "#............................#",
        "#............................#",
        "#............................#",
        "#............................#",
        "#.P.........................D#",
        "##############################",
      ],
      triggers: [
        { max: 0, act: [["say", "Un simple couloir. Rien de suspect."]] },
        { min: 1, max: 2, act: [["say", "Tu reviens ? J'ai un peu changé la déco."]] },
        { min: 3, act: [["say", "Indice : la porte a peur de toi."]] },
        { max: 0, zone: [8, 11, 1, 5], act: [["collapse", 10, 16, 4, 1, 0]] },
        { min: 1, zone: [10, 11, 2, 5], act: [["collapse", 13, 16, 3, 1, 0], ["say", "Pas la même blague deux fois."]] },
        { zone: [22, 11, 1, 5], act: [["door", 2, 15], ["say", "Oups. La porte avait froid aux pieds."]] },
      ],
    },
    {
      name: "La salle des gardes", type: "exploration",
      map: [
        "##############################",
        "#........##..................#",
        "#........##..................#",
        "#........##..................#",
        "#.Pa.....##..................#",
        "#######..##..................#",
        "#........##..................#",
        "#............................#",
        "#........t.....e.............#",
        "#....################........#",
        "#............................#",
        "#....................#BBBB####",
        "#....................#....####",
        "#....................#....####",
        "#....................#....####",
        "#^^^^^^^^^^^^^^^^^^^^#..D.####",
        "##############################",
      ],
      triggers: [
        { max: 0, act: [["say", "Mes gardes ne dorment jamais. Enfin, presque."]] },
        { min: 2, act: [["say", "Le toit de la porte a l'air fragile, non ?"]] },
        { zone: [9, 8, 1, 1], act: [["fall", 9, 6, 2, 1, 28], ["hint", "Ça tremble au-dessus…"]] },
        { zone: [21, 1, 7, 10], act: [["hint", "La porte est en dessous…"]] },
      ],
    },
    {
      name: "La course", type: "action",
      map: [
        "##############################",
        "#............................#",
        "#............................#",
        "#............................#",
        "#..P.......^^................#",
        "##########################...#",
        "#............................#",
        "#............................#",
        "#............................#",
        "#............................#",
        "#...##########################",
        "#............................#",
        "#............................#",
        "#............................#",
        "#............................#",
        "#..........................D.#",
        "##############################",
      ],
      triggers: [
        { max: 0, act: [["say", "Tu aimes le sport ?"]] },
        { min: 1, act: [["spikes", 10, 9, 2, 1]] },
        { min: 1, max: 2, act: [["say", "Cette fois, je te montre les pics. Je suis bon joueur."]] },
        { min: 3, act: [["say", "Je ralentis le rocher. Ne le dis à personne."]] },
        { max: 2, zone: [6, 1, 1, 4], act: [["boulder", 1, 2, 1, 1.5], ["shake", 6]] },
        { min: 3, zone: [6, 1, 1, 4], act: [["boulder", 1, 2, 1, 1.15], ["shake", 6]] },
        { max: 0, zone: [13, 6, 1, 4], act: [["spikes", 10, 9, 2, 1]] },
        { zone: [14, 11, 1, 5], act: [["collapse", 17, 16, 2, 1, 16]] },
      ],
    },
    {
      name: "Le sanctuaire", type: "histoire",
      map: [
        "##############################",
        "#............................#",
        "#............................#",
        "#............................#",
        "#............................#",
        "#............................#",
        "#............................#",
        "#............................#",
        "#............................#",
        "#............................#",
        "#............................#",
        "#............................#",
        "#............................#",
        "#............................#",
        "#............................#",
        "#.P........................D.#",
        "##############################",
      ],
      decor: "pillars",
      triggers: [
        { max: 0, act: [["say", "Tu es arrivé jusqu'ici ? Impressionnant."]] },
        { min: 1, act: [["say", "Bon. Celle-là, c'était un piège. Mais c'est fini, juré."]] },
        { max: 0, zone: [7, 1, 1, 15], act: [["say", "Je suis Trickster-Ka, dieu des farces. Ce temple est mon terrain de jeu."]] },
        { max: 0, zone: [14, 1, 1, 15], act: [["say", "Cette salle n'a aucun piège. Promis."]] },
        { max: 0, zone: [19, 1, 1, 15], act: [["collapse", 21, 16, 4, 1, 0]] },
        { min: 1, zone: [19, 1, 1, 15], act: [["say", "…"]] },
        { min: 1, zone: [24, 1, 1, 15], act: [["say", "Tu vois ? Je tiens parole. Parfois."]] },
      ],
    },
  ];

  const TAUNTS = [
    "Aïe.",
    "Le temple te remercie pour ta contribution.",
    "Tu y étais presque. Non, en fait.",
    "Encore ! Encore !",
    "Je note ça dans mon carnet de farces.",
    "Tu sais que tu peux sauter, hein ?",
    "Magnifique. Refais-le.",
  ];

  /* ================= Canvas & mise à l'échelle ================= */
  const canvas = document.getElementById("jeu");
  const ctx = canvas.getContext("2d");
  const stage = document.getElementById("scene");
  let scale = 1, dpr = 1;

  function resize() {
    const wrap = stage.parentElement.getBoundingClientRect();
    scale = Math.max(0.5, Math.min(wrap.width / W, wrap.height / H));
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    const cw = Math.floor(W * scale), ch = Math.floor(H * scale);
    stage.style.width = cw + "px";
    stage.style.height = ch + "px";
    canvas.width = Math.floor(cw * dpr);
    canvas.height = Math.floor(ch * dpr);
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
  }
  window.addEventListener("keydown", (e) => {
    unlockAudio();
    if (e.code === "Escape" || e.code === "KeyP") { togglePause(); e.preventDefault(); return; }
    if (e.code === "KeyR" && game.mode === "play") { restartRoom(); return; }
    if (e.code === "KeyM") { toggleMute(); return; }
    if ((e.code === "Enter" || e.code === "Space") && (game.mode === "title" || game.mode === "end")) {
      startGame(); e.preventDefault(); return;
    }
    const n = keyMap[e.code];
    if (n) { setInput(n, true); e.preventDefault(); }
  });
  window.addEventListener("keyup", (e) => {
    const n = keyMap[e.code];
    if (n) setInput(n, false);
  });
  window.addEventListener("blur", releaseAll);
  function releaseAll() { for (const k in input) input[k] = false; }

  // Boutons tactiles : chaque pointeur est suivi, plusieurs doigts à la fois.
  const pointerOwner = new Map();
  document.querySelectorAll("[data-btn]").forEach((el) => {
    const name = el.dataset.btn;
    const down = (e) => {
      e.preventDefault();
      unlockAudio();
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      pointerOwner.set(e.pointerId, name);
      setInput(name, true);
      el.classList.add("on");
    };
    const up = (e) => {
      if (pointerOwner.get(e.pointerId) !== name) return;
      pointerOwner.delete(e.pointerId);
      if (![...pointerOwner.values()].includes(name)) {
        setInput(name, false);
        el.classList.remove("on");
      }
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("lostpointercapture", up);
    el.addEventListener("contextmenu", (e) => e.preventDefault());
  });

  const isTouch = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
  document.body.classList.toggle("tactile", isTouch);

  /* ================= Son (WebAudio, synthèse simple) ================= */
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
  };

  /* ================= État du jeu ================= */
  const game = {
    mode: "title", // title | card | play | dead | win | end
    roomIndex: 0,
    deathsByRoom: ROOMS.map(() => 0),
    totalDeaths: 0,
    ammo: { bullets: 6, tnt: 1 },
    entryAmmo: { bullets: 6, tnt: 1 },
    timer: 0, startTime: 0, endTime: 0,
    paused: false,
  };
  let R = null; // salle en cours

  function buildRoom(index) {
    const def = ROOMS[index];
    const deaths = game.deathsByRoom[index];
    const tiles = def.map.map((row) => row.split(""));
    const room = {
      def, index, deaths, tiles,
      shakeTiles: new Map(), // "x,y" -> frames restantes avant chute
      spikeAnim: new Map(),  // "x,y" -> progression 0..1
      player: null, door: null,
      enemies: [], pickups: [], bullets: [], dynamites: [], boulders: [], blocks: [],
      particles: [], fired: new Set(), wobble: new Set(),
      say: null, hint: null, shake: 0, t: 0,
    };
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = tiles[y][x];
        if (c === "P") { room.player = makePlayer(x, y); tiles[y][x] = "."; }
        else if (c === "D") { room.door = { x: x * T + 2, y: y * T - 6, w: 12, h: 22, tx: null, ty: null, moving: false }; tiles[y][x] = "."; }
        else if (c === "e") { room.enemies.push({ x: x * T + 2, y: y * T + 2, w: 12, h: 14, vx: -0.6, vy: 0, alive: true, t: Math.random() * 10 }); tiles[y][x] = "."; }
        else if (c === "a" || c === "t") { room.pickups.push({ kind: c === "a" ? "bullets" : "tnt", x: x * T + 4, y: y * T + 6, w: 8, h: 10, taken: false }); tiles[y][x] = "."; }
        else if (c === "^") room.spikeAnim.set(x + "," + y, 1);
      }
    }
    return room;
  }

  function makePlayer(tx, ty) {
    return {
      x: tx * T + 3, y: ty * T + 2, w: 10, h: 14,
      vx: 0, vy: 0, face: 1, grounded: false,
      coyote: 0, buffer: 0, alive: true, anim: 0,
    };
  }

  /* ================= Tuiles ================= */
  function tileAt(x, y) {
    if (x < 0 || x >= COLS) return "#";
    if (y < 0) return "#";
    if (y >= ROWS) return ".";
    return R.tiles[y][x];
  }
  const isSolid = (c) => c === "#" || c === "B";
  function solidAt(px, py) { return isSolid(tileAt(Math.floor(px / T), Math.floor(py / T))); }

  function rectHitsSolid(x, y, w, h) {
    const x0 = Math.floor(x / T), x1 = Math.floor((x + w - 0.01) / T);
    const y0 = Math.floor(y / T), y1 = Math.floor((y + h - 0.01) / T);
    for (let ty = y0; ty <= y1; ty++)
      for (let tx = x0; tx <= x1; tx++)
        if (isSolid(tileAt(tx, ty))) return true;
    return false;
  }

  // Déplacement par axe avec résolution contre la grille. Renvoie {hitX, hitY}.
  function moveBody(b) {
    let hitX = false, hitY = false;
    b.x += b.vx;
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
      if (tr.min != null && R.deaths < tr.min) return;
      if (tr.max != null && R.deaths > tr.max) return;
      if (!tr.zone) { if (!atStart) return; }
      else {
        if (atStart) return;
        const [zx, zy, zw, zh] = tr.zone;
        const z = { x: zx * T, y: zy * T, w: zw * T, h: zh * T };
        if (!p.alive || !overlap(p, z)) return;
        if (tr.air && p.grounded) return;
      }
      R.fired.add(i);
      tr.act.forEach(doAction);
    });
  }

  function doAction(a) {
    const [kind, ...v] = a;
    switch (kind) {
      case "say": R.say = { text: v[0], t: 0, dur: 150 + v[0].length * 3 }; sfx.god(); break;
      case "hint": R.hint = { text: v[0], t: 0, dur: 200 }; break;
      case "shake": R.shake = Math.max(R.shake, v[0]); break;
      case "collapse": {
        const [x, y, w, h, delay] = v;
        for (let ty = y; ty < y + h; ty++)
          for (let tx = x; tx < x + w; tx++) {
            if (delay > 0) R.shakeTiles.set(tx + "," + ty, delay);
            else dropTile(tx, ty);
          }
        if (delay <= 0) { sfx.crumble(); R.shake = Math.max(R.shake, 4); }
        break;
      }
      case "spikes": {
        const [x, y, w, h] = v;
        for (let ty = y; ty < y + h; ty++)
          for (let tx = x; tx < x + w; tx++) {
            R.tiles[ty][tx] = "^";
            R.spikeAnim.set(tx + "," + ty, R.t === 0 ? 1 : 0);
          }
        if (R.t > 0) sfx.spike();
        break;
      }
      case "door": {
        const d = R.door;
        d.tx = v[0] * T + 2; d.ty = v[1] * T - 6; d.moving = true;
        sfx.flee();
        break;
      }
      case "boulder": {
        const [x, y, dir, speed] = v;
        R.boulders.push({ x: x * T, y: y * T, w: 28, h: 28, vx: dir * speed, vy: 0, dir, speed, rot: 0, grounded: false });
        break;
      }
      case "fall": {
        const [x, y, w, h, delay] = v;
        R.blocks.push({ x: x * T, y: y * T, w: w * T, h: h * T, vy: 0, delay, tiles: [x, y, w, h], falling: false });
        for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) R.wobble.add(tx + "," + ty);
        break;
      }
    }
  }

  function dropTile(tx, ty) {
    if (tileAt(tx, ty) === ".") return;
    R.tiles[ty][tx] = ".";
    for (let i = 0; i < 4; i++)
      R.particles.push({ x: tx * T + Math.random() * T, y: ty * T + Math.random() * T, vx: (Math.random() - 0.5) * 1.2, vy: Math.random() * -1, s: 3 + Math.random() * 3, life: 60, color: C.stone, g: 0.25 });
  }

  /* ================= Mise à jour ================= */
  function update() {
    if (game.paused) return;
    if (game.mode === "card") {
      pressed.jump = pressed.fire = pressed.tnt = false;
      game.cardT++;
      if (game.cardT > 75) { game.mode = "play"; runTriggers(true); }
      return;
    }
    if (game.mode !== "play" && game.mode !== "dead" && game.mode !== "win") return;
    R.t++;
    if (game.mode === "play") game.timer++;

    updatePlayer();
    updateTilesFx();
    updateDoor();
    updateEnemies();
    updateBullets();
    updateDynamites();
    updateBoulders();
    updateBlocks();
    updateParticles();
    if (game.mode === "play") { runTriggers(false); checkHazards(); }

    if (R.say) { R.say.t++; if (R.say.t > R.say.dur) R.say = null; }
    if (R.hint) { R.hint.t++; if (R.hint.t > R.hint.dur) R.hint = null; }
    if (R.shake > 0) R.shake -= 0.5;

    if (game.mode === "dead") {
      game.deadT++;
      if (game.deadT > 50) restartRoom(true);
    }
    if (game.mode === "win") {
      game.winT++;
      if (game.winT > 40) nextRoom();
    }
    pressed.jump = pressed.fire = pressed.tnt = false;
  }

  function updatePlayer() {
    const p = R.player;
    if (!p.alive) return;
    if (game.mode === "win") { p.vx *= 0.8; return; }
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir) p.face = dir;
    p.vx += (dir * PHYS.run - p.vx) * PHYS.accel;
    if (Math.abs(p.vx) < 0.05) p.vx = 0;

    p.coyote = p.grounded ? PHYS.coyote : p.coyote - 1;
    if (pressed.jump) p.buffer = PHYS.buffer; else p.buffer--;
    if (p.buffer > 0 && p.coyote > 0) {
      p.vy = PHYS.jump; p.buffer = 0; p.coyote = 0; sfx.jump();
    }
    if (!input.jump && p.vy < PHYS.jumpCut) p.vy = PHYS.jumpCut;
    p.vy = Math.min(p.vy + PHYS.gravity, PHYS.maxFall);
    moveBody(p);
    p.anim += Math.abs(p.vx) * 0.25;

    if (pressed.fire) {
      if (game.ammo.bullets > 0) {
        game.ammo.bullets--;
        R.bullets.push({ x: p.x + (p.face > 0 ? p.w : -4), y: p.y + 6, w: 4, h: 2, vx: p.face * 5, life: 90 });
        sfx.shoot();
      } else { sfx.empty(); game.flash = { what: "bullets", t: 30 }; }
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
        if (it.kind === "bullets") game.ammo.bullets += 3; else game.ammo.tnt += 1;
        sfx.pick();
        burst(it.x + 4, it.y + 4, C.hat, 8);
      }
    }

    const d = R.door;
    if (d && !d.moving && overlap(p, { x: d.x + 3, y: d.y + 4, w: d.w - 6, h: d.h - 4 })) {
      game.mode = "win"; game.winT = 0; sfx.door();
    }
    if (p.y > H + 20) kill("fall");
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
  }

  function updateDoor() {
    const d = R.door;
    if (!d || !d.moving) return;
    const dx = d.tx - d.x, dy = d.ty - d.y;
    const dist = Math.hypot(dx, dy);
    const sp = 6;
    if (dist <= sp) { d.x = d.tx; d.y = d.ty; d.moving = false; }
    else { d.x += (dx / dist) * sp; d.y += (dy / dist) * sp; }
    if (R.t % 3 === 0) R.particles.push({ x: d.x + 6, y: d.y + 20, vx: 0, vy: -0.3, s: 2, life: 20, color: C.door, g: 0 });
  }

  function updateEnemies() {
    for (const e of R.enemies) {
      if (!e.alive) continue;
      e.t += 0.1;
      e.vy = Math.min(e.vy + PHYS.gravity, PHYS.maxFall);
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

  function updateBullets() {
    for (const b of R.bullets) {
      b.x += b.vx; b.life--;
      if (rectHitsSolid(b.x, b.y, b.w, b.h) || b.x < -10 || b.x > W + 10) {
        b.life = 0; burst(b.x, b.y, C.text, 3, 0.6);
      }
      for (const e of R.enemies) {
        if (e.alive && b.life > 0 && overlap(b, e)) { e.alive = false; b.life = 0; killEnemy(e); }
      }
    }
    R.bullets = R.bullets.filter((b) => b.life > 0);
  }

  function killEnemy(e) {
    sfx.kill();
    burst(e.x + 6, e.y + 7, C.enemy, 14, 1.6);
    burst(e.x + 6, e.y + 5, C.eye, 4, 1);
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
          R.tiles[ty][tx] = ".";
          for (let i = 0; i < 6; i++)
            R.particles.push({ x: tx * T + 8, y: ty * T + 8, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.8) * 4, s: 3 + Math.random() * 3, life: 50, color: C.crack, g: 0.2 });
        }
      }
    for (const e of R.enemies)
      if (e.alive && Math.hypot(e.x + 6 - cx, e.y + 7 - cy) < rad + 6) { e.alive = false; killEnemy(e); }
    for (const b of R.boulders)
      if (Math.hypot(b.x + 14 - cx, b.y + 14 - cy) < rad + 12) { b.dead = true; burst(b.x + 14, b.y + 14, C.stoneTop, 18, 2.5); }
    R.boulders = R.boulders.filter((b) => !b.dead);
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 3.5;
      R.particles.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, s: 2 + Math.random() * 4, life: 24 + Math.random() * 16, color: Math.random() < 0.5 ? C.hat : C.danger, g: 0.05 });
    }
    R.particles.push({ ring: true, x: cx, y: cy, r: 4, life: 14, color: C.text });
    const p = R.player;
    if (p.alive && game.mode === "play" && Math.hypot(p.x + 5 - cx, p.y + 7 - cy) < rad) kill("boom");
  }

  function updateBoulders() {
    for (const b of R.boulders) {
      b.vy = Math.min(b.vy + PHYS.gravity, PHYS.maxFall);
      b.vx = b.dir * b.speed;
      const hit = moveBody(b);
      if (hit.hitX) b.dir = -b.dir;
      b.rot += (b.dir * b.speed) / 14;
      if (b.grounded && R.t % 6 === 0) R.particles.push({ x: b.x + 14 - b.dir * 12, y: b.y + 27, vx: -b.dir * 0.5, vy: -0.4, s: 2, life: 18, color: C.stoneDark, g: 0.05 });
      if (b.grounded && !b.wasGrounded) R.shake = Math.max(R.shake, 3);
      b.wasGrounded = b.grounded;
      if (b.y > H + 40) b.dead = true;
    }
    R.boulders = R.boulders.filter((b) => !b.dead);
  }

  function updateBlocks() {
    for (const k of R.blocks) {
      if (!k.falling) {
        k.delay--;
        if (k.delay <= 0) {
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
        for (let yy = 0; yy < k.h / T; yy++) for (let xx = 0; xx < k.w / T; xx++)
          if (ty + yy < ROWS) R.tiles[ty + yy][tx + xx] = "#";
        k.done = true;
        R.shake = Math.max(R.shake, 5);
        sfx.crumble();
        burst(k.x + k.w / 2, k.y + k.h, C.stoneTop, 10, 1.5);
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
    // Pics : seule la moitié basse de la tuile est mortelle
    const x0 = Math.floor(p.x / T), x1 = Math.floor((p.x + p.w - 0.01) / T);
    const y0 = Math.floor(p.y / T), y1 = Math.floor((p.y + p.h - 0.01) / T);
    for (let ty = y0; ty <= y1; ty++)
      for (let tx = x0; tx <= x1; tx++)
        if (tileAt(tx, ty) === "^" && overlap(p, { x: tx * T + 2, y: ty * T + 7, w: 12, h: 9 })) return kill("spike");
    for (const e of R.enemies) if (e.alive && overlap(p, { x: e.x + 1, y: e.y + 1, w: e.w - 2, h: e.h - 1 })) return kill("enemy");
    for (const b of R.boulders) {
      const cx = b.x + 14, cy = b.y + 14;
      const nx = Math.max(p.x, Math.min(cx, p.x + p.w)), ny = Math.max(p.y, Math.min(cy, p.y + p.h));
      if (Math.hypot(nx - cx, ny - cy) < 13) return kill("boulder");
    }
    for (const k of R.blocks) if (k.falling && overlap(p, k)) return kill("block");
    if (rectHitsSolid(p.x + 1, p.y + 1, p.w - 2, p.h - 2)) kill("crush");
  }

  function kill() {
    const p = R.player;
    if (!p.alive) return;
    p.alive = false;
    game.mode = "dead"; game.deadT = 0;
    game.deathsByRoom[R.index]++; game.totalDeaths++;
    sfx.death();
    R.shake = 6;
    burst(p.x + 5, p.y + 7, C.player, 18, 2.2);
    burst(p.x + 5, p.y + 2, C.hat, 6, 1.5);
    R.hat = { x: p.x, y: p.y, vx: -p.face * 1.2, vy: -4, r: 0 };
    R.say = { text: TAUNTS[Math.floor(Math.random() * TAUNTS.length)], t: 0, dur: 90 };
  }

  /* ================= Déroulement ================= */
  function startGame() {
    unlockAudio();
    game.roomIndex = 0;
    game.deathsByRoom = ROOMS.map(() => 0);
    game.totalDeaths = 0;
    game.ammo = { bullets: 6, tnt: 1 };
    game.timer = 0;
    enterRoom(0);
    showOverlay(null);
  }

  function enterRoom(i) {
    game.roomIndex = i;
    game.entryAmmo = { ...game.ammo };
    R = buildRoom(i);
    game.mode = "card"; game.cardT = 0;
    releaseAll();
  }

  function restartRoom(fromDeath) {
    if (!R) return;
    if (!fromDeath && game.mode === "play") { game.deathsByRoom[R.index]++; game.totalDeaths++; }
    game.ammo = { ...game.entryAmmo };
    const keep = R.say && fromDeath ? R.say : null;
    R = buildRoom(game.roomIndex);
    game.mode = "play";
    runTriggers(true);
    if (keep && !R.say) R.say = keep;
    game.paused = false;
    showOverlay(null);
  }

  function nextRoom() {
    if (game.roomIndex + 1 < ROOMS.length) enterRoom(game.roomIndex + 1);
    else {
      game.mode = "end";
      showEnd();
    }
  }

  /* ================= Rendu ================= */
  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const k = scale * dpr;
    let sx = 0, sy = 0;
    if (R && R.shake > 0 && !reducedMotion) { sx = (Math.random() - 0.5) * R.shake; sy = (Math.random() - 0.5) * R.shake; }
    ctx.setTransform(k, 0, 0, k, sx * k, sy * k);

    if (!R) { drawTitleBackdrop(); return; }
    drawBackground();
    drawTiles();
    drawDoor();
    for (const it of R.pickups) if (!it.taken) drawPickup(it);
    for (const e of R.enemies) if (e.alive) drawEnemy(e);
    for (const k2 of R.blocks) drawBlock(k2);
    for (const d of R.dynamites) drawDynamite(d);
    for (const b of R.boulders) drawBoulder(b);
    for (const b of R.bullets) { ctx.fillStyle = C.text; ctx.fillRect(b.x, b.y, b.w, b.h); }
    drawPlayer();
    drawParticles();
    ctx.setTransform(k, 0, 0, k, 0, 0);
    drawHud();
    drawSpeech();
    if (game.mode === "card") drawCard();
    if (game.mode === "win") {
      ctx.fillStyle = `rgba(13,21,18,${Math.min(1, game.winT / 40)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function drawTitleBackdrop() {
    ctx.fillStyle = C.bg2;
    for (let i = 0; i < 6; i++) ctx.fillRect(40 + i * 80, 60, 18, H);
  }

  function drawBackground() {
    ctx.fillStyle = C.bg2;
    if (R.def.decor === "pillars") {
      for (let i = 0; i < 7; i++) {
        const x = 30 + i * 68;
        ctx.fillRect(x, 40, 22, H - 72);
        ctx.fillRect(x - 4, 36, 30, 6);
        ctx.fillRect(x - 4, H - 38, 30, 6);
      }
      // l'œil du dieu, au fond
      const cx = W / 2, cy = 70, open = 0.5 + 0.5 * Math.sin(R.t / 40);
      ctx.strokeStyle = "rgba(217,164,65,0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(cx, cy, 30, 12 * open + 2, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "rgba(217,164,65,0.25)";
      ctx.beginPath(); ctx.arc(cx + Math.sin(R.t / 70) * 8, cy, 5 * open + 1, 0, Math.PI * 2); ctx.fill();
    } else {
      for (let i = 0; i < 9; i++) {
        const x = 8 + i * 56 + ((i * 37) % 13);
        ctx.fillRect(x, 0, 2, H);
      }
    }
  }

  function drawTiles() {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = R.tiles[y][x];
        if (c === ".") continue;
        let ox = 0, oy = 0;
        const sk = R.shakeTiles.get(x + "," + y) || R.wobble.has(x + "," + y);
        if (sk) { ox = (Math.random() - 0.5) * 2; oy = (Math.random() - 0.5) * 1.5; }
        const px = x * T + ox, py = y * T + oy;
        if (c === "#") {
          ctx.fillStyle = C.stone;
          ctx.fillRect(px, py, T, T);
          if (tileAt(x, y - 1) !== "#" && tileAt(x, y - 1) !== "B") { ctx.fillStyle = C.stoneTop; ctx.fillRect(px, py, T, 2); }
          if (tileAt(x, y + 1) !== "#" && tileAt(x, y + 1) !== "B") { ctx.fillStyle = C.stoneDark; ctx.fillRect(px, py + T - 2, T, 2); }
          if ((x * 7 + y * 13) % 5 === 0) { ctx.fillStyle = C.stoneDark; ctx.fillRect(px + 4, py + 6, 3, 2); }
        } else if (c === "B") {
          ctx.fillStyle = C.crack;
          ctx.fillRect(px, py, T, T);
          ctx.strokeStyle = C.crackDark; ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(px + 3, py + 1); ctx.lineTo(px + 8, py + 7); ctx.lineTo(px + 5, py + 11); ctx.lineTo(px + 9, py + 15);
          ctx.moveTo(px + 8, py + 7); ctx.lineTo(px + 14, py + 5);
          ctx.stroke();
        } else if (c === "^") {
          const a = R.spikeAnim.get(x + "," + y) ?? 1;
          const hgt = 10 * a;
          ctx.fillStyle = C.danger;
          ctx.beginPath();
          for (let i = 0; i < 3; i++) {
            const bx = px + 1 + i * 5;
            ctx.moveTo(bx, py + T); ctx.lineTo(bx + 2.5, py + T - hgt); ctx.lineTo(bx + 5, py + T);
          }
          ctx.fill();
        }
      }
    }
  }

  function drawDoor() {
    const d = R.door;
    if (!d) return;
    const glow = 0.5 + 0.5 * Math.sin(R.t / 12);
    ctx.fillStyle = `rgba(217,164,65,${0.12 + glow * 0.1})`;
    ctx.fillRect(d.x - 4, d.y - 4, d.w + 8, d.h + 4);
    ctx.fillStyle = C.door;
    ctx.fillRect(d.x - 2, d.y - 2, d.w + 4, d.h + 2);
    ctx.fillStyle = C.doorIn;
    ctx.fillRect(d.x + 1, d.y + 1, d.w - 2, d.h - 1);
    if (d.moving) {
      // la porte a des jambes quand elle s'enfuit
      ctx.fillStyle = C.door;
      const ph = Math.sin(R.t / 2) * 3;
      ctx.fillRect(d.x + 1 + ph, d.y + d.h, 2, 4);
      ctx.fillRect(d.x + d.w - 3 - ph, d.y + d.h, 2, 4);
    }
  }

  function drawPickup(it) {
    const bob = Math.sin(R.t / 10 + it.x) * 1.5;
    if (it.kind === "tnt") {
      ctx.fillStyle = C.danger; ctx.fillRect(it.x + 1, it.y + bob, 6, 10);
      ctx.fillStyle = C.hat; ctx.fillRect(it.x + 3, it.y - 3 + bob, 1, 3);
    } else {
      ctx.fillStyle = C.text;
      for (let i = 0; i < 3; i++) ctx.fillRect(it.x + i * 3, it.y + 2 + bob, 2, 7);
    }
  }

  function drawEnemy(e) {
    const bob = Math.abs(Math.sin(e.t * 2)) * 1;
    ctx.fillStyle = C.enemy;
    ctx.fillRect(e.x, e.y - bob, e.w, e.h + bob);
    ctx.fillStyle = C.stoneDark;
    ctx.fillRect(e.x, e.y - bob, e.w, 3);
    ctx.fillStyle = C.eye;
    const ex = e.vx > 0 ? e.x + 7 : e.x + 2;
    ctx.fillRect(ex, e.y + 4 - bob, 3, 3);
  }

  function drawBlock(k) {
    if (!k.falling) return; // tant qu'il tremble, il est encore dessiné comme une tuile
    const ox = 0;
    ctx.fillStyle = C.stone; ctx.fillRect(k.x + ox, k.y, k.w, k.h);
    ctx.fillStyle = C.stoneTop; ctx.fillRect(k.x + ox, k.y, k.w, 2);
  }

  function drawDynamite(d) {
    const blink = d.fuse < 40 && Math.floor(d.fuse / 4) % 2 === 0;
    ctx.fillStyle = blink ? C.text : C.danger;
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.fillStyle = C.hat; ctx.fillRect(d.x + 2, d.y - 4, 1, 4);
  }

  function drawBoulder(b) {
    const cx = b.x + 14, cy = b.y + 14;
    ctx.fillStyle = C.stoneTop;
    ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.stoneDark; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const a = b.rot + (i * Math.PI * 2) / 3;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 4, cy + Math.sin(a) * 4); ctx.lineTo(cx + Math.cos(a) * 11, cy + Math.sin(a) * 11); ctx.stroke();
    }
  }

  function drawPlayer() {
    const p = R.player;
    if (!p.alive) {
      const h = R.hat;
      if (h) {
        h.vy += 0.25; h.x += h.vx; h.y += h.vy; h.r += 0.2;
        ctx.save(); ctx.translate(h.x + 5, h.y); ctx.rotate(h.r);
        ctx.fillStyle = C.hat; ctx.fillRect(-7, 0, 14, 2); ctx.fillRect(-4, -4, 8, 4);
        ctx.restore();
      }
      return;
    }
    const run = p.grounded && Math.abs(p.vx) > 0.3;
    const bob = run ? Math.abs(Math.sin(p.anim)) * 1.2 : 0;
    const squash = !p.grounded ? (p.vy < 0 ? 1 : 0) : 0;
    const x = Math.round(p.x * 2) / 2, y = p.y - bob;
    // corps
    ctx.fillStyle = C.player;
    ctx.fillRect(x + 1, y + 4 - squash, p.w - 2, p.h - 4 + squash);
    // jambes
    if (run) {
      const s = Math.sin(p.anim) * 2;
      ctx.fillRect(x + 2 + s, y + p.h - 1, 2, 1 + bob);
      ctx.fillRect(x + p.w - 4 - s, y + p.h - 1, 2, 1 + bob);
    }
    // œil
    ctx.fillStyle = C.bg;
    ctx.fillRect(p.face > 0 ? x + 6 : x + 2, y + 6, 2, 2);
    // chapeau
    ctx.fillStyle = C.hat;
    ctx.fillRect(x - 2, y + 3 - squash, p.w + 4, 2);
    ctx.fillRect(x + 1, y - 1 - squash, p.w - 2, 4);
  }

  function drawParticles() {
    for (const q of R.particles) {
      if (q.ring) {
        ctx.strokeStyle = `rgba(239,232,216,${q.life / 14})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.stroke();
        continue;
      }
      ctx.globalAlpha = Math.min(1, q.life / 20);
      ctx.fillStyle = q.color;
      ctx.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s);
    }
    ctx.globalAlpha = 1;
  }

  const FONT_PIX = '"Silkscreen", "Courier New", monospace';
  const FONT_TXT = '"JetBrains Mono", ui-monospace, "Courier New", monospace';

  function drawHud() {
    ctx.fillStyle = "rgba(6,10,8,0.72)";
    ctx.fillRect(0, 0, W, 15);
    const ty = TYPES[R.def.type];
    ctx.textBaseline = "middle";
    ctx.font = `8px ${FONT_PIX}`;
    ctx.fillStyle = ty.color;
    ctx.fillRect(6, 4, 7, 7);
    ctx.fillStyle = C.text;
    ctx.textAlign = "left";
    ctx.fillText(`${R.index + 1}/${ROOMS.length}  ${R.def.name.toUpperCase()}`, 18, 8);

    // munitions
    let x = 300;
    const fl = game.flash && game.flash.t > 0 ? game.flash : null;
    if (fl) fl.t--;
    ctx.fillStyle = fl && fl.what === "bullets" && fl.t % 8 < 4 ? C.danger : C.text;
    ctx.fillRect(x, 5, 2, 6); ctx.fillRect(x + 3, 5, 2, 6);
    ctx.fillText(String(game.ammo.bullets), x + 9, 8);
    x += 34;
    ctx.fillStyle = fl && fl.what === "tnt" && fl.t % 8 < 4 ? C.text : C.danger;
    ctx.fillRect(x, 4, 4, 8);
    ctx.fillStyle = C.text;
    ctx.fillText(String(game.ammo.tnt), x + 9, 8);
    x += 34;
    // morts
    ctx.fillStyle = C.text;
    ctx.beginPath(); ctx.arc(x + 3, 7, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(x + 1, 9, 5, 3);
    ctx.fillStyle = C.bg; ctx.fillRect(x + 1, 6, 2, 2); ctx.fillRect(x + 4, 6, 2, 2);
    ctx.fillStyle = C.text;
    ctx.fillText(String(game.totalDeaths), x + 11, 8);
  }

  function wrapText(text, maxW) {
    const words = text.split(" "), lines = [];
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
      else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  function drawSpeech() {
    if (R.say) {
      const s = R.say;
      const shown = Math.min(s.text.length, Math.floor(s.t * 1.2));
      const a = Math.min(1, (s.dur - s.t) / 20);
      ctx.globalAlpha = a;
      ctx.font = `8px ${FONT_TXT}`;
      const lines = wrapText(s.text, 300);
      const bw = 320, bh = 16 + lines.length * 11;
      const bx = (W - bw) / 2, by = 22;
      ctx.fillStyle = "rgba(6,10,8,0.85)";
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = C.god;
      ctx.fillRect(bx, by, 2, bh);
      ctx.font = `6px ${FONT_PIX}`;
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText("TRICKSTER-KA", bx + 10, by + 4);
      ctx.font = `8px ${FONT_TXT}`;
      ctx.fillStyle = C.text;
      let left = shown;
      lines.forEach((ln, i) => {
        const part = ln.slice(0, Math.max(0, left));
        left -= ln.length + 1;
        ctx.fillText(part, bx + 10, by + 13 + i * 11);
      });
      ctx.globalAlpha = 1;
    }
    if (R.hint && game.mode === "play") {
      const h = R.hint;
      const a = Math.min(1, h.t / 10, (h.dur - h.t) / 20);
      ctx.globalAlpha = a;
      ctx.font = `8px ${FONT_TXT}`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const w = ctx.measureText(h.text).width + 16;
      ctx.fillStyle = "rgba(6,10,8,0.75)";
      ctx.fillRect((W - w) / 2, H - 46, w, 14);
      ctx.fillStyle = C.hint;
      ctx.fillText(h.text, W / 2, H - 39);
      ctx.globalAlpha = 1;
    }
  }

  function drawCard() {
    const t = game.cardT;
    const a = t < 60 ? 1 : 1 - (t - 60) / 15;
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const ty = TYPES[R.def.type];
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `8px ${FONT_PIX}`;
    ctx.fillStyle = C.dim;
    ctx.fillText(`ACTE 1  ·  SALLE ${R.index + 1} SUR ${ROOMS.length}`, W / 2, H / 2 - 30);
    ctx.font = `16px ${FONT_PIX}`;
    ctx.fillStyle = C.text;
    ctx.fillText(R.def.name.toUpperCase(), W / 2, H / 2 - 6);
    ctx.font = `8px ${FONT_PIX}`;
    const lw = ctx.measureText(ty.label.toUpperCase()).width + 16;
    ctx.fillStyle = ty.color;
    ctx.fillRect((W - lw) / 2, H / 2 + 16, lw, 14);
    ctx.fillStyle = C.bg;
    ctx.fillText(ty.label.toUpperCase(), W / 2, H / 2 + 23.5);
    ctx.globalAlpha = 1;
  }

  /* ================= Interface DOM ================= */
  const overlays = {
    titre: document.getElementById("ecran-titre"),
    pause: document.getElementById("ecran-pause"),
    fin: document.getElementById("ecran-fin"),
  };
  function showOverlay(name) {
    for (const k in overlays) overlays[k].hidden = k !== name;
    document.body.classList.toggle("en-jeu", !name);
  }

  function togglePause() {
    if (game.mode === "title" || game.mode === "end") return;
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
    document.querySelectorAll("[data-son]").forEach((b) => {
      b.textContent = muted ? "Son : coupé" : "Son : activé";
      b.setAttribute("aria-pressed", String(!muted));
    });
  }

  function fmtTime(frames) {
    const s = Math.floor(frames / 60);
    return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`;
  }

  function showEnd() {
    document.getElementById("fin-morts").textContent = String(game.totalDeaths);
    document.getElementById("fin-temps").textContent = fmtTime(game.timer);
    const worst = game.deathsByRoom.indexOf(Math.max(...game.deathsByRoom));
    document.getElementById("fin-pire").textContent =
      game.totalDeaths ? `${ROOMS[worst].name} (${game.deathsByRoom[worst]} morts)` : "aucune, bravo";
    document.getElementById("fin-mot").textContent = game.totalDeaths === 0
      ? "« Zéro mort ? Tu as triché. C'est mon métier, pas le tien. »"
      : game.totalDeaths < 8
        ? "« Pas mal. L'acte 2 sera moins gentil. »"
        : "« Merci pour toutes ces chutes. J'ai beaucoup ri. »";
    showOverlay("fin");
  }

  document.getElementById("btn-jouer").addEventListener("click", startGame);
  document.getElementById("btn-rejouer").addEventListener("click", startGame);
  document.getElementById("btn-reprendre").addEventListener("click", togglePause);
  document.getElementById("btn-recommencer").addEventListener("click", () => { game.paused = false; restartRoom(); });
  document.getElementById("btn-pause").addEventListener("click", togglePause);
  document.querySelectorAll("[data-son]").forEach((b) => b.addEventListener("click", toggleMute));
  updateMuteLabel();

  const orient = document.getElementById("tourner");
  function checkOrientation() {
    const portrait = isTouch && window.innerHeight > window.innerWidth;
    orient.hidden = !portrait;
    if (portrait && game.mode !== "title" && game.mode !== "end" && !game.paused) togglePause();
  }

  /* ================= Boucle ================= */
  let last = performance.now(), acc = 0;
  function frame(now) {
    acc += Math.min(0.1, (now - last) / 1000);
    last = now;
    while (acc >= STEP) { update(); acc -= STEP; }
    render();
    requestAnimationFrame(frame);
  }

  function boot(saved) {
    if (saved && typeof saved.roomIndex === "number" && saved.mode && saved.mode !== "title") {
      Object.assign(game, { deathsByRoom: saved.deathsByRoom, totalDeaths: saved.totalDeaths, ammo: saved.entryAmmo, timer: saved.timer });
      enterRoom(saved.roomIndex);
      showOverlay(null);
    } else showOverlay("titre");
    window.claude?.hot?.snapshot?.(() => ({
      roomIndex: game.roomIndex, mode: game.mode, deathsByRoom: game.deathsByRoom,
      totalDeaths: game.totalDeaths, entryAmmo: game.entryAmmo, timer: game.timer,
    }));
    window.addEventListener("resize", resize);
    resize();
    requestAnimationFrame(frame);
  }

  const start = (data) => boot(data || null);
  if (document.fonts && document.fonts.load) {
    Promise.race([
      Promise.all([document.fonts.load(`8px "Silkscreen"`), document.fonts.load(`8px "JetBrains Mono"`)]),
      new Promise((r) => setTimeout(r, 1200)),
    ]).catch(() => {}).finally(go);
  } else go();
  function go() {
    window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
  }

  // exposé pour les tests automatisés
  window.__temple = { game, get room() { return R; }, ROOMS, input, pressed, startGame, enterRoom };
})();
