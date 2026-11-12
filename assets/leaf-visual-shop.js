if (!customElements.get('leaf-visual-shop')) {
  customElements.define('leaf-visual-shop', class extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;
      const cards = [...this.querySelectorAll('[data-category]')];
      const filters = [...this.querySelectorAll('[data-filter]')];
      const results = this.querySelector('[data-results]');
      const update = (group) => {
        let visible = 0;
        cards.forEach(card => {
          card.hidden = group !== 'all' && card.dataset.category !== group;
          if (!card.hidden) visible++;
        });
        filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === group)));
        results.textContent = `${visible} ${results.dataset.label}`;
      };
      this.querySelector('.leaf-vshop__filters').hidden = false;
      filters.forEach(button => button.addEventListener('click', () => update(button.dataset.filter)));
      update('lighting');
      this.querySelectorAll('[data-open]').forEach(button => {
        const dialog = this.querySelector(`[id="${CSS.escape(button.dataset.open)}"]`);
        if (!dialog || typeof dialog.showModal !== 'function') return;
        button.hidden = false;
        button.addEventListener('click', () => {
          dialog.showModal();
          document.documentElement.classList.add('leaf-vshop-modal-open');
        });
        dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
        dialog.addEventListener('click', event => {
          if (event.target !== dialog) return;
          const bounds = dialog.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
        });
        dialog.addEventListener('close', () => {
          if (!document.querySelector('.leaf-vshop__dialog[open]')) document.documentElement.classList.remove('leaf-vshop-modal-open');
          button.focus();
        });
        dialog.querySelector('[data-variant]').addEventListener('change', event => {
          const option = event.target.selectedOptions[0];
          dialog.querySelector('[data-price]').textContent = option.dataset.price;
          dialog.querySelector('[name="add"]').disabled = option.dataset.available !== 'true';
        });
      });
    }
    disconnectedCallback() {
      if (this.querySelector('dialog[open]')) document.documentElement.classList.remove('leaf-vshop-modal-open');
    }
  });
}
