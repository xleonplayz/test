// Starts the server on a free port (moderation unreachable, so messages pass as
// "unmoderated") and checks the Socket.IO flow between two clients.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { io } from "socket.io-client";

const port = 40000 + Math.floor(Math.random() * 10000);

test("two clients exchange a message", async (t) => {
  const srv = spawn(process.execPath, ["src/server.js"], {
    env: { ...process.env, PORT: String(port), MODERATION_URL: "http://127.0.0.1:1" },
    stdio: ["ignore", "pipe", "inherit"],
  });
  t.after(() => srv.kill());
  await new Promise((r) => srv.stdout.once("data", r));
  const url = `http://127.0.0.1:${port}`;
  const a = io(url, { transports: ["websocket"] });
  const b = io(url, { transports: ["websocket"] });
  t.after(() => { a.close(); b.close(); });
  const join = (s, name) => new Promise((r) => s.emit("join", { name, room: "general" }, r));
  await join(a, "ann");
  await join(b, "bob");
  const got = new Promise((r) => b.once("message", r));
  const ack = await new Promise((r) => a.emit("message", { text: "hello bob" }, r));
  assert.equal(ack.ok, true);
  const msg = await got;
  assert.equal(msg.text, "hello bob");
  assert.deepEqual(msg.flags, ["unmoderated"]);
});
