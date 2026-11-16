// Local previews are data URLs, but only this protected route needs that source.
export function plantPhotoImagePolicy(url: string) {
  return new URL(url).pathname === '/portal/photo-analysis'
    ? {
        imgSrc: [
          "'self'",
          'data:',
          'https://cdn.shopify.com',
          'https://shopify.com',
        ],
      }
    : {};
}
