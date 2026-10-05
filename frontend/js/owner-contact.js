'use strict';

/**
 * THÔNG TIN LIÊN HỆ MACCA TOÀN THẮNG
 * Tự động đồng bộ 100% thời gian thực giữa Cài đặt Admin và Giao diện Khách hàng.
 */
const SETTINGS_KEY = 'macca-toan-thang-web-settings-v1';

const defaultSettings = {
  brandName: 'Macca Toàn Thắng',
  phone: '0975895024',
  phoneDisplay: '0975.895.024',
  zalo: 'https://zalo.me/0975895024',
  facebook: 'https://facebook.com/maccatoanthang',
  email: 'maccatoanthang@gmail.com',
  address: 'Sơn Lương, Phú Thọ'
};

function formatPhoneDisplay(raw) {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) {
    if (raw.includes('.')) return raw;
    return digits.slice(0, 4) + ' ' + digits.slice(4, 7) + ' ' + digits.slice(7);
  }
  return raw;
}

function loadLocalSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultSettings, ...parsed };
    }
  } catch {}
  return { ...defaultSettings };
}

window.OwnerContact = {
  get: loadLocalSettings,
  ...loadLocalSettings(),

  applyToPage: function() {
    const s = loadLocalSettings();
    Object.assign(window.OwnerContact, s);

    const cleanPhone = String(s.phone || '').replace(/\D/g, '') || '0975895024';
    const displayPhone = s.phoneDisplay || formatPhoneDisplay(s.phone) || '0975.895.024';
    const zaloUrl = (s.zalo && !s.zalo.includes('0988245476')) ? s.zalo : ('https://zalo.me/' + cleanPhone);

    // 1. Cập nhật thanh liên hệ nổi (.owner-contact-dock)
    const dock = document.querySelector('.owner-contact-dock');
    if (dock) {
      const phoneLink = dock.querySelector('[data-contact-channel="phone"]');
      if (phoneLink) {
        phoneLink.href = 'tel:' + cleanPhone;
        phoneLink.setAttribute('title', 'Hotline: ' + displayPhone);
        phoneLink.setAttribute('data-tooltip', 'Hotline: ' + displayPhone);
        phoneLink.setAttribute('aria-label', 'Gọi điện hotline ' + displayPhone);
      }

      const zaloLink = dock.querySelector('[data-contact-channel="zalo"]');
      if (zaloLink) {
        zaloLink.href = zaloUrl;
        zaloLink.setAttribute('title', 'Chat Zalo: ' + displayPhone);
        zaloLink.setAttribute('data-tooltip', 'Chat Zalo: ' + displayPhone);
        zaloLink.setAttribute('aria-label', 'Nhắn tin qua Zalo Macca Toàn Thắng');
      }

      const fbLink = dock.querySelector('[data-contact-channel="facebook"]');
      if (fbLink && s.facebook) {
        fbLink.href = s.facebook;
        fbLink.setAttribute('title', 'Facebook: ' + s.brandName);
        fbLink.setAttribute('data-tooltip', 'Facebook: ' + s.brandName);
      }

      const gmailLink = dock.querySelector('[data-contact-channel="gmail"]');
      if (gmailLink && s.email) {
        gmailLink.href = 'mailto:' + s.email + '?subject=T%C6%B0%20v%E1%BA%A5n%20Macca%20To%C3%A0n%20Th%E1%BA%AFng';
        gmailLink.setAttribute('title', 'Gmail: ' + s.email);
        gmailLink.setAttribute('data-tooltip', 'Gmail: ' + s.email);
      }
    }

    // 2. Cập nhật tất cả liên kết tel: và mailto: và zalo trên toàn bộ website
    document.querySelectorAll('a[href^="tel:"]').forEach(a => {
      a.href = 'tel:' + cleanPhone;
      if (a.getAttribute('data-tooltip')?.includes('Hotline')) {
        a.setAttribute('data-tooltip', 'Hotline: ' + displayPhone);
      }
      if (a.title?.includes('Hotline')) {
        a.title = 'Hotline: ' + displayPhone;
      }
    });

    document.querySelectorAll('a[href*="zalo.me"]').forEach(a => {
      a.href = zaloUrl;
      if (a.getAttribute('data-tooltip')?.includes('Zalo')) {
        a.setAttribute('data-tooltip', 'Chat Zalo: ' + displayPhone);
      }
      if (a.title?.includes('Zalo')) {
        a.title = 'Chat Zalo: ' + displayPhone;
      }
    });

    document.querySelectorAll('a[href*="facebook.com"]').forEach(a => {
      if (s.facebook) a.href = s.facebook;
    });

    document.querySelectorAll('a[href^="mailto:"]').forEach(a => {
      if (s.email) a.href = 'mailto:' + s.email + '?subject=T%C6%B0%20v%E1%BA%A5n%20Macca%20To%C3%A0n%20Th%E1%BA%AFng';
    });

    // 3. Cập nhật Hotline và thông tin trong Phiếu thanh toán (Bill)
    document.querySelectorAll('.invoice-contact-line').forEach(el => {
      const addrPrefix = s.address ? (s.address.split(',')[0].trim() + ' · ') : 'Đắk Lắk · ';
      el.innerHTML = `${addrPrefix}Hotline: <strong>${displayPhone}</strong> · Website: maccatoanthang.com`;
    });

    document.querySelectorAll('.invoice-footer-note p').forEach(el => {
      el.innerHTML = `<em>Quý khách được đồng kiểm (kiểm tra hàng) trước khi thanh toán. Mọi hỗ trợ đơn hàng xin liên hệ Hotline: <strong>${displayPhone}</strong>.</em>`;
    });

    // 4. Cập nhật các trường gắn data-contact
    document.querySelectorAll('[data-contact="phone"], [data-contact="hotline"]').forEach(el => {
      el.textContent = displayPhone;
    });
    document.querySelectorAll('[data-contact="email"]').forEach(el => {
      el.textContent = s.email;
    });
    document.querySelectorAll('[data-contact="address"]').forEach(el => {
      el.textContent = s.address;
    });
    document.querySelectorAll('[data-contact="brand"]').forEach(el => {
      el.textContent = s.brandName;
    });

    // 5. Cập nhật địa chỉ trang liên hệ
    const contactAddress = document.querySelector('.contact-details p');
    if (contactAddress && s.address) {
      contactAddress.textContent = s.address;
    }
  }
};

