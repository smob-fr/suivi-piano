// Suivi Piano — écrans encore à construire

import { el } from "../util.js";
import { screen } from "../ui.js";

export function placeholderScreen(titre, etape) {
  return screen(titre, {
    children: [
      el("div.empty", [
        el("p", `« ${titre} » sera disponible à l'étape ${etape} du plan de construction.`),
        el("p.field__hint", "Voir docs/cahier-des-charges.md, section 15."),
      ]),
    ],
  });
}
