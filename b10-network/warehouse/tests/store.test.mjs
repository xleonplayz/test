import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openStore } from "../store.mjs";
import { createApp } from "../server.mjs";

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "depot-test-"));
  const store = openStore(dir);
  t.after(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return { store, call: (a) => store.command(store.snapshot().revision, a) };
}
test("multi-item reservation rolls back entirely when one item is unavailable", (t) => {
  const { store, call } = fixture(t),
    before = store.snapshot(),
    [a, b] = before.products;
  assert.throws(
    () =>
      call({
        type: "reserve.create",
        label: "Too much",
        lines: [
          { productId: a.id, quantity: 1 },
          { productId: b.id, quantity: b.available + 1 },
        ],
      }),
    /Nicht ausreichend/,
  );
  assert.deepEqual(store.snapshot(), before);
});
test("reserved stock cannot be corrected away and shipping is recorded exactly once", (t) => {
  const { store, call } = fixture(t),
    before = store.snapshot(),
    reservation = before.reservations[0],
    line = reservation.lines[0],
    p = before.products.find((p) => p.id === line.product_id);
  assert.throws(
    () =>
      call({
        type: "stock.adjust",
        id: p.id,
        delta: -p.available - 1,
        reason: "Inventur",
      }),
    /negativ/,
  );
  const shipped = call({ type: "reserve.ship", id: reservation.id }),
    after = shipped.products.find((x) => x.id === p.id);
  assert.equal(after.onHand, p.onHand - line.quantity);
  assert.equal(after.reserved, p.reserved - line.quantity);
  assert.equal(after.available, p.available);
  assert.throws(
    () => call({ type: "reserve.ship", id: reservation.id }),
    /abgeschlossen/,
  );
  assert.deepEqual(store.snapshot(), shipped);
});
test("partial receipts reject excess and cancelling preserves received inventory", (t) => {
  const { store, call } = fixture(t),
    before = store.snapshot(),
    order = before.orders[0],
    productId = order.lines[0].product_id,
    p = before.products.find((x) => x.id === productId);
  call({
    type: "order.receive",
    id: order.id,
    lines: [{ productId, quantity: 7 }],
  });
  assert.equal(store.snapshot().orders[0].status, "partial");
  const partial = store.snapshot();
  assert.throws(
    () =>
      call({
        type: "order.receive",
        id: order.id,
        lines: [{ productId, quantity: 14 }],
      }),
    /übersteigt/,
  );
  assert.deepEqual(store.snapshot(), partial);
  const cancelled = call({ type: "order.cancel", id: order.id });
  assert.equal(
    cancelled.products.find((x) => x.id === productId).onHand,
    p.onHand + 7,
  );
  assert.equal(cancelled.orders[0].lines[0].received, 7);
  assert.throws(
    () =>
      call({
        type: "order.receive",
        id: order.id,
        lines: [{ productId, quantity: 1 }],
      }),
    /abgeschlossen/,
  );
});
test("full receipt, supplier validation and historical line costs", (t) => {
  const { store, call } = fixture(t),
    s = store.snapshot(),
    order = s.orders[0],
    p = s.products.find((x) => x.id === order.lines[0].product_id);
  call({
    type: "product.update",
    id: p.id,
    cost: 999,
    minimum: p.minimum,
    location: p.location,
  });
  assert.equal(store.snapshot().orders[0].lines[0].cost, p.cost);
  assert.throws(
    () =>
      call({
        type: "order.create",
        supplierId: s.suppliers.find((x) => x.id !== p.supplier_id).id,
        expected: "2026-12-01",
        lines: [{ productId: p.id, quantity: 1 }],
      }),
    /Lieferanten/,
  );
  const after = call({
    type: "order.receive",
    id: order.id,
    lines: [{ productId: p.id, quantity: 20 }],
  });
  assert.equal(after.orders[0].status, "received");
  assert.equal(after.products.find((x) => x.id === p.id).onHand, p.onHand + 20);
});
test("stale writes, duplicate positions and malformed positions do not mutate", (t) => {
  const { store, call } = fixture(t),
    before = store.snapshot(),
    p = before.products[0];
  assert.throws(
    () =>
      store.command(before.revision - 1, {
        type: "stock.adjust",
        id: p.id,
        delta: 2,
        reason: "Test",
      }),
    (e) => e.status === 409,
  );
  assert.throws(
    () =>
      call({
        type: "reserve.create",
        label: "Duplicate",
        lines: [
          { productId: p.id, quantity: 1 },
          { productId: p.id, quantity: 1 },
        ],
      }),
    /einmal/,
  );
  assert.throws(
    () => call({ type: "reserve.create", label: "Malformed", lines: [null] }),
    (e) => e.status === 400,
  );
  assert.deepEqual(store.snapshot(), before);
});
test("releasing a reservation restores availability without a stock movement", (t) => {
  const { store, call } = fixture(t),
    before = store.snapshot(),
    r = before.reservations[0];
  const after = call({ type: "reserve.cancel", id: r.id });
  assert.equal(after.movements.length, before.movements.length);
  for (const line of r.lines) {
    const p = before.products.find((p) => p.id === line.product_id),
      updated = after.products.find((p) => p.id === line.product_id);
    assert.equal(updated.onHand, p.onHand);
    assert.equal(updated.available, p.available + line.quantity);
  }
});
test("SQLite state survives reopening and CSV neutralizes formulas", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "depot-persist-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  let store = openStore(dir);
  const s = store.snapshot(),
    p = s.products[0];
  store.command(s.revision, {
    type: "product.update",
    id: p.id,
    minimum: 9,
    location: "=SUM(A1)",
    cost: 600,
  });
  const before = store.export();
  store.close();
  store = openStore(dir);
  assert.equal(store.snapshot().revision, before.revision);
  assert.equal(store.snapshot().products[0].location, "=SUM(A1)");
  assert.match(store.csv(), /"'=SUM\(A1\)"/);
  assert.equal(store.export().audit.length, before.audit.length);
  store.close();
});
test("HTTP enforces origin, JSON, revision and exposes health and exports", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "depot-http-")),
    app = createApp(dir);
  await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => app.server.close(resolve));
    app.store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const base = "http://127.0.0.1:" + app.server.address().port;
  assert.equal((await fetch(base + "/health")).status, 200);
  const snapshot = await (await fetch(base + "/api/state")).json();
  const body = JSON.stringify({
    revision: snapshot.revision,
    action: { type: "supplier.create", name: "Test", email: "", leadDays: 2 },
  });
  const headers = { "content-type": "application/json", "x-depot": "1" };
  assert.equal(
    (
      await fetch(base + "/api/commands", {
        method: "POST",
        headers: { ...headers, origin: "https://foreign.test" },
        body,
      })
    ).status,
    403,
  );
  assert.equal(
    (await fetch(base + "/api/commands", { method: "POST", headers, body }))
      .status,
    200,
  );
  assert.equal(
    (await fetch(base + "/api/commands", { method: "POST", headers, body }))
      .status,
    409,
  );
  assert.equal((await fetch(base + "/api/export")).status, 200);
  assert.match(
    await (await fetch(base + "/api/inventory.csv")).text(),
    /Einstand Cent/,
  );
});
