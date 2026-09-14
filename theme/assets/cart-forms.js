(() => {
  const formSelector = 'form.js-leafer-cart-form';

  const getRoot = () => {
    const root = window.Shopify?.routes?.root || '/';
    return root.endsWith('/') ? root : `${root}/`;
  };

  const getSubmitButtons = (form) => {
    const buttons = Array.from(form.querySelectorAll('button[name="add"]'));

    if (form.id) {
      document.querySelectorAll(`button[name="add"][form="${form.id}"]`).forEach((button) => {
        if (!buttons.includes(button)) buttons.push(button);
      });
    }

    return buttons;
  };

  const setBusy = (form, busy) => {
    form.toggleAttribute('aria-busy', busy);
    form.dataset.leaferSubmitting = busy ? 'true' : 'false';

    getSubmitButtons(form).forEach((button) => {
      button.disabled = busy;
      button.toggleAttribute('aria-busy', busy);
    });
  };

  const getErrorRegion = (form) => form.querySelector('[data-cart-error]');

  const clearError = (form) => {
    const region = getErrorRegion(form);
    if (!region) return;

    region.textContent = '';
    region.hidden = true;
  };

  const showError = (form, message) => {
    const region = getErrorRegion(form);
    if (!region) return;

    region.textContent = message;
    region.hidden = false;
  };

  document.addEventListener('submit', async (event) => {
    const form = event.target;
    const submitter = event.submitter;

    if (!(form instanceof HTMLFormElement) || !form.matches(formSelector)) return;
    if (!(submitter instanceof HTMLButtonElement) || submitter.name !== 'add') return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (form.dataset.leaferSubmitting === 'true') return;

    clearError(form);
    setBusy(form, true);

    try {
      const root = getRoot();
      const response = await fetch(new URL(`${root}cart/add.js`, window.location.origin), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: new FormData(form),
        credentials: 'same-origin'
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.description || result.message || form.dataset.cartErrorMessage);
      }

      window.location.assign(new URL(`${root}cart`, window.location.origin));
    } catch (error) {
      const fallbackMessage = form.dataset.cartErrorMessage || 'This product could not be added to the cart.';
      showError(form, error instanceof Error && error.message ? error.message : fallbackMessage);
      setBusy(form, false);
    }
  }, true);
})();
