// Report variable names only. Never include values or environment dumps in errors.
export function checkPreviewEnv(env) {
  const errors = [];
  const warnings = [];
  for (const key of ['SESSION_SECRET', 'PUBLIC_STORE_DOMAIN', 'PUBLIC_STOREFRONT_API_TOKEN', 'PUBLIC_CHECKOUT_DOMAIN']) {
    if (!env[key]?.trim()) errors.push(`${key}: missing`);
  }
  if (env.SESSION_SECRET && (env.SESSION_SECRET.length < 32 || /change-me|smoke-test/i.test(env.SESSION_SECRET))) {
    errors.push('SESSION_SECRET: use a securely generated value of at least 32 characters');
  }
  for (const key of ['PUBLIC_STORE_DOMAIN', 'PUBLIC_CHECKOUT_DOMAIN']) {
    if (env[key] && (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(env[key]) || /(?:^|\.)(?:example|your-shop)\./i.test(env[key]))) {
      errors.push(`${key}: use the verified Shopify hostname without a scheme or path`);
    }
  }
  if (env.PUBLIC_STOREFRONT_API_TOKEN && /^(?:your-public-storefront-token|smoke-test)$/i.test(env.PUBLIC_STOREFRONT_API_TOKEN)) {
    errors.push('PUBLIC_STOREFRONT_API_TOKEN: placeholder is not a Storefront credential');
  }
  if (!env.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID || !env.SHOP_ID) {
    warnings.push('Customer Account login is not fully configured: PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID and SHOP_ID are both required. Guest checkout does not require login.');
  }
  if (!env.PUBLIC_STOREFRONT_ID) warnings.push('PUBLIC_STOREFRONT_ID: analytics/channel attribution is not configured.');
  return {errors, warnings};
}
