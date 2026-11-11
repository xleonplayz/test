import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { serverUrl, saveServerUrl } from "./server-url.js";

export default function App() {
  const [server, setServer] = useState(serverUrl());
  const [name, setName] = useState(() => localStorage.getItem("chat.name") || "");
  const [room, setRoom] = useState("general");
  const [rooms, setRooms] = useState(["general"]);
  const [joined, setJoined] = useState(false);
  const [status, setStatus] = useState("disconnected");
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState("");
  const [text, setText] = useState("");
  const [notice, setNotice] = useState("");
  const socket = useRef(null);
  const bottom = useRef(null);

  useEffect(() => {
    const s = io(server, { transports: ["websocket", "polling"] });
    socket.current = s;
    s.on("connect", () => setStatus(`connected (${s.io.engine.transport.name})`));
    s.on("disconnect", () => { setStatus("disconnected"); setJoined(false); });
    s.on("connect_error", (e) => setStatus(`cannot reach ${server}: ${e.message}`));
    s.on("message", (m) => setMessages((list) => [...list.slice(-199), m]));
    s.on("presence", (p) => setUsers(p.users));
    s.on("typing", ({ name: who }) => { setTyping(`${who} is typing…`); setTimeout(() => setTyping(""), 2000); });
    return () => s.close();
  }, [server]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function join(target = room) {
    localStorage.setItem("chat.name", name);
    socket.current.emit("join", { name, room: target }, (r) => {
      setJoined(true); setRoom(r.room); setRooms(r.rooms); setName(r.name); setMessages(r.history); setNotice("");
    });
  }

  function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    socket.current.emit("message", { text }, (r) => {
      if (r.ok) { setText(""); setNotice(r.message.flags?.length ? `moderation: ${r.message.flags.join(", ")}` : ""); }
      else setNotice(`not sent: ${r.reason}`);
    });
  }

  return (
    <div className="app">
      <header>
        <h1>Teahouse Chat</h1>
        <span className="status">{status}</span>
      </header>
      {!joined ? (
        <form className="card join" onSubmit={(e) => { e.preventDefault(); join(); }}>
          <label>Your name <input value={name} onChange={(e) => setName(e.target.value)} placeholder="guest" /></label>
          <label>Chat server <input value={server} onChange={(e) => setServer(e.target.value)} onBlur={() => saveServerUrl(server)} /></label>
          <button type="submit" disabled={!status.startsWith("connected")}>Join</button>
        </form>
      ) : (
        <div className="layout">
          <aside className="card">
            <h3>Rooms</h3>
            {rooms.map((r) => (
              <button key={r} className={r === room ? "room active" : "room"} onClick={() => join(r)}>#{r}</button>
            ))}
            <h3>Here now</h3>
            <ul>{users.map((u) => <li key={u}>{u}</li>)}</ul>
          </aside>
          <section className="card chat">
            <div className="messages">
              {messages.map((m) => (
                <div key={m.id} className="msg">
                  <span className="who">{m.user}</span> <span className="when">{new Date(m.at).toLocaleTimeString()}</span>
                  <div>{m.text}</div>
                </div>
              ))}
              <div ref={bottom} />
            </div>
            <div className="typing">{typing || notice}</div>
            <form onSubmit={send} className="composer">
              <input value={text} onChange={(e) => { setText(e.target.value); socket.current.emit("typing"); }} placeholder={`Message #${room}`} maxLength={500} />
              <button type="submit">Send</button>
            </form>
          </section>
        </div>
      )}
      <footer>Messages pass a C++ moderation service before they are shown. Nothing is stored after a restart.</footer>
    </div>
  );
}
