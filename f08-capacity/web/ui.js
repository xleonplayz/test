export const $ = (id) => document.getElementById(id);
export function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text !== undefined && text !== null) e.textContent = String(text);
  if (cls) e.className = cls;
  return e;
}
export function button(label, fn, cls = "") {
  const b = el("button", label, cls);
  b.type = "button";
  b.onclick = fn;
  return b;
}
export const badge = (label, tone = "") => el("span", label, "badge " + tone);
export const money = (n) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    n / 100,
  );
export const date = (s, time = false) =>
  new Date(s.length === 10 ? s + "T12:00:00" : s).toLocaleString("de-DE", {
    day: "2-digit",
    month: "short",
    year: time ? undefined : "numeric",
    ...(time ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
export const localTime = (s) => {
  const d = new Date(s);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
export const toISO = (input) => new Date(input.value).toISOString();
export const value = (control) => control.value.trim();
export const number = (control) => Number(control.value);
export function panel(title, actions = []) {
  const p = el("section", null, "panel");
  if (title) {
    const h = el("div", null, "section-head");
    h.append(el("h2", title));
    if (actions.length) {
      const a = el("div", null, "actions");
      a.append(...actions);
      h.append(a);
    }
    p.append(h);
  }
  return p;
}
export function grid(...nodes) {
  const e = el("div", null, "grid");
  e.append(...nodes);
  return e;
}
export function split(...nodes) {
  const e = el("div", null, "split");
  e.append(...nodes);
  return e;
}
export function line(label, right) {
  const e = el("div", null, "line");
  e.append(
    label instanceof Node ? label : el("span", label),
    right instanceof Node ? right : el("strong", right),
  );
  return e;
}
export function metric(items) {
  const container = el("div", null, "metrics");
  for (const [label, main, sub] of items) {
    const card = el("div", null, "metric");
    card.append(el("span", label), el("strong", main), el("small", sub));
    container.append(card);
  }
  return container;
}
export function table(headers, rows, label = "Datentabelle") {
  const wrap = el("div", null, "table-scroll");
  wrap.tabIndex = 0;
  wrap.setAttribute("aria-label", label);
  const t = el("table"),
    head = el("thead"),
    r = el("tr");
  for (const h of headers) {
    const th = el("th", h);
    th.scope = "col";
    r.append(th);
  }
  head.append(r);
  t.append(head);
  const body = el("tbody");
  for (const row of rows) {
    const tr = el("tr");
    for (const v of row) {
      const td = el("td");
      td.append(
        v instanceof Node ? v : document.createTextNode(String(v ?? "")),
      );
      tr.append(td);
    }
    body.append(tr);
  }
  t.append(body);
  wrap.append(t);
  if (!rows.length)
    wrap.append(el("p", "Noch keine passenden Einträge.", "empty"));
  return wrap;
}
export function actions(...nodes) {
  const e = el("div", null, "actions");
  e.append(...nodes);
  return e;
}
export function field(
  parent,
  label,
  {
    type = "text",
    value: initial,
    options = [],
    required = true,
    min,
    max,
    step,
    name,
    wide = false,
    placeholder,
  } = {},
) {
  const wrap = el("label", null, wide ? "wide" : ""),
    caption = el("span", label),
    input = el(
      type === "select" ? "select" : type === "textarea" ? "textarea" : "input",
    );
  input.setAttribute("aria-label", label);
  input.name = name ?? label;
  if (type === "select") {
    for (const item of options) {
      const [v, label] = Array.isArray(item) ? item : [item, item];
      const o = el("option", label);
      o.value = v;
      input.append(o);
    }
  } else if (type === "textarea") input.rows = 6;
  else input.type = type;
  if (initial !== undefined && initial !== null) input.value = initial;
  input.required = required;
  if (min !== undefined) input.min = min;
  if (max !== undefined) input.max = max;
  if (step !== undefined) input.step = step;
  if (placeholder) input.placeholder = placeholder;
  if (type === "number" && step === undefined) input.step = "1";
  wrap.append(caption, input);
  parent.append(wrap);
  return input;
}
export function progress(current, total, label) {
  const p = el("progress");
  p.max = total || 1;
  p.value = current;
  p.setAttribute("aria-label", label);
  return p;
}
export function modal(title, description, build, submitLabel = "Speichern") {
  $("dialog-title").textContent = title;
  $("dialog-description").textContent = description;
  $("form-fields").replaceChildren();
  $("form-error").hidden = true;
  $("form-error").textContent = "";
  $("submit").textContent = submitLabel;
  const submit = build($("form-fields"));
  $("modal-form").onsubmit = async (e) => {
    e.preventDefault();
    try {
      if (await submit()) $("dialog").close();
    } catch (error) {
      $("form-error").textContent = error.message;
      $("form-error").hidden = false;
    }
  };
  $("dialog").showModal();
}
export function confirm(title, description, fn) {
  modal(title, description, () => fn, "Bestätigen");
}
export function page(title, subtitle, buttons = []) {
  $("title").textContent = title;
  $("subtitle").textContent = subtitle;
  $("page-actions").replaceChildren(...buttons);
  $("content").replaceChildren();
  return $("content");
}
export function searchBar(label, onInput, initial = "") {
  const bar = el("div", null, "toolbar"),
    input = field(bar, label, {
      type: "search",
      value: initial,
      required: false,
      placeholder: label,
    });
  input.oninput = () => onInput(input.value);
  return bar;
}
export function navigation(items, current, onSelect) {
  $("navigation").replaceChildren(
    ...items.map(([key, icon, label]) => {
      const b = button("", () => onSelect(key));
      b.dataset.view = key;
      b.append(el("span", icon, "nav-icon"), el("span", label));
      b.setAttribute("aria-current", current === key ? "page" : "false");
      return b;
    }),
  );
}
export function application(draw) {
  let state = null,
    busy = false,
    timer;
  const api = {
    get state() {
      return state;
    },
    async load() {
      const r = await fetch("/api/state");
      if (!r.ok) throw Error("Daten konnten nicht geladen werden.");
      state = await r.json();
      draw();
    },
    async command(action) {
      if (busy) return false;
      busy = true;
      const disabled = [...document.querySelectorAll("button:not(:disabled)")];
      disabled.forEach((b) => (b.disabled = true));
      const error = $($("dialog").open ? "form-error" : "error");
      error.hidden = true;
      try {
        const r = await fetch("/api/commands", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Workspace": "1" },
          body: JSON.stringify({ revision: state.revision, action }),
        });
        const result = await r.json();
        if (!r.ok) {
          if (r.status === 409) await api.load();
          throw Error(result.error);
        }
        state = result;
        draw();
        $("toast").textContent = "Gespeichert.";
        $("toast").hidden = false;
        clearTimeout(timer);
        timer = setTimeout(() => ($("toast").hidden = true), 2600);
        return result;
      } catch (e) {
        error.textContent = e.message;
        error.hidden = false;
        return false;
      } finally {
        busy = false;
        disabled.forEach((b) => (b.disabled = false));
      }
    },
  };
  $("close-dialog").onclick = () => {
    if (!busy) $("dialog").close();
  };
  $("dialog").addEventListener("cancel", (e) => {
    if (busy) e.preventDefault();
  });
  $("refresh").onclick = () =>
    api.load().catch((e) => {
      $("error").textContent = e.message;
      $("error").hidden = false;
    });
  return api;
}
export function reportError(e) {
  $("error").textContent = e.message;
  $("error").hidden = false;
}
export function auditPanel(entries) {
  const p = panel("Aktionsverlauf");
  for (const a of entries.slice(0, 100)) {
    const row = el("div", null, "audit-row");
    row.append(el("p", a.detail), el("small", date(a.created, true)));
    p.append(row);
  }
  return p;
}
