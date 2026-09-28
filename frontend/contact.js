'use strict';
(() => {
  const $ = selector => document.querySelector(selector);
  const form = $('#contact-form');
  let messageText = '';
  const topics = {general:'Thông tin sản phẩm',order:'Hỗ trợ đơn hàng',partnership:'Hợp tác / phân phối',feedback:'Góp ý khác'};
  form.addEventListener('submit', event => {
    event.preventDefault();
    $('#contact-error').textContent = '';
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const get = name => String(data.get(name) || '').trim();
    if (get('name').length < 2 || get('message').length < 10) {
      $('#contact-error').textContent = 'Vui lòng nhập họ tên từ 2 ký tự và lời nhắn từ 10 ký tự, không chỉ gồm khoảng trắng.';
      form.elements.namedItem(get('name').length < 2 ? 'name' : 'message').focus();
      return;
    }
    if (get('phone') && !/^\+?\d{9,15}$/.test(get('phone').replace(/ /g,''))) {
      $('#contact-error').textContent = 'Số điện thoại cần có 9–15 chữ số, có thể bắt đầu bằng +.';
      form.elements.namedItem('phone').focus();
      return;
    }
    if (!topics[get('topic')]) { $('#contact-error').textContent = 'Vui lòng chọn một chủ đề liên hệ.'; return; }
    messageText = ['MACCA TOÀN THẮNG — LỜI NHẮN LIÊN HỆ (CHƯA GỬI)', 'Ngày tạo: ' + new Date().toLocaleString('vi-VN'), '', 'Họ tên: ' + get('name'), 'Email: ' + get('email'), 'Điện thoại: ' + (get('phone') || 'Không cung cấp'), 'Chủ đề: ' + topics[get('topic')], '', get('message'), '', 'Bản nháp trên thiết bị. Chưa gửi đến cửa hàng.'].join('\n');
    $('#contact-receipt').textContent = messageText;
    $('#contact-layout').hidden = true;
    $('#contact-success').hidden = false;
    $('#contact-success').focus();
  });
  $('#edit-contact').addEventListener('click', () => {
    $('#contact-layout').hidden = false; $('#contact-success').hidden = true;
    form.elements.namedItem('message').focus();
  });
  $('#download-contact').addEventListener('click', () => {
    if (messageText) Macca.download('macca-loi-nhan-lien-he.txt', messageText);
  });
})();
