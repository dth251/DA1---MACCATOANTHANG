// Run: node tests/requests.test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const crypto = require('node:crypto');
const { createApp } = require('../server/server.cjs');

async function run() {
  const tempRoot = path.resolve(os.tmpdir());
  const dataDir = await fs.mkdtemp(path.join(tempRoot, 'macca-request-test-'));
  const password = crypto.randomBytes(24).toString('base64url');
  const options = { adminUsername: 'test-admin', adminPassword: password, dataDir, submissionLimit: 100 };
  let server, port, cookie, passed = 0;
  async function start() { server = await createApp(options); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); port = server.address().port; }
  async function stop() { await new Promise(resolve => server.close(resolve)); }
  function send(route, method = 'GET', body, headers = {}) {
    return new Promise((resolve, reject) => {
      const req = http.request({ hostname: '127.0.0.1', port, path: route, method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers } }, res => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let data; try { data = JSON.parse(text); } catch { data = text; }
          resolve({ status: res.statusCode, headers: res.headers, data });
        });
      });
      req.on('error', reject);
      req.end(body ? JSON.stringify(body) : undefined);
    });
  }
  const submit = (body, token = crypto.randomUUID()) => send('/api/requests', 'POST', body, { 'Idempotency-Key': token });
  const contact = { type: 'contact', consent: true, customer: { name: 'Khách kiểm thử', phone: '', email: 'test@example.com' }, topic: 'general', message: 'Tôi muốn tìm hiểu về sản phẩm macca.' };
  const consult = { type: 'consult', consent: true, customer: { name: 'Khách tư vấn', phone: '0900000000', email: '' }, topic: 'gift', message: 'Tôi cần tư vấn quà tặng số lượng lớn.', details: { company: 'Công ty thử nghiệm', quantity: 50, budget: 'Từ 5 đến 20 triệu đồng' } };
  const order = { type: 'order', consent: true, customer: { name: 'Khách đặt hàng', phone: '0900000001', email: '', address: 'Địa chỉ kiểm thử', ward: 'Phường thử nghiệm', province: 'Tỉnh thử nghiệm' }, items: [{ id: 'natural', quantity: 2, price: 1 }], shipping: 'standard', payment: 'cod', message: '', expectedTotal: 400000 };
  async function test(name, fn) { await fn(); passed++; console.log('PASS', name); }
  try {
    await start();
    await test('Private inbox, sessions and mutations require an authenticated admin', async () => {
      assert.equal((await send('/api/admin/requests')).status, 401);
      assert.equal((await send('/api/admin/session')).status, 401);
      assert.equal((await send('/api/admin/requests/YC-ABC', 'PATCH', { status: 'completed', revision: 1 })).status, 401);
    });
    await test('Server code, customer storage and traversal are not served as public assets', async () => {
      for (const file of ['/server/server.cjs', '/server/catalog.json', '/.admin-data/requests.json', '/assets/%2e%2e/server/server.cjs', '/tests/requests.test.cjs', '/.env']) assert.equal((await send(file)).status, 404, file);
      assert.equal((await send('/admin.html')).status, 200);
    });
    await test('Submission validates consent, email, phone, topic, message and quantities', async () => {
      for (const body of [{ ...contact, consent: false }, { ...contact, message: ' ' }, { ...contact, topic: '__proto__' }, { ...contact, customer: { ...contact.customer, email: 'wrong' } }, { ...consult, customer: { ...consult.customer, phone: 'abc' } }, { ...consult, details: { ...consult.details, quantity: -1 } }, { ...order, items: [{ id: 'natural', quantity: 1.5 }] }, { ...order, items: [{ id: 'missing', quantity: 1 }] }]) assert.equal((await submit(body)).status, 400);
    });
    await test('Cross-site posts and form-encoded login attempts are rejected', async () => {
      assert.equal((await send('/api/requests', 'POST', contact, { Origin: 'https://another.example', 'Idempotency-Key': crypto.randomUUID() })).status, 403);
      assert.equal((await send('/api/admin/login', 'POST', { username: 'test-admin', password }, { 'Content-Type': 'application/x-www-form-urlencoded' })).status, 415);
    });
    let contactId, orderId;
    await test('Contact and consultation are persisted with all Vietnamese details', async () => {
      const first = await submit(contact), second = await submit(consult);
      assert.equal(first.status, 201); assert.equal(second.status, 201);
      contactId = first.data.id;
      const stored = JSON.parse(await fs.readFile(path.join(dataDir, 'requests.json'), 'utf8'));
      assert.equal(stored.length, 2);
      assert.equal(stored.find(r => r.id === contactId).message, contact.message);
      assert.equal(stored[0].details.quantity, 50);
    });
    await test('Orders use server prices, retain line snapshots and validate expected totals', async () => {
      assert.equal((await submit({ ...order, expectedTotal: 2 })).status, 409);
      const accepted = await submit(order);
      orderId = accepted.data.id;
      assert.equal(accepted.status, 201);
      assert.equal(accepted.data.total, 400000);
      assert.equal(accepted.data.items[0].price, 185000);
    });
    await test('Concurrent retries create only one record; changed payload with same token is rejected', async () => {
      const token = crypto.randomUUID();
      const results = await Promise.all([submit(contact, token), submit(contact, token), submit(contact, token)]);
      assert.ok(results.every(r => r.status === 201));
      assert.equal(new Set(results.map(r => r.data.id)).size, 1);
      assert.equal((await submit({ ...contact, message: 'Một nội dung khác để thử nghiệm.' }, token)).status, 409);
      assert.equal(JSON.parse(await fs.readFile(path.join(dataDir, 'requests.json'), 'utf8')).length, 4);
    });
    await test('Login validates credentials and issues an HttpOnly SameSite session cookie', async () => {
      assert.equal((await send('/api/admin/login', 'POST', { username: 'test-admin', password: 'wrong-password' })).status, 401);
      const login = await send('/api/admin/login', 'POST', { username: 'test-admin', password });
      assert.equal(login.status, 200);
      assert.match(login.headers['set-cookie'][0], /HttpOnly; SameSite=Strict/);
      cookie = login.headers['set-cookie'][0].split(';')[0];
    });
    await test('Admin sees requests submitted by a separate unauthenticated client', async () => {
      const response = await send('/api/admin/requests', 'GET', undefined, { Cookie: cookie });
      assert.equal(response.status, 200);
      assert.equal(response.data.requests.length, 4);
      assert.ok(response.data.requests.some(r => r.id === orderId));
      assert.ok(response.data.requests.every(r => !('tokenHash' in r) && !('payloadHash' in r)));
      assert.equal(response.headers['cache-control'], 'no-store');
    });
    await test('Status updates persist and stale admin edits cannot overwrite newer changes', async () => {
      const route = '/api/admin/requests/' + contactId;
      const changed = await send(route, 'PATCH', { status: 'processing', revision: 1 }, { Cookie: cookie });
      assert.equal(changed.status, 200); assert.equal(changed.data.revision, 2);
      assert.equal((await send(route, 'PATCH', { status: 'completed', revision: 1 }, { Cookie: cookie })).status, 409);
      assert.equal((await send(route, 'PATCH', { status: 'unknown', revision: 2 }, { Cookie: cookie })).status, 400);
      assert.equal(JSON.parse(await fs.readFile(path.join(dataDir, 'requests.json'), 'utf8')).find(r => r.id === contactId).status, 'processing');
    });
    await test('Logout revokes the session and stops private data access', async () => {
      assert.equal((await send('/api/admin/logout', 'POST', {}, { Cookie: cookie })).status, 200);
      assert.equal((await send('/api/admin/requests', 'GET', undefined, { Cookie: cookie })).status, 401);
    });
    await test('Inbox data survives server restart while sessions expire', async () => {
      await stop(); await start();
      assert.equal((await send('/api/admin/requests', 'GET', undefined, { Cookie: cookie })).status, 401);
      const login = await send('/api/admin/login', 'POST', { username: 'test-admin', password });
      const freshCookie = login.headers['set-cookie'][0].split(';')[0];
      const inbox = await send('/api/admin/requests', 'GET', undefined, { Cookie: freshCookie });
      assert.equal(inbox.data.requests.length, 4);
      assert.equal(inbox.data.requests.find(r => r.id === contactId).status, 'processing');
    });
    await test('Failed persistence never returns success', async () => {
      await stop();
      const failingDir = path.join(dataDir, 'write-failure');
      server = await createApp({ ...options, dataDir: failingDir });
      await fs.mkdir(path.join(failingDir, 'requests.json'));
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); port = server.address().port;
      assert.equal((await submit(contact)).status, 503);
    });
    console.log(`${passed} API checks passed.`);
    return passed;
  } finally {
    if (server?.listening) await stop();
    const resolved = path.resolve(dataDir);
    assert.equal(path.dirname(resolved), tempRoot);
    assert.ok(path.basename(resolved).startsWith('macca-request-test-'));
    await fs.rm(resolved, { recursive: true, force: true });
  }
}
if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = run;
