import {alternateLanguagePath} from '~/lib/navigation';
import {Suspense, useEffect, useRef} from 'react';
import {Await, NavLink, useAsyncValue, useLocation} from 'react-router';
import {
  type CartViewPayload,
  useAnalytics,
  useOptimisticCart,
} from '@shopify/hydrogen';
import type {HeaderQuery, CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import type {StorefrontLocale} from '~/components/PageLayout';

interface HeaderProps {
  header: HeaderQuery;
  cart: Promise<CartApiQueryFragment | null>;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
  locale?: StorefrontLocale;
}

type Viewport = 'desktop' | 'mobile';

export function Header({
  header,
  isLoggedIn,
  cart,
  publicStoreDomain,
  locale = 'de',
}: HeaderProps) {
  const {shop, menu} = header;
  const homeUrl = locale === 'en' ? '/en' : '/';

  return (
    <header className="header">
      <NavLink
        className="header-brand"
        prefetch="intent"
        to={homeUrl}
        style={activeLinkStyle}
        end
      >
        <strong>{shop.name || 'LEAFerservice'}</strong>
      </NavLink>

      <HeaderMenu
        menu={menu}
        viewport="desktop"
        primaryDomainUrl={header.shop.primaryDomain.url}
        publicStoreDomain={publicStoreDomain}
        locale={locale}
      />

      <HeaderCtas isLoggedIn={isLoggedIn} cart={cart} locale={locale} />
    </header>
  );
}

export function HeaderMenu({
  viewport,
  locale = 'de',
}: {
  menu: HeaderProps['header']['menu'];
  primaryDomainUrl: HeaderProps['header']['shop']['primaryDomain']['url'];
  viewport: Viewport;
  publicStoreDomain: HeaderProps['publicStoreDomain'];
  locale?: StorefrontLocale;
}) {
  const className = `header-menu-${viewport}`;
  const shopMenu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      const menu = shopMenu.current;
      if (
        event.key === 'Escape' &&
        menu?.open &&
        menu.contains(document.activeElement)
      ) {
        menu.open = false;
        menu.querySelector('summary')?.focus();
        event.stopImmediatePropagation();
      }
    };
    document.addEventListener('keydown', onEscape, true);
    return () => document.removeEventListener('keydown', onEscape, true);
  }, []);
  const {close} = useAside();
  const isEnglish = locale === 'en';
  const prefix = isEnglish ? '/en' : '';
  const categories = isEnglish
    ? [
        ['Substrates', '/en/substrate'],
        ['Grow lighting', '/en/worlds/light'],
        ['Plant containers', '/en/worlds/containers'],
        ['Watering', '/en/worlds/water'],
        ['Propagation', '/en/worlds/propagation'],
        ['Interieur Solutions', '/en/collections/interieur-solutions'],
        ['All products', '/en/collections/all'],
      ]
    : [
        [
          'Substrate',
          '/collections/substratwelt-pflanzsubstrate-mischungen-zusatze',
        ],
        ['Pflanzenbeleuchtung', '/welten/licht'],
        ['Pflanzgefäße', '/welten/gefaesse'],
        ['Bewässerung', '/welten/bewaesserung'],
        ['Anzucht', '/welten/anzucht'],
        ['Interieur Solutions', '/collections/interieur-solutions'],
        ['Alle Produkte', '/collections/all'],
      ];
  return (
    <nav
      className={className}
      aria-label={isEnglish ? 'Main navigation' : 'Hauptnavigation'}
    >
      <ul className="header-menu-list">
        <li className="header-menu-group">
          <details ref={shopMenu} className="header-shop-menu">
            <summary>{isEnglish ? 'Shop' : 'Produktwelten'}</summary>
            <ul className="header-shop-links">
              {categories.map(([label, href]) => (
                <li key={href}>
                  <NavLink
                    to={href}
                    prefetch="intent"
                    onClick={(event) => {
                      event.currentTarget
                        .closest('details')
                        ?.removeAttribute('open');
                      close();
                    }}
                  >
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </details>
        </li>
        <li>
          <NavLink
            className="header-menu-item"
            to={isEnglish ? '/en/planning' : '/raumplanung'}
            prefetch="intent"
            onClick={close}
          >
            {isEnglish ? 'Room planning' : 'Raumplanung'}
          </NavLink>
        </li>
        <li>
          <button
            className="header-menu-item reset"
            type="button"
            onClick={() => {
              close();
              window.dispatchEvent(new Event('leaf:assistant:open'));
            }}
          >
            {isEnglish ? 'Ask LEAF' : 'Beratung'}
          </button>
        </li>
        <li>
          <NavLink
            className="header-menu-item"
            to={`${prefix}/blogs`}
            prefetch="intent"
            onClick={close}
          >
            {isEnglish ? 'Guides' : 'Ratgeber'}
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}

function HeaderCtas({
  isLoggedIn,
  cart,
  locale,
}: Pick<HeaderProps, 'isLoggedIn' | 'cart' | 'locale'>) {
  const isEnglish = locale === 'en';
  const location = useLocation();

  return (
    <nav
      className="header-ctas"
      aria-label={isEnglish ? 'Shop actions' : 'Shop Funktionen'}
    >
      <HeaderMenuMobileToggle locale={locale} />
      <NavLink
        className="header-cta-link header-account-link"
        prefetch="intent"
        to="/account"
        style={activeLinkStyle}
      >
        <Suspense fallback="Login">
          <Await resolve={isLoggedIn} errorElement="Login">
            {(loggedIn) =>
              loggedIn ? (isEnglish ? 'Account' : 'Konto') : 'Login'
            }
          </Await>
        </Suspense>
      </NavLink>
      <NavLink
        className="header-cta-link header-language"
        to={alternateLanguagePath(
          location.pathname + location.search + location.hash,
        )}
        aria-label={isEnglish ? 'Auf Deutsch wechseln' : 'Switch to English'}
      >
        {isEnglish ? 'DE' : 'EN'}
      </NavLink>
      <SearchToggle locale={locale} />
      <CartToggle cart={cart} locale={locale} />
    </nav>
  );
}

function HeaderMenuMobileToggle({locale = 'de'}: {locale?: StorefrontLocale}) {
  const {open} = useAside();

  return (
    <button
      aria-label={locale === 'en' ? 'Open menu' : 'Menü öffnen'}
      className="header-menu-mobile-toggle reset"
      onClick={() => open('mobile')}
      type="button"
    >
      <span aria-hidden="true">☰</span>
    </button>
  );
}

function SearchToggle({locale = 'de'}: {locale?: StorefrontLocale}) {
  const {open} = useAside();
  const isEnglish = locale === 'en';

  return (
    <button
      aria-label={isEnglish ? 'Open search' : 'Suche öffnen'}
      className="reset header-search-toggle"
      onClick={() => open('search')}
      type="button"
    >
      {isEnglish ? 'Search' : 'Suche'}
    </button>
  );
}

function CartBadge({
  count,
  locale = 'de',
}: {
  count: number;
  locale?: StorefrontLocale;
}) {
  const {open} = useAside();
  const {publish, shop, cart, prevCart} = useAnalytics();
  const isEnglish = locale === 'en';

  return (
    <a
      className="header-cart-link"
      href={isEnglish ? '/en/cart' : '/cart'}
      onClick={(event) => {
        event.preventDefault();
        open('cart');
        publish('cart_viewed', {
          cart,
          prevCart,
          shop,
          url: window.location.href || '',
        } as CartViewPayload);
      }}
    >
      <span>{isEnglish ? 'Cart' : 'Warenkorb'}</span>
      <span
        className="header-cart-count"
        aria-label={
          isEnglish
            ? `Items in cart: ${count}`
            : `Artikel im Warenkorb: ${count}`
        }
      >
        {count}
      </span>
    </a>
  );
}

function CartToggle({
  cart,
  locale = 'de',
}: Pick<HeaderProps, 'cart' | 'locale'>) {
  return (
    <Suspense fallback={<CartBadge count={0} locale={locale} />}>
      <Await resolve={cart}>
        <CartBanner locale={locale} />
      </Await>
    </Suspense>
  );
}

function CartBanner({locale = 'de'}: {locale?: StorefrontLocale}) {
  const originalCart = useAsyncValue() as CartApiQueryFragment | null;
  const cart = useOptimisticCart(originalCart);

  return <CartBadge count={cart?.totalQuantity ?? 0} locale={locale} />;
}

function activeLinkStyle({
  isActive,
  isPending,
}: {
  isActive: boolean;
  isPending: boolean;
}) {
  return {
    fontWeight: isActive ? 700 : undefined,
    opacity: isPending ? 0.55 : 1,
  };
}
