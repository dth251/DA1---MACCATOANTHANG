'use strict';
window.MaccaAdminAuth = (() => {
  const $ = selector => document.querySelector(selector);
  const listeners = new Set();
  let user = { username: 'Admin Quản Trị' };
  const form = document.querySelector('#admin-login-form');

  function change(next, message = '', focus = false) {
    user = next;
    const workspace = document.querySelector('#admin-workspace');
    const loginScreen = document.querySelector('#admin-login-screen');
    const loginLoading = document.querySelector('#admin-login-loading');
    const errorEl = document.querySelector('#admin-login-error');
    const usernameEl = document.querySelector('#admin-username');
    const sessionError = document.querySelector('#admin-session-error');

    if (workspace) {
      workspace.hidden = !user;
      if (user) {
        workspace.removeAttribute('inert');
      } else {
        workspace.setAttribute('inert', '');
      }
    }
    if (loginScreen) loginScreen.hidden = !!user;
    if (loginLoading) loginLoading.hidden = true;
    if (form) form.hidden = false;
    if (errorEl) errorEl.textContent = message;
    if (usernameEl) usernameEl.textContent = user?.username || '';
    if (sessionError) sessionError.hidden = true;

    for (const listener of listeners) {
      try { listener(user); } catch (e) { console.error(e); }
    }
    if (focus) {
      if (user) document.querySelector('#admin-main')?.focus();
      else form?.elements?.namedItem('username')?.focus();
    }
  }

  async function request(path, options = {}) {
    return { ok: true };
  }

  function check() {
    change(user);
  }

  if (form) {
    form.addEventListener('submit', event => {
      event.preventDefault();
      const usernameInput = form.elements?.namedItem('username')?.value?.trim() || 'Admin Quản Trị';
      change({ username: usernameInput }, '', true);
    });
  }

  const logoutBtn = document.querySelector('#admin-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      change(null, '', true);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => change(user));
  } else {
    change(user);
  }

  return {
    request,
    check,
    isAuthenticated: () => !!user,
    subscribe(listener) {
      listeners.add(listener);
      listener(user);
      return () => listeners.delete(listener);
    }
  };
})();
