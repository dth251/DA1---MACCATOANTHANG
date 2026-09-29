'use strict';
/**
 * MaccaRequests - Pure frontend client request & order router.
 * Lưu trữ độc lập trên Client Storage (localStorage).
 * - payload.type === 'order': Định tuyến sang kho Đơn Hàng Admin (MaccaAdmin orders - 'macca-toan-thang-admin-v1')
 * - payload.type === 'consult' | 'contact': Định tuyến sang Yêu Cầu Khách (macca-client-requests)
 */
window.MaccaRequests = (() => {
  const STORAGE_KEY = 'macca-client-requests';
  const ADMIN_STORAGE_KEY = 'macca-toan-thang-admin-v1';

  function getAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveAll(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Không thể ghi nhận yêu cầu vào localStorage:', e);
    }
  }

  function routeOrderToAdmin(payload) {
    try {
      let adminState = null;
      const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
      if (raw) {
        adminState = JSON.parse(raw);
      }
      if (!adminState || !Array.isArray(adminState.orders)) {
        adminState = {
          version: 1,
          revision: 1,
          products: (typeof Macca !== 'undefined' && Macca.products)
            ? Macca.products.map(p => ({ ...p, stock: null, active: true }))
            : [],
          orders: []
        };
      }

      const orderId = 'DH-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);

      let orderItems = [];
      if (Array.isArray(payload.items) && payload.items.length > 0) {
        orderItems = payload.items.map(item => {
          const prod = (typeof Macca !== 'undefined' && Macca.products) ? Macca.products.find(p => p.id === item.id) : null;
          return {
            id: item.id,
            name: item.name || prod?.name || 'Sản phẩm Macca',
            weight: item.weight || prod?.weight || '500g',
            price: Number(item.price || prod?.price || 185000),
            quantity: Number(item.quantity) || 1
          };
        });
      } else {
        orderItems = [
          { id: 'macca-natural', name: payload.topic || 'Macca sấy mộc', weight: '500g', price: 185000, quantity: 1 }
        ];
      }

      let shippingFee = 30000;
      if (typeof payload.shipping === 'number') {
        shippingFee = payload.shipping;
      } else if (payload.shipping === 'express') {
        shippingFee = 45000;
      } else if (payload.shipping === 'standard') {
        shippingFee = 30000;
      }

      let fullAddress = '';
      if (payload.customer?.address) {
        const parts = [payload.customer.address, payload.customer.ward, payload.customer.province].filter(Boolean);
        fullAddress = parts.join(', ');
      } else {
        fullAddress = 'Tại cửa hàng / Chưa nhập địa chỉ';
      }

      const newOrder = {
        id: orderId,
        createdAt: new Date().toISOString(),
        status: 'pending',
        customer: {
          name: payload.customer?.name || 'Khách hàng',
          phone: payload.customer?.phone || '',
          email: payload.customer?.email || '',
          address: fullAddress
        },
        items: orderItems,
        shipping: shippingFee,
        note: payload.message || payload.note || ''
      };

      adminState.orders.unshift(newOrder);
      adminState.revision = (adminState.revision || 0) + 1;
      localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(adminState));

      // Phát sự kiện cập nhật giao diện admin nếu tab admin đang mở
      window.dispatchEvent(new CustomEvent('macca:new-order', { detail: newOrder }));
      try {
        localStorage.setItem('macca-admin-order-event', JSON.stringify({ action: 'new-order', orderId, nonce: crypto.randomUUID() }));
      } catch {}

      return {
        ok: true,
        orderId: orderId,
        id: orderId,
        createdAt: newOrder.createdAt,
        message: 'Đơn hàng của quý khách đã được ghi nhận thành công vào hệ thống Quản lý đơn hàng!'
      };
    } catch (err) {
      console.error('Lỗi định tuyến đơn hàng sang admin:', err);
      return { ok: false, message: err.message };
    }
  }

  async function submitRequest(payload) {
    await new Promise(r => setTimeout(r, 60));

    if (payload.type === 'order') {
      const res = routeOrderToAdmin(payload);
      return {
        ok: res.ok,
        id: res.orderId,
        createdAt: res.createdAt,
        message: res.message
      };
    }

    const current = getAll();
    const prefix = payload.type === 'consult' ? 'YC-TV' : 'YC-LN';
    const year = new Date().getFullYear();
    const id = `${prefix}-${year}-${String(current.length + 1).padStart(3, '0')}`;

    const newRequest = {
      id,
      type: payload.type || 'consult',
      topic: payload.topic || (payload.type === 'consult' ? 'Yêu cầu tư vấn sản phẩm' : 'Lời nhắn khách hàng'),
      status: 'new',
      revision: 1,
      createdAt: new Date().toISOString(),
      customer: {
        name: payload.customer?.name || 'Khách vãng lai',
        phone: payload.customer?.phone || '',
        email: payload.customer?.email || ''
      },
      details: payload.details || {},
      message: payload.message || ''
    };

    current.unshift(newRequest);
    saveAll(current);

    window.dispatchEvent(new CustomEvent('macca:new-request', { detail: newRequest }));
    try {
      localStorage.setItem('macca-admin-inbox-event', JSON.stringify({ action: 'new-request', id, nonce: crypto.randomUUID() }));
    } catch {}

    return {
      ok: true,
      id,
      createdAt: newRequest.createdAt,
      message: 'Yêu cầu đã được gửi thành công! Đội ngũ Macca Toàn Thắng sẽ liên hệ sớm nhất.'
    };
  }

  function sender(kind) {
    let busy = false;
    return async (form, payload) => {
      if (busy) throw new Error('Yêu cầu đang được gửi. Vui lòng chờ trong giây lát.');
      busy = true;
      const button = form.querySelector('[type="submit"]');
      const original = button ? button.textContent : '';
      if (button) {
        button.disabled = true;
        button.textContent = 'Đang gửi…';
      }
      try {
        const result = await submitRequest({ ...payload, type: payload.type || kind });
        if (!result.ok) throw new Error(result.message || 'Không thể gửi yêu cầu.');
        return {
          id: result.id,
          createdAt: result.createdAt || new Date().toISOString(),
          type: payload.type || kind,
          customer: payload.customer,
          items: payload.items,
          status: 'pending',
          ...result
        };
      } finally {
        busy = false;
        if (button) {
          button.disabled = false;
          button.textContent = original;
        }
      }
    };
  }

  return {
    getAll,
    submitRequest,
    sender,
    async request(url, options = {}) {
      return { ok: true };
    }
  };
})();
