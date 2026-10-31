import {Link, useLoaderData} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import {loader} from './pflanzenlicht-vergleich';
import type {Route} from './+types/en.pflanzenlicht-vergleich';

export {loader};
export const meta: Route.MetaFunction = () => [
  {title: 'Compare grow lights | LEAFerservice'},
  {name: 'description', content: 'Compare real grow lights, prices and availability using verified Shopify product information.'},
];

export default function EnglishLightComparison() {
  const {products} = useLoaderData<typeof loader>();
  return <main className="page-shell leaf-compare">
    <header className="leaf-compare__header">
      <p className="page-eyebrow">Grow lights · Product comparison</p>
      <h1>Compare grow lights</h1>
      <p className="page-lead">Explore real products, prices and availability from our Shopify catalog. Technical specifications are only shown when verified.</p>
    </header>
    {products.length ? <section className="leaf-compare__grid" aria-label="Available grow lights">
      {products.map((product) => <article className="leaf-compare__product" key={product.id}>
        <Link to={`/en/products/${product.handle}`}>
          <div className="leaf-compare__image">{product.featuredImage ? <Image data={product.featuredImage} loading="lazy" sizes="(max-width: 720px) 90vw, 33vw"/> : <span>Product image unavailable</span>}</div>
          <h2>{product.title}</h2>
        </Link>
        <p>{product.vendor}</p>
        <strong><Money data={product.priceRange.minVariantPrice}/></strong>
        <p>{product.availableForSale ? 'Available to order' : 'Currently unavailable'}</p>
        <Link className="leaf-compare__cta" to={`/en/products/${product.handle}`}>View product →</Link>
      </article>)}
    </section> : <div className="leaf-compare__empty"><h2>No suitable products found right now.</h2><p>Please try the product search.</p><Link to="/en/search?q=LED">Search grow lights →</Link></div>}
  </main>;
}
