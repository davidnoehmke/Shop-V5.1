/* LEAFerservice conversion diagnostics.
 * Namespaced interaction events only: no GA4 ecommerce or purchase events.
 * Shopify Customer Events / a configured GA4 pixel remain responsible for
 * deduplicated checkout completion and revenue attribution.
 */
(() => {
  const privacy = () => window.Shopify?.customerPrivacy;
  const allowed = () => {
    const customerPrivacy = privacy();
    return !!customerPrivacy && typeof customerPrivacy.analyticsProcessingAllowed === 'function'
      && customerPrivacy.analyticsProcessingAllowed() === true;
  };
  const emit = (name, data = {}) => {
    if (!allowed()) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: name, ...data });
  };
  const category = () => document.body?.dataset?.template || '';
  const productForm = () => document.querySelector('form[action*="/cart/add"]');
  const init = () => {
    if (document.querySelector('[data-variants]') || productForm()) {
      emit('leaf_product_view', { leaf_page: location.pathname });
    }
    if (document.querySelector('.main-cart')) {
      emit('leaf_cart_view', { leaf_page: location.pathname });
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const ledLink = target.closest('.leaf-led-home__product, [data-led-destination]');
    if (ledLink) emit('leaf_led_product_navigation', {
      leaf_destination: ledLink.getAttribute('href') || '',
      leaf_page: location.pathname
    });
    const checkoutButton = target.closest('.main-cart__checkout, [data-leaf-mobile-checkout]');
    if (checkoutButton && !checkoutButton.disabled) {
      emit('leaf_checkout_intent', { leaf_page: location.pathname });
    }
  }, true);
  document.addEventListener('leaf:cart-add-success', (event) => {
    emit('leaf_add_to_cart_confirmed', {
      leaf_page: location.pathname,
      leaf_product_id: String(event.detail?.productId || ''),
      leaf_variant_id: String(event.detail?.variantId || ''),
      leaf_quantity: Number(event.detail?.quantity || 1)
    });
  });
})();

