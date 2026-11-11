import { createApp } from "./app.js";
import { openStore } from "./store/index.js";
import { startDemoTraffic } from "./demo.js";

const port = Number(process.env.PORT || 4000);
const store = await openStore();
const app = createApp(store);
if (process.env.DEMO_TRAFFIC !== "off") startDemoTraffic(app.locals.ingest);
app.listen(port, () => console.log(`dashboard api listening on ${port} (store: ${store.kind})`));
