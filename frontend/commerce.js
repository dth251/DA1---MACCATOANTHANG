'use strict';
(() => {
  const $ = selector => document.querySelector(selector);
  const {products, money, subtotal, shipping, count} = Macca;
  const page = document.body.dataset.page;
  let cart = Macca.read();
  let consultText = '', orderText = '', toastTimer;
  const items = () => products.filter(product => cart[product.id]);
  const shippingMethod = () => $('[name="shipping"]:checked')?.value || 'standard';

  function notify(message) {
    $('#toast').textContent = message;
    $('#toast').classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3500);
  }

  function costs(method = 'standard') {
    return `<div class="cost-line"><span>Tạm tính (${count(cart)} sản phẩm)</span><span>${money(subtotal(cart))}</span></div>
      <div class="cost-line"><span>Phí giao hàng mẫu</span><span>${money(shipping(cart, method))}</span></div>
      <div class="cost-line cost-total"><span>Tổng cộng</span><strong>${money(subtotal(cart) + shipping(cart, method))}</strong></div>`;
  }

  function update() {
    $('#cart-count').textContent = count(cart);
    if (page === 'cart') renderCart();
    if (page === 'checkout') renderCheckout();
  }

  function save() {
    const ok = Macca.write(cart);
    $('#storage-warning').hidden = ok;
    if (!ok) notify('Không thể lưu giỏ hàng. Vui lòng cho phép lưu dữ liệu trang web.');
    update();
  }

  function renderCart() {
    const empty = items().length === 0;
    $('#cart-layout').hidden = empty;
    $('#cart-empty').hidden = !empty;
    $('#basket-items').innerHTML = `<div class="cart-table-head"><span>SẢN PHẨM</span><span>SỐ LƯỢNG</span><span>THÀNH TIỀN</span></div>` + items().map(p => `
      <article class="basket-item"><div class="basket-product"><img src="${p.image}" alt="Ảnh minh họa ${p.name}" width="90" height="100"><div><h3>${p.name}</h3><p>${p.weight} · ${money(p.price)}</p><button class="remove-button" data-remove="${p.id}" aria-label="Xóa ${p.name}">Xóa sản phẩm</button></div></div>
      <div class="step-input"><button data-step="${p.id}" data-delta="-1" aria-label="Giảm số lượng ${p.name}" ${cart[p.id] <= 1 ? 'disabled' : ''}>−</button><input data-quantity="${p.id}" type="number" min="1" max="99" step="1" value="${cart[p.id]}" aria-label="Số lượng ${p.name}"><button data-step="${p.id}" data-delta="1" aria-label="Tăng số lượng ${p.name}" ${cart[p.id] >= 99 ? 'disabled' : ''}>+</button></div><strong>${money(p.price * cart[p.id])}</strong></article>`).join('') +
      '<div class="cart-foot"><a class="text-link" href="san-pham.html">← Tiếp tục mua sắm</a><span>Giỏ hàng được lưu trên trình duyệt của bạn.</span></div>';
    $('#basket-summary').innerHTML = costs() + '<a class="button" href="thanh-toan.html">Tiến hành thanh toán <span>↗</span></a>';
    $('#recommendations').innerHTML = products.filter(p => !cart[p.id]).slice(0, 3).map(p => `<article class="mini-product"><img src="${p.image}" alt="Ảnh minh họa ${p.name}" width="66" height="75"><div><h3>${p.name}</h3><p>${money(p.price)}</p></div><button class="add-button" data-add="${p.id}" aria-label="Thêm ${p.name} vào giỏ">+</button></article>`).join('');
    $('.recommendations').hidden = products.every(p => cart[p.id]);
  }

  function renderCheckout() {
    if (orderText) return;
    const empty = items().length === 0;
    $('#checkout-empty').hidden = !empty;
    $('#checkout-form').hidden = empty;
    $('#place-order').disabled = empty;
    $('#checkout-items').innerHTML = items().map(p => `<div class="order-item"><img src="${p.image}" alt="Ảnh minh họa ${p.name}" width="48" height="55"><div><h3>${p.name}</h3><p>${p.weight} · Số lượng: ${cart[p.id]}</p></div><strong>${money(p.price * cart[p.id])}</strong></div>`).join('');
    $('#checkout-summary').innerHTML = costs(shippingMethod());
  }

  // Validate trimmed values as well as native form constraints.
  function validate(form, requiredNames, error) {
    error.textContent = '';
    if (!form.reportValidity()) return false;
    for (const name of requiredNames) {
      const field = form.elements.namedItem(name);
      const minimum = field.minLength > 0 ? field.minLength : 1;
      if (field.value.trim().length < minimum) {
        error.textContent = 'Vui lòng nhập đầy đủ nội dung, không chỉ gồm khoảng trắng.';
        field.focus();
        return false;
      }
    }
    const phone = form.elements.namedItem('phone');
    if (!/^\+?\d{9,15}$/.test(phone.value.replace(/ /g, ''))) {
      error.textContent = 'Vui lòng nhập số điện thoại gồm 9–15 chữ số, có thể bắt đầu bằng +.';
      phone.focus();
      return false;
    }
    return true;
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const id = button.dataset.add || button.dataset.remove || button.dataset.step;
    if (!id || !products.some(p => p.id === id)) return;
    // Read current shared data before changing quantities to avoid stale-tab writes.
    cart = Macca.read();
    if (button.dataset.remove) {
      delete cart[id]; save(); notify('Đã xóa sản phẩm khỏi giỏ hàng.');
      ($('#basket-items button') || $('#cart-empty a'))?.focus();
    }
    if (button.dataset.add) {
      cart[id] = Math.min(99, (cart[id] || 0) + 1); save();
      notify('Đã thêm sản phẩm vào giỏ hàng.');
      $(`[data-quantity="${id}"]`)?.focus();
    }
    if (button.dataset.step && cart[id]) {
      cart[id] = Math.min(99, Math.max(1, cart[id] + Number(button.dataset.delta)));
      const delta = button.dataset.delta;
      save();
      const next = $(`[data-step="${id}"][data-delta="${delta}"]`);
      if (next && !next.disabled) next.focus(); else $(`[data-quantity="${id}"]`)?.focus();
    }
  });

  document.addEventListener('change', event => {
    const id = event.target.dataset.quantity;
    if (id && products.some(p => p.id === id)) {
      const quantity = Number(event.target.value);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        notify('Số lượng cần là số nguyên từ 1 đến 99.');
        event.target.value = cart[id] || 1;
        return;
      }
      cart = Macca.read(); cart[id] = quantity; save();
      $(`[data-quantity="${id}"]`)?.focus();
    }
    if (event.target.name === 'shipping') renderCheckout();
  });

  if (page === 'consult') {
    const form = $('#consult-form');
    const topic = new URLSearchParams(location.search).get('topic');
    if (['personal', 'gift', 'wholesale', 'other'].includes(topic)) form.elements.namedItem('topic').value = topic;
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!validate(form, ['name', 'message'], $('#consult-error'))) return;
      const data = new FormData(form);
      const get = name => String(data.get(name) || '').trim();
      const topics = {personal:'Sản phẩm dùng cá nhân / gia đình',gift:'Quà tặng cá nhân / doanh nghiệp',wholesale:'Đơn hàng số lượng lớn / đại lý',other:'Nhu cầu khác'};
      consultText = ['MACCA TOÀN THẮNG — YÊU CẦU TƯ VẤN (CHƯA GỬI)', 'Ngày tạo: ' + new Date().toLocaleString('vi-VN'), '', 'Họ tên: ' + get('name'), 'Điện thoại: ' + get('phone'), 'Email: ' + (get('email') || 'Không cung cấp'), 'Doanh nghiệp: ' + (get('company') || 'Không cung cấp'), 'Nhu cầu: ' + topics[get('topic')], 'Số lượng dự kiến: ' + (get('quantity') || 'Chưa xác định'), 'Ngân sách: ' + get('budget'), '', 'Nội dung: ' + get('message'), '', 'Bản mẫu tạo trên thiết bị. Chưa gửi tới cửa hàng.'].join('\n');
      $('#consult-receipt').textContent = consultText;
      $('#consult-layout').hidden = true;
      $('#consult-success').hidden = false;
      $('#consult-success').focus();
    });
    $('#edit-consult').addEventListener('click', () => {
      $('#consult-layout').hidden = false; $('#consult-success').hidden = true;
      form.elements.namedItem('name').focus();
    });
    $('#download-consult').addEventListener('click', () => {
      if (consultText) Macca.download('macca-yeu-cau-tu-van.txt', consultText);
    });
  }

  if (page === 'checkout') {
    const form = $('#checkout-form');
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (orderText) return;
      const latest = Macca.read();
      if (JSON.stringify(latest) !== JSON.stringify(cart)) {
        cart = latest; update();
        $('#checkout-error').textContent = 'Giỏ hàng vừa thay đổi. Vui lòng kiểm tra lại tổng tiền và xác nhận lần nữa.';
        notify('Giỏ hàng đã thay đổi. Vui lòng kiểm tra lại đơn hàng.');
        return;
      }
      if (!items().length) { update(); return; }
      if (!validate(form, ['name','province','ward','address'], $('#checkout-error'))) return;
      const data = new FormData(form);
      if (data.get('payment') !== 'cod' || !['standard','express'].includes(data.get('shipping'))) {
        $('#checkout-error').textContent = 'Phương thức giao hàng hoặc thanh toán không khả dụng.';
        return;
      }
      const get = name => String(data.get(name) || '').trim();
      orderText = ['MACCA TOÀN THẮNG — ĐƠN HÀNG MẪU (CHƯA GỬI)', 'Ngày tạo: ' + new Date().toLocaleString('vi-VN'), '', 'NGƯỜI NHẬN', get('name') + ' · ' + get('phone'), [get('address'),get('ward'),get('province')].join(', '), 'Email: ' + (get('email') || 'Không cung cấp'), '', 'SẢN PHẨM', ...items().map(p => `${p.name} (${p.weight}) × ${cart[p.id]}: ${money(p.price * cart[p.id])}`), '', 'Tạm tính: ' + money(subtotal(cart)), 'Giao hàng: ' + (shippingMethod() === 'express' ? 'Nhanh' : 'Tiêu chuẩn'), 'Phí giao hàng mẫu: ' + money(shipping(cart, shippingMethod())), 'TỔNG CỘNG: ' + money(subtotal(cart) + shipping(cart, shippingMethod())), 'Phương thức: Thanh toán khi nhận hàng (COD) — mô phỏng', 'Ghi chú: ' + (get('note') || 'Không'), '', 'Chưa gửi đơn đến cửa hàng. Chưa thanh toán. Giá và phí là dữ liệu mẫu.'].join('\n');
      $('#order-receipt').textContent = orderText;
      form.hidden = true; $('#checkout-intro').hidden = true; $('#checkout-notice').hidden = true;
      $('#order-success').hidden = false; $('#order-success').focus();
    });
    $('#download-order').addEventListener('click', () => {
      if (orderText) Macca.download('macca-don-hang-mau.txt', orderText);
    });
  }

  window.addEventListener('storage', event => {
    if (event.key !== Macca.key && event.key !== null) return;
    cart = Macca.read(); update();
    if (page === 'checkout' && !orderText) {
      const consent = $('[name="acknowledge"]');
      if (consent) consent.checked = false;
      notify('Giỏ hàng đã thay đổi ở tab khác. Vui lòng kiểm tra lại đơn.');
    }
  });
  window.addEventListener('pageshow', () => { cart = Macca.read(); update(); });
  $('#year').textContent = new Date().getFullYear();
  update();
})();
