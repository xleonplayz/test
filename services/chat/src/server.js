// Chat server: Socket.IO for the browser, plus a small HTTP API. Every message
// passes the moderation service before it is broadcast.
import http from "node:http";
import { Server } from "socket.io";
import { ROOMS, isRoom, addMessage, messages, stats } from "./rooms.js";
import { moderate, moderationHealth } from "./moderation.js";

const port = Number(process.env.PORT || 4000);
const startedAt = Date.now();
const online = new Map(); // socket id -> {name, room}

function send(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET, POST, OPTIONS",
  });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => { data += c; if (data.length > 64 * 1024) req.destroy(); });
    req.on("end", () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}

function cleanName(name) {
  const n = String(name || "").trim().replace(/\s+/g, " ").slice(0, 24);
  return n || `guest-${Math.floor(Math.random() * 9000 + 1000)}`;
}

async function post(room, user, text) {
  const verdict = await moderate(user, String(text || ""));
  if (!verdict.allowed) return { ok: false, reason: verdict.reason || "refused", flags: verdict.flags };
  const msg = addMessage(room, { user, text: verdict.text, flags: verdict.flags || [] });
  io.to(room).emit("message", msg);
  return { ok: true, message: msg };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (req.method === "OPTIONS") return send(res, 204, {});
    if (url.pathname === "/" || url.pathname === "/health") {
      return send(res, 200, {
        ok: true, service: "chat", lang: "node", uptimeS: Math.round((Date.now() - startedAt) / 1000),
        online: online.size, rooms: stats(),
      });
    }
    if (url.pathname === "/health/deep") {
      return send(res, 200, { ok: true, service: "chat", moderation: await moderationHealth() });
    }
    if (url.pathname === "/api/rooms") return send(res, 200, { rooms: ROOMS, messages: stats() });
    const m = url.pathname.match(/^\/api\/rooms\/([\w-]+)\/messages$/);
    if (m) {
      if (!isRoom(m[1])) return send(res, 404, { error: "unknown room" });
      if (req.method === "GET") return send(res, 200, { room: m[1], messages: messages(m[1]) });
      if (req.method === "POST") {
        const body = await readJson(req);
        const r = await post(m[1], cleanName(body.user), body.text);
        return send(res, r.ok ? 201 : 422, r);
      }
    }
    return send(res, 404, { error: "not found" });
  } catch (err) {
    return send(res, 500, { error: String(err.message || err) });
  }
});

const io = new Server(server, { cors: { origin: "*" } });

function presence(room) {
  const users = [...online.values()].filter((u) => u.room === room).map((u) => u.name);
  io.to(room).emit("presence", { room, users });
}

io.on("connection", (socket) => {
  socket.on("join", ({ name, room } = {}, ack) => {
    const r = isRoom(room) ? room : "general";
    const prev = online.get(socket.id);
    if (prev) { socket.leave(prev.room); presence(prev.room); }
    const user = { name: cleanName(name), room: r };
    online.set(socket.id, user);
    socket.join(r);
    presence(r);
    if (typeof ack === "function") ack({ ok: true, name: user.name, room: r, rooms: ROOMS, history: messages(r) });
  });
  socket.on("message", async ({ text } = {}, ack) => {
    const user = online.get(socket.id);
    if (!user) return typeof ack === "function" && ack({ ok: false, reason: "join a room first" });
    const r = await post(user.room, user.name, text);
    if (typeof ack === "function") ack(r);
  });
  socket.on("typing", () => {
    const user = online.get(socket.id);
    if (user) socket.to(user.room).emit("typing", { name: user.name });
  });
  socket.on("disconnect", () => {
    const user = online.get(socket.id);
    online.delete(socket.id);
    if (user) presence(user.room);
  });
});

server.listen(port, () => console.log(`chat server listening on ${port}`));
