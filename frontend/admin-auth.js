'use strict';
window.MaccaAdminAuth = (() => {
  const $ = selector => document.querySelector(selector);
  const listeners = new Set();
  let user = null, checking = false, version = 0;
  const form = $('#admin-login-form');
  function change(next, message = '', focus = false) {
    user = next;
    $('#admin-workspace').hidden = !user;
    $('#admin-workspace').inert = !user;
    $('#admin-login-screen').hidden = !!user;
    $('#admin-login-loading').hidden = true;
    form.hidden = false;
    $('#admin-login-error').textContent = message;
    $('#admin-username').textContent = user?.username || '';
    $('#admin-session-error').hidden = true;
    if (!user) {
      document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
      document.querySelectorAll('#admin-workspace form').forEach(item => item.reset());
    }
    for (const listener of listeners) listener(user);
    if (focus) (user ? $('#admin-main') : form.elements.namedItem('username')).focus();
  }
  function expire(message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.') {
    version++;
    change(null, message, true);
  }
  async function request(path, options) {
    const current = version;
    try { return await MaccaRequests.request(path, options); }
    catch (error) { if (error.status === 401 && current === version) expire(); throw error; }
  }
  function broadcast(action) {
    try { localStorage.setItem('macca-admin-auth-event', JSON.stringify({ action, nonce: crypto.randomUUID() })); } catch {}
  }
  async function check() {
    if (checking) return;
    checking = true;
    const current = version;
    try {
      const data = await MaccaRequests.request('/api/admin/session');
      if (current === version && (!user || user.username !== data.username)) change(data);
    } catch (error) {
      if (current === version) change(null, error.status === 401 ? (user ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : '') : error.message);
    } finally { checking = false; }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('[type="submit"]');
    if (button.disabled) return;
    button.disabled = true;
    button.textContent = 'Đang đăng nhập…';
    $('#admin-login-error').textContent = '';
    const current = ++version;
    try {
      const data = await MaccaRequests.request('/api/admin/login', { method: 'POST', body: JSON.stringify({ username: form.elements.namedItem('username').value.trim(), password: form.elements.namedItem('password').value }) });
      form.elements.namedItem('password').value = '';
      if (current === version) { change(data, '', true); broadcast('login'); }
    } catch (error) { if (current === version) change(null, error.message); }
    finally { button.disabled = false; button.textContent = 'Đăng nhập'; }
  });
  $('#admin-logout').addEventListener('click', async () => {
    const button = $('#admin-logout');
    if (button.disabled) return;
    button.disabled = true;
    version++;
    try {
      await MaccaRequests.request('/api/admin/logout', { method: 'POST', body: '{}' });
      change(null, '', true); broadcast('logout');
    } catch (error) {
      if (error.status === 401) { change(null, '', true); broadcast('logout'); }
      else { $('#admin-session-error').hidden = false; $('#admin-session-error').textContent = error.message; }
    } finally { button.disabled = false; }
  });
  window.addEventListener('storage', event => {
    if (event.key !== 'macca-admin-auth-event') return;
    try {
      const action = JSON.parse(event.newValue)?.action;
      if (action === 'logout') expire('Bạn đã đăng xuất ở tab khác.');
      else if (action === 'login') check();
    } catch {}
  });
  window.addEventListener('pageshow', event => { if (event.persisted) { version++; change(null); check(); } });
  window.addEventListener('focus', check);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  setInterval(() => { if (user && !document.hidden) check(); }, 60000);
  check();
  return { request, check, isAuthenticated: () => !!user, subscribe(listener) { listeners.add(listener); listener(user); return () => listeners.delete(listener); } };
})();
