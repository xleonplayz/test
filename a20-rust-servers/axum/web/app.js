"use strict";
const $ = (id) => document.getElementById(id);
let state = null,
  view = "overview",
  activeId = null,
  busy = false,
  submitAction = null,
  timer,
  search = "",
  filterStatus = "active",
  filterQueue = "",
  filterPriority = "",
  filterSpecial = "",
  selected = new Set();
const drafts = new Map(),
  queues = ["Allgemein", "Technik", "Abrechnung"];
const statusLabel = {
  open: "Offen",
  working: "In Bearbeitung",
  waiting: "Wartet",
  resolved: "Gelöst",
};
const names = {
  overview: [
    "Gute Antworten beginnen hier.",
    "Die wichtigsten Vorgänge und Fristen auf einen Blick.",
  ],
  tickets: [
    "Jedes Anliegen verdient Gehör.",
    "Suchen, sortieren und gemeinsam Verantwortung übernehmen.",
  ],
  customers: [
    "Menschen hinter den Anfragen.",
    "Kontakt, Service-Level und offene Anliegen zusammen sehen.",
  ],
  team: [
    "Gemeinsam weiterhelfen.",
    "Zuständigkeiten nach Bereich, ohne doppelte Bearbeitung.",
  ],
  macros: [
    "Eine gute Antwort als Anfang.",
    "Wiederverwendbare Texte, die sich an jeden Fall anpassen lassen.",
  ],
  audit: [
    "Nachvollziehbar bis zur Lösung.",
    "Ein fortlaufender Verlauf aller Änderungen.",
  ],
};
const node = (tag, text, cls) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
};
const button = (text, fn, cls) => {
  const b = node("button", text, cls);
  b.type = "button";
  b.onclick = fn;
  return b;
};
const badge = (text, tone = "") => node("span", text, "badge " + tone);
const customer = (id) => state.customers.find((c) => c.id === id),
  agent = (id) => state.agents.find((a) => a.id === id);
