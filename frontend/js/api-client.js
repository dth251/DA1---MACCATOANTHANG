'use strict';
window.MaccaApi = (() => {
  // Override before this script when frontend and API use different origins.
  const isLocalHost = ['localhost', '127.0.0.1', ''].includes(location.hostname) || location.protocol === 'file:';
  const base = (window.MACCA_API_BASE ?? (isLocalHost && location.port !== '8080' ? 'http://127.0.0.1:8080' : '')).replace(/\/$/, '');
  const sessionKey = 'macca-api-session-v1';
  let session = null;
  try { session = JSON.parse(sessionStorage.getItem(sessionKey)); } catch {}
  function setSession(value) {
    session = value;
    try { if (value) sessionStorage.setItem(sessionKey, JSON.stringify(value)); else sessionStorage.removeItem(sessionKey); } catch {}
    window.dispatchEvent(new CustomEvent('macca:session', { detail: value }));
  }
  async function request(path, options = {}) {
    const { auth = false, body, headers: extraHeaders, ...rest } = options;
    const headers = { Accept: 'application/json', ...extraHeaders };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const token = session?.accessToken || session?.token;
    if (auth && token) headers.Authorization = 'Bearer ' + token;
    let response;
    try {
      response = await fetch(base + path, { ...rest, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: rest.signal || AbortSignal.timeout(20000) });
    } catch {
      throw new Error('Không kết nối được máy chủ. Vui lòng kiểm tra kết nối và thử lại.');
    }
    let result;
    try { result = await response.json(); } catch { throw new Error('Máy chủ trả về dữ liệu không hợp lệ. Vui lòng thử lại.'); }
    if (!response.ok || result.success !== true) {
      if (response.status === 401 && auth) setSession(null);
      const details = result.errors && typeof result.errors === 'object' && !result.errors.code ? Object.values(result.errors).join('. ') : '';
      const error = new Error([result.message || 'Thao tác thất bại.', details].filter(Boolean).join(' '));
      error.status = response.status;
      error.errors = result.errors;
      if (result.errors?.code === 'PRICE_CHANGED') error.message = `Giá đã thay đổi. Tổng hiện tại: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(result.errors.actualTotal)}. Tải lại trang để kiểm tra giá và xác nhận lại đơn hàng.`;
      throw error;
    }
    return result.data;
  }
  async function all(path, options = {}) {
    const items = [];
    let page = 1, pages;
    do {
      const data = await request(`${path}${path.includes('?') ? '&' : '?'}page=${page}&limit=100`, options);
      if (!Array.isArray(data?.items) || !Number.isInteger(data.pagination?.totalPages)) throw new Error('Dữ liệu phân trang không hợp lệ.');
      items.push(...data.items);
      pages = data.pagination.totalPages;
    } while (++page <= pages);
    return items;
  }
  const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  function report(error) {
    const show = () => {
      let banner = document.getElementById('api-error');
      if (!banner) { banner = document.createElement('p'); banner.id = 'api-error'; banner.setAttribute('role', 'alert'); banner.className = 'storage-warning'; document.body.prepend(banner); }
      banner.textContent = error.message + ' ';
      const retry = document.createElement('button'); retry.textContent = 'Tải lại'; retry.addEventListener('click', () => location.reload()); banner.append(retry);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show, { once: true }); else show();
  }
  function articleHtml(value) {
    const template = document.createElement('template'); template.innerHTML = value || '';
    const allowed = new Set(['P', 'STRONG', 'EM', 'B', 'I', 'H2', 'H3', 'UL', 'OL', 'LI', 'BR', 'BLOCKQUOTE']);
    for (const node of [...template.content.querySelectorAll('*')]) {
      if (!allowed.has(node.tagName)) node.replaceWith(document.createTextNode(node.textContent));
      else for (const attr of [...node.attributes]) node.removeAttribute(attr.name);
    }
    return template.innerHTML;
  }
  return { request, all, escape, report, articleHtml, setSession, getSession: () => session };
})();
