import {Link} from 'react-router';
import {blogArticlePath} from '~/lib/blog-routing';
import type {BlogLocale} from '~/lib/blog-routing';

export type BlogCardArticle = {
  id: string;
  title: string;
  handle: string;
  publishedAt: string;
  excerpt?: string | null;
  content?: string | null;
  image?: {url: string; altText?: string | null; width?: number | null; height?: number | null} | null;
  blog: {handle: string};
};

export function BlogArticleCard({
  article,
  locale,
  loading = 'lazy',
}: {
  article: BlogCardArticle;
  locale: BlogLocale;
  loading?: 'eager' | 'lazy';
}) {
  const excerpt = (article.excerpt || article.content || '').trim().slice(0, 155);
  const date = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'de-DE', {
    year: 'numeric', month: 'long', day: 'numeric',
  }).format(new Date(article.publishedAt));

  return (
    <article className="leaf-blog-card">
      <Link to={blogArticlePath(article.blog.handle, article.handle, locale)} prefetch="intent">
        {article.image?.url ? (
          <div className="leaf-blog-card__image">
            <img
              src={article.image.url}
              alt={article.image.altText || article.title}
              loading={loading}
              decoding="async"
              width={article.image.width ?? undefined}
              height={article.image.height ?? undefined}
            />
          </div>
        ) : (
          <div className="leaf-blog-card__image leaf-blog-card__image--empty" aria-hidden="true">
            <span>LEAF Wissen</span>
          </div>
        )}
        <div className="leaf-blog-card__copy">
          <time dateTime={article.publishedAt}>{date}</time>
          <h3>{article.title}</h3>
          {excerpt ? <p>{excerpt}</p> : null}
          <span className="leaf-blog-card__more" aria-hidden="true">
            {locale === 'en' ? 'Read guide' : 'Ratgeber lesen'} →
          </span>
        </div>
      </Link>
    </article>
  );
}
