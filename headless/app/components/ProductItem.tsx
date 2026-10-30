import {Link, useLocation} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import type {
  ProductItemFragment,
  CollectionItemFragment,
} from 'storefrontapi.generated';
import {useVariantUrl} from '~/lib/variants';
import {localizedPath} from '~/lib/locale-path';

export function ProductItem({
  product,
  loading,
}: {
  product:
    | CollectionItemFragment
    | ProductItemFragment;
  loading?: 'eager' | 'lazy';
}) {
  const variantUrl = useVariantUrl(product.handle);
  const location = useLocation();
  const localizedVariantUrl = localizedPath(variantUrl, location.pathname);
  const image = product.featuredImage;
  return (
    <Link
      className="product-item"
      key={product.id}
      prefetch="intent"
      to={localizedVariantUrl}
    >
      <span className="product-item__media">{image ? (
        <Image
          alt={image.altText || product.title}
          aspectRatio="1/1"
          data={image}
          loading={loading}
          sizes="(min-width: 45em) 400px, 100vw"
        />
      ) : <span className="product-item__fallback" aria-hidden="true">LEAF</span>}</span>
      <span className="product-item__body">
        {'vendor' in product && product.vendor ? <span className="product-item__vendor">{product.vendor}</span> : null}
        <span className="product-item__title">{product.title}</span>
        <span className="product-item__foot"><span className="product-item__price"><Money data={product.priceRange.minVariantPrice} /></span><span className="product-item__arrow" aria-hidden="true">↗</span></span>
      </span>
    </Link>
  );
}

