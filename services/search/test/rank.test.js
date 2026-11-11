import { test } from "node:test";
import assert from "node:assert/strict";
import { search, suggest, tokenize } from "../src/rank.js";

const index = {
  avgLength: 4,
  df: { tea: 2, cup: 1, pot: 1, rate: 1 },
  docs: [
    { id: "a", title: "A", section: "S", url: "/docs/a", length: 4, terms: { tea: 1, cup: 3 }, text: "A cup of tea" },
    { id: "b", title: "B", section: "S", url: "/docs/b", length: 4, terms: { tea: 1, pot: 1, rate: 1 }, text: "Tea pot rates" },
  ],
};

test("tokenize matches the indexer", () => assert.deepEqual(tokenize("The Carts are checking prices!"), ["cart", "check", "price"]));
test("ranks by bm25", () => {
  const r = search(index, "cups");
  assert.equal(r[0].id, "a");
  assert.match(r[0].snippet, /\*\*cup\*\*/);
  assert.equal(search(index, "rates")[0].id, "b");
});
test("suggests by prefix", () => assert.deepEqual(suggest(index, "t"), ["tea"]));
