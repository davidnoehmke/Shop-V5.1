import {Link, useParams, useLoaderData} from 'react-router';
import {Image} from '@shopify/hydrogen';
import type {Route} from './+types/en.worlds.$world';

type WorldDefinition = {
  eyebrow: string;
  title: string;
  intro: string;
  house: string;
  houseHref: string;
  houseText: string;
  collectionHref: string;
  collectionLabel: string;
  tone: string;
};

const WORLDS: Record<string, WorldDefinition> = {
  light: {
    eyebrow: 'LEAF Campus · Light Studio',
    title: 'Understand light before choosing a lamp.',
    intro: 'Area, distance, available daylight and plant type define the right starting point. The Venso brand house then deepens the product experience.',
    house: 'Venso',
    houseHref: '/en/brands/venso',
    houseText: 'A dedicated grow-light showroom combining technical data, real use cases and commerce.',
    collectionHref: '/en/search?q=grow%20light&type=product',
    collectionLabel: 'Browse grow lights',
    tone: 'light',
  },
  water: {
    eyebrow: 'LEAF Campus · Water Systems',
    title: 'Start with the watering task, not the product.',
    intro: 'Single pots, holiday watering, drip systems or moisture control: define the problem first, then enter the appropriate system world.',
    house: 'Blumat',
    houseHref: '/en/brands/blumat',
    houseText: 'The Blumat house structures Classic, Easy, Tropf-Blumat, Digital and accessories by watering task.',
    collectionHref: '/en/collections/pflanzenpflege-werkzeuge',
    collectionLabel: 'Browse watering & care',
    tone: 'water',
  },
  containers: {
    eyebrow: 'LEAF Campus · Plant Container Gallery',
    title: 'Containers as part of the whole plant setup.',
    intro: 'Pot size, root space, drainage, watering and interior fit belong together. The gallery leads from need to form.',
    house: 'elho',
    houseHref: '/en/brands/elho',
    houseText: 'The elho house combines container design, sizing and functional watering solutions.',
    collectionHref: '/en/collections/pflanzgefasse',
    collectionLabel: 'Browse plant containers',
    tone: 'gallery',
  },
  propagation: {
    eyebrow: 'LEAF Campus · Propagation Lab',
    title: 'Propagation as a clear process.',
    intro: 'Germination, microclimate, warmth and further cultivation are explained as one sequence instead of a loose product list.',
    house: 'Romberg',
    houseHref: '/en/brands/romberg',
    houseText: 'The Romberg house presents propagation like a lab: from starter plugs to controlled microclimate.',
    collectionHref: '/en/collections/anzucht-aussaat',
    collectionLabel: 'Browse propagation',
    tone: 'lab',
  },
};

const WORLD_MEDIA_HANDLES: Record<string, string> = {
  light: 'pflanzenbeleuchtung',
  water: 'pflanzenpflege-werkzeuge',
  containers: 'pflanzgefasse',
  propagation: 'anzucht-aussaat',
};

export async function loader({context, params}: Route.LoaderArgs) {
  const handle = WORLD_MEDIA_HANDLES[params.world ?? ''];
  if (!handle) throw new Response('World not found', {status: 404});
  const result = await context.storefront.query(WORLD_MEDIA_QUERY, {
    variables: {handle},
    cache: context.storefront.CacheShort(),
  });
  return {image: result.collection?.image ?? null};
}

const WORLD_MEDIA_QUERY = `#graphql
  query EnglishWorldMedia($handle: String!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    collection(handle: $handle) {image {id url altText width height}}
  }
` as const;

export const meta: Route.MetaFunction = ({params}) => {
  const world = params.world ? WORLDS[params.world] : undefined;
  return [
    {title: world ? `${world.title} | LEAFerservice` : 'LEAF Campus | LEAFerservice'},
  ];
};

export default function EnglishWorld() {
  const {image} = useLoaderData<typeof loader>();
  const {world: slug} = useParams();
  const world = slug ? WORLDS[slug] : undefined;
  if (!world) throw new Response('World not found', {status: 404});

  return (
    <div className={'page-shell leaf-experience-world leaf-experience-world--' + world.tone}>
      <nav className="leaf-experience-world__breadcrumb" aria-label="Breadcrumb">
        <Link to="/en">Atrium</Link> / <span>{world.house}</span>
      </nav>
      <section className={'leaf-experience-world__hero' + (image ? ' has-visual' : '')}>
        <div className="leaf-experience-world__copy">
          <p className="page-eyebrow">{world.eyebrow}</p>
          <h1>{world.title}</h1>
          <p>{world.intro}</p>
        </div>
        {image ? (
          <div className="leaf-experience-world__photo">
            <Image
              data={image}
              alt={image.altText || world.house}
              sizes="(min-width: 1000px) 560px, (min-width: 650px) 45vw, 90vw"
              loading="eager"
            />
          </div>
        ) : null}
      </section>
      <section className="leaf-experience-world__house">
        <div>
          <p className="page-eyebrow">Brand house</p>
          <h2>{world.house}</h2>
          <p>{world.houseText}</p>
        </div>
        <div className="leaf-experience-world__actions">
          <Link className="leaf-experience-world__primary" to={world.houseHref} prefetch="intent">
            Enter {world.house} house →
          </Link>
          <Link to={world.collectionHref} prefetch="intent">{world.collectionLabel} →</Link>
        </div>
      </section>
      <Link className="leaf-experience-world__back" to="/en">← Back to the LEAF Atrium</Link>
    </div>
  );
}
