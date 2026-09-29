'use strict';
(() => {
  const updateCart = () => {
    document.querySelector('#cart-count').textContent = Macca.count(Macca.read());
  };
  document.querySelector('#year').textContent = new Date().getFullYear();
  updateCart();
  window.addEventListener('pageshow', updateCart);
  window.addEventListener('storage', event => {
    if (event.key === Macca.key || event.key === null) updateCart();
  });
})();
