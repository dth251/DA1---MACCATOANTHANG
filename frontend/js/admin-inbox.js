'use strict';
(() => {
  const $ = selector => document.querySelector(selector);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();

  // Toast dùng chung element #admin-toast từ admin.js
  let inboxToastTimer;
  function toast(message) {
    const el = $('#admin-toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('visible');
    clearTimeout(inboxToastTimer);
    inboxToastTimer = setTimeout(() => el.classList.remove('visible'), 4000);
  }
  
  // CHỈ CÓ TƯ VẤN VÀ LỜI NHẮN
  const types = { consult: 'Tư vấn', contact: 'Lời nhắn / Liên hệ' };
  const statuses = { new: 'Mới nhận', processing: 'Đang xử lý', completed: 'Đã xử lý', rejected: 'Đã từ chối' };

  const STORAGE_KEY = 'macca-client-requests';

  const DEFAULT_REQUESTS = [];

  function getLocalRequests() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        // Tự động làm sạch nếu phát hiện dữ liệu cũ bị lỗi font / mojibake
        if (/[\uFFFD]|Ã[¡\s]|áº|á»|Ä‘/.test(raw)) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
          return [];
        }
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Lọc bỏ yêu cầu mẫu cũ nếu còn tồn đọng trong localStorage
          const filtered = parsed.filter(item => 
            (item.type === 'consult' || item.type === 'contact') &&
            !item.id?.startsWith('YC-TV-2026-00') &&
            !item.id?.startsWith('YC-LN-2026-00')
          );
          if (filtered.length !== parsed.length) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
          }
          return filtered;
        }
      }
    } catch (e) {
      console.error('Lỗi đọc local requests:', e);
    }
    return [];
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
      rows.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 36px 20px; color: var(--muted); font-size: 13.5px;">Không có yêu cầu nào phù hợp bộ lọc.</td></tr>';
      return;
    }

    rows.innerHTML = filtered.map(r => {
      const badgeClass = r.status === 'new' ? 'new' : r.status === 'processing' ? 'processing' : r.status === 'rejected' ? 'rejected' : 'completed';
      const typeLabel = types[r.type] || r.type || 'Tư vấn';
      const custName = escape(r.customer?.name || 'Khách vãng lai');
      const custPhone = escape(r.customer?.phone || '');
      const custEmail = escape(r.customer?.email || '');
      const topicText = escape(r.topic || (r.type === 'consult' ? 'Yêu cầu tư vấn' : 'Lời nhắn khách hàng'));
      const msgSnippet = escape((r.message || '').slice(0, 75) + ((r.message || '').length > 75 ? '…' : ''));

      return `
        <tr data-id="${escape(r.id)}">
          <td>
            <strong style="color: var(--green); font-weight: 650; display: block;">${escape(r.id)}</strong>
            <small style="font-size: 11.5px; color: var(--muted); display: block; margin-top: 3px;">${formatTime(r.createdAt)}</small>
          </td>
          <td><span class="badge" style="background: #eef3ec; color: #2e5239; font-weight: 600;">${typeLabel}</span></td>
          <td>
            <strong>${custName}</strong>
            <small style="display: block; color: var(--muted); margin-top: 2px;">${custPhone}${custEmail ? ' · ' + custEmail : ''}</small>
          </td>
          <td class="inbox-message" style="white-space: normal; min-width: 180px; max-width: 300px; word-break: break-word;">
            <strong style="display: block; margin-bottom: 2px;">${topicText}</strong>
            <small style="display: block; color: var(--muted); line-height: 1.45;">${msgSnippet || 'Không có ghi chú thêm'}</small>
          </td>
          <td><span class="badge ${badgeClass}">${statuses[r.status] || r.status}</span></td>
          <td style="text-align: center;">
            <button type="button" class="button secondary inbox-action" data-action="detail" data-id="${escape(r.id)}" style="padding: 6px 14px; font-size: 12px; font-weight: 600; border-radius: 0;">Xem chi tiết</button>
          </td>
        </tr>
      `;
    }).join('');

    const result = $('#inbox-result');
    if (result) {
      result.textContent = `Hiển thị ${filtered.length} / ${requests.length} yêu cầu tư vấn & lời nhắn.`;
    }
  }

  async function refresh(showFeedback = false) {
    window.refreshMaccaInbox = refresh;
    if (window.MaccaApi?.request) {
      const session = window.MaccaApi.getSession();
      if (session?.accessToken || session?.token) {
        try {
          const res = await window.MaccaApi.request('/api/admin/requests?limit=100', { auth: true });
          const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : null);
          if (items !== null) {
            requests = items.map(r => ({
              id: r.id,
              type: typeof r.type === 'string' ? r.type.toLowerCase() : 'consult',
              topic: r.topic || '',
              status: typeof r.status === 'string' ? r.status.toLowerCase() : 'new',
              revision: r.revision || 0,
              createdAt: r.createdAt || new Date().toISOString(),
              customer: {
                name: r.user?.name || r.customer?.name || 'Khách hàng',
                phone: r.user?.phone || r.customer?.phone || '',
                email: r.user?.email || r.customer?.email || ''
              },
              details: r.details || {},
              message: r.message || '',
              adminReply: r.adminReply || ''
            }));
            saveLocalRequests(requests);
            render();
            if (showFeedback) toast('Đã cập nhật: ' + requests.length + ' yêu cầu.');
            return;
          }
        } catch (err) {
          console.warn('Backend chưa sẵn sàng hoặc lỗi khi lấy danh sách yêu cầu, dùng dữ liệu lưu trữ cục bộ:', err.message);
          if (showFeedback) toast('Loi ket noi may chu. Dang dung du lieu da luu.');
        }
      }
    }
    requests = getLocalRequests();
    render();
    if (showFeedback) toast('Da tai ' + requests.length + ' yeu cau tu bo nho.');
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

    $('#inbox-refresh')?.addEventListener('click', () => refresh(true));
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

    $('#inbox-status-form')?.addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.target;
      const id = form.elements.namedItem('id')?.value || currentDetailId;
      const nextStatus = form.elements.namedItem('status')?.value;
      const target = requests.find(item => item.id === id);
      if (target && nextStatus) {
        let savedToServer = false;
        if (window.MaccaApi?.request && (window.MaccaApi.getSession()?.accessToken || window.MaccaApi.getSession()?.token)) {
          try {
            const res = await window.MaccaApi.request('/api/admin/requests/' + encodeURIComponent(id), {
              method: 'PATCH',
              body: { status: nextStatus, revision: target.revision || 0 },
              auth: true
            });
            if (res?.revision !== undefined) target.revision = res.revision;
            savedToServer = true;
          } catch (err) {
            console.warn('Backend chưa sẵn sàng khi cập nhật trạng thái yêu cầu, lưu cục bộ:', err.message);
          }
        }
        const statusLabel = { new: 'Mới nhận', processing: 'Đang xử lý', completed: 'Đã xử lý', rejected: 'Đã từ chối' }[nextStatus] || nextStatus;
        target.status = nextStatus;
        saveLocalRequests(requests);
        render();
        toast('Da cap nhat trang thai: ' + statusLabel);      }
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



