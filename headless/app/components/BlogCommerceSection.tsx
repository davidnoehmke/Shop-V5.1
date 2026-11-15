import {Image, Money} from '@shopify/hydrogen';
import type {CurrencyCode} from '@shopify/hydrogen/storefront-api-types';
import {Link} from 'react-router';
import type {BlogLocale} from '~/lib/blog-routing';

export type ArticleCommerceProduct = {
  id: string;
  handle: string;
  title: string;
  vendor: string;
  availableForSale: boolean;
  featuredImage?: {
    id?: string | null;
    url: string;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
  priceRange: {minVariantPrice: {amount: string; currencyCode: CurrencyCode}};
};

export function BlogCommerceSection({
  products,
  locale,
}: {
  products: Array<ArticleCommerceProduct | null>;
  locale: BlogLocale;
}) {
  // A product that is merely ACTIVE in Admin is not necessarily purchasable.
  const visible = products.filter((product): product is ArticleCommerceProduct =>
    Boolean(product?.availableForSale && product.featuredImage?.url),
  );
  if (!visible.length) return null;

  const isEnglish = locale === 'en';
  return (
    <section className="leaf-blog-commerce" aria-labelledby="leaf-blog-commerce-heading">
      <div className="leaf-blog-commerce__intro">
        <p className="page-eyebrow">{isEnglish ? 'From guide to practice' : 'Vom Wissen zur Anwendung'}</p>
        <h2 id="leaf-blog-commerce-heading">
          {isEnglish ? 'Products that fit this guide' : 'Passend zu diesem Ratgeber'}
        </h2>
        <p>
          {isEnglish
            ? 'Explore a few relevant items. Check product details and options before ordering.'
            : 'Eine kleine Auswahl passender Artikel. Details und Varianten pruefst du auf der jeweiligen Produktseite.'}
        </p>
      </div>
      <div className="leaf-blog-commerce__grid">
        {visible.map((product) => (
          <article className="leaf-blog-commerce__product" key={product.id}>
            <Link to={(isEnglish ? '/en' : '') + '/products/' + encodeURIComponent(product.handle)} prefetch="intent">
              <div className="leaf-blog-commerce__image">
                <Image
                  data={product.featuredImage!}
                  loading="lazy"
                  sizes="(min-width: 1000px) 260px, (min-width: 600px) 40vw, 88vw"
                  aspectRatio="1/1"
                  alt={product.featuredImage?.altText || product.title}
                />
              </div>
              <div className="leaf-blog-commerce__copy">
                <span>{product.vendor}</span>
                <h3>{product.title}</h3>
                <div className="leaf-blog-commerce__bottom">
                  <Money data={product.priceRange.minVariantPrice} />
                  <strong>{isEnglish ? 'View details' : 'Produkt ansehen'} →</strong>
                </div>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
