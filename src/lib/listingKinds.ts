// Share the shop/merch boundary across navigation, the catalog and product details.
export const MERCH_CATEGORIES = ['T-Shirts', 'Hats', 'Hoodies', 'Other Merch'] as const;
export const isMerchListing = (listingOrCategory: { category: string } | string): boolean => {
  const category = typeof listingOrCategory === 'string' ? listingOrCategory : listingOrCategory.category;
  return [...MERCH_CATEGORIES, 'Merch'].some(value => value.toLowerCase() === (category || '').trim().toLowerCase());
};
