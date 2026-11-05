import {Suspense} from 'react';
import {Await, NavLink} from 'react-router';
import type {FooterQuery, HeaderQuery} from 'storefrontapi.generated';
import type {StorefrontLocale} from '~/components/PageLayout';
import {additionalFooterLinks} from '~/lib/footer-navigation';

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
                <p>
                  {locale === 'en'
                    ? 'Plant knowledge, substrate systems and modern growing technology.'
                    : 'Pflanzenwissen, Substratsysteme und moderne Growing-Technik.'}
                </p>
              </div>
              <div className="footer-link-groups">
                <nav aria-label={locale === 'en' ? 'Service' : 'Service'}>
                  <strong>Service</strong>
                  <NavLink
                    to={
                      locale === 'en' ? '/en/pages/contact' : '/pages/contact'
                    }
                  >
                    {locale === 'en' ? 'Contact' : 'Kontakt'}
                  </NavLink>
                  <NavLink
                    to={locale === 'en' ? '/en/pages/faq' : '/pages/faq'}
                  >
                    FAQ
                  </NavLink>
                  <NavLink
                    to={
                      locale === 'en'
                        ? '/en/pages/ueber-uns'
                        : '/pages/ueber-uns'
                    }
                  >
                    {locale === 'en' ? 'About' : 'Über uns'}
                  </NavLink>
                  <NavLink to={locale === 'en' ? '/en/blogs' : '/blogs'}>
                    {locale === 'en' ? 'Guides' : 'Ratgeber'}
                  </NavLink>
                </nav>
                <nav
                  aria-label={
                    locale === 'en' ? 'Legal information' : 'Rechtliches'
                  }
                >
                  <strong>{locale === 'en' ? 'Legal' : 'Rechtliches'}</strong>
                  <NavLink
                    to={
                      locale === 'en'
                        ? '/en/pages/impressum'
                        : '/pages/impressum'
                    }
                  >
                    {locale === 'en' ? 'Legal notice' : 'Impressum'}
                  </NavLink>
                  <NavLink
                    to={
                      locale === 'en'
                        ? '/en/pages/datenschutzerklaerung'
                        : '/pages/datenschutzerklaerung'
                    }
                  >
                    {locale === 'en' ? 'Privacy' : 'Datenschutz'}
                  </NavLink>
                  <NavLink
                    to={
                      locale === 'en'
                        ? '/en/pages/widerrufsbelehrung'
                        : '/pages/widerrufsbelehrung'
                    }
                  >
                    {locale === 'en' ? 'Cancellation' : 'Widerruf'}
                  </NavLink>
                  <NavLink
                    to={
                      locale === 'en'
                        ? '/en/pages/versandrichtlinie'
                        : '/pages/versandrichtlinie'
                    }
                  >
                    {locale === 'en' ? 'Shipping' : 'Versand'}
                  </NavLink>
                  <NavLink
                    to={
                      locale === 'en'
                        ? '/en/pages/rueckerstattungs-rueckgaberichtlinie'
                        : '/pages/rueckerstattungs-rueckgaberichtlinie'
                    }
                  >
                    {locale === 'en' ? 'Returns' : 'Rückgabe'}
                  </NavLink>
                  <NavLink
                    to={
                      locale === 'en'
                        ? '/en/pages/nutzungsbedingungen'
                        : '/pages/nutzungsbedingungen'
                    }
                  >
                    {locale === 'en' ? 'Terms' : 'Nutzungsbedingungen'}
                  </NavLink>
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
            <p className="footer-meta">
              © {new Date().getFullYear()} LEAFerservice
            </p>
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
  const links = additionalFooterLinks(
    menu?.items || [],
    [
      '/pages/contact',
      '/pages/faq',
      '/pages/ueber-uns',
      '/blogs',
      '/pages/impressum',
      '/pages/datenschutzerklaerung',
      '/pages/widerrufsbelehrung',
      '/pages/versandrichtlinie',
      '/pages/rueckerstattungs-rueckgaberichtlinie',
      '/pages/nutzungsbedingungen',
    ],
    [primaryDomainUrl, publicStoreDomain],
    locale,
  );
  if (!links.length) return null;
  return (
    <nav
      className="footer-menu"
      aria-label={locale === 'en' ? 'More links' : 'Weitere Links'}
    >
      {links.map((item) =>
        item.external ? (
          <a
            href={item.url}
            key={item.id}
            rel="noopener noreferrer"
            target="_blank"
          >
            {item.title}
          </a>
        ) : (
          <NavLink end key={item.id} prefetch="intent" to={item.url}>
            {item.title}
          </NavLink>
        ),
      )}
    </nav>
  );
}
