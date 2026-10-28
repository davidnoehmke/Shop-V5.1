import {Suspense} from 'react';
import {Await, NavLink} from 'react-router';
import type {FooterQuery, HeaderQuery} from 'storefrontapi.generated';
import type {StorefrontLocale} from '~/components/PageLayout';

interface FooterProps {
  footer: Promise<FooterQuery | null>;
  header: HeaderQuery;
  publicStoreDomain: string;
  locale?: StorefrontLocale;
}

export function Footer({
  footer: footerPromise,
  header,
  publicStoreDomain,
  locale = 'de',
}: FooterProps) {
  return (
    <Suspense>
      <Await resolve={footerPromise}>
        {(footer) => (
          <footer className="footer">
            <div className="footer-shell">
              <div className="footer-brand-block">
                <strong>LEAFerservice</strong>
                <p>{locale === 'en' ? 'Plant knowledge, substrate systems and modern growing technology.' : 'Pflanzenwissen, Substratsysteme und moderne Growing-Technik.'}</p>
              </div>
              <div className="footer-link-groups">
                <nav aria-label={locale === 'en' ? 'Service' : 'Service'}>
                  <strong>Service</strong>
                  <NavLink to={locale === 'en' ? '/en/pages/contact' : '/pages/contact'}>Kontakt</NavLink>
                  <NavLink to={locale === 'en' ? '/en/pages/faq' : '/pages/faq'}>FAQ</NavLink>
                  <NavLink to={locale === 'en' ? '/en/pages/ueber-uns' : '/pages/ueber-uns'}>{locale === 'en' ? 'About' : 'Über uns'}</NavLink>
                  <NavLink to={locale === 'en' ? '/en/blogs' : '/blogs'}>{locale === 'en' ? 'Guides' : 'Ratgeber'}</NavLink>
                </nav>
                <nav aria-label={locale === 'en' ? 'Legal information' : 'Rechtliches'}>
                  <strong>{locale === 'en' ? 'Legal' : 'Rechtliches'}</strong>
                  <NavLink to={locale === 'en' ? '/en/pages/impressum' : '/pages/impressum'}>Impressum</NavLink>
                  <NavLink to={locale === 'en' ? '/en/pages/datenschutzerklaerung' : '/pages/datenschutzerklaerung'}>{locale === 'en' ? 'Privacy' : 'Datenschutz'}</NavLink>
                  <NavLink to={locale === 'en' ? '/en/pages/widerrufsbelehrung' : '/pages/widerrufsbelehrung'}>{locale === 'en' ? 'Cancellation' : 'Widerruf'}</NavLink>
                  <NavLink to={locale === 'en' ? '/en/pages/versandrichtlinie' : '/pages/versandrichtlinie'}>{locale === 'en' ? 'Shipping' : 'Versand'}</NavLink>
                  <NavLink to={locale === 'en' ? '/en/pages/rueckerstattungs-rueckgaberichtlinie' : '/pages/rueckerstattungs-rueckgaberichtlinie'}>{locale === 'en' ? 'Returns' : 'Rückgabe'}</NavLink>
                  <NavLink to={locale === 'en' ? '/en/pages/nutzungsbedingungen' : '/pages/nutzungsbedingungen'}>{locale === 'en' ? 'Terms' : 'Nutzungsbedingungen'}</NavLink>
                </nav>
              </div>
            </div>
            {footer?.menu && header.shop.primaryDomain?.url && (
              <FooterMenu
                menu={footer.menu}
                primaryDomainUrl={header.shop.primaryDomain.url}
                publicStoreDomain={publicStoreDomain}
                locale={locale}
              />
            )}
            <p className="footer-meta">© {new Date().getFullYear()} LEAFerservice</p>
          </footer>
        )}
      </Await>
    </Suspense>
  );
}

function FooterMenu({
  menu,
  primaryDomainUrl,
  publicStoreDomain,
  locale = 'de',
}: {
  menu: FooterQuery['menu'];
  primaryDomainUrl: FooterProps['header']['shop']['primaryDomain']['url'];
  publicStoreDomain: string;
  locale?: StorefrontLocale;
}) {
  return (
    <nav className="footer-menu" role="navigation">
      {(menu || FALLBACK_FOOTER_MENU).items.map((item) => {
        if (!item.url) return null;
        // if the url is internal, we strip the domain
        const url =
          item.url.includes('myshopify.com') ||
          item.url.includes(publicStoreDomain) ||
          item.url.includes(primaryDomainUrl)
            ? new URL(item.url).pathname
            : item.url;
        const localizedUrl =
          locale === 'en' && url.startsWith('/') && !url.startsWith('/en/')
            ? `/en${url}`
            : url;
        const isExternal = !localizedUrl.startsWith('/');
        return isExternal ? (
          <a href={localizedUrl} key={item.id} rel="noopener noreferrer" target="_blank">
            {item.title}
          </a>
        ) : (
          <NavLink
            end
            key={item.id}
            prefetch="intent"
            style={activeLinkStyle}
            to={localizedUrl}
          >
            {item.title}
          </NavLink>
        );
      })}
    </nav>
  );
}

const FALLBACK_FOOTER_MENU = {
  id: 'gid://shopify/Menu/199655620664',
  items: [
    {
      id: 'gid://shopify/MenuItem/461633060920',
      resourceId: 'gid://shopify/ShopPolicy/23358046264',
      tags: [],
      title: 'Datenschutz',
      type: 'SHOP_POLICY',
      url: '/policies/privacy-policy',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461633093688',
      resourceId: 'gid://shopify/ShopPolicy/23358013496',
      tags: [],
      title: 'Rueckgabe',
      type: 'SHOP_POLICY',
      url: '/policies/refund-policy',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461633126456',
      resourceId: 'gid://shopify/ShopPolicy/23358111800',
      tags: [],
      title: 'Versand',
      type: 'SHOP_POLICY',
      url: '/policies/shipping-policy',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461633159224',
      resourceId: 'gid://shopify/ShopPolicy/23358079032',
      tags: [],
      title: 'AGB',
      type: 'SHOP_POLICY',
      url: '/policies/terms-of-service',
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
    fontWeight: isActive ? 'bold' : undefined,
    color: isPending ? 'grey' : 'white',
  };
}

