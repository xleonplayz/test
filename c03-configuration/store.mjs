import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
export class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
const fail = (message) => {
  throw new AppError(message);
};
const string = (v, max = 120) => {
  if (
    typeof v !== "string" ||
    !v.trim() ||
    v.length > max ||
    /[\x00-\x1f\x7f]/.test(v)
  )
    fail("Text mit 1–" + max + " Zeichen erwartet.");
  return v.trim();
};
const integer = (v, min = 0, max = 1000000) => {
  if (!Number.isSafeInteger(v) || v < min || v > max)
    fail("Ungültige Menge oder Zahl.");
  return v;
};
const date = (v) => {
  if (
    typeof v !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
    !Number.isFinite(Date.parse(v)) ||
    new Date(v).toISOString().slice(0, 10) !== v
  )
    fail("Ungültiges Datum.");
  return v;
};
export function openStore(dir, { seed = true } = {}) {
  mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(join(dir, "depot.sqlite"));
  db.exec(
    "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;",
  );
  for (const sql of [
    "CREATE TABLE IF NOT EXISTS meta(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL)",
    "INSERT OR IGNORE INTO meta VALUES(1,0)",
    "CREATE TABLE IF NOT EXISTS suppliers(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL,lead_days INTEGER NOT NULL)",
    "CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY,sku TEXT UNIQUE NOT NULL,name TEXT NOT NULL,unit TEXT NOT NULL,location TEXT NOT NULL,minimum INTEGER NOT NULL,cost INTEGER NOT NULL,supplier_id TEXT NOT NULL REFERENCES suppliers(id))",
    "CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,supplier_id TEXT NOT NULL REFERENCES suppliers(id),expected TEXT NOT NULL,status TEXT NOT NULL,created TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS order_lines(order_id TEXT REFERENCES orders(id),product_id TEXT REFERENCES products(id),quantity INTEGER NOT NULL,received INTEGER NOT NULL DEFAULT 0,cost INTEGER NOT NULL,PRIMARY KEY(order_id,product_id))",
    "CREATE TABLE IF NOT EXISTS reservations(id TEXT PRIMARY KEY,label TEXT NOT NULL,status TEXT NOT NULL,created TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS reservation_lines(reservation_id TEXT REFERENCES reservations(id),product_id TEXT REFERENCES products(id),quantity INTEGER NOT NULL,PRIMARY KEY(reservation_id,product_id))",
    "CREATE TABLE IF NOT EXISTS movements(id TEXT PRIMARY KEY,product_id TEXT NOT NULL REFERENCES products(id),delta INTEGER NOT NULL,reason TEXT NOT NULL,reference TEXT NOT NULL,created TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,action TEXT NOT NULL,detail TEXT NOT NULL,created TEXT NOT NULL)",
  ])
    db.exec(sql);
  const all = (sql, ...p) => db.prepare(sql).all(...p),
    one = (sql, ...p) => db.prepare(sql).get(...p),
    run = (sql, ...p) => db.prepare(sql).run(...p);
  const requireRow = (table, id) =>
    one("SELECT * FROM " + table + " WHERE id=?", string(id, 80)) ??
    fail("Datensatz nicht gefunden.");
  const revision = () => one("SELECT revision FROM meta WHERE id=1").revision;
  const stock = (id) => ({
    onHand: one(
      "SELECT COALESCE(SUM(delta),0) AS n FROM movements WHERE product_id=?",
      id,
    ).n,
    reserved: one(
      "SELECT COALESCE(SUM(l.quantity),0) AS n FROM reservation_lines l JOIN reservations r ON r.id=l.reservation_id WHERE l.product_id=? AND r.status='reserved'",
      id,
    ).n,
  });
  const lines = (value) => {
    if (!Array.isArray(value) || !value.length || value.length > 30)
      fail("1–30 Positionen erwartet.");
    const result = value.map((l) => {
      if (!l || typeof l !== "object") fail("Ungültige Position.");
      return {
        product: requireRow("products", l.productId),
        quantity: integer(l.quantity, 1),
      };
    });
    if (new Set(result.map((l) => l.product.id)).size !== result.length)
      fail("Jeder Artikel darf nur einmal vorkommen.");
    return result;
  };
  const movement = (id, delta, reason, ref, now) =>
    run(
      "INSERT INTO movements VALUES(?,?,?,?,?,?)",
      randomUUID(),
      id,
      delta,
      reason,
      ref,
      now,
    );
  function readSnapshot() {
    const products = all("SELECT * FROM products ORDER BY sku")
      .map((p) => ({ ...p, ...stock(p.id) }))
      .map((p) => ({ ...p, available: p.onHand - p.reserved }));
    const orders = all("SELECT * FROM orders ORDER BY created DESC").map(
      (o) => ({
        ...o,
        lines: all("SELECT * FROM order_lines WHERE order_id=?", o.id),
      }),
    );
    const reservations = all(
      "SELECT * FROM reservations ORDER BY created DESC",
    ).map((r) => ({
      ...r,
      lines: all(
        "SELECT * FROM reservation_lines WHERE reservation_id=?",
        r.id,
      ),
    }));
    const value = products.reduce((s, p) => s + p.onHand * p.cost, 0);
    if (!Number.isSafeInteger(value))
      fail("Gesamtwert überschreitet den unterstützten Zahlenbereich.");
    return {
      revision: revision(),
      suppliers: all("SELECT * FROM suppliers ORDER BY name"),
      products,
      orders,
      reservations,
      movements: all(
        "SELECT * FROM movements ORDER BY created DESC,rowid DESC LIMIT 500",
      ),
      audit: all("SELECT * FROM audit ORDER BY id DESC LIMIT 100"),
      stats: {
        value,
        low: products.filter((p) => p.available < p.minimum).length,
        reserved: reservations.filter((r) => r.status === "reserved").length,
        openOrders: orders.filter((o) => ["open", "partial"].includes(o.status))
          .length,
      },
    };
  }
  const store = {
    snapshot() {
      db.exec("BEGIN");
      try {
        const s = readSnapshot();
        db.exec("COMMIT");
        return s;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
    command(expected, a) {
      if (!a || typeof a !== "object" || typeof a.type !== "string")
        fail("Aktion fehlt.");
      integer(expected, 0, Number.MAX_SAFE_INTEGER);
      db.exec("BEGIN IMMEDIATE");
      try {
        if (revision() !== expected)
          throw new AppError(
            "Die Daten wurden inzwischen geändert. Bitte aktualisieren und erneut versuchen.",
            409,
          );
        const now = new Date().toISOString();
        let detail = "";
        switch (a.type) {
          case "supplier.create": {
            const name = string(a.name),
              email = a.email ? string(a.email, 200) : "";
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
              fail("E-Mail-Adresse prüfen.");
            run(
              "INSERT INTO suppliers VALUES(?,?,?,?)",
              randomUUID(),
              name,
              email,
              integer(a.leadDays, 0, 365),
            );
            detail = name;
            break;
          }
          case "product.create": {
            const sku = string(a.sku, 32).toUpperCase();
            if (!/^[A-Z0-9_-]+$/.test(sku))
              fail("SKU: Buchstaben, Zahlen, - oder _.");
            if (one("SELECT id FROM products WHERE sku=?", sku))
              fail("Diese SKU existiert bereits.");
            const supplier = requireRow("suppliers", a.supplierId),
              id = randomUUID(),
              name = string(a.name);
            run(
              "INSERT INTO products VALUES(?,?,?,?,?,?,?,?)",
              id,
              sku,
              name,
              string(a.unit, 20),
              string(a.location, 40),
              integer(a.minimum),
              integer(a.cost, 0, 10000000),
              supplier.id,
            );
            const opening = integer(a.opening ?? 0);
            if (opening)
              movement(id, opening, "Anfangsbestand", "Erfassung", now);
            detail = sku + " · " + name;
            break;
          }
          case "product.update": {
            const p = requireRow("products", a.id);
            run(
              "UPDATE products SET minimum=?,location=?,cost=? WHERE id=?",
              integer(a.minimum),
              string(a.location, 40),
              integer(a.cost, 0, 10000000),
              p.id,
            );
            detail = p.sku;
            break;
          }
          case "stock.adjust": {
            const p = requireRow("products", a.id),
              delta = integer(a.delta, -1000000, 1000000),
              reason = string(a.reason, 200),
              s = stock(p.id);
            if (!delta) fail("Eine Änderung ungleich null angeben.");
            if (s.onHand + delta < s.reserved)
              fail(
                "Der verfügbare Bestand darf nicht negativ werden. Reservierungen zuerst auflösen.",
              );
            if (s.onHand + delta > 10000000) fail("Bestandsgrenze erreicht.");
            movement(p.id, delta, reason, "Korrektur", now);
            detail = p.sku + " " + (delta > 0 ? "+" : "") + delta;
            break;
          }
          case "order.create": {
            const supplier = requireRow("suppliers", a.supplierId),
              items = lines(a.lines),
              expectedDate = date(a.expected);
            if (items.some((l) => l.product.supplier_id !== supplier.id))
              fail("Alle Artikel müssen zum Lieferanten gehören.");
            const id = randomUUID();
            run(
              "INSERT INTO orders VALUES(?,?,?,?,?)",
              id,
              supplier.id,
              expectedDate,
              "open",
              now,
            );
            for (const l of items)
              run(
                "INSERT INTO order_lines VALUES(?,?,?,0,?)",
                id,
                l.product.id,
                l.quantity,
                l.product.cost,
              );
            detail =
              "Bestellung bei " +
              supplier.name +
              " · " +
              items.length +
              " Positionen";
            break;
          }
          case "order.receive": {
            const order = requireRow("orders", a.id);
            if (!["open", "partial"].includes(order.status))
              fail("Diese Bestellung ist abgeschlossen.");
            const items = lines(a.lines);
            for (const l of items) {
              const line = one(
                "SELECT * FROM order_lines WHERE order_id=? AND product_id=?",
                order.id,
                l.product.id,
              );
              if (!line || l.quantity > line.quantity - line.received)
                fail("Wareneingang übersteigt die offene Bestellmenge.");
              if (stock(l.product.id).onHand + l.quantity > 10000000)
                fail("Bestandsgrenze erreicht.");
            }
            for (const l of items) {
              run(
                "UPDATE order_lines SET received=received+? WHERE order_id=? AND product_id=?",
                l.quantity,
                order.id,
                l.product.id,
              );
              movement(l.product.id, l.quantity, "Wareneingang", order.id, now);
            }
            const remaining = one(
              "SELECT SUM(quantity-received) AS n FROM order_lines WHERE order_id=?",
              order.id,
            ).n;
            run(
              "UPDATE orders SET status=? WHERE id=?",
              remaining ? "partial" : "received",
              order.id,
            );
            detail = "Wareneingang · " + order.id.slice(0, 8);
            break;
          }
          case "order.cancel": {
            const o = requireRow("orders", a.id);
            if (!["open", "partial"].includes(o.status))
              fail("Bestellung bereits abgeschlossen.");
            run("UPDATE orders SET status='cancelled' WHERE id=?", o.id);
            detail = "Offene Restmenge storniert · " + o.id.slice(0, 8);
            break;
          }
          case "reserve.create": {
            const items = lines(a.lines),
              label = string(a.label),
              id = randomUUID();
            for (const l of items) {
              const s = stock(l.product.id);
              if (s.onHand - s.reserved < l.quantity)
                fail("Nicht ausreichend verfügbar: " + l.product.sku);
            }
            run(
              "INSERT INTO reservations VALUES(?,?,?,?)",
              id,
              label,
              "reserved",
              now,
            );
            for (const l of items)
              run(
                "INSERT INTO reservation_lines VALUES(?,?,?)",
                id,
                l.product.id,
                l.quantity,
              );
            detail = label;
            break;
          }
          case "reserve.ship":
          case "reserve.cancel": {
            const r = requireRow("reservations", a.id);
            if (r.status !== "reserved")
              fail("Reservierung bereits abgeschlossen.");
            if (a.type === "reserve.ship")
              for (const l of all(
                "SELECT * FROM reservation_lines WHERE reservation_id=?",
                r.id,
              ))
                movement(
                  l.product_id,
                  -l.quantity,
                  "Auslieferung",
                  r.label,
                  now,
                );
            run(
              "UPDATE reservations SET status=? WHERE id=?",
              a.type === "reserve.ship" ? "shipped" : "cancelled",
              r.id,
            );
            detail = r.label;
            break;
          }
          default:
            fail("Unbekannte Aktion.");
        }
        run(
          "INSERT INTO audit(action,detail,created) VALUES(?,?,?)",
          a.type,
          detail,
          now,
        );
        run("UPDATE meta SET revision=revision+1 WHERE id=1");
        const state = readSnapshot();
        db.exec("COMMIT");
        return state;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
    export() {
      db.exec("BEGIN");
      try {
        const result = {
          app: "depot",
          schema: 1,
          exported: new Date().toISOString(),
          ...readSnapshot(),
          movements: all("SELECT * FROM movements ORDER BY created"),
          audit: all("SELECT * FROM audit ORDER BY id"),
        };
        db.exec("COMMIT");
        return result;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
    csv() {
      const quote = (v) => {
        let s = String(v);
        if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
        return '"' + s.replaceAll('"', '""') + '"';
      };
      return (
        "\ufeff" +
        [
          [
            "SKU",
            "Artikel",
            "Ort",
            "Bestand",
            "Reserviert",
            "Verfügbar",
            "Mindestbestand",
            "Einstand Cent",
          ],
          ...store
            .snapshot()
            .products.map((p) => [
              p.sku,
              p.name,
              p.location,
              p.onHand,
              p.reserved,
              p.available,
              p.minimum,
              p.cost,
            ]),
        ]
          .map((row) => row.map(quote).join(";"))
          .join("\r\n") +
        "\r\n"
      );
    },
    close() {
      db.close();
    },
  };
  if (seed && one("SELECT COUNT(*) AS n FROM suppliers").n === 0) {
    const call = (a) => store.command(revision(), a);
    call({
      type: "supplier.create",
      name: "Nordwerk Materialien",
      email: "dispo@example.test",
      leadDays: 3,
    });
    call({
      type: "supplier.create",
      name: "Papier & Form",
      email: "kontakt@example.test",
      leadDays: 5,
    });
    const s = store.snapshot().suppliers;
    for (const [
      sku,
      name,
      unit,
      location,
      minimum,
      cost,
      opening,
      supplierId,
    ] of [
      [
        "NW-104",
        "Eichenplatte 40 × 60",
        "Stück",
        "A-01",
        12,
        1890,
        8,
        s.find((x) => x.name.startsWith("Nord")).id,
      ],
      [
        "NW-220",
        "Winkelverbinder matt",
        "Stück",
        "A-04",
        40,
        240,
        86,
        s.find((x) => x.name.startsWith("Nord")).id,
      ],
      [
        "PF-010",
        "Versandkarton M",
        "Stück",
        "B-02",
        30,
        125,
        42,
        s.find((x) => x.name.startsWith("Papier")).id,
      ],
      [
        "PF-032",
        "Seidenpapier natur",
        "Pack",
        "B-03",
        8,
        890,
        5,
        s.find((x) => x.name.startsWith("Papier")).id,
      ],
    ])
      call({
        type: "product.create",
        sku,
        name,
        unit,
        location,
        minimum,
        cost,
        opening,
        supplierId,
      });
    const p = store.snapshot().products;
    call({
      type: "order.create",
      supplierId: s.find((x) => x.name.startsWith("Nord")).id,
      expected: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      lines: [
        { productId: p.find((x) => x.sku === "NW-104").id, quantity: 20 },
      ],
    });
    call({
      type: "reserve.create",
      label: "Auftrag Studio West",
      lines: [
        { productId: p.find((x) => x.sku === "NW-220").id, quantity: 12 },
        { productId: p.find((x) => x.sku === "PF-010").id, quantity: 6 },
      ],
    });
  }
  return store;
}
