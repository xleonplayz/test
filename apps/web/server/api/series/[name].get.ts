export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, "name") || "";
  const minutes = Number(getQuery(event).minutes) || 30;
  return await api(`/api/metrics/${encodeURIComponent(name)}/series?minutes=${minutes}`);
});
