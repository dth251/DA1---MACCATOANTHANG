const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'request-api.js'), 'utf8');
async function run() {
  const storage = new Map(), calls = [];
  let fail = true;
  const context = vm.createContext({ window: {}, crypto: crypto.webcrypto, TextEncoder, AbortController, setTimeout, clearTimeout,
    sessionStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    fetch: async (url, options) => { calls.push(options); if (fail) throw new Error('Network interrupted'); return { ok: true, status: 201, json: async () => ({ id: 'YC-ACCEPTED', createdAt: '2026-09-29T00:00:00Z' }) }; },
  });
  vm.runInContext(source, context);
  const button = { textContent: 'Gửi lời nhắn', disabled: false };
  const form = { querySelector: () => button };
  const payload = { type: 'contact', customer: { name: 'Private customer', email: 'private@example.com' }, message: 'Private message' };
  let send = context.window.MaccaRequests.sender('contact');
  await assert.rejects(() => send(form, payload));
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, 'Gửi lời nhắn');
  assert.ok(!JSON.stringify([...storage.values()]).includes('Private'));
  const firstToken = calls[0].headers['Idempotency-Key'];
  // Simulate navigation/reload: new sender, same sessionStorage, identical form values.
  send = context.window.MaccaRequests.sender('contact');
  fail = false;
  await send(form, payload);
  assert.equal(calls[1].headers['Idempotency-Key'], firstToken);
  assert.equal(storage.size, 0);
  await send(form, payload);
  assert.notEqual(calls[2].headers['Idempotency-Key'], firstToken);
  fail = true;
  await assert.rejects(() => send(form, payload));
  const retryToken = calls[3].headers['Idempotency-Key'];
  await assert.rejects(() => send(form, { ...payload, message: 'Changed request content' }));
  assert.notEqual(calls[4].headers['Idempotency-Key'], retryToken);
  console.log('PASS client retries, reload recovery, new requests, changed payloads and no stored personal data');
  return 1;
}
if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = run;
