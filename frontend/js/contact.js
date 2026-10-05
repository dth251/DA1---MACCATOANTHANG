'use strict';

(() => {
  const $ = selector => document.querySelector(selector);
  const form = $('#contact-form');
  if (!form) return;

  let messageText = '';
  let pendingContact = null;
  let sending = false;
  const send = MaccaRequests.sender('contact');
  const topics = {
    general: 'Thông tin sản phẩm',
    order: 'Hỗ trợ đơn hàng',
    partnership: 'Hợp tác / phân phối',
    feedback: 'Góp ý khác'
  };

  const notify = msg => {
    const toast = $('#toast');
    if (toast) {
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3500);
    }
  };

  // Đóng mở Modal xác nhận
  const closeContactModal = () => {
    const modal = $('#contact-confirm-modal');
    if (modal) {
      modal.hidden = true;
      modal.setAttribute('hidden', '');
      modal.style.display = 'none';
    }
  };

  $('#btn-contact-modal-close')?.addEventListener('click', closeContactModal);
  $('#btn-contact-modal-cancel')?.addEventListener('click', closeContactModal);
  $('#contact-confirm-modal')?.addEventListener('click', e => {
    if (e.target === $('#contact-confirm-modal')) closeContactModal();
  });

  // Khi bấm "Tiến hành gửi lời nhắn" ở Form
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (sending || messageText) return;
    if ($('#contact-error')) $('#contact-error').textContent = '';

    const data = new FormData(form);
    const get = name => String(data.get(name) || '').trim();

    const name = get('name');
    const email = get('email');
    const phone = get('phone');
    const topic = get('topic');
    const message = get('message');

    if (name.length < 2) {
      if ($('#contact-error')) $('#contact-error').textContent = 'Vui lòng nhập họ tên từ 2 ký tự trở lên.';
      form.elements.namedItem('name')?.focus();
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if ($('#contact-error')) $('#contact-error').textContent = 'Vui lòng nhập địa chỉ email hợp lệ để nhận phản hồi.';
      form.elements.namedItem('email')?.focus();
      return;
    }

    if (phone && !/^\+?[0-9 ]{9,15}$/.test(phone)) {
      if ($('#contact-error')) $('#contact-error').textContent = 'Số điện thoại cần có 9–15 chữ số, có thể bắt đầu bằng +.';
      form.elements.namedItem('phone')?.focus();
      return;
    }

    if (!topics[topic]) {
      if ($('#contact-error')) $('#contact-error').textContent = 'Vui lòng chọn một chủ đề liên hệ.';
      form.elements.namedItem('topic')?.focus();
      return;
    }

    if (message.length < 10) {
      if ($('#contact-error')) $('#contact-error').textContent = 'Vui lòng nhập nội dung lời nhắn từ 10 ký tự trở lên.';
      form.elements.namedItem('message')?.focus();
      return;
    }

    pendingContact = {
      name,
      email,
      phone,
      topic,
      message,
      consent: form.elements.namedItem('acknowledge')?.checked ?? true
    };

    // Điền dữ liệu vào Modal xác nhận
    if ($('#modal-contact-name')) $('#modal-contact-name').textContent = pendingContact.name;
    if ($('#modal-contact-email')) $('#modal-contact-email').textContent = pendingContact.email;
    if ($('#modal-contact-phone')) $('#modal-contact-phone').textContent = pendingContact.phone || 'Không cung cấp';
    if ($('#modal-contact-topic')) $('#modal-contact-topic').textContent = topics[pendingContact.topic] || pendingContact.topic;
    if ($('#modal-contact-msg')) $('#modal-contact-msg').textContent = pendingContact.message;

    // Hiển thị modal xác nhận
    const modal = $('#contact-confirm-modal');
    if (modal) {
      modal.hidden = false;
      modal.removeAttribute('hidden');
      modal.style.display = 'flex';
    }
  });

  // Khi bấm "Xác nhận gửi lời nhắn" trong Modal
  $('#btn-contact-modal-accept')?.addEventListener('click', async () => {
    if (sending || !pendingContact) return;
    sending = true;
    closeContactModal();

    let accepted;
    try {
      accepted = await send(form, {
        type: 'contact',
        consent: pendingContact.consent,
        customer: {
          name: pendingContact.name,
          email: pendingContact.email,
          phone: pendingContact.phone
        },
        topic: pendingContact.topic,
        message: pendingContact.message
      });
    } catch (error) {
      if ($('#contact-error')) $('#contact-error').textContent = error.message;
      sending = false;
      return;
    }
    sending = false;

    const dateStr = new Date(accepted.createdAt).toLocaleString('vi-VN');
    const hotlineStr = (window.OwnerContact && (window.OwnerContact.phoneDisplay || window.OwnerContact.phone)) || '0975.895.024';

    messageText = [
      '========================================',
      '      MACCA TOÀN THẮNG — LỜI NHẮN ĐÃ GỬI',
      '========================================',
      'Mã yêu cầu:     ' + accepted.id,
      'Ngày gửi:       ' + dateStr,
      'Hotline hỗ trợ: ' + hotlineStr + ' | Website: maccatoanthang.com',
      '----------------------------------------',
      'Họ tên:         ' + pendingContact.name,
      'Email:          ' + pendingContact.email,
      'Điện thoại:     ' + (pendingContact.phone || 'Không cung cấp'),
      'Chủ đề:         ' + topics[pendingContact.topic],
      '----------------------------------------',
      'NỘI DUNG LỜI NHẮN:',
      pendingContact.message,
      '========================================',
      'Đã được lưu vào hộp thư quản trị của cửa hàng.'
    ].join('\n');

    // Điền dữ liệu vào Bill tiếp nhận
    if ($('#contact-inv-code')) $('#contact-inv-code').textContent = accepted.id;
    if ($('#contact-inv-date')) $('#contact-inv-date').textContent = dateStr;
    if ($('#contact-inv-name')) $('#contact-inv-name').textContent = pendingContact.name;
    if ($('#contact-inv-email')) $('#contact-inv-email').textContent = pendingContact.email;
    if ($('#contact-inv-phone')) $('#contact-inv-phone').textContent = pendingContact.phone || 'Không cung cấp';
    if ($('#contact-inv-topic')) $('#contact-inv-topic').textContent = topics[pendingContact.topic] || pendingContact.topic;
    if ($('#contact-inv-message')) $('#contact-inv-message').textContent = pendingContact.message;

    // Cập nhật các trường động hotline / email
    if (window.OwnerContact?.applyToPage) window.OwnerContact.applyToPage();

    // Ẩn form, hiện giao diện bill thành công
    $('#contact-layout').hidden = true;
    if ($('#contact-heading')) $('#contact-heading').hidden = true;
    if ($('#contact-faq')) $('#contact-faq').hidden = true;
    $('#contact-success').hidden = false;

    // Ẩn dock nổi
    const dock = $('.owner-contact-dock');
    if (dock) dock.hidden = true;

    $('#contact-success').focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    notify('Đã gửi lời nhắn thành công! Đã tạo phiếu tiếp nhận.');
  });

  // In phiếu tiếp nhận lời nhắn
  $('#print-contact')?.addEventListener('click', () => {
    window.print();
  });

  // Sao chép mã lời nhắn
  $('#btn-copy-contact-code')?.addEventListener('click', () => {
    const code = $('#contact-inv-code')?.textContent;
    if (code && code !== '---') {
      navigator.clipboard?.writeText(code).then(() => {
        notify('Đã sao chép mã lời nhắn: ' + code);
      }).catch(() => {
        notify('Mã lời nhắn: ' + code);
      });
    }
  });

  // Tải phiếu file .txt
  $('#download-contact')?.addEventListener('click', () => {
    const code = $('#contact-inv-code')?.textContent || 'loi-nhan';
    if (messageText) Macca.download('macca-loi-nhan-' + code + '.txt', messageText);
  });

  // Gửi lời nhắn khác
  $('#edit-contact')?.addEventListener('click', () => {
    messageText = '';
    pendingContact = null;
    form.reset();
    $('#contact-layout').hidden = false;
    if ($('#contact-heading')) $('#contact-heading').hidden = false;
    if ($('#contact-faq')) $('#contact-faq').hidden = false;
    $('#contact-success').hidden = true;
    const dock = $('.owner-contact-dock');
    if (dock) dock.hidden = false;
    form.elements.namedItem('name')?.focus();
  });
})();
