'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const session = window.MaccaApi?.getSession();
  if (!session?.accessToken && !session?.token) {
    alert('Vui lòng đăng nhập để xem thông tin tài khoản!');
    window.location.href = 'index.html';
    return;
  }

  // Sidebar Tab navigation
  const navButtons = document.querySelectorAll('.account-nav-btn');
  const sections = {
    'profile-sec': document.getElementById('profile-sec'),
    'password-sec': document.getElementById('password-sec'),
    'orders-sec': document.getElementById('orders-sec')
  };

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.section;
      Object.keys(sections).forEach(sec => {
        if (sections[sec]) sections[sec].hidden = (sec !== target);
      });
      if (target === 'orders-sec') {
        loadUserOrders();
      }
    });
  });

  // 1. Load user profile
  async function loadProfile() {
    try {
      const res = await window.MaccaApi.request('/api/user/profile', { auth: true });
      const user = res?.data || res;
      if (user) {
        document.getElementById('acc-name').value = user.name || '';
        document.getElementById('acc-phone').value = user.phone || user.username || '';
        document.getElementById('acc-email').value = user.email || '';
        document.getElementById('acc-address').value = user.address || '';
        document.getElementById('welcome-name').textContent = 'Chào, ' + (user.name || 'bạn');
      }
    } catch (err) {
      console.warn('Không tải được profile:', err.message);
      const user = session?.user;
      if (user) {
        document.getElementById('acc-name').value = user.name || '';
        document.getElementById('acc-phone').value = user.phone || user.username || '';
        document.getElementById('acc-email').value = user.email || '';
        document.getElementById('acc-address').value = user.address || '';
        document.getElementById('welcome-name').textContent = 'Chào, ' + (user.name || 'bạn');
      }
    }
  }

  // 2. Submit Profile changes
  const profileForm = document.getElementById('acc-profile-form');
  const profileAlert = document.getElementById('acc-profile-alert');
  profileForm?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!profileAlert) return;
    profileAlert.className = 'alert-box';
    profileAlert.style.display = 'none';
    const submitBtn = profileForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Đang lưu…';
    }

    const body = {
      name: document.getElementById('acc-name').value.trim(),
      email: document.getElementById('acc-email').value.trim() || null,
      address: document.getElementById('acc-address').value.trim() || null
    };

    try {
      const res = await window.MaccaApi.request('/api/user/profile', {
        method: 'PUT',
        body,
        auth: true
      });
      const updated = res?.data || res || body;
      const curSession = window.MaccaApi.getSession();
      if (curSession) {
        curSession.user = Object.assign({}, curSession.user, updated);
        window.MaccaApi.setSession(curSession);
      }
      document.getElementById('welcome-name').textContent = 'Chào, ' + updated.name;
      profileAlert.className = 'alert-box success';
      profileAlert.textContent = 'Cập nhật thông tin thành công!';
    } catch (err) {
      profileAlert.className = 'alert-box error';
      profileAlert.textContent = err.message || 'Không thể lưu thông tin. Vui lòng thử lại.';
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Lưu thông tin';
      }
    }
  });

  // 3. Submit Password Change
  const pwdForm = document.getElementById('acc-password-form');
  const pwdAlert = document.getElementById('acc-pwd-alert');
  pwdForm?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!pwdAlert) return;
    pwdAlert.className = 'alert-box';
    pwdAlert.style.display = 'none';

    const curPwd = document.getElementById('acc-cur-pwd').value;
    const newPwd = document.getElementById('acc-new-pwd').value;
    const confPwd = document.getElementById('acc-conf-pwd').value;

    if (newPwd !== confPwd) {
      pwdAlert.className = 'alert-box error';
      pwdAlert.textContent = 'Mật khẩu mới và xác nhận mật khẩu không trùng khớp!';
      return;
    }

    const submitBtn = pwdForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Đang đổi mật khẩu…';
    }

    try {
      await window.MaccaApi.request('/api/user/change-password', {
        method: 'PUT',
        body: { currentPassword: curPwd, newPassword: newPwd },
        auth: true
      });
      pwdAlert.className = 'alert-box success';
      pwdAlert.textContent = 'Đổi mật khẩu thành công!';
      pwdForm.reset();
    } catch (err) {
      pwdAlert.className = 'alert-box error';
      pwdAlert.textContent = err.message || 'Mật khẩu hiện tại không chính xác hoặc có lỗi xảy ra.';
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Cập nhật mật khẩu';
      }
    }
  });

  // 4. Load Orders & Details
  const statusLabels = {
    'PENDING': 'Chờ xác nhận',
    'CONFIRMED': 'Đã xác nhận',
    'SHIPPING': 'Đang giao hàng',
    'COMPLETED': 'Hoàn thành',
    'CANCELLED': 'Đã hủy'
  };

  let loadedOrders = [];

  function openOrderDetail(orderId) {
    const order = loadedOrders.find(o => o.id === orderId);
    if (!order) return;

    const modal = document.getElementById('order-detail-dialog');
    if (!modal) return;

    document.getElementById('modal-order-id').textContent = '#' + (order.id || '');
    const statusKey = order.status || 'PENDING';
    const statusEl = document.getElementById('modal-order-status-badge');
    if (statusEl) {
      statusEl.className = 'status-badge status-' + statusKey;
      statusEl.textContent = statusLabels[statusKey] || order.statusLabel || statusKey;
    }

    const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : 'Mới đặt';
    const dateEl = document.getElementById('modal-order-date');
    if (dateEl) dateEl.textContent = 'Thời gian đặt: ' + dateStr;

    // Recipient & shipping
    const customer = order.user || order.customer || {};
    const nameEl = document.getElementById('modal-order-name');
    if (nameEl) nameEl.textContent = customer.name || 'Khách hàng';
    const phoneEl = document.getElementById('modal-order-phone');
    if (phoneEl) phoneEl.textContent = customer.phone || '—';
    const emailEl = document.getElementById('modal-order-email');
    if (emailEl) emailEl.textContent = customer.email || 'Chưa cung cấp';
    const addrEl = document.getElementById('modal-order-address');
    if (addrEl) addrEl.textContent = customer.address || 'Tại cửa hàng / Chưa nhập';
    const shipEl = document.getElementById('modal-order-shipping');
    if (shipEl) shipEl.textContent = (order.shippingFee === 45000) ? 'Giao hàng nhanh (1-2 ngày)' : 'Giao hàng tiêu chuẩn (3-5 ngày)';

    // Note
    const noteBox = document.getElementById('modal-order-note-box');
    const noteEl = document.getElementById('modal-order-note');
    if (noteBox && noteEl) {
      if (order.note && order.note.trim()) {
        noteEl.textContent = order.note;
        noteBox.style.display = 'block';
      } else {
        noteBox.style.display = 'none';
      }
    }

    // Items
    const itemsTbody = document.getElementById('modal-order-items-tbody');
    const items = order.items || [];
    let itemsSubtotal = 0;
    if (itemsTbody) {
      itemsTbody.innerHTML = items.map(item => {
        const price = Number(item.price) || 0;
        const qty = Number(item.quantity) || 1;
        const lineTotal = price * qty;
        itemsSubtotal += lineTotal;
        return `
          <tr>
            <td><strong>${item.name || 'Sản phẩm Macca'}</strong></td>
            <td style="color: var(--muted);">${item.weight || '500g'}</td>
            <td style="text-align: right;">${price.toLocaleString('vi-VN')} ₫</td>
            <td style="text-align: center;">${qty}</td>
            <td style="text-align: right; font-weight: 600;">${lineTotal.toLocaleString('vi-VN')} ₫</td>
          </tr>
        `;
      }).join('') || '<tr><td colspan="5" style="text-align: center; color: var(--muted); padding: 16px;">Không có chi tiết sản phẩm</td></tr>';
    }

    const shippingFee = Number(order.shippingFee) || 0;
    const finalTotal = order.total ? Number(order.total) : (itemsSubtotal + shippingFee);

    const subtotalEl = document.getElementById('modal-order-subtotal');
    if (subtotalEl) subtotalEl.textContent = itemsSubtotal.toLocaleString('vi-VN') + ' ₫';
    const feeEl = document.getElementById('modal-order-shipping-fee');
    if (feeEl) feeEl.textContent = shippingFee.toLocaleString('vi-VN') + ' ₫';
    const totalEl = document.getElementById('modal-order-total');
    if (totalEl) totalEl.textContent = finalTotal.toLocaleString('vi-VN') + ' ₫';

    modal.showModal();
  }

  // Modal close listeners
  document.getElementById('modal-order-close')?.addEventListener('click', () => {
    document.getElementById('order-detail-dialog')?.close();
  });
  document.getElementById('modal-order-done')?.addEventListener('click', () => {
    document.getElementById('order-detail-dialog')?.close();
  });

  async function loadUserOrders() {
    const loading = document.getElementById('orders-loading');
    const empty = document.getElementById('orders-empty');
    const wrap = document.getElementById('orders-wrap');
    const tbody = document.getElementById('orders-tbody');

    if (loading) loading.style.display = 'block';
    if (empty) empty.style.display = 'none';
    if (wrap) wrap.style.display = 'none';

    try {
      const res = await window.MaccaApi.request('/api/user/orders?limit=50', { auth: true });
      const items = res?.data?.items || res?.items || (Array.isArray(res?.data) ? res.data : []);
      loadedOrders = items || [];
      if (loading) loading.style.display = 'none';

      if (!items || items.length === 0) {
        if (empty) empty.style.display = 'block';
        return;
      }

      if (tbody) {
        tbody.innerHTML = items.map(o => {
          const itemsSummary = (o.items || []).map(i => `${i.name} (x${i.quantity})`).join(', ') || 'Sản phẩm hạt macca';
          const total = (o.total || o.items?.reduce((s, x) => s + (x.price * x.quantity), 0) + (o.shippingFee || 0) || 0).toLocaleString('vi-VN') + ' ₫';
          const dateStr = o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : 'Mới đặt';
          const statusKey = o.status || 'PENDING';
          const label = statusLabels[statusKey] || o.statusLabel || statusKey;

          return `
            <tr>
              <td><strong>#${o.id ? o.id.slice(0, 16) : ''}</strong></td>
              <td>${dateStr}</td>
              <td style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${itemsSummary}">${itemsSummary}</td>
              <td><strong>${total}</strong></td>
              <td><span class="status-badge status-${statusKey}">${label}</span></td>
              <td style="text-align: center;">
                <button type="button" class="btn-order-view" data-id="${o.id}">Chi tiết</button>
              </td>
            </tr>
          `;
        }).join('');

        tbody.querySelectorAll('.btn-order-view').forEach(btn => {
          btn.addEventListener('click', () => openOrderDetail(btn.dataset.id));
        });
      }

      if (wrap) wrap.style.display = 'block';
    } catch (err) {
      if (loading) loading.style.display = 'none';
      if (empty) {
        empty.style.display = 'block';
        empty.textContent = 'Chưa có đơn hàng nào hoặc không thể tải danh sách.';
      }
    }
  }

  await loadProfile();
});
