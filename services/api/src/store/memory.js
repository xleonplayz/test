// Raw events in memory: the newest 5000, lost on restart.
export function memoryStore() {
  const events = [];
  return {
    kind: "memory",
    async init() {},
    async append(list) {
      events.push(...list);
      if (events.length > 5000) events.splice(0, events.length - 5000);
    },
    async recent(limit) {
      return events.slice(-limit).reverse();
    },
    async count() {
      return events.length;
    },
  };
}
