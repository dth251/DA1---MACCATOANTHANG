'use strict';
(() => {
  const $ = selector => document.querySelector(selector);
  const entries = MaccaJournal;
  const selected = new URLSearchParams(location.search).get('article');
  const normalize = text => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  let category = 'all';
  function render() {
    const query = normalize($('#journal-query').value.trim());
    const matches = entries.filter(item => (category === 'all' || item.category === category) && normalize(item.title + ' ' + item.description).includes(query));
    $('#journal-result').textContent = `Hiển thị ${matches.length} / ${entries.length} bài viết`;
    $('#article-grid').innerHTML = matches.length ? matches.map(item => `<article class="article-card"><a href="goc-macca.html?article=${item.slug}" aria-label="Đọc ${item.title}"><img src="${item.image}" alt="Ảnh minh họa ${item.label.toLowerCase()}" width="1024" height="1024" loading="lazy"></a><div><p class="eyebrow">${item.label} · GÓC MACCA</p><h2><a href="goc-macca.html?article=${item.slug}">${item.title}</a></h2><p>${item.description}</p><a class="text-link" href="goc-macca.html?article=${item.slug}">Đọc bài viết ↗</a></div></article>`).join('') : '<div class="empty-state"><h2>Chưa tìm thấy bài viết.</h2><p>Thử một từ khóa khác hoặc đặt lại bộ lọc.</p><button class="button" id="reset-journal">Xem tất cả bài viết</button></div>';
  }
  function setCategory(next) {
    category = next;
    document.querySelectorAll('[data-journal-filter]').forEach(button => {
      const active = button.dataset.journalFilter === category;
      button.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', String(active));
    });
    render();
  }
  if (selected) {
    const item = entries.find(entry => entry.slug === selected);
    $('#journal-list').hidden = true;
    $('#journal-reading').hidden = false;
    if (item) {
      document.title = item.title + ' | Góc macca';
      $('#journal-reading').innerHTML = `<div class="reading-layout"><article><p class="eyebrow">${item.label} · GÓC MACCA TOÀN THẮNG</p><h1 class="reading-title">${item.title}</h1><img class="reading-cover" src="${item.image}" alt="Ảnh minh họa ${item.label.toLowerCase()}" width="1024" height="1024"><p class="reading-caption">Ảnh minh họa được tạo bằng AI.</p><div class="reading-body">${item.body}</div><a class="text-link reading-back" href="goc-macca.html">← Tất cả bài viết</a></article><aside class="reading-sidebar"><h2>Mang vị ngon vào ngày mới.</h2><p>Khám phá macca nguyên vỏ, nhân macca và những hộp quà dành cho người thương.</p><a class="button" href="san-pham.html">Xem sản phẩm ↗</a><h2>Đọc thêm</h2>${entries.filter(entry => entry.slug !== item.slug).map(entry => `<a class="text-link" href="goc-macca.html?article=${entry.slug}">${entry.title} →</a>`).join('')}</aside></div>`;
    } else {
      $('#journal-reading').innerHTML = '<div class="empty-state"><h1>Bài viết chưa có trong Góc macca.</h1><p>Hãy quay lại để khám phá những câu chuyện khác.</p><a class="button" href="goc-macca.html">Về Góc macca →</a></div>';
    }
  } else {
    $('#journal-search').addEventListener('submit', event => { event.preventDefault(); render(); });
    $('#journal-query').addEventListener('input', render);
    document.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.dataset.journalFilter) setCategory(button.dataset.journalFilter);
      if (button.id === 'reset-journal') { $('#journal-query').value = ''; setCategory('all'); $('#journal-query').focus(); }
    });
    render();
  }
})();
