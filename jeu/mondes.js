/* Max et l'Œil de Jade : la carte des mondes et le chemin des niveaux d'un monde.
 * Dessin en SVG (net à toutes les tailles). Le jeu branche ce module avec MondesUI.init(api). */
(function () {
  "use strict";
  const NIV = 20;
  const MONDES = [
    { id: "inca", num: 1, nom: "L'Empire inca", sous: "Temples dans la jungle", couleur: "#d9a441", fonce: "#2f5d3a", x: 250, y: 470 },
    { id: "himalaya", num: 2, nom: "Les neiges de l'Himalaya", sous: "Glaciers et monastères", couleur: "#9fc4dd", fonce: "#35597a", x: 560, y: 235 },
    { id: "abysses", num: 3, nom: "Les abysses", sous: "La cité engloutie", couleur: "#56c1c9", fonce: "#0b2a3c", x: 800, y: 520 },
    { id: "nuages", num: 4, nom: "Le royaume des nuages", sous: "Les îles du ciel", couleur: "#f2b8d8", fonce: "#5a6db0", x: 1060, y: 205 },
    { id: "cite", num: 5, nom: "La cité d'or", sous: "Au cœur du volcan", couleur: "#f2c14e", fonce: "#6b1d0c", x: 1340, y: 455 },
  ];
  MONDES.forEach((m, k) => { m.debut = k * NIV; });

  let api = null;
  let mondeCourant = 0, choix = 0, enCours = null;
  const $ = (id) => document.getElementById(id);

  /* ---------- état du joueur ---------- */
  const ouvert = (i) => api.progress.tester || i <= api.progress.unlocked;
  const fini = (i) => api.progress.best[i] != null || !!(api.progress.stats[i] && api.progress.stats[i].fini);
  const mondeOuvert = (k) => ouvert(MONDES[k].debut);
  const finis = (k) => { let n = 0; for (let i = 0; i < NIV; i++) if (fini(MONDES[k].debut + i)) n++; return n; };
  const niveauActuel = () => Math.min(api.LEVELS.length - 1, api.progress.unlocked);
  const mondeDe = (i) => Math.max(0, Math.min(MONDES.length - 1, Math.floor(i / NIV)));
  const genre = (n) => (n === NIV ? "boss" : n === NIV - 1 ? "epreuve" : n % 5 === 0 ? "histoire" : n % 3 === 0 ? "defi" : "");

  /* ---------- petites aides SVG ---------- */
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  function lignes(txt, max) {
    const mots = String(txt).split(" "), out = [];
    let l = "";
    for (const m of mots) { if ((l + " " + m).trim().length > max && l) { out.push(l); l = m; } else l = (l + " " + m).trim(); }
    if (l) out.push(l);
    return out;
  }
  function alea(seed) { let s = seed; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }
  const DEFS = `
    <filter id="mo-ombre" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#1a0f06" flood-opacity=".45"/></filter>
    <filter id="mo-ombre-p" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#1a0f06" flood-opacity=".5"/></filter>
    <filter id="mo-grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .35  0 0 0 0 .24  0 0 0 0 .12  0 0 0 .22 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
    <filter id="mo-flou"><feGaussianBlur stdDeviation="14"/></filter>
    <radialGradient id="mo-parchemin" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#f6e8c4"/><stop offset=".7" stop-color="#e9d3a0"/><stop offset="1" stop-color="#c9a76a"/></radialGradient>
    <radialGradient id="mo-mer" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="#8fc2c2"/><stop offset="1" stop-color="#4f8a96"/></radialGradient>
    <pattern id="mo-vagues" width="60" height="26" patternUnits="userSpaceOnUse"><path d="M0 13 q15 -9 30 0 t30 0" fill="none" stroke="#e8f4ee" stroke-opacity=".35" stroke-width="2.2"/></pattern>
    <linearGradient id="mo-or" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset=".55" stop-color="#e2a640"/><stop offset="1" stop-color="#9c6418"/></linearGradient>
    <linearGradient id="mo-pierre" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a99579"/><stop offset="1" stop-color="#6e5a42"/></linearGradient>
    <linearGradient id="mo-ruban" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8402f"/><stop offset="1" stop-color="#7d2418"/></linearGradient>`;

  /* emblèmes des médaillons */
  function embleme(id, r) {
    const s = r / 30;
    const g = {
      inca: `<circle r="11" fill="#ffd34a"/>${[...Array(12)].map((_, i) => `<rect x="-2" y="-21" width="4" height="8" rx="1" fill="#ffd34a" transform="rotate(${i * 30})"/>`).join("")}<circle cx="-4" cy="-2" r="1.8" fill="#7a4a12"/><circle cx="4" cy="-2" r="1.8" fill="#7a4a12"/><path d="M-5 4 q5 4 10 0" stroke="#7a4a12" stroke-width="2" fill="none"/>`,
      himalaya: `<path d="M-20 14 L-6 -10 L2 2 L8 -6 L20 14Z" fill="#e9f1f7" stroke="#35597a" stroke-width="2"/><path d="M-10 -3 L-6 -10 L-2 -3Z M5 -2 L8 -6 L11 -2Z" fill="#fff"/>`,
      abysses: `<path d="M0 -16 C12 -16 18 -2 14 8 C10 16 -10 16 -14 8 C-18 -2 -12 -16 0 -16Z" fill="#f2b9a0" stroke="#8a4a3a" stroke-width="2"/>${[-8, -3, 2, 7].map((x) => `<path d="M0 -14 L${x * 1.6} 13" stroke="#8a4a3a" stroke-width="1.4"/>`).join("")}`,
      nuages: `<g fill="#fff" stroke="#8fa8e8" stroke-width="2"><circle cx="-8" cy="2" r="9"/><circle cx="4" cy="-4" r="11"/><circle cx="12" cy="4" r="7"/><rect x="-14" y="2" width="28" height="9" rx="4" stroke="none"/></g>`,
      cite: `<path d="M-18 0 Q0 -16 18 0 Q0 16 -18 0Z" fill="#fff4cf" stroke="#8c2a12" stroke-width="2"/><circle r="7" fill="#2fbf7f"/><circle r="3" fill="#0d3a24"/><circle cx="-2" cy="-2" r="1.3" fill="#fff"/>`,
    }[id];
    return `<g transform="scale(${s})">${g}</g>`;
  }

  /* ---------- la grande carte ---------- */
  function decorMonde(m) {
    const { x, y } = m, r = alea(m.num * 7);
    switch (m.id) {
      case "inca": {
        let s = "";
        for (let i = 0; i < 16; i++) {
          const a = r() * Math.PI * 2, d = 70 + r() * 90, tx = x + Math.cos(a) * d * 1.3, ty = y + Math.sin(a) * d * 0.6 + 10, k = 0.8 + r() * 0.6;
          s += `<g transform="translate(${tx.toFixed(0)} ${ty.toFixed(0)}) scale(${k.toFixed(2)})"><rect x="-2.5" y="-2" width="5" height="16" fill="#5a3a1a"/><circle cy="-8" r="14" fill="#3f7a45"/><circle cx="-8" cy="-3" r="10" fill="#2f5d3a"/><circle cx="6" cy="-12" r="7" fill="#5f9a55"/></g>`;
        }
        s += `<g transform="translate(${x - 4} ${y - 78})" filter="url(#mo-ombre-p)"><path d="M-74 58 h148 l-14 -16 h-120z M-60 42 h120 l-14 -16 h-92z M-46 26 h92 l-14 -16 h-64z M-32 10 h64 v-26 h-64z" fill="#d6b05a" stroke="#7a5420" stroke-width="2.5"/><path d="M-60 42 h120 M-46 26 h92" stroke="#a8823a" stroke-width="2"/><rect x="-10" y="-12" width="20" height="22" fill="#3a2a14"/><path d="M-6 58 v-16 h12 v16" fill="#3a2a14"/><path d="M-36 -16 h72 v-6 h-72z" fill="#e8c06a"/></g>`;
        s += `<path d="M${x - 170} ${y + 60} q40 -20 80 0 t80 0" fill="none" stroke="#4f8a96" stroke-width="7" stroke-linecap="round" opacity=".8"/>`;
        return s;
      }
      case "himalaya": {
        let s = "";
        for (const [dx, dy, k] of [[-120, -10, 1], [-40, -46, 1.5], [60, -30, 1.25], [140, 4, 0.95], [-170, 30, 0.8]]) {
          s += `<g transform="translate(${x + dx} ${y + dy}) scale(${k})"><path d="M-62 52 L0 -44 L62 52Z" fill="#8aa6bd"/><path d="M0 -44 L62 52 L10 52Z" fill="#6c8aa3"/><path d="M-21 -11 L0 -44 L21 -11 L11 -16 L4 -8 L-4 -18 L-11 -9Z" fill="#fff"/></g>`;
        }
        const cols = ["#c0392b", "#f2c14e", "#3d8b5a", "#3d6c8c", "#ffffff"];
        s += `<path d="M${x - 70} ${y + 52} q40 18 80 0 q40 18 80 0" fill="none" stroke="#5a3a1a" stroke-width="1.6"/>`;
        for (let i = 0; i < 9; i++) s += `<path d="M${x - 66 + i * 18} ${y + 54 + Math.sin(i / 1.4) * 5} l12 0 l-2 12 l-8 0z" fill="${cols[i % 5]}"/>`;
        s += `<g transform="translate(${x + 120} ${y + 50})"><rect x="-22" y="-14" width="44" height="22" fill="#c0392b" stroke="#5a1a10" stroke-width="2"/><path d="M-28 -14 h56 l-28 -16z" fill="#f2c14e" stroke="#5a1a10" stroke-width="2"/><rect x="-5" y="-6" width="10" height="14" fill="#3a1a10"/></g>`;
        return s;
      }
      case "abysses": {
        let s = `<ellipse cx="${x}" cy="${y + 8}" rx="190" ry="92" fill="#1f6f8b" stroke="#0b2a3c" stroke-width="4"/><ellipse cx="${x}" cy="${y + 8}" rx="190" ry="92" fill="url(#mo-vagues)"/><ellipse cx="${x}" cy="${y + 8}" rx="150" ry="66" fill="#0e4560" opacity=".55"/>`;
        s += `<g opacity=".85"><rect x="${x - 120}" y="${y - 14}" width="16" height="70" fill="#7fb7bf"/><rect x="${x - 96}" y="${y - 2}" width="16" height="58" fill="#7fb7bf"/><path d="M${x - 128} ${y - 14} h56 l-28 -18z" fill="#9fd3d8"/><path d="M${x + 80} ${y + 30} q20 -40 50 -10 q10 20 -30 30z" fill="#6b4a30"/><path d="M${x + 96} ${y + 4} v-40 l30 22z" fill="#e8dcc0"/></g>`;
        for (let i = 0; i < 12; i++) s += `<circle cx="${(x - 160 + r() * 320).toFixed(0)}" cy="${(y - 50 + r() * 110).toFixed(0)}" r="${(2 + r() * 5).toFixed(1)}" fill="none" stroke="#cdeff2" stroke-width="1.5" opacity=".8"/>`;
        s += `<g transform="translate(${x - 40} ${y + 50})"><path d="M0 0 q16 -13 32 0 q-16 13 -32 0z M32 0 l11 -8 v16z" fill="#f28c6b"/><circle cx="8" cy="-2" r="2" fill="#2a1a10"/></g><g transform="translate(${x + 30} ${y - 30})"><path d="M0 0 q12 -10 24 0 q-12 10 -24 0z M24 0 l9 -6 v12z" fill="#f2e6a0"/></g>`;
        return s;
      }
      case "nuages": {
        let s = "";
        s += `<g transform="translate(${x} ${y - 8})">${["#f28fb8", "#f6a96b", "#ffd36b", "#9fd6a0", "#8fb8e8", "#b49ae6"].map((c, i) => `<path d="M${-150 + i * 9} 40 A${150 - i * 9} ${118 - i * 9} 0 0 1 ${150 - i * 9} 40" fill="none" stroke="${c}" stroke-width="9" opacity=".9"/>`).join("")}</g>`;
        for (const [dx, dy, k] of [[-150, 40, 1.2], [140, 30, 1.05], [-20, 62, 1.4], [70, -70, 0.8], [-110, -60, 0.7]]) {
          s += `<g transform="translate(${x + dx} ${y + dy}) scale(${k})" filter="url(#mo-ombre-p)"><ellipse rx="46" ry="15" fill="#fdf8ff"/><circle cx="-18" cy="-9" r="17" fill="#fdf8ff"/><circle cx="12" cy="-14" r="21" fill="#fdf8ff"/><ellipse rx="44" ry="5" cy="10" fill="#d8dcf5"/></g>`;
        }
        s += `<g transform="translate(${x + 170} ${y - 40})"><path d="M-16 0 a16 18 0 1 1 32 0 q0 12 -16 22 q-16 -10 -16 -22z" fill="#e8624a"/><path d="M-8 22 l3 14 h10 l3 -14" fill="none" stroke="#5a3a1a" stroke-width="1.5"/><rect x="-6" y="35" width="12" height="9" fill="#8a5a2b"/></g>`;
        return s;
      }
      case "cite": {
        let s = `<g transform="translate(${x + 10} ${y - 70})" filter="url(#mo-ombre-p)"><path d="M-150 96 L-40 -40 L40 -40 L150 96Z" fill="#6b3a24"/><path d="M-40 -40 L40 -40 L150 96 L60 96Z" fill="#552c1a"/><path d="M-40 -40 L-22 -2 L-6 -22 L10 6 L24 -16 L40 -40Z" fill="#e8621f"/><path d="M-30 -40 L-18 -14 L-4 -30 L10 -8 L22 -30 L30 -40Z" fill="#ffb347"/><path d="M-20 -52 q-18 -30 10 -54 q-8 26 20 46" fill="#8a7d74" opacity=".55"/><path d="M14 -48 q14 -24 -4 -42 q18 10 16 40" fill="#8a7d74" opacity=".45"/></g>`;
        s += `<g transform="translate(${x + 10} ${y + 6})"><path d="M-62 30 v-34 h124 v34z" fill="#f2c14e" stroke="#8c2a12" stroke-width="2.5"/><path d="M-72 -4 h144 l-72 -30z" fill="#ffd97a" stroke="#8c2a12" stroke-width="2.5"/>${[-44, -18, 18, 44].map((cx) => `<rect x="${cx - 4}" y="-2" width="8" height="30" fill="#e2a640"/>`).join("")}<rect x="-9" y="8" width="18" height="22" fill="#5a1a0c"/><circle cy="-14" r="6" fill="#2fbf7f" stroke="#0d3a24" stroke-width="1.5"/></g>`;
        s += `<path d="M${x + 60} ${y + 26} q34 26 0 56 q-30 26 16 56" fill="none" stroke="#e8621f" stroke-width="8" stroke-linecap="round" opacity=".85"/><path d="M${x + 60} ${y + 26} q34 26 0 56 q-30 26 16 56" fill="none" stroke="#ffd34a" stroke-width="2.5" stroke-linecap="round"/>`;
        return s;
      }
    }
    return "";
  }

  function svgCarte(depuis) {
    const W = 1600, H = 720;
    const actuel = mondeDe(niveauActuel());
    const tout = api.progress.finished;
    const s = [`<svg viewBox="0 0 ${W} ${H}" class="mo-svg" role="group" aria-label="Carte des mondes"><defs>${DEFS}</defs>`];
    // parchemin aux bords déchirés
    s.push(`<path d="M30 40 Q200 18 400 34 T800 26 T1200 36 T1570 30 Q1590 200 1578 360 T1584 690 Q1200 706 800 694 T30 700 Q14 520 24 360 T30 40Z" fill="url(#mo-parchemin)" filter="url(#mo-ombre)"/>`);
    s.push(`<path d="M30 40 Q200 18 400 34 T800 26 T1200 36 T1570 30 Q1590 200 1578 360 T1584 690 Q1200 706 800 694 T30 700 Q14 520 24 360 T30 40Z" fill="#000" filter="url(#mo-grain)" opacity=".9"/>`);
    // mer
    s.push(`<path d="M70 80 Q800 60 1530 80 Q1550 380 1530 660 Q800 680 70 660 Q50 380 70 80Z" fill="url(#mo-mer)" opacity=".92"/><path d="M70 80 Q800 60 1530 80 Q1550 380 1530 660 Q800 680 70 660 Q50 380 70 80Z" fill="url(#mo-vagues)"/>`);
    // continent
    const terre = "M110 470 C110 360 230 330 300 360 C330 280 400 140 540 128 C660 118 700 210 680 300 C740 330 800 360 880 350 C900 260 960 120 1080 112 C1200 106 1220 220 1180 300 C1270 290 1400 290 1480 360 C1540 420 1520 560 1430 600 C1330 640 1180 620 1100 640 C1000 664 880 660 800 640 C700 660 600 650 540 620 C450 650 330 650 250 620 C160 600 110 560 110 470Z";
    s.push(`<path d="${terre}" fill="#000" opacity=".18" transform="translate(6 10)"/><path d="${terre}" fill="#e6cf98" stroke="#7a5a2e" stroke-width="4"/><path d="${terre}" fill="none" stroke="#c9ad74" stroke-width="16" opacity=".35" transform="translate(0 0)"/>`);
    // teintes de régions
    s.push(`<ellipse cx="250" cy="480" rx="170" ry="120" fill="#6f9a4a" opacity=".45" filter="url(#mo-flou)"/><ellipse cx="560" cy="240" rx="170" ry="110" fill="#dfe9f2" opacity=".85" filter="url(#mo-flou)"/><ellipse cx="1060" cy="215" rx="190" ry="110" fill="#e9dcff" opacity=".7" filter="url(#mo-flou)"/><ellipse cx="1340" cy="450" rx="170" ry="120" fill="#c4572a" opacity=".45" filter="url(#mo-flou)"/>`);
    MONDES.forEach((m) => s.push(decorMonde(m)));
    // chemin
    const pts = MONDES.map((m) => [m.x, m.y]);
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; d += ` Q${(x0 + x1) / 2 + (i % 2 ? -40 : 40)} ${(y0 + y1) / 2 + (i % 2 ? 90 : -90)} ${x1} ${y1}`; }
    s.push(`<path d="${d}" fill="none" stroke="#f6e8c4" stroke-width="12" stroke-linecap="round" opacity=".7"/><path id="mo-route" d="${d}" fill="none" stroke="#8c2a12" stroke-width="6" stroke-dasharray="2 16" stroke-linecap="round"/>`);
    // îles futures
    for (const [x, y] of [[150, 160], [1450, 150], [1470, 650]]) {
      s.push(`<g opacity=".8"><ellipse cx="${x}" cy="${y}" rx="72" ry="34" fill="#d8c8a2" stroke="#8a7a5a" stroke-width="2.5" stroke-dasharray="8 7"/><text x="${x}" y="${y + 6}" class="mo-bientot" text-anchor="middle">bientôt…</text></g>`);
    }
    // titre
    s.push(`<g transform="translate(800 70)"><path d="M-300 -26 h600 l-26 26 l26 26 h-600 l26 -26z" fill="url(#mo-ruban)" filter="url(#mo-ombre-p)"/><path d="M-330 -14 h40 v40 h-40 l14 -20z M330 -14 h-40 v40 h40 l-14 -20z" fill="#5a1a10"/><text y="10" class="mo-titre" text-anchor="middle">La route de l'Œil de Jade</text></g>`);
    // rose des vents
    s.push(`<g transform="translate(1500 250)" opacity=".9"><circle r="46" fill="#f3e2b8" stroke="#7a5a2e" stroke-width="2.5"/><circle r="36" fill="none" stroke="#7a5a2e" stroke-width="1"/><path d="M0 -42 L9 0 L0 42 L-9 0Z" fill="#8c2a12"/><path d="M-42 0 L0 9 L42 0 L0 -9Z" fill="#3b2a1a"/><text y="-52" class="mo-petit" text-anchor="middle">N</text></g>`);
    // médaillons
    MONDES.forEach((m, k) => {
      const ouv = mondeOuvert(k), n = finis(k), fait = n === NIV;
      const R = 50, circ = 2 * Math.PI * (R + 7), part = circ * n / NIV;
      s.push(`<g class="mo-monde${ouv ? "" : " ferme"}" data-monde="${k}" tabindex="${ouv ? 0 : -1}" role="button" aria-label="Monde ${m.num} : ${esc(m.nom)}, ${ouv ? `${n} niveaux finis sur ${NIV}` : "fermé"}" transform="translate(${m.x} ${m.y})">
        <circle r="${R + 22}" fill="transparent"/>
        <circle r="${R + 7}" fill="#3b2a1a" opacity=".85" filter="url(#mo-ombre)"/>
        <circle r="${R + 7}" fill="none" stroke="${ouv ? "#ffd34a" : "#6b5a46"}" stroke-width="7" stroke-dasharray="${part.toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90)" stroke-linecap="round"/>
        <circle r="${R}" fill="${ouv ? m.fonce : "#5a5048"}" stroke="${ouv ? "url(#mo-or)" : "#3a3028"}" stroke-width="5"/>
        <circle r="${R - 8}" fill="${ouv ? m.couleur : "#857a6c"}" opacity=".35"/>
        <g opacity="${ouv ? 1 : 0.35}">${embleme(m.id, R)}</g>
        ${ouv ? "" : `<g transform="translate(0 4)"><rect x="-15" y="-6" width="30" height="24" rx="4" fill="#d9c9a8" stroke="#3a3028" stroke-width="2.5"/><path d="M-9 -6 v-8 a9 9 0 0 1 18 0 v8" fill="none" stroke="#d9c9a8" stroke-width="5"/><circle cy="5" r="3" fill="#3a3028"/></g>`}
        <g transform="translate(0 ${R + 34})"><path d="M-128 -20 h256 l-14 20 l14 20 h-256 l14 -20z" fill="${ouv ? "#f8ecc9" : "#d8ccb0"}" stroke="#7a5a2e" stroke-width="2.5" filter="url(#mo-ombre-p)"/><text y="7" class="mo-nom" text-anchor="middle">${esc(m.nom)}</text></g>
        <g transform="translate(0 ${R + 70})"><text class="mo-score" text-anchor="middle">${ouv ? `${fait ? "✦ " : ""}${n} / ${NIV} niveaux` : `Monde ${m.num} · fermé`}</text></g>
        <text x="${-R + 2}" y="${-R + 12}" class="mo-num" text-anchor="middle">${m.num}</text>
      </g>`);
    });
    // Max et Archibald
    const mx = depuis != null ? depuis : actuel;
    const archi = tout ? MONDES.length - 1 : Math.min(MONDES.length - 1, actuel + 1);
    const A = MONDES[archi];
    s.push(`<g class="mo-perso" transform="translate(${A.x + (archi === actuel ? 74 : 58)} ${A.y - 96})"><image href="${api.sprites.archibald}" x="-30" y="-36" width="60" height="72" preserveAspectRatio="xMidYMid meet" style="image-rendering:pixelated"/><g transform="translate(0 -48)"><rect x="-48" y="-14" width="96" height="22" rx="6" fill="#fff7df" stroke="#3b2a1a" stroke-width="1.5"/><text y="2" class="mo-etiq" text-anchor="middle">Archibald</text></g></g>`);
    const M = MONDES[mx];
    s.push(`<g id="mo-max" class="mo-perso" style="transform:translate(${M.x - 74}px,${M.y - 92}px)"><g class="mo-saut"><image href="${api.sprites.max}" x="-30" y="-36" width="60" height="72" preserveAspectRatio="xMidYMid meet" style="image-rendering:pixelated"/></g><g transform="translate(0 -48)"><rect x="-30" y="-14" width="60" height="22" rx="6" fill="#fff7df" stroke="#3b2a1a" stroke-width="1.5"/><text y="2" class="mo-etiq" text-anchor="middle">Max</text></g></g>`);
    s.push(`</svg>`);
    return s.join("");
  }

  /* ---------- le chemin d'un monde ---------- */
  function positions() {
    // trois lacets : 1→7 en bas, 8→14 au milieu (retour), 15→20 en haut
    const P = [];
    for (let i = 0; i < 7; i++) P.push([120 + i * 160, 600 - (i % 2) * 22]);
    for (let i = 0; i < 7; i++) P.push([1080 - i * 160, 420 - (i % 2) * 22]);
    for (let i = 0; i < 6; i++) P.push([160 + i * 170, 240 - (i % 2) * 22]);
    P[19] = [1040, 200];
    return P;
  }
  function chemin(P) {
    let d = `M${P[0][0]} ${P[0][1]}`;
    for (let i = 1; i < P.length; i++) {
      const [x0, y0] = P[i - 1], [x1, y1] = P[i];
      if (Math.abs(y1 - y0) > 100) { const side = x1 > 600 ? 1 : -1; d += ` C${x0 + side * 150} ${y0} ${x1 + side * 150} ${y1} ${x1} ${y1}`; }
      else d += ` Q${(x0 + x1) / 2} ${(y0 + y1) / 2 + 26} ${x1} ${y1}`;
    }
    return d;
  }
  function fondMonde(m) {
    const W = 1600, H = 720, r = alea(m.num * 13);
    switch (m.id) {
      case "inca": return `<linearGradient id="mo-c1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6c66b"/><stop offset=".5" stop-color="#e9925a"/><stop offset="1" stop-color="#7a4a2a"/></linearGradient>
        <rect width="${W}" height="${H}" fill="url(#mo-c1)"/><circle cx="1280" cy="150" r="90" fill="#ffe7a0" opacity=".85"/>
        <path d="M0 330 Q200 250 400 300 T800 280 T1200 300 T1600 260 V${H} H0Z" fill="#6d8a4a"/>
        <g transform="translate(1250 320)" opacity=".75"><path d="M-170 120 h340 l-28 -36 h-284z M-140 84 h280 l-28 -36 h-224z M-110 48 h220 l-28 -36 h-164z M-80 12 h160 v-50 h-160z" fill="#b08a4a"/><rect x="-22" y="-30" width="44" height="40" fill="#4a3018"/></g>
        <path d="M0 470 Q300 400 600 450 T1200 430 T1600 460 V${H} H0Z" fill="#3f6a35"/>
        ${[...Array(26)].map((_, i) => { const x = (i * 67 + r() * 40) % W, y = 470 + r() * 40, k = 0.8 + r() * 0.9; return `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${k.toFixed(2)})"><rect x="-4" y="-10" width="8" height="70" fill="#4a2e14"/><circle cy="-22" r="30" fill="#2f5d3a"/><circle cx="-18" cy="-8" r="20" fill="#3f7a45"/><circle cx="16" cy="-30" r="16" fill="#5f9a55"/></g>`; }).join("")}
        ${[...Array(9)].map((_, i) => `<path d="M${80 + i * 180} 0 q${-20 + r() * 40} 120 ${-10 + r() * 20} ${150 + r() * 120}" stroke="#2f5d3a" stroke-width="5" fill="none"/>`).join("")}
        <path d="M0 640 Q400 600 800 630 T1600 620 V${H} H0Z" fill="#2a4a24"/>`;
      case "himalaya": return `<linearGradient id="mo-c2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#27466a"/><stop offset=".6" stop-color="#7fa6c8"/><stop offset="1" stop-color="#dfeaf3"/></linearGradient>
        <rect width="${W}" height="${H}" fill="url(#mo-c2)"/>
        <path d="M0 120 Q400 60 800 110 T1600 90" stroke="#7fe0b0" stroke-width="18" fill="none" opacity=".35"/><path d="M0 150 Q400 100 800 140 T1600 120" stroke="#b49ae6" stroke-width="12" fill="none" opacity=".3"/>
        <path d="M0 420 L180 170 L330 360 L520 110 L720 380 L900 150 L1080 360 L1280 90 L1460 330 L1600 200 V${H} H0Z" fill="#8aa6bd"/>
        <path d="M150 210 L180 170 L210 210 L195 204 L180 220 L165 204Z M490 150 L520 110 L550 150 L535 144 L520 160 L505 144Z M870 190 L900 150 L930 190 L915 184 L900 200 L885 184Z M1250 130 L1280 90 L1310 130 L1295 124 L1280 140 L1265 124Z" fill="#fff"/>
        <path d="M0 520 Q400 440 800 500 T1600 470 V${H} H0Z" fill="#e9f1f7"/><path d="M0 640 Q400 590 800 630 T1600 610 V${H} H0Z" fill="#ffffff"/>
        ${[...Array(60)].map(() => `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * H).toFixed(0)}" r="${(1 + r() * 2.5).toFixed(1)}" fill="#fff" opacity=".85"/>`).join("")}`;
      case "abysses": return `<linearGradient id="mo-c3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a8aa8"/><stop offset=".45" stop-color="#0f4a66"/><stop offset="1" stop-color="#061a28"/></linearGradient>
        <rect width="${W}" height="${H}" fill="url(#mo-c3)"/>
        ${[...Array(7)].map((_, i) => `<path d="M${120 + i * 230} 0 L${200 + i * 230} ${H} L${270 + i * 230} ${H} L${170 + i * 230} 0Z" fill="#9fe6f0" opacity=".07"/>`).join("")}
        <g opacity=".5" fill="#0a3045"><rect x="1180" y="300" width="40" height="320"/><rect x="1260" y="340" width="40" height="280"/><rect x="1340" y="280" width="40" height="340"/><path d="M1160 300 h240 l-120 -70z"/></g>
        <path d="M0 610 Q300 570 600 600 T1200 590 T1600 610 V${H} H0Z" fill="#c9b07a" opacity=".55"/>
        ${[...Array(18)].map((_, i) => `<path d="M${40 + i * 92} ${H} q-16 -60 8 -${110 + r() * 60} q-20 60 6 ${110 + r() * 60}z" fill="${["#f28c6b", "#e8624a", "#c4577a"][i % 3]}" opacity=".9"/>`).join("")}
        ${[...Array(40)].map(() => `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * H).toFixed(0)}" r="${(2 + r() * 7).toFixed(1)}" fill="none" stroke="#bfeef2" stroke-width="1.5" opacity=".6"/>`).join("")}`;
      case "nuages": return `<linearGradient id="mo-c4" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fb8f2"/><stop offset=".6" stop-color="#d6c8f2"/><stop offset="1" stop-color="#fbd9e8"/></linearGradient>
        <rect width="${W}" height="${H}" fill="url(#mo-c4)"/><circle cx="1400" cy="130" r="70" fill="#fff3b0"/>
        ${["#f28fb8", "#f6a96b", "#ffd36b", "#9fd6a0", "#8fb8e8"].map((c, i) => `<path d="M${300 + i * 14} ${H} A${520 - i * 14} ${470 - i * 14} 0 0 1 ${1340 - i * 14} ${H}" fill="none" stroke="${c}" stroke-width="14" opacity=".45"/>`).join("")}
        ${[...Array(16)].map(() => { const x = r() * W, y = 60 + r() * 640, k = 0.6 + r() * 1.4; return `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${k.toFixed(2)})" opacity=".9"><ellipse rx="70" ry="22" fill="#fff"/><circle cx="-26" cy="-14" r="26" fill="#fff"/><circle cx="18" cy="-22" r="32" fill="#fff"/></g>`; }).join("")}`;
      case "cite": return `<linearGradient id="mo-c5" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a0f0a"/><stop offset=".6" stop-color="#6b1d0c"/><stop offset="1" stop-color="#e8621f"/></linearGradient>
        <rect width="${W}" height="${H}" fill="url(#mo-c5)"/>
        <g opacity=".75">${[...Array(9)].map((_, i) => `<rect x="${90 + i * 170}" y="${250 + (i % 3) * 40}" width="70" height="${H}" fill="#9c6418"/><path d="M${80 + i * 170} ${250 + (i % 3) * 40} h90 l-45 -40z" fill="#e2a640"/>`).join("")}</g>
        <path d="M0 620 Q300 580 600 610 T1200 600 T1600 620 V${H} H0Z" fill="#ff8a2a"/><path d="M0 650 Q300 620 600 645 T1200 640 T1600 650 V${H} H0Z" fill="#ffd34a" opacity=".7"/>
        ${[...Array(40)].map(() => `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * 600).toFixed(0)}" r="${(1 + r() * 2.5).toFixed(1)}" fill="#ffb347" opacity=".8"/>`).join("")}`;
    }
    return "";
  }

  function svgMonde(k) {
    const m = MONDES[k], W = 1600, H = 720, P = positions();
    const s = [`<svg viewBox="0 0 ${W} ${H}" class="mo-svg" role="group" aria-label="${esc(m.nom)} : les ${NIV} niveaux"><defs>${DEFS}</defs>`];
    s.push(`<g>${fondMonde(m)}</g><rect width="${W}" height="${H}" fill="#000" opacity=".12"/>`);
    const d = chemin(P);
    s.push(`<path d="${d}" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="30" stroke-linecap="round" transform="translate(0 6)"/><path d="${d}" fill="none" stroke="#e9d6a4" stroke-width="24" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#b89a62" stroke-width="3" stroke-dasharray="3 14" stroke-linecap="round"/>`);
    // la partie parcourue du chemin brille
    for (let i = 0; i < NIV; i++) {
      const idx = m.debut + i, n = i + 1, [x, y] = P[i], g = genre(n);
      const ouv = ouvert(idx), f = fini(idx), sel = idx === choix, act = idx === niveauActuel() && !api.progress.finished;
      const R = g === "boss" ? 48 : 34;
      const best = api.progress.best[idx];
      let fond = ouv ? "url(#mo-pierre)" : "#4a4038", bord = ouv ? "#3b2a1a" : "#2a221c";
      if (f) { fond = "url(#mo-or)"; bord = "#7a4a12"; }
      s.push(`<g class="mo-niv${ouv ? "" : " ferme"}${sel ? " choisi" : ""}${act ? " actuel" : ""}" data-niv="${idx}" tabindex="${ouv ? 0 : -1}" role="button" aria-pressed="${sel}" aria-label="Niveau ${n}${g === "boss" ? ", boss" : g === "defi" ? ", défi" : ""} : ${esc(api.LEVELS[idx] ? api.LEVELS[idx].name : "")}${ouv ? (f ? ", fini" : "") : ", fermé"}" transform="translate(${x} ${y})">
        <circle r="${R + 18}" fill="transparent"/>
        ${sel ? `<circle r="${R + 12}" fill="none" stroke="#fff3c4" stroke-width="5" class="mo-halo"/>` : ""}
        <ellipse cy="${R * 0.55}" rx="${R + 4}" ry="${R * 0.45}" fill="#000" opacity=".3"/>
        <circle r="${R}" fill="${fond}" stroke="${bord}" stroke-width="4"/>
        <circle r="${R - 6}" fill="none" stroke="#fff" stroke-opacity="${ouv ? 0.35 : 0.1}" stroke-width="2"/>
        ${g === "defi" && ouv ? `<circle r="${R + 5}" fill="none" stroke="#c8432f" stroke-width="4"/>` : ""}
        ${g === "boss" ? `<g transform="translate(0 -2)" opacity="${ouv ? 1 : 0.45}">${embleme(m.id, 30)}</g>` : `<text y="11" class="mo-chiffre${ouv ? "" : " eteint"}" text-anchor="middle">${n}</text>`}
        ${!ouv ? `<g transform="translate(${R * 0.62} ${-R * 0.62})"><circle r="13" fill="#2a221c"/><rect x="-6" y="-2" width="12" height="10" rx="2" fill="#d9c9a8"/><path d="M-4 -2 v-3 a4 4 0 0 1 8 0 v3" fill="none" stroke="#d9c9a8" stroke-width="2.4"/></g>` : ""}
        ${g === "histoire" ? `<g transform="translate(${-R * 0.7} ${-R * 0.7})"><circle r="13" fill="#3d6c8c"/><path d="M-7 -5 h6 q1 0 1 1 v10 q0 -1 -1 -1 h-6z M7 -5 h-6 q-1 0 -1 1 v10 q0 -1 1 -1 h6z" fill="#fff"/></g>` : ""}
        ${f && best != null ? `<g transform="translate(0 ${R + 18})"><rect x="-26" y="-13" width="52" height="22" rx="11" fill="#1d140d" opacity=".75"/><text y="3" class="mo-record" text-anchor="middle">☠ ${best}</text></g>` : ""}
        ${g === "boss" ? `<g transform="translate(0 ${R + 22})"><rect x="-34" y="-14" width="68" height="24" rx="6" fill="#6b3fa0"/><text y="3" class="mo-record" text-anchor="middle">BOSS</text></g>` : ""}
      </g>`);
    }
    // Max sur le niveau à jouer (ou sur le dernier fini)
    const ici = Math.min(m.debut + NIV - 1, Math.max(m.debut, niveauActuel()));
    if (ouvert(ici) && mondeDe(niveauActuel()) >= k) {
      const [x, y] = P[ici - m.debut];
      s.push(`<g class="mo-perso" transform="translate(${x} ${y - 78})"><g class="mo-saut"><image href="${api.sprites.max}" x="-30" y="-36" width="60" height="72" preserveAspectRatio="xMidYMid meet" style="image-rendering:pixelated"/></g></g>`);
    }
    // cartouche du niveau choisi
    const lv = api.LEVELS[choix] || {}, n = choix - m.debut + 1, g = genre(n);
    const best = api.progress.best[choix], st = api.progress.stats[choix];
    const titre = lignes(lv.name || "", 16);
    const typeTxt = g === "boss" ? "Boss du monde" : g === "epreuve" ? "La grande épreuve" : g === "histoire" ? "Niveau d'histoire" : g === "defi" ? "Défi" : "Niveau";
    s.push(`<g transform="translate(1250 210)" filter="url(#mo-ombre)">
      <path d="M0 0 h310 v330 h-310z" fill="#f3e2b8" stroke="#7a5a2e" stroke-width="4"/>
      <path d="M0 0 h310 v330 h-310z" fill="#000" filter="url(#mo-grain)"/>
      <rect x="0" y="0" width="310" height="54" fill="${m.fonce}"/>
      <text x="155" y="36" class="mo-cart-num" text-anchor="middle">${typeTxt} ${n} / ${NIV}</text>
      ${titre.map((l, i) => `<text x="155" y="${98 + i * 34}" class="mo-cart-titre" text-anchor="middle">${esc(l)}</text>`).join("")}
      <text x="155" y="${110 + titre.length * 34}" class="mo-cart-info" text-anchor="middle">${fini(choix) ? `Fini · record : ${best ?? "?"} chute${best > 1 ? "s" : ""}` : st && st.essais ? `${st.morts || 0} chute${st.morts > 1 ? "s" : ""} pour l'instant` : "Jamais joué"}</text>
      <g class="mo-jouer" data-jouer="${choix}" tabindex="0" role="button" aria-label="Jouer le niveau ${n}" transform="translate(155 270)">
        <rect x="-110" y="-32" width="220" height="64" rx="6" fill="url(#mo-or)" stroke="#6e4313" stroke-width="3"/>
        <text y="12" class="mo-jouer-txt" text-anchor="middle">JOUER</text>
      </g>
    </g>`);
    // titre du monde
    s.push(`<g transform="translate(800 60)"><path d="M-330 -28 h660 l-26 28 l26 28 h-660 l26 -28z" fill="url(#mo-ruban)" filter="url(#mo-ombre-p)"/><text y="11" class="mo-titre" text-anchor="middle">Monde ${m.num} · ${esc(m.nom)}</text></g>`);
    s.push(`<text x="800" y="116" class="mo-sous" text-anchor="middle">${finis(k)} / ${NIV} niveaux finis</text>`);
    s.push(`</svg>`);
    return s.join("");
  }

  let msgT = 0;
  function message(t) {
    const p = $("mondes-msg"); p.textContent = t; p.hidden = false;
    clearTimeout(msgT); msgT = setTimeout(() => { p.hidden = true; }, 2200);
  }

  /* ---------- écrans ---------- */
  function afficherCarte(depuis) {
    enCours = "carte";
    const box = $("mondes-carte");
    box.innerHTML = svgCarte(depuis);
    api.showOverlay("mondes");
    $("btn-mondes-prec").hidden = $("btn-mondes-suiv").hidden = true;
    if (depuis != null) {
      // Max avance jusqu'au monde suivant
      const vers = MONDES[mondeDe(niveauActuel())], max = document.getElementById("mo-max");
      requestAnimationFrame(() => requestAnimationFrame(() => { if (max) max.style.transform = `translate(${vers.x - 74}px,${vers.y - 92}px)`; }));
      if (MONDES[depuis + 1]) setTimeout(() => message(`Monde ${depuis + 2} ouvert : ${MONDES[depuis + 1].nom} !`), 1700);
    }
  }
  function afficherMonde(k, garderChoix) {
    enCours = "monde";
    mondeCourant = k;
    const m = MONDES[k];
    if (!garderChoix || choix < m.debut || choix >= m.debut + NIV || !ouvert(choix)) {
      const a = niveauActuel();
      choix = a >= m.debut && a < m.debut + NIV ? a : m.debut;
      if (!ouvert(choix)) choix = m.debut;
    }
    $("mondes-carte").innerHTML = svgMonde(k);
    api.showOverlay("mondes");
    $("btn-mondes-prec").hidden = k === 0;
    $("btn-mondes-suiv").hidden = k === MONDES.length - 1 || !mondeOuvert(k + 1);
  }
  function activer(cible) {
    const g = cible.closest("[data-monde],[data-niv],[data-jouer]");
    if (!g) return;
    if (g.dataset.jouer != null) { api.playFrom(Number(g.dataset.jouer)); return; }
    if (g.classList.contains("ferme")) { message(g.dataset.monde != null ? "Finis le monde précédent pour ouvrir celui-ci." : "Finis d'abord le niveau précédent."); return; }
    if (g.dataset.monde != null) { afficherMonde(Number(g.dataset.monde)); return; }
    const i = Number(g.dataset.niv);
    if (i === choix) { api.playFrom(i); return; }   // deuxième appui : on joue
    choix = i; afficherMonde(mondeCourant, true);
    const nv = document.querySelector(`[data-niv="${i}"]`); if (nv) nv.focus({ preventScroll: true });
  }

  function init(a) {
    api = a;
    const box = $("mondes-carte");
    box.addEventListener("click", (e) => activer(e.target));
    box.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activer(e.target); } });
    $("btn-mondes-retour").addEventListener("click", () => { if (enCours === "monde") afficherCarte(); else api.goHome(); });
    $("btn-mondes-prec").addEventListener("click", () => afficherMonde(Math.max(0, mondeCourant - 1)));
    $("btn-mondes-suiv").addEventListener("click", () => afficherMonde(Math.min(MONDES.length - 1, mondeCourant + 1)));
  }
  // monde fini : on montre Max qui avance sur la carte
  function finDeMonde(i) { afficherCarte(mondeDe(i)); }
  const finitUnMonde = (i) => (i + 1) % NIV === 0 && i + 1 < MONDES.length * NIV;

  window.MondesUI = { init, afficherCarte, afficherMonde, finDeMonde, finitUnMonde, mondeDe, MONDES, NIV, get ecran() { return enCours; } };
})();
