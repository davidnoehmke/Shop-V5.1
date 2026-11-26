(() => {
  const initialize = (root) => {
    root.querySelectorAll('.leaf-editorial__form').forEach((form) => {
      const error = form.querySelector('[data-cart-error]');
      if (error && !form.dataset.cartErrorMessage) form.dataset.cartErrorMessage = error.textContent.trim();
    });
    root.querySelectorAll('[data-editorial-variant]').forEach((select) => {
      if (select.dataset.editorialReady) return;
      select.dataset.editorialReady = 'true';
      const form = select.closest('form');
      const price = form?.querySelector('[data-editorial-price]');
      const unitPrice = form?.querySelector('[data-editorial-unit-price]');
      if (!price) return;
      const update = () => {
        const option = select.selectedOptions[0];
        if (option?.dataset.price) price.textContent = option.dataset.price;
        if (unitPrice) {
          unitPrice.textContent = option?.dataset.unitPrice || '';
          unitPrice.hidden = !unitPrice.textContent;
        }
      };
      select.addEventListener('change', update);
      update();
    });
  };
  initialize(document);
  document.addEventListener('shopify:section:load', (event) => initialize(event.target));
})();
