import type {ProductVariantFragment} from 'storefrontapi.generated';
import {Image} from '@shopify/hydrogen';

type FallbackImage = {
  url:string; altText?:string|null; width?:number|null; height?:number|null;
};

export function ProductImage({
  image, fallbackImage, locale='de',
}: {
  image:ProductVariantFragment['image'];
  fallbackImage?:FallbackImage|null;
  locale?:'de'|'en';
}) {
  if (!image && !fallbackImage?.url) {
    return <div className="product-image product-image--placeholder" role="img"
      aria-label={locale==='en'?'Product image unavailable':'Produktbild derzeit nicht verfügbar'}>
      <span>{locale==='en'?'Product photo unavailable':'Produktbild derzeit nicht verfügbar'}</span>
    </div>;
  }
  if (!image && fallbackImage?.url) {
    return <div className="product-image">
      <img src={fallbackImage.url} alt={fallbackImage.altText|| (locale==='en'?'Product photo':'Produktfoto')}
        width={fallbackImage.width||800} height={fallbackImage.height||800}
        loading="eager" decoding="async"/>
    </div>;
  }
  return <div className="product-image">
    <Image alt={image?.altText||(locale==='en'?'Product photo':'Produktfoto')} aspectRatio="1/1"
      data={image} key={image?.id} sizes="(min-width: 45em) 50vw, 100vw" loading="eager"/>
  </div>;
}
