import test from 'node:test';
import assert from 'node:assert/strict';
import { Warehouse, seed } from './domain.mjs';
test('complete order workflow reserves, ships and returns exact inventory', () => {
  const w = new Warehouse(), stock = w.product('p1').stock;
  const create = w.command(0, {type:'order.create',customerId:'c1',lines:[{productId:'p1',quantity:3}]}).result;
  w.command(1, {type:'order.reserve',id:create.id});
  assert.equal(w.product('p1').stock, stock); assert.equal(w.product('p1').reserved, 3);
  w.command(2, {type:'order.ship',id:create.id});
  assert.equal(w.product('p1').stock, stock - 3); assert.equal(w.product('p1').reserved, 0);
  assert.equal(w.summary().revenue, create.total);
  w.command(3, {type:'order.return',id:create.id});
  assert.equal(w.product('p1').stock, stock); assert.equal(w.summary().revenue, 0);
  assert.throws(() => w.command(4, {type:'order.return',id:create.id}));
});
test('failed multi-line reservation and stale revisions are atomic', () => {
  const w = new Warehouse();
  const o = w.command(0, {type:'order.create',customerId:'c1',lines:[{productId:'p1',quantity:1},{productId:'p2',quantity:9999}]}).result;
  const before = w.export();
  assert.throws(() => w.command(1,{type:'order.reserve',id:o.id}), e => e.status === 409);
  assert.deepEqual(w.export(), before);
  assert.throws(() => w.command(0,{type:'stock.receive',id:'p1',quantity:10}), e => e.status === 409);
  assert.deepEqual(w.export(), before);
});
test('cancel releases inventory; validation rejects negative stock and duplicate lines', () => {
  const w = new Warehouse();
  const o = w.command(0,{type:'order.create',customerId:'c1',lines:[{productId:'p1',quantity:2}]}).result;
  w.command(1,{type:'order.reserve',id:o.id}); w.command(2,{type:'order.cancel',id:o.id});
  assert.equal(w.product('p1').reserved,0);
  assert.throws(()=>w.command(3,{type:'stock.receive',id:'p1',quantity:-1}));
  assert.throws(()=>w.command(3,{type:'order.create',customerId:'c1',lines:[{productId:'p1',quantity:1},{productId:'p1',quantity:1}]}));
});
test('large catalog search and pagination preserve totals; exports can reopen', () => {
  const w = new Warehouse(seed(10000));
  const page = w.snapshot({category:'Werkzeug',page:2,limit:20});
  assert.equal(page.products.length,20); assert.equal(page.total,1667);
  const copy = new Warehouse(w.export()); assert.deepEqual(copy.summary(),w.summary());
  assert.equal(w.csv().split('\r\n').length,10001);
});
