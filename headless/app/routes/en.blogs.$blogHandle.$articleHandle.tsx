import {useLoaderData} from 'react-router';
import type {Route} from './+types/en.blogs.$blogHandle.$articleHandle';
import {Image} from '@shopify/hydrogen';

export const meta: Route.MetaFunction = ({data}) => [
  {title: `${data?.article.seo?.title || data?.article.title || 'Guide'} | LEAFerservice`},
  ...(data?.article.seo?.description
    ? [{name: 'description', content: data.article.seo.description.slice(0, 155)}]
    : []),
  {name: 'robots', content: 'noindex,nofollow'},
];

export async function loader({context, params}: Route.LoaderArgs) {
  const {blogHandle, articleHandle} = params;
  if (!blogHandle || !articleHandle) {
    throw new Response('Guide not found', {status: 404});
  }

  const {blog} = await context.storefront.query(ARTICLE_QUERY, {
    variables: {blogHandle, articleHandle},
  });

  if (!blog?.articleByHandle) {
    throw new Response('Guide not found', {status: 404});
  }

  return {article: blog.articleByHandle};
}

export default function EnglishArticle() {
  const {article} = useLoaderData<typeof loader>();
  const publishedDate = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(article.publishedAt));

  return (
    <article className="article page-shell">
      <p className="page-eyebrow">LEAFerservice guide</p>
      <h1>{article.title}</h1>
      <p>
        <time dateTime={article.publishedAt}>{publishedDate}</time>
        {article.author?.name ? <> · {article.author.name}</> : null}
      </p>
      {article.image ? (
        <Image data={article.image} sizes="90vw" loading="eager" />
      ) : null}
      <div
        dangerouslySetInnerHTML={{__html: article.contentHtml}}
        className="article rich-text"
      />
    </article>
  );
}

const ARTICLE_QUERY = `#graphql
  query EnglishArticle(
    $articleHandle: String!
    $blogHandle: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    blog(handle: $blogHandle) {
      handle
      articleByHandle(handle: $articleHandle) {
        handle
        title
        contentHtml
        publishedAt
        author: authorV2 { name }
        image { id altText url width height }
        seo { description title }
      }
    }
  }
` as const;
