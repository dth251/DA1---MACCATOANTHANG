// Run with: node tests/admin.test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
let passed = 0;
function test(name, run) { run(); passed++; console.log('PASS', name); }
function fixture(raw = null) {
  const storage = { raw, blocked: false };
  const context = vm.createContext({ window: {}, crypto, localStorage: {
    getItem: () => storage.raw,
    setItem: (key, value) => { if (storage.blocked) throw Error('quota'); storage.raw = value; },
  } });
  vm.runInContext(read('store.js'), context);
  context.Macca = context.window.Macca;
  vm.runInContext(read('admin-data.js'), context);
  context.MaccaAdmin = context.window.MaccaAdmin;
  return { api: context.MaccaAdmin, context, storage };
}
const customer = { name: 'Khách kiểm thử', phone: '0900000000', email: 'test@example.com', address: 'Địa chỉ kiểm thử' };
test('Initial catalog comes from storefront, with no fabricated orders or stock', () => {
  const f = fixture(), state = f.api.getState();
  assert.equal(state.products.length, 4);
  assert.equal(state.products[0].name, f.context.Macca.products[0].name);
  assert.ok(state.products.every(p => p.stock === null));
  assert.equal(state.orders.length, 0);
  assert.equal(f.storage.raw, null);
});
test('Product create/edit/delete persist and survive reload', () => {
  const f = fixture(), p = { ...f.api.getState().products[0], id: 'test-product', name: 'Macca mới', stock: 12 };
  f.api.saveProduct(p);
  assert.equal(f.api.getState().products.length, 5);
  f.api.saveProduct({ ...p, price: 200000, active: false });
  const fresh = fixture(f.storage.raw);
  assert.equal(fresh.api.getState().products.find(p => p.id === 'test-product').price, 200000);
  assert.equal(fresh.api.getState().products.find(p => p.id === 'test-product').active, false);
  fresh.api.deleteProduct('test-product');
  assert.equal(fresh.api.getState().products.length, 4);
});
test('Reject invalid prices, quantities, IDs, images and blank names', () => {
  const f = fixture(), p = f.api.getState().products[0];
  for (const change of [{ price: -1 }, { price: 2001 }, { stock: 1.5 }, { stock: -1 }, { name: '  ' }, { id: '<img>' }, { image: 'javascript:alert(1)' }, { category: '__proto__' }]) {
    assert.throws(() => f.api.saveProduct({ ...p, ...change }));
  }
  assert.equal(f.storage.raw, null);
});
test('Orders consolidate duplicate lines and preserve product snapshots', () => {
  const f = fixture();
  f.api.createOrder(customer, [{ id: 'natural', quantity: 2 }, { id: 'natural', quantity: 1 }], 30000, 'Kiểm thử');
  const order = f.api.getState().orders[0];
  assert.equal(order.items.length, 1);
  assert.equal(order.items[0].quantity, 3);
  assert.equal(f.api.total(order), 585000);
  f.api.saveProduct({ ...f.api.getState().products[0], price: 100000 });
  f.api.deleteProduct('natural');
  assert.equal(f.api.total(f.api.getState().orders[0]), 585000);
  assert.equal(fixture(f.storage.raw).api.getState().orders[0].items[0].price, 185000);
});
test('Orders reject invalid contacts, unavailable products and invalid totals', () => {
  const f = fixture();
  assert.throws(() => f.api.createOrder({ ...customer, phone: 'abc' }, [{ id: 'natural', quantity: 1 }], 0, ''));
  assert.throws(() => f.api.createOrder({ ...customer, name: '  ' }, [{ id: 'natural', quantity: 1 }], 0, ''));
  assert.throws(() => f.api.createOrder({ ...customer, email: 'bad' }, [{ id: 'natural', quantity: 1 }], 0, ''));
  for (const lines of [[], [{ id: 'missing', quantity: 1 }], [{ id: 'natural', quantity: 0 }], [{ id: 'natural', quantity: 1.5 }], [{ id: 'natural', quantity: 99 }, { id: 'natural', quantity: 1 }]]) assert.throws(() => f.api.createOrder(customer, lines, 0, ''));
  assert.throws(() => f.api.createOrder(customer, [{ id: 'natural', quantity: 1 }], -1, ''));
  f.api.saveProduct({ ...f.api.getState().products[0], active: false });
  assert.throws(() => f.api.createOrder(customer, [{ id: 'natural', quantity: 1 }], 0, ''));
  assert.equal(f.api.getState().orders.length, 0);
});
test('Customers group by phone and completed totals exclude cancelled orders', () => {
  const f = fixture();
  f.api.createOrder(customer, [{ id: 'kernel', quantity: 1 }], 0, '');
  const firstId = f.api.getState().orders[0].id;
  f.api.createOrder(customer, [{ id: 'natural', quantity: 1 }], 0, '');
  const secondId = f.api.getState().orders[0].id;
  f.api.updateStatus(firstId, 'completed');
  f.api.updateStatus(secondId, 'cancelled');
  const list = f.api.customers(f.api.getState().orders);
  assert.equal(list.length, 1);
  assert.equal(list[0].orders, 2);
  assert.equal(list[0].completed, 225000);
  assert.throws(() => f.api.updateStatus(firstId, '__proto__'));
  assert.throws(() => f.api.updateStatus('missing', 'completed'));
});
test('Blocked writes do not mutate in-memory state or stored records', () => {
  const f = fixture(), before = JSON.stringify(f.api.getState());
  f.storage.blocked = true;
  assert.throws(() => f.api.deleteProduct('natural'), /Không thể lưu/);
  assert.equal(JSON.stringify(f.api.getState()), before);
  assert.equal(f.storage.raw, null);
});
test('Corrupted stored data is preserved and edits are blocked', () => {
  for (const raw of ['{bad', '{}', '{"version":1,"revision":0,"products":[],"orders":[{}]}']) {
    const f = fixture(raw);
    assert.ok(f.api.getError());
    assert.throws(() => f.api.deleteProduct('natural'));
    assert.equal(f.storage.raw, raw);
  }
});
test('Stale tabs cannot overwrite more recent changes', () => {
  const f = fixture(), other = fixture();
  other.api.deleteProduct('natural');
  f.storage.raw = other.storage.raw;
  assert.throws(() => f.api.deleteProduct('kernel'), /tab khác/);
  assert.equal(f.api.getState().products.length, 3);
  assert.ok(f.api.getState().products.some(p => p.id === 'kernel'));
});
test('State reads return copies instead of mutable store references', () => {
  const f = fixture(), copy = f.api.getState();
  copy.products[0].price = 0;
  assert.equal(f.api.getState().products[0].price, 185000);
});
test('Admin HTML IDs, route targets, element references and asset files resolve', () => {
  const html = read('admin.html'), script = read('admin.js');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const [, target] of html.matchAll(/(?:src|href)="([^"#][^"]*)"/g)) {
    assert.ok(fs.existsSync(path.join(root, target.split(/[?#]/)[0])), target);
  }
  for (const [, route] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(route) || ids.includes('page-' + route), route);
  for (const [, id] of script.matchAll(/\$\('#([\w-]+)'\)/g)) assert.ok(ids.includes(id), id);
  for (const file of ['admin.js', 'admin-data.js']) new vm.Script(read(file), { filename: file });
});
test('Admin rendering escapes customer and product content and supports filtering', () => {
  const f = fixture(), nodes = new Map();
  const node = selector => {
    if (!nodes.has(selector)) nodes.set(selector, { value: '', innerHTML: '', textContent: '', hidden: false, listeners: {}, classList: { add() {}, remove() {} }, addEventListener(type, fn) { this.listeners[type] = fn; } });
    return nodes.get(selector);
  };
  node('#product-category').value = 'all'; node('#order-filter').value = 'all';
  f.api.saveProduct({ ...f.api.getState().products[0], name: '<img src=x onerror=alert(1)> & Macca' });
  f.api.createOrder({ ...customer, name: '<script>alert(1)</script>' }, [{ id: 'natural', quantity: 1 }], 0, '');
  const documentEvents = {};
  f.context.document = { querySelector: node, querySelectorAll: () => [], addEventListener: (name, fn) => { documentEvents[name] = fn; } };
  f.context.window.addEventListener = () => {};
  f.context.location = { hash: '#overview' };
  vm.runInContext(read('journal-data.js'), f.context);
  vm.runInContext(read('admin.js'), f.context);
  assert.ok(node('#product-rows').innerHTML.includes('&lt;img'));
  assert.ok(!node('#product-rows').innerHTML.includes('<img src=x'));
  assert.ok(node('#order-rows').innerHTML.includes('&lt;script&gt;'));
  node('#product-search').value = 'nhan macca';
  node('#product-search').listeners.input();
  assert.match(node('#product-result').textContent, /1 \/ 4/);
  node('#order-filter').value = 'completed';
  node('#order-filter').listeners.change();
  assert.match(node('#order-result').textContent, /0 \/ 1/);
});
console.log(`${passed} admin checks passed.`);