(() => {
  // Biểu tượng chuẩn nhận diện thương hiệu
  const ICONS = {
    phone: `<img src="assets/phone-icon.png" alt="Điện thoại" width="47" height="47">`,
    zalo: `<img src="assets/zalo-icon.png" alt="Zalo" width="36" height="36">`,
    facebook: `<img src="assets/facebook-icon.png" alt="Facebook" width="47" height="47">`,
    gmail: `<img src="assets/gmail-icon.png" alt="Gmail" width="34" height="34">`
  };

  // Toast thông báo phản hồi thao tác
  let toastTimer = null;
  function showToast(message) {
    let toast = document.querySelector('.owner-contact-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'owner-contact-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  // Sao chép nội dung vào clipboard
  async function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) { }
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch (e) {
      return false;
    }
  }

  function bindDockClicks() {
    const dock = document.querySelector('.owner-contact-dock');
    if (!dock) return;

    dock.querySelectorAll('[data-contact-channel]').forEach(link => {
      const key = link.dataset.contactChannel;
      if (ICONS[key] && !link.querySelector('img')) {
        link.innerHTML = ICONS[key];
      }

      link.addEventListener('click', (e) => {
        const s = window.OwnerContact.get();
        const displayPhone = s.phoneDisplay || formatPhoneDisplay(s.phone);
        const cleanPhone = String(s.phone || '').replace(/\D/g, '');

        if (key === 'phone') {
          copyToClipboard(cleanPhone);
          showToast(`📞 Đang gọi ${displayPhone} (Đã sao chép số điện thoại)`);
        } else if (key === 'zalo') {
          showToast(`💬 Đang mở Zalo chat cùng ${s.brandName}...`);
        } else if (key === 'facebook') {
          showToast(`🌐 Đang mở Fanpage ${s.brandName}...`);
        } else if (key === 'gmail') {
          copyToClipboard(s.email);
          showToast(`✉️ Đang mở trình soạn email (Đã sao chép ${s.email})`);
        }
      });
    });
  }

  // Tải cài đặt từ server để đồng bộ đa trình duyệt
  async function syncFromServer() {
    try {
      let res = await fetch('/api/settings');
      if (!res.ok) {
        res = await fetch('assets/web-settings.json');
      }
      if (res.ok) {
        const remote = await res.json();
        if (remote && remote.phone) {
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(remote));
          window.OwnerContact.applyToPage();
        }
      }
    } catch {
      try {
        const fallbackRes = await fetch('assets/web-settings.json');
        if (fallbackRes.ok) {
          const remote = await fallbackRes.json();
          if (remote && remote.phone) {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(remote));
            window.OwnerContact.applyToPage();
          }
        }
      } catch {}
    }
  }

  function start() {
    window.OwnerContact.applyToPage();
    bindDockClicks();
    syncFromServer();
  }

  // Lắng nghe sự kiện cập nhật cài đặt từ Admin (cùng tab hoặc khác tab)
  window.addEventListener('storage', event => {
    if (event.key === SETTINGS_KEY || event.key === null) {
      window.OwnerContact.applyToPage();
    }
  });

  window.addEventListener('macca:settings-updated', () => {
    window.OwnerContact.applyToPage();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
