import {useEffect, useRef} from 'react';
import {type FetcherWithComponents} from 'react-router';
import {CartForm, type OptimisticCartLineInput} from '@shopify/hydrogen';

type CartResult = {cart?: {id?: string} | null; errors?: Array<{message?: string}>};

export function AddToCartButton({analytics, children, disabled, lines, onSuccess}: {
  analytics?: unknown;
  children: React.ReactNode;
  disabled?: boolean;
  lines: Array<OptimisticCartLineInput>;
  onSuccess?: () => void;
}) {
  return (
    <CartForm route="/cart" inputs={{lines}} action={CartForm.ACTIONS.LinesAdd}>
      {(fetcher: FetcherWithComponents<CartResult>) => (
        <>
          <input name="analytics" type="hidden" value={JSON.stringify(analytics)} />
          <AddToCartStatus fetcher={fetcher} disabled={disabled} onSuccess={onSuccess}>
            {children}
          </AddToCartStatus>
        </>
      )}
    </CartForm>
  );
}

function AddToCartStatus({fetcher, disabled, onSuccess, children}: {
  fetcher: FetcherWithComponents<CartResult>;
  disabled?: boolean;
  onSuccess?: () => void;
  children: React.ReactNode;
}) {
  const pending = useRef(false);
  useEffect(() => {
    if (fetcher.state !== 'idle') { pending.current = true; return; }
    if (!pending.current) return;
    pending.current = false;
    if (fetcher.data?.cart?.id && !fetcher.data.errors?.length) onSuccess?.();
  }, [fetcher.state, fetcher.data, onSuccess]);
  return (
    <>
      <button type="submit" disabled={Boolean(disabled) || fetcher.state !== 'idle'} aria-busy={fetcher.state !== 'idle'}>
        {children}
      </button>
      {fetcher.state === 'idle' && fetcher.data?.errors?.length ? (
        <p role="alert">Der Artikel konnte nicht hinzugefügt werden. Bitte prüfe die Auswahl und versuche es erneut.</p>
      ) : null}
    </>
  );
}
