import {
  $,
  el,
  button,
  badge,
  money,
  date,
  value,
  number,
  panel,
  grid,
  split,
  line,
  metric,
  table,
  actions,
  field,
  progress,
  modal,
  confirm,
  page,
  searchBar,
  navigation,
  application,
  reportError,
  auditPanel,
} from "./ui.js";
let view = "board",
  jobId = null,
  query = "",
  statusFilter = "";
const status = {
  received: "Angenommen",
  diagnosing: "Diagnose",
  quoted: "Angebot offen",
  approved: "Freigegeben",
  repairing: "In Reparatur",
  testing: "Prüfung",
  ready: "Abholbereit",
  collected: "Abgeholt",
  cancelled: "Storniert",
};
const stages = [
  "received",
  "diagnosing",
  "quoted",
  "approved",
  "repairing",
  "testing",
  "ready",
];
const nav = [
  ["board", "▥", "Werkstattboard"],
  ["jobs", "▤", "Aufträge"],
  ["customers", "♙", "Kunden"],
  ["parts", "▧", "Ersatzteile"],
  ["team", "◎", "Team"],
  ["reports", "↗", "Auswertung"],
  ["audit", "≡", "Verlauf"],
];
const app = application(draw),
  s = () => app.state,
  customer = (id) => s().customers.find((c) => c.id === id),
  technician = (id) => s().technicians.find((t) => t.id === id),
  part = (id) => s().parts.find((p) => p.id === id),
  job = (id) => s().jobs.find((j) => j.id === id),
  quotes = (id) => s().quotes.filter((q) => q.job_id === id),
  logs = (id) => s().workLogs.filter((w) => w.job_id === id),
  active = (j) => !["collected", "cancelled"].includes(j.status);
const statusBadge = (j) =>
  badge(
    status[j.status],
    j.status === "ready" || j.status === "collected"
      ? "good"
      : j.status === "quoted"
        ? "warn"
        : j.status === "cancelled"
          ? "neutral"
          : "",
  );
