import type {Route} from './+types/account_.login';
import {redirect} from 'react-router';

export async function loader({request, context}: Route.LoaderArgs) {
  if (!context.env.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID || !context.env.SHOP_ID) {
    throw redirect('https://account.leaferservice.com', {headers: {'Cache-Control': 'no-store'}});
  }
  const url = new URL(request.url);
  const acrValues = url.searchParams.get('acr_values') || undefined;
  const loginHint = url.searchParams.get('login_hint') || undefined;
  const loginHintMode = url.searchParams.get('login_hint_mode') || undefined;
  const locale = url.searchParams.get('locale') || undefined;

  return context.customerAccount.login({
    countryCode: context.storefront.i18n.country,
    acrValues,
    loginHint,
    loginHintMode,
    locale,
  });
}

