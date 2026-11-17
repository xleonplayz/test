import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
export class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
export const fail = (message, status = 400) => {
  throw new AppError(message, status);
};
export const text = (v, max = 160) => {
  if (
    typeof v !== "string" ||
    !v.trim() ||
    v.length > max ||
    /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(v)
  )
    fail("Text mit 1–" + max + " Zeichen erforderlich.");
  return v.trim();
};
export const optional = (v, max = 160) =>
  v == null || v === "" ? "" : text(v, max);
export const int = (v, min = 0, max = 1000000) => {
  if (!Number.isSafeInteger(v) || v < min || v > max)
    fail("Zahl außerhalb des erlaubten Bereichs.");
  return v;
};
export const choice = (v, values) => {
  if (!values.includes(v)) fail("Ungültige Auswahl.");
  return v;
};
export const email = (v) => {
  v = text(v, 200).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) fail("E-Mail-Adresse prüfen.");
  return v;
};
export const instant = (v) => {
  if (typeof v !== "string" || !Number.isFinite(Date.parse(v)))
    fail("Gültigen Zeitpunkt angeben.");
  return new Date(v).toISOString();
};
export const day = (v) => {
  if (
    typeof v !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
    !Number.isFinite(Date.parse(v)) ||
    new Date(v).toISOString().slice(0, 10) !== v
  )
    fail("Gültiges Datum angeben.");
  return v;
};
export const csv = (rows) =>
  "\ufeff" +
  rows
    .map((row) =>
      row
        .map((v) => {
          let s = String(v ?? "");
          if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
          return '"' + s.replaceAll('"', '""') + '"';
        })
        .join(";"),
    )
    .join("\r\n") +
  "\r\n";
export function database(dir, name, schema) {
  mkdirSync(dir, { recursive: true });
  const connection = new DatabaseSync(join(dir, name + ".sqlite"));
  connection.exec(
    "PRAGMA journal_mode=WAL;PRAGMA foreign_keys=ON;PRAGMA busy_timeout=5000;CREATE TABLE IF NOT EXISTS meta(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL);INSERT OR IGNORE INTO meta VALUES(1,0);CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,action TEXT NOT NULL,detail TEXT NOT NULL,created TEXT NOT NULL);" +
      schema,
  );
  const db = {
    all: (sql, ...args) => connection.prepare(sql).all(...args),
    one: (sql, ...args) => connection.prepare(sql).get(...args),
    run: (sql, ...args) => connection.prepare(sql).run(...args),
    insert: (sql, ...args) =>
      Number(connection.prepare(sql).run(...args).lastInsertRowid),
    require: (table, id) =>
      db.one("SELECT * FROM " + table + " WHERE id=?", int(id, 1)) ??
      fail("Datensatz nicht gefunden.", 404),
    transaction(fn, write = false) {
      connection.exec(write ? "BEGIN IMMEDIATE" : "BEGIN");
      try {
        const result = fn();
        connection.exec("COMMIT");
        return result;
      } catch (e) {
        connection.exec("ROLLBACK");
        throw e;
      }
    },
    close: () => connection.close(),
  };
  return db;
}
export function workspace(db, read, apply) {
  const snapshot = () => ({
    revision: db.one("SELECT revision FROM meta WHERE id=1").revision,
    now: new Date().toISOString(),
    ...read(),
    audit: db.all("SELECT * FROM audit ORDER BY id DESC LIMIT 200"),
  });
  return {
    snapshot: () => db.transaction(snapshot),
    command(revision, action) {
      int(revision, 0, Number.MAX_SAFE_INTEGER);
      if (
        !action ||
        typeof action !== "object" ||
        typeof action.type !== "string"
      )
        fail("Aktion fehlt.");
      return db.transaction(() => {
        if (
          db.one("SELECT revision FROM meta WHERE id=1").revision !== revision
        )
          fail(
            "Inzwischen wurden Daten geändert. Eingabe prüfen und erneut speichern.",
            409,
          );
        const detail = apply(action);
        db.run(
          "INSERT INTO audit(action,detail,created) VALUES(?,?,?)",
          action.type,
          detail ?? action.type,
          new Date().toISOString(),
        );
        db.run("UPDATE meta SET revision=revision+1 WHERE id=1");
        return snapshot();
      }, true);
    },
    export: () =>
      db.transaction(() => ({
        ...snapshot(),
        schema: 1,
        audit: db.all("SELECT * FROM audit ORDER BY id"),
      })),
    close: () => db.close(),
  };
}
