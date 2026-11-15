import {useLoaderData} from 'react-router';
import type {Route} from './+types/en.blogs.$blogHandle.$articleHandle';
import {BlogArticlePage} from '~/components/BlogArticlePage';
import {articleCommerceHandles, BLOG_COMMERCE_QUERY} from '~/lib/blog-commerce';
import {blogArticleMeta, englishContentIsFallback} from '~/lib/blog-routing';

export const meta: Route.MetaFunction = ({data, params}) =>
  blogArticleMeta(data?.article, params.blogHandle || 'leafers-nice2know-blog', 'en', data?.englishIsFallback);

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

  const article = blog.articleByHandle;
  const original = await context.storefront.query(ARTICLE_QUERY, {
    variables: {blogHandle, articleHandle, language: 'DE'},
  });
  const englishIsFallback = englishContentIsFallback(article.contentHtml, original.blog?.articleByHandle?.contentHtml);
  const handles = articleCommerceHandles(blogHandle, articleHandle);
  const products = handles ? await context.storefront.query(BLOG_COMMERCE_QUERY, {
    variables: {one: handles[0], two: handles[1], three: handles[2]},
  }).then(({one, two, three}) => [one ?? null, two ?? null, three ?? null]).catch(() => []) : [];
  return {article, blogHandle, englishIsFallback, products};
}

export default function EnglishArticle() {
  const {article, blogHandle, englishIsFallback, products} = useLoaderData<typeof loader>();
  return <BlogArticlePage article={article} blogHandle={blogHandle} locale="en" englishIsFallback={englishIsFallback} products={products} />;
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
        excerpt
        publishedAt
        author: authorV2 { name }
        image { id altText url width height }
        seo { description title }
      }
    }
  }
` as const;
