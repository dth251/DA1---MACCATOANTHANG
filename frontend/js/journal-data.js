'use strict';
const MaccaJournal = [
  {
    "title": "Ba cách thưởng thức macca cho ngày thêm thú vị",
    "body": "<p><strong>Thưởng thức nguyên vị.</strong> Dành vài phút nghỉ ngơi, chuẩn bị một phần macca vừa đủ cùng tách trà hoặc cà phê yêu thích.</p><p><strong>Thêm vào bữa sáng.</strong> Bẻ nhỏ nhân macca và rắc lên yến mạch hoặc sữa chua ngay trước khi ăn để giữ độ giòn.</p><p><strong>Một điểm nhấn cho món bánh.</strong> Thử thêm nhân macca cắt nhỏ vào công thức bánh quy quen thuộc. Điều chỉnh lượng hạt theo khẩu vị và công thức bạn sử dụng.</p><p>Lưu ý: macca là một loại hạt có thể gây dị ứng. Dùng theo hướng dẫn trên nhãn sản phẩm.</p>",
    "slug": "thuong-thuc-macca",
    "category": "enjoy",
    "label": "THƯỞNG THỨC",
    "image": "assets/macca-natural.png",
    "description": "Từ một tách trà đến món bánh quen thuộc, tìm cảm hứng cho những khoảnh khắc giòn thơm."
  },
  {
    "title": "Một bát sữa chua, một chút giòn thơm",
    "body": "<p>Chuẩn bị một hũ sữa chua không đường, trái cây theo mùa và một ít nhân macca.</p><p><strong>Bước 1.</strong> Cho sữa chua vào bát, thêm trái cây đã rửa sạch và cắt miếng.</p><p><strong>Bước 2.</strong> Bẻ nhỏ hoặc cắt nhân macca, rắc lên trên ngay trước khi dùng.</p><p><strong>Bước 3.</strong> Thêm yến mạch hoặc chút mật ong theo khẩu vị. Thưởng thức ngay để cảm nhận sự tương phản giữa vị mềm mát và giòn bùi.</p><p>Chọn nguyên liệu phù hợp với chế độ ăn và các dị ứng thực phẩm của bạn.</p>",
    "slug": "sua-chua-macca",
    "category": "kitchen",
    "label": "GÓC BẾP",
    "image": "assets/macca-kernel.png",
    "description": "Một gợi ý kết hợp đơn giản với sữa chua, trái cây và nhân macca cho bữa ăn thêm thú vị."
  },
  {
    "title": "Chọn một món quà từ sự quan tâm",
    "body": "<p>Một món quà ý nghĩa bắt đầu từ người nhận. Họ thích thưởng trà, nấu ăn hay những món ăn nhẹ tiện lợi? Sở thích ấy sẽ giúp bạn chọn quy cách phù hợp.</p><p>Nhân macca phù hợp với người thích sự tiện lợi. Macca nguyên vỏ mang lại trải nghiệm tách hạt chậm rãi bên bàn trà.</p><p>Đừng quên hỏi về dị ứng với các loại hạt, kiểm tra nhãn sản phẩm và thêm một lời nhắn riêng. Sự chu đáo thường nằm ở những chi tiết nhỏ.</p><p>Với quà tặng số lượng lớn, hãy chuẩn bị trước số lượng, ngân sách và ngày cần nhận để trao đổi với cửa hàng.</p>",
    "slug": "chon-qua-macca",
    "category": "gift",
    "label": "QUÀ TẶNG",
    "image": "assets/macca-gift.png",
    "description": "Bắt đầu từ sở thích người nhận để chuẩn bị món quà cùng một lời nhắn chân thành."
  }
];

async function loadArticles() {
  if (window.MaccaApi?.request) {
    try {
      const data = await window.MaccaApi.request('/api/articles?limit=100');
      const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : null);
      if (items && items.length > 0) {
        MaccaJournal.length = 0;
        for (const item of items) {
          MaccaJournal.push({
            slug: item.slug,
            title: item.title,
            body: item.body,
            category: typeof item.category === 'string' ? item.category.toLowerCase() : 'enjoy',
            label: item.label || 'GÓC MACCA',
            image: item.image || 'assets/macca-natural.png',
            description: item.description || '',
            published: item.published !== false
          });
        }
        window.dispatchEvent(new CustomEvent('macca:articles-loaded', { detail: MaccaJournal }));
      }
    } catch (e) {
      console.warn('Backend chưa bật hoặc lỗi mạng, sử dụng bài viết mẫu:', e.message);
    }
  }
  syncArticlesFromAdminStorage();
  return MaccaJournal;
}

function syncArticlesFromAdminStorage() {
  try {
    const raw = localStorage.getItem('macca-toan-thang-admin-v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.articles) && parsed.articles.length > 0) {
        const map = new Map(parsed.articles.map(a => [a.slug, a]));
        for (const art of MaccaJournal) {
          if (map.has(art.slug)) {
            const remote = map.get(art.slug);
            art.published = remote.published !== false;
            if (remote.title) art.title = remote.title;
            if (remote.description) art.description = remote.description;
          }
        }
        // Add new articles created in admin if not present
        for (const remote of parsed.articles) {
          if (!MaccaJournal.some(a => a.slug === remote.slug)) {
            MaccaJournal.push({
              slug: remote.slug,
              title: remote.title,
              body: remote.body || '',
              category: typeof remote.category === 'string' ? remote.category.toLowerCase() : 'enjoy',
              label: remote.label || 'GÓC MACCA',
              image: remote.image || 'assets/macca-natural.png',
              description: remote.description || '',
              published: remote.published !== false
            });
          }
        }
      }
    }
  } catch {}
}

syncArticlesFromAdminStorage();
window.addEventListener('storage', event => {
  if (event.key === 'macca-toan-thang-admin-v1') {
    syncArticlesFromAdminStorage();
    window.dispatchEvent(new CustomEvent('macca:articles-loaded', { detail: MaccaJournal }));
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { loadArticles(); });
} else {
  loadArticles();
}
