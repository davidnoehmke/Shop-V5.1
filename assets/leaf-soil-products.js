(() => {
  'use strict';
  const english = {
    heading: 'Choose your substrate components',
    note: 'Components for potting mixes. The regions shown do not indicate product origin or a recipe for recreating natural soils.',
    link: 'View product',
    products: [
      ['Pine bark', 'Coarse bark for mixing substrates for aroids, orchids and tropical houseplants. Combine with mineral and organic components.'],
      ['Lava granules', 'A mineral component for individual potting mixes. Combine with bark and other substrate ingredients.'],
      ['Orchid substrate', 'A coarse mix of pine bark, lava and Seramis for epiphytic orchids such as Phalaenopsis.']
    ]
  };
  const styles = `.soil-products{margin-top:18px;border-top:1px solid var(--line,#dce3d7);font:13px/1.6 'Helvetica Neue',Helvetica,Arial,sans-serif}.soil-products summary{min-height:44px;padding:12px 0;cursor:pointer;font-weight:600}.soil-products__note{margin:0 0 12px;color:#687a6e;font-size:12px}.soil-products__item{padding:12px 0;border-top:1px solid var(--line,#dce3d7)}.soil-products__item h3{margin:0 0 6px;font-size:15px}.soil-products__item p{margin:0 0 8px;font-size:12px}.soil-products__item a{display:inline-flex;align-items:center;min-height:44px;font-weight:600}.soil-products a:focus-visible,.soil-products summary:focus-visible{outline:3px solid #bc945b;outline-offset:3px}`;
  class LeafSoilProducts extends HTMLElement {
    connectedCallback() {
      this.globe = this.closest('leaf-soil-globe');
      if (!this.globe || this.visibility) return;
      this.opened = false;
      this.visibility = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) this.connectRoot();
      });
      this.visibility.observe(this.globe);
      customElements.whenDefined('leaf-soil-globe').then(() => {
        if (this.isConnected) this.connectRoot();
      });
    }
    connectRoot() {
      if (this.frame || this.observer) return;
      this.frame = requestAnimationFrame(() => {
        this.frame = null;
        if (!this.isConnected || !this.globe.shadowRoot) return;
        this.root = this.globe.shadowRoot;
        this.observer = new MutationObserver(() => this.render());
        this.observer.observe(this.root, { childList: true, subtree: true });
        this.visibility.disconnect();
        this.render();
      });
    }
    render() {
      const panel = this.root.querySelector('#detail');
      if (!panel || panel.querySelector('.soil-products')) return;
      const template = this.querySelector('template');
      if (!template) return;
      const fragment = template.content.cloneNode(true);
      const details = fragment.querySelector('details');
      if (!details.querySelector('article')) return;
      details.open = this.opened;
      details.addEventListener('toggle', () => { this.opened = details.open; });
      const lang = this.root.querySelector('.soil-world')?.lang || this.globe.dataset.language;
      details.lang = lang;
      if (lang?.startsWith('en')) {
        details.querySelectorAll('[data-soil-label]').forEach(node => {
          node.textContent = english[node.dataset.soilLabel];
        });
        details.querySelectorAll('[data-soil-product]').forEach(node => {
          const copy = english.products[Number(node.dataset.soilProduct)];
          node.querySelector('h3').textContent = copy[0];
          node.querySelector('p').textContent = copy[1];
        });
      }
      if (!this.root.querySelector('[data-soil-products-style]')) {
        const style = document.createElement('style');
        style.dataset.soilProductsStyle = '';
        style.textContent = styles;
        this.root.append(style);
      }
      panel.append(fragment);
    }
    disconnectedCallback() {
      this.visibility?.disconnect();
      this.observer?.disconnect();
      if (this.frame) cancelAnimationFrame(this.frame);
      this.frame = this.visibility = this.observer = null;
    }
  }
  if (!customElements.get('leaf-soil-products')) customElements.define('leaf-soil-products', LeafSoilProducts);
})();
