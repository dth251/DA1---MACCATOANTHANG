'use strict';
(() => {
  const $ = selector => document.querySelector(selector);
  const api = MaccaAdmin;
  let state = api.getState();
  let deletingId = '', detailId = '', toastTimer;
  const money = Macca.money;
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const normalized = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const paths = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    box: '<path d="m12 3 9 5v9l-9 5-9-5V8l9-5Z M3 8l9 5 9-5 M12 13v9 M7.5 5.5l9 5v4"/>',
    bag: '<path d="M5 7h14l1 14H4L5 7Z M8 8V6a4 4 0 0 1 8 0v2"/>',
    users: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3 M16 4a3 3 0 0 1 0 6 M18 14a5 5 0 0 1 3 5v2"/>',
    book: '<path d="M12 5v16 M3 3c4-1 6 0 9 2 3-2 5-3 9-2v16c-4-1-6 0-9 2-3-2-5-3-9-2V3Z"/>',
    arrow: '<path d="M14 3h7v7 M21 3 10 14 M10 3H3v18h18v-7"/>',
    download: '<path d="M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6 M12 7h.01"/>',
    search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
    wallet: '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 8h18 M16 12h5v5h-5z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  };
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.box}</svg>`;
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
  const badge = status => `<span class="badge ${escape(status)}">${escape(api.statuses[status])}</span>`;
  const date = value => new Date(value).toLocaleDateString('vi-VN');
  const empty = (title, description, action = '', actionLabel = '') => `<div class="empty-state">${icon('bag')}<h3>${escape(title)}</h3><p>${escape(description)}</p>${action ? `<button class="button secondary" data-action="${action}">${escape(actionLabel)}</button>` : ''}</div>`;
  function toast(message) {
    $('#admin-toast').textContent = message;
    $('#admin-toast').classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('#admin-toast').classList.remove('visible'), 4000);
  }
  async function mutation(action, dialog, errorId, message) {
    try {
      if (errorId) $(errorId).textContent = '';
      const result = await action();
      state = result || api.getState();
      $(dialog).close();
      render();
      toast(message);
    } catch (error) { if (errorId) $(errorId).textContent = error.message; }
  }
  function renderOverview() {
    const completed = state.orders.filter(o => o.status === 'completed');
    const stats = [
      ['Giá trị đơn hoàn thành', money(completed.reduce((sum, o) => sum + api.total(o), 0)), `${completed.length} đơn hoàn thành · gồm phí giao`, 'wallet'],
      ['Tổng đơn hàng', state.orders.length, `${state.orders.filter(o => o.status === 'pending').length} đơn chờ xác nhận`, 'bag'],
      ['Sản phẩm', state.products.length, `${state.products.filter(p => p.active).length} sản phẩm đang kinh doanh`, 'box'],
      ['Khách hàng', api.customers(state.orders).length, 'Tổng hợp theo số điện thoại', 'users'],
    ];
    $('#stats-grid').innerHTML = stats.map(([label, value, note, glyph]) => `<article class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-icon">${icon(glyph)}</span></div><strong>${value}</strong><small>${note}</small></article>`).join('');
    $('#recent-orders').innerHTML = state.orders.length ? `<div class="table-wrap"><table><thead><tr><th>Đơn hàng</th><th>Tổng tiền</th><th>Trạng thái</th></tr></thead><tbody>${state.orders.slice(0, 4).map(o => `<tr><td><button class="text-link" data-order="${o.id}">${o.id}</button><small>${escape(o.customer.name)}</small></td><td>${money(api.total(o))}</td><td>${badge(o.status)}</td></tr>`).join('')}</tbody></table></div>` : empty('Chưa có đơn hàng', 'Tạo đơn thủ công đầu tiên để bắt đầu theo dõi.', 'new-order', '＋ Tạo đơn hàng');
    $('#category-summary').innerHTML = Object.entries(api.categories).map(([key, label]) => {
      const count = state.products.filter(p => p.category === key).length;
      return `<div class="category-row"><div class="category-label"><span>${label}</span><strong>${count}</strong></div><div class="category-track"><span style="width:${state.products.length ? count / state.products.length * 100 : 0}%"></span></div></div>`;
    }).join('');
    $('#product-preview').innerHTML = state.products.length ? state.products.slice(0, 4).map(p => {
      const isVisible = p.active !== false;
      return `<article class="preview-product"><img src="${p.image}" alt="${escape(p.name)}" width="220" height="150"><div><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;"><small>${escape(api.categories[p.category])} · ${escape(p.weight)}</small><span class="badge ${isVisible ? 'completed' : 'inactive'}" style="font-size:10px; padding:2px 6px;">${isVisible ? 'Đang hiển thị' : 'Đang ẩn'}</span></div><h3>${escape(p.name)}</h3><strong>${money(p.price)}</strong><div style="margin-top:8px; display:flex; gap:8px; align-items:center;"><button type="button" class="text-link" data-edit="${p.id}">Chỉnh sửa →</button><button type="button" class="${isVisible ? 'toggle-action' : 'toggle-action is-hidden'}" data-toggle-product="${p.id}" style="font-size:11px; padding:3px 8px; border-radius:0;">${isVisible ? 'Ẩn' : 'Hiện'}</button></div></div></article>`;
    }).join('') : empty('Chưa có sản phẩm', 'Thêm sản phẩm vào bộ sưu tập của bạn.', 'new-product', 'Thêm sản phẩm');
  }
  function renderProducts() {
    const query = normalized($('#product-search')?.value?.trim() || '');
    const category = $('#product-category')?.value || 'all';
    const statusFilter = $('#product-status-filter')?.value || 'all';
    const list = state.products.filter(p => {
      const matchQuery = normalized(p.name + ' ' + p.id).includes(query);
      if (!matchQuery) return false;
      if (category !== 'all' && p.category !== category) return false;
      if (statusFilter === 'active' && p.active === false) return false;
      if (statusFilter === 'hidden' && p.active !== false) return false;
      return true;
    });

    $('#product-rows').innerHTML = list.map(p => {
      const isVisible = p.active !== false;
      const toggleLabel = isVisible ? 'Ẩn' : 'Hiện';
      const toggleClass = isVisible ? 'toggle-action' : 'toggle-action is-hidden';
      const toggleTitle = isVisible ? 'Ẩn sản phẩm này khỏi website khách hàng' : 'Hiện lại sản phẩm này trên website khách hàng';
      return `
        <tr>
          <td>
            <div class="table-product">
              <img src="${p.image}" alt="" width="48" height="52">
              <div><strong>${escape(p.name)}</strong><small>${escape(p.weight)} · ${p.id}</small></div>
            </div>
          </td>
          <td>${escape(api.categories[p.category])}</td>
          <td><strong>${money(p.price)}</strong></td>
          <td>${p.stock === null ? '<span class="muted">Chưa cập nhật</span>' : p.stock}</td>
          <td><span class="badge ${isVisible ? 'completed' : 'inactive'}">${isVisible ? 'Đang hiển thị' : 'Đang ẩn'}</span></td>
          <td>
            <div class="row-actions">
              <button type="button" class="${toggleClass}" data-toggle-product="${p.id}" title="${toggleTitle}">${toggleLabel}</button>
              <button type="button" data-edit="${p.id}" aria-label="Sửa ${escape(p.name)}">Sửa</button>
              <button type="button" class="delete-action" data-delete="${p.id}" aria-label="Xóa ${escape(p.name)}">Xóa</button>
            </div>
          </td>
        </tr>
      `;
    }).join('') || `<tr><td colspan="6">${empty('Không có sản phẩm phù hợp', 'Thử từ khóa hoặc danh mục khác.')}</td></tr>`;
    $('#product-result').textContent = `Hiển thị ${list.length} / ${state.products.length} sản phẩm`;
  }
  function renderOrders() {
    const query = normalized($('#order-search').value.trim());
    const filter = $('#order-filter').value;
    const list = state.orders.filter(o => {
      const matchQuery = normalized(o.id + ' ' + (o.customer?.name || '') + ' ' + (o.customer?.phone || '')).includes(query);
      if (!matchQuery) return false;
      if (filter === 'all') return true;
      if (filter === 'registered') return !!(o.isRegistered || o.user?.id);
      return o.status === filter;
    });

    $('#order-rows').innerHTML = list.map(o => {
      const isReg = !!(o.isRegistered || o.user?.id);
      const regBadge = isReg
        ? `<span class="badge confirmed" style="margin-left: 6px; font-size: 9.5px; padding: 2px 6px;">Đã đăng ký</span>`
        : '';
      return `
        <tr>
          <td><strong>${o.id}</strong><small>${date(o.createdAt)}</small></td>
          <td>
            <div style="display: flex; align-items: center; gap: 4px;">
              <strong>${escape(o.customer.name)}</strong>
              ${regBadge}
            </div>
            <small>${escape(o.customer.phone)}</small>
          </td>
          <td><strong>${money(api.total(o))}</strong></td>
          <td>${badge(o.status)}</td>
          <td>
            <div class="row-actions">
              <button data-order="${o.id}">Chi tiết</button>
            </div>
          </td>
        </tr>
      `;
    }).join('') || `<tr><td colspan="5">${empty('Chưa có đơn hàng phù hợp', 'Tạo đơn mới hoặc thay đổi điều kiện tìm kiếm.')}</td></tr>`;

    $('#order-result').textContent = `Hiển thị ${list.length} / ${state.orders.length} đơn hàng`;
  }

  function renderCustomers() {
    const query = normalized($('#customer-search')?.value?.trim() || '');
    const typeFilter = $('#customer-type-filter')?.value || 'all';
    let list = api.customers(state.orders);

    if (typeFilter === 'registered') {
      list = list.filter(c => c.isRegistered);
    } else if (typeFilter === 'guest') {
      list = list.filter(c => !c.isRegistered);
    }

    list = list.filter(c => normalized(c.name + ' ' + c.phone + ' ' + (c.email || '') + ' ' + (c.address || '')).includes(query));

    $('#customer-rows').innerHTML = list.map(c => {
      const typeBadge = c.isRegistered
        ? `<span class="badge confirmed" style="font-size: 10px; padding: 3px 7px;">Đã đăng ký ${c.userId ? `(#${c.userId})` : ''}</span>`
        : `<span class="badge" style="font-size: 10px; padding: 3px 7px; background: #eee; color: #666;">Khách vãng lai</span>`;
      const hasOrders = c.orders > 0;
      const orderAction = hasOrders
        ? `<button type="button" class="button secondary" style="padding: 5px 12px; font-size: 11.5px; border-radius: 0;" data-customer-orders="${escape(c.phone)}">Xem đơn hàng (${c.orders})</button>`
        : `<span class="muted" style="font-size: 11px;">Chưa mua đơn</span>`;

      return `
        <tr>
          <td><strong>${escape(c.name)}</strong></td>
          <td><strong>${escape(c.phone)}</strong></td>
          <td>
            <small style="margin: 0; line-height: 1.4; color: var(--ink);">${escape(c.address || 'Chưa cập nhật địa chỉ')}</small>
            <small style="color: var(--muted);">${escape(c.email || 'Chưa có email')}</small>
          </td>
          <td>${typeBadge}</td>
          <td><strong>${c.orders} đơn</strong></td>
          <td><strong style="color: var(--green);">${money(c.completed)}</strong></td>
          <td style="text-align: center;">${orderAction}</td>
        </tr>
      `;
    }).join('') || `<tr><td colspan="7">${empty('Chưa có khách hàng phù hợp', 'Khách hàng sẽ xuất hiện khi có tài khoản hoặc đơn hàng.')}</td></tr>`;

    const resultEl = $('#customer-result');
    if (resultEl) resultEl.textContent = `Hiển thị ${list.length} khách hàng`;
  }

  function render() {
    $('#nav-products').textContent = state.products.length;
    $('#storage-error').hidden = !api.getError();
    $('#storage-error').textContent = api.getError();
    renderOverview(); renderProducts(); renderOrders(); renderCustomers(); renderArticles();
  }
  const pages = {
    overview: ['Tổng quan', 'Theo dõi nhanh tình hình sản phẩm và đơn hàng tại cửa hàng.', 'Tổng quan'],
    products: ['Danh sách sản phẩm', 'Quản lý thông tin, giá bán và trạng thái của từng món.', 'Sản phẩm'],
    orders: ['Quản lý đơn hàng', 'Tạo đơn thủ công và theo dõi quá trình xử lý.', 'Đơn hàng'],
    inbox: ['Tư vấn & Lời nhắn', 'Tiếp nhận yêu cầu tư vấn và lời nhắn liên hệ từ khách hàng.', 'Tư vấn & Lời nhắn'],
    customers: ['Khách hàng', 'Thông tin liên hệ được tổng hợp từ những đơn hàng của bạn.', 'Khách hàng'],
    content: ['Tin tức', 'Quản lý bài viết tin tức và Góc Macca trên website.', 'Tin tức'],
    settings: ['Cài đặt thông tin liên hệ', 'Quản lý hotline SĐT, Zalo, Fanpage Facebook và Gmail trên website.', 'Cài đặt web'],
  };
  const SETTINGS_KEY = 'macca-toan-thang-web-settings-v1';
  const defaultWebSettings = {
    brandName: 'Macca Toàn Thắng',
    phone: '0975895024',
    phoneDisplay: '0975.895.024',
    zalo: 'https://zalo.me/0975895024',
    facebook: 'https://facebook.com/maccatoanthang',
    email: 'maccatoanthang@gmail.com',
    address: 'Sơn Lương, Phú Thọ',
    announcementEnable: 'false'
  };
  function getWebSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        delete parsed.announcementText;
        delete parsed.announcementLink;
        parsed.announcementEnable = 'false';
        return { ...defaultWebSettings, ...parsed };
      }
    } catch {}
    return { ...defaultWebSettings };
  }
  async function populateWebSettingsForm() {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const remote = await res.json();
        if (remote && remote.phone) {
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(remote));
        }
      }
    } catch {}
    const s = getWebSettings();
    const form = $('#web-settings-form');
    if (!form) return;
    for (const [key, val] of Object.entries(s)) {
      const field = form.elements.namedItem(key);
      if (field) field.value = String(val ?? '');
    }
  }
  function navigate(focus = false) {
    const raw = location.hash.slice(1);
    const page = Object.hasOwn(pages, raw) ? raw : 'overview';
    document.querySelectorAll('.page-panel').forEach(panel => { panel.hidden = panel.id !== 'page-' + page; });
    document.querySelectorAll('[data-page]').forEach(link => {
      if (link.dataset.page === page) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    const info = pages[page] || pages.overview;
    $('#page-title').textContent = info[0];
    $('#page-description').textContent = info[1];
    $('#breadcrumb-current').textContent = info[2];
    document.title = info[2] + ' — Quản trị Macca Toàn Thắng';
    if (page === 'settings') populateWebSettingsForm();
    if (page === 'inbox' && typeof window.refreshMaccaInbox === 'function') window.refreshMaccaInbox();
    if (focus) $('#admin-main')?.focus({ preventScroll: true });
  }
  function openProduct(id) {
    const product = state.products.find(p => p.id === id);
    const form = $('#product-form');
    form.reset();
    form.elements.namedItem('id').value = '';
    $('#product-error').textContent = '';
    $('#product-dialog-title').textContent = product ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm';
    if (product) for (const [key, value] of Object.entries(product)) {
      const field = form.elements.namedItem(key);
      if (field) field.value = value === null ? '' : String(value);
    }
    $('#product-dialog').showModal();
  }
  $('#product-form').addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const get = name => String(data.get(name) || '').trim();
    const category = get('category');
    const product = { id: get('id') || 'p-' + crypto.randomUUID(), name: get('name'), category, categoryName: api.categories[category], image: get('image'), weight: get('weight'), price: Number(get('price')), stock: get('stock') === '' ? null : Number(get('stock')), active: get('active') === 'true', badge: get('badge'), ingredients: get('ingredients'), description: get('description') };
    mutation(() => api.saveProduct(product), '#product-dialog', '#product-error', 'Đã lưu sản phẩm thành công.');
  });
  function addOrderLine() {
    if ($('#order-lines').children.length >= 50) { toast('Mỗi đơn có tối đa 50 dòng sản phẩm.'); return; }
    const row = document.createElement('div');
    row.className = 'order-line';
    row.innerHTML = `<select aria-label="Sản phẩm đặt mua" required>${state.products.filter(p => p.active).map(p => `<option value="${p.id}">${escape(p.name)} — ${money(p.price)}</option>`).join('')}</select><input type="number" min="1" max="99" step="1" value="1" required aria-label="Số lượng"><button type="button" data-remove-line aria-label="Xóa dòng sản phẩm">×</button>`;
    $('#order-lines').append(row);
    updateOrderTotal();
  }
  const orderLines = () => [...document.querySelectorAll('.order-line')].map(row => ({ id: row.querySelector('select').value, quantity: Number(row.querySelector('input').value) }));
  function updateOrderTotal() {
    const shipping = Number($('#order-form').elements.namedItem('shipping').value);
    const total = orderLines().reduce((sum, line) => sum + (state.products.find(p => p.id === line.id)?.price || 0) * line.quantity, shipping);
    $('#new-order-total').textContent = Number.isFinite(total) && total >= 0 ? money(total) : '—';
  }
  function openOrder() {
    if (!state.products.some(p => p.active)) { toast('Hãy thêm ít nhất một sản phẩm đang kinh doanh trước khi tạo đơn.'); return; }
    $('#order-form').reset();
    $('#order-error').textContent = '';
    $('#order-lines').replaceChildren();
    addOrderLine();
    $('#order-dialog').showModal();
  }
  $('#add-order-line').addEventListener('click', addOrderLine);
  $('#order-form').addEventListener('input', updateOrderTotal);
  $('#order-form').addEventListener('change', updateOrderTotal);
  $('#order-form').addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const get = name => String(data.get(name) || '').trim();
    const customer = { name: get('name'), phone: get('phone').replace(/\s/g, ''), email: get('email'), address: get('address') };
    mutation(() => api.createOrder(customer, orderLines(), Number(get('shipping')), get('note')), '#order-dialog', '#order-error', 'Đã tạo đơn hàng thủ công.');
  });
  function showOrder(id) {
    const order = state.orders.find(o => o.id === id);
    if (!order) return;
    detailId = id;

    const isReg = !!(order.isRegistered || order.user?.id);
    const regLabel = isReg
      ? `<span class="badge confirmed" style="font-size: 11px; padding: 3px 8px;">Khách hàng đã đăng ký tài khoản (ID: #${order.userId || order.user?.id})</span>`
      : `<span class="badge" style="background:#f0f0ec; color:#666; font-size: 11px; padding: 3px 8px;">Khách mua trực tiếp / vãng lai</span>`;

    $('#order-detail-title').textContent = 'Chi tiết đơn hàng #' + id;
    $('#order-detail').innerHTML = `
      <div class="detail-customer" style="border-radius: 0; border: 1px solid var(--line); margin-bottom: 16px; padding: 14px 16px; background: #fafbf7;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; flex-wrap: wrap;">
          <div>
            <strong style="font-size: 15px; color: var(--ink);">${escape(order.customer.name)}</strong>
            <p style="margin: 2px 0 6px; color: var(--muted); font-size: 13px;">${escape(order.customer.phone)}${order.customer.email ? ' · ' + escape(order.customer.email) : ''}</p>
          </div>
          <div>${regLabel}</div>
        </div>
        <p style="margin: 4px 0 0; color: var(--ink); font-size: 13px;"><strong>Địa chỉ giao hàng:</strong> ${escape(order.customer.address || 'Tại cửa hàng / Chưa nhập')}</p>
        <p style="margin: 4px 0 0; color: var(--muted); font-size: 11.5px;">Ngày đặt hàng: ${date(order.createdAt)} · Thanh toán: Khi nhận hàng (COD)</p>
      </div>

      <div style="margin-bottom: 16px;">
        <h4 style="margin: 0 0 8px; font-size: 12.5px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px;">Danh sách sản phẩm đã mua</h4>
        <div class="table-wrap">
          <table style="width: 100%; border: 1px solid var(--line);">
            <thead>
              <tr style="background: #f6f8f1;">
                <th style="padding: 9px 12px; font-size: 11px;">Sản phẩm</th>
                <th style="padding: 9px 12px; font-size: 11px; text-align: center;">Quy cách</th>
                <th style="padding: 9px 12px; font-size: 11px; text-align: right;">Đơn giá</th>
                <th style="padding: 9px 12px; font-size: 11px; text-align: center;">Số lượng</th>
                <th style="padding: 9px 12px; font-size: 11px; text-align: right;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${(order.items || []).map(i => `
                <tr>
                  <td style="padding: 10px 12px;"><strong>${escape(i.name)}</strong></td>
                  <td style="padding: 10px 12px; text-align: center; color: var(--muted);">${escape(i.weight || '500g')}</td>
                  <td style="padding: 10px 12px; text-align: right;">${money(i.price)}</td>
                  <td style="padding: 10px 12px; text-align: center;"><strong>${i.quantity}</strong></td>
                  <td style="padding: 10px 12px; text-align: right; font-weight: 600;">${money(i.price * i.quantity)}</td>
                </tr>
              `).join('') || '<tr><td colspan="5" style="text-align: center; padding: 12px;">Không có chi tiết sản phẩm</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <div style="background: #f6f8f1; padding: 12px 16px; border: 1px solid var(--line); margin-bottom: 16px; font-size: 13px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span>Tiền hàng</span>
          <span>${money((order.items || []).reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0))}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span>Phí giao hàng</span>
          <span>${money(order.shipping)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 700; color: var(--green); border-top: 1px solid #dce1d5; padding-top: 8px;">
          <span>Tổng thanh toán</span>
          <span>${money(api.total(order))}</span>
        </div>
      </div>

      ${order.note ? `<div style="padding: 10px 14px; background: #fffdf5; border: 1px solid #fae8c8; font-size: 12.5px; margin-bottom: 16px;"><strong>Ghi chú của khách hàng:</strong> ${escape(order.note)}</div>` : ''}
    `;

    $('#status-form').elements.namedItem('status').value = order.status;
    $('#status-error').textContent = '';
    $('#order-detail-dialog').showModal();
  }

  function openCustomerOrders(phone) {
    const allCustomers = api.customers(state.orders);
    const customer = allCustomers.find(c => c.phone === phone);
    if (!customer) return;

    const modal = $('#customer-orders-dialog');
    if (!modal) return;

    $('#customer-orders-title').textContent = `Lịch sử mua hàng: ${customer.name}`;
    $('#customer-orders-info').innerHTML = `
      <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; font-size: 13px;">
        <div>
          <strong style="font-size: 14px;">${escape(customer.name)}</strong> · ${customer.isRegistered ? '<span class="badge confirmed" style="font-size: 10px;">Khách hàng đã đăng ký</span>' : '<span class="badge" style="background:#eee; color:#666; font-size: 10px;">Khách vãng lai</span>'}<br>
          <strong>Điện thoại:</strong> ${escape(customer.phone)} &nbsp;·&nbsp; <strong>Email:</strong> ${escape(customer.email || 'Chưa cung cấp')}
        </div>
        <div style="text-align: right;">
          <strong>Tổng số đơn đã mua:</strong> ${customer.orders} đơn<br>
          <strong>Tổng tiền hoàn thành:</strong> <span style="color: var(--green); font-weight: 700; font-size: 14px;">${money(customer.completed)}</span>
        </div>
      </div>
      ${customer.address ? `<div style="margin-top: 6px; font-size: 12px; color: var(--ink);"><strong>Địa chỉ giao hàng:</strong> ${escape(customer.address)}</div>` : ''}
    `;

    const orders = customer.orderList || [];
    $('#customer-orders-tbody').innerHTML = orders.map(o => {
      const itemsText = (o.items || []).map(i => `${escape(i.name)} (x${i.quantity})`).join(', ') || 'Sản phẩm Macca';
      return `
        <tr>
          <td><strong>${o.id}</strong></td>
          <td>${date(o.createdAt)}</td>
          <td style="max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${itemsText}">${itemsText}</td>
          <td><strong>${money(api.total(o))}</strong></td>
          <td>${badge(o.status)}</td>
          <td style="text-align: center;">
            <button type="button" class="button secondary" style="padding: 5px 10px; font-size: 11px; border-radius: 0;" data-order="${o.id}">Chi tiết</button>
          </td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="6" style="text-align: center; color: var(--muted); padding: 18px;">Khách hàng chưa có đơn hàng nào</td></tr>';

    modal.showModal();
  }

  // --- Article Management in Admin Dashboard ---
  let adminArticles = [];
  let deletingArticleSlug = null;
  const categoryLabels = {
    enjoy: 'Thưởng thức',
    kitchen: 'Góc bếp',
    gift: 'Quà tặng'
  };

  async function loadAdminArticles() {
    try {
      adminArticles = await api.getArticles();
    } catch (e) {
      adminArticles = (typeof MaccaJournal !== 'undefined') ? MaccaJournal : [];
    }
  }

  function renderArticles() {
    const searchVal = normalized($('#admin-article-search')?.value?.trim() || '');
    const catVal = $('#admin-article-category')?.value || 'all';
    const statusVal = $('#admin-article-status')?.value || 'all';

    const filtered = adminArticles.filter(art => {
      const matchSearch = normalized((art.title || '') + ' ' + (art.description || '') + ' ' + (art.label || '')).includes(searchVal);
      if (!matchSearch) return false;
      if (catVal !== 'all' && (art.category || '').toLowerCase() !== catVal.toLowerCase()) return false;
      if (statusVal === 'published' && art.published === false) return false;
      if (statusVal === 'hidden' && art.published !== false) return false;
      return true;
    });

    const rowsEl = $('#admin-article-rows');
    if (rowsEl) {
      rowsEl.innerHTML = filtered.map(art => {
        const catKey = (art.category || 'enjoy').toLowerCase();
        const catLabel = categoryLabels[catKey] || art.category || 'Thưởng thức';
        const isPublished = art.published !== false;
        const toggleLabel = isPublished ? 'Ẩn' : 'Hiện';
        const toggleClass = isPublished ? 'toggle-action' : 'toggle-action is-hidden';
        const toggleTitle = isPublished ? 'Ẩn bài viết khỏi Góc Macca' : 'Hiện lại bài viết trên Góc Macca';
        return `
          <tr>
            <td>
              <div style="display: flex; align-items: center; gap: 12px;">
                <img src="${escape(art.image || 'assets/macca-natural.png')}" alt="" width="56" height="42" style="object-fit: cover; border: 1px solid var(--line); flex-shrink: 0;">
                <div>
                  <strong style="display: block; font-size: 13.5px; color: var(--ink);">${escape(art.title)}</strong>
                  <small style="max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--muted); display: block;">${escape(art.description || '')}</small>
                  <small style="color: var(--olive); font-size: 10px;">slug: ${escape(art.slug)}</small>
                </div>
              </div>
            </td>
            <td><span class="badge ${catKey}">${escape(catLabel)}</span></td>
            <td><small style="font-weight: 500;">${escape(art.label || '—')}</small></td>
            <td><span class="badge ${isPublished ? 'completed' : 'inactive'}">${isPublished ? 'Đang hiển thị' : 'Đang ẩn'}</span></td>
            <td style="text-align: center;">
              <div class="row-actions" style="justify-content: center;">
                <button type="button" class="${toggleClass}" style="border-radius: 0;" data-toggle-article="${escape(art.slug)}" title="${toggleTitle}">${toggleLabel}</button>
                <button type="button" style="border-radius: 0;" data-edit-article="${escape(art.slug)}">Sửa</button>
                <button type="button" class="delete-action" style="border-radius: 0;" data-delete-article="${escape(art.slug)}">Xóa</button>
              </div>
            </td>
          </tr>
        `;
      }).join('') || `<tr><td colspan="5">${empty('Không tìm thấy bài viết', 'Hãy tạo bài viết mới hoặc thay đổi điều kiện tìm kiếm.')}</td></tr>`;
    }

    const resultEl = $('#admin-article-result');
    if (resultEl) resultEl.textContent = `Hiển thị ${filtered.length} / ${adminArticles.length} bài viết tin tức`;
  }

  function openAddArticle() {
    const form = $('#admin-article-form');
    if (!form) return;
    form.reset();
    form.elements.namedItem('editSlug').value = '';
    form.elements.namedItem('slug').disabled = false;
    if (form.elements.namedItem('published')) form.elements.namedItem('published').value = 'true';
    $('#admin-article-title').textContent = 'Thêm bài viết mới vào Góc Macca';
    $('#admin-article-error').textContent = '';
    $('#admin-article-dialog').showModal();
  }

  function openEditArticle(slug) {
    const art = adminArticles.find(a => a.slug === slug);
    if (!art) return;
    const form = $('#admin-article-form');
    if (!form) return;
    form.elements.namedItem('editSlug').value = art.slug;
    form.elements.namedItem('title').value = art.title || '';
    form.elements.namedItem('category').value = (art.category || 'enjoy').toLowerCase();
    form.elements.namedItem('label').value = art.label || '';
    form.elements.namedItem('slug').value = art.slug || '';
    form.elements.namedItem('slug').disabled = true;
    form.elements.namedItem('image').value = art.image || 'assets/macca-natural.png';
    if (form.elements.namedItem('published')) form.elements.namedItem('published').value = String(art.published !== false);
    form.elements.namedItem('description').value = art.description || '';
    form.elements.namedItem('body').value = art.body || '';
    $('#admin-article-title').textContent = 'Chỉnh sửa bài viết Góc Macca';
    $('#admin-article-error').textContent = '';
    $('#admin-article-dialog').showModal();
  }

  function openDeleteArticle(slug) {
    const art = adminArticles.find(a => a.slug === slug);
    deletingArticleSlug = slug;
    $('#admin-article-del-desc').textContent = `Bạn có chắc chắn muốn xóa bài viết "${art ? art.title : slug}" khỏi Góc Macca không?`;
    $('#admin-article-del-error').textContent = '';
    $('#admin-article-delete-dialog').showModal();
  }

  $('#admin-article-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const editSlug = form.elements.namedItem('editSlug').value.trim();
    const submitBtn = $('#admin-article-submit');
    const errorEl = $('#admin-article-error');
    errorEl.textContent = '';

    let body = form.elements.namedItem('body').value.trim();
    if (!body.includes('<p>') && !body.includes('<br>') && !body.includes('<div>')) {
      body = body.split(/\n\s*\n/).map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`).join('');
    }

    const payload = {
      title: form.elements.namedItem('title').value.trim(),
      category: form.elements.namedItem('category').value.toUpperCase(),
      label: form.elements.namedItem('label').value.trim() || undefined,
      slug: form.elements.namedItem('slug').value.trim() || undefined,
      image: form.elements.namedItem('image').value.trim(),
      description: form.elements.namedItem('description').value.trim(),
      body: body,
      sortOrder: 0,
      published: form.elements.namedItem('published')?.value !== 'false'
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang lưu…';
    try {
      await api.saveArticle(payload, editSlug || null);
      toast(editSlug ? 'Đã cập nhật bài viết thành công!' : 'Đã thêm bài viết mới vào Góc Macca!');
      $('#admin-article-dialog').close();
      await loadAdminArticles();
      renderArticles();
    } catch (err) {
      errorEl.textContent = err.message || 'Lỗi khi lưu bài viết.';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Lưu bài viết';
    }
  });

  $('#admin-article-delete-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const errorEl = $('#admin-article-del-error');
    errorEl.textContent = '';
    try {
      await api.deleteArticle(deletingArticleSlug);
      toast('Đã xóa bài viết thành công!');
      $('#admin-article-delete-dialog').close();
      await loadAdminArticles();
      renderArticles();
    } catch (err) {
      errorEl.textContent = err.message || 'Lỗi khi xóa bài viết.';
    }
  });

  $('#status-form').addEventListener('submit', event => {
    event.preventDefault();
    mutation(() => api.updateStatus(detailId, event.currentTarget.elements.namedItem('status').value), '#order-detail-dialog', '#status-error', 'Đã cập nhật trạng thái đơn hàng.');
  });

  $('#delete-form').addEventListener('submit', event => {
    event.preventDefault();
    mutation(() => api.deleteProduct(deletingId), '#delete-dialog', '#delete-error', 'Đã xóa sản phẩm khỏi danh sách quản lý.');
  });

  document.addEventListener('click', async event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-close')) button.closest('dialog').close();
    if (button.dataset.action === 'new-product') openProduct();
    if (button.dataset.action === 'new-order') openOrder();
    if (button.dataset.edit) openProduct(button.dataset.edit);
    if (button.dataset.order) showOrder(button.dataset.order);
    if (button.dataset.customerOrders) openCustomerOrders(button.dataset.customerOrders);
    if (button.id === 'btn-admin-add-article') openAddArticle();
    if (button.dataset.editArticle) openEditArticle(button.dataset.editArticle);
    if (button.dataset.deleteArticle) openDeleteArticle(button.dataset.deleteArticle);
    if (button.hasAttribute('data-remove-line')) { button.closest('.order-line').remove(); updateOrderTotal(); }

    if (button.dataset.toggleProduct) {
      const prodId = button.dataset.toggleProduct;
      const product = state.products.find(p => p.id === prodId);
      if (product) {
        const nextActive = !product.active;
        const updated = { ...product, active: nextActive };
        button.disabled = true;
        try {
          await api.saveProduct(updated);
          state = api.reload();
          render();
          toast(nextActive ? `Đã hiển thị sản phẩm “${product.name}” trên website.` : `Đã ẩn sản phẩm “${product.name}” khỏi website.`);
        } catch (err) {
          toast('Không thể thay đổi trạng thái sản phẩm: ' + err.message);
        } finally {
          button.disabled = false;
        }
      }
    }

    if (button.dataset.toggleArticle) {
      const slug = button.dataset.toggleArticle;
      const art = adminArticles.find(a => a.slug === slug);
      if (art) {
        const nextPublished = art.published === false ? true : false;
        const payload = {
          title: art.title,
          category: (art.category || 'enjoy').toUpperCase(),
          label: art.label || undefined,
          slug: art.slug,
          image: art.image || 'assets/macca-natural.png',
          description: art.description || '',
          body: art.body || '',
          sortOrder: art.sortOrder || 0,
          published: nextPublished
        };
        button.disabled = true;
        try {
          await api.saveArticle(payload, slug);
          await loadAdminArticles();
          renderArticles();
          toast(nextPublished ? `Đã hiển thị bài viết “${art.title}” trên website.` : `Đã ẩn bài viết “${art.title}” khỏi website.`);
        } catch (err) {
          toast('Không thể thay đổi trạng thái bài viết: ' + err.message);
        } finally {
          button.disabled = false;
        }
      }
    }

    if (button.dataset.delete) {
      deletingId = button.dataset.delete;
      const product = state.products.find(p => p.id === deletingId);
      $('#delete-description').textContent = `Bạn muốn xóa “${product.name}” khỏi danh sách quản lý?`;
      $('#delete-error').textContent = '';
      $('#delete-dialog').showModal();
    }
  });

  $('#export-data').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'macca-admin-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Đã xuất dữ liệu quản lý thành tệp JSON.');
  });

  for (const id of ['product-search', 'product-category']) $('#' + id)?.addEventListener(id.includes('search') ? 'input' : 'change', renderProducts);
  $('#product-status-filter')?.addEventListener('change', renderProducts);
  for (const id of ['order-search', 'order-filter']) $('#' + id)?.addEventListener(id.includes('search') ? 'input' : 'change', renderOrders);
  $('#customer-search')?.addEventListener('input', renderCustomers);
  $('#customer-type-filter')?.addEventListener('change', renderCustomers);
  $('#admin-article-search')?.addEventListener('input', renderArticles);
  $('#admin-article-category')?.addEventListener('change', renderArticles);
  $('#admin-article-status')?.addEventListener('change', renderArticles);

  const webSettingsForm = $('#web-settings-form');
  if (webSettingsForm) {
    webSettingsForm.addEventListener('submit', async event => {
      event.preventDefault();
      if ($('#settings-error')) $('#settings-error').textContent = '';
      const form = event.currentTarget;
      const data = new FormData(form);
      const prev = getWebSettings();

      const rawPhone = String(data.get('phone') || '').trim();
      const cleanPhone = rawPhone.replace(/\D/g, '') || rawPhone;

      // Auto-format phone display if not explicitly provided
      let displayPhone = String(data.get('phoneDisplay') || '').trim();
      if (!displayPhone) {
        if (rawPhone.includes('.')) {
          displayPhone = rawPhone;
        } else if (cleanPhone.length === 10) {
          displayPhone = cleanPhone.slice(0, 4) + '.' + cleanPhone.slice(4, 7) + '.' + cleanPhone.slice(7);
        } else {
          displayPhone = rawPhone;
        }
      }

      // Auto update zalo if using standard zalo link
      let zaloLink = String(data.get('zalo') || '').trim();
      if (!zaloLink || zaloLink.includes('0988245476')) {
        zaloLink = 'https://zalo.me/' + cleanPhone;
      }

      const updated = {
        brandName: String(data.get('brandName') || '').trim() || prev.brandName || defaultWebSettings.brandName,
        phone: cleanPhone,
        phoneDisplay: displayPhone,
        zalo: zaloLink,
        facebook: String(data.get('facebook') || '').trim(),
        email: String(data.get('email') || '').trim(),
        address: String(data.get('address') || '').trim() || prev.address || defaultWebSettings.address,
        announcementEnable: 'false'
      };

      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
        try {
          await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
          });
        } catch {}

        window.dispatchEvent(new CustomEvent('macca:settings-updated', { detail: updated }));
        if (window.OwnerContact?.applyToPage) window.OwnerContact.applyToPage();
        populateWebSettingsForm();
        toast('Đã lưu thông tin liên hệ thành công! Giao diện khách hàng đã được cập nhật.');
      } catch (err) {
        if ($('#settings-error')) $('#settings-error').textContent = 'Không thể lưu cài đặt: ' + err.message;
      }
    });

    $('#setting-phone')?.addEventListener('input', e => {
      const raw = e.target.value.trim();
      const digits = raw.replace(/\D/g, '');
      const displayField = $('#setting-phone-display');
      if (displayField) {
        if (digits.length === 10) {
          displayField.value = digits.slice(0, 4) + '.' + digits.slice(4, 7) + '.' + digits.slice(7);
        } else {
          displayField.value = raw;
        }
      }
      const zaloField = $('#setting-zalo');
      if (zaloField && (!zaloField.value || zaloField.value.includes('zalo.me'))) {
        zaloField.value = 'https://zalo.me/' + digits;
      }
    });
  }

  const resetSettingsBtn = $('#reset-settings-button');
  if (resetSettingsBtn) {
    resetSettingsBtn.addEventListener('click', async () => {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultWebSettings));
        try {
          await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(defaultWebSettings)
          });
        } catch {}
        window.dispatchEvent(new CustomEvent('macca:settings-updated', { detail: defaultWebSettings }));
        if (window.OwnerContact?.applyToPage) window.OwnerContact.applyToPage();
        populateWebSettingsForm();
        toast('Đã khôi phục thông tin liên hệ về mặc định.');
      } catch (err) {
        if ($('#settings-error')) $('#settings-error').textContent = err.message;
      }
    });
  }

  window.addEventListener('hashchange', () => navigate(true));
  window.addEventListener('macca:new-order', () => { state = api.reload(); render(); });
  window.addEventListener('macca:articles-synced', async () => { await loadAdminArticles(); renderArticles(); });
  window.addEventListener('storage', event => {
    if (event.key !== api.key && event.key !== null) return;
    document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
    state = api.reload(); render();
    toast('Dữ liệu đã thay đổi ở tab khác. Danh sách đã được cập nhật; hãy mở lại biểu mẫu nếu cần.');
  });

  $('#today').textContent = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Ensure sidebar links activate navigation immediately on click
  document.querySelectorAll('.sidebar nav a[data-page]').forEach(link => {
    link.addEventListener('click', () => {
      setTimeout(() => navigate(false), 0);
    });
  });

  (async () => {
    state = api.reload();
    await loadAdminArticles();
    render();
    navigate();
  })();
})();
