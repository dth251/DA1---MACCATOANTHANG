'use strict';
window.MaccaRequests = (() => {
  async function request(path, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(path, { ...options, credentials: 'same-origin', signal: controller.signal, headers: { 'Content-Type': 'application/json', ...options.headers } });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data) {
        const error = new Error(data?.error || 'Chưa kết nối được dịch vụ tiếp nhận. Vui lòng thử lại sau hoặc liên hệ hotline.');
        error.status = response.status;
        throw error;
      }
      return data;
    } catch (error) {
      if (error.name === 'AbortError' || error instanceof TypeError) throw new Error('Chưa nhận được xác nhận từ cửa hàng. Hãy giữ nguyên thông tin và thử gửi lại; hệ thống sẽ tránh tạo yêu cầu trùng.');
      throw error;
    } finally { clearTimeout(timeout); }
  }
  // Preserve a random retry token plus a one-way payload hash; never store contact details in the browser.
  function sender(kind) {
    let previousHash = '', token = '', busy = false;
    return async (form, payload) => {
      if (busy) throw new Error('Yêu cầu đang được gửi. Vui lòng chờ.');
      busy = true;
      const button = form.querySelector('[type="submit"]');
      const original = button.textContent;
      button.disabled = true;
      button.textContent = 'Đang gửi…';
      try {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)));
        const fingerprint = [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join('');
        if (!token) {
          try {
            const saved = JSON.parse(sessionStorage.getItem('macca-submit-' + kind) || 'null');
            if (saved && saved.hash === fingerprint && /^[a-zA-Z0-9-]{20,80}$/.test(saved.token)) { token = saved.token; previousHash = saved.hash; }
          } catch {}
        }
        if (fingerprint !== previousHash) { token = crypto.randomUUID(); previousHash = fingerprint; }
        try { sessionStorage.setItem('macca-submit-' + kind, JSON.stringify({ hash: fingerprint, token })); } catch {}
        const data = await request('/api/requests', { method: 'POST', headers: { 'Idempotency-Key': token }, body: JSON.stringify(payload) });
        if (typeof data.id !== 'string' || !data.id.startsWith('YC-')) throw new Error('Chưa nhận được mã xác nhận hợp lệ. Vui lòng thử lại.');
        try { sessionStorage.removeItem('macca-submit-' + kind); } catch {}
        token = ''; previousHash = '';
        return data;
      } finally { busy = false; button.disabled = false; button.textContent = original; }
    };
  }
  return { request, sender };
})();
