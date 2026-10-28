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
  menu,
  primaryDomainUrl,
  viewport,
  publicStoreDomain,
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
  const items = (menu || FALLBACK_HEADER_MENU).items;
  const isEnglish = locale === 'en';

  return (
    <nav
      className={className}
      aria-label={
        viewport === 'mobile'
          ? 'Mobile Navigation'
          : isEnglish
            ? 'Main navigation'
            : 'Hauptnavigation'
      }
    >
      <ul className="header-menu-list">
        {viewport === 'mobile' && (
          <li>
            <NavLink
              end
              onClick={close}
              prefetch="intent"
              style={activeLinkStyle}
              to={isEnglish ? '/en' : '/'}
            >
              {isEnglish ? 'Home' : 'Start'}
            </NavLink>
          </li>
        )}

        {items.map((item) => {
          if (!item.url) return null;

          const url = resolveMenuUrl(
            item.url,
            primaryDomainUrl,
            publicStoreDomain,
          );
          const children = item.items || [];

          return (
            <li
              className={
                children.length
                  ? 'header-menu-group has-children'
                  : 'header-menu-group'
              }
              key={item.id}
            >
              <NavLink
                className="header-menu-item"
                end
                onClick={viewport === 'mobile' ? close : undefined}
                prefetch="intent"
                style={activeLinkStyle}
                to={url}
              >
                {item.title}
              </NavLink>

              {children.length > 0 && (
                <ul className="header-submenu">
                  {children.map((child) => {
                    if (!child.url) return null;
                    const childUrl = resolveMenuUrl(
                      child.url,
                      primaryDomainUrl,
                      publicStoreDomain,
                    );

                    return (
                      <li key={child.id}>
                        <NavLink
                          onClick={viewport === 'mobile' ? close : undefined}
                          prefetch="intent"
                          style={activeLinkStyle}
                          to={childUrl}
                        >
                          {child.title}
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function resolveMenuUrl(
  itemUrl: string,
  primaryDomainUrl: string,
  publicStoreDomain: string,
) {
  const isInternal =
    itemUrl.includes('myshopify.com') ||
    itemUrl.includes(publicStoreDomain) ||
    itemUrl.includes(primaryDomainUrl);

  return isInternal ? new URL(itemUrl).pathname : itemUrl;
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
      <NavLink
        to={isEnglish ? '/en/brands/venso' : '/marken/venso'}
        prefetch="intent"
        className="header-cta-link"
      >
        Venso
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
      href="/cart"
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

const FALLBACK_HEADER_MENU = {
  id: 'gid://shopify/Menu/199655587896',
  items: [
    {
      id: 'gid://shopify/MenuItem/461609500728',
      resourceId: null,
      tags: [],
      title: 'Sortiment',
      type: 'HTTP',
      url: '/collections',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609533496',
      resourceId: null,
      tags: [],
      title: 'Ratgeber',
      type: 'HTTP',
      url: '/blogs/journal',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609566264',
      resourceId: null,
      tags: [],
      title: 'Rechtliches',
      type: 'HTTP',
      url: '/policies',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609599032',
      resourceId: 'gid://shopify/Page/92591030328',
      tags: [],
      title: 'Über LEAFerservice',
      type: 'PAGE',
      url: '/pages/about',
      items: [],
    },
  ],
};

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
