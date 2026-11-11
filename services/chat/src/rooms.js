// Rooms with a bounded message history, kept in memory.
const HISTORY = 100;
export const ROOMS = ["general", "tea-time", "random"];

const history = new Map(ROOMS.map((r) => [r, []]));
let seq = 0;

export function isRoom(room) {
  return history.has(room);
}

export function addMessage(room, msg) {
  const list = history.get(room);
  const stored = { id: ++seq, room, at: new Date().toISOString(), ...msg };
  list.push(stored);
  if (list.length > HISTORY) list.splice(0, list.length - HISTORY);
  return stored;
}

export function messages(room, limit = 50) {
  return (history.get(room) || []).slice(-limit);
}

export function stats() {
  return Object.fromEntries([...history].map(([r, l]) => [r, l.length]));
}
