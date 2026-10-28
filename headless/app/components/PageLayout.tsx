import {Await, Link, useLocation} from 'react-router';
import {Suspense, useId} from 'react';
import type {
  CartApiQueryFragment,
  FooterQuery,
  HeaderQuery,
} from 'storefrontapi.generated';
import {Aside} from '~/components/Aside';
import {Footer} from '~/components/Footer';
import {Header, HeaderMenu} from '~/components/Header';
import {CartMain} from '~/components/CartMain';
import {
  SEARCH_ENDPOINT,
  SearchFormPredictive,
} from '~/components/SearchFormPredictive';
import {SearchResultsPredictive} from '~/components/SearchResultsPredictive';

export type StorefrontLocale = 'de' | 'en';

interface PageLayoutProps {
  cart: Promise<CartApiQueryFragment | null>;
  footer: Promise<FooterQuery | null>;
  header: HeaderQuery;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
  children?: React.ReactNode;
}

export function PageLayout({
  cart,
  children = null,
  footer,
  header,
  isLoggedIn,
  publicStoreDomain,
}: PageLayoutProps) {
  const location = useLocation();
  const locale: StorefrontLocale =
    location.pathname === '/en' || location.pathname.startsWith('/en/')
      ? 'en'
      : 'de';

  return (
    <Aside.Provider>
      <CartAside cart={cart} locale={locale} />
      <SearchAside locale={locale} />
      <MobileMenuAside
        header={header}
        publicStoreDomain={publicStoreDomain}
        locale={locale}
      />
      {header && (
        <Header
          header={header}
          cart={cart}
          isLoggedIn={isLoggedIn}
          publicStoreDomain={publicStoreDomain}
          locale={locale}
        />
      )}
      <main>{children}</main>
      <Footer
        footer={footer}
        header={header}
        publicStoreDomain={publicStoreDomain}
      />
    </Aside.Provider>
  );
}

function CartAside({
  cart,
  locale,
}: {
  cart: PageLayoutProps['cart'];
  locale: StorefrontLocale;
}) {
  return (
    <Aside type="cart" heading={locale === 'en' ? 'Cart' : 'Warenkorb'}>
      <Suspense
        fallback={
          <p>{locale === 'en' ? 'Loading cart ...' : 'Warenkorb wird geladen ...'}</p>
        }
      >
        <Await resolve={cart}>
          {(cart) => <CartMain cart={cart} layout="aside" locale={locale} />}
        </Await>
      </Suspense>
    </Aside>
  );
}

function SearchAside({locale}: {locale: StorefrontLocale}) {
  const queriesDatalistId = useId();
  const isEnglish = locale === 'en';

  return (
    <Aside type="search" heading={isEnglish ? 'Search' : 'Suche'}>
      <div className="predictive-search">
        <br />
        <SearchFormPredictive>
          {({fetchResults, goToSearch, inputRef}) => (
            <>
              <input
                name="q"
                onChange={fetchResults}
                onFocus={fetchResults}
                placeholder={isEnglish ? 'Search' : 'Suche'}
                ref={inputRef}
                type="search"
                list={queriesDatalistId}
              />
              &nbsp;
              <button onClick={goToSearch}>
                {isEnglish ? 'Search' : 'Suchen'}
              </button>
            </>
          )}
        </SearchFormPredictive>

        <SearchResultsPredictive>
          {({items, total, term, state, closeSearch}) => {
            const {articles, collections, pages, products, queries} = items;

            if (state === 'loading' && term.current) {
              return <div>{isEnglish ? 'Loading ...' : 'Lädt ...'}</div>;
            }

            if (!total) {
              return <SearchResultsPredictive.Empty term={term} />;
            }

            return (
              <>
                <SearchResultsPredictive.Queries
                  queries={queries}
                  queriesDatalistId={queriesDatalistId}
                />
                <SearchResultsPredictive.Products
                  products={products}
                  closeSearch={closeSearch}
                  term={term}
                />
                <SearchResultsPredictive.Collections
                  collections={collections}
                  closeSearch={closeSearch}
                  term={term}
                />
                <SearchResultsPredictive.Pages
                  pages={pages}
                  closeSearch={closeSearch}
                  term={term}
                />
                <SearchResultsPredictive.Articles
                  articles={articles}
                  closeSearch={closeSearch}
                  term={term}
                />
                {term.current && total ? (
                  <Link
                    onClick={closeSearch}
                    to={`${SEARCH_ENDPOINT}?q=${term.current}`}
                  >
                    <p>
                      {isEnglish ? 'View all results for' : 'Alle Ergebnisse für'}{' '}
                      <q>{term.current}</q>&nbsp; →
                    </p>
                  </Link>
                ) : null}
              </>
            );
          }}
        </SearchResultsPredictive>
      </div>
    </Aside>
  );
}

function MobileMenuAside({
  header,
  publicStoreDomain,
  locale,
}: {
  header: PageLayoutProps['header'];
  publicStoreDomain: PageLayoutProps['publicStoreDomain'];
  locale: StorefrontLocale;
}) {
  return (
    header.menu &&
    header.shop.primaryDomain?.url && (
      <Aside type="mobile" heading={locale === 'en' ? 'Menu' : 'Menü'}>
        <HeaderMenu
          menu={header.menu}
          viewport="mobile"
          primaryDomainUrl={header.shop.primaryDomain.url}
          publicStoreDomain={publicStoreDomain}
          locale={locale}
        />
      </Aside>
    )
  );
}
