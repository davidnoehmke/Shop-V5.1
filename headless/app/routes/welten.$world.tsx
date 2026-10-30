import {Link, useParams, useLoaderData} from 'react-router';
import {Image} from '@shopify/hydrogen';
import type {Route} from './+types/welten.$world';

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
  licht: {
    eyebrow: 'LEAF Campus · Light Studio',
    title: 'Licht verstehen, bevor du eine Lampe auswählst.',
    intro: 'Fläche, Abstand, vorhandenes Tageslicht und Pflanzentyp bestimmen den sinnvollen Einstieg. Das Markenhaus Venso vertieft anschließend die passende Produktwelt.',
    house: 'Venso',
    houseHref: '/marken/venso',
    houseText: 'Pflanzenlicht als eigene Markeninszenierung mit technischen Daten, Anwendung und Produkten.',
    collectionHref: '/search?q=Pflanzenleuchte&type=product',
    collectionLabel: 'Pflanzenleuchten durchsuchen',
    tone: 'light',
  },
  bewaesserung: {
    eyebrow: 'LEAF Campus · Water Systems',
    title: 'Bewässerung beginnt bei der Aufgabe, nicht beim Produkt.',
    intro: 'Einzelpflanze, Urlaubsversorgung, Tropfsystem oder Feuchtekontrolle: Erst das Problem klären, dann die passende Systemwelt betreten.',
    house: 'Blumat',
    houseHref: '/marken/blumat',
    houseText: 'Das Blumat-Haus ordnet Classic, Easy, Tropf-Blumat, Digital und Zubehör nach Bewässerungsaufgabe.',
    collectionHref: '/collections/pflanzenpflege-werkzeuge',
    collectionLabel: 'Bewässerung & Pflege ansehen',
    tone: 'water',
  },
  gefaesse: {
    eyebrow: 'LEAF Campus · Plant Container Gallery',
    title: 'Gefäße als Teil des gesamten Pflanzen-Setups.',
    intro: 'Topfgröße, Wurzelraum, Drainage, Bewässerung und Raumwirkung gehören zusammen. Die Galerie führt von der Aufgabe zur passenden Form.',
    house: 'elho',
    houseHref: '/marken/elho',
    houseText: 'Das elho-Haus verbindet Gefäßdesign, Größenwahl und funktionale Bewässerungslösungen.',
    collectionHref: '/collections/pflanzgefasse',
    collectionLabel: 'Pflanzgefäße ansehen',
    tone: 'gallery',
  },
  anzucht: {
    eyebrow: 'LEAF Campus · Propagation Lab',
    title: 'Anzucht als nachvollziehbarer Prozess.',
    intro: 'Keimung, Mikroklima, Wärme und Weiterkultur werden als zusammenhängender Ablauf erklärt – statt als lose Produktliste.',
    house: 'Romberg',
    houseHref: '/marken/romberg',
    houseText: 'Das Romberg-Haus inszeniert Anzucht wie ein Labor: vom Quelltab bis zum kontrollierten Mikroklima.',
    collectionHref: '/collections/anzucht-aussaat',
    collectionLabel: 'Anzucht & Aussaat ansehen',
    tone: 'lab',
  },
};

const WORLD_MEDIA_HANDLES: Record<string, string> = {
  licht: 'pflanzenbeleuchtung',
  bewaesserung: 'pflanzenpflege-werkzeuge',
  gefaesse: 'pflanzgefasse',
  anzucht: 'anzucht-aussaat',
};

export async function loader({context, params}: Route.LoaderArgs) {
  const handle = WORLD_MEDIA_HANDLES[params.world ?? ''];
  if (!handle) throw new Response('Themenwelt nicht gefunden', {status: 404});
  const result = await context.storefront.query(WORLD_MEDIA_QUERY, {
    variables: {handle},
    cache: context.storefront.CacheShort(),
  });
  return {image: result.collection?.image ?? null};
}

const WORLD_MEDIA_QUERY = `#graphql
  query GermanWorldMedia($handle: String!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    collection(handle: $handle) {image {id url altText width height}}
  }
` as const;

export const meta: Route.MetaFunction = ({params}) => {
  const world = params.world ? WORLDS[params.world] : undefined;
  return [
    {title: world ? `${world.title} | LEAFerservice` : 'LEAF Campus | LEAFerservice'},
    {name: 'robots', content: 'noindex,nofollow'},
  ];
};

export default function GermanWorld() {
  const {image} = useLoaderData<typeof loader>();
  const {world: slug} = useParams();
  const world = slug ? WORLDS[slug] : undefined;
  if (!world) throw new Response('Themenwelt nicht gefunden', {status: 404});

  return (
    <div className={'page-shell leaf-experience-world leaf-experience-world--' + world.tone}>
      <nav className="leaf-experience-world__breadcrumb" aria-label="Brotkrümelnavigation">
        <Link to="/">Atrium</Link> / <span>{world.house}</span>
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
          <p className="page-eyebrow">Markenhaus</p>
          <h2>{world.house}</h2>
          <p>{world.houseText}</p>
        </div>
        <div className="leaf-experience-world__actions">
          <Link className="leaf-experience-world__primary" to={world.houseHref} prefetch="intent">
            {world.house}-Haus betreten →
          </Link>
          <Link to={world.collectionHref} prefetch="intent">{world.collectionLabel} →</Link>
        </div>
      </section>
      <Link className="leaf-experience-world__back" to="/">← Zurück ins LEAF Atrium</Link>
    </div>
  );
}
