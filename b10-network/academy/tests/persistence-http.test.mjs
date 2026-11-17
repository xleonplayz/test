import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openStore } from "../store.mjs";
import { createApp } from "../server.mjs";
const action = { type: "group.create", name: "QA Gruppe" };
const stable = (s) => {
  const copy = structuredClone(s);
  delete copy.now;
  return copy;
};
test("revision conflicts are atomic and data survives reopening", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "workspace-persistence-"));
  let store = openStore(dir);
  t.after(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const revision = store.snapshot().revision;
  store.command(revision, action);
  const before = stable(store.snapshot());
  assert.throws(
    () => store.command(revision, action),
    (e) => e.status === 409,
  );
  assert.deepEqual(stable(store.snapshot()), before);
  store.close();
  store = openStore(dir);
  assert.deepEqual(stable(store.snapshot()), before);
});
test("HTTP validates origin, JSON and revision; exports remain readable", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "workspace-http-")),
    app = createApp(dir);
  await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => app.server.close(resolve));
    app.store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const base = "http://127.0.0.1:" + app.server.address().port,
    headers = { "Content-Type": "application/json", "X-Workspace": "1" };
  assert.equal((await fetch(base + "/health")).status, 200);
  const response = await fetch(base + "/api/state");
  assert.equal(response.headers.get("cache-control"), "no-store");
  const state = await response.json();
  const body = JSON.stringify({ revision: state.revision, action });
  assert.equal(
    (
      await fetch(base + "/api/commands", {
        method: "POST",
        headers: { ...headers, Origin: "https://external.test" },
        body,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(base + "/api/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(base + "/api/commands", {
        method: "POST",
        headers,
        body: "null",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await fetch(base + "/api/commands", {
        method: "POST",
        headers,
        body: "{",
      })
    ).status,
    400,
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
  const exported = await fetch(base + "/api/export");
  assert.match(exported.headers.get("content-disposition"), /attachment/);
  assert.ok((await exported.json()).audit.length > 0);
  const report = await fetch(base + "/api/report.csv");
  assert.match(report.headers.get("content-type"), /text\/csv/);
  assert.ok((await report.text()).includes(";"));
});
