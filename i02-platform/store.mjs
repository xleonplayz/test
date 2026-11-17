import {
  database,
  workspace,
  text,
  optional,
  int,
  choice,
  email,
  day,
  csv,
  fail,
} from "./db.mjs";
const schema =
  [
    "CREATE TABLE IF NOT EXISTS customers(id INTEGER PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,phone TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS technicians(id INTEGER PRIMARY KEY,name TEXT NOT NULL,specialty TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS parts(id INTEGER PRIMARY KEY,sku TEXT UNIQUE NOT NULL,name TEXT NOT NULL,stock INTEGER NOT NULL,minimum INTEGER NOT NULL,price INTEGER NOT NULL)",
    "CREATE TABLE IF NOT EXISTS jobs(id INTEGER PRIMARY KEY,customer_id INTEGER NOT NULL REFERENCES customers(id),device TEXT NOT NULL,serial TEXT NOT NULL,issue TEXT NOT NULL,priority INTEGER NOT NULL,due TEXT NOT NULL,status TEXT NOT NULL,technician_id INTEGER REFERENCES technicians(id),diagnosis TEXT NOT NULL DEFAULT '',created TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS quotes(id INTEGER PRIMARY KEY,job_id INTEGER NOT NULL REFERENCES jobs(id),minutes INTEGER NOT NULL,rate INTEGER NOT NULL,total INTEGER NOT NULL,note TEXT NOT NULL,status TEXT NOT NULL,created TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS quote_parts(quote_id INTEGER NOT NULL REFERENCES quotes(id),part_id INTEGER NOT NULL REFERENCES parts(id),quantity INTEGER NOT NULL,price INTEGER NOT NULL,PRIMARY KEY(quote_id,part_id))",
    "CREATE TABLE IF NOT EXISTS work_logs(id INTEGER PRIMARY KEY,job_id INTEGER NOT NULL REFERENCES jobs(id),technician_id INTEGER NOT NULL REFERENCES technicians(id),minutes INTEGER NOT NULL,note TEXT NOT NULL,created TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS checks(id INTEGER PRIMARY KEY,job_id INTEGER NOT NULL REFERENCES jobs(id),kind TEXT NOT NULL,passed INTEGER NOT NULL,note TEXT NOT NULL,UNIQUE(job_id,kind))",
    "CREATE TABLE IF NOT EXISTS movements(id INTEGER PRIMARY KEY,part_id INTEGER NOT NULL REFERENCES parts(id),delta INTEGER NOT NULL,reason TEXT NOT NULL,created TEXT NOT NULL)",
  ].join(";") + ";";
