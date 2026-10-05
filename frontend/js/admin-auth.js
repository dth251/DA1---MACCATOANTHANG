'use strict';
window.MaccaAdminAuth = (() => {
  const $ = selector => document.querySelector(selector);
  const listeners = new Set();
  let user = null;
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
    if (usernameEl) usernameEl.textContent = user?.username || user?.name || '';
    if (sessionError) sessionError.hidden = true;

    for (const listener of listeners) {
      try { listener(user); } catch (e) { console.error(e); }
    }
    if (focus) {
      if (user) document.querySelector('#admin-main')?.focus();
      else form?.elements?.namedItem('username')?.focus();
    }
  }

  async function check() {
    const session = window.MaccaApi?.getSession();
    if (!session?.accessToken && !session?.token) {
      change(null);
      return;
    }

    const currentRole = (session?.role || session?.user?.role || '').toUpperCase();
    if (currentRole === 'USER' || currentRole === 'CUSTOMER') {
      const errorEl = document.querySelector('#admin-login-error');
      if (errorEl) {
        errorEl.textContent = 'Tài khoản thành viên không có quyền quản trị. Đang chuyển về trang chủ...';
      }
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 700);
      return;
    }

    if (window.MaccaApi?.request) {
      try {
        const res = await window.MaccaApi.request('/api/auth/session', { auth: true });
        const loggedUser = res?.user || session.user || { username: 'admin' };
        change(loggedUser);
        if (window.MaccaAdmin?.syncBackend) {
          window.MaccaAdmin.syncBackend();
        }
        if (window.refreshMaccaInbox) {
          window.refreshMaccaInbox();
        }
        return;
      } catch (err) {
        console.warn('Phiên đăng nhập admin hết hạn hoặc máy chủ chưa phản hồi:', err.message);
        if (err.status === 401 || err.status === 403) {
          window.MaccaApi.setSession(null);
          change(null);
          return;
        }
        if (session.user) {
          change(session.user);
          return;
        }
      }
    }
    change(session?.user || null);
  }

  async function login(username, password) {
    const errorEl = document.querySelector('#admin-login-error');
    if (errorEl) {
      errorEl.style.color = '';
      errorEl.textContent = '';
    }
    const submitBtn = form?.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Đang đăng nhập…'; }

    try {
      if (window.MaccaApi?.request) {
        try {
          const res = await window.MaccaApi.request('/api/auth/login', {
            method: 'POST',
            body: { username, password }
          });

          const rawRole = (res?.role || res?.user?.role || '').toUpperCase();
          const isAdmin = rawRole === 'ADMIN' || username.toLowerCase() === 'admin';
          const userObj = res?.user || { username, role: isAdmin ? 'ADMIN' : (rawRole || 'USER') };

          if (!isAdmin) {
            // Nếu là tài khoản USER đăng nhập: lưu session và chuyển về trang index chính
            window.MaccaApi.setSession({
              accessToken: res.accessToken || res.token,
              refreshToken: res.refreshToken,
              role: rawRole || 'USER',
              user: userObj
            });
            if (errorEl) {
              errorEl.style.color = 'var(--green, #2e5939)';
              errorEl.textContent = 'Đăng nhập thành công! Đang chuyển hướng về trang chủ...';
            }
            setTimeout(() => {
              window.location.href = 'index.html';
            }, 600);
            return;
          }

          window.MaccaApi.setSession({
            accessToken: res.accessToken || res.token,
            refreshToken: res.refreshToken,
            role: 'ADMIN',
            user: userObj
          });
          change(userObj, '', true);
          if (window.MaccaAdmin?.syncBackend) {
            window.MaccaAdmin.syncBackend();
          }
          if (window.refreshMaccaInbox) {
            window.refreshMaccaInbox();
          }
          return;
        } catch (err) {
          if (err.status === 401 || err.status === 400 || err.status === 403) {
            throw err;
          }
          console.warn('Không kết nối được backend khi đăng nhập admin, dùng fallback demo:', err.message);
          if (username) {
            const fallbackUser = { username, role: 'ADMIN' };
            window.MaccaApi.setSession({
              accessToken: 'offline-admin-token',
              role: 'ADMIN',
              user: fallbackUser
            });
            change(fallbackUser, '', true);
            return;
          }
        }
      }
      change({ username }, '', true);
    } catch (err) {
      if (errorEl) errorEl.textContent = err.message || 'Tên đăng nhập hoặc mật khẩu không chính xác.';
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Đăng nhập'; }
    }
  }

  async function logout() {
    if (window.MaccaApi?.request) {
      try {
        await window.MaccaApi.request('/api/auth/logout', { method: 'POST', auth: true });
      } catch {}
    }
    window.MaccaApi?.setSession(null);
    change(null, '', true);
  }

  if (form) {
    form.addEventListener('submit', event => {
      event.preventDefault();
      const usernameInput = form.elements?.namedItem('username')?.value?.trim() || '';
      const passwordInput = form.elements?.namedItem('password')?.value || '';
      login(usernameInput, passwordInput);
    });
  }

  const logoutBtn = document.querySelector('#admin-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      logout();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => check());
  } else {
    check();
  }

  return {
    check,
    login,
    logout,
    isAuthenticated: () => !!user,
    subscribe(listener) {
      listeners.add(listener);
      listener(user);
      return () => listeners.delete(listener);
    }
  };
})();
