'use strict';
(() => {
  const $ = selector => document.querySelector(selector);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
  
  // CHỈ CÓ TƯ VẤN VÀ LỜI NHẮN
  const types = { consult: 'Tư vấn', contact: 'Lời nhắn / Liên hệ' };
  const statuses = { new: 'Mới nhận', processing: 'Đang xử lý', completed: 'Đã xử lý', rejected: 'Đã từ chối' };

  const STORAGE_KEY = 'macca-client-requests';

  const DEFAULT_REQUESTS = [
    {
      id: 'YC-TV-2026-001',
      type: 'consult',
      topic: 'Tư vấn quà tặng doanh nghiệp cuối năm',
      status: 'new',
      revision: 1,
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      customer: {
        name: 'Trần Thị Mai',
        phone: '0987654321',
        email: 'mai.tran@company.vn'
      },
      details: {
        company: 'Công ty Công Nghệ Á Châu',
        quantity: 50,
        budget: '500.000đ - 1.000.000đ / phần'
      },
      message: 'Tôi muốn đặt 50 hộp quà macca tặng đối tác dịp kỷ niệm thành lập, nhờ shop tư vấn thiết kế thiệp chúc mừng và báo giá chiết khấu doanh nghiệp.'
    },
    {
      id: 'YC-LN-2026-002',
      type: 'contact',
      topic: 'Lời nhắn: Hợp tác đại lý phân phối',
      status: 'processing',
      revision: 1,
      createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
      customer: {
        name: 'Lê Hoàng Long',
        phone: '0903123456',
        email: 'long.le@dalatstore.com'
      },
      message: 'Chào anh/chị, tôi muốn phân phối sản phẩm Macca Toàn Thắng tại chuỗi cửa hàng nông sản sạch tại Đà Lạt. Vui lòng gửi chính sách đại lý và bảng giá sỉ qua email.'
    },
    {
      id: 'YC-TV-2026-003',
      type: 'consult',
      topic: 'Tư vấn chế độ dinh dưỡng cho người lớn tuổi',
      status: 'completed',
      revision: 1,
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      customer: {
        name: 'Nguyễn Thị Bích',
        phone: '0918765432',
        email: 'bichnguyen@outlook.com'
      },
      details: {
        purpose: 'Chăm sóc sức khỏe gia đình',
        preference: 'Macca sấy mộc nguyên chất'
      },
      message: 'Mẹ mình bị tiểu đường, muốn mua macca sấy mộc nguyên vị không đường muối. Nhờ shop hướng dẫn khẩu phần dùng mỗi ngày tốt nhất.'
    }
  ];

  function getLocalRequests() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        // Tự động làm sạch nếu phát hiện dữ liệu cũ bị lỗi font / mojibake
        if (/[\uFFFD]|Ã[¡\s]|áº|á»|Ä‘/.test(raw)) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_REQUESTS));
          return DEFAULT_REQUESTS;
        }
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Lọc bỏ yêu cầu loại order nếu có lẫn từ trước, đảm bảo CHỈ CÓ consult và contact
          const filtered = parsed.filter(item => item.type === 'consult' || item.type === 'contact');
          if (filtered.length > 0) return filtered;
        }
      }
    } catch (e) {
      console.error('Lỗi đọc local requests:', e);
    }
    // Lưu danh sách mặc định sạch
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_REQUESTS));
    } catch {}
    return DEFAULT_REQUESTS;
  }

  function saveLocalRequests(list) {
    try {
      // Chỉ lưu consult và contact
      const filtered = list.filter(item => item.type === 'consult' || item.type === 'contact');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error('Lỗi ghi local requests:', e);
    }
  }

  let requests = [];

  function formatTime(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${mins} ${day}/${month}/${year}`;
    } catch {
      return iso;
    }
  }

  function render() {
    const searchInput = $('#inbox-search');
    const query = normalize(searchInput ? searchInput.value.trim() : '');
    const type = $('#inbox-type')?.value || 'all';
    const status = $('#inbox-status')?.value || 'all';

    // Đảm bảo chỉ hiển thị consult và contact
    let filtered = requests.filter(r => r.type === 'consult' || r.type === 'contact');

    if (type !== 'all') filtered = filtered.filter(r => r.type === type);
    if (status !== 'all') filtered = filtered.filter(r => r.status === status);
    if (query) {
      filtered = filtered.filter(r => {
        const text = [
          r.id,
          r.topic,
          r.customer?.name,
          r.customer?.phone,
          r.customer?.email,
          r.message,
          JSON.stringify(r.details || {})
        ].filter(Boolean).join(' ');
        return normalize(text).includes(query);
      });
    }

    const inboxCount = $('#inbox-count');
    const newCount = requests.filter(r => r.status === 'new' && (r.type === 'consult' || r.type === 'contact')).length;
    if (inboxCount) {
      inboxCount.textContent = String(newCount);
      inboxCount.hidden = newCount === 0;
    }

    const rows = $('#inbox-rows');
    if (!rows) return;

    if (filtered.length === 0) {
      rows.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 36px 20px; color: var(--muted); font-size: 13.5px;">Không có yêu cầu nào phù hợp bộ lọc.</td></tr>';
      return;
    }

    rows.innerHTML = filtered.map(r => {
      const badgeClass = r.status === 'new' ? 'new' : r.status === 'processing' ? 'processing' : r.status === 'rejected' ? 'rejected' : 'shipped';
      const typeLabel = types[r.type] || r.type || 'Tư vấn';
      const custName = escape(r.customer?.name || 'Khách vãng lai');
      const custPhone = escape(r.customer?.phone || '');
      const custEmail = escape(r.customer?.email || '');
      const topicText = escape(r.topic || (r.type === 'consult' ? 'Yêu cầu tư vấn' : 'Lời nhắn khách hàng'));
      const msgSnippet = escape((r.message || '').slice(0, 65) + ((r.message || '').length > 65 ? '…' : ''));

      return `
        <tr data-id="${escape(r.id)}">
          <td><strong style="color: var(--green); font-weight: 600;">${escape(r.id)}</strong></td>
          <td style="font-size: 12.5px; color: var(--muted);">${formatTime(r.createdAt)}</td>
          <td><span class="badge" style="background: #eef3ec; color: #2e5239; font-weight: 600;">${typeLabel}</span></td>
          <td>
            <strong>${custName}</strong>
            <small style="display: block; color: var(--muted);">${custPhone}${custEmail ? ' · ' + custEmail : ''}</small>
          </td>
          <td class="inbox-message">
            <strong>${topicText}</strong>
            <small style="display: block; color: var(--muted);">${msgSnippet || 'Không có ghi chú thêm'}</small>
          </td>
          <td><span class="badge ${badgeClass}">${statuses[r.status] || r.status}</span></td>
          <td style="text-align: right;">
            <button class="button button-outline inbox-action" data-action="detail" data-id="${escape(r.id)}" style="padding: 6px 12px; font-size: 12px; font-weight: 600;">Xem chi tiết</button>
          </td>
        </tr>
      `;
    }).join('');

    const result = $('#inbox-result');
    if (result) {
      result.textContent = `Hiển thị ${filtered.length} / ${requests.length} yêu cầu tư vấn & lời nhắn.`;
    }
  }

  function refresh() {
    window.refreshMaccaInbox = refresh;
    requests = getLocalRequests();
    render();
  }

    let currentDetailId = '';

  function openDetail(id) {
    const r = requests.find(item => item.id === id);
    if (!r) return;

    currentDetailId = r.id;

    const titleEl = $('#inbox-detail-title');
    if (titleEl) titleEl.textContent = `Yêu cầu ${r.id} · ${types[r.type] || r.type}`;

    const detailEl = $('#inbox-detail');
    if (detailEl) {
      let detailsHtml = '';
      if (r.details && Object.keys(r.details).length > 0) {
        detailsHtml = `
          <div style="background: #f4f6f1; padding: 14px; border-radius: 6px; margin: 12px 0; border: 1px solid #e2e6dc;">
            <strong style="display: block; margin-bottom: 6px; color: var(--green); font-size: 13px;">Thông tin bổ sung:</strong>
            ${Object.entries(r.details).map(([k, v]) => `<div style="font-size: 12.5px; margin-bottom: 4px;"><strong>${escape(k)}:</strong> ${escape(String(v))}</div>`).join('')}
          </div>
        `;
      }

      detailEl.innerHTML = `
        <div class="detail-customer" style="padding: 16px; background: #f6f7f2; border-radius: 6px; border: 1px solid #e6e8df; margin-bottom: 16px;">
          <p><strong>Khách hàng:</strong> ${escape(r.customer?.name || '—')}</p>
          <p><strong>Số điện thoại:</strong> ${escape(r.customer?.phone || '—')}</p>
          <p><strong>Email:</strong> ${escape(r.customer?.email || '—')}</p>
          <p><strong>Thời gian nhận:</strong> ${formatTime(r.createdAt)}</p>
        </div>
        <h3 style="margin-top: 16px; font-size: 15px; color: #162a1e; font-weight: 600;">${escape(r.topic || '')}</h3>
        ${detailsHtml}
        <div>
          <strong style="font-size: 12.5px; color: var(--muted); text-transform: uppercase;">Nội dung lời nhắn / yêu cầu:</strong>
          <p class="inbox-body" style="margin-top: 6px; padding: 14px; background: #fafbf8; border: 1px solid #e6e8df; border-radius: 6px; white-space: pre-wrap; font-size: 13.5px; line-height: 1.6;">${escape(r.message || 'Không có lời nhắn bổ sung.')}</p>
        </div>
      `;
    }

    const statusForm = $('#inbox-status-form');
    if (statusForm) {
      const idInput = statusForm.elements.namedItem('id');
      if (idInput) idInput.value = r.id;
      const statusInput = statusForm.elements.namedItem('status');
      if (statusInput) statusInput.value = r.status;
    }

    const dialog = $('#inbox-detail-dialog');
    if (dialog) {
      if (typeof dialog.showModal === 'function') {
        try { dialog.showModal(); } catch (e) { dialog.setAttribute('open', ''); }
      } else {
        dialog.setAttribute('open', '');
      }
    }
  }

  function setup() {
    const workspace = $('#inbox-workspace');
    if (workspace) workspace.removeAttribute('hidden');

    $('#inbox-refresh')?.addEventListener('click', refresh);
    $('#inbox-search')?.addEventListener('input', render);
    $('#inbox-type')?.addEventListener('change', render);
    $('#inbox-status')?.addEventListener('change', render);

    // Bắt sự kiện click toàn cục cho nút Xem chi tiết trong danh sách yêu cầu
    document.addEventListener('click', event => {
      const btn = event.target.closest('button[data-action="detail"]');
      if (!btn) return;
      event.preventDefault();
      const id = btn.dataset.id;
      if (id) openDetail(id);
    });

    $('#inbox-status-form')?.addEventListener('submit', event => {
      event.preventDefault();
      const form = event.target;
      const id = form.elements.namedItem('id')?.value || currentDetailId;
      const nextStatus = form.elements.namedItem('status')?.value;
      const target = requests.find(item => item.id === id);
      if (target && nextStatus) {
        target.status = nextStatus;
        saveLocalRequests(requests);
        render();
      }
      const dialog = $('#inbox-detail-dialog');
      if (dialog) {
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
      }
    });

    window.addEventListener('storage', event => {
      if (event.key === STORAGE_KEY) refresh();
    });

    window.addEventListener('macca:new-request', () => {
      refresh();
    });

    refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
