"use strict";
const $ = (id) => document.getElementById(id);
let state = null,
  view = "overview",
  busy = false,
  query = "",
  lowOnly = false,
  submitAction = null,
  timer;
const titles = {
  overview: [
    "Alles am richtigen Platz.",
    "Bestände verstehen. Nachschub planen. Aufträge bereitstellen.",
  ],
  stock: [
    "Dein Lager, im Detail.",
    "Verfügbarkeit berücksichtigt alle offenen Reservierungen.",
  ],
  orders: [
    "Nachschub im Blick.",
    "Von der Bestellung bis zur letzten Teillieferung.",
  ],
  reservations: [
    "Bereit für den nächsten Schritt.",
    "Artikel reservieren, ausliefern oder wieder freigeben.",
  ],
  suppliers: [
    "Gute Verbindungen.",
    "Lieferanten und ihre Artikel an einem Ort.",
  ],
  journal: [
    "Jede Bewegung zählt.",
    "Nachvollziehbare Bestandsänderungen und ein unveränderbarer Verlauf.",
  ],
};
const money = (v) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    v / 100,
  );
const when = (v) =>
  new Date(v.length === 10 ? v + "T12:00:00" : v).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
  });
const node = (tag, text, cls) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
};
const button = (label, fn, cls) => {
  const b = node("button", label, cls);
  b.type = "button";
  b.onclick = fn;
  return b;
};
const badge = (text, tone = "") => node("span", text, "badge " + tone);
const product = (id) => state.products.find((p) => p.id === id);
const supplier = (id) => state.suppliers.find((s) => s.id === id);
function error(text, modal = false) {
  const e = $(modal ? "form-error" : "error");
  e.textContent = text;
  e.hidden = !text;
}
function toast(text) {
  $("toast").textContent = text;
  $("toast").hidden = false;
  clearTimeout(timer);
  timer = setTimeout(() => ($("toast").hidden = true), 3500);
}
async function load() {
  const r = await fetch("/api/state");
  if (!r.ok) throw Error("Lagerdaten konnten nicht geladen werden.");
  state = await r.json();
  draw();
}
async function act(action) {
  if (busy) return false;
  busy = true;
  document.querySelectorAll("button").forEach((b) => (b.disabled = true));
  error("", $("dialog").open);
  try {
    const r = await fetch("/api/commands", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Depot": "1" },
      body: JSON.stringify({ revision: state.revision, action }),
    });
    const result = await r.json();
    if (!r.ok) {
      if (r.status === 409) await load();
      throw Error(result.error);
    }
    state = result;
    draw();
    toast("Änderung gespeichert.");
    return true;
  } catch (e) {
    error(e.message, $("dialog").open);
    return false;
  } finally {
    busy = false;
    document.querySelectorAll("button").forEach((b) => (b.disabled = false));
  }
}
function go(next) {
  view = next;
  query = "";
  lowOnly = false;
  draw();
}
function head(title, action) {
  const h = node("div", undefined, "section-head");
  h.append(node("h2", title));
  if (action) h.append(action);
  return h;
}
function panel(title) {
  const p = node("div", undefined, "panel");
  if (title) p.append(head(title));
  return p;
}
function toolbar(target) {
  const bar = node("div", undefined, "toolbar"),
    search = node("input", undefined, "search");
  search.type = "search";
  search.placeholder = "Artikel, SKU oder Lagerplatz suchen …";
  search.setAttribute("aria-label", "Bestand durchsuchen");
  search.value = query;
  search.oninput = () => {
    query = search.value;
    renderStock(target);
  };
  const label = node("label"),
    check = node("input");
  check.type = "checkbox";
  check.checked = lowOnly;
  check.onchange = () => {
    lowOnly = check.checked;
    renderStock(target);
  };
  label.append(check, node("span", "Nur unter Mindestbestand"));
  bar.append(search, label);
  return bar;
}
function renderStock(target) {
  target.replaceChildren();
  const rows = state.products.filter(
    (p) =>
      [p.name, p.sku, p.location]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (!lowOnly || p.available < p.minimum),
  );
  const table = node("table"),
    thead = node("thead"),
    tr = node("tr");
  for (const h of [
    "Artikel",
    "Lagerort",
    "Bestand",
    "Reserviert",
    "Verfügbar",
    "Minimum",
    "",
  ])
    tr.append(node("th", h));
  thead.append(tr);
  table.append(thead);
  const body = node("tbody");
  for (const p of rows) {
    const row = node("tr"),
      name = node("td");
    name.append(node("strong", p.name), node("small", p.sku + " · " + p.unit));
    row.append(
      name,
      node("td", p.location),
      node("td", String(p.onHand), "number"),
      node("td", String(p.reserved), "number"),
    );
    const available = node("td");
    available.append(
      badge(String(p.available), p.available < p.minimum ? "warn" : ""),
    );
    row.append(available, node("td", String(p.minimum)));
    const actions = node("td"),
      group = node("div", undefined, "actions");
    group.append(
      button("Bearbeiten", () => editProduct(p)),
      button("Korrektur", () => adjust(p)),
    );
    actions.append(group);
    row.append(actions);
    body.append(row);
  }
  table.append(body);
  target.append(table);
  if (!rows.length)
    target.append(node("p", "Keine passenden Artikel.", "empty"));
}
function documentCard(item, kind) {
  const card = panel(),
    top = node("div", undefined, "document-head"),
    info = node("div");
  info.append(
    node(
      "small",
      (kind === "order" ? "BESTELLUNG " : "AUFTRAG ") + item.id.slice(0, 8),
    ),
    node("h2", kind === "order" ? supplier(item.supplier_id).name : item.label),
  );
  const labels = {
    open: "Offen",
    partial: "Teillieferung",
    received: "Eingegangen",
    cancelled: "Storniert",
    reserved: "Reserviert",
    shipped: "Ausgeliefert",
  };
  top.append(
    info,
    badge(
      labels[item.status],
      ["open", "partial", "reserved"].includes(item.status) ? "warn" : "grey",
    ),
  );
  card.append(top);
  if (kind === "order")
    card.append(node("p", "Erwartet am " + when(item.expected), "muted"));
  for (const l of item.lines) {
    const row = node("div", undefined, "line");
    row.append(
      node("span", product(l.product_id).name),
      node(
        "strong",
        kind === "order" ? l.received + " / " + l.quantity : String(l.quantity),
      ),
    );
    card.append(row);
  }
  const actions = node("div", undefined, "doc-actions");
  if (kind === "order") {
    const progress = node("progress", undefined, "progress");
    progress.max = item.lines.reduce((s, l) => s + l.quantity, 0);
    progress.value = item.lines.reduce((s, l) => s + l.received, 0);
    progress.setAttribute("aria-label", "Eingegangene Bestellmenge");
    card.append(progress);
    if (["open", "partial"].includes(item.status))
      actions.append(
        button("Wareneingang", () => receive(item), "primary"),
        button("Rest stornieren", () =>
          confirmAction(
            "Offene Restmenge stornieren?",
            "Bereits eingegangene Ware bleibt im Bestand.",
            { type: "order.cancel", id: item.id },
          ),
        ),
      );
  } else if (item.status === "reserved")
    actions.append(
      button(
        "Ausliefern",
        () =>
          confirmAction(
            "Auftrag ausliefern?",
            "Die reservierten Artikel werden aus dem Bestand ausgebucht.",
            { type: "reserve.ship", id: item.id },
          ),
        "primary",
      ),
      button("Freigeben", () =>
        confirmAction(
          "Reservierung freigeben?",
          "Die Artikel werden wieder für andere Aufträge verfügbar.",
          { type: "reserve.cancel", id: item.id },
        ),
      ),
    );
  card.append(actions);
  return card;
}
function draw() {
  if (!state) return;
  document.querySelectorAll("[data-view]").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === view);
    b.setAttribute("aria-current", b.dataset.view === view ? "page" : "false");
  });
  $("title").textContent = titles[view][0];
  $("subtitle").textContent = titles[view][1];
  $("breadcrumb").textContent = document.querySelector(
    '[data-view="' + view + '"] span',
  ).textContent;
  const create = {
    overview: ["＋ Artikel anlegen", newProduct],
    stock: ["＋ Artikel anlegen", newProduct],
    orders: ["＋ Bestellung anlegen", () => order()],
    reservations: ["＋ Auftrag reservieren", reservation],
    suppliers: ["＋ Lieferant anlegen", newSupplier],
    journal: ["Daten exportieren ↗", () => (location.href = "/api/export")],
  }[view];
  $("create").textContent = create[0];
  $("create").onclick = create[1];
  const content = $("content");
  content.replaceChildren();
  if (view === "overview") {
    const stats = node("div", undefined, "stats");
    for (const [label, value, detail] of [
      [
        "Bestandswert",
        money(state.stats.value),
        "Bewertet zum aktuellen Einstand",
      ],
      ["Nachbestellen", state.stats.low, "Artikel unter Mindestbestand"],
      ["Offene Bestellungen", state.stats.openOrders, "Nachschub auf dem Weg"],
      [
        "Reservierte Aufträge",
        state.stats.reserved,
        "Für Auslieferung vorbereitet",
      ],
    ]) {
      const s = node(
        "div",
        undefined,
        "stat" + (label === "Nachbestellen" ? " accent" : ""),
      );
      s.append(
        node("small", label),
        node("strong", String(value)),
        node("span", detail),
      );
      stats.append(s);
    }
    content.append(stats);
    const split = node("div", undefined, "split"),
      low = panel();
    low.append(
      head(
        "Zeit für Nachschub.",
        button("Alle Artikel ↗", () => go("stock")),
      ),
    );
    const missing = state.products.filter((p) => p.available < p.minimum);
    for (const p of missing) {
      const row = node("div", undefined, "alert-row"),
        copy = node("div");
      copy.append(
        node("h3", p.name),
        node(
          "small",
          p.sku +
            " · " +
            p.available +
            " verfügbar / " +
            p.minimum +
            " Mindestbestand",
        ),
      );
      row.append(
        copy,
        button("Nachbestellen", () => order(p)),
      );
      low.append(row);
    }
    if (!missing.length)
      low.append(
        node("p", "Alle Artikel liegen über ihrem Mindestbestand.", "muted"),
      );
    const recent = panel();
    recent.append(
      head(
        "Zuletzt bewegt.",
        button("Journal ↗", () => go("journal")),
      ),
    );
    state.movements.slice(0, 4).forEach((m) => recent.append(movement(m)));
    split.append(low, recent);
    content.append(split);
    const next = panel();
    next.append(
      head(
        "Einkauf & Auslieferung",
        button("Zum Einkauf ↗", () => go("orders")),
      ),
    );
    const grid = node("div", undefined, "grid");
    for (const o of state.orders
      .filter((o) => ["open", "partial"].includes(o.status))
      .slice(0, 2))
      grid.append(documentCard(o, "order"));
    if (!grid.children.length)
      grid.append(node("p", "Keine offenen Bestellungen.", "muted"));
    next.append(grid);
    content.append(next);
  } else if (view === "stock") {
    const table = node("div", undefined, "table-scroll panel");
    content.append(toolbar(table), table);
    renderStock(table);
  } else if (view === "orders" || view === "reservations") {
    const grid = node("div", undefined, "grid"),
      items = view === "orders" ? state.orders : state.reservations;
    for (const item of items)
      grid.append(
        documentCard(item, view === "orders" ? "order" : "reservation"),
      );
    if (!items.length)
      grid.append(
        node(
          "p",
          "Noch keine Vorgänge. Lege den ersten über den Button oben an.",
          "empty",
        ),
      );
    content.append(grid);
  } else if (view === "suppliers") {
    const grid = node("div", undefined, "grid");
    for (const s of state.suppliers) {
      const card = panel();
      card.append(
        head(s.name),
        node("p", s.email || "Keine E-Mail hinterlegt.", "muted"),
        badge(s.lead_days + " Tage Lieferzeit"),
      );
      const products = state.products.filter((p) => p.supplier_id === s.id);
      for (const p of products) {
        const row = node("div", undefined, "line");
        row.append(
          node("span", p.sku + " · " + p.name),
          node("strong", money(p.cost)),
        );
        card.append(row);
      }
      grid.append(card);
    }
    content.append(grid);
  } else {
    const split = node("div", undefined, "split"),
      moves = panel("Bestandsbewegungen"),
      audit = panel("Aktionsverlauf");
    state.movements.forEach((m) => moves.append(movement(m)));
    for (const a of state.audit) {
      const row = node("div", undefined, "journal-item"),
        copy = node("div");
      copy.append(node("strong", a.detail), node("span", a.action, "muted"));
      row.append(copy, node("time", when(a.created)));
      audit.append(row);
    }
    content.append(
      node(
        "p",
        "Ansicht: letzte 500 Bewegungen und 100 Aktionen. Der Datenexport enthält den vollständigen Verlauf.",
        "muted",
      ),
    );
    split.append(moves, audit);
    content.append(split);
  }
}
function movement(m) {
  const row = node("div", undefined, "journal-item"),
    copy = node("div");
  row.append(
    node(
      "span",
      (m.delta > 0 ? "+" : "") + m.delta,
      "delta" + (m.delta < 0 ? " negative" : ""),
    ),
  );
  copy.append(
    node("strong", product(m.product_id).name),
    node("span", m.reason + " · " + m.reference.slice(0, 28), "muted"),
  );
  row.append(copy, node("time", when(m.created)));
  return row;
}
function modal(title, description, submit = "Speichern ↗") {
  $("dialog-title").textContent = title;
  $("dialog-description").textContent = description;
  $("submit").textContent = submit;
  $("fields").replaceChildren();
  error("", true);
  $("dialog").showModal();
}
function field(label, name, value = "", type = "text", options = null) {
  const wrap = node("label", label),
    input = node(options ? "select" : "input");
  input.name = name;
  input.setAttribute("aria-label", label);
  if (options) {
    for (const [v, text] of options) {
      const option = node("option", text);
      option.value = v;
      input.append(option);
    }
  } else {
    input.type = type;
    if (type === "number") {
      input.step = "1";
      input.min = "0";
    }
  }
  input.value = value;
  input.required = true;
  wrap.append(input);
  $("fields").append(wrap);
  return input;
}
function supplierOptions() {
  return state.suppliers.map((s) => [s.id, s.name]);
}
function newSupplier() {
  modal(
    "Neuer Lieferant",
    "Lieferantendaten werden lokal verwaltet. Es werden keine Nachrichten versendet.",
  );
  field("Name", "name");
  field("E-Mail", "email", "", "email").required = false;
  field("Lieferzeit in Tagen", "leadDays", 3, "number");
  submitAction = (f) => ({
    type: "supplier.create",
    name: f.get("name"),
    email: f.get("email"),
    leadDays: Number(f.get("leadDays")),
  });
}
function newProduct() {
  if (!state.suppliers.length) {
    newSupplier();
    return;
  }
  modal(
    "Artikel anlegen",
    "Die SKU muss eindeutig sein. Der Anfangsbestand wird im Journal gebucht.",
  );
  field("SKU", "sku");
  field("Artikelname", "name");
  field("Einheit", "unit", "Stück");
  field("Lagerplatz", "location", "A-01");
  field("Mindestbestand", "minimum", 10, "number");
  field("Anfangsbestand", "opening", 0, "number");
  field("Einstand in Euro", "cost", 0, "number").step = ".01";
  field(
    "Lieferant",
    "supplierId",
    state.suppliers[0].id,
    "text",
    supplierOptions(),
  );
  submitAction = (f) => ({
    type: "product.create",
    sku: f.get("sku"),
    name: f.get("name"),
    unit: f.get("unit"),
    location: f.get("location"),
    minimum: Number(f.get("minimum")),
    opening: Number(f.get("opening")),
    cost: Math.round(Number(f.get("cost")) * 100),
    supplierId: f.get("supplierId"),
  });
}
function editProduct(p) {
  modal(
    p.name,
    "Lagerdaten ändern. Historische Bestellpreise bleiben erhalten.",
  );
  field("Lagerplatz", "location", p.location);
  field("Mindestbestand", "minimum", p.minimum, "number");
  field("Einstand in Euro", "cost", p.cost / 100, "number").step = ".01";
  submitAction = (f) => ({
    type: "product.update",
    id: p.id,
    location: f.get("location"),
    minimum: Number(f.get("minimum")),
    cost: Math.round(Number(f.get("cost")) * 100),
  });
}
function adjust(p) {
  modal(
    "Bestand korrigieren",
    p.name +
      " · " +
      p.onHand +
      " im Lager, davon " +
      p.reserved +
      " reserviert.",
  );
  field("Mengenänderung (+ / −)", "delta", 1, "number").min = "-1000000";
  field("Begründung", "reason", "Inventur");
  submitAction = (f) => ({
    type: "stock.adjust",
    id: p.id,
    delta: Number(f.get("delta")),
    reason: f.get("reason"),
  });
}
function lineEditor(getProducts, preset = null) {
  const block = node("div", undefined, "lines"),
    rows = node("div");
  let counter = 0;
  const add = (chosen = null, quantity = 1) => {
    const row = node("div", undefined, "line-editor"),
      productLabel = node("label", "Artikel"),
      select = node("select"),
      qtyLabel = node("label", "Menge"),
      qty = node("input");
    counter++;
    select.name = "product-" + counter;
    select.setAttribute("aria-label", "Artikel Position " + counter);
    for (const p of getProducts()) {
      const o = node(
        "option",
        p.sku + " · " + p.name + " (" + p.available + " frei)",
      );
      o.value = p.id;
      select.append(o);
    }
    if (chosen) select.value = chosen;
    qty.type = "number";
    qty.min = "1";
    qty.max = "1000000";
    qty.step = "1";
    qty.value = quantity;
    qty.required = true;
    select.required = true;
    qty.setAttribute("aria-label", "Menge Position " + counter);
    productLabel.append(select);
    qtyLabel.append(qty);
    row.append(
      productLabel,
      qtyLabel,
      button("×", () => row.remove()),
    );
    row.lastChild.setAttribute("aria-label", "Position entfernen");
    rows.append(row);
  };
  block.append(
    rows,
    button("＋ Position hinzufügen", () => add()),
  );
  $("fields").append(block);
  add(preset?.id, preset?.quantity ?? 1);
  return {
    read: () =>
      [...rows.children].map((row) => ({
        productId: row.querySelector("select").value,
        quantity: Number(row.querySelector("input").value),
      })),
    reset: () => {
      rows.replaceChildren();
      counter = 0;
      add();
    },
  };
}
function order(preset = null) {
  if (!state.products.length) {
    newProduct();
    return;
  }
  modal(
    "Bestellung anlegen",
    "Ein lokaler Bestellvorgang. Wareneingänge können später in Teilmengen gebucht werden.",
    "Bestellung speichern ↗",
  );
  const s = field(
    "Lieferant",
    "supplierId",
    preset?.supplier_id ?? state.suppliers[0].id,
    "text",
    supplierOptions(),
  );
  field(
    "Erwarteter Eingang",
    "expected",
    new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    "date",
  );
  const editor = lineEditor(
    () => state.products.filter((p) => p.supplier_id === s.value),
    preset
      ? {
          id: preset.id,
          quantity: Math.max(1, preset.minimum * 2 - preset.available),
        }
      : null,
  );
  s.onchange = () => editor.reset();
  submitAction = (f) => ({
    type: "order.create",
    supplierId: f.get("supplierId"),
    expected: f.get("expected"),
    lines: editor.read(),
  });
}
function receive(o) {
  modal(
    "Wareneingang buchen",
    "Nur tatsächlich gelieferte Mengen eintragen. Null lässt eine Position offen.",
    "Eingang buchen ↗",
  );
  const inputs = [];
  for (const l of o.lines.filter((l) => l.received < l.quantity)) {
    const label = node(
        "label",
        product(l.product_id).name +
          " · " +
          (l.quantity - l.received) +
          " offen",
        "wide receive",
      ),
      input = node("input");
    input.type = "number";
    input.min = 0;
    input.max = l.quantity - l.received;
    input.step = 1;
    input.value = l.quantity - l.received;
    input.required = true;
    label.append(input);
    $("fields").append(label);
    inputs.push({ input, id: l.product_id });
  }
  submitAction = () => ({
    type: "order.receive",
    id: o.id,
    lines: inputs
      .map((x) => ({ productId: x.id, quantity: Number(x.input.value) }))
      .filter((l) => l.quantity > 0),
  });
}
function reservation() {
  if (!state.products.length) {
    newProduct();
    return;
  }
  modal(
    "Auftrag reservieren",
    "Die Mengen bleiben im Lager, sind aber für diesen Auftrag gebunden.",
    "Reservieren ↗",
  );
  field("Auftragsbezeichnung", "label");
  const editor = lineEditor(() => state.products);
  submitAction = (f) => ({
    type: "reserve.create",
    label: f.get("label"),
    lines: editor.read(),
  });
}
function confirmAction(title, description, action) {
  modal(title, description, "Bestätigen ↗");
  submitAction = () => action;
}
$("form").onsubmit = async (e) => {
  e.preventDefault();
  if (await act(submitAction(new FormData(e.target)))) $("dialog").close();
};
$("close").onclick = () => $("dialog").close();
$("dialog").addEventListener("cancel", (e) => {
  if (busy) e.preventDefault();
});
document
  .querySelectorAll("[data-view]")
  .forEach((b) => (b.onclick = () => go(b.dataset.view)));
$("refresh").onclick = () =>
  load()
    .then(() => error(""))
    .catch((e) => error(e.message));
load().catch((e) => error(e.message));
