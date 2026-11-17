import {
  $,
  el,
  button,
  badge,
  money,
  date,
  localTime,
  toISO,
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
let view = "overview",
  eventId = null,
  tab = "program",
  query = "",
  guestEvent = "",
  guestStatus = "";
const labels = {
  draft: "Entwurf",
  published: "Anmeldung offen",
  closed: "Abgeschlossen",
  cancelled: "Abgesagt",
  confirmed: "Bestätigt",
  waitlisted: "Warteliste",
};
const nav = [
  ["overview", "◉", "Überblick"],
  ["events", "▤", "Veranstaltungen"],
  ["calendar", "◷", "Spielplan"],
  ["guests", "♙", "Gäste & Check-in"],
  ["rooms", "▧", "Räume"],
  ["budget", "€", "Budget"],
  ["audit", "≡", "Verlauf"],
];
const app = application(draw),
  s = () => app.state,
  event = (id) => s().events.find((e) => e.id === id),
  room = (id) => s().rooms.find((r) => r.id === id),
  bookings = (id) => s().bookings.filter((b) => b.event_id === id),
  expenses = (id) => s().expenses.filter((x) => x.event_id === id);
function go(next) {
  view = next;
  query = "";
  draw();
}
function open(id, next = "program") {
  eventId = id;
  tab = next;
  view = "detail";
  draw();
  window.scrollTo(0, 0);
}
const active = (e) => ["draft", "published"].includes(e.status);
const confirmed = (e) =>
  bookings(e.id).filter((b) => b.status === "confirmed").length;
const eventBadge = (e) =>
  badge(
    labels[e.status],
    e.status === "published"
      ? "good"
      : e.status === "cancelled"
        ? "bad"
        : "neutral",
  );
function eventCard(e, featured = false) {
  const card = el(
      "article",
      null,
      "event-card" + (featured ? " featured" : ""),
    ),
    art = el("div", null, "event-art"),
    d = new Date(e.start);
  art.append(
    el("span", e.category, "event-category"),
    el("strong", String(d.getDate()).padStart(2, "0"), "event-day"),
    el("span", d.toLocaleString("de-DE", { month: "long" }), "event-month"),
    el("span", "✳", "event-symbol"),
  );
  const body = el("div", null, "event-body");
  body.append(
    eventBadge(e),
    el("h2", e.title),
    el("p", e.description, "event-description"),
    line(e.venue, date(e.start, true)),
    progress(confirmed(e), e.capacity, "Bestätigte Gäste"),
    line(confirmed(e) + " / " + e.capacity + " Gäste", money(e.price)),
    button("Veranstaltung öffnen ↗", () => open(e.id), "primary"),
  );
  card.append(art, body);
  return card;
}
function sessionRow(item) {
  const row = el("div", null, "session-row"),
    clock = el("div", null, "session-clock"),
    copy = el("div");
  clock.append(
    el(
      "strong",
      new Date(item.start).toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    ),
    el(
      "small",
      new Date(item.end).toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    ),
  );
  copy.append(
    el("h3", item.title),
    el(
      "small",
      room(item.room_id).name + " · " + (item.speaker || "Ohne Referent:in"),
    ),
  );
  row.append(clock, copy);
  return row;
}
function draw() {
  if (!s()) return;
  navigation(nav, view === "detail" ? "events" : view, go);
  $("breadcrumb").textContent =
    view === "detail"
      ? event(eventId).title
      : nav.find((n) => n[0] === view)[2];
  let content;
  if (view === "overview") {
    content = page(
      "Gute Momente beginnen hier.",
      "Dein Programm, deine Gäste, dein nächster großer Abend.",
      [button("＋ Veranstaltung", () => editEvent(), "primary")],
    );
    const upcoming = s().events.filter(
        (e) => e.status === "published" && e.end >= s().now,
      ),
      waiting = s().bookings.filter(
        (b) =>
          b.status === "waitlisted" && event(b.event_id).status === "published",
      ).length;
    content.append(
      metric([
        [
          "Offene Veranstaltungen",
          upcoming.length,
          "Begegnungen in Vorbereitung",
        ],
        [
          "Bestätigte Gäste",
          s().bookings.filter((b) => b.status === "confirmed").length,
          "Über alle Veranstaltungen",
        ],
        ["Auf der Warteliste", waiting, "Automatisches Nachrücken"],
        ["Programmpunkte", s().sessions.length, "Zeit und Raum sind geplant"],
      ]),
    );
    const next = upcoming[0];
    if (next) {
      const aside = panel("Als Nächstes auf der Bühne");
      s()
        .sessions.filter((p) => p.event_id === next.id)
        .forEach((p) => aside.append(sessionRow(p)));
      aside.append(
        el(
          "p",
          "Anmeldungen, Programm und Kosten laufen hier zusammen.",
          "muted",
        ),
        button("Gästeliste öffnen", () => open(next.id, "guests")),
      );
      content.append(split(eventCard(next, true), aside));
    }
    const heading = el("div", null, "section-head");
    heading.append(
      el("h2", "Was noch vor uns liegt"),
      button("Alle Veranstaltungen ↗", () => go("events"), "text-button"),
    );
    content.append(
      heading,
      grid(
        ...s()
          .events.filter((e) => e.id !== next?.id)
          .slice(0, 4)
          .map((e) => eventCard(e)),
      ),
    );
  } else if (view === "events") {
    content = page(
      "Mehr als ein Termin.",
      "Veranstaltungen von der ersten Idee bis zum Abschluss.",
      [button("＋ Veranstaltung", () => editEvent(), "primary")],
    );
    const results = el("div", null, "grid");
    const render = () =>
      results.replaceChildren(
        ...s()
          .events.filter((e) =>
            [e.title, e.category, e.venue]
              .join(" ")
              .toLowerCase()
              .includes(query.toLowerCase()),
          )
          .map((e) => eventCard(e)),
      );
    content.append(
      searchBar(
        "Veranstaltungen suchen",
        (q) => {
          query = q;
          render();
        },
        query,
      ),
      results,
    );
    render();
  } else if (view === "calendar") {
    content = page(
      "Ein Plan. Viele Möglichkeiten.",
      "Alle Programmpunkte nach Tagen, mit verbindlicher Raumbelegung.",
      [
        Object.assign(el("a", "Kalender exportieren ↗", "button-link"), {
          href: "/api/calendar.ics",
        }),
      ],
    );
    const byDay = new Map();
    for (const item of s().sessions.filter(
      (p) => event(p.event_id).status !== "cancelled",
    )) {
      const key = date(item.start);
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push(item);
    }
    for (const [day, items] of byDay) {
      const p = panel(day);
      for (const item of items) {
        const row = sessionRow(item);
        row.append(
          button(
            event(item.event_id).title,
            () => open(item.event_id),
            "text-button",
          ),
        );
        p.append(row);
      }
      content.append(p);
    }
    if (!byDay.size)
      content.append(el("p", "Noch keine Programmpunkte.", "empty"));
  } else if (view === "guests") {
    content = page(
      "Ein herzliches Willkommen.",
      "Anmeldungen verwalten, Wartelisten begleiten und Gäste einchecken.",
      [button("＋ Anmeldung", () => newBooking(), "primary")],
    );
    const p = panel(),
      bar = el("div", null, "toolbar");
    const filter = field(bar, "Veranstaltung", {
      type: "select",
      value: guestEvent,
      options: [
        ["", "Alle Veranstaltungen"],
        ...s().events.map((e) => [e.id, e.title]),
      ],
    });
    const status = field(bar, "Anmeldestatus", {
      type: "select",
      value: guestStatus,
      options: [
        ["", "Alle"],
        ["confirmed", "Bestätigt"],
        ["waitlisted", "Warteliste"],
        ["cancelled", "Storniert"],
      ],
    });
    const search = field(bar, "Gäste suchen", {
      type: "search",
      value: query,
      required: false,
    });
    const render = () =>
      p.replaceChildren(
        guestTable(
          s().bookings.filter(
            (b) =>
              (!guestEvent || b.event_id === Number(guestEvent)) &&
              (!guestStatus || b.status === guestStatus) &&
              [b.name, b.email]
                .join(" ")
                .toLowerCase()
                .includes(query.toLowerCase()),
          ),
        ),
      );
    filter.onchange = () => {
      guestEvent = filter.value;
      render();
    };
    status.onchange = () => {
      guestStatus = status.value;
      render();
    };
    search.oninput = () => {
      query = search.value;
      render();
    };
    content.append(bar, p);
    render();
  } else if (view === "rooms") {
    content = page(
      "Platz für deine Ideen.",
      "Raumkapazitäten und kommende Belegungen zusammen sehen.",
      [button("＋ Raum", newRoom, "primary")],
    );
    content.append(
      grid(
        ...s().rooms.map((r) => {
          const p = panel(r.name);
          p.append(el("p", r.location, "muted"), badge(r.capacity + " Plätze"));
          for (const item of s()
            .sessions.filter(
              (x) =>
                x.room_id === r.id && event(x.event_id).status !== "cancelled",
            )
            .slice(0, 5))
            p.append(
              line(
                date(item.start, true),
                button(item.title, () => open(item.event_id), "text-button"),
              ),
            );
          return p;
        }),
      ),
    );
  } else if (view === "budget") {
    content = page(
      "Mit gutem Gefühl planen.",
      "Ticketwerte, Plankosten und tatsächlich erfasste Ausgaben.",
      [button("＋ Kostenposition", () => newExpense(), "primary")],
    );
    const p = panel("Veranstaltungen im Vergleich");
    p.append(
      table(
        [
          "Veranstaltung",
          "Budget",
          "Plankosten",
          "Istkosten",
          "Ticketwert",
          "Aktion",
        ],
        s().events.map((e) => {
          const xs = expenses(e.id);
          return [
            e.title,
            money(e.budget),
            money(xs.reduce((n, x) => n + x.planned, 0)),
            money(xs.reduce((n, x) => n + (x.actual ?? 0), 0)),
            money(confirmed(e) * e.price),
            button("Details", () => open(e.id, "budget")),
          ];
        }),
      ),
    );
    content.append(
      p,
      el(
        "p",
        "Ticketwert = bestätigte Anmeldungen × Preis. Die App verarbeitet keine Zahlungen.",
        "notice",
      ),
    );
  } else if (view === "audit") {
    content = page(
      "Jeder Schritt bleibt sichtbar.",
      "Die letzten 200 Aktionen. Der Datenexport enthält den vollständigen Verlauf.",
    );
    content.append(auditPanel(s().audit));
  } else detail();
}
function guestTable(items) {
  return table(
    ["Gast", "Veranstaltung", "Status", "Check-in", "Aktionen"],
    items.map((b) => {
      const e = event(b.event_id),
        copy = el("div", null, "row-copy");
      copy.append(el("strong", b.name), el("small", b.email));
      const controls = actions();
      if (e.status === "published" && b.status === "confirmed")
        controls.append(
          button(
            b.checked_in ? "Check-in zurücknehmen" : "Einchecken",
            () =>
              app.command({
                type: "booking.checkin",
                id: b.id,
                value: !b.checked_in,
              }),
            b.checked_in ? "" : "primary",
          ),
        );
      if (active(e) && b.status !== "cancelled")
        controls.append(
          button("Stornieren", () =>
            confirm(
              "Anmeldung stornieren?",
              b.checked_in
                ? "Check-in muss zuerst zurückgenommen werden."
                : "Der nächste Gast auf der Warteliste rückt automatisch nach.",
              () => app.command({ type: "booking.cancel", id: b.id }),
            ),
          ),
        );
      return [
        copy,
        e.title,
        badge(
          labels[b.status] ?? "Storniert",
          b.status === "waitlisted"
            ? "warn"
            : b.status === "confirmed"
              ? "good"
              : "neutral",
        ),
        b.checked_in ? "Anwesend" : "—",
        controls,
      ];
    }),
    "Gästeliste",
  );
}
function detail() {
  const e = event(eventId),
    controls = [button("← Veranstaltungen", () => go("events"))];
  if (active(e)) controls.push(button("Bearbeiten", () => editEvent(e)));
  if (e.status === "draft")
    controls.push(
      button(
        "Anmeldung öffnen",
        () =>
          confirm(
            "Anmeldung öffnen?",
            "Programm und Kapazität sind vorbereitet.",
            () => app.command({ type: "event.publish", id: e.id }),
          ),
        "primary",
      ),
    );
  if (e.status === "published")
    controls.push(
      button("Abschließen", () =>
        confirm(
          "Veranstaltung abschließen?",
          "Anmeldung und Check-in schließen. Istkosten können noch ergänzt werden.",
          () => app.command({ type: "event.close", id: e.id }),
        ),
      ),
    );
  const content = page(
    e.title,
    e.venue + " · " + date(e.start, true) + " – " + date(e.end, true),
    controls,
  );
  content.append(
    actions(
      eventBadge(e),
      badge(e.category),
      badge(confirmed(e) + " / " + e.capacity + " bestätigt"),
    ),
  );
  const tabs = el("div", null, "tabs");
  for (const [key, title] of [
    ["program", "Programm"],
    ["guests", "Gäste"],
    ["budget", "Budget & Kosten"],
  ]) {
    const b = button(title, () => {
      tab = key;
      draw();
    });
    b.setAttribute("aria-pressed", String(tab === key));
    tabs.append(b);
  }
  content.append(tabs);
  if (tab === "program") {
    const program = panel(
      "Der Ablauf",
      active(e) ? [button("＋ Programmpunkt", () => editSession(null, e))] : [],
    );
    for (const item of s().sessions.filter((x) => x.event_id === e.id)) {
      const row = sessionRow(item);
      if (active(e))
        row.append(
          actions(
            button("Bearbeiten", () => editSession(item, e)),
            button("Entfernen", () =>
              confirm("Programmpunkt entfernen?", item.title, () =>
                app.command({ type: "session.delete", id: item.id }),
              ),
            ),
          ),
        );
      program.append(row);
    }
    const info = panel("Über die Veranstaltung");
    info.append(
      el("p", e.description, "long-text"),
      line("Ticketpreis", money(e.price)),
      line("Kapazität", e.capacity + " Personen"),
      el(
        "p",
        "Event-Anmeldungen buchen keine einzelnen Workshop-Sitzplätze. Raumbelegungen werden auf Überschneidungen geprüft.",
        "muted",
      ),
    );
    if (active(e))
      info.append(
        button("Veranstaltung absagen", () => cancelEvent(e), "danger"),
      );
    content.append(split(program, info));
  } else if (tab === "guests") {
    const p = panel(
      "Anmeldungen",
      e.status === "published"
        ? [button("＋ Anmeldung", () => newBooking(e), "primary")]
        : [],
    );
    p.append(guestTable(bookings(e.id)));
    content.append(p);
  } else {
    const xs = expenses(e.id),
      planned = xs.reduce((n, x) => n + x.planned, 0),
      actual = xs.reduce((n, x) => n + (x.actual ?? 0), 0);
    content.append(
      metric([
        ["Budget", money(e.budget), "Geplanter Rahmen"],
        ["Plankosten", money(planned), "Alle Kostenpositionen"],
        [
          "Istkosten",
          money(actual),
          xs.filter((x) => x.actual === null).length + " Positionen noch offen",
        ],
        [
          "Ticketwert",
          money(confirmed(e) * e.price),
          "Keine Zahlungsabwicklung",
        ],
      ]),
    );
    const p = panel(
      "Kostenpositionen",
      active(e) ? [button("＋ Kostenposition", () => newExpense(e))] : [],
    );
    p.append(
      table(
        ["Position", "Kategorie", "Geplant", "Tatsächlich", "Aktion"],
        xs.map((x) => [
          x.label,
          x.category,
          money(x.planned),
          x.actual === null ? "Noch offen" : money(x.actual),
          e.status !== "cancelled"
            ? button("Istkosten setzen", () => actualExpense(x))
            : "—",
        ]),
      ),
    );
    content.append(
      p,
      el(
        "p",
        "Budgetabweichung zum Plan: " +
          money(e.budget - planned) +
          ". Positive Werte sind verbleibender Spielraum.",
        "notice",
      ),
    );
  }
}

function editEvent(e) {
  modal(
    e ? "Veranstaltung bearbeiten" : "Veranstaltung anlegen",
    "Zeiten gelten in der Zeitzone deines Browsers. Neue Veranstaltungen starten als Entwurf.",
    (form) => {
      const title = field(form, "Titel", { value: e?.title }),
        category = field(form, "Thema", { value: e?.category ?? "Kultur" }),
        venue = field(form, "Veranstaltungsort", {
          value: e?.venue ?? "Kulturhaus West",
        }),
        capacity = field(form, "Event-Kapazität", {
          type: "number",
          min: 1,
          value: e?.capacity ?? 50,
        }),
        start = field(form, "Beginn", {
          type: "datetime-local",
          value: localTime(
            e?.start ?? new Date(Date.now() + 86400000).toISOString(),
          ),
        }),
        end = field(form, "Ende", {
          type: "datetime-local",
          value: localTime(
            e?.end ?? new Date(Date.now() + 93600000).toISOString(),
          ),
        }),
        price = field(form, "Ticketpreis in Euro", {
          type: "number",
          min: 0,
          step: 0.01,
          value: (e?.price ?? 0) / 100,
        }),
        budget = field(form, "Budget in Euro", {
          type: "number",
          min: 0,
          step: 0.01,
          value: (e?.budget ?? 50000) / 100,
        }),
        description = field(form, "Beschreibung", {
          type: "textarea",
          wide: true,
          value: e?.description,
        });
      return () =>
        app.command({
          type: e ? "event.update" : "event.create",
          ...(e ? { id: e.id } : {}),
          title: value(title),
          category: value(category),
          venue: value(venue),
          capacity: number(capacity),
          start: toISO(start),
          end: toISO(end),
          price: Math.round(number(price) * 100),
          budget: Math.round(number(budget) * 100),
          description: value(description),
        });
    },
  );
}
function newRoom() {
  modal(
    "Raum anlegen",
    "Belegungen werden über die Programmpunkte reserviert.",
    (form) => {
      const name = field(form, "Raumname"),
        location = field(form, "Standort"),
        capacity = field(form, "Plätze", { type: "number", min: 1, value: 30 });
      return () =>
        app.command({
          type: "room.create",
          name: value(name),
          location: value(location),
          capacity: number(capacity),
        });
    },
  );
}
function editSession(item, e) {
  if (!s().rooms.length) {
    newRoom();
    return;
  }
  modal(
    item ? "Programmpunkt bearbeiten" : "Programmpunkt anlegen",
    "Die Belegung darf sich mit keinem anderen Programmpunkt in diesem Raum überschneiden.",
    (form) => {
      const title = field(form, "Programmtitel", { value: item?.title }),
        speaker = field(form, "Referent oder Act", {
          value: item?.speaker,
          required: false,
        }),
        roomId = field(form, "Raum", {
          type: "select",
          options: s().rooms.map((r) => [
            r.id,
            r.name + " · " + r.capacity + " Plätze",
          ]),
          value: item?.room_id,
        }),
        start = field(form, "Beginn", {
          type: "datetime-local",
          value: localTime(item?.start ?? e.start),
        }),
        end = field(form, "Ende", {
          type: "datetime-local",
          value: localTime(item?.end ?? e.end),
        });
      return () =>
        app.command({
          type: item ? "session.update" : "session.create",
          ...(item ? { id: item.id } : { eventId: e.id }),
          title: value(title),
          speaker: value(speaker),
          roomId: number(roomId),
          start: toISO(start),
          end: toISO(end),
        });
    },
  );
}
function newBooking(e) {
  const available = s().events.filter((e) => e.status === "published");
  if (!available.length) {
    modal(
      "Noch keine offene Anmeldung",
      "Zuerst eine Veranstaltung mit Programm anlegen und die Anmeldung öffnen.",
      (form) => {
        form.append(el("p", "Veranstaltungen beginnen als Entwurf.", "notice"));
        return async () => true;
      },
      "Verstanden",
    );
    return;
  }
  modal(
    "Gast anmelden",
    "Bei voller Kapazität kommt die Anmeldung auf die Warteliste. Freie Plätze werden in Anmeldereihenfolge vergeben.",
    (form) => {
      const id = field(form, "Veranstaltung", {
          type: "select",
          value: e?.id ?? (guestEvent || available[0].id),
          options: available.map((e) => [e.id, e.title]),
        }),
        name = field(form, "Name"),
        email = field(form, "E-Mail", { type: "email" });
      return () =>
        app.command({
          type: "booking.create",
          eventId: number(id),
          name: value(name),
          email: value(email),
        });
    },
    "Anmelden",
  );
}
function newExpense(e) {
  const available = s().events.filter(active);
  if (!available.length) {
    editEvent();
    return;
  }
  modal(
    "Kostenposition planen",
    "Istkosten können nach dem tatsächlichen Aufwand separat erfasst werden.",
    (form) => {
      const id = field(form, "Veranstaltung", {
          type: "select",
          value: e?.id,
          options: available.map((e) => [e.id, e.title]),
        }),
        label = field(form, "Bezeichnung"),
        category = field(form, "Kategorie", {
          type: "select",
          options: ["Technik", "Personal", "Verpflegung", "Raum", "Sonstiges"],
        }),
        planned = field(form, "Geplant in Euro", {
          type: "number",
          min: 0,
          step: 0.01,
          value: 0,
        });
      return () =>
        app.command({
          type: "expense.create",
          eventId: number(id),
          label: value(label),
          category: value(category),
          planned: Math.round(number(planned) * 100),
        });
    },
  );
}
function actualExpense(x) {
  modal("Istkosten erfassen", x.label, (form) => {
    const amount = field(form, "Tatsächlich in Euro", {
      type: "number",
      min: 0,
      step: 0.01,
      value: (x.actual ?? x.planned) / 100,
    });
    return () =>
      app.command({
        type: "expense.actual",
        id: x.id,
        actual: Math.round(number(amount) * 100),
      });
  });
}
function cancelEvent(e) {
  modal(
    "Veranstaltung absagen",
    "Alle Anmeldungen werden storniert. Der bisherige Verlauf bleibt erhalten.",
    (form) => {
      const reason = field(form, "Begründung", {
        type: "textarea",
        wide: true,
      });
      return () =>
        app.command({ type: "event.cancel", id: e.id, reason: value(reason) });
    },
    "Absage bestätigen",
  );
}
app.load().catch(reportError);
