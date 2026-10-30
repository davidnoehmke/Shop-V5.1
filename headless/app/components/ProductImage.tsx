import {useEffect, useState} from 'react';
import {Image} from '@shopify/hydrogen';
import type {ProductVariantFragment} from 'storefrontapi.generated';

type GalleryImage = NonNullable<ProductVariantFragment['image']>;

export function ProductImage({
  image,
  images = [],
  title = 'Produkt',
  locale = 'de',
}: {
  image: ProductVariantFragment['image'];
  images?: GalleryImage[];
  title?: string;
  locale?: 'de' | 'en';
}) {
  const [activeId, setActiveId] = useState<string | null>(
    image?.id ?? images[0]?.id ?? null,
  );
  useEffect(() => {
    setActiveId(image?.id ?? images[0]?.id ?? null);
  }, [image?.id, images[0]?.id]);
  const gallery = [...(image ? [image] : []), ...images].filter(
    (entry, index, all) =>
      all.findIndex((other) => other.id === entry.id) === index,
  );
  const activeImage = gallery.find((entry) => entry.id === activeId) ?? gallery[0];
  const english = locale === 'en';

  return (
    <div className="product-gallery">
      <div className="product-gallery__stage">
        {activeImage ? (
          <Image
            key={activeImage.id}
            data={activeImage}
            alt={activeImage.altText || title}
            aspectRatio="1/1"
            sizes="(min-width: 1100px) 600px, (min-width: 768px) 48vw, 100vw"
            loading="eager"
          />
        ) : (
          <div
            className="product-gallery__missing"
            role="img"
            aria-label={english ? 'No product image available' : 'Kein Produktbild verfügbar'}
          >
            <span aria-hidden="true">LEAF</span>
            <small>{english ? 'Image coming soon' : 'Produktbild folgt'}</small>
          </div>
        )}
      </div>
      {gallery.length > 1 ? (
        <div className="product-gallery__thumbnails" role="group" aria-label={english ? 'Product images' : 'Produktansichten'}>
          {gallery.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              className={entry.id === activeImage?.id ? 'product-gallery__thumbnail is-active' : 'product-gallery__thumbnail'}
              onClick={() => setActiveId(entry.id ?? null)}
              aria-pressed={entry.id === activeImage?.id}
              aria-label={(english ? 'View image ' : 'Bild anzeigen ') + (index + 1) + (english ? ' of ' : ' von ') + gallery.length}
            >
              <Image data={entry} alt="" aspectRatio="1/1" sizes="96px" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
