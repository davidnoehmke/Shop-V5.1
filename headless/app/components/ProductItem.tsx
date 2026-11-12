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
      <div className="product-item__media">
        {image ? (
          <Image
            alt={image.altText || product.title}
            aspectRatio="1/1"
            data={image}
            loading={loading}
            sizes="(min-width: 1000px) 25vw, (min-width: 640px) 33vw, 50vw"
          />
        ) : (
          <div className="product-item__no-image" role="img" aria-label="Produktbild derzeit nicht verfügbar">Produktbild nicht verfügbar</div>
        )}
      </div>
      <h4>{product.title}</h4>
      <small>
        <Money data={product.priceRange.minVariantPrice} />
      </small>
    </Link>
  );
}

