import type {PlantCare, PlantPhotoReport} from './plant-photo';

// Commercial rules are outside the model. A photo alone never triggers a purchase.
export function photoProductRule(report: PlantPhotoReport, care: PlantCare) {
  if (report.quality !== 'sufficient') return null;
  if (
    care.light === 'low' &&
    report.possibleCauses.some(
      (c) => c.category === 'light' && c.confidence !== 'low',
    )
  )
    return {
      query: '(vendor:Venso OR vendor:Sansi) AND available_for_sale:true',
      reason: 'light' as const,
    };
  return null;
}

export const PHOTO_PRODUCTS_QUERY = `#graphql
  query PlantPhotoProducts($query: String!, $language: LanguageCode!)
  @inContext(country: DE, language: $language) {
    products(first: 12, query: $query) {
      nodes {
        id handle title availableForSale
        featuredImage { url altText }
        priceRange { minVariantPrice { amount currencyCode } }
      }
    }
  }
` as const;
