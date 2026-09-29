const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));
function fixture(initial = false) {
  const nodes = new Map(), events = {}, calls = [], writes = [];
  const state = { authenticated: initial, logoutFails: false };
  function node(key) {
    if (!nodes.has(key)) nodes.set(key, {
      hidden: false, inert: false, disabled: false, textContent: '', value: '', innerHTML: '', listeners: {},
      addEventListener(name, fn) { this.listeners[name] = fn; }, focus() {}, reset() {}, close() {},
      replaceChildren() { this.innerHTML = ''; },
      elements: { namedItem: name => node(key + ':' + name) },
      querySelector: selector => node(key + ':' + selector),
    });
    return nodes.get(key);
  }
  node('#admin-workspace').hidden = true;
  node('#admin-workspace').inert = true;
  node('#admin-login-form').hidden = true;
  node('#inbox-type').value = 'all'; node('#inbox-status').value = 'all';
  const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
  const context = vm.createContext({
    window: { addEventListener: (name, fn) => { events[name] = fn; } },
    document: { hidden: false, querySelector: node, querySelectorAll: () => [], addEventListener() {} },
    location: { hash: '#products' },
    crypto: { randomUUID: () => 'test-event-token' },
    localStorage: { setItem: (key, value) => writes.push([key, value]) },
    setInterval() {},
    Macca: { money: value => String(value) },
    MaccaRequests: { request: async (url, options) => {
      calls.push(url);
      if (url.endsWith('/login')) {
        const body = JSON.parse(options.body);
        if (body.password !== 'correct-password') return fail(401, 'Sai mật khẩu');
        state.authenticated = true; return { username: 'admin' };
      }
      if (url.endsWith('/logout')) {
        if (state.logoutFails) return fail(503, 'Máy chủ chưa phản hồi');
        state.authenticated = false; return { ok: true };
      }
      if (!state.authenticated) return fail(401, 'Chưa đăng nhập');
      return url.endsWith('/session') ? { username: 'admin' } : { requests: [] };
    } },
  });
  vm.runInContext(read('admin-auth.js'), context);
  context.MaccaAdminAuth = context.window.MaccaAdminAuth;
  vm.runInContext(read('admin-inbox.js'), context);
  const login = async (password = 'correct-password') => {
    const form = node('#admin-login-form');
    form.elements.namedItem('username').value = 'admin';
    form.elements.namedItem('password').value = password;
    await form.listeners.submit({ preventDefault() {}, currentTarget: form });
    await flush();
  };
  return { node, state, context, events, calls, writes, login, auth: context.MaccaAdminAuth };
}
async function run() {
  let passed = 0;
  async function test(name, fn) { await fn(); passed++; console.log('PASS', name); }
  await test('Every admin section starts hidden until session verification completes', async () => {
    const f = fixture();
    assert.equal(f.node('#admin-workspace').hidden, true);
    await flush();
    assert.equal(f.node('#admin-workspace').inert, true);
    assert.equal(f.node('#admin-login-form').hidden, false);
    assert.equal(f.calls.filter(url => url.endsWith('/requests')).length, 0);
  });
  await test('Incorrect login never exposes the workspace', async () => {
    const f = fixture(); await flush(); await f.login('wrong');
    assert.equal(f.node('#admin-workspace').hidden, true);
    assert.match(f.node('#admin-login-error').textContent, /Sai mật khẩu/);
  });
  await test('One login unlocks all sections and inbox without another login', async () => {
    const f = fixture(); await flush(); await f.login();
    assert.equal(f.node('#admin-workspace').hidden, false);
    assert.equal(f.node('#admin-workspace').inert, false);
    assert.equal(f.node('#admin-login-screen').hidden, true);
    assert.equal(f.node('#inbox-workspace').hidden, false);
    assert.equal(f.context.location.hash, '#products');
    assert.equal(f.node('#admin-username').textContent, 'admin');
    assert.equal(f.node('#admin-login-form:password').value, '');
    f.context.location.hash = '#inbox'; f.events.hashchange(); await flush();
    assert.equal(f.calls.filter(url => url.endsWith('/login')).length, 1);
    assert.ok(!JSON.stringify(f.writes).includes('correct-password'));
  });
  await test('Existing server sessions restore on reload without login', async () => {
    const f = fixture(true); await flush();
    assert.equal(f.node('#admin-workspace').hidden, false);
    assert.equal(f.calls.filter(url => url.endsWith('/login')).length, 0);
    assert.equal(f.node('#inbox-workspace').hidden, false);
  });
  await test('401 from any admin request locks the whole workspace', async () => {
    const f = fixture(true); await flush(); f.state.authenticated = false;
    await assert.rejects(() => f.auth.request('/api/admin/requests'));
    assert.equal(f.node('#admin-workspace').hidden, true);
    assert.equal(f.node('#inbox-workspace').hidden, true);
    assert.equal(f.node('#inbox-rows').innerHTML, '');
    assert.match(f.node('#admin-login-error').textContent, /hết hạn/);
  });
  await test('Logout waits for confirmation; successful logout locks all sections', async () => {
    const f = fixture(true); await flush(); f.state.logoutFails = true;
    await f.node('#admin-logout').listeners.click();
    assert.equal(f.node('#admin-workspace').hidden, false);
    assert.equal(f.node('#admin-session-error').hidden, false);
    f.state.logoutFails = false; await f.node('#admin-logout').listeners.click();
    assert.equal(f.node('#admin-workspace').hidden, true);
    assert.equal(f.auth.isAuthenticated(), false);
    assert.ok(f.writes.some(([, data]) => JSON.parse(data).action === 'logout'));
  });
  await test('Logout in another tab and expired background sessions lock the page', async () => {
    const f = fixture(true); await flush();
    f.events.storage({ key: 'macca-admin-auth-event', newValue: JSON.stringify({ action: 'logout' }) });
    assert.equal(f.node('#admin-workspace').hidden, true);
    await f.login(); f.state.authenticated = false; await f.auth.check();
    assert.equal(f.node('#admin-workspace').hidden, true);
  });
  await test('Only one login form exists and all auth selectors resolve', async () => {
    const html = read('admin.html');
    assert.ok(html.includes('id="admin-workspace" hidden inert'));
    assert.ok(!html.includes('id="inbox-login-form"'));
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(ids.length, new Set(ids).size);
    for (const file of ['admin-auth.js', 'admin-inbox.js']) {
      for (const [, id] of read(file).matchAll(/\$\('#([\w-]+)'\)/g)) assert.ok(ids.includes(id), id);
    }
  });
  return passed;
}
if (require.main === module) run().then(count => console.log(`${count} auth checks passed.`)).catch(error => { console.error(error); process.exitCode = 1; });
module.exports = run;
