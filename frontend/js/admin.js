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
  function mutation(action, dialog, errorId, message) {
    try {
      state = action();
      $(dialog).close();
      render();
      toast(message);
    } catch (error) { $(errorId).textContent = error.message; }
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
    $('#product-preview').innerHTML = state.products.length ? state.products.slice(0, 4).map(p => `<article class="preview-product"><img src="${p.image}" alt="${escape(p.name)}" width="220" height="150"><div><small>${escape(api.categories[p.category])} · ${escape(p.weight)}</small><h3>${escape(p.name)}</h3><strong>${money(p.price)}</strong><button class="text-link" data-edit="${p.id}">Chỉnh sửa →</button></div></article>`).join('') : empty('Chưa có sản phẩm', 'Thêm sản phẩm vào bộ sưu tập của bạn.', 'new-product', 'Thêm sản phẩm');
  }
  function renderProducts() {
    const query = normalized($('#product-search').value.trim());
    const category = $('#product-category').value;
    const list = state.products.filter(p => normalized(p.name + ' ' + p.id).includes(query) && (category === 'all' || p.category === category));
    $('#product-rows').innerHTML = list.map(p => `<tr><td><div class="table-product"><img src="${p.image}" alt="" width="48" height="52"><div><strong>${escape(p.name)}</strong><small>${escape(p.weight)} · ${p.id}</small></div></div></td><td>${escape(api.categories[p.category])}</td><td><strong>${money(p.price)}</strong></td><td>${p.stock === null ? '<span class="muted">Chưa cập nhật</span>' : p.stock}</td><td><span class="badge ${p.active ? '' : 'inactive'}">${p.active ? 'Đang kinh doanh' : 'Tạm ngừng'}</span></td><td><div class="row-actions"><button data-edit="${p.id}" aria-label="Sửa ${escape(p.name)}">Sửa</button><button class="delete-action" data-delete="${p.id}" aria-label="Xóa ${escape(p.name)}">Xóa</button></div></td></tr>`).join('') || `<tr><td colspan="6">${empty('Không có sản phẩm phù hợp', 'Thử từ khóa hoặc danh mục khác.')}</td></tr>`;
    $('#product-result').textContent = `Hiển thị ${list.length} / ${state.products.length} sản phẩm`;
  }
  function renderOrders() {
    const query = normalized($('#order-search').value.trim());
    const status = $('#order-filter').value;
    const list = state.orders.filter(o => normalized(o.id + ' ' + o.customer.name + ' ' + o.customer.phone).includes(query) && (status === 'all' || o.status === status));
    $('#order-rows').innerHTML = list.map(o => `<tr><td><strong>${o.id}</strong><small>${date(o.createdAt)}</small></td><td>${escape(o.customer.name)}<small>${escape(o.customer.phone)}</small></td><td><strong>${money(api.total(o))}</strong></td><td>${badge(o.status)}</td><td><div class="row-actions"><button data-order="${o.id}">Chi tiết</button></div></td></tr>`).join('') || `<tr><td colspan="5">${empty('Chưa có đơn hàng phù hợp', 'Tạo đơn mới hoặc thay đổi điều kiện tìm kiếm.')}</td></tr>`;
    $('#order-result').textContent = `Hiển thị ${list.length} / ${state.orders.length} đơn hàng`;
  }
  function renderCustomers() {
    const query = normalized($('#customer-search').value.trim());
    const list = api.customers(state.orders).filter(c => normalized(c.name + ' ' + c.phone + ' ' + c.email).includes(query));
    $('#customer-rows').innerHTML = list.map(c => `<tr><td><strong>${escape(c.name)}</strong></td><td>${escape(c.phone)}<small>${escape(c.email || 'Chưa có email')}</small></td><td>${c.orders}</td><td>${money(c.completed)}</td></tr>`).join('') || `<tr><td colspan="4">${empty('Chưa có khách hàng phù hợp', 'Khách hàng sẽ xuất hiện khi bạn tạo đơn hàng.')}</td></tr>`;
  }
  function render() {
    $('#nav-products').textContent = state.products.length;
    $('#storage-error').hidden = !api.getError();
    $('#storage-error').textContent = api.getError();
    renderOverview(); renderProducts(); renderOrders(); renderCustomers();
  }
  const pages = {
    overview: ['Tổng quan', 'Theo dõi nhanh tình hình sản phẩm và đơn hàng tại cửa hàng.', 'Tổng quan'],
    products: ['Danh sách sản phẩm', 'Quản lý thông tin, giá bán và trạng thái của từng món.', 'Sản phẩm'],
    orders: ['Quản lý đơn hàng', 'Tạo đơn thủ công và theo dõi quá trình xử lý.', 'Đơn hàng'],
    inbox: ['Tư vấn & Lời nhắn', 'Tiếp nhận yêu cầu tư vấn và lời nhắn liên hệ từ khách hàng.', 'Tư vấn & Lời nhắn'],
    customers: ['Khách hàng', 'Thông tin liên hệ được tổng hợp từ những đơn hàng của bạn.', 'Khách hàng'],
    content: ['Nội dung website', 'Xem các bài viết và trang giới thiệu đang có trên website.', 'Nội dung'],
    settings: ['Cài đặt web khách hàng', 'Tùy chỉnh thông tin liên hệ, thanh thông báo và cấu hình dịch vụ trên website.', 'Cài đặt web'],
  };
  const SETTINGS_KEY = 'macca-toan-thang-web-settings-v1';
  const defaultWebSettings = {
    brandName: 'Macca Toàn Thắng',
    slogan: 'Từ hạt nhỏ, nuôi điều lớn · Tinh túy từ thiên nhiên',
    phone: '0988245476',
    phoneDisplay: '0988 245 476',
    zalo: 'https://zalo.me/0988245476',
    facebook: 'https://facebook.com/maccatoanthang',
    email: 'maccatoanthang@gmail.com',
    address: 'Sơn Lương, Phú Thọ',
    hours: '08:00 – 21:00 hàng ngày',
    announcementEnable: 'true',
    announcementText: '🌿 Chào mừng bạn đến với Macca Toàn Thắng — Nông sản mộc lành từ Sơn Lương, Phú Thọ. Miễn phí giao hàng cho đơn từ 500k!',
    announcementLink: 'cau-chuyen.html',
    shippingStandard: 30000,
    shippingExpress: 45000,
    freeShippingThreshold: 500000,
    storeStatus: 'open',
    storeNotice: 'Đơn hàng sẽ được liên hệ xác nhận trong giờ làm việc (08:00 - 21:00).'
  };
  function getWebSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) return { ...defaultWebSettings, ...JSON.parse(raw) };
    } catch {}
    return { ...defaultWebSettings };
  }
  function populateWebSettingsForm() {
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
    mutation(() => api.saveProduct(product), '#product-dialog', '#product-error', 'Đã lưu sản phẩm trên thiết bị này.');
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
    $('#order-detail-title').textContent = 'Đơn hàng ' + id;
    $('#order-detail').innerHTML = `<div class="detail-customer"><strong>${escape(order.customer.name)}</strong><p>${escape(order.customer.phone)}${order.customer.email ? ' · ' + escape(order.customer.email) : ''}</p><p>${escape(order.customer.address)}</p><p>Ngày tạo: ${date(order.createdAt)} · Thanh toán COD</p></div>${order.items.map(i => `<div class="detail-item"><span>${escape(i.name)}<small>${escape(i.weight)} · ${i.quantity} × ${money(i.price)}</small></span><strong>${money(i.price * i.quantity)}</strong></div>`).join('')}<div class="detail-item"><span>Phí giao hàng</span><span>${money(order.shipping)}</span></div><div class="order-total"><span>Tổng cộng</span><strong>${money(api.total(order))}</strong></div>${order.note ? `<p class="detail-customer">Ghi chú: ${escape(order.note)}</p>` : ''}`;
    $('#status-form').elements.namedItem('status').value = order.status;
    $('#status-error').textContent = '';
    $('#order-detail-dialog').showModal();
  }
  $('#status-form').addEventListener('submit', event => {
    event.preventDefault();
    mutation(() => api.updateStatus(detailId, event.currentTarget.elements.namedItem('status').value), '#order-detail-dialog', '#status-error', 'Đã cập nhật trạng thái đơn hàng.');
  });
  $('#delete-form').addEventListener('submit', event => {
    event.preventDefault();
    mutation(() => api.deleteProduct(deletingId), '#delete-dialog', '#delete-error', 'Đã xóa sản phẩm khỏi danh sách quản lý.');
  });
  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-close')) button.closest('dialog').close();
    if (button.dataset.action === 'new-product') openProduct();
    if (button.dataset.action === 'new-order') openOrder();
    if (button.dataset.edit) openProduct(button.dataset.edit);
    if (button.dataset.order) showOrder(button.dataset.order);
    if (button.hasAttribute('data-remove-line')) { button.closest('.order-line').remove(); updateOrderTotal(); }
    if (button.dataset.delete) {
      deletingId = button.dataset.delete;
      const product = state.products.find(p => p.id === deletingId);
      $('#delete-description').textContent = `Bạn muốn xóa “${product.name}” khỏi danh sách quản lý trên thiết bị này?`;
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
  for (const id of ['product-search', 'product-category']) $('#' + id).addEventListener(id.includes('search') ? 'input' : 'change', renderProducts);
  for (const id of ['order-search', 'order-filter']) $('#' + id).addEventListener(id.includes('search') ? 'input' : 'change', renderOrders);
  $('#customer-search').addEventListener('input', renderCustomers);
  const webSettingsForm = $('#web-settings-form');
  if (webSettingsForm) {
    webSettingsForm.addEventListener('submit', event => {
      event.preventDefault();
      if ($('#settings-error')) $('#settings-error').textContent = '';
      const form = event.currentTarget;
      const data = new FormData(form);
      const updated = {
        brandName: String(data.get('brandName') || '').trim() || defaultWebSettings.brandName,
        slogan: String(data.get('slogan') || '').trim(),
        phone: String(data.get('phone') || '').trim().replace(/\s/g, ''),
        phoneDisplay: String(data.get('phoneDisplay') || '').trim(),
        zalo: String(data.get('zalo') || '').trim(),
        facebook: String(data.get('facebook') || '').trim(),
        email: String(data.get('email') || '').trim(),
        address: String(data.get('address') || '').trim(),
        hours: String(data.get('hours') || '').trim(),
        announcementEnable: String(data.get('announcementEnable') || 'false'),
        announcementText: String(data.get('announcementText') || '').trim(),
        announcementLink: String(data.get('announcementLink') || '').trim(),
        shippingStandard: Number(data.get('shippingStandard')) || 30000,
        shippingExpress: Number(data.get('shippingExpress')) || 45000,
        freeShippingThreshold: Number(data.get('freeShippingThreshold')) || 0,
        storeStatus: String(data.get('storeStatus') || 'open'),
        storeNotice: String(data.get('storeNotice') || '').trim(),
      };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
        toast('Đã lưu cài đặt web khách hàng thành công!');
      } catch (err) {
        if ($('#settings-error')) $('#settings-error').textContent = 'Không thể lưu cài đặt: ' + err.message;
      }
    });
  }
  const resetSettingsBtn = $('#reset-settings-button');
  if (resetSettingsBtn) {
    resetSettingsBtn.addEventListener('click', () => {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultWebSettings));
        populateWebSettingsForm();
        toast('Đã khôi phục cài đặt web khách hàng về mặc định.');
      } catch (err) {
        if ($('#settings-error')) $('#settings-error').textContent = err.message;
      }
    });
  }
  window.addEventListener('hashchange', () => navigate(true));
  window.addEventListener('macca:new-order', () => { state = api.reload(); render(); });
  window.addEventListener('storage', event => {
    if (event.key !== api.key && event.key !== null) return;
    document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
    state = api.reload(); render();
    toast('Dữ liệu đã thay đổi ở tab khác. Danh sách đã được cập nhật; hãy mở lại biểu mẫu nếu cần.');
  });
  $('#today').textContent = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  $('#article-grid').innerHTML = MaccaJournal.map(article => `<article><img src="${escape(article.image)}" alt="" width="250" height="175"><div><span class="eyebrow">${escape(article.label)}</span><h3>${escape(article.title)}</h3><p>${escape(article.description)}</p><a class="text-link" href="goc-macca.html?article=${encodeURIComponent(article.slug)}">Xem bài viết ↗</a></div></article>`).join('');
  // Ensure sidebar links activate navigation immediately on click
  document.querySelectorAll('.sidebar nav a[data-page]').forEach(link => {
    link.addEventListener('click', () => {
      setTimeout(() => navigate(false), 0);
    });
  });

  render(); navigate();
})();
