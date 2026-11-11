import { memoryStore } from "./memory.js";

// PostgreSQL when DATABASE_URL is set, memory otherwise.
export async function openStore() {
  const url = process.env.DATABASE_URL;
  if (!url) return memoryStore();
  const { postgresStore } = await import("./postgres.js");
  const store = postgresStore(url);
  await store.init();
  return store;
}
