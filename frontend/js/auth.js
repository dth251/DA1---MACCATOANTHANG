'use strict';
(() => {
  function ensureAuthDialog() {
    let dialog = document.getElementById('auth-dialog');
    if (!dialog) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = `
        <dialog id="auth-dialog" aria-labelledby="auth-title" aria-describedby="auth-description">
          <div class="dialog-header">
            <span>MACCA TOÀN THẮNG</span>
            <button class="icon-button" type="button" data-close aria-label="Đóng">✕</button>
          </div>
          <h2 id="auth-title">Đăng nhập</h2>
          <p id="auth-description">Chào mừng bạn đến với Macca Toàn Thắng.</p>
          <form id="auth-form">
            <div id="auth-name-field" hidden><label for="auth-name">Họ và tên</label><input id="auth-name" name="name" autocomplete="name" maxlength="100" disabled></div>
            <div id="auth-phone-field" hidden><label for="auth-phone">Số điện thoại (10 số)</label><input id="auth-phone" name="phone" type="tel" pattern="0[0-9]{9}" placeholder="0912345678" maxlength="15" disabled></div>
            <div><label for="auth-email" id="auth-account-label">Email / Số điện thoại</label><input id="auth-email" name="email" autocomplete="username" required maxlength="254" placeholder="Email hoặc số điện thoại"></div>
            <div><label for="auth-password">Mật khẩu</label><input id="auth-password" name="password" type="password" autocomplete="current-password" required></div>
            <div id="auth-confirm-field" hidden><label for="auth-confirm">Nhập lại mật khẩu</label><input id="auth-confirm" name="confirm-password" type="password" autocomplete="new-password" disabled></div>
            <p class="auth-notice">Đăng nhập tài khoản để theo dõi trạng thái đơn hàng và nhận phản hồi tư vấn nhanh nhất.</p>
            <p id="auth-status" role="status" hidden></p>
            <button class="button auth-submit" type="submit">Đăng nhập</button>
          </form>
          <p class="auth-switch"><span id="auth-switch-label">Bạn chưa có tài khoản?</span> <button type="button" id="auth-switch" data-auth="register">Đăng ký ngay</button></p>
        </dialog>
      `;
      dialog = wrapper.firstElementChild;
      document.body.appendChild(dialog);
    }
    return dialog;
  }

  function showToast(message) {
    let toastEl = document.getElementById('toast');
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.id = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.add('visible');
    setTimeout(() => toastEl.classList.remove('visible'), 3500);
  }

  let registering = false;

  function updateHeaderAuth() {
    let headerAuth = document.querySelector('.header-auth');
    if (!headerAuth) {
      let headerActions = document.querySelector('.header-actions');
      if (!headerActions) {
        const header = document.querySelector('.header');
        if (header) {
          const cartBtn = header.querySelector('.cart-button');
          headerActions = document.createElement('div');
          headerActions.className = 'header-actions';
          if (cartBtn) {
            cartBtn.parentNode.insertBefore(headerActions, cartBtn);
            headerActions.appendChild(cartBtn);
          } else {
            header.appendChild(headerActions);
          }
        }
      }
      if (headerActions) {
        headerAuth = document.createElement('div');
        headerAuth.className = 'header-auth';
        headerAuth.setAttribute('aria-label', 'Tài khoản');
        headerActions.appendChild(headerAuth);
      }
    }
    if (!headerAuth) return;

    const session = window.MaccaApi?.getSession();
    const user = session?.user;

    if (user && (session?.accessToken || session?.token)) {
      const displayName = user.name || user.fullName || user.username || 'Khách hàng';
      const role = (session?.role || user?.role || '').toUpperCase();
      const isAdmin = role === 'ADMIN' || user?.username?.toLowerCase() === 'admin';

      headerAuth.innerHTML = `
        <div class="header-user-menu">
          <span class="header-user-greeting" title="${escapeHtml(displayName)}">Chào, <strong>${escapeHtml(displayName)}</strong></span>
          ${isAdmin
            ? `<a href="admin.html" class="header-user-btn">Dashboard</a>`
            : `<a href="tai-khoan.html" class="header-user-btn">Tài khoản</a>`
          }
          <button class="header-logout-btn" type="button" aria-label="Đăng xuất">Đăng xuất</button>
        </div>
      `;

      headerAuth.querySelector('.header-logout-btn')?.addEventListener('click', async () => {
        if (window.MaccaApi?.request) {
          try { await window.MaccaApi.request('/api/auth/logout', { method: 'POST', auth: true }); } catch {}
        }
        window.MaccaApi?.setSession(null);
        showToast('Đã đăng xuất thành công.');
        updateHeaderAuth();
        if (window.location.pathname.endsWith('tai-khoan.html') || window.location.pathname.endsWith('admin.html')) {
          window.location.href = 'index.html';
        }
      });
    } else {
      headerAuth.innerHTML = `
        <button class="auth-login" type="button" data-auth="login" aria-haspopup="dialog" aria-controls="auth-dialog">Đăng nhập</button>
        <button class="auth-register" type="button" data-auth="register" aria-haspopup="dialog" aria-controls="auth-dialog">Đăng ký</button>
      `;
      attachAuthButtons();
    }
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function setupDialogEvents() {
    const dialog = ensureAuthDialog();
    const form = document.getElementById('auth-form');
    const password = document.getElementById('auth-password');
    const confirm = document.getElementById('auth-confirm');
    const status = document.getElementById('auth-status');
    const phoneField = document.getElementById('auth-phone-field');
    const phoneInput = document.getElementById('auth-phone');
    const accountInput = document.getElementById('auth-email');
    const accountLabel = document.getElementById('auth-account-label');
    const submitButton = form?.querySelector('.auth-submit');

    dialog.querySelectorAll('[data-close]').forEach(btn => {
      btn.onclick = () => dialog.close();
    });

    dialog.addEventListener('close', () => {
      form?.reset();
      if (confirm) confirm.setCustomValidity('');
      if (status) status.hidden = true;
    });

    function validateConfirmation() {
      if (confirm && password) {
        confirm.setCustomValidity(registering && confirm.value !== password.value ? 'Mật khẩu nhập lại chưa khớp.' : '');
      }
    }

    if (password && confirm) {
      password.oninput = validateConfirmation;
      confirm.oninput = validateConfirmation;
    }

    if (form) {
      form.onsubmit = async event => {
        event.preventDefault();
        validateConfirmation();
        if (!form.reportValidity()) return;

        if (status) status.hidden = true;
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = 'Đang xử lý…';
        }

        try {
          if (registering) {
            let rawPhone = (phoneInput?.value || '').replace(/\D/g, '');
            if (rawPhone.startsWith('84')) rawPhone = '0' + rawPhone.slice(2);
            if (!rawPhone.startsWith('0') && rawPhone.length === 9) rawPhone = '0' + rawPhone;

            const body = {
              name: document.getElementById('auth-name')?.value?.trim() || 'Khách hàng',
              phone: rawPhone,
              email: accountInput?.value?.trim() || null,
              password: password.value
            };

            if (window.MaccaApi?.request) {
              const res = await window.MaccaApi.request('/api/auth/register', {
                method: 'POST',
                body
              });

              window.MaccaApi.setSession({
                accessToken: res?.accessToken || res?.token,
                refreshToken: res?.refreshToken,
                role: res?.role || 'CUSTOMER',
                user: res?.user || { name: body.name, phone: body.phone, email: body.email }
              });
            }

            dialog.close();
            updateHeaderAuth();
            showToast('Đăng ký tài khoản thành công!');
          } else {
            const account = accountInput.value.trim();
            let phoneParam = null, usernameParam = null;
            if (/^[0-9+ ]{9,15}$/.test(account)) {
              let p = account.replace(/\D/g, '');
              if (p.startsWith('84')) p = '0' + p.slice(2);
              if (!p.startsWith('0') && p.length === 9) p = '0' + p;
              phoneParam = p;
            } else {
              usernameParam = account;
            }

            const body = {
              username: usernameParam || phoneParam,
              phone: phoneParam,
              password: password.value
            };

            if (window.MaccaApi?.request) {
              const res = await window.MaccaApi.request('/api/auth/login', {
                method: 'POST',
                body
              });

              const rawRole = (res?.role || res?.user?.role || '').toUpperCase();
              const isAdmin = rawRole === 'ADMIN' || account.toLowerCase() === 'admin';
              const userRole = isAdmin ? 'ADMIN' : (rawRole || 'CUSTOMER');
              const userData = res?.user || { username: account, role: userRole };

              window.MaccaApi.setSession({
                accessToken: res?.accessToken || res?.token,
                refreshToken: res?.refreshToken,
                role: userRole,
                user: userData
              });

              dialog.close();
              updateHeaderAuth();

              if (isAdmin) {
                showToast('Đăng nhập Quản trị thành công! Đang chuyển đến Dashboard...');
                setTimeout(() => {
                  window.location.href = 'admin.html';
                }, 600);
              } else {
                showToast('Đăng nhập thành công!');
              }
            }
          }
        } catch (err) {
          if (status) {
            status.textContent = err.message || 'Thao tác không thành công. Vui lòng thử lại.';
            status.hidden = false;
          }
        } finally {
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = registering ? 'Đăng ký' : 'Đăng nhập';
          }
        }
      };
    }
  }

  function attachAuthButtons() {
    setupDialogEvents();
    const dialog = ensureAuthDialog();
    const form = document.getElementById('auth-form');
    const password = document.getElementById('auth-password');
    const confirm = document.getElementById('auth-confirm');
    const status = document.getElementById('auth-status');
    const phoneField = document.getElementById('auth-phone-field');
    const phoneInput = document.getElementById('auth-phone');
    const accountInput = document.getElementById('auth-email');
    const accountLabel = document.getElementById('auth-account-label');
    const submitButton = form?.querySelector('.auth-submit');

    document.querySelectorAll('[data-auth]').forEach(button => {
      button.onclick = () => {
        registering = button.dataset.auth === 'register';
        form?.reset();
        if (confirm) confirm.setCustomValidity('');
        if (status) status.hidden = true;

        const title = registering ? 'Đăng ký' : 'Đăng nhập';
        const titleEl = document.getElementById('auth-title');
        if (titleEl) titleEl.textContent = title;
        if (submitButton) submitButton.textContent = title;

        for (const field of ['name', 'confirm']) {
          const wrapper = document.getElementById(`auth-${field}-field`);
          const input = document.getElementById(`auth-${field}`);
          if (wrapper) wrapper.hidden = !registering;
          if (input) {
            input.disabled = !registering;
            input.required = registering;
          }
        }

        if (phoneField && phoneInput) {
          phoneField.hidden = !registering;
          phoneInput.disabled = !registering;
          phoneInput.required = registering;
        }

        if (accountLabel) {
          accountLabel.textContent = registering ? 'Email (tùy chọn)' : 'Email / Số điện thoại';
        }
        if (accountInput) {
          accountInput.required = !registering;
          accountInput.placeholder = registering ? 'ví dụ: ban@gmail.com' : 'Email hoặc số điện thoại';
        }

        if (password) {
          password.autocomplete = registering ? 'new-password' : 'current-password';
          if (registering) password.minLength = 6;
          else password.removeAttribute('minlength');
          password.placeholder = registering ? 'Từ 6 ký tự trở lên' : '';
        }

        const switchLabel = document.getElementById('auth-switch-label');
        if (switchLabel) switchLabel.textContent = registering ? 'Bạn đã có tài khoản?' : 'Bạn chưa có tài khoản?';
        const switchButton = document.getElementById('auth-switch');
        if (switchButton) {
          switchButton.dataset.auth = registering ? 'login' : 'register';
          switchButton.textContent = registering ? 'Đăng nhập ngay' : 'Đăng ký ngay';
        }

        if (!dialog.open) dialog.showModal();
        document.getElementById(registering ? 'auth-name' : 'auth-email')?.focus();
      };
    });
  }

  // Khởi động khi trang sẵn sàng
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      updateHeaderAuth();
    });
  } else {
    updateHeaderAuth();
  }
})();
