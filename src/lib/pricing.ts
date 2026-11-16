import { Listing } from '../types';

// Every shop product has a set price. A size can have its own price, which
// replaces the product price for that size. Older products saved before set
// prices may have none; they show "Price coming soon" until edited.

export const formatMoney = (value: number) => `$${value.toFixed(2)}`;

const positive = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};

/** The product's own price (null when none is set). */
export function basePrice(listing: Pick<Listing, 'price' | 'priceAmount'>): number | null {
  return positive(listing.price ?? listing.priceAmount);
}

/** Price for one unit, using the chosen size's price when it has one. */
export function unitPrice(listing: Listing, sizeLabel?: string): number | null {
  const size = sizeLabel ? listing.sizeOptions?.find((option) => option.label === sizeLabel) : undefined;
  return positive(size?.price) ?? basePrice(listing);
}

/** Text for product cards and lists: "$12.00", "From $8.00", or "Price coming soon". */
export function listingPriceLabel(listing: Listing): string {
  const sizes = listing.sizeOptions || [];
  const prices = (sizes.length ? sizes.map((size) => positive(size.price) ?? basePrice(listing)) : [basePrice(listing)])
    .filter((value): value is number => value !== null);
  if (!prices.length) return 'Price coming soon';
  const low = Math.min(...prices);
  return low === Math.max(...prices) ? formatMoney(low) : `From ${formatMoney(low)}`;
}
