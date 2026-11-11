// Real-time check: two Socket.IO clients over WebSocket, one sends, the other
// receives the moderated message. Usage: node scripts/ws-check.mjs <chat-url>
import { io } from "socket.io-client";

const url = process.argv[2];
const transports = (process.argv[3] || "websocket").split(",");
const timer = setTimeout(() => { console.log("FAIL timeout"); process.exit(1); }, 20000);
const a = io(url, { transports });
const b = io(url, { transports });
const join = (s, name) => new Promise((r) => s.emit("join", { name, room: "random" }, r));
await join(a, "smoke-a");
await join(b, "smoke-b");
const got = new Promise((r) => b.on("message", (m) => m.user === "smoke-a" && r(m)));
const ack = await new Promise((r) => a.emit("message", { text: `ws check ${Date.now()} what a sc4m` }, r));
const msg = await got;
clearTimeout(timer);
a.close(); b.close();
const ok = ack.ok && msg.text.includes("s***") && !msg.flags.includes("unmoderated");
console.log(`${ok ? "OK" : "FAIL"} transport=${a.io.engine?.transport?.name ?? transports[0]} text=${JSON.stringify(msg.text)} flags=${JSON.stringify(msg.flags)}`);
process.exit(ok ? 0 : 1);
