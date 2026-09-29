'use strict';
(() => {
  const $ = selector => document.querySelector(selector);
  const request = MaccaAdminAuth.request;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
  const types = { order: 'Đặt hàng', consult: 'Tư vấn', contact: 'Liên hệ' };
  const statuses = { new: 'Mới nhận', processing: 'Đang xử lý', completed: 'Đã xử lý', rejected: 'Đã từ chối' };
  let requests = [], selected = null, loggedIn = false, loading = false, generation = 0;
  function loggedOut() {
    generation++;
    loggedIn = false; requests = []; selected = null;
    $('#inbox-workspace').hidden = true;
    $('#inbox-rows').replaceChildren();
    $('#inbox-detail').replaceChildren();
    $('#inbox-count').hidden = true;
    $('#inbox-detail-dialog').close();
  }
  function loggedAs() {
    generation++;
    loggedIn = true;
    $('#inbox-workspace').hidden = false;
  }
  function render() {
    const query = normalize($('#inbox-search').value.trim());
    const type = $('#inbox-type').value, status = $('#inbox-status').value;
    const list = requests.filter(r => (type === 'all' || r.type === type) && (status === 'all' || r.status === status) && normalize([r.id, r.customer.name, r.customer.phone, r.customer.email, r.topic, r.message].join(' ')).includes(query));
    $('#inbox-count').textContent = requests.filter(r => r.status === 'new').length;
    $('#inbox-count').hidden = false;
    $('#inbox-rows').innerHTML = list.map(r => `<tr><td><strong title="${escape(r.id)}">${escape(r.id.slice(0, 11))}</strong><small>${new Date(r.createdAt).toLocaleString('vi-VN')}</small></td><td>${types[r.type]}</td><td>${escape(r.customer.name)}<small>${escape(r.customer.phone || r.customer.email)}</small></td><td class="inbox-message"><strong>${escape(r.topic)}</strong><small>${escape(r.message.slice(0, 90))}${r.message.length > 90 ? '…' : ''}</small>${r.type === 'order' ? `<small>${Macca.money(r.total)}</small>` : ''}</td><td><span class="badge ${r.status}">${statuses[r.status]}</span></td><td><div class="row-actions"><button data-request="${escape(r.id)}">Chi tiết</button></div></td></tr>`).join('') || '<tr><td colspan="6"><div class="empty-state"><h3>Chưa có yêu cầu phù hợp</h3><p>Các yêu cầu gửi thành công từ website sẽ xuất hiện tại đây.</p></div></td></tr>';
    $('#inbox-result').textContent = `Hiển thị ${list.length} / ${requests.length} yêu cầu · Tự cập nhật mỗi 30 giây khi mở hộp thư.`;
  }
  async function refresh() {
    if (!loggedIn || loading) return;
    loading = true;
    const current = generation;
    $('#inbox-refresh').disabled = true;
    try {
      const data = await request('/api/admin/requests');
      if (!loggedIn || current !== generation) return;
      requests = data.requests;
      $('#inbox-error').textContent = '';
      render();
    } catch (error) {
      if (current !== generation) return;
      if (error.status !== 401) $('#inbox-error').textContent = error.message;
    } finally { loading = false; $('#inbox-refresh').disabled = false; }
  }
  $('#inbox-refresh').addEventListener('click', refresh);
  $('#inbox-search').addEventListener('input', render);
  for (const id of ['inbox-type', 'inbox-status']) $('#' + id).addEventListener('change', render);
  $('#inbox-rows').addEventListener('click', event => {
    const button = event.target.closest('[data-request]');
    if (!button) return;
    selected = requests.find(r => r.id === button.dataset.request);
    if (!selected) return;
    const r = selected, c = r.customer;
    $('#inbox-detail-title').textContent = types[r.type] + ' · ' + r.id;
    $('#inbox-detail').innerHTML = `<div class="detail-customer"><strong>${escape(c.name)}</strong><p>${escape(c.phone)}</p><p>${escape(c.email)}</p>${c.address ? `<p>${escape([c.address, c.ward, c.province].join(', '))}</p>` : ''}<p>Gửi lúc ${new Date(r.createdAt).toLocaleString('vi-VN')}</p></div><h3>${escape(r.topic)}</h3>${r.details ? `<p>Doanh nghiệp: ${escape(r.details.company || 'Không cung cấp')}<br>Số lượng dự kiến: ${escape(r.details.quantity ?? 'Chưa xác định')}<br>Ngân sách: ${escape(r.details.budget)}</p>` : ''}<p class="inbox-body">${escape(r.message || 'Không có lời nhắn bổ sung.')}</p>${r.items ? r.items.map(i => `<div class="detail-item"><span>${escape(i.name)}<small>${escape(i.weight)} · ${i.quantity} × ${Macca.money(i.price)}</small></span><strong>${Macca.money(i.price * i.quantity)}</strong></div>`).join('') + `<div class="detail-item"><span>Giao hàng ${r.shipping === 'express' ? 'nhanh' : 'tiêu chuẩn'}</span><span>${Macca.money(r.shippingFee)}</span></div><div class="order-total"><span>Tổng cộng · COD</span><strong>${Macca.money(r.total)}</strong></div><p class="muted">Yêu cầu đặt hàng đang chờ cửa hàng xử lý; chưa ghi nhận thanh toán.</p>` : ''}`;
    $('#inbox-status-form').elements.namedItem('status').value = r.status;
    $('#inbox-detail-error').textContent = '';
    $('#inbox-detail-dialog').showModal();
  });
  $('#inbox-status-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!selected || !loggedIn) return;
    const form = event.currentTarget, button = form.querySelector('[type="submit"]');
    if (button.disabled) return;
    button.disabled = true;
    try {
      await request('/api/admin/requests/' + encodeURIComponent(selected.id), { method: 'PATCH', body: JSON.stringify({ status: form.elements.namedItem('status').value, revision: selected.revision }) });
      $('#inbox-detail-dialog').close();
      await refresh();
    } catch (error) {
      if (error.status !== 401) { $('#inbox-detail-error').textContent = error.message; if (error.status === 409) await refresh(); }
    } finally { button.disabled = false; }
  });
  window.addEventListener('hashchange', () => { if (location.hash === '#inbox') refresh(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && location.hash === '#inbox') refresh(); });
  setInterval(() => { if (!document.hidden && location.hash === '#inbox') refresh(); }, 30000);
  MaccaAdminAuth.subscribe(user => {
    if (user) { loggedAs(); refresh(); }
    else loggedOut();
  });
})();
