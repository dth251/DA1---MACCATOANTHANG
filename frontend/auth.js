'use strict';
(() => {
  const dialog = document.getElementById('auth-dialog');
  const form = document.getElementById('auth-form');
  const password = document.getElementById('auth-password');
  const confirm = document.getElementById('auth-confirm');
  const status = document.getElementById('auth-status');
  let registering = false;

  document.querySelectorAll('[data-auth]').forEach(button => {
    button.addEventListener('click', () => {
      registering = button.dataset.auth === 'register';
      form.reset();
      confirm.setCustomValidity('');
      status.hidden = true;
      const title = registering ? 'Đăng ký' : 'Đăng nhập';
      document.getElementById('auth-title').textContent = title;
      form.querySelector('.auth-submit').textContent = title;
      for (const field of ['name', 'confirm']) {
        document.getElementById(`auth-${field}-field`).hidden = !registering;
        const input = document.getElementById(`auth-${field}`);
        input.disabled = !registering;
        input.required = registering;
      }
      password.autocomplete = registering ? 'new-password' : 'current-password';
      if (registering) password.minLength = 8;
      else password.removeAttribute('minlength');
      password.placeholder = registering ? 'Ít nhất 8 ký tự' : '';
      document.getElementById('auth-switch-label').textContent = registering ? 'Bạn đã có tài khoản?' : 'Bạn chưa có tài khoản?';
      const switchButton = document.getElementById('auth-switch');
      switchButton.dataset.auth = registering ? 'login' : 'register';
      switchButton.textContent = registering ? 'Đăng nhập ngay' : 'Đăng ký ngay';
      if (!dialog.open) dialog.showModal();
      document.getElementById(registering ? 'auth-name' : 'auth-email').focus();
    });
  });

  function validateConfirmation() {
    confirm.setCustomValidity(registering && confirm.value !== password.value ? 'Mật khẩu nhập lại chưa khớp.' : '');
  }
  password.addEventListener('input', validateConfirmation);
  confirm.addEventListener('input', validateConfirmation);
  form.addEventListener('submit', event => {
    event.preventDefault();
    validateConfirmation();
    if (!form.reportValidity()) return;
    status.textContent = 'Chức năng tài khoản chưa được kích hoạt. Vui lòng quay lại sau.';
    status.hidden = false;
  });
  dialog.addEventListener('close', () => {
    form.reset();
    confirm.setCustomValidity('');
    status.hidden = true;
  });
})();
