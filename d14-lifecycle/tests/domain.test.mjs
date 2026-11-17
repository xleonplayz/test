import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openStore } from "../store.mjs";
const stable = (s) => {
  const copy = structuredClone(s);
  delete copy.now;
  return copy;
};
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "sample-domain-"));
  const store = openStore(dir);
  t.after(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return {
    store,
    call: (a) => store.command(store.snapshot().revision, a),
    state: () => store.snapshot(),
  };
}

test("approval reserves parts, start consumes them exactly once", (t) => {
  const { call, state } = fixture(t),
    before = state().parts.find((p) => p.id === 1);
  call({ type: "quote.accept", id: 1 });
  let p = state().parts.find((p) => p.id === 1);
  assert.equal(p.stock, before.stock);
  assert.equal(p.reserved, 1);
  call({ type: "job.start", id: 1 });
  p = state().parts.find((p) => p.id === 1);
  assert.equal(p.stock, before.stock - 1);
  assert.equal(p.reserved, 0);
  const snapshot = stable(state());
  assert.throws(() => call({ type: "job.start", id: 1 }), /Bearbeitungsstatus/);
  assert.deepEqual(stable(state()), snapshot);
});
test("multi-part approval rolls back when a single part is missing", (t) => {
  const { call, state } = fixture(t);
  call({ type: "part.adjust", id: 4, delta: -12, reason: "Inventur" });
  const before = stable(state());
  assert.throws(() => call({ type: "quote.accept", id: 1 }), /Nicht genügend/);
  assert.deepEqual(stable(state()), before);
  assert.equal(state().parts.find((p) => p.id === 1).reserved, 0);
});
test("inventory correction cannot consume reservations and cancelling frees them", (t) => {
  const { call, state } = fixture(t);
  call({ type: "quote.accept", id: 1 });
  assert.throws(
    () => call({ type: "part.adjust", id: 1, delta: -8, reason: "Inventur" }),
    /reservierte/,
  );
  call({ type: "job.cancel", id: 1, reason: "Kunde verzichtet" });
  assert.equal(state().parts.find((p) => p.id === 1).reserved, 0);
  assert.equal(state().parts.find((p) => p.id === 1).stock, 8);
});
test("new quotes replace offered versions and preserve historical prices", (t) => {
  const { call, state } = fixture(t),
    first = state().quotes.find((q) => q.id === 1);
  call({ type: "part.update", id: 1, minimum: 4, price: 9999 });
  call({
    type: "quote.create",
    jobId: 1,
    minutes: 30,
    rate: 6000,
    note: "Neue Fassung",
    parts: [{ partId: 1, quantity: 1 }],
  });
  const after = state().quotes;
  assert.equal(after.find((q) => q.id === 1).status, "superseded");
  assert.equal(
    after.find((q) => q.id === 1).parts[0].price,
    first.parts[0].price,
  );
  assert.equal(after[0].total, 12999);
  assert.throws(
    () => call({ type: "quote.accept", id: 1 }),
    /nicht mehr offen/,
  );
});
test("repairs need assignment and cannot enter testing without work logs", (t) => {
  const { call, state } = fixture(t);
  call({ type: "job.diagnose", id: 3, diagnosis: "Gelenk ersetzen" });
  call({
    type: "quote.create",
    jobId: 3,
    minutes: 20,
    rate: 6000,
    note: "Arbeit ohne Teile",
    parts: [],
  });
  const q = state().quotes[0];
  call({ type: "quote.accept", id: q.id });
  assert.throws(() => call({ type: "job.start", id: 3 }), /Person zuweisen/);
  call({
    type: "job.assign",
    id: 3,
    technicianId: 2,
    due: "2027-01-01",
    priority: 2,
  });
  call({ type: "job.start", id: 3 });
  assert.throws(
    () => call({ type: "job.testing", id: 3 }),
    /Arbeiten protokollieren/,
  );
});
test("all quality checks must pass before pickup and pickup closes the job", (t) => {
  const { call, state } = fixture(t);
  call({ type: "job.testing", id: 2 });
  assert.throws(() => call({ type: "job.ready", id: 2 }), /Alle drei/);
  for (const kind of state().checkKinds)
    call({
      type: "check.record",
      jobId: 2,
      kind,
      passed: kind !== "Funktion",
      note: "Testbefund",
    });
  assert.throws(() => call({ type: "job.ready", id: 2 }), /Alle drei/);
  call({
    type: "check.record",
    jobId: 2,
    kind: "Funktion",
    passed: true,
    note: "Nachkontrolle bestanden",
  });
  call({ type: "job.ready", id: 2 });
  call({ type: "job.collect", id: 2, name: "Jonas" });
  assert.equal(state().jobs.find((j) => j.id === 2).status, "collected");
  assert.throws(
    () =>
      call({
        type: "work.log",
        jobId: 2,
        technicianId: 1,
        minutes: 3,
        note: "Late",
      }),
    /Bearbeitungsstatus/,
  );
});
test("rework clears stale checks and does not consume parts a second time", (t) => {
  const { call, state } = fixture(t),
    stock = state().parts.find((p) => p.id === 2).stock;
  call({ type: "job.testing", id: 2 });
  call({
    type: "check.record",
    jobId: 2,
    kind: "Funktion",
    passed: true,
    note: "Test",
  });
  call({ type: "job.resume", id: 2, reason: "Weiterer Fehler" });
  assert.equal(state().checks.filter((c) => c.job_id === 2).length, 0);
  assert.equal(state().parts.find((p) => p.id === 2).stock, stock);
  assert.equal(state().jobs.find((j) => j.id === 2).status, "repairing");
});
test("rejected quote returns to diagnosis without reserving stock", (t) => {
  const { call, state } = fixture(t);
  call({ type: "quote.reject", id: 1, reason: "Budget überschritten" });
  assert.equal(state().jobs.find((j) => j.id === 1).status, "diagnosing");
  assert.equal(state().parts.find((p) => p.id === 1).reserved, 0);
});
test("duplicate quote lines and malformed quantities roll back existing offers", (t) => {
  const { call, state } = fixture(t),
    before = stable(state()),
    base = {
      type: "quote.create",
      jobId: 1,
      minutes: 30,
      rate: 6000,
      note: "Invalid",
    };
  assert.throws(
    () =>
      call({
        ...base,
        parts: [
          { partId: 1, quantity: 1 },
          { partId: 1, quantity: 1 },
        ],
      }),
    /nur einmal/,
  );
  assert.throws(
    () => call({ ...base, parts: [{ partId: 1, quantity: 1.5 }] }),
    /Zahl/,
  );
  assert.deepEqual(stable(state()), before);
});
