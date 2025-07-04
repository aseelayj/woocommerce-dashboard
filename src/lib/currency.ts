import { Shop } from '@/types';

/**
 * Determines the currency to use based on the store
 * - socialmediadaily.com uses USD
 * - All other stores use EUR
 */
export function getStoreCurrency(shop?: Shop | null): string {
  if (!shop) return 'EUR'; // Default to EUR
  
  // Check if the store is socialmediadaily.com
  const hostname = shop.baseUrl ? new URL(shop.baseUrl).hostname : '';
  const isSocialMediaDaily = hostname.toLowerCase().includes('socialmediadaily.com');
  
  // Use USD for socialmediadaily.com, EUR for all others
  return isSocialMediaDaily ? 'USD' : 'EUR';
}

/**
 * Formats an amount in the appropriate currency for the store
 */
export function formatStoreCurrency(amount: string | number, shop?: Shop | null): string {
  const currency = getStoreCurrency(shop);
  const locale = currency === 'EUR' ? 'de-DE' : 'en-US';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
}

/**
 * Get currency formatting function for a specific shop
 */
export function getCurrencyFormatter(shop?: Shop | null) {
  return (amount: string | number) => formatStoreCurrency(amount, shop);
}