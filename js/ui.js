// Suivi Piano — briques d'interface réutilisables (formulaires, en-têtes, listes)

import { el } from "./util.js";

export function screen(titre, { actions = [], children = [], back = false } = {}) {
  return el("div.screen", [
    back
      ? el("button.back-link", { type: "button", onclick: () => history.back() }, "‹ Retour")
      : null,
    el("div.screen__head", [
      el("h2.screen__title", titre),
      actions.length ? el("div.screen__actions", actions) : null,
    ]),
    el("div.screen__body", children),
  ]);
}

/**
 * Section de formulaire repliable.
 * @param {string} titre
 * @param {Array} children
 * @param {{ ouvert?: boolean }} opts
 */
export function sectionPliable(titre, children, { ouvert = true } = {}) {
  const grid = el("div.form-section__grid", children);
  grid.hidden = !ouvert;
  const chevron = el("span.form-section__chevron", ouvert ? "▾" : "▸");
  const toggle = el("button.form-section__toggle", {
    type: "button",
    onclick: () => {
      grid.hidden = !grid.hidden;
      chevron.textContent = grid.hidden ? "▸" : "▾";
    },
  }, [el("span", titre), chevron]);
  return el("fieldset.form-section.form-section--pliable", [toggle, grid]);
}

export function btn(label, { onClick, variant = "primary", type = "button", small = false } = {}) {
  return el(
    "button.btn",
    {
      type,
      class: `btn--${variant}${small ? " btn--sm" : ""}`,
      onclick: onClick,
    },
    label
  );
}

export function fieldText(label, value, onInput, opts = {}) {
  const input = el("input.field__input", {
    type: opts.type || "text",
    value: value ?? "",
    placeholder: opts.placeholder || "",
    inputmode: opts.inputmode || null,
    oninput: (e) => onInput(e.target.value),
  });
  return el("label.field", [el("span.field__label", label), input]);
}

export function fieldNumber(label, value, onInput, opts = {}) {
  return fieldText(label, value ?? "", (v) => onInput(v === "" ? null : Number(v)), {
    ...opts,
    type: "number",
    inputmode: "decimal",
  });
}

export function fieldSelect(label, value, options, onChange, opts = {}) {
  const sel = el("select.field__input", {
    onchange: (e) => onChange(e.target.value),
  });
  if (opts.allowEmpty) sel.appendChild(el("option", { value: "" }, opts.emptyLabel || "—"));
  for (const [val, text] of options) {
    sel.appendChild(el("option", { value: val, selected: String(val) === String(value) }, text));
  }
  return el("label.field", [el("span.field__label", label), sel]);
}

export function fieldCheckbox(label, checked, onChange, hint) {
  return el("label.field.field--check", [
    el("input", {
      type: "checkbox",
      checked: !!checked,
      onchange: (e) => onChange(e.target.checked),
    }),
    el("span.field__label", label),
    hint ? el("span.field__hint", hint) : null,
  ]);
}

export function fieldTextarea(label, value, onInput, opts = {}) {
  return el("label.field", [
    el("span.field__label", label),
    el("textarea.field__input.field__input--area", {
      rows: opts.rows || 4,
      placeholder: opts.placeholder || "",
      value: value ?? "",
      oninput: (e) => onInput(e.target.value),
    }),
  ]);
}

export function formSection(titre, children, opts = {}) {
  return el("fieldset.form-section", { class: opts.inset ? "form-section--inset" : "" }, [
    titre ? el("legend.form-section__title", titre) : null,
    el("div.form-section__grid", children),
  ]);
}

export function row(children) {
  return el("div.form-row", children);
}

export function emptyState(message, action) {
  return el("div.empty", [el("p", message), action || null]);
}

export function chip(text, kind = "") {
  return el("span.chip", { class: kind ? `chip--${kind}` : "" }, text);
}

export function listItem({ title, subtitle, meta, onClick, badges = [] }) {
  return el("button.list-item", { onclick: onClick }, [
    el("div.list-item__main", [
      el("div.list-item__title", [title, ...badges]),
      subtitle ? el("div.list-item__sub", subtitle) : null,
    ]),
    meta ? el("div.list-item__meta", meta) : null,
  ]);
}
