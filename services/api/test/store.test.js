import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryStore } from "../src/store/memory.js";

test("memory store keeps the newest events first", async () => {
  const s = memoryStore();
  await s.append([{ metric: "a", value: 1, ts: 1 }, { metric: "b", value: 2, ts: 2 }]);
  assert.equal(await s.count(), 2);
  assert.deepEqual((await s.recent(1)).map((e) => e.metric), ["b"]);
});
