import {Link} from 'react-router';
import {blogIndexPath, blogPath} from '~/lib/blog-routing';
import type {BlogLocale} from '~/lib/blog-routing';

type PublishedArticle = {
  title: string;
  publishedAt: string;
  contentHtml: string;
  author?: {name: string} | null;
  image?: {url: string; altText?: string | null; width?: number | null; height?: number | null} | null;
};

export function BlogArticlePage({
  article,
  blogHandle,
  locale,
  englishIsFallback = false,
}: {
  article: PublishedArticle;
  blogHandle: string;
  locale: BlogLocale;
  englishIsFallback?: boolean;
}) {
  const date = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'de-DE', {
    year: 'numeric', month: 'long', day: 'numeric',
  }).format(new Date(article.publishedAt));
  const isEnglish = locale === 'en';

  return (
    <article className="leaf-blog-post page-shell">
      <nav className="leaf-blog-post__breadcrumbs" aria-label={isEnglish ? 'Breadcrumb' : 'Brotkrumennavigation'}>
        <Link to={isEnglish ? '/en' : '/'}>{isEnglish ? 'Home' : 'Start'}</Link>
        <span aria-hidden="true">/</span>
        <Link to={blogIndexPath(locale)}>{isEnglish ? 'Guides' : 'Ratgeber'}</Link>
        <span aria-hidden="true">/</span>
        <Link to={blogPath(blogHandle, locale)}>{blogHandle === 'live-labs' ? 'Live Labs' : isEnglish ? 'Plant knowledge' : 'Pflanzenwissen'}</Link>
      </nav>

      {englishIsFallback ? (
        <aside className="leaf-blog-post__language-notice" role="status">
          This guide is currently available in German. An English translation has not been published yet.
        </aside>
      ) : null}

      <header className="leaf-blog-post__header">
        <p className="page-eyebrow">{blogHandle === 'live-labs' ? 'LEAF Live Labs' : isEnglish ? 'LEAF plant knowledge' : 'LEAF Pflanzenwissen'}</p>
        <h1>{article.title}</h1>
        <p className="leaf-blog-post__byline">
          <time dateTime={article.publishedAt}>{date}</time>
          {article.author?.name ? <span> · {article.author.name}</span> : null}
        </p>
      </header>

      {article.image?.url ? (
        <figure className="leaf-blog-post__hero">
          <img
            src={article.image.url}
            alt={article.image.altText || article.title}
            width={article.image.width ?? undefined}
            height={article.image.height ?? undefined}
            decoding="async"
          />
        </figure>
      ) : null}

      <div className="leaf-blog-post__body rich-text" dangerouslySetInnerHTML={{__html: article.contentHtml}} />

      <footer className="leaf-blog-post__footer">
        <Link to={blogPath(blogHandle, locale)}>
          {isEnglish ? 'More articles' : 'Weitere Ratgeber'} →
        </Link>
        <Link to={blogIndexPath(locale)}>
          {isEnglish ? 'All guides' : 'Alle Themen'} →
        </Link>
      </footer>
    </article>
  );
}
