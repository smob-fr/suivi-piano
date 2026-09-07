// Suivi Piano — routeur minimal basé sur le hash (#/chemin)

const routes = [];
let notFound = null;
let onChange = null;
let mountEl = null;

export function initRouter(el, { onNavigate } = {}) {
  mountEl = el;
  onChange = onNavigate || null;
  window.addEventListener("hashchange", render);
  window.addEventListener("load", render);
}

export function route(pattern, handler) {
  // pattern : "/eleves" ou "/eleves/:id"
  const keys = [];
  const rx = new RegExp(
    "^" +
      pattern.replace(/:[^/]+/g, (m) => {
        keys.push(m.slice(1));
        return "([^/]+)";
      }) +
      "$"
  );
  routes.push({ rx, keys, handler, pattern });
}

export function setNotFound(handler) {
  notFound = handler;
}

export function navigate(path) {
  if (location.hash.slice(1) === path) render();
  else location.hash = path;
}

export function currentPath() {
  return location.hash.slice(1) || "/";
}

export async function render() {
  const path = currentPath();
  let matched = null;
  let params = {};
  for (const r of routes) {
    const m = path.match(r.rx);
    if (m) {
      matched = r;
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      break;
    }
  }
  const handler = matched ? matched.handler : notFound;
  if (!handler || !mountEl) return;

  mountEl.scrollTop = 0;
  const view = await handler(params);
  mountEl.replaceChildren(view instanceof Node ? view : document.createTextNode(String(view ?? "")));
  if (onChange) onChange(path, matched?.pattern || null);
}
