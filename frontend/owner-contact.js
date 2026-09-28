'use strict';
// Add only confirmed public contact details here.
const OwnerContact = {phone:'',zalo:'',facebook:'',gmail:''};
(() => {
  const phone = OwnerContact.phone.replace(/[\s().-]/g, '');
  const channels = {
    phone: /^\+?\d{9,15}$/.test(phone) ? 'tel:' + phone : null,
    zalo: null,
    facebook: null,
    gmail: /^[^\s@]+@gmail\.com$/i.test(OwnerContact.gmail) ? 'mailto:' + OwnerContact.gmail : null
  };
  for (const key of ['zalo','facebook']) {
    try {
      const url = new URL(OwnerContact[key]);
      const allowed = key === 'zalo' ? ['zalo.me','www.zalo.me','oa.zalo.me'] : ['facebook.com','www.facebook.com','m.facebook.com','fb.com','www.fb.com'];
      if (url.protocol === 'https:' && allowed.includes(url.hostname)) channels[key] = url.href;
    } catch {}
  }
  const labels = {phone:'Gọi điện',zalo:'Mở Zalo',facebook:'Mở Facebook',gmail:'Gửi Gmail'};
  document.querySelectorAll('[data-contact-channel]').forEach(link => {
    const url = channels[link.dataset.contactChannel];
    if (!url) return;
    link.href = url;
    link.removeAttribute('aria-disabled');
    link.setAttribute('aria-label',labels[link.dataset.contactChannel]);
    link.title = labels[link.dataset.contactChannel];
    if (url.startsWith('https:')) {link.target='_blank';link.rel='noopener noreferrer';}
  });
})();
