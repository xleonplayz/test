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

const update = (e) => ({
  type: "event.update",
  id: e.id,
  title: e.title,
  category: e.category,
  description: e.description,
  venue: e.venue,
  start: e.start,
  end: e.end,
  capacity: e.capacity,
  price: e.price,
  budget: e.budget,
});
test("room conflicts reject the whole edit while adjacent bookings fit", (t) => {
  const { call, state } = fixture(t),
    before = stable(state()),
    first = state().sessions[0];
  assert.throws(
    () =>
      call({
        type: "session.create",
        eventId: 1,
        roomId: 1,
        title: "Conflict",
        speaker: "",
        start: first.start,
        end: first.end,
      }),
    /belegt/,
  );
  assert.deepEqual(stable(state()), before);
  call({
    type: "session.create",
    eventId: 1,
    roomId: 1,
    title: "Adjacent",
    speaker: "",
    start: first.end,
    end: new Date(Date.parse(first.end) + 1800000).toISOString(),
  });
  assert.equal(state().sessions.length, 5);
});
test("session containment and shrinking event dates preserve the previous plan", (t) => {
  const { call, state } = fixture(t),
    e = state().events.find((e) => e.id === 1),
    before = stable(state());
  assert.throws(
    () =>
      call({
        type: "session.create",
        eventId: 1,
        roomId: 3,
        title: "Outside",
        speaker: "",
        start: new Date(Date.parse(e.start) - 3600000).toISOString(),
        end: e.start,
      }),
    /außerhalb/,
  );
  assert.throws(
    () => call({ ...update(e), end: state().sessions[0].end }),
    /Veranstaltungszeitraum/,
  );
  assert.deepEqual(stable(state()), before);
});
test("waitlist promotion is FIFO and cancellation frees exactly one place", (t) => {
  const { call, state } = fixture(t);
  call({
    type: "booking.create",
    eventId: 2,
    name: "Fourth",
    email: "four@example.test",
  });
  const first = state().bookings.find(
    (b) => b.event_id === 2 && b.status === "confirmed",
  );
  call({ type: "booking.cancel", id: first.id });
  const guests = state().bookings.filter((b) => b.event_id === 2);
  assert.equal(guests.find((b) => b.name === "Lena Otto").status, "confirmed");
  assert.equal(guests.find((b) => b.name === "Fourth").status, "waitlisted");
  const e = state().events.find((e) => e.id === 2);
  call({ ...update(e), capacity: 3 });
  assert.equal(
    state().bookings.find((b) => b.name === "Fourth").status,
    "confirmed",
  );
});
test("capacity cannot fall below confirmed guests and booked prices are frozen", (t) => {
  const { call, state } = fixture(t),
    e = state().events.find((e) => e.id === 1),
    before = stable(state());
  assert.throws(() => call({ ...update(e), capacity: 1 }), /Kapazität/);
  assert.throws(
    () => call({ ...update(e), price: e.price + 100 }),
    /Ticketpreis/,
  );
  assert.deepEqual(stable(state()), before);
});
test("duplicate guest email is case insensitive and waitlisted guests cannot check in", (t) => {
  const { call, state } = fixture(t);
  assert.throws(
    () =>
      call({
        type: "booking.create",
        eventId: 1,
        name: "Duplicate",
        email: "ELENA@example.test",
      }),
    /bereits/,
  );
  const waiting = state().bookings.find((b) => b.status === "waitlisted");
  assert.throws(
    () => call({ type: "booking.checkin", id: waiting.id, value: true }),
    /bestätigte/,
  );
  call({ type: "booking.checkin", id: 1, value: true });
  assert.throws(() => call({ type: "booking.cancel", id: 1 }), /zurücknehmen/);
  call({ type: "booking.checkin", id: 1, value: false });
  call({ type: "booking.cancel", id: 1 });
  assert.equal(state().bookings.find((b) => b.id === 1).status, "cancelled");
});
test("publication needs a program and closed events reject registrations", (t) => {
  const { call, state } = fixture(t);
  assert.throws(() => call({ type: "event.publish", id: 3 }), /Programmpunkt/);
  call({ type: "event.close", id: 1 });
  assert.throws(
    () =>
      call({
        type: "booking.create",
        eventId: 1,
        name: "Late",
        email: "late@example.test",
      }),
    /nicht geöffnet/,
  );
  call({ type: "expense.actual", id: 1, actual: 90000 });
  assert.equal(state().expenses[0].actual, 90000);
});
test("cancellation keeps history, cancels every booking and releases room conflicts", (t) => {
  const { call, state } = fixture(t),
    e = state().events.find((e) => e.id === 2);
  call({ type: "event.cancel", id: 2, reason: "Terminverschiebung" });
  assert.ok(
    state()
      .bookings.filter((b) => b.event_id === 2)
      .every((b) => b.status === "cancelled"),
  );
  assert.equal(state().sessions.filter((s) => s.event_id === 2).length, 1);
  call({
    ...update(state().events.find((e) => e.id === 3)),
    start: e.start,
    end: e.end,
  });
  call({
    type: "session.create",
    eventId: 3,
    roomId: 2,
    title: "Reused slot",
    speaker: "",
    start: e.start,
    end: e.end,
  });
});
test("CSV formula protection and UTF-8-safe iCalendar export", (t) => {
  const { call, state, store } = fixture(t),
    e = state().events.find((e) => e.id === 1);
  call({
    ...update(e),
    title: "=SUM(1) " + "Ä".repeat(50),
    description: "Zeile eins\nZeile zwei; mit, Komma",
  });
  const calendar = store.calendar();
  assert.match(calendar, /BEGIN:VCALENDAR/);
  assert.match(calendar, /\\nZeile zwei\\; mit\\, Komma/);
  assert.ok(
    calendar.split("\r\n").every((line) => Buffer.byteLength(line) <= 75),
  );
  assert.match(store.csv(), /"'=SUM/);
});
