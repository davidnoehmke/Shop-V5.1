import {useLoaderData, Link} from 'react-router';
import type {Route} from './+types/led-pflanzenbeleuchtung';

export const meta: Route.MetaFunction = () => [
  {title: 'LED Pflanzenbeleuchtung für Zimmerpflanzen | Venso & Neusius | LEAFerservice'},
  {name: 'description', content: 'LED Pflanzenlampen für Monstera, Alocasia und dunkle Standorte: Venso und Neusius vergleichen, Lichtbedarf verstehen und passende Leuchten finden.'},
];

const QUERY = `#graphql
  query LedLandingProducts($country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {
    products(first: 80, query: "status:active") {
      nodes {
        id
        handle
        title
        vendor
        description
        featuredImage { url altText }
        priceRange { minVariantPrice { amount currencyCode } }
      }
    }
  }
` as const;

export async function loader({context}: Route.LoaderArgs) {
  const {products} = await context.storefront.query(QUERY);
  const highlights = products.nodes.filter((p) =>
    /venso|neusius/i.test(p.vendor) && /led|pflanzen|grow|floris|sunlite|wallspot|leucht/i.test(p.title),
  );
  return {highlights};
}

export default function LedPflanzenbeleuchtung() {
  const {highlights} = useLoaderData<typeof loader>();
  return (
    <main className="page-shell" id="led-pflanzenbeleuchtung">
      <nav aria-label="Brotkrumen"><Link to="/">Start</Link> / Pflanzenbeleuchtung</nav>
      <header className="page-intro">
        <p className="page-eyebrow">Lichtlösungen für Innenräume</p>
        <h1>LED Pflanzenbeleuchtung: das richtige Licht für deinen Standort</h1>
        <p className="page-lead">Dunkle Zimmerecke, kurze Wintertage oder gezielte Zusatzbeleuchtung? Entdecke LED-Pflanzenlampen von Venso und Neusius und finde die passende Lösung für deine Pflanzen.</p>
        <a href="#led-highlights" className="button">Leuchten entdecken</a>
      </header>
      <nav aria-label="Auf dieser Seite"><a href="#lichtbedarf">Lichtbedarf</a> · <a href="#led-highlights">LED-Highlights</a> · <a href="#ratgeber">Ratgeber</a> · <a href="#led-faq">FAQ</a></nav>
      <section id="lichtbedarf" aria-labelledby="lichtbedarf-heading">
        <h2 id="lichtbedarf-heading">Welche LED-Pflanzenlampe passt zu Monstera, Alocasia und Co.?</h2>
        <p>Entscheidend sind nicht allein Watt oder eine auffällige Lichtfarbe. Prüfe den Lichtbedarf der Pflanze, Abstand zur Blattoberfläche, beleuchtete Fläche, Photoperiode und – sofern angegeben – PPFD-Werte. Für eine kleine Pflanzenecke eignet sich eine andere Leuchte als für ein großes Regal.</p>
        <p>Für Zimmerpflanzen im Winter ist eine gleichmäßige Zusatzbeleuchtung oft sinnvoller als eine besonders starke, schlecht positionierte Lampe. Beachte die Angaben des Herstellers zu Abstand, Wärme und elektrischer Sicherheit.</p>
      </section>
      <section id="led-highlights" aria-labelledby="led-highlights-heading">
        <p className="page-eyebrow">Kuratiert statt Produktgrid</p>
        <h2 id="led-highlights-heading">LED-Highlights von Venso und Neusius</h2>
        {highlights.length ? highlights.map((product, index) => (
          <article key={product.id} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,280px),1fr))',gap:'clamp(1rem,4vw,3rem)',alignItems:'center',padding:'2.5rem 0',borderBottom:'1px solid currentColor'}}>
            <div style={{order:index % 2 ? 2 : 0}}>
              {product.featuredImage ? <img src={product.featuredImage.url} alt={product.featuredImage.altText || product.title} loading="lazy" style={{width:'100%',aspectRatio:'1 / 1',objectFit:'contain'}} /> : null}
            </div>
            <div>
              <p className="page-eyebrow">{product.vendor}</p>
              <h3>{product.title}</h3>
              <p>{product.description.slice(0,240)}{product.description.length > 240 ? '…' : ''}</p>
              <p>Ab {new Intl.NumberFormat('de-DE',{style:'currency',currency:product.priceRange.minVariantPrice.currencyCode}).format(Number(product.priceRange.minVariantPrice.amount))}</p>
              <Link to={`/products/${product.handle}`} className="button">Produkt ansehen & Variante wählen</Link>
            </div>
          </article>
        )) : <p>Die LED-Auswahl wird vorbereitet. Entdecke bis dahin unsere <Link to="/collections">Produktwelten</Link>.</p>}
      </section>
      <section id="ratgeber">
        <h2>Ratgeber: Pflanzenlicht richtig planen</h2>
        <p>Wie viel Licht benötigen Zimmerpflanzen wirklich? Welche LED eignet sich für eine dunkle Ecke? Unsere Beratung hilft dir bei der Auswahl – vom einzelnen Pflanzentopf bis zum Regal.</p>
        <Link to="/blogs/news">Zum Ratgeber und Pflanzenwissen</Link>
      </section>
      <section id="led-faq">
        <h2>Häufige Fragen zur LED-Pflanzenbeleuchtung</h2>
        <details><summary>Wie lange sollte eine LED-Pflanzenlampe täglich leuchten?</summary><p>Das hängt von Pflanzenart, Tageslicht und Lichtintensität ab. Starte mit einem gleichmäßigen Tag-Nacht-Rhythmus und orientiere dich an den Herstellerangaben.</p></details>
        <details><summary>Reicht eine LED-Lampe für mehrere Zimmerpflanzen?</summary><p>Nur wenn die beleuchtete Fläche und die Lichtintensität an allen Pflanzenstandorten ausreichen. Achte auf den Abstand und die Ausleuchtung.</p></details>
        <details><summary>Kann ich mit einer LED Pflanzen im Winter unterstützen?</summary><p>Ja, Zusatzlicht kann kurze und dunkle Tage ausgleichen. Die passende Leistung hängt vom Standort und der jeweiligen Pflanze ab.</p></details>
      </section>
      <p>Du möchtest eine passende Beleuchtung zusammenstellen? Der LEAF Live Assistant begleitet dich auch auf Produktseiten und im Warenkorb. Der abschließende Checkout erfolgt sicher bei Shopify.</p>
    </main>
  );
}
