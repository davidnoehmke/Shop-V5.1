import {useEffect, useRef} from 'react';
import {useLocation, type FetcherWithComponents} from 'react-router';
import {localizedPath} from '~/lib/locale-path';
import {CartForm, type OptimisticCartLineInput} from '@shopify/hydrogen';

type CartResult = {cart?: {id?: string} | null; errors?: Array<{message?: string}>};

export function AddToCartButton({analytics, children, disabled, lines, onSuccess, className}: {
  analytics?: unknown;
  children: React.ReactNode;
  disabled?: boolean;
  lines: Array<OptimisticCartLineInput>;
  onSuccess?: () => void;
  className?: string;
}) {
  const {pathname} = useLocation();
  return (
    <CartForm route={localizedPath('/cart', pathname)} inputs={{lines}} action={CartForm.ACTIONS.LinesAdd}>
      {(fetcher: FetcherWithComponents<CartResult>) => (
        <>
          <input name="analytics" type="hidden" value={JSON.stringify(analytics)} />
          <AddToCartStatus fetcher={fetcher} disabled={disabled} onSuccess={onSuccess} className={className}>
            {children}
          </AddToCartStatus>
        </>
      )}
    </CartForm>
  );
}

function AddToCartStatus({fetcher, disabled, onSuccess, children, className}: {
  fetcher: FetcherWithComponents<CartResult>;
  disabled?: boolean;
  onSuccess?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const isEnglish = useLocation().pathname.startsWith('/en/');
  const pending = useRef(false);
  useEffect(() => {
    if (fetcher.state !== 'idle') { pending.current = true; return; }
    if (!pending.current) return;
    pending.current = false;
    if (fetcher.data?.cart?.id && !fetcher.data.errors?.length) onSuccess?.();
  }, [fetcher.state, fetcher.data, onSuccess]);
  return (
    <>
      <button className={className} type="submit" disabled={Boolean(disabled) || fetcher.state !== 'idle'} aria-busy={fetcher.state !== 'idle'}>
        {children}
      </button>
      {fetcher.state === 'idle' && fetcher.data?.errors?.length ? (
        <p role="alert">{isEnglish ? 'The item could not be added. Check your selection and try again.' : 'Der Artikel konnte nicht hinzugefügt werden. Bitte prüfe die Auswahl und versuche es erneut.'}</p>
      ) : null}
    </>
  );
}
