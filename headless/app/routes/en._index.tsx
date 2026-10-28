import {Link} from 'react-router';
import type {Route} from './+types/en._index';

export const meta: Route.MetaFunction = () => [
  {title: 'LEAFerservice Headless Preview | English'},
  {
    name: 'description',
    content:
      'English LEAFerservice headless preview for plant lighting, specialist products and research-led plant care content.',
  },
  {name: 'robots', content: 'noindex,nofollow'},
];

export default function EnglishHome() {
  return (
    <div className="page-shell">
      <header className="page-intro">
        <p className="page-eyebrow">English headless preview</p>
        <h1>Plant products connected to useful knowledge.</h1>
        <p className="page-lead">
          This preview is the first English LEAFerservice headless product world.
          It combines commerce data from Shopify with research-led guidance and
          topic-based internal linking.
        </p>
      </header>

      <section className="seo-intent-section">
        <p className="page-eyebrow">Start with Venso</p>
        <h2>Grow lighting for indoor plants</h2>
        <p>
          Explore the Venso range or open the SUNLiTE XL reference page with
          technical specifications, buying options and long-tail plant-lighting
          guidance.
        </p>
        <p>
          <Link className="text-link" to="/en/brands/venso">
            Explore Venso grow lighting →
          </Link>
        </p>
      </section>
    </div>
  );
}
