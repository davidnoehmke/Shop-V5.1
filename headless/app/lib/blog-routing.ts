export type BlogLocale = 'de' | 'en';
export const BLOG_ORIGIN = 'https://www.leaferservice.com';

export function blogIndexPath(locale: BlogLocale): string {
  return (locale === 'en' ? '/en' : '') + '/blogs';
}

export function blogPath(handle: string, locale: BlogLocale): string {
  return blogIndexPath(locale) + '/' + encodeURIComponent(handle);
}

export function blogArticlePath(blogHandle: string, articleHandle: string, locale: BlogLocale): string {
  return blogPath(blogHandle, locale) + '/' + encodeURIComponent(articleHandle);
}

export function englishContentIsFallback(localized: string | null | undefined, original: string | null | undefined): boolean {
  if (!localized || !original) return true;
  return localized.replace(/\s+/g, ' ').trim() === original.replace(/\s+/g, ' ').trim();
}

export type BlogSeoArticle = {
  handle: string;
  title: string;
  publishedAt: string;
  excerpt?: string | null;
  content?: string | null;
  seo?: {title?: string | null; description?: string | null} | null;
  image?: {url: string; altText?: string | null} | null;
  author?: {name: string} | null;
};

export function blogArticleMeta(
  article: BlogSeoArticle | null | undefined,
  blogHandle: string,
  locale: BlogLocale,
  englishIsFallback = false,
) {
  if (!article) return [{title: 'Ratgeber | LEAFerservice'}];
  const actualLocale: BlogLocale = englishIsFallback ? 'de' : locale;
  const canonical = BLOG_ORIGIN + blogArticlePath(blogHandle, article.handle, actualLocale);
  const description = (article.seo?.description || article.excerpt || article.content || '')
    .replace(/\s+/g, ' ').trim().slice(0, 155);
  const heading = article.seo?.title || article.title;
  const tags: Array<Record<string, unknown>> = [
    {title: heading + ' | LEAFerservice'},
    {rel: 'canonical', href: canonical},
    {property: 'og:type', content: 'article'},
    {property: 'og:title', content: heading},
    {property: 'og:url', content: canonical},
    ...(description ? [{name: 'description', content: description}, {property: 'og:description', content: description}] : []),
    ...(article.image?.url ? [{property: 'og:image', content: article.image.url}] : []),
    ...(englishIsFallback ? [{name: 'robots', content: 'noindex,follow'}] : []),
  ];
  if (!englishIsFallback) {
    tags.push({
      'script:ld+json': {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: article.title,
        description,
        datePublished: article.publishedAt,
        inLanguage: locale,
        mainEntityOfPage: canonical,
        publisher: {'@type': 'Organization', name: 'LEAFerservice'},
        author: article.author?.name
          ? {'@type': 'Person', name: article.author.name}
          : {'@type': 'Organization', name: 'LEAFerservice'},
        ...(article.image?.url ? {image: [article.image.url]} : {}),
      },
    });
  }
  return tags;
}
