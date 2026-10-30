import {Suspense} from 'react';
import {Await, NavLink, useAsyncValue} from 'react-router';
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

      <HeaderCtas
        isLoggedIn={isLoggedIn}
        cart={cart}
        locale={locale}
      />
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
  const {close} = useAside();
  const isEnglish = locale === 'en';
  const destinations = [
    {de:'Shop',en:'Shop',hrefDe:'/collections/all',hrefEn:'/en/collections/all'},
    {de:'Substrate',en:'Substrates',hrefDe:'/collections/substratwelt-pflanzsubstrate-mischungen-zusatze',hrefEn:'/en/substrate'},
    {de:'Pflanzenlicht',en:'Grow lights',hrefDe:'/pflanzenlicht-vergleich',hrefEn:'/en/worlds/light'},
    {de:'3D Raumplaner',en:'3D Room Planner',hrefDe:'/raumplaner-3d',hrefEn:'/en/room-planner-3d'},
    {de:'Pflanzenwissen',en:'Plant knowledge',hrefDe:'/blogs',hrefEn:'/en/blogs'},
  ];
  return (
    <nav className={className} aria-label={viewport==='mobile'?'Mobile Navigation':isEnglish?'Main navigation':'Hauptnavigation'}>
      <ul className="header-menu-list">
        {viewport==='mobile' ? <li className="header-menu-group"><NavLink end onClick={close} prefetch="intent" to={isEnglish?'/en':'/'}>{isEnglish?'Home':'Start'}</NavLink></li> : null}
        {destinations.map(item=><li className="header-menu-group" key={item.hrefDe}>
          <NavLink className="header-menu-item" end onClick={viewport==='mobile'?close:undefined} prefetch="intent" style={activeLinkStyle} to={isEnglish?item.hrefEn:item.hrefDe}>
            {isEnglish?item.en:item.de}
          </NavLink>
        </li>)}
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
              loggedIn
                ? isEnglish
                  ? 'Account'
                  : 'Konto'
                : 'Login'
            }
          </Await>
        </Suspense>
      </NavLink>
      <SearchToggle locale={locale} />
      <CartToggle cart={cart} locale={locale} />
    </nav>
  );
}

function HeaderMenuMobileToggle({
  locale = 'de',
}: {
  locale?: StorefrontLocale;
}) {
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

function SearchToggle({
  locale = 'de',
}: {
  locale?: StorefrontLocale;
}) {
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
      aria-label={isEnglish ? 'Open cart' : 'Warenkorb öffnen'}
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

function CartBanner({
  locale = 'de',
}: {
  locale?: StorefrontLocale;
}) {
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