const checkKinds = ["Funktion", "Sichtprüfung", "Fehlerbild"];
export function openStore(dir, { seed = true } = {}) {
  const db = database(dir, "werkstatt", schema);
  const reserved = (id) =>
    db.one(
      "SELECT COALESCE(SUM(p.quantity),0) AS n FROM quote_parts p JOIN quotes q ON q.id=p.quote_id JOIN jobs j ON j.id=q.job_id WHERE p.part_id=? AND q.status='accepted' AND j.status='approved'",
      id,
    ).n;
  const only = (job, statuses) => {
    if (!statuses.includes(job.status))
      fail("Aktion ist in diesem Bearbeitungsstatus nicht möglich.");
  };
  const currentQuote = (job) =>
    db.one(
      "SELECT * FROM quotes WHERE job_id=? AND status='accepted' ORDER BY id DESC LIMIT 1",
      job,
    ) ?? fail("Kein freigegebenes Angebot vorhanden.");
  const move = (part, delta, reason) => {
    db.run("UPDATE parts SET stock=stock+? WHERE id=?", delta, part);
    db.run(
      "INSERT INTO movements(part_id,delta,reason,created) VALUES(?,?,?,?)",
      part,
      delta,
      reason,
      new Date().toISOString(),
    );
  };
  const read = () => ({
    customers: db.all("SELECT * FROM customers ORDER BY name"),
    technicians: db.all("SELECT * FROM technicians ORDER BY name"),
    parts: db
      .all("SELECT * FROM parts ORDER BY sku")
      .map((p) => ({
        ...p,
        reserved: reserved(p.id),
        available: p.stock - reserved(p.id),
      })),
    jobs: db.all("SELECT * FROM jobs ORDER BY priority,due,id"),
    quotes: db
      .all("SELECT * FROM quotes ORDER BY id DESC")
      .map((q) => ({
        ...q,
        parts: db.all("SELECT * FROM quote_parts WHERE quote_id=?", q.id),
      })),
    workLogs: db.all("SELECT * FROM work_logs ORDER BY id DESC"),
    checks: db.all("SELECT * FROM checks"),
    movements: db.all("SELECT * FROM movements ORDER BY id DESC"),
    checkKinds,
  });
  const api = workspace(db, read, (a) => {
    switch (a.type) {
      case "customer.create": {
        const address = email(a.email);
        if (db.one("SELECT id FROM customers WHERE email=?", address))
          fail("E-Mail-Adresse bereits vorhanden.");
        db.run(
          "INSERT INTO customers(name,email,phone) VALUES(?,?,?)",
          text(a.name),
          address,
          optional(a.phone, 60),
        );
        return "Kunde angelegt: " + a.name;
      }
      case "technician.create":
        db.run(
          "INSERT INTO technicians(name,specialty) VALUES(?,?)",
          text(a.name),
          text(a.specialty),
        );
        return "Team ergänzt: " + a.name;
      case "part.create": {
        const sku = text(a.sku, 40).toUpperCase();
        if (!/^[A-Z0-9_-]+$/.test(sku))
          fail("SKU aus Buchstaben, Zahlen, - oder _.");
        if (db.one("SELECT id FROM parts WHERE sku=?", sku))
          fail("SKU bereits vorhanden.");
        const stock = int(a.stock, 0, 100000),
          id = db.insert(
            "INSERT INTO parts(sku,name,stock,minimum,price) VALUES(?,?,0,?,?)",
            sku,
            text(a.name),
            int(a.minimum, 0, 100000),
            int(a.price, 0, 10000000),
          );
        if (stock) move(id, stock, "Anfangsbestand");
        return "Ersatzteil angelegt: " + sku;
      }
      case "part.adjust": {
        const p = db.require("parts", a.id),
          delta = int(a.delta, -100000, 100000);
        if (!delta) fail("Änderung darf nicht null sein.");
        if (p.stock + delta < reserved(p.id))
          fail("Bestand darf nicht unter reservierte Mengen fallen.");
        if (p.stock + delta > 1000000) fail("Bestandsgrenze erreicht.");
        move(p.id, delta, text(a.reason, 300));
        return "Teilebestand korrigiert: " + p.sku;
      }
      case "part.update": {
        const p = db.require("parts", a.id);
        db.run(
          "UPDATE parts SET minimum=?,price=? WHERE id=?",
          int(a.minimum, 0, 100000),
          int(a.price, 0, 10000000),
          p.id,
        );
        return "Teiledaten aktualisiert: " + p.sku;
      }
      case "job.create": {
        const c = db.require("customers", a.customerId);
        db.run(
          "INSERT INTO jobs(customer_id,device,serial,issue,priority,due,status,created) VALUES(?,?,?,?,?,?,'received',?)",
          c.id,
          text(a.device),
          optional(a.serial),
          text(a.issue, 8000),
          int(a.priority, 1, 3),
          day(a.due),
          new Date().toISOString(),
        );
        return "Reparatur angenommen: " + a.device;
      }
      case "job.assign": {
        const j = db.require("jobs", a.id),
          t = db.require("technicians", a.technicianId);
        only(j, [
          "received",
          "diagnosing",
          "quoted",
          "approved",
          "repairing",
          "testing",
          "ready",
        ]);
        db.run(
          "UPDATE jobs SET technician_id=?,due=?,priority=? WHERE id=?",
          t.id,
          day(a.due),
          int(a.priority, 1, 3),
          j.id,
        );
        return "Auftrag #" + j.id + " zugewiesen: " + t.name;
      }
      case "job.diagnose": {
        const j = db.require("jobs", a.id);
        only(j, ["received", "diagnosing"]);
        db.run(
          "UPDATE jobs SET diagnosis=?,status='diagnosing' WHERE id=?",
          text(a.diagnosis, 8000),
          j.id,
        );
        return "Diagnose erfasst: #" + j.id;
      }
      case "quote.create": {
        const j = db.require("jobs", a.jobId);
        only(j, ["diagnosing", "quoted"]);
        if (!Array.isArray(a.parts) || a.parts.length > 20)
          fail("Maximal 20 Ersatzteilpositionen.");
        const seen = new Set();
        const parts = a.parts.map((x) => {
          if (!x) fail("Ungültige Position.");
          const p = db.require("parts", x.partId);
          if (seen.has(p.id)) fail("Jedes Ersatzteil nur einmal auswählen.");
          seen.add(p.id);
          return { part: p, quantity: int(x.quantity, 1, 10000) };
        });
        const minutes = int(a.minutes, 1, 10000),
          rate = int(a.rate, 0, 100000),
          labor = Math.round((minutes * rate) / 60),
          total = parts.reduce((n, p) => n + p.part.price * p.quantity, labor);
        int(total, 0, 100000000);
        db.run(
          "UPDATE quotes SET status='superseded' WHERE job_id=? AND status='offered'",
          j.id,
        );
        const id = db.insert(
          "INSERT INTO quotes(job_id,minutes,rate,total,note,status,created) VALUES(?,?,?,?,?,'offered',?)",
          j.id,
          minutes,
          rate,
          total,
          text(a.note, 4000),
          new Date().toISOString(),
        );
        for (const p of parts)
          db.run(
            "INSERT INTO quote_parts VALUES(?,?,?,?)",
            id,
            p.part.id,
            p.quantity,
            p.part.price,
          );
        db.run("UPDATE jobs SET status='quoted' WHERE id=?", j.id);
        return "Kostenvoranschlag erstellt: #" + j.id;
      }
      case "quote.accept": {
        const q = db.require("quotes", a.id),
          j = db.require("jobs", q.job_id);
        only(j, ["quoted"]);
        if (q.status !== "offered")
          fail("Dieses Angebot ist nicht mehr offen.");
        for (const x of db.all(
          "SELECT * FROM quote_parts WHERE quote_id=?",
          q.id,
        )) {
          const p = db.require("parts", x.part_id);
          if (p.stock - reserved(p.id) < x.quantity)
            fail("Nicht genügend Ersatzteile verfügbar: " + p.sku);
        }
        db.run("UPDATE quotes SET status='accepted' WHERE id=?", q.id);
        db.run("UPDATE jobs SET status='approved' WHERE id=?", j.id);
        return "Kundenfreigabe protokolliert, Teile reserviert: #" + j.id;
      }
      case "quote.reject": {
        const q = db.require("quotes", a.id),
          j = db.require("jobs", q.job_id);
        only(j, ["quoted"]);
        if (q.status !== "offered") fail("Angebot nicht offen.");
        const reason = text(a.reason, 1000);
        db.run("UPDATE quotes SET status='rejected' WHERE id=?", q.id);
        db.run("UPDATE jobs SET status='diagnosing' WHERE id=?", j.id);
        return "Angebot abgelehnt: #" + j.id + " · " + reason;
      }
      case "job.start": {
        const j = db.require("jobs", a.id);
        only(j, ["approved"]);
        if (!j.technician_id) fail("Vor Arbeitsbeginn eine Person zuweisen.");
        const q = currentQuote(j.id);
        for (const x of db.all(
          "SELECT * FROM quote_parts WHERE quote_id=?",
          q.id,
        ))
          move(x.part_id, -x.quantity, "Verbraucht für Auftrag #" + j.id);
        db.run("UPDATE jobs SET status='repairing' WHERE id=?", j.id);
        return "Reparatur begonnen, Teile ausgebucht: #" + j.id;
      }
      case "work.log": {
        const j = db.require("jobs", a.jobId),
          t = db.require("technicians", a.technicianId);
        only(j, ["repairing", "testing"]);
        db.run(
          "INSERT INTO work_logs(job_id,technician_id,minutes,note,created) VALUES(?,?,?,?,?)",
          j.id,
          t.id,
          int(a.minutes, 1, 1440),
          text(a.note, 4000),
          new Date().toISOString(),
        );
        return "Arbeitszeit protokolliert: #" + j.id;
      }
      case "job.testing": {
        const j = db.require("jobs", a.id);
        only(j, ["repairing"]);
        if (!db.one("SELECT id FROM work_logs WHERE job_id=?", j.id))
          fail("Zuerst ausgeführte Arbeiten protokollieren.");
        db.run("UPDATE jobs SET status='testing' WHERE id=?", j.id);
        return "In Abschlussprüfung: #" + j.id;
      }
      case "check.record": {
        const j = db.require("jobs", a.jobId);
        only(j, ["testing"]);
        if (typeof a.passed !== "boolean") fail("Prüfergebnis fehlt.");
        db.run(
          "INSERT INTO checks(job_id,kind,passed,note) VALUES(?,?,?,?) ON CONFLICT(job_id,kind) DO UPDATE SET passed=excluded.passed,note=excluded.note",
          j.id,
          choice(a.kind, checkKinds),
          Number(a.passed),
          text(a.note, 2000),
        );
        return "Prüfung " + a.kind + ": #" + j.id;
      }
      case "job.resume": {
        const j = db.require("jobs", a.id);
        only(j, ["testing"]);
        const reason = text(a.reason, 1000);
        db.run("UPDATE jobs SET status='repairing' WHERE id=?", j.id);
        db.run("DELETE FROM checks WHERE job_id=?", j.id);
        return "Nacharbeit, Prüfliste zurückgesetzt: #" + j.id + " · " + reason;
      }
      case "job.ready": {
        const j = db.require("jobs", a.id);
        only(j, ["testing"]);
        if (
          checkKinds.some(
            (k) =>
              !db.one(
                "SELECT id FROM checks WHERE job_id=? AND kind=? AND passed=1",
                j.id,
                k,
              ),
          )
        )
          fail("Alle drei Abschlussprüfungen müssen bestanden sein.");
        db.run("UPDATE jobs SET status='ready' WHERE id=?", j.id);
        return "Abholbereit: #" + j.id;
      }
      case "job.collect": {
        const j = db.require("jobs", a.id);
        only(j, ["ready"]);
        const name = text(a.name);
        db.run("UPDATE jobs SET status='collected' WHERE id=?", j.id);
        return "Abgeholt durch " + name + ": #" + j.id;
      }
      case "job.cancel": {
        const j = db.require("jobs", a.id);
        only(j, ["received", "diagnosing", "quoted", "approved"]);
        const reason = text(a.reason, 1000);
        db.run("UPDATE jobs SET status='cancelled' WHERE id=?", j.id);
        db.run(
          "UPDATE quotes SET status='cancelled' WHERE job_id=? AND status IN ('offered','accepted')",
          j.id,
        );
        return "Vor Arbeitsbeginn storniert: #" + j.id + " · " + reason;
      }
      default:
        fail("Unbekannte Aktion.");
    }
  });
  api.csv = () => {
    const s = api.snapshot();
    return csv([
      [
        "Auftrag",
        "Kunde",
        "Gerät",
        "Status",
        "Priorität",
        "Zieltermin",
        "Zuständig",
        "Freigegebener Betrag Cent",
        "Arbeitsminuten",
      ],
      ...s.jobs.map((j) => [
        j.id,
        s.customers.find((c) => c.id === j.customer_id).name,
        j.device,
        j.status,
        j.priority,
        j.due,
        s.technicians.find((t) => t.id === j.technician_id)?.name ?? "",
        s.quotes.find((q) => q.job_id === j.id && q.status === "accepted")
          ?.total ?? 0,
        s.workLogs
          .filter((w) => w.job_id === j.id)
          .reduce((n, w) => n + w.minutes, 0),
      ]),
    ]);
  };
  if (seed && !db.one("SELECT id FROM jobs")) {
    const call = (a) => api.command(api.snapshot().revision, a),
      due = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    for (const [name, address, phone] of [
      ["Mara Winter", "mara@example.test", "030 555 0101"],
      ["Jonas Berg", "jonas@example.test", "030 555 0102"],
      ["Elena Roth", "elena@example.test", "030 555 0103"],
    ])
      call({ type: "customer.create", name, email: address, phone });
    call({
      type: "technician.create",
      name: "Alex Weber",
      specialty: "Audio & Elektronik",
    });
    call({
      type: "technician.create",
      name: "Nora Lind",
      specialty: "Mechanik & Gehäuse",
    });
    for (const [sku, name, stock, minimum, price] of [
      ["EL-101", "Drehregler 10 kΩ", 8, 4, 1250],
      ["EL-204", "USB-C-Buchse", 3, 5, 1890],
      ["ME-301", "Scharnier-Set", 5, 2, 2400],
      ["EL-410", "Lautsprecherkabel 1 m", 12, 4, 650],
    ])
      call({ type: "part.create", sku, name, stock, minimum, price });
    call({
      type: "job.create",
      customerId: 1,
      device: "Nordklang Verstärker",
      serial: "NK-2048",
      issue:
        "Der Lautstärkeregler kratzt beim Drehen. Linker Kanal fällt gelegentlich aus.",
      priority: 1,
      due,
    });
    call({ type: "job.assign", id: 1, technicianId: 1, due, priority: 1 });
    call({
      type: "job.diagnose",
      id: 1,
      diagnosis:
        "Drehregler verschlissen. Anschlusskabel am linken Kanal beschädigt. Austausch vorgeschlagen.",
    });
    call({
      type: "quote.create",
      jobId: 1,
      minutes: 60,
      rate: 7200,
      note: "Austausch von Regler und Anschlusskabel inklusive Funktionsprüfung.",
      parts: [
        { partId: 1, quantity: 1 },
        { partId: 4, quantity: 1 },
      ],
    });
    call({
      type: "job.create",
      customerId: 2,
      device: "Reise-Lautsprecher",
      serial: "RS-118",
      issue: "Ladebuchse hat einen Wackelkontakt.",
      priority: 2,
      due,
    });
    call({ type: "job.assign", id: 2, technicianId: 1, due, priority: 2 });
    call({
      type: "job.diagnose",
      id: 2,
      diagnosis: "USB-C-Buchse mechanisch beschädigt.",
    });
    call({
      type: "quote.create",
      jobId: 2,
      minutes: 45,
      rate: 7200,
      note: "Ladebuchse austauschen und Ladefunktion prüfen.",
      parts: [{ partId: 2, quantity: 1 }],
    });
    call({ type: "quote.accept", id: 2 });
    call({ type: "job.start", id: 2 });
    call({
      type: "work.log",
      jobId: 2,
      technicianId: 1,
      minutes: 25,
      note: "Alte Buchse ausgebaut und neue Buchse eingesetzt.",
    });
    call({
      type: "job.create",
      customerId: 3,
      device: "Leselampe Atelier",
      serial: "AT-37",
      issue: "Gelenk hält die eingestellte Position nicht mehr.",
      priority: 3,
      due,
    });
  }
  return api;
}
