import {
  database,
  workspace,
  text,
  optional,
  int,
  choice,
  email,
  instant,
  csv,
  fail,
} from "./db.mjs";
const schema =
  [
    "CREATE TABLE IF NOT EXISTS rooms(id INTEGER PRIMARY KEY,name TEXT NOT NULL,capacity INTEGER NOT NULL,location TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY,title TEXT NOT NULL,category TEXT NOT NULL,description TEXT NOT NULL,venue TEXT NOT NULL,start TEXT NOT NULL,end TEXT NOT NULL,capacity INTEGER NOT NULL,price INTEGER NOT NULL,budget INTEGER NOT NULL,status TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS sessions(id INTEGER PRIMARY KEY,event_id INTEGER NOT NULL REFERENCES events(id),room_id INTEGER NOT NULL REFERENCES rooms(id),title TEXT NOT NULL,speaker TEXT NOT NULL,start TEXT NOT NULL,end TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS bookings(id INTEGER PRIMARY KEY,event_id INTEGER NOT NULL REFERENCES events(id),name TEXT NOT NULL,email TEXT NOT NULL,status TEXT NOT NULL,checked_in INTEGER NOT NULL DEFAULT 0,created TEXT NOT NULL)",
    "CREATE UNIQUE INDEX IF NOT EXISTS active_guest ON bookings(event_id,email) WHERE status!='cancelled'",
    "CREATE TABLE IF NOT EXISTS expenses(id INTEGER PRIMARY KEY,event_id INTEGER NOT NULL REFERENCES events(id),label TEXT NOT NULL,category TEXT NOT NULL,planned INTEGER NOT NULL,actual INTEGER)",
  ].join(";") + ";";
