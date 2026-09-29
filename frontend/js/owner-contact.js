'use strict';

/**
 * THÔNG TIN LIÊN HỆ MACCA TOÀN THẮNG
 * Tự động đồng bộ với Cài đặt web khách hàng từ trang quản trị admin.
 */
const SETTINGS_KEY = 'macca-toan-thang-web-settings-v1';
let savedWebSettings = null;
try {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (raw) savedWebSettings = JSON.parse(raw);
} catch {}

const OwnerContact = {
  phone: savedWebSettings?.phone || '0988245476',
  phoneDisplay: savedWebSettings?.phoneDisplay || '0988 245 476',
  zalo: savedWebSettings?.zalo || 'https://zalo.me/0988245476',
  facebook: savedWebSettings?.facebook || 'https://facebook.com/maccatoanthang',
  gmail: savedWebSettings?.email || 'maccatoanthang@gmail.com',
  settings: savedWebSettings
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

  function initDock() {
    const dock = document.querySelector('.owner-contact-dock');
    if (!dock) return;

    const channels = {
      phone: {
        href: `tel:${OwnerContact.phone}`,
        tooltip: `Hotline: ${OwnerContact.phoneDisplay || OwnerContact.phone}`,
        label: `Gọi điện hotline Macca Toàn Thắng (${OwnerContact.phoneDisplay})`,
        onClick: (e) => {
          copyToClipboard(OwnerContact.phone);
          showToast(`📞 Đang gọi ${OwnerContact.phoneDisplay} (Đã sao chép số điện thoại)`);
        }
      },
      zalo: {
        href: OwnerContact.zalo,
        tooltip: `Chat Zalo: ${OwnerContact.phoneDisplay || OwnerContact.phone}`,
        label: `Nhắn tin qua Zalo Macca Toàn Thắng`,
        isExternal: true,
        onClick: (e) => {
          showToast(`💬 Đang mở Zalo chat cùng Macca Toàn Thắng...`);
        }
      },
      facebook: {
        href: OwnerContact.facebook,
        tooltip: `Facebook: Macca Toàn Thắng`,
        label: `Truy cập Fanpage Facebook Macca Toàn Thắng`,
        isExternal: true,
        onClick: (e) => {
          showToast(`🌐 Đang mở trang Facebook Macca Toàn Thắng...`);
        }
      },
      gmail: {
        href: `mailto:${OwnerContact.gmail}?subject=T%C6%B0%20v%E1%BA%A5n%20Macca%20To%C3%A0n%20Th%E1%BA%AFng`,
        tooltip: `Gmail: ${OwnerContact.gmail}`,
        label: `Gửi email tới ${OwnerContact.gmail}`,
        onClick: (e) => {
          copyToClipboard(OwnerContact.gmail);
          showToast(`✉️ Đang mở trình soạn email (Đã sao chép ${OwnerContact.gmail})`);
        }
      }
    };

    dock.querySelectorAll('[data-contact-channel]').forEach(link => {
      const key = link.dataset.contactChannel;
      const conf = channels[key];
      if (!conf) return;

      // Cập nhật SVG logo sắc nét chuẩn nhận diện
      if (ICONS[key]) {
        link.innerHTML = ICONS[key];
      }

      link.href = conf.href;
      link.removeAttribute('aria-disabled');
      link.setAttribute('aria-label', conf.label);
      link.setAttribute('title', conf.tooltip);
      link.setAttribute('data-tooltip', conf.tooltip);

      if (conf.isExternal) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }

      link.addEventListener('click', conf.onClick);
    });
  }

  function initAnnouncement() {
    if (!savedWebSettings || savedWebSettings.announcementEnable !== 'true' || !savedWebSettings.announcementText) return;
    if (document.querySelector('.top-announcement-bar') || sessionStorage.getItem('macca-hide-announcement')) return;
    const bar = document.createElement('div');
    bar.className = 'top-announcement-bar';
    const linkHtml = savedWebSettings.announcementLink ? `<a href="${savedWebSettings.announcementLink}">Tìm hiểu thêm ↗</a>` : '';
    bar.innerHTML = `<span>${savedWebSettings.announcementText}</span> ${linkHtml} <button type="button" class="announcement-close" aria-label="Đóng thông báo">×</button>`;
    bar.querySelector('.announcement-close')?.addEventListener('click', () => {
      bar.remove();
      sessionStorage.setItem('macca-hide-announcement', '1');
    });
    document.body.prepend(bar);
  }

  function start() {
    initDock();
    initAnnouncement();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
