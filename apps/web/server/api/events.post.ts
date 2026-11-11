export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  return await api("/api/events", { method: "POST", body });
});