const when = (t) =>
  new Date(t * 1000).toLocaleString("de-DE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
const overdue = (t) =>
  t.status !== "resolved" && t.first_reply === null && t.due < state.now;
function due(t) {
  if (t.first_reply !== null) return "Antwort protokolliert";
  if (t.status === "resolved") return "Abgeschlossen";
  const minutes = Math.ceil(Math.abs(t.due - state.now) / 60);
  return (
    (overdue(t) ? "Seit " : "Noch ") +
    (minutes >= 60
      ? Math.floor(minutes / 60) + " Std. " + (minutes % 60) + " Min."
      : minutes + " Min.") +
    (overdue(t) ? " überfällig" : "")
  );
}
function error(text, modal = false) {
  const n = $(modal ? "form-error" : "error");
  n.textContent = text;
  n.hidden = !text;
}
function toast(text) {
  $("toast").textContent = text;
  $("toast").hidden = false;
  clearTimeout(timer);
  timer = setTimeout(() => ($("toast").hidden = true), 3500);
}
async function load() {
  const r = await fetch("/api/state");
  if (!r.ok) throw Error("Daten konnten nicht geladen werden.");
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
      headers: { "Content-Type": "application/json", "X-Funkraum": "1" },
      body: JSON.stringify({ revision: state.revision, action }),
    });
    const result = await r.json();
    if (!r.ok) {
      if (r.status === 409) await load();
      throw Error(result.error);
    }
    state = result;
    selected.clear();
    draw();
    toast("Gespeichert.");
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
  selected.clear();
  draw();
}
function openTicket(id) {
  activeId = id;
  view = "detail";
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
function ticketLine(t) {
  const row = node("div", undefined, "ticket-line"),
    copy = node("div");
  copy.append(
    button(
      "#" + t.id + " · " + t.subject,
      () => openTicket(t.id),
      "ticket-link",
    ),
    node("small", customer(t.customer_id).company + " · " + t.queue),
  );
  row.append(
    copy,
    badge("P" + t.priority, t.priority === 1 ? "warn" : "grey"),
    badge(due(t), overdue(t) ? "danger" : "blue"),
  );
  return row;
}
function draw() {
  if (!state) return;
  const t = state.tickets.find((t) => t.id === activeId),
    navView = view === "detail" ? "tickets" : view;
  document.querySelectorAll("[data-view]").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === navView);
    b.setAttribute(
      "aria-current",
      b.dataset.view === navView ? "page" : "false",
    );
  });
  $("title").textContent = view === "detail" ? t.subject : names[view][0];
  $("subtitle").textContent =
    view === "detail"
      ? "Ticket #" +
        t.id +
        " · " +
        customer(t.customer_id).name +
        " / " +
        customer(t.customer_id).company
      : names[view][1];
  $("breadcrumb").textContent = document.querySelector(
    '[data-view="' + navView + '"] span',
  ).textContent;
  const create = {
    overview: ["＋ Neues Ticket", newTicket],
    tickets: ["＋ Neues Ticket", newTicket],
    customers: ["＋ Kunde anlegen", newCustomer],
    team: ["＋ Person hinzufügen", newAgent],
    macros: ["＋ Textbaustein", newMacro],
    audit: ["Daten exportieren ↗", () => (location.href = "/api/export")],
    detail: ["← Zur Ticketliste", () => go("tickets")],
  }[view];
  $("create").textContent = create[0];
  $("create").onclick = create[1];
  const content = $("content");
  content.replaceChildren();
  if (view === "overview") {
    const active = state.tickets.filter((t) => t.status !== "resolved"),
      stats = node("div", undefined, "stats");
    for (const [label, value, detail] of [
      ["Offene Anliegen", active.length, "Über alle Bereiche"],
      [
        "Antwort überfällig",
        active.filter(overdue).length,
        "Interne Notizen zählen nicht als Antwort",
      ],
      [
        "Ohne Zuständigkeit",
        active.filter((t) => t.assignee === null).length,
        "Warten auf Übernahme",
      ],
      [
        "Gelöste Anliegen",
        state.tickets.length - active.length,
        "Mit dokumentiertem Abschluss",
      ],
    ]) {
      const card = node(
        "div",
        undefined,
        "stat" + (label === "Antwort überfällig" ? " accent" : ""),
      );
      card.append(
        node("small", label),
        node("strong", String(value)),
        node("span", detail),
      );
      stats.append(card);
    }
    content.append(stats);
    const split = node("div", undefined, "split"),
      attention = panel(),
      work = panel("Verteilung im Team");
    attention.append(
      head(
        "Jetzt braucht es eine Antwort.",
        button("Alle Tickets ↗", () => go("tickets")),
      ),
    );
    const urgent = active
      .filter((t) => t.first_reply === null)
      .sort((a, b) => a.due - b.due)
      .slice(0, 6);
    urgent.forEach((t) => attention.append(ticketLine(t)));
    if (!urgent.length)
      attention.append(
        node(
          "p",
          "Alle offenen Anliegen haben eine protokollierte Antwort.",
          "muted",
        ),
      );
    for (const q of queues) {
      const n = active.filter((t) => t.queue === q).length,
        row = node("div", undefined, "workload");
      row.append(node("strong", q), node("span", n + " offen"));
      const progress = node("progress");
      progress.max = Math.max(1, active.length);
      progress.value = n;
      progress.setAttribute("aria-label", q + " offene Tickets");
      row.append(progress);
      work.append(row);
    }
    split.append(attention, work);
    content.append(split);
    const info = node("div", undefined, "service-note");
    info.append(
      node("strong", "Klarer Service, klare Fristen."),
      node(
        "p",
        "P1: 4 Stunden · P2: 12 Stunden · P3: 24 Stunden. Priority-Kunden erhalten die halbe Frist. Laufzeit in Echtzeit, auch außerhalb der Bürozeiten.",
      ),
    );
    content.append(info);
  } else if (view === "tickets") ticketList(content);
  else if (view === "detail") detail(content, t);
  else if (view === "customers") {
    const grid = node("div", undefined, "grid");
    for (const c of state.customers) {
      const card = panel(),
        tickets = state.tickets.filter((t) => t.customer_id === c.id);
      card.append(
        head(c.company),
        node("p", c.name + " · " + c.email, "muted"),
        badge(
          c.tier === "priority" ? "Priority · halbe Antwortfrist" : "Standard",
          "blue",
        ),
      );
      for (const t of tickets) card.append(ticketLine(t));
      if (!tickets.length)
        card.append(node("p", "Noch keine Anliegen.", "muted"));
      grid.append(card);
    }
    content.append(grid);
  } else if (view === "team") {
    const grid = node("div", undefined, "grid");
    for (const a of state.agents) {
      const card = panel(),
        assigned = state.tickets.filter(
          (t) => t.assignee === a.id && t.status !== "resolved",
        );
      card.append(
        head(a.name),
        badge(a.queue, "blue"),
        node("p", assigned.length + " aktive Anliegen", "muted"),
      );
      assigned.forEach((t) => card.append(ticketLine(t)));
      grid.append(card);
    }
    content.append(grid);
  } else if (view === "macros") {
    const grid = node("div", undefined, "grid");
    for (const m of state.macros) {
      const card = panel();
      card.append(
        head(m.title),
        badge(m.queue, "blue"),
        node("p", m.body, "macro-body"),
        node(
          "p",
          "Im Ticket als Ausgangspunkt für eine Antwort oder Notiz verwenden.",
          "muted",
        ),
      );
      grid.append(card);
    }
    content.append(grid);
  } else {
    const audit = panel("Aktionsverlauf");
    for (const e of state.events) {
      const row = node("div", undefined, "journal-item"),
        copy = node("div");
      copy.append(node("strong", e.body), node("span", e.kind, "muted"));
      if (e.ticket_id)
        copy.append(
          button(
            "Ticket #" + e.ticket_id,
            () => openTicket(e.ticket_id),
            "text-button",
          ),
        );
      row.append(copy, node("time", when(e.created)));
      audit.append(row);
    }
    content.append(audit);
  }
}
function filtered() {
  return state.tickets
    .filter((t) => {
      const c = customer(t.customer_id);
      return (
        (!search ||
          [t.subject, t.description, c.name, c.company, c.email]
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase())) &&
        (filterStatus === "all" ||
          (filterStatus === "active" && t.status !== "resolved") ||
          filterStatus === t.status) &&
        (!filterQueue || filterQueue === t.queue) &&
        (!filterPriority || Number(filterPriority) === t.priority) &&
        (!filterSpecial ||
          (filterSpecial === "late" && overdue(t)) ||
          (filterSpecial === "unassigned" && t.assignee === null))
      );
    })
    .sort((a, b) => a.priority - b.priority || a.due - b.due);
}
function selectControl(label, values, value, change) {
  const wrap = node("label", label),
    select = node("select");
  for (const [v, text] of values) {
    const option = node("option", text);
    option.value = v;
    select.append(option);
  }
  select.value = value;
  select.setAttribute("aria-label", label);
  select.onchange = () => change(select.value);
  wrap.append(select);
  return wrap;
}
function ticketList(content) {
  const saved = node("div", undefined, "saved-views");
  saved.append(
    button("Alle offenen", () => {
      filterStatus = "active";
      filterSpecial = "";
      draw();
    }),
    button("Überfällige Antworten", () => {
      filterStatus = "active";
      filterSpecial = "late";
      draw();
    }),
    button("Ohne Zuständigkeit", () => {
      filterStatus = "active";
      filterSpecial = "unassigned";
      draw();
    }),
  );
  let views = [];
  try {
    views = JSON.parse(localStorage.getItem("funkraum-views") || "[]");
    if (!Array.isArray(views)) views = [];
  } catch {}
  for (const v of views) {
    saved.append(
      button(v.name, () => {
        search = v.search || "";
        filterStatus = v.status || "active";
        filterQueue = v.queue || "";
        filterPriority = v.priority || "";
        filterSpecial = v.special || "";
        draw();
      }),
    );
  }
  saved.append(
    button("＋ Ansicht merken", () => {
      modal(
        "Ansicht merken",
        "Diese Suche und Filter werden in diesem Browser gespeichert.",
      );
      field("Name der Ansicht", "name");
      submitAction = async (f) => {
        views.push({
          name: String(f.get("name")).slice(0, 40),
          search,
          status: filterStatus,
          queue: filterQueue,
          priority: filterPriority,
          special: filterSpecial,
        });
        localStorage.setItem("funkraum-views", JSON.stringify(views.slice(-8)));
        draw();
        return true;
      };
    }),
  );
  content.append(saved);
  const toolbar = node("div", undefined, "ticket-toolbar"),
    input = node("input", undefined, "search");
  input.type = "search";
  input.placeholder = "Ticket, Kunde oder Unternehmen suchen …";
  input.setAttribute("aria-label", "Tickets durchsuchen");
  input.value = search;
  const table = panel();
  input.oninput = () => {
    search = input.value;
    renderTickets(table);
  };
  toolbar.append(
    input,
    selectControl(
      "Status",
      [
        ["active", "Alle aktiven"],
        ["all", "Alle"],
        ...Object.entries(statusLabel),
      ],
      filterStatus,
      (v) => {
        filterStatus = v;
        renderTickets(table);
      },
    ),
    selectControl(
      "Bereich",
      [["", "Alle Bereiche"], ...queues.map((q) => [q, q])],
      filterQueue,
      (v) => {
        filterQueue = v;
        renderTickets(table);
      },
    ),
    selectControl(
      "Priorität",
      [
        ["", "Alle"],
        ["1", "P1 · Hoch"],
        ["2", "P2 · Normal"],
        ["3", "P3 · Niedrig"],
      ],
      filterPriority,
      (v) => {
        filterPriority = v;
        renderTickets(table);
      },
    ),
  );
  const bulk = button("Auswahl zuweisen", () => {
    if (!selected.size) {
      error("Zuerst Tickets auswählen.");
      return;
    }
    modal(
      "Tickets gemeinsam zuweisen",
      selected.size +
        " ausgewählte Tickets. Alle müssen aktiv und im Bereich der Person sein.",
    );
    field(
      "Zuständige Person",
      "agent_id",
      state.agents[0]?.id,
      "select",
      state.agents.map((a) => [a.id, a.name + " · " + a.queue]),
    );
    submitAction = (f) =>
      act({
        type: "batch_assign",
        ids: [...selected],
        agent_id: Number(f.get("agent_id")),
      });
  });
  content.append(toolbar, bulk, table);
  renderTickets(table);
}
function renderTickets(target) {
  target.replaceChildren();
  target.classList.add("table-scroll");
  const table = node("table"),
    thead = node("thead"),
    header = node("tr");
  for (const label of [
    "Auswahl",
    "Anliegen",
    "Bereich / Person",
    "Priorität",
    "Status",
    "Antwortfrist",
  ])
    header.append(node("th", label));
  thead.append(header);
  table.append(thead);
  const body = node("tbody");
  for (const t of filtered()) {
    const row = node("tr"),
      checkCell = node("td"),
      check = node("input");
    check.type = "checkbox";
    check.checked = selected.has(t.id);
    check.setAttribute("aria-label", "Ticket " + t.id + " auswählen");
    check.onchange = () =>
      check.checked ? selected.add(t.id) : selected.delete(t.id);
    checkCell.append(check);
    const title = node("td");
    title.append(
      button(
        "#" + t.id + " · " + t.subject,
        () => openTicket(t.id),
        "ticket-link",
      ),
      node("small", customer(t.customer_id).company),
    );
    const owner = node("td");
    owner.append(
      node("strong", t.queue),
      node("small", agent(t.assignee)?.name ?? "Nicht zugewiesen"),
    );
    const status = node("td");
    status.append(
      badge(statusLabel[t.status], t.status === "resolved" ? "" : "blue"),
    );
    const deadline = node("td");
    deadline.append(badge(due(t), overdue(t) ? "danger" : "grey"));
    row.append(
      checkCell,
      title,
      owner,
      node("td", "P" + t.priority),
      status,
      deadline,
    );
    body.append(row);
  }
  table.append(body);
  target.append(table);
  if (!body.children.length)
    target.append(node("p", "Keine Tickets für diese Auswahl.", "empty"));
}
function detail(content, t) {
  const split = node("div", undefined, "detail-layout"),
    conversation = panel(),
    meta = panel("Zuständigkeit & Status");
  const initial = node("div", undefined, "message initial");
  initial.append(
    node(
      "div",
      customer(t.customer_id).name + " · " + when(t.created),
      "muted",
    ),
    node("p", t.description),
  );
  conversation.append(head("Der Gesprächsverlauf"), initial);
  for (const m of state.messages.filter((m) => m.ticket_id === t.id)) {
    const item = node("div", undefined, "message " + m.kind);
    item.append(
      node(
        "div",
        (m.kind === "note" ? "Interne Notiz" : "Lokal protokollierte Antwort") +
          " · " +
          when(m.created),
        "muted",
      ),
      node("p", m.body),
    );
    conversation.append(item);
  }
  if (t.status !== "resolved") {
    const reply = node("form", undefined, "reply-form"),
      kind = selectControl(
        "Eintragstyp",
        [
          ["reply", "Antwort protokollieren (kein Versand)"],
          ["note", "Interne Notiz"],
        ],
        drafts.get(t.id)?.kind || "reply",
        () => remember(),
      );
    kind.querySelector("select").name = "kind";
    const macro = selectControl(
      "Textbaustein",
      [
        ["", "Ohne Vorlage"],
        ...state.macros
          .filter((m) => m.queue === t.queue)
          .map((m) => [String(m.id), m.title]),
      ],
      "",
      (id) => {
        if (id) {
          body.value = state.macros.find((m) => m.id === Number(id)).body;
          remember();
        }
      },
    );
    const label = node("label", "Nachricht"),
      body = node("textarea");
    body.required = true;
    body.rows = 6;
    body.maxLength = 8000;
    const remember = () =>
      drafts.set(t.id, {
        body: body.value,
        kind: kind.querySelector("select").value,
      });
    body.value = drafts.get(t.id)?.body || "";
    body.oninput = remember;
    label.append(body);
    const save = node("button", "Eintrag speichern ↗", "primary");
    save.type = "submit";
    reply.append(kind, macro, label, save);
    reply.onsubmit = async (e) => {
      e.preventDefault();
      remember();
      const saved = await act({
        type: "message_add",
        id: t.id,
        kind: kind.querySelector("select").value,
        body: body.value,
      });
      if (saved) {
        drafts.delete(t.id);
        draw();
      }
    };
    conversation.append(reply);
  }
  meta.append(
    badge(statusLabel[t.status], "blue"),
    node("p", due(t), "deadline " + (overdue(t) ? "late" : "")),
    node("p", "Antwort bis " + when(t.due), "muted"),
  );
  for (const [label, value] of [
    ["Kunde", customer(t.customer_id).company],
    ["Bereich", t.queue],
    ["Zuständig", agent(t.assignee)?.name ?? "Offen"],
    ["Priorität", "P" + t.priority],
  ]) {
    const line = node("div", undefined, "line");
    line.append(node("span", label), node("strong", value));
    meta.append(line);
  }
  const actions = node("div", undefined, "detail-actions");
  if (t.status !== "resolved") {
    actions.append(
      button("Zuständigkeit ändern", () => route(t)),
      button("Priorität ändern", () => changePriority(t)),
    );
    for (const status of t.status === "open"
      ? ["working", "waiting", "resolved"]
      : t.status === "working"
        ? ["waiting", "resolved"]
        : ["working", "resolved"])
      actions.append(
        button(
          status === "resolved" ? "Ticket lösen" : statusLabel[status],
          () => changeStatus(t, status),
          status === "resolved" ? "primary" : "",
        ),
      );
  } else
    actions.append(
      button("Wieder öffnen", () => changeStatus(t, "open"), "primary"),
    );
  meta.append(actions);
  split.append(conversation, meta);
  content.append(split);
  const history = panel("Ticket-Verlauf");
  for (const e of state.events.filter((e) => e.ticket_id === t.id)) {
    const row = node("div", undefined, "journal-item");
    row.append(node("span", e.body), node("time", when(e.created)));
    history.append(row);
  }
  content.append(history);
}
function modal(title, description) {
  $("dialog-title").textContent = title;
  $("dialog-description").textContent = description;
  $("fields").replaceChildren();
  error("", true);
  $("dialog").showModal();
}
function field(label, name, value = "", type = "text", options = []) {
  const wrap = node("label", label),
    input = node(
      type === "select" ? "select" : type === "textarea" ? "textarea" : "input",
    );
  input.name = name;
  input.setAttribute("aria-label", label);
  input.required = true;
  if (type === "select") {
    for (const [v, label] of options) {
      const o = node("option", label);
      o.value = v;
      input.append(o);
    }
  } else if (type === "textarea") {
    input.rows = 5;
    wrap.className = "wide";
  } else input.type = type;
  input.value = value;
  wrap.append(input);
  $("fields").append(wrap);
  return input;
}
function newCustomer() {
  modal(
    "Kunde anlegen",
    "Priority halbiert die Antwortfrist neuer Ticket-Zyklen.",
  );
  field("Name", "name");
  field("Unternehmen", "company");
  field("E-Mail", "email", "", "email");
  field("Service-Level", "tier", "standard", "select", [
    ["standard", "Standard"],
    ["priority", "Priority"],
  ]);
  submitAction = (f) =>
    act({ type: "customer_create", ...Object.fromEntries(f) });
}
function newAgent() {
  modal(
    "Person hinzufügen",
    "Zuständigkeiten sind organisatorisch. Diese App hat keine Benutzeranmeldung.",
  );
  field("Name", "name");
  field(
    "Bereich",
    "queue",
    queues[0],
    "select",
    queues.map((q) => [q, q]),
  );
  submitAction = (f) => act({ type: "agent_create", ...Object.fromEntries(f) });
}
function newMacro() {
  modal(
    "Textbaustein anlegen",
    "Texte können später im Ticket angepasst werden.",
  );
  field("Titel", "title");
  field(
    "Bereich",
    "queue",
    queues[0],
    "select",
    queues.map((q) => [q, q]),
  );
  field("Vorlagentext", "body", "", "textarea");
  submitAction = (f) => act({ type: "macro_create", ...Object.fromEntries(f) });
}
function newTicket() {
  if (!state.customers.length) {
    newCustomer();
    return;
  }
  modal(
    "Neues Anliegen",
    "Die Antwortfrist beginnt mit dem Anlegen des Tickets.",
  );
  field(
    "Kunde",
    "customer_id",
    state.customers[0].id,
    "select",
    state.customers.map((c) => [c.id, c.company + " · " + c.name]),
  );
  field("Betreff", "subject");
  field(
    "Bereich",
    "queue",
    queues[0],
    "select",
    queues.map((q) => [q, q]),
  );
  field("Priorität", "priority", 2, "select", [
    [1, "P1 · Hoch"],
    [2, "P2 · Normal"],
    [3, "P3 · Niedrig"],
  ]);
  field("Beschreibung", "description", "", "textarea");
  submitAction = (f) =>
    act({
      type: "ticket_create",
      ...Object.fromEntries(f),
      customer_id: Number(f.get("customer_id")),
      priority: Number(f.get("priority")),
    });
}
function route(t) {
  modal("Zuständigkeit ändern", "Person und Bereich müssen zusammenpassen.");
  const q = field(
      "Bereich",
      "queue",
      t.queue,
      "select",
      queues.map((q) => [q, q]),
    ),
    owner = field("Person", "assignee", t.assignee ?? "", "select", []);
  const refresh = () => {
    owner.replaceChildren();
    for (const [id, name] of [
      ["", "Nicht zugewiesen"],
      ...state.agents
        .filter((a) => a.queue === q.value)
        .map((a) => [a.id, a.name]),
    ]) {
      const o = node("option", name);
      o.value = id;
      owner.append(o);
    }
    owner.required = false;
  };
  refresh();
  owner.value = t.assignee ?? "";
  q.onchange = refresh;
  submitAction = (f) =>
    act({
      type: "ticket_route",
      id: t.id,
      queue: f.get("queue"),
      assignee: f.get("assignee") ? Number(f.get("assignee")) : null,
    });
}
function changePriority(t) {
  modal(
    "Priorität ändern",
    "Höhere Priorität kann die Frist verkürzen. Eine laufende Frist wird niemals verlängert.",
  );
  field("Priorität", "priority", t.priority, "select", [
    [1, "P1 · Hoch"],
    [2, "P2 · Normal"],
    [3, "P3 · Niedrig"],
  ]);
  submitAction = (f) =>
    act({
      type: "ticket_priority",
      id: t.id,
      priority: Number(f.get("priority")),
    });
}
function changeStatus(t, status) {
  modal(
    status === "resolved"
      ? "Ticket lösen"
      : status === "open"
        ? "Ticket wieder öffnen"
        : "Status ändern",
    status === "open"
      ? "Es beginnt ein neuer Antwortzyklus. Der bisherige Verlauf bleibt erhalten."
      : "Bitte den Grund oder die Lösung dokumentieren.",
  );
  field("Zusammenfassung", "summary", "", "textarea");
  submitAction = (f) =>
    act({ type: "ticket_status", id: t.id, status, summary: f.get("summary") });
}
$("form").onsubmit = async (e) => {
  e.preventDefault();
  try {
    if (await submitAction(new FormData(e.target))) $("dialog").close();
  } catch (e) {
    error(e.message, true);
  }
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
