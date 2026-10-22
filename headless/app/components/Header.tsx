import {Suspense} from 'react';
import {Await, NavLink, useAsyncValue} from 'react-router';
import {
  type CartViewPayload,
  useAnalytics,
  useOptimisticCart,
} from '@shopify/hydrogen';
import type {HeaderQuery, CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';

interface HeaderProps {
  header: HeaderQuery;
  cart: Promise<CartApiQueryFragment | null>;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
}

type Viewport = 'desktop' | 'mobile';

export function Header({
  header,
  isLoggedIn,
  cart,
  publicStoreDomain,
}: HeaderProps) {
  const {shop, menu} = header;

  return (
    <header className="header">
      <NavLink
        className="header-brand"
        prefetch="intent"
        to="/"
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
      />

      <HeaderCtas isLoggedIn={isLoggedIn} cart={cart} />
    </header>
  );
}

export function HeaderMenu({
  menu,
  primaryDomainUrl,
  viewport,
  publicStoreDomain,
}: {
  menu: HeaderProps['header']['menu'];
  primaryDomainUrl: HeaderProps['header']['shop']['primaryDomain']['url'];
  viewport: Viewport;
  publicStoreDomain: HeaderProps['publicStoreDomain'];
}) {
  const className = `header-menu-${viewport}`;
  const {close} = useAside();
  const items = (menu || FALLBACK_HEADER_MENU).items;

  return (
    <nav className={className} aria-label={viewport === 'mobile' ? 'Mobile Navigation' : 'Hauptnavigation'}>
      <ul className="header-menu-list">
        {viewport === 'mobile' && (
          <li>
            <NavLink
              end
              onClick={close}
              prefetch="intent"
              style={activeLinkStyle}
              to="/"
            >
              Start
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
              className={children.length ? 'header-menu-group has-children' : 'header-menu-group'}
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
}: Pick<HeaderProps, 'isLoggedIn' | 'cart'>) {
  return (
    <nav className="header-ctas" aria-label="Shop Funktionen">
      <HeaderMenuMobileToggle />
      <NavLink
        className="header-cta-link header-account-link"
        prefetch="intent"
        to="/account"
        style={activeLinkStyle}
      >
        <Suspense fallback="Login">
          <Await resolve={isLoggedIn} errorElement="Login">
            {(loggedIn) => (loggedIn ? 'Konto' : 'Login')}
          </Await>
        </Suspense>
      </NavLink>
      <NavLink to="/marken/venso" prefetch="intent" className="header-cta-link">Venso</NavLink>
      <SearchToggle />
      <CartToggle cart={cart} />
    </nav>
  );
}

function HeaderMenuMobileToggle() {
  const {open} = useAside();

  return (
    <button
      aria-label="Menü öffnen"
      className="header-menu-mobile-toggle reset"
      onClick={() => open('mobile')}
      type="button"
    >
      <span aria-hidden="true">☰</span>
    </button>
  );
}

function SearchToggle() {
  const {open} = useAside();

  return (
    <button
      aria-label="Suche öffnen"
      className="reset header-search-toggle"
      onClick={() => open('search')}
      type="button"
    >
      Suche
    </button>
  );
}

function CartBadge({count}: {count: number}) {
  const {open} = useAside();
  const {publish, shop, cart, prevCart} = useAnalytics();

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
      <span>Warenkorb</span>
      <span className="header-cart-count" aria-label={`Artikel im Warenkorb: ${count}`}>
        {count}
      </span>
    </a>
  );
}

function CartToggle({cart}: Pick<HeaderProps, 'cart'>) {
  return (
    <Suspense fallback={<CartBadge count={0} />}>
      <Await resolve={cart}>
        <CartBanner />
      </Await>
    </Suspense>
  );
}

function CartBanner() {
  const originalCart = useAsyncValue() as CartApiQueryFragment | null;
  const cart = useOptimisticCart(originalCart);

  return <CartBadge count={cart?.totalQuantity ?? 0} />;
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

