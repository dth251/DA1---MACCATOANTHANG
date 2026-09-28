'use strict';
window.Macca = (() => {
  const products = [
    { id: 'natural', image: 'assets/macca-natural.png', name: 'Macca nguyên vỏ sấy mộc', category: 'shell', categoryName: 'MACCA NGUYÊN VỎ', weight: '500 g', price: 185000, badge: 'VỊ NGUYÊN BẢN', description: 'Lớp vỏ nâu đặc trưng bao bọc phần nhân giòn, béo bùi. Lựa chọn cho những buổi thưởng trà và những phút nghỉ ngơi trong ngày.', ingredients: 'Macca nguyên vỏ' },
    { id: 'kernel', image: 'assets/macca-kernel.png', name: 'Nhân macca nguyên vị', category: 'kernel', categoryName: 'NHÂN MACCA', weight: '250 g', price: 225000, badge: 'TIỆN LỢI MỖI NGÀY', description: 'Nhân macca đã tách vỏ, tiện dùng trực tiếp hoặc kết hợp với sữa chua, granola và các món bánh yêu thích.', ingredients: 'Nhân macca' },
    { id: 'roasted', image: 'assets/macca-roasted.png', name: 'Macca nguyên vỏ rang', category: 'shell', categoryName: 'MACCA NGUYÊN VỎ', weight: '500 g', price: 195000, badge: 'GIÒN THƠM', description: 'Macca rang với hương thơm ấm và vị béo bùi. Một gợi ý để chia sẻ bên bàn trà cùng gia đình, bạn bè.', ingredients: 'Macca nguyên vỏ' },
    { id: 'gift', image: 'assets/macca-gift.png', name: 'Hộp quà Mộc An', category: 'gift', categoryName: 'BỘ SƯU TẬP QUÀ TẶNG', weight: '2 hộp × 250 g', price: 485000, badge: 'GỬI TRAO YÊU THƯƠNG', description: 'Hộp quà lấy cảm hứng từ sắc xanh thiên nhiên và chất liệu mộc. Gợi ý dành tặng người thân hoặc đối tác trong những dịp đặc biệt.', ingredients: 'Macca nguyên vỏ & nhân macca' }
  ];
  const key = 'macca-toan-thang-cart-v1';
  const money = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  function sanitize(value) { const result = {}; if (value && typeof value === 'object' && !Array.isArray(value)) for (const p of products) if (Number.isInteger(value[p.id]) && value[p.id] > 0 && value[p.id] <= 99) result[p.id] = value[p.id]; return result; }
  function read() { try { return sanitize(JSON.parse(localStorage.getItem(key) || '{}')); } catch { return {}; } }
  function write(cart) { try { localStorage.setItem(key, JSON.stringify(sanitize(cart))); return true; } catch { return false; } }
  function subtotal(cart) { return products.reduce((sum, p) => sum + p.price * (cart[p.id] || 0), 0); }
  function shipping(cart, method = 'standard') { return subtotal(cart) === 0 ? 0 : method === 'express' ? 45000 : 30000; }
  function count(cart) { return Object.values(sanitize(cart)).reduce((a, b) => a + b, 0); }
  function download(name, text) { const url = URL.createObjectURL(new Blob(['\uFEFF' + text], { type: 'text/plain;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  return { products, key, money, sanitize, read, write, subtotal, shipping, count, download };
})();