export function openStore(dir, { seed = true } = {}) {
  const db = database(dir, "buehne", schema);
  const active = (e) => {
    if (!["draft", "published"].includes(e.status))
      fail("Diese Veranstaltung ist abgeschlossen.");
  };
  const promote = (id) => {
    const e = db.require("events", id);
    if (e.status !== "published") return;
    let free =
      e.capacity -
      db.one(
        "SELECT COUNT(*) AS n FROM bookings WHERE event_id=? AND status='confirmed'",
        id,
      ).n;
    for (const b of db.all(
      "SELECT id FROM bookings WHERE event_id=? AND status='waitlisted' ORDER BY id",
      id,
    )) {
      if (free-- <= 0) break;
      db.run("UPDATE bookings SET status='confirmed' WHERE id=?", b.id);
    }
  };
  const interval = (start, end) => {
    const s = instant(start),
      e = instant(end);
    if (s >= e) fail("Ende muss nach dem Beginn liegen.");
    return [s, e];
  };
  const read = () => ({
    rooms: db.all("SELECT * FROM rooms ORDER BY name"),
    events: db.all("SELECT * FROM events ORDER BY start"),
    sessions: db.all("SELECT * FROM sessions ORDER BY start"),
    bookings: db.all("SELECT * FROM bookings ORDER BY id"),
    expenses: db.all("SELECT * FROM expenses ORDER BY id"),
  });
  const api = workspace(db, read, (a) => {
    switch (a.type) {
      case "room.create":
        db.run(
          "INSERT INTO rooms(name,capacity,location) VALUES(?,?,?)",
          text(a.name, 100),
          int(a.capacity, 1, 10000),
          text(a.location, 160),
        );
        return "Raum angelegt: " + a.name;
      case "event.create": {
        const [start, end] = interval(a.start, a.end);
        db.run(
          "INSERT INTO events(title,category,description,venue,start,end,capacity,price,budget,status) VALUES(?,?,?,?,?,?,?,?,?,'draft')",
          text(a.title, 160),
          text(a.category, 60),
          text(a.description, 8000),
          text(a.venue, 160),
          start,
          end,
          int(a.capacity, 1, 10000),
          int(a.price, 0, 1000000),
          int(a.budget, 0, 100000000),
        );
        return "Entwurf angelegt: " + a.title;
      }
      case "event.update": {
        const e = db.require("events", a.id);
        active(e);
        const [start, end] = interval(a.start, a.end),
          capacity = int(a.capacity, 1, 10000);
        const confirmed = db.one(
          "SELECT COUNT(*) AS n FROM bookings WHERE event_id=? AND status='confirmed'",
          e.id,
        ).n;
        if (capacity < confirmed)
          fail("Kapazität liegt unter den bestätigten Anmeldungen.");
        if (
          db.one(
            "SELECT id FROM sessions WHERE event_id=? AND (start<? OR end>?)",
            e.id,
            start,
            end,
          )
        )
          fail("Alle Programmpunkte müssen im Veranstaltungszeitraum bleiben.");
        if (
          db.one(
            "SELECT id FROM bookings WHERE event_id=? AND status!='cancelled'",
            e.id,
          ) &&
          a.price !== e.price
        )
          fail("Ticketpreis nach ersten Anmeldungen nicht mehr ändern.");
        db.run(
          "UPDATE events SET title=?,category=?,description=?,venue=?,start=?,end=?,capacity=?,price=?,budget=? WHERE id=?",
          text(a.title),
          text(a.category, 60),
          text(a.description, 8000),
          text(a.venue),
          start,
          end,
          capacity,
          int(a.price, 0, 1000000),
          int(a.budget, 0, 100000000),
          e.id,
        );
        promote(e.id);
        return "Veranstaltung aktualisiert: " + a.title;
      }
      case "event.publish": {
        const e = db.require("events", a.id);
        if (e.status !== "draft")
          fail("Nur Entwürfe können veröffentlicht werden.");
        if (!db.one("SELECT id FROM sessions WHERE event_id=?", e.id))
          fail("Mindestens einen Programmpunkt anlegen.");
        db.run("UPDATE events SET status='published' WHERE id=?", e.id);
        return "Anmeldung geöffnet: " + e.title;
      }
      case "event.close": {
        const e = db.require("events", a.id);
        if (e.status !== "published")
          fail("Nur offene Veranstaltungen können abgeschlossen werden.");
        db.run("UPDATE events SET status='closed' WHERE id=?", e.id);
        return "Veranstaltung abgeschlossen: " + e.title;
      }
      case "event.cancel": {
        const e = db.require("events", a.id);
        active(e);
        const reason = text(a.reason, 500);
        db.run("UPDATE events SET status='cancelled' WHERE id=?", e.id);
        db.run("UPDATE bookings SET status='cancelled' WHERE event_id=?", e.id);
        return "Abgesagt: " + e.title + " · " + reason;
      }
      case "session.create":
      case "session.update": {
        const previous =
          a.type === "session.update" ? db.require("sessions", a.id) : null;
        const e = db.require("events", previous?.event_id ?? a.eventId),
          room = db.require("rooms", a.roomId);
        active(e);
        const [start, end] = interval(a.start, a.end);
        if (start < e.start || end > e.end)
          fail("Programmpunkt liegt außerhalb der Veranstaltung.");
        if (
          db.one(
            "SELECT s.id FROM sessions s JOIN events e ON e.id=s.event_id WHERE e.status!='cancelled' AND s.room_id=? AND s.id!=? AND s.start<? AND s.end>?",
            room.id,
            previous?.id ?? 0,
            end,
            start,
          )
        )
          fail("Der Raum ist in diesem Zeitraum bereits belegt.");
        if (previous)
          db.run(
            "UPDATE sessions SET room_id=?,title=?,speaker=?,start=?,end=? WHERE id=?",
            room.id,
            text(a.title),
            optional(a.speaker),
            start,
            end,
            previous.id,
          );
        else
          db.run(
            "INSERT INTO sessions(event_id,room_id,title,speaker,start,end) VALUES(?,?,?,?,?,?)",
            e.id,
            room.id,
            text(a.title),
            optional(a.speaker),
            start,
            end,
          );
        return "Programm: " + a.title;
      }
      case "session.delete": {
        const s = db.require("sessions", a.id);
        active(db.require("events", s.event_id));
        db.run("DELETE FROM sessions WHERE id=?", s.id);
        return "Programmpunkt entfernt: " + s.title;
      }
      case "booking.create": {
        const e = db.require("events", a.eventId);
        if (e.status !== "published") fail("Die Anmeldung ist nicht geöffnet.");
        const address = email(a.email);
        if (
          db.one(
            "SELECT id FROM bookings WHERE event_id=? AND email=? AND status!='cancelled'",
            e.id,
            address,
          )
        )
          fail("Diese Person ist bereits angemeldet.");
        const count = db.one(
          "SELECT COUNT(*) AS n FROM bookings WHERE event_id=? AND status='confirmed'",
          e.id,
        ).n;
        db.run(
          "INSERT INTO bookings(event_id,name,email,status,created) VALUES(?,?,?,?,?)",
          e.id,
          text(a.name),
          address,
          count < e.capacity ? "confirmed" : "waitlisted",
          new Date().toISOString(),
        );
        return "Anmeldung: " + a.name + " · " + e.title;
      }
      case "booking.cancel": {
        const b = db.require("bookings", a.id),
          e = db.require("events", b.event_id);
        active(e);
        if (b.status === "cancelled") fail("Bereits storniert.");
        if (b.checked_in) fail("Check-in zuerst zurücknehmen.");
        db.run("UPDATE bookings SET status='cancelled' WHERE id=?", b.id);
        promote(e.id);
        return "Anmeldung storniert: " + b.name;
      }
      case "booking.checkin": {
        const b = db.require("bookings", a.id),
          e = db.require("events", b.event_id);
        if (e.status !== "published" || b.status !== "confirmed")
          fail(
            "Check-in nur für bestätigte Anmeldungen einer offenen Veranstaltung.",
          );
        if (typeof a.value !== "boolean") fail("Check-in-Wert fehlt.");
        db.run(
          "UPDATE bookings SET checked_in=? WHERE id=?",
          Number(a.value),
          b.id,
        );
        return (
          (a.value ? "Eingecheckt: " : "Check-in zurückgenommen: ") + b.name
        );
      }
      case "expense.create": {
        const e = db.require("events", a.eventId);
        active(e);
        db.run(
          "INSERT INTO expenses(event_id,label,category,planned,actual) VALUES(?,?,?,?,NULL)",
          e.id,
          text(a.label),
          choice(a.category, [
            "Technik",
            "Personal",
            "Verpflegung",
            "Raum",
            "Sonstiges",
          ]),
          int(a.planned, 0, 100000000),
        );
        return "Kosten geplant: " + a.label;
      }
      case "expense.actual": {
        const x = db.require("expenses", a.id),
          e = db.require("events", x.event_id);
        if (e.status === "cancelled") fail("Abgesagte Veranstaltung.");
        db.run(
          "UPDATE expenses SET actual=? WHERE id=?",
          int(a.actual, 0, 100000000),
          x.id,
        );
        return "Istkosten erfasst: " + x.label;
      }
      default:
        fail("Unbekannte Aktion.");
    }
  });
  api.csv = () => {
    const s = api.snapshot();
    return csv([
      [
        "Veranstaltung",
        "Status",
        "Beginn",
        "Kapazität",
        "Bestätigt",
        "Warteliste",
        "Check-ins",
        "Ticketwert Cent",
        "Plankosten Cent",
        "Istkosten Cent",
      ],
      ...s.events.map((e) => {
        const bs = s.bookings.filter((b) => b.event_id === e.id),
          xs = s.expenses.filter((x) => x.event_id === e.id),
          confirmed = bs.filter((b) => b.status === "confirmed").length;
        return [
          e.title,
          e.status,
          e.start,
          e.capacity,
          confirmed,
          bs.filter((b) => b.status === "waitlisted").length,
          bs.filter((b) => b.checked_in).length,
          confirmed * e.price,
          xs.reduce((n, x) => n + x.planned, 0),
          xs.reduce((n, x) => n + (x.actual ?? 0), 0),
        ];
      }),
    ]);
  };
  api.calendar = () => {
    const escape = (s) =>
      s
        .replaceAll("\\", "\\\\")
        .replaceAll("\r", "")
        .replaceAll("\n", "\\n")
        .replaceAll(";", "\\;")
        .replaceAll(",", "\\,");
    const date = (s) => s.replaceAll(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Buehne//Local Planner//DE",
      ...api
        .snapshot()
        .events.filter((e) => e.status === "published")
        .flatMap((e) => [
          "BEGIN:VEVENT",
          "UID:buehne-" + e.id + "@local",
          "DTSTAMP:" + date(new Date().toISOString()),
          "DTSTART:" + date(e.start),
          "DTEND:" + date(e.end),
          "SUMMARY:" + escape(e.title),
          "LOCATION:" + escape(e.venue),
          "DESCRIPTION:" + escape(e.description),
          "END:VEVENT",
        ]),
      "END:VCALENDAR",
    ];
    // Fold by UTF-8 bytes without splitting characters (RFC 5545).
    return (
      lines
        .map((line) => {
          let rows = [],
            part = "";
          for (const char of line) {
            if (Buffer.byteLength(part + char) > 73) {
              rows.push(part);
              part = " ";
            }
            part += char;
          }
          rows.push(part);
          return rows.join("\r\n");
        })
        .join("\r\n") + "\r\n"
    );
  };
  if (seed && !db.one("SELECT id FROM events")) {
    const call = (a) => api.command(api.snapshot().revision, a),
      base = new Date();
    base.setUTCDate(base.getUTCDate() + 7);
    base.setUTCHours(17, 0, 0, 0);
    const at = (days, hours) =>
      new Date(
        base.getTime() + days * 86400000 + hours * 3600000,
      ).toISOString();
    call({
      type: "room.create",
      name: "Großer Saal",
      capacity: 120,
      location: "Kulturhaus · Erdgeschoss",
    });
    call({
      type: "room.create",
      name: "Atelier",
      capacity: 24,
      location: "Kulturhaus · 1. Obergeschoss",
    });
    call({
      type: "room.create",
      name: "Innenhof",
      capacity: 80,
      location: "Kulturhaus · Außenbereich",
    });
    call({
      type: "event.create",
      title: "Nacht der Ideen",
      category: "Kultur & Begegnung",
      description:
        "Ein Abend für neue Perspektiven. Gespräche, Klang und Begegnungen zwischen Atelier und Bühne.",
      venue: "Kulturhaus West",
      start: at(0, 0),
      end: at(0, 5),
      capacity: 80,
      price: 1800,
      budget: 240000,
    });
    call({
      type: "session.create",
      eventId: 1,
      roomId: 1,
      title: "Ankommen & neue Perspektiven",
      speaker: "Mina Hoffmann",
      start: at(0, 0),
      end: at(0, 1),
    });
    call({
      type: "session.create",
      eventId: 1,
      roomId: 2,
      title: "Werkstatt der guten Fragen",
      speaker: "Paul Berger",
      start: at(0, 1),
      end: at(0, 2.5),
    });
    call({
      type: "session.create",
      eventId: 1,
      roomId: 1,
      title: "Live: Licht & leise Töne",
      speaker: "Studio Nord",
      start: at(0, 3),
      end: at(0, 5),
    });
    call({ type: "event.publish", id: 1 });
    for (const [name, address] of [
      ["Elena Becker", "elena@example.test"],
      ["Jonas Lang", "jonas@example.test"],
      ["Mara Winter", "mara@example.test"],
      ["Alex Roth", "alex@example.test"],
    ])
      call({ type: "booking.create", eventId: 1, name, email: address });
    call({
      type: "event.create",
      title: "Druck & Papier",
      category: "Workshop",
      description:
        "Gemeinsam eigene Plakate gestalten. Einführung in Farbe, Druck und Komposition.",
      venue: "Atelier im Kulturhaus",
      start: at(2, -3),
      end: at(2, 1),
      capacity: 2,
      price: 4500,
      budget: 35000,
    });
    call({
      type: "session.create",
      eventId: 2,
      roomId: 2,
      title: "Vom Entwurf zum Druck",
      speaker: "Nora Seidel",
      start: at(2, -3),
      end: at(2, 1),
    });
    call({ type: "event.publish", id: 2 });
    for (const [name, address] of [
      ["Sofia Berg", "sofia@example.test"],
      ["Ben Wolf", "ben@example.test"],
      ["Lena Otto", "lena@example.test"],
    ])
      call({ type: "booking.create", eventId: 2, name, email: address });
    call({
      type: "event.create",
      title: "Sonntags im Hof",
      category: "Nachbarschaft",
      description:
        "Ein offener Sonntag mit Musik, langen Tischen und Geschichten aus dem Viertel.",
      venue: "Innenhof West",
      start: at(9, -5),
      end: at(9, 0),
      capacity: 60,
      price: 0,
      budget: 50000,
    });
    for (const [eventId, label, category, planned] of [
      [1, "Licht & Ton", "Technik", 78000],
      [1, "Künstlerhonorar", "Personal", 90000],
      [1, "Getränke & Snacks", "Verpflegung", 32000],
      [2, "Papier & Druckfarbe", "Sonstiges", 12000],
    ])
      call({ type: "expense.create", eventId, label, category, planned });
    call({ type: "expense.actual", id: 1, actual: 74500 });
  }
  return api;
}