function go(next) {
  view = next;
  query = "";
  draw();
}
function open(id) {
  jobId = id;
  view = "detail";
  draw();
  window.scrollTo(0, 0);
}
function jobCard(j) {
  const card = el("article", null, "job-card");
  card.append(
    actions(
      el("strong", "#" + String(j.id).padStart(4, "0")),
      badge("P" + j.priority, j.priority === 1 ? "warn" : "neutral"),
    ),
    button(j.device, () => open(j.id), "job-title"),
    el("p", j.issue, "job-issue"),
    el("small", customer(j.customer_id).name),
  );
  const footer = el("div", null, "job-footer");
  footer.append(
    el("span", technician(j.technician_id)?.name ?? "Nicht zugewiesen"),
    el("time", date(j.due)),
  );
  card.append(footer);
  return card;
}
function draw() {
  if (!s()) return;
  navigation(nav, view === "detail" ? "jobs" : view, go);
  $("breadcrumb").textContent =
    view === "detail" ? "Auftrag #" + jobId : nav.find((n) => n[0] === view)[2];
  let content;
  if (view === "board") {
    content = page(
      "Gute Dinge bleiben im Einsatz.",
      "Jeder Auftrag hat seinen nächsten Schritt. Hier behältst du alle im Blick.",
      [button("＋ Reparatur annehmen", newJob, "primary")],
    );
    const working = s().jobs.filter(active),
      minutes = s().workLogs.reduce((n, w) => n + w.minutes, 0);
    content.append(
      metric([
        ["Offene Aufträge", working.length, "Von Annahme bis Abholung"],
        [
          "Warten auf Freigabe",
          working.filter((j) => j.status === "quoted").length,
          "Kostenvoranschlag ist bereit",
        ],
        [
          "Abholbereit",
          working.filter((j) => j.status === "ready").length,
          "Alle Prüfungen bestanden",
        ],
        [
          "Erfasste Arbeitszeit",
          (minutes / 60).toLocaleString("de-DE", { maximumFractionDigits: 1 }) +
            " h",
          "Tatsächlich protokolliert",
        ],
      ]),
    );
    const heading = el("div", null, "section-head");
    heading.append(
      el("h2", "Der Weg durch die Werkstatt"),
      el("small", "Durch die Stationen blättern →"),
    );
    content.append(heading);
    const board = el("div", null, "board");
    board.tabIndex = 0;
    board.setAttribute("aria-label", "Horizontal scrollbares Werkstattboard");
    for (const stage of stages) {
      const column = el("section", null, "board-column"),
        jobs = working.filter((j) => j.status === stage),
        head = el("div", null, "column-head");
      head.append(el("h2", status[stage]), badge(jobs.length, "neutral"));
      column.append(head, ...jobs.map(jobCard));
      if (!jobs.length)
        column.append(el("p", "Hier ist gerade Platz.", "empty"));
      board.append(column);
    }
    content.append(board);
    const low = s().parts.filter((p) => p.available < p.minimum),
      p = panel("Teile, die bald fehlen könnten", [
        button("Zum Teilelager ↗", () => go("parts"), "text-button"),
      ]);
    low.forEach((x) =>
      p.append(
        line(
          x.sku + " · " + x.name,
          badge(x.available + " frei / " + x.minimum + " Minimum", "warn"),
        ),
      ),
    );
    if (!low.length)
      p.append(el("p", "Alle Teile liegen über dem Mindestbestand.", "muted"));
    content.append(p);
  } else if (view === "jobs") {
    content = page(
      "Jede Reparatur hat eine Geschichte.",
      "Suche nach Gerät, Seriennummer, Fehlerbild oder Kunde.",
      [button("＋ Reparatur annehmen", newJob, "primary")],
    );
    const bar = el("div", null, "toolbar"),
      search = field(bar, "Aufträge suchen", {
        type: "search",
        value: query,
        required: false,
      }),
      filter = field(bar, "Status", {
        type: "select",
        value: statusFilter,
        options: [
          ["", "Alle Aufträge"],
          ["active", "Alle offenen"],
          ...Object.entries(status),
        ],
      }),
      p = panel();
    const render = () =>
      p.replaceChildren(
        jobTable(
          s().jobs.filter(
            (j) =>
              (!statusFilter ||
                (statusFilter === "active" && active(j)) ||
                j.status === statusFilter) &&
              [j.device, j.serial, j.issue, customer(j.customer_id).name]
                .join(" ")
                .toLowerCase()
                .includes(query.toLowerCase()),
          ),
        ),
      );
    search.oninput = () => {
      query = search.value;
      render();
    };
    filter.onchange = () => {
      statusFilter = filter.value;
      render();
    };
    content.append(bar, p);
    render();
  } else if (view === "customers") {
    content = page(
      "Menschen hinter den Geräten.",
      "Kontakt und Reparaturhistorie an einem Ort.",
      [button("＋ Kunde", newCustomer, "primary")],
    );
    content.append(
      grid(
        ...s().customers.map((c) => {
          const p = panel(c.name);
          p.append(
            el("p", c.email + (c.phone ? " · " + c.phone : ""), "muted"),
          );
          for (const j of s().jobs.filter((j) => j.customer_id === c.id))
            p.append(
              line(
                button(
                  "#" + j.id + " · " + j.device,
                  () => open(j.id),
                  "text-button",
                ),
                statusBadge(j),
              ),
            );
          return p;
        }),
      ),
    );
  } else if (view === "parts") {
    content = page(
      "Das richtige Teil zur richtigen Zeit.",
      "Freigegebene Angebote reservieren Teile. Arbeitsbeginn bucht sie aus.",
      [button("＋ Ersatzteil", newPart, "primary")],
    );
    const p = panel(),
      render = () =>
        p.replaceChildren(
          table(
            [
              "Ersatzteil",
              "Bestand",
              "Reserviert",
              "Verfügbar",
              "Minimum",
              "Teilepreis",
              "Aktionen",
            ],
            s()
              .parts.filter((p) =>
                [p.sku, p.name]
                  .join(" ")
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((p) => {
                const copy = el("div", null, "row-copy");
                copy.append(el("strong", p.name), el("small", p.sku));
                return [
                  copy,
                  p.stock,
                  p.reserved,
                  badge(p.available, p.available < p.minimum ? "warn" : "good"),
                  p.minimum,
                  money(p.price),
                  actions(
                    button("Bestand buchen", () => adjustPart(p)),
                    button("Stammdaten", () => editPart(p)),
                  ),
                ];
              }),
            "Ersatzteilbestand",
          ),
        );
    content.append(
      searchBar(
        "Ersatzteile suchen",
        (q) => {
          query = q;
          render();
        },
        query,
      ),
      p,
    );
    render();
    const journal = panel("Letzte Teilebewegungen");
    journal.append(
      table(
        ["Zeit", "Ersatzteil", "Änderung", "Grund"],
        s()
          .movements.slice(0, 30)
          .map((m) => [
            date(m.created, true),
            part(m.part_id).name,
            (m.delta > 0 ? "+" : "") + m.delta,
            m.reason,
          ]),
      ),
    );
    content.append(journal);
  } else if (view === "team") {
    content = page(
      "Gute Hände. Klare Zuständigkeiten.",
      "Aufträge und erfasste Arbeitszeiten pro Person.",
      [button("＋ Teammitglied", newTechnician, "primary")],
    );
    content.append(
      grid(
        ...s().technicians.map((t) => {
          const p = panel(t.name),
            assigned = s().jobs.filter(
              (j) => j.technician_id === t.id && active(j),
            ),
            minutes = s()
              .workLogs.filter((w) => w.technician_id === t.id)
              .reduce((n, w) => n + w.minutes, 0);
          p.append(
            el("p", t.specialty, "muted"),
            line("Offene Aufträge", assigned.length),
            line("Erfasste Arbeitszeit", minutes + " Minuten"),
          );
          assigned.forEach((j) =>
            p.append(
              line(
                button(
                  "#" + j.id + " · " + j.device,
                  () => open(j.id),
                  "text-button",
                ),
                statusBadge(j),
              ),
            ),
          );
          return p;
        }),
      ),
    );
  } else if (view === "reports") {
    content = page(
      "Aufwand nachvollziehen.",
      "Freigaben, tatsächliche Arbeitszeiten und abgeschlossene Reparaturen.",
      [
        Object.assign(el("a", "Bericht als CSV ↗", "button-link"), {
          href: "/api/report.csv",
        }),
      ],
    );
    const accepted = s().quotes.filter((q) => q.status === "accepted"),
      p = panel("Aufträge im Vergleich");
    content.append(
      metric([
        [
          "Abgeholt",
          s().jobs.filter((j) => j.status === "collected").length,
          "Vollständig abgeschlossen",
        ],
        [
          "Freigegebener Wert",
          money(accepted.reduce((n, q) => n + q.total, 0)),
          "Keine Zahlungsabrechnung",
        ],
        [
          "Arbeitsminuten",
          s().workLogs.reduce((n, w) => n + w.minutes, 0),
          "Alle Zeitbuchungen",
        ],
        [
          "Unter Mindestbestand",
          s().parts.filter((p) => p.available < p.minimum).length,
          "Verfügbare Ersatzteile",
        ],
      ]),
    );
    p.append(
      table(
        [
          "Auftrag",
          "Status",
          "Geplante Zeit",
          "Erfasste Zeit",
          "Freigegebener Betrag",
          "Aktion",
        ],
        s().jobs.map((j) => {
          const q = quotes(j.id).find((q) => q.status === "accepted");
          return [
            "#" + j.id + " · " + j.device,
            statusBadge(j),
            q ? q.minutes + " min" : "—",
            logs(j.id).reduce((n, w) => n + w.minutes, 0) + " min",
            q ? money(q.total) : "—",
            button("Öffnen", () => open(j.id)),
          ];
        }),
      ),
    );
    content.append(
      p,
      el(
        "p",
        "Angebote und Kundenfreigaben werden lokal protokolliert. Diese Übersicht erzeugt keine Rechnung und verarbeitet keine Zahlungen.",
        "notice",
      ),
    );
  } else if (view === "audit") {
    content = page(
      "Vom ersten Hinweis bis zur Abholung.",
      "Die letzten 200 Aktionen. Vollständiger Verlauf im Datenexport.",
    );
    content.append(auditPanel(s().audit));
  } else detail();
}
function jobTable(items) {
  return table(
    ["Auftrag / Gerät", "Kunde", "Status", "Zuständig", "Zieltermin", "Aktion"],
    items.map((j) => {
      const copy = el("div");
      copy.append(
        el("strong", "#" + String(j.id).padStart(4, "0") + " · " + j.device),
        el("small", j.serial || "Keine Seriennummer"),
      );
      return [
        copy,
        customer(j.customer_id).name,
        statusBadge(j),
        technician(j.technician_id)?.name ?? "Offen",
        actions(
          el("span", date(j.due)),
          ...(active(j) && j.due < s().now.slice(0, 10)
            ? [badge("Überfällig", "warn")]
            : []),
        ),
        button("Auftrag öffnen", () => open(j.id)),
      ];
    }),
  );
}
function detail() {
  const j = job(jobId),
    controls = [button("← Aufträge", () => go("jobs"))];
  if (active(j))
    controls.push(button("Zuständigkeit & Termin", () => assign(j)));
  else controls.push(button("Drucken", () => window.print()));
  const content = page(
    j.device,
    "Auftrag #" +
      String(j.id).padStart(4, "0") +
      " · " +
      customer(j.customer_id).name +
      " · " +
      (j.serial || "Ohne Seriennummer"),
    controls,
  );
  content.append(
    actions(
      statusBadge(j),
      badge("Priorität " + j.priority),
      badge("Ziel: " + date(j.due), "neutral"),
    ),
  );
  const stagebar = el("div", null, "stagebar");
  stagebar.tabIndex = 0;
  stagebar.setAttribute("aria-label", "Bearbeitungsstationen");
  for (const stage of stages)
    stagebar.append(
      el("span", status[stage], stage === j.status ? "current" : ""),
    );
  content.append(stagebar);
  const work = panel("Auftrag & nächste Schritte"),
    next = actions();
  work.append(
    el("h3", "Gemeldetes Fehlerbild"),
    el("p", j.issue, "long-text"),
    line(
      "Zuständig",
      technician(j.technician_id)?.name ?? "Noch nicht zugewiesen",
    ),
  );
  if (j.diagnosis)
    work.append(el("h3", "Diagnose"), el("p", j.diagnosis, "long-text"));
  if (["received", "diagnosing"].includes(j.status))
    next.append(button("Diagnose erfassen", () => diagnose(j), "primary"));
  if (["diagnosing", "quoted"].includes(j.status))
    next.append(
      button("Kostenvoranschlag erstellen", () => newQuote(j), "primary"),
    );
  if (j.status === "approved")
    next.append(
      button(
        "Reparatur starten",
        () =>
          confirm(
            "Reparatur beginnen?",
            "Die reservierten Ersatzteile werden ausgebucht. Dieser Schritt ist nur einmal möglich.",
            () => app.command({ type: "job.start", id: j.id }),
          ),
        "primary",
      ),
    );
  if (["repairing", "testing"].includes(j.status))
    next.append(button("Arbeitszeit erfassen", () => workLog(j), "primary"));
  if (j.status === "repairing")
    next.append(
      button("Zur Abschlussprüfung", () =>
        app.command({ type: "job.testing", id: j.id }),
      ),
    );
  if (j.status === "testing")
    next.append(
      button(
        "Abholbereit melden",
        () => app.command({ type: "job.ready", id: j.id }),
        "primary",
      ),
      button("Nacharbeit", () => resume(j)),
    );
  if (j.status === "ready")
    next.append(button("Abholung erfassen", () => collect(j), "primary"));
  if (["received", "diagnosing", "quoted", "approved"].includes(j.status))
    next.append(button("Auftrag stornieren", () => cancelJob(j), "danger"));
  work.append(next);
  const offer = panel("Kostenvoranschläge"),
    qs = quotes(j.id);
  if (!qs.length)
    offer.append(
      el("p", "Nach der Diagnose entsteht hier das erste Angebot.", "muted"),
    );
  for (const [i, q] of qs.entries()) {
    const block = el("div", null, "quote-block");
    block.append(
      actions(
        el("h3", "Angebot #" + q.id),
        badge(
          {
            offered: "Offen",
            accepted: "Freigegeben",
            rejected: "Abgelehnt",
            superseded: "Ersetzt",
            cancelled: "Storniert",
          }[q.status],
          q.status === "accepted" ? "good" : "neutral",
        ),
      ),
    );
    if (i === 0) {
      for (const x of q.parts)
        block.append(
          line(
            x.quantity + " × " + part(x.part_id).name,
            money(x.quantity * x.price),
          ),
        );
      block.append(
        line(
          q.minutes + " min Arbeit · " + money(q.rate) + "/h",
          money(Math.round((q.minutes * q.rate) / 60)),
        ),
        line("Gesamt", money(q.total)),
        el("p", q.note, "muted"),
      );
    } else block.append(line(date(q.created, true), money(q.total)));
    if (q.status === "offered" && j.status === "quoted")
      block.append(
        actions(
          button(
            "Freigabe erfassen",
            () =>
              confirm(
                "Kundenfreigabe protokollieren?",
                "Alle benötigten Teile werden gemeinsam reserviert. Es wird keine Nachricht versendet.",
                () => app.command({ type: "quote.accept", id: q.id }),
              ),
            "primary",
          ),
          button("Ablehnung erfassen", () => rejectQuote(q)),
        ),
      );
    offer.append(block);
  }
  content.append(split(work, offer));
  if (["repairing", "testing", "ready", "collected"].includes(j.status)) {
    const tests = panel("Abschlussprüfung");
    for (const kind of s().checkKinds) {
      const check = s().checks.find(
        (c) => c.job_id === j.id && c.kind === kind,
      );
      tests.append(
        line(
          kind,
          actions(
            badge(
              check
                ? check.passed
                  ? "Bestanden"
                  : "Nicht bestanden"
                : "Offen",
              check?.passed ? "good" : check ? "bad" : "neutral",
            ),
            ...(j.status === "testing"
              ? [button("Ergebnis erfassen", () => recordCheck(j, kind, check))]
              : []),
          ),
        ),
      );
      if (check) tests.append(el("p", check.note, "muted"));
    }
    content.append(tests);
  }
  const times = panel("Ausgeführte Arbeiten");
  times.append(
    table(
      ["Zeit", "Person", "Dauer", "Beschreibung"],
      logs(j.id).map((w) => [
        date(w.created, true),
        technician(w.technician_id).name,
        w.minutes + " min",
        w.note,
      ]),
    ),
  );
  content.append(times);
}

const defaultDue = () =>
  new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
function newCustomer() {
  modal(
    "Kundenkontakt anlegen",
    "Kontaktdaten bleiben in diesem Arbeitsbereich.",
    (form) => {
      const name = field(form, "Name"),
        email = field(form, "E-Mail", { type: "email" }),
        phone = field(form, "Telefon", { required: false, type: "tel" });
      return () =>
        app.command({
          type: "customer.create",
          name: value(name),
          email: value(email),
          phone: value(phone),
        });
    },
  );
}
function newTechnician() {
  modal(
    "Teammitglied hinzufügen",
    "Organisatorische Zuständigkeit, ohne Benutzerkonto.",
    (form) => {
      const name = field(form, "Name"),
        specialty = field(form, "Schwerpunkt");
      return () =>
        app.command({
          type: "technician.create",
          name: value(name),
          specialty: value(specialty),
        });
    },
  );
}
function newJob() {
  if (!s().customers.length) {
    newCustomer();
    return;
  }
  modal(
    "Reparatur annehmen",
    "Gerät, Fehlerbild und gewünschter Termin bilden den Ausgangspunkt.",
    (form) => {
      const customerId = field(form, "Kunde", {
          type: "select",
          options: s().customers.map((c) => [c.id, c.name]),
        }),
        device = field(form, "Gerät"),
        serial = field(form, "Seriennummer", { required: false }),
        priority = field(form, "Priorität", {
          type: "select",
          options: [
            [1, "P1 · Hoch"],
            [2, "P2 · Normal"],
            [3, "P3 · Niedrig"],
          ],
          value: 2,
        }),
        due = field(form, "Zieltermin", { type: "date", value: defaultDue() }),
        issue = field(form, "Fehlerbeschreibung", {
          type: "textarea",
          wide: true,
        });
      return () =>
        app.command({
          type: "job.create",
          customerId: number(customerId),
          device: value(device),
          serial: value(serial),
          priority: number(priority),
          due: value(due),
          issue: value(issue),
        });
    },
    "Auftrag anlegen",
  );
}
function assign(j) {
  if (!s().technicians.length) {
    newTechnician();
    return;
  }
  modal("Zuständigkeit & Termin", j.device, (form) => {
    const person = field(form, "Zuständige Person", {
        type: "select",
        value: j.technician_id,
        options: s().technicians.map((t) => [t.id, t.name]),
      }),
      due = field(form, "Zieltermin", { type: "date", value: j.due }),
      priority = field(form, "Priorität", {
        type: "select",
        value: j.priority,
        options: [
          [1, "P1 · Hoch"],
          [2, "P2 · Normal"],
          [3, "P3 · Niedrig"],
        ],
      });
    return () =>
      app.command({
        type: "job.assign",
        id: j.id,
        technicianId: number(person),
        due: value(due),
        priority: number(priority),
      });
  });
}
function diagnose(j) {
  modal(
    "Diagnose erfassen",
    "Prüfbefund und vorgeschlagenes Vorgehen dokumentieren.",
    (form) => {
      const diagnosis = field(form, "Diagnose", {
        type: "textarea",
        wide: true,
        value: j.diagnosis,
      });
      return () =>
        app.command({
          type: "job.diagnose",
          id: j.id,
          diagnosis: value(diagnosis),
        });
    },
  );
}
function newPart() {
  modal(
    "Ersatzteil anlegen",
    "Der Anfangsbestand wird als Teilebewegung protokolliert.",
    (form) => {
      const sku = field(form, "SKU"),
        name = field(form, "Bezeichnung"),
        stock = field(form, "Anfangsbestand", {
          type: "number",
          min: 0,
          value: 0,
        }),
        minimum = field(form, "Mindestbestand", {
          type: "number",
          min: 0,
          value: 2,
        }),
        price = field(form, "Teilepreis in Euro", {
          type: "number",
          min: 0,
          step: 0.01,
          value: 0,
        });
      return () =>
        app.command({
          type: "part.create",
          sku: value(sku),
          name: value(name),
          stock: number(stock),
          minimum: number(minimum),
          price: Math.round(number(price) * 100),
        });
    },
  );
}
function editPart(p) {
  modal(
    "Teiledaten bearbeiten",
    "Bestehende Angebote behalten ihre gespeicherten Preise.",
    (form) => {
      const minimum = field(form, "Mindestbestand", {
          type: "number",
          min: 0,
          value: p.minimum,
        }),
        price = field(form, "Teilepreis in Euro", {
          type: "number",
          min: 0,
          step: 0.01,
          value: p.price / 100,
        });
      return () =>
        app.command({
          type: "part.update",
          id: p.id,
          minimum: number(minimum),
          price: Math.round(number(price) * 100),
        });
    },
  );
}
function adjustPart(p) {
  modal(
    "Teilebestand buchen",
    p.name + " · " + p.stock + " im Lager, " + p.reserved + " reserviert.",
    (form) => {
      const delta = field(form, "Mengenänderung (+ / −)", {
          type: "number",
          value: 1,
          min: -100000,
        }),
        reason = field(form, "Begründung", { value: "Wareneingang" });
      return () =>
        app.command({
          type: "part.adjust",
          id: p.id,
          delta: number(delta),
          reason: value(reason),
        });
    },
  );
}
function newQuote(j) {
  const previous = quotes(j.id)[0];
  modal(
    "Kostenvoranschlag erstellen",
    "Preise werden beim Speichern festgehalten. Eine neue Fassung ersetzt ein noch offenes Angebot.",
    (form) => {
      const minutes = field(form, "Geplante Arbeitsminuten", {
          type: "number",
          min: 1,
          value: previous?.minutes ?? 60,
        }),
        rate = field(form, "Stundensatz in Euro", {
          type: "number",
          min: 0,
          step: 0.01,
          value: (previous?.rate ?? 7200) / 100,
        }),
        note = field(form, "Leistungsbeschreibung", {
          type: "textarea",
          wide: true,
          value: previous?.note ?? j.diagnosis,
        }),
        block = el("div", null, "wide"),
        entries = [];
      const preview = el("p", null, "notice wide");
      const read = () =>
        entries
          .filter((e) => e.row.parentNode === block)
          .map((e) => ({ partId: number(e.part), quantity: number(e.qty) }));
      const update = () =>
        (preview.textContent =
          "Voraussichtlicher Gesamtbetrag: " +
          money(
            Math.round(
              (number(minutes) * Math.round(number(rate) * 100)) / 60,
            ) +
              read().reduce(
                (n, x) => n + (part(x.partId)?.price ?? 0) * x.quantity,
                0,
              ),
          ));
      const add = (item) => {
        if (!s().parts.length) return;
        const row = el("div", null, "editor-row"),
          id = field(row, "Ersatzteil", {
            type: "select",
            value: item?.part_id,
            options: s().parts.map((p) => [
              p.id,
              p.sku + " · " + p.name + " (" + p.available + " frei)",
            ]),
          }),
          qty = field(row, "Menge", {
            type: "number",
            min: 1,
            value: item?.quantity ?? 1,
          }),
          remove = button("×", () => {
            row.remove();
            update();
          });
        remove.setAttribute("aria-label", "Teileposition entfernen");
        id.onchange = update;
        qty.oninput = update;
        row.append(remove);
        entries.push({ row, part: id, qty });
        block.append(row);
        update();
      };
      form.append(block);
      for (const item of previous?.parts ?? []) add(item);
      const addButton = button("＋ Ersatzteilposition", () => add());
      addButton.disabled = !s().parts.length;
      addButton.classList.add("wide");
      form.append(addButton, preview);
      minutes.oninput = update;
      rate.oninput = update;
      update();
      return () =>
        app.command({
          type: "quote.create",
          jobId: j.id,
          minutes: number(minutes),
          rate: Math.round(number(rate) * 100),
          note: value(note),
          parts: read(),
        });
    },
    "Angebot speichern",
  );
}
function rejectQuote(q) {
  modal(
    "Ablehnung dokumentieren",
    "Der Auftrag geht zurück in die Diagnose. Ein neues Angebot kann folgen.",
    (form) => {
      const reason = field(form, "Begründung", {
        type: "textarea",
        wide: true,
      });
      return () =>
        app.command({ type: "quote.reject", id: q.id, reason: value(reason) });
    },
  );
}
function workLog(j) {
  modal(
    "Arbeitszeit erfassen",
    "Tatsächlichen Aufwand dokumentieren. Das freigegebene Angebot bleibt unverändert.",
    (form) => {
      const person = field(form, "Ausführende Person", {
          type: "select",
          value: j.technician_id,
          options: s().technicians.map((t) => [t.id, t.name]),
        }),
        minutes = field(form, "Arbeitsminuten", {
          type: "number",
          min: 1,
          max: 1440,
          value: 30,
        }),
        note = field(form, "Ausgeführte Arbeiten", {
          type: "textarea",
          wide: true,
        });
      return () =>
        app.command({
          type: "work.log",
          jobId: j.id,
          technicianId: number(person),
          minutes: number(minutes),
          note: value(note),
        });
    },
  );
}
function recordCheck(j, kind, check) {
  modal(
    "Prüfergebnis: " + kind,
    "Prüfbefund für diesen Auftrag dokumentieren.",
    (form) => {
      const passed = field(form, "Ergebnis", {
          type: "select",
          value: check ? String(Boolean(check.passed)) : "true",
          options: [
            ["true", "Bestanden"],
            ["false", "Nicht bestanden"],
          ],
        }),
        note = field(form, "Prüfbefund", {
          type: "textarea",
          wide: true,
          value: check?.note,
        });
      return () =>
        app.command({
          type: "check.record",
          jobId: j.id,
          kind,
          passed: passed.value === "true",
          note: value(note),
        });
    },
  );
}
function resume(j) {
  modal(
    "Zur Nacharbeit zurückgeben",
    "Alle bisherigen Prüfmarkierungen werden zurückgesetzt, damit nach der Nacharbeit neu geprüft wird.",
    (form) => {
      const reason = field(form, "Grund der Nacharbeit", {
        type: "textarea",
        wide: true,
      });
      return () =>
        app.command({ type: "job.resume", id: j.id, reason: value(reason) });
    },
  );
}
function collect(j) {
  modal(
    "Abholung erfassen",
    "Die Reparatur wird abgeschlossen. Es erfolgt keine Zahlungsbuchung.",
    (form) => {
      const name = field(form, "Abgeholt durch", {
        value: customer(j.customer_id).name,
      });
      return () =>
        app.command({ type: "job.collect", id: j.id, name: value(name) });
    },
    "Abholung bestätigen",
  );
}
function cancelJob(j) {
  modal(
    "Auftrag vor Arbeitsbeginn stornieren",
    "Reservierte Ersatzteile werden wieder verfügbar. Bisherige Vorgänge bleiben dokumentiert.",
    (form) => {
      const reason = field(form, "Begründung", {
        type: "textarea",
        wide: true,
      });
      return () =>
        app.command({ type: "job.cancel", id: j.id, reason: value(reason) });
    },
  );
}
app.load().catch(reportError);
