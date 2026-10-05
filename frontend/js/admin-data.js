'use strict';
window.MaccaAdmin = (() => {
  const key = 'macca-toan-thang-admin-v1';
  const categories = { shell: 'Macca nguyên vỏ', kernel: 'Nhân macca', gift: 'Quà tặng' };
  const statuses = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', shipping: 'Đang giao', completed: 'Hoàn thành', cancelled: 'Đã hủy' };
  const images = ['assets/macca-natural.png', 'assets/macca-kernel.png', 'assets/macca-roasted.png', 'assets/macca-gift.png'];
  const clone = value => JSON.parse(JSON.stringify(value));
  const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
  const text = (value, min, max) => typeof value === 'string' && value.trim().length >= min && value.length <= max;
  const validId = value => typeof value === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(value);
  const validProduct = p => p && validId(p.id) && text(p.name, 1, 120) && Object.hasOwn(categories, p.category) && images.includes(p.image) && text(p.weight, 1, 60) && integer(p.price, 1000, 100000000) && p.price % 1000 === 0 && (p.stock === null || integer(p.stock, 0, 1000000)) && typeof p.active === 'boolean' && text(p.badge, 0, 60) && text(p.ingredients, 0, 250) && text(p.description, 0, 2000);
  function validOrder(o) {
    return o && validId(o.id) && text(o.createdAt, 1, 40) && Number.isFinite(Date.parse(o.createdAt)) && Object.hasOwn(statuses, o.status) && o.customer && text(o.customer.name, 1, 100) && typeof o.customer.phone === 'string' && /^\+?\d{9,15}$/.test(o.customer.phone) && text(o.customer.email, 0, 254) && (!o.customer.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.customer.email)) && text(o.customer.address, 1, 300) && text(o.note, 0, 1000) && integer(o.shipping, 0, 1000000) && Array.isArray(o.items) && o.items.length > 0 && o.items.length <= 50 && o.items.every(i => i && validId(i.id) && text(i.name, 1, 120) && text(i.weight, 1, 60) && integer(i.price, 1000, 100000000) && integer(i.quantity, 1, 99));
  }
  function validState(s) {
    return s && s.version === 1 && integer(s.revision, 0, Number.MAX_SAFE_INTEGER) && Array.isArray(s.products) && s.products.length <= 1000 && s.products.every(validProduct) && new Set(s.products.map(p => p.id)).size === s.products.length && Array.isArray(s.orders) && s.orders.length <= 10000 && s.orders.every(validOrder) && new Set(s.orders.map(o => o.id)).size === s.orders.length;
  }
  const defaultOrders = [];
  const initial = () => ({ version: 1, revision: 0, products: Macca.products.map(p => ({ ...p, stock: null, active: true })), orders: defaultOrders });
  let snapshot = initial();
  let storageToken = null;
  let loadError = '';
  function reload() {
    try {
      const raw = localStorage.getItem(key);
      let data;
      if (raw === null || /[\uFFFD]|Ã[¡\s]|áº|á»|Ä‘/.test(raw)) {
        data = initial();
        try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
      } else {
        data = JSON.parse(raw);
        // Tự động xóa các đơn hàng mẫu (DH-2609-*) nếu còn lưu trong bộ nhớ trình duyệt
        if (data && Array.isArray(data.orders)) {
          const cleaned = data.orders.filter(o => !o.id || !o.id.startsWith('DH-2609-'));
          if (cleaned.length !== data.orders.length) {
            data.orders = cleaned;
            try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
          }
        }
      }
      if (!validState(data)) throw new Error('invalid');
      snapshot = data;
      storageToken = raw;
      loadError = '';
    } catch {
      loadError = 'Không thể đọc dữ liệu quản lý đã lưu. Dữ liệu hiện có được giữ nguyên; hãy kiểm tra quyền lưu trữ của trình duyệt trước khi chỉnh sửa.';
    }
    return clone(snapshot);
  }
  function commit(next) {
    if (loadError) throw new Error(loadError);
    if (!validState(next)) throw new Error('Dữ liệu không hợp lệ. Vui lòng kiểm tra lại các trường thông tin.');
    let current;
    try { current = localStorage.getItem(key); } catch { throw new Error('Trình duyệt đang chặn đọc dữ liệu. Chưa lưu thay đổi.'); }
    if (current !== storageToken) {
      reload();
      throw new Error('Dữ liệu đã thay đổi ở tab khác. Hãy đóng biểu mẫu, tải lại trang và thực hiện lại.');
    }
    const saved = clone(next);
    saved.revision = snapshot.revision + 1;
    const raw = JSON.stringify(saved);
    try { localStorage.setItem(key, raw); } catch { throw new Error('Không thể lưu dữ liệu. Bộ nhớ có thể đã đầy hoặc bị chặn. Chưa lưu thay đổi.'); }
    snapshot = saved;
    storageToken = raw;
    return clone(snapshot);
  }
  async function syncBackend() {
    if (!window.MaccaApi?.request) return;
    const session = window.MaccaApi.getSession();
    if (!session?.accessToken && !session?.token) return;

    try {
      const [prodData, orderData, userData, artData] = await Promise.allSettled([
        window.MaccaApi.request('/api/admin/products?limit=100', { auth: true }),
        window.MaccaApi.request('/api/admin/orders?limit=100', { auth: true }),
        window.MaccaApi.request('/api/admin/users?limit=100', { auth: true }),
        window.MaccaApi.request('/api/admin/articles?limit=100', { auth: true })
      ]);

      let hasUpdate = false;
      const next = clone(snapshot);

      if (prodData.status === 'fulfilled' && Array.isArray(prodData.value?.items)) {
        const remoteProds = prodData.value.items.map(p => ({
          id: p.id,
          name: p.name,
          category: typeof p.category === 'string' ? p.category.toLowerCase() : 'shell',
          image: p.image || 'assets/macca-natural.png',
          weight: p.weight || '500 g',
          price: p.price,
          stock: p.stock ?? null,
          active: p.active !== false,
          badge: p.badge || '',
          ingredients: p.ingredients || '',
          description: p.description || ''
        }));
        if (remoteProds.length > 0) {
          next.products = remoteProds;
          hasUpdate = true;
        }
      }

      if (orderData.status === 'fulfilled' && Array.isArray(orderData.value?.items)) {
        const remoteOrders = orderData.value.items.map(o => ({
          id: o.id,
          createdAt: o.createdAt,
          status: typeof o.status === 'string' ? o.status.toLowerCase() : 'pending',
          customer: {
            name: o.user?.name || o.customer?.name || 'Khách hàng',
            phone: o.user?.phone || o.customer?.phone || '',
            email: o.user?.email || o.customer?.email || '',
            address: o.user?.address || o.customer?.address || ''
          },
          user: o.user,
          userId: o.user?.id,
          isRegistered: !!(o.user && o.user.id),
          items: Array.isArray(o.items) ? o.items.map(i => ({
            id: i.id,
            name: i.name || 'Sản phẩm Macca',
            weight: i.weight || '500g',
            price: i.price,
            quantity: i.quantity
          })) : [],
          shipping: o.shippingFee ?? o.shipping ?? 30000,
          total: o.total,
          note: o.note || ''
        }));
        next.orders = remoteOrders;
        hasUpdate = true;
      }

      if (userData.status === 'fulfilled' && Array.isArray(userData.value?.items)) {
        next.registeredUsers = userData.value.items;
        hasUpdate = true;
      }

      if (artData.status === 'fulfilled' && Array.isArray(artData.value?.items)) {
        next.articles = artData.value.items.map(a => ({
          ...a,
          published: a.published !== false
        }));
        hasUpdate = true;
      }

      if (hasUpdate) {
        commit(next);
        window.dispatchEvent(new CustomEvent('macca:new-order'));
        window.dispatchEvent(new CustomEvent('macca:articles-synced'));
      }
    } catch (err) {
      console.warn('Lỗi khi đồng bộ dữ liệu quản trị từ máy chủ:', err.message);
    }
  }

  async function saveProduct(product) {
    if (!validProduct(product)) throw new Error('Kiểm tra tên, quy cách, giá bán và tồn kho của sản phẩm.');
    
    // Call backend API if authenticated
    if (window.MaccaApi?.request && (window.MaccaApi.getSession()?.accessToken || window.MaccaApi.getSession()?.token)) {
      try {
        const exists = snapshot.products.some(p => p.id === product.id);
        const method = exists ? 'PUT' : 'POST';
        const url = exists ? '/api/admin/products/' + encodeURIComponent(product.id) : '/api/admin/products';
        await window.MaccaApi.request(url, { method, body: product, auth: true });
      } catch (err) {
        if (err.status && err.status !== 500) throw err;
        console.warn('Backend chưa sẵn sàng khi lưu sản phẩm, cập nhật bộ nhớ cục bộ:', err.message);
      }
    }

    const next = clone(snapshot);
    const index = next.products.findIndex(p => p.id === product.id);
    if (index < 0) next.products.push(clone(product)); else next.products[index] = clone(product);
    return commit(next);
  }

  async function deleteProduct(id) {
    if (window.MaccaApi?.request && (window.MaccaApi.getSession()?.accessToken || window.MaccaApi.getSession()?.token)) {
      try {
        await window.MaccaApi.request('/api/admin/products/' + encodeURIComponent(id), { method: 'DELETE', auth: true });
      } catch (err) {
        if (err.status && err.status !== 500) throw err;
        console.warn('Backend chưa sẵn sàng khi xóa sản phẩm, cập nhật bộ nhớ cục bộ:', err.message);
      }
    }

    const next = clone(snapshot);
    next.products = next.products.filter(p => p.id !== id);
    return commit(next);
  }

  async function createOrder(customer, lines, shipping, note) {
    const quantities = new Map();
    for (const line of lines) {
      if (!integer(line.quantity, 1, 99)) throw new Error('Số lượng mỗi sản phẩm phải là số nguyên từ 1 đến 99.');
      quantities.set(line.id, (quantities.get(line.id) || 0) + line.quantity);
    }
    const items = [...quantities].map(([id, quantity]) => {
      const product = snapshot.products.find(p => p.id === id && p.active);
      if (!product) throw new Error('Sản phẩm không còn khả dụng. Vui lòng chọn lại.');
      if (quantity > 99) throw new Error('Tổng số lượng mỗi sản phẩm không được vượt quá 99.');
      return { id, name: product.name, weight: product.weight, price: product.price, quantity };
    });

    let createdId = 'TT-' + crypto.randomUUID().slice(0, 8).toUpperCase();
    let createdAt = new Date().toISOString();

    if (window.MaccaApi?.request && (window.MaccaApi.getSession()?.accessToken || window.MaccaApi.getSession()?.token)) {
      try {
        const res = await window.MaccaApi.request('/api/admin/orders', {
          method: 'POST',
          body: {
            user: {
              name: customer.name,
              phone: customer.phone.replace(/\D/g, '') || '0900000000',
              email: customer.email || '',
              address: customer.address
            },
            items: items.map(i => ({ id: i.id, quantity: i.quantity })),
            shippingFee: shipping,
            note: note || ''
          },
          auth: true
        });
        if (res?.id) createdId = res.id;
        if (res?.createdAt) createdAt = res.createdAt;
      } catch (err) {
        if (err.status && err.status !== 500) throw err;
        console.warn('Backend chưa sẵn sàng khi tạo đơn hàng, lưu bộ nhớ cục bộ:', err.message);
      }
    }

    const order = { id: createdId, createdAt, customer: clone(customer), items, shipping, note, status: 'pending' };
    if (!validOrder(order)) throw new Error('Kiểm tra thông tin khách hàng, số điện thoại, email, sản phẩm và phí giao hàng.');
    const next = clone(snapshot);
    next.orders.unshift(order);
    return commit(next);
  }

  async function updateStatus(id, status) {
    if (!Object.hasOwn(statuses, status)) throw new Error('Trạng thái không hợp lệ.');

    if (window.MaccaApi?.request && (window.MaccaApi.getSession()?.accessToken || window.MaccaApi.getSession()?.token)) {
      try {
        await window.MaccaApi.request('/api/admin/orders/' + encodeURIComponent(id) + '/status', {
          method: 'PATCH',
          body: { status },
          auth: true
        });
      } catch (err) {
        if (err.status && err.status !== 500) throw err;
        console.warn('Backend chưa sẵn sàng khi cập nhật trạng thái đơn, lưu bộ nhớ cục bộ:', err.message);
      }
    }

    const next = clone(snapshot);
    const order = next.orders.find(o => o.id === id);
    if (!order) throw new Error('Không tìm thấy đơn hàng.');
    order.status = status;
    return commit(next);
  }

  const total = order => (typeof order.total === 'number' && order.total > 0) ? order.total : order.items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1), Number(order.shipping) || 0);

  function customers(orders) {
    const grouped = new Map();
    const regUsers = snapshot.registeredUsers || [];

    // 1. Seed registered users from database
    for (const u of regUsers) {
      const key = (u.phone || String(u.id)).trim();
      if (key) {
        grouped.set(key, {
          name: u.name || 'Khách hàng',
          phone: u.phone || '',
          email: u.email || '',
          address: u.address || '',
          isRegistered: true,
          userId: u.id,
          role: u.role || 'USER',
          orders: 0,
          completed: 0,
          orderList: []
        });
      }
    }

    // 2. Aggregate orders
    for (const order of [...orders].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))) {
      const phone = (order.customer?.phone || order.user?.phone || 'unknown').trim();
      if (!grouped.has(phone)) {
        grouped.set(phone, {
          name: order.customer?.name || order.user?.name || 'Khách vãng lai',
          phone: order.customer?.phone || '',
          email: order.customer?.email || order.user?.email || '',
          address: order.customer?.address || order.user?.address || '',
          isRegistered: !!(order.isRegistered || order.user?.id),
          userId: order.userId || order.user?.id || null,
          orders: 0,
          completed: 0,
          orderList: []
        });
      }
      const customer = grouped.get(phone);
      if (order.isRegistered || order.user?.id) {
        customer.isRegistered = true;
        customer.userId = order.userId || order.user?.id;
      }
      if (!customer.address && order.customer?.address) {
        customer.address = order.customer.address;
      }
      customer.orders++;
      customer.orderList.push(order);
      if (order.status === 'completed') {
        customer.completed += total(order);
      }
    }

    return [...grouped.values()];
  }

  async function getArticles() {
    if (window.MaccaApi?.request) {
      try {
        const session = window.MaccaApi.getSession();
        const hasAuth = !!(session?.accessToken || session?.token);
        const url = hasAuth ? '/api/admin/articles?limit=100' : '/api/articles?limit=100';
        const res = await window.MaccaApi.request(url, hasAuth ? { auth: true } : {});
        const items = res?.items || (Array.isArray(res) ? res : []);
        if (items.length > 0) {
          const next = clone(snapshot);
          next.articles = items.map(a => ({
            ...a,
            published: a.published !== false
          }));
          commit(next);
          return next.articles;
        }
      } catch (e) {}
    }
    if (snapshot.articles && snapshot.articles.length > 0) {
      return snapshot.articles;
    }
    return (typeof MaccaJournal !== 'undefined') ? MaccaJournal.map(a => ({ ...a, published: a.published !== false })) : [];
  }

  async function saveArticle(articleData, slug) {
    let saved = null;
    if (window.MaccaApi?.request && (window.MaccaApi.getSession()?.accessToken || window.MaccaApi.getSession()?.token)) {
      try {
        const method = slug ? 'PUT' : 'POST';
        const url = slug ? '/api/admin/articles/' + encodeURIComponent(slug) : '/api/admin/articles';
        saved = await window.MaccaApi.request(url, {
          method,
          body: articleData,
          auth: true
        });
      } catch (err) {
        if (err.status && err.status !== 500) throw err;
        console.warn('Backend chưa sẵn sàng khi lưu bài viết, lưu bộ nhớ cục bộ:', err.message);
      }
    }

    const next = clone(snapshot);
    if (!Array.isArray(next.articles)) {
      next.articles = (typeof MaccaJournal !== 'undefined') ? clone(MaccaJournal) : [];
    }
    const targetSlug = slug || articleData.slug;
    const index = next.articles.findIndex(a => a.slug === targetSlug);
    const itemToSave = {
      ...articleData,
      slug: targetSlug || ('bai-viet-' + Date.now()),
      published: articleData.published !== false
    };
    if (index >= 0) {
      next.articles[index] = { ...next.articles[index], ...itemToSave };
    } else {
      next.articles.unshift(itemToSave);
    }
    commit(next);
    await syncBackend();
    return saved || itemToSave;
  }

  async function deleteArticle(slug) {
    if (window.MaccaApi?.request && (window.MaccaApi.getSession()?.accessToken || window.MaccaApi.getSession()?.token)) {
      try {
        await window.MaccaApi.request('/api/admin/articles/' + encodeURIComponent(slug), {
          method: 'DELETE',
          auth: true
        });
      } catch (err) {
        if (err.status && err.status !== 500) throw err;
        console.warn('Backend chưa sẵn sàng khi xóa bài viết, xóa bộ nhớ cục bộ:', err.message);
      }
    }

    const next = clone(snapshot);
    if (Array.isArray(next.articles)) {
      next.articles = next.articles.filter(a => a.slug !== slug);
      commit(next);
    }
    await syncBackend();
    return true;
  }

  reload();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => syncBackend());
  } else {
    syncBackend();
  }
  return { key, categories, statuses, images, reload, syncBackend, getState: () => clone(snapshot), getError: () => loadError, saveProduct, deleteProduct, createOrder, updateStatus, total, customers, getArticles, saveArticle, deleteArticle };
})();
