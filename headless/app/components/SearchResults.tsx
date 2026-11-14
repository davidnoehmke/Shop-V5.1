import {Link, useLocation} from 'react-router';
import {localizedPath} from '~/lib/locale-path';
import {Image, Money, Pagination} from '@shopify/hydrogen';
import {urlWithTrackingParams, type RegularSearchReturn} from '~/lib/search';

type SearchItems = RegularSearchReturn['result']['items'];
type PartialSearchResult<ItemType extends keyof SearchItems> = Pick<
  SearchItems,
  ItemType
> &
  Pick<RegularSearchReturn, 'term'>;

type SearchResultsProps = RegularSearchReturn & {
  children: (args: SearchItems & {term: string}) => React.ReactNode;
};

export function SearchResults({
  term,
  result,
  children,
}: Omit<SearchResultsProps, 'error' | 'type'>) {
  if (!result?.total) {
    return null;
  }

  return children({...result.items, term});
}

SearchResults.Articles = SearchResultsArticles;
SearchResults.Pages = SearchResultsPages;
SearchResults.Products = SearchResultsProducts;
SearchResults.Empty = SearchResultsEmpty;

function SearchResultsArticles({
  term,
  articles,
}: PartialSearchResult<'articles'>) {
  const {pathname} = useLocation();
  const isEnglish = pathname === '/en' || pathname.startsWith('/en/');
  if (!articles?.nodes.length) {
    return null;
  }

  return (
    <div className="search-result">
      <h2>{isEnglish ? 'Articles' : 'Ratgeber'}</h2>
      <div>
        {articles?.nodes?.map((article) => {
          const articleUrl = urlWithTrackingParams({
            baseUrl: localizedPath(`/blogs/${article.blog.handle}/${article.handle}`, pathname),
            trackingParams: article.trackingParameters,
            term,
          });

          return (
            <div className="search-results-item" key={article.id}>
              <Link prefetch="intent" to={articleUrl}>
                {article.title}
              </Link>
            </div>
          );
        })}
      </div>
      <br />
    </div>
  );
}

function SearchResultsPages({term, pages}: PartialSearchResult<'pages'>) {
  const {pathname} = useLocation();
  const isEnglish = pathname === '/en' || pathname.startsWith('/en/');
  if (!pages?.nodes.length) {
    return null;
  }

  return (
    <div className="search-result">
      <h2>{isEnglish ? 'Pages' : 'Seiten'}</h2>
      <div>
        {pages?.nodes?.map((page) => {
          const pageUrl = urlWithTrackingParams({
            baseUrl: localizedPath(`/pages/${page.handle}`, pathname),
            trackingParams: page.trackingParameters,
            term,
          });

          return (
            <div className="search-results-item" key={page.id}>
              <Link prefetch="intent" to={pageUrl}>
                {page.title}
              </Link>
            </div>
          );
        })}
      </div>
      <br />
    </div>
  );
}

function SearchResultsProducts({
  term,
  products,
}: PartialSearchResult<'products'>) {
  const {pathname} = useLocation();
  const isEnglish = pathname === '/en' || pathname.startsWith('/en/');
  if (!products?.nodes.length) {
    return null;
  }

  return (
    <div className="search-result">
      <h2>{isEnglish ? 'Products' : 'Produkte'}</h2>
      <Pagination connection={products}>
        {({nodes, isLoading, NextLink, PreviousLink}) => {
          const ItemsMarkup = nodes.map((product) => {
            const productUrl = urlWithTrackingParams({
              baseUrl: localizedPath(`/products/${product.handle}`, pathname),
              trackingParams: product.trackingParameters,
              term,
            });

            const price = product?.selectedOrFirstAvailableVariant?.price;
            const image = product?.selectedOrFirstAvailableVariant?.image;

            return (
              <div className="search-results-item" key={product.id}>
                <Link prefetch="intent" to={productUrl}>
                  {image && (
                    <Image data={image} alt={product.title} width={50} />
                  )}
                  <div>
                    <p>{product.title}</p>
                    <small>{price && <Money as="span" data={price} />}</small>
                  </div>
                </Link>
              </div>
            );
          });

          return (
            <div>
              <div>
                <PreviousLink>
                  {isLoading ? (isEnglish ? 'Loading…' : 'Wird geladen…') : <span>↑ {isEnglish ? 'Load previous' : 'Vorherige laden'}</span>}
                </PreviousLink>
              </div>
              <div>
                {ItemsMarkup}
                <br />
              </div>
              <div>
                <NextLink>
                  {isLoading ? (isEnglish ? 'Loading…' : 'Wird geladen…') : <span>{isEnglish ? 'Load more' : 'Mehr laden'} ↓</span>}
                </NextLink>
              </div>
            </div>
          );
        }}
      </Pagination>
      <br />
    </div>
  );
}

function SearchResultsEmpty() {
  const {pathname} = useLocation();
  const isEnglish = pathname === '/en' || pathname.startsWith('/en/');
  return <p>{isEnglish ? 'No results. Try a different search.' : 'Keine Ergebnisse. Versuche einen anderen Suchbegriff.'}</p>;
}

