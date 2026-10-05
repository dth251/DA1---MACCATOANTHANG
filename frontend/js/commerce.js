'use strict';
(() => {
  const $ = selector => document.querySelector(selector);
  const { products, money, subtotal, shipping, count } = Macca;
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

    const user = window.MaccaApi?.getSession()?.user;
    if (user && $('#checkout-form')) {
      const form = $('#checkout-form');
      if (!form.elements.namedItem('name')?.value && (user.name || user.fullName)) form.elements.namedItem('name').value = user.name || user.fullName;
      if (!form.elements.namedItem('phone')?.value && user.phone) form.elements.namedItem('phone').value = user.phone;
      if (!form.elements.namedItem('email')?.value && user.email) form.elements.namedItem('email').value = user.email;
      if (!form.elements.namedItem('address')?.value && user.address) form.elements.namedItem('address').value = user.address;
    }
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
    const send = MaccaRequests.sender('consult');
    let sending = false;
    let pendingConsult = null;
    const topics = {
      personal: 'Sản phẩm dùng cá nhân / gia đình',
      gift: 'Quà tặng cá nhân / doanh nghiệp',
      wholesale: 'Đơn hàng số lượng lớn / đại lý',
      other: 'Nhu cầu khác'
    };

    const topic = new URLSearchParams(location.search).get('topic');
    if (['personal', 'gift', 'wholesale', 'other'].includes(topic)) {
      form.elements.namedItem('topic').value = topic;
    }

    const closeConsultModal = () => {
      const modal = $('#consult-confirm-modal');
      if (modal) {
        modal.hidden = true;
        modal.setAttribute('hidden', '');
        modal.style.display = 'none';
      }
    };

    $('#btn-consult-modal-close')?.addEventListener('click', closeConsultModal);
    $('#btn-consult-modal-cancel')?.addEventListener('click', closeConsultModal);
    $('#consult-confirm-modal')?.addEventListener('click', e => {
      if (e.target === $('#consult-confirm-modal')) closeConsultModal();
    });

    form.addEventListener('submit', event => {
      event.preventDefault();
      if (sending || consultText) return;
      if (!validate(form, ['name', 'message'], $('#consult-error'))) return;

      const data = new FormData(form);
      const get = name => String(data.get(name) || '').trim();

      const phone = get('phone');
      if (!phone || !/^\+?[0-9 ]{9,15}$/.test(phone)) {
        $('#consult-error').textContent = 'Vui lòng nhập số điện thoại hợp lệ gồm 9–15 chữ số.';
        form.elements.namedItem('phone')?.focus();
        return;
      }

      pendingConsult = {
        name: get('name'),
        phone: phone,
        email: get('email'),
        company: get('company'),
        topic: get('topic'),
        quantity: get('quantity') ? Number(get('quantity')) : null,
        budget: get('budget'),
        message: get('message'),
        consent: form.elements.namedItem('acknowledge')?.checked ?? true
      };

      if ($('#modal-consult-name')) $('#modal-consult-name').textContent = pendingConsult.name;
      if ($('#modal-consult-phone')) $('#modal-consult-phone').textContent = pendingConsult.phone;
      if ($('#modal-consult-email')) $('#modal-consult-email').textContent = pendingConsult.email || 'Chưa cung cấp';
      if ($('#modal-consult-company')) $('#modal-consult-company').textContent = pendingConsult.company || 'Cá nhân';
      if ($('#modal-consult-topic')) $('#modal-consult-topic').textContent = topics[pendingConsult.topic] || pendingConsult.topic;
      if ($('#modal-consult-qty')) $('#modal-consult-qty').textContent = pendingConsult.quantity ? (pendingConsult.quantity + ' sản phẩm') : 'Chưa xác định';
      if ($('#modal-consult-budget')) $('#modal-consult-budget').textContent = pendingConsult.budget || 'Chưa xác định';
      if ($('#modal-consult-msg')) $('#modal-consult-msg').textContent = pendingConsult.message;

      const modal = $('#consult-confirm-modal');
      if (modal) {
        modal.hidden = false;
        modal.removeAttribute('hidden');
        modal.style.display = 'flex';
      }
    });

    $('#btn-consult-modal-accept')?.addEventListener('click', async () => {
      if (sending || !pendingConsult) return;
      sending = true;
      closeConsultModal();

      let accepted;
      try {
        accepted = await send(form, {
          type: 'consult',
          consent: pendingConsult.consent,
          customer: {
            name: pendingConsult.name,
            phone: pendingConsult.phone,
            email: pendingConsult.email
          },
          topic: pendingConsult.topic,
          message: pendingConsult.message,
          details: {
            company: pendingConsult.company,
            quantity: pendingConsult.quantity,
            budget: pendingConsult.budget
          }
        });
      } catch (error) {
        $('#consult-error').textContent = error.message;
        sending = false;
        return;
      }
      sending = false;

      const dateStr = new Date(accepted.createdAt).toLocaleString('vi-VN');
      const hotlineStr = (window.OwnerContact && (window.OwnerContact.phoneDisplay || window.OwnerContact.phone)) || '0975.895.024';

      consultText = [
        '========================================',
        '      MACCA TOÀN THẮNG — YÊU CẦU TƯ VẤN',
        '========================================',
        'Mã yêu cầu:     ' + accepted.id,
        'Ngày gửi:       ' + dateStr,
        'Hotline hỗ trợ: ' + hotlineStr + ' | Website: maccatoanthang.com',
        '----------------------------------------',
        'Họ và tên:      ' + pendingConsult.name,
        'Số điện thoại:  ' + pendingConsult.phone,
        'Email:          ' + (pendingConsult.email || 'Không cung cấp'),
        'Doanh nghiệp:   ' + (pendingConsult.company || 'Cá nhân'),
        'Nhu cầu:        ' + (topics[pendingConsult.topic] || pendingConsult.topic),
        'Số lượng:       ' + (pendingConsult.quantity ? (pendingConsult.quantity + ' sản phẩm') : 'Chưa xác định'),
        'Ngân sách:      ' + pendingConsult.budget,
        '----------------------------------------',
        'NỘI DUNG YÊU CẦU:',
        pendingConsult.message,
        '========================================',
        'Đã tiếp nhận vào hộp thư quản trị Macca Toàn Thắng.'
      ].join('\n');

      if ($('#consult-inv-code')) $('#consult-inv-code').textContent = accepted.id;
      if ($('#consult-inv-date')) $('#consult-inv-date').textContent = dateStr;
      if ($('#consult-inv-name')) $('#consult-inv-name').textContent = pendingConsult.name;
      if ($('#consult-inv-phone')) $('#consult-inv-phone').textContent = pendingConsult.phone;
      if ($('#consult-inv-email')) $('#consult-inv-email').textContent = pendingConsult.email || 'Không cung cấp';
      if ($('#consult-inv-company')) $('#consult-inv-company').textContent = pendingConsult.company || 'Cá nhân';
      if ($('#consult-inv-topic')) $('#consult-inv-topic').textContent = topics[pendingConsult.topic] || pendingConsult.topic;
      const budgetDetail = [
        pendingConsult.quantity ? ('SL: ' + pendingConsult.quantity) : '',
        pendingConsult.budget ? ('Ngân sách: ' + pendingConsult.budget) : ''
      ].filter(Boolean).join(' · ') || 'Chưa xác định';
      if ($('#consult-inv-budget')) $('#consult-inv-budget').textContent = budgetDetail;
      if ($('#consult-inv-message')) $('#consult-inv-message').textContent = pendingConsult.message;

      if (window.OwnerContact?.applyToPage) window.OwnerContact.applyToPage();

      $('#consult-layout').hidden = true;
      if ($('#consult-intro')) $('#consult-intro').hidden = true;
      $('#consult-success').hidden = false;
      const dock = $('.owner-contact-dock');
      if (dock) dock.hidden = true;
      $('#consult-success').focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      notify('Gửi yêu cầu tư vấn thành công! Đã tạo phiếu tiếp nhận.');
    });

    $('#print-consult')?.addEventListener('click', () => {
      window.print();
    });

    $('#btn-copy-consult-code')?.addEventListener('click', () => {
      const code = $('#consult-inv-code')?.textContent;
      if (code && code !== '---') {
        navigator.clipboard?.writeText(code).then(() => {
          notify('Đã sao chép mã yêu cầu: ' + code);
        }).catch(() => {
          notify('Mã yêu cầu: ' + code);
        });
      }
    });

    $('#download-consult')?.addEventListener('click', () => {
      const code = $('#consult-inv-code')?.textContent || 'yeu-cau';
      if (consultText) Macca.download('macca-tu-van-' + code + '.txt', consultText);
    });

    $('#edit-consult')?.addEventListener('click', () => {
      consultText = '';
      pendingConsult = null;
      form.reset();
      $('#consult-layout').hidden = false;
      if ($('#consult-intro')) $('#consult-intro').hidden = false;
      $('#consult-success').hidden = true;
      const dock = $('.owner-contact-dock');
      if (dock) dock.hidden = false;
      form.elements.namedItem('name')?.focus();
    });
  }

  if (page === 'checkout') {
    const form = $('#checkout-form');
    const send = MaccaRequests.sender('order');
    let sending = false;
    let pendingOrder = null;

    form.addEventListener('submit', event => {
      event.preventDefault();
      if (orderText || sending) return;
      const latest = Macca.read();
      if (JSON.stringify(latest) !== JSON.stringify(cart)) {
        cart = latest; update();
        $('#checkout-error').textContent = 'Giỏ hàng vừa thay đổi. Vui lòng kiểm tra lại tổng tiền và xác nhận lần nữa.';
        notify('Giỏ hàng đã thay đổi. Vui lòng kiểm tra lại đơn hàng.');
        return;
      }
      if (!items().length) { update(); return; }
      if (!validate(form, ['name', 'province', 'ward', 'address'], $('#checkout-error'))) return;
      const data = new FormData(form);
      if (data.get('payment') !== 'cod' || !['standard', 'express'].includes(data.get('shipping'))) {
        $('#checkout-error').textContent = 'Phương thức giao hàng hoặc thanh toán không khả dụng.';
        return;
      }
      $('#checkout-error').textContent = '';

      const get = name => String(data.get(name) || '').trim();
      const method = get('shipping');
      const submittedItems = items().map(p => ({
        id: p.id,
        name: p.name,
        weight: p.weight,
        price: p.price,
        image: p.image,
        quantity: cart[p.id]
      }));
      const orderSubtotal = subtotal(cart);
      const orderShippingFee = shipping(cart, method);
      const orderGrandTotal = orderSubtotal + orderShippingFee;
      const fullAddress = [get('address'), get('ward'), get('province')].filter(Boolean).join(', ');

      // Lưu trữ dữ liệu đơn hàng chờ xác nhận
      pendingOrder = {
        get,
        method,
        submittedItems,
        orderSubtotal,
        orderShippingFee,
        orderGrandTotal,
        fullAddress
      };

      // Điền thông tin vào Hộp thoại xác nhận đặt đơn
      if ($('#modal-cust-name')) $('#modal-cust-name').textContent = get('name');
      if ($('#modal-cust-phone')) $('#modal-cust-phone').textContent = get('phone');
      if ($('#modal-cust-address')) $('#modal-cust-address').textContent = fullAddress;
      if ($('#modal-cust-note')) $('#modal-cust-note').textContent = get('note') || 'Không có';
      if ($('#modal-items-summary')) {
        $('#modal-items-summary').textContent = submittedItems.map(p => `${p.name} (${p.weight || '500g'}) × ${p.quantity}`).join('; ');
      }
      if ($('#modal-shipping-method')) {
        $('#modal-shipping-method').textContent = method === 'express' ? 'Nhanh (45.000 ₫)' : 'Tiêu chuẩn (30.000 ₫)';
      }
      if ($('#modal-grand-total')) $('#modal-grand-total').textContent = money(orderGrandTotal);

      // Mở hộp thoại xác nhận đặt đơn
      const modal = $('#order-confirm-modal');
      if (modal) {
        modal.hidden = false;
        modal.removeAttribute('hidden');
        modal.classList.add('is-open');
        modal.style.display = 'flex';
        $('#btn-modal-accept')?.focus();
      }
    });

    // Hàm thực hiện đặt hàng sau khi ấn Đồng ý
    async function executeOrder() {
      if (!pendingOrder || sending) return;
      const { get, method, submittedItems, orderSubtotal, orderShippingFee, orderGrandTotal, fullAddress } = pendingOrder;

      const acceptBtn = $('#btn-modal-accept');
      const cancelBtn = $('#btn-modal-cancel');
      if (acceptBtn) {
        acceptBtn.disabled = true;
        acceptBtn.innerHTML = 'Đang xử lý đặt đơn…';
      }
      if (cancelBtn) cancelBtn.disabled = true;
      sending = true;

      let accepted;
      try {
        accepted = await send(form, {
          type: 'order',
          consent: true,
          customer: {
            name: get('name'),
            phone: get('phone'),
            email: get('email'),
            address: get('address'),
            ward: get('ward'),
            province: get('province')
          },
          items: submittedItems,
          shipping: method,
          payment: get('payment'),
          message: get('note'),
          expectedTotal: orderGrandTotal
        });
      } catch (error) {
        closeModal();
        $('#checkout-error').textContent = error.message;
        notify('Lỗi đặt hàng: ' + error.message);
        return;
      } finally {
        sending = false;
        if (acceptBtn) {
          acceptBtn.disabled = false;
          acceptBtn.textContent = 'Đồng ý đặt hàng';
        }
        if (cancelBtn) cancelBtn.disabled = false;
      }

      // Đóng modal xác nhận
      closeModal();

      const orderId = accepted.id || accepted.orderId || ('DH-' + Date.now());
      const orderDate = new Date(accepted.createdAt || Date.now()).toLocaleString('vi-VN');
      const finalItems = (accepted.items && accepted.items.length) ? accepted.items : submittedItems;
      const finalShippingFee = accepted.shippingFee != null ? accepted.shippingFee : orderShippingFee;
      const finalTotal = accepted.total != null ? accepted.total : orderGrandTotal;

      // Xóa giỏ hàng sau khi đặt thành công
      cart = {};
      Macca.write(cart);
      update();

      // Điền thông tin vào Phiếu Thanh Toán
      if ($('#inv-order-id')) $('#inv-order-id').textContent = orderId;
      if ($('#inv-created-at')) $('#inv-created-at').textContent = orderDate;
      if ($('#inv-customer-name')) $('#inv-customer-name').textContent = get('name') || 'Khách hàng';
      if ($('#inv-customer-phone')) $('#inv-customer-phone').textContent = get('phone');
      if ($('#inv-customer-address')) $('#inv-customer-address').textContent = fullAddress;

      const noteRow = $('#inv-note-row');
      if (noteRow) {
        if (get('note')) {
          noteRow.hidden = false;
          if ($('#inv-customer-note')) $('#inv-customer-note').textContent = get('note');
        } else {
          if ($('#inv-customer-note')) $('#inv-customer-note').textContent = 'Không có';
        }
      }

      // Render danh sách sản phẩm trong hóa đơn (sạch sẽ, không icon ảnh thừa)
      const tbody = $('#inv-items-body');
      if (tbody) {
        tbody.innerHTML = finalItems.map((p, idx) => {
          const itemWeight = p.weight || (Macca.products.find(x => x.id === p.id)?.weight) || '500g';
          const itemPrice = p.price || (Macca.products.find(x => x.id === p.id)?.price) || 0;
          const itemTotal = itemPrice * p.quantity;
          return `<tr>
            <td class="td-stt">${idx + 1}</td>
            <td class="td-product">
              <div class="invoice-item-info">
                <p class="invoice-item-name">${p.name || p.id}</p>
                <p class="invoice-item-spec">${itemWeight}</p>
              </div>
            </td>
            <td class="td-unit-price">${money(itemPrice)}</td>
            <td class="td-quantity">${p.quantity}</td>
            <td class="td-total">${money(itemTotal)}</td>
          </tr>`;
        }).join('');
      }

      // Render tổng kết chi phí
      if ($('#inv-subtotal')) $('#inv-subtotal').textContent = money(orderSubtotal);
      if ($('#inv-shipping-method')) $('#inv-shipping-method').textContent = method === 'express' ? 'Nhanh (1–2 ngày)' : 'Tiêu chuẩn (3–5 ngày)';
      if ($('#inv-shipping-fee')) $('#inv-shipping-fee').textContent = money(finalShippingFee);
      if ($('#inv-grand-total')) $('#inv-grand-total').textContent = money(finalTotal);

      // Cập nhật text đơn hàng để download txt
      orderText = [
        '========================================================',
        '       CÔNG TY TNHH MACCA TOÀN THẮNG',
        '       PHIẾU XÁC NHẬN THANH TOÁN ĐƠN HÀNG (COD)',
        '========================================================',
        'Mã đơn hàng: ' + orderId,
        'Thời gian đặt: ' + orderDate,
        'Trạng thái: Đặt hàng thành công (Chờ giao hàng COD)',
        '--------------------------------------------------------',
        'THÔNG TIN KHÁCH HÀNG:',
        'Người nhận: ' + get('name'),
        'Số điện thoại: ' + get('phone'),
        'Địa chỉ giao: ' + fullAddress,
        'Email: ' + (get('email') || 'Không cung cấp'),
        'Ghi chú: ' + (get('note') || 'Không'),
        '--------------------------------------------------------',
        'CHI TIẾT ĐƠN HÀNG:',
        ...finalItems.map((p, i) => `${i + 1}. ${p.name || p.id} (${p.weight || '500g'}) - SL: ${p.quantity} x ${money(p.price || 0)} = ${money((p.price || 0) * p.quantity)}`),
        '--------------------------------------------------------',
        'Tạm tính: ' + money(orderSubtotal),
        'Vận chuyển (' + (method === 'express' ? 'Nhanh' : 'Tiêu chuẩn') + '): ' + money(finalShippingFee),
        'TỔNG CỘNG THANH TOÁN (COD): ' + money(finalTotal),
        'Phương thức thanh toán: Thanh toán khi nhận hàng (COD)',
        '========================================================',
        'Hotline hỗ trợ: ' + ((window.OwnerContact && (window.OwnerContact.phoneDisplay || window.OwnerContact.phone)) || '0975.895.024') + ' | Website: maccatoanthang.com'
      ].join('\n');

      if (window.OwnerContact?.applyToPage) window.OwnerContact.applyToPage();

      // Cập nhật Stepper sang bước 3 (Hoàn tất)
      const stepCheckout = $('#step-checkout');
      if (stepCheckout) {
        stepCheckout.classList.remove('current');
        stepCheckout.removeAttribute('aria-current');
      }
      const stepComplete = $('#step-complete');
      if (stepComplete) {
        stepComplete.classList.add('current');
        stepComplete.setAttribute('aria-current', 'step');
      }

      // CHUYỂN SANG GIAO DIỆN BILL ĐƠN HÀNG HIỂN THỊ ĐẶT ĐƠN THÀNH CÔNG
      form.hidden = true;
      $('#checkout-intro').hidden = true;
      $('#checkout-notice').hidden = true;
      $('#order-success').hidden = false;
      const dock = $('.owner-contact-dock');
      if (dock) dock.hidden = true;
      $('#order-success').focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      notify('Đặt hàng thành công! Đã tạo phiếu thanh toán.');
    }

    // Đóng hộp thoại xác nhận khi bấm Hủy / Đóng / Ra ngoài
    const closeModal = () => {
      const modal = $('#order-confirm-modal');
      if (modal) {
        modal.hidden = true;
        modal.setAttribute('hidden', '');
        modal.classList.remove('is-open');
        modal.style.display = 'none';
      }
    };
    $('#btn-modal-close')?.addEventListener('click', closeModal);
    $('#btn-modal-cancel')?.addEventListener('click', closeModal);
    $('#btn-modal-accept')?.addEventListener('click', executeOrder);
    $('#order-confirm-modal')?.addEventListener('click', e => {
      if (e.target === $('#order-confirm-modal')) closeModal();
    });

    // In phiếu thanh toán (Print bill)
    const printBtn = $('#print-order');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }

    // Sao chép mã đơn hàng
    const copyBtn = $('#btn-copy-order-id');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const code = $('#inv-order-id')?.textContent;
        if (code && code !== '---') {
          navigator.clipboard?.writeText(code).then(() => {
            notify('Đã sao chép mã đơn hàng: ' + code);
          }).catch(() => {
            notify('Mã đơn hàng: ' + code);
          });
        }
      });
    }

    // Tải phiếu đơn hàng file .txt
    const downloadBtn = $('#download-order');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        const orderId = $('#inv-order-id')?.textContent || 'don-hang';
        if (orderText) Macca.download('macca-don-hang-' + orderId + '.txt', orderText);
      });
    }
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
  window.addEventListener('macca:products-loaded', () => { update(); });
  $('#year').textContent = new Date().getFullYear();
  update();
})();
