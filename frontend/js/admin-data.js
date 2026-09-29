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
    const defaultOrders = [
    {
      id: 'DH-2609-8801',
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      status: 'pending',
      customer: {
        name: 'Nguyễn Văn An',
        phone: '0912345678',
        email: 'an.nguyen@gmail.com',
        address: '123 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh'
      },
      items: [
        { id: 'macca-natural', name: 'Macca sấy mộc', weight: '500g', price: 185000, quantity: 2 },
        { id: 'macca-kernel', name: 'Nhân macca', weight: '300g', price: 210000, quantity: 1 }
      ],
      shipping: 30000,
      note: 'Giao hàng trong giờ hành chính giúp tôi.'
    },
    {
      id: 'DH-2609-8802',
      createdAt: new Date(Date.now() - 3600000 * 26).toISOString(),
      status: 'shipping',
      customer: {
        name: 'Phạm Thu Trang',
        phone: '0933456789',
        email: 'thutrang@gmail.com',
        address: '45 Nguyễn Huệ, Quận Hải Châu, TP. Đà Nẵng'
      },
      items: [
        { id: 'macca-roasted', name: 'Macca rang', weight: '500g', price: 195000, quantity: 3 }
      ],
      shipping: 45000,
      note: 'Đóng gói bọc xốp cẩn thận giúp shop nhé.'
    },
    {
      id: 'DH-2609-8803',
      createdAt: new Date(Date.now() - 3600000 * 50).toISOString(),
      status: 'completed',
      customer: {
        name: 'Hoàng Minh Tuấn',
        phone: '0978112233',
        email: 'tuan.hoang@gmail.com',
        address: '88 Cầu Giấy, Phường Dịch Vọng, TP. Hà Nội'
      },
      items: [
        { id: 'macca-gift', name: 'Hộp quà Mộc An', weight: 'Hộp 2 hũ', price: 450000, quantity: 2 }
      ],
      shipping: 30000,
      note: 'Đã thanh toán đủ khi nhận hàng.'
    }
  ];
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
  function saveProduct(product) {
    if (!validProduct(product)) throw new Error('Kiểm tra tên, quy cách, giá bán và tồn kho của sản phẩm.');
    const next = clone(snapshot);
    const index = next.products.findIndex(p => p.id === product.id);
    if (index < 0) next.products.push(clone(product)); else next.products[index] = clone(product);
    return commit(next);
  }
  function deleteProduct(id) {
    const next = clone(snapshot);
    next.products = next.products.filter(p => p.id !== id);
    return commit(next);
  }
  function createOrder(customer, lines, shipping, note) {
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
    const order = { id: 'TT-' + crypto.randomUUID().slice(0, 8).toUpperCase(), createdAt: new Date().toISOString(), customer: clone(customer), items, shipping, note, status: 'pending' };
    if (!validOrder(order)) throw new Error('Kiểm tra thông tin khách hàng, số điện thoại, email, sản phẩm và phí giao hàng.');
    const next = clone(snapshot);
    next.orders.unshift(order);
    return commit(next);
  }
  function updateStatus(id, status) {
    if (!Object.hasOwn(statuses, status)) throw new Error('Trạng thái không hợp lệ.');
    const next = clone(snapshot);
    const order = next.orders.find(o => o.id === id);
    if (!order) throw new Error('Không tìm thấy đơn hàng.');
    order.status = status;
    return commit(next);
  }
  const total = order => order.items.reduce((sum, i) => sum + i.price * i.quantity, order.shipping);
  function customers(orders) {
    const grouped = new Map();
    // Newest order supplies current contact details; phone is the grouping key.
    for (const order of [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
      const phone = order.customer.phone;
      if (!grouped.has(phone)) grouped.set(phone, { ...order.customer, orders: 0, completed: 0 });
      const customer = grouped.get(phone);
      customer.orders++;
      if (order.status === 'completed') customer.completed += total(order);
    }
    return [...grouped.values()];
  }
  reload();
  return { key, categories, statuses, images, reload, getState: () => clone(snapshot), getError: () => loadError, saveProduct, deleteProduct, createOrder, updateStatus, total, customers };
})();
