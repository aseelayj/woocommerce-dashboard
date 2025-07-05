// Hardcoded store logo mappings - using local copies to avoid CORS issues
export const STORE_LOGO_MAPPINGS: Record<string, string | null> = {
  // Social Media Daily - English version (Production)
  'https://www.socialmediadaily.com': '/logos/smd-logo.svg',
  'https://www.socialmediadaily.com/': '/logos/smd-logo.svg',
  'www.socialmediadaily.com': '/logos/smd-logo.svg',
  'socialmediadaily.com': '/logos/smd-logo.svg',
  
  // Social Media Daily - German version (Production)
  'https://www.socialmediadaily.de': '/logos/smd-de-logo.svg',
  'https://www.socialmediadaily.de/': '/logos/smd-de-logo.svg',
  'www.socialmediadaily.de': '/logos/smd-de-logo.svg',
  'socialmediadaily.de': '/logos/smd-de-logo.svg',
  
  // Social Media Daily - English version (Staging)
  'https://staging.socialmediadaily.com': '/logos/smd-logo.svg',
  'https://staging.socialmediadaily.com/': '/logos/smd-logo.svg',
  'staging.socialmediadaily.com': '/logos/smd-logo.svg',
  
  // Social Media Daily - German version (Staging)
  'https://staging.socialmediadaily.de': '/logos/smd-de-logo.svg',
  'https://staging.socialmediadaily.de/': '/logos/smd-de-logo.svg',
  'staging.socialmediadaily.de': '/logos/smd-de-logo.svg',
  
  // Follower Fast (Production)
  'https://www.followerfast.com': '/logos/ff-logo.webp',
  'https://www.followerfast.com/': '/logos/ff-logo.webp',
  'www.followerfast.com': '/logos/ff-logo.webp',
  'followerfast.com': '/logos/ff-logo.webp',
  
  // Follower Fast (Staging)
  'https://www.staging.followerfast.com': '/logos/ff-logo.webp',
  'https://www.staging.followerfast.com/': '/logos/ff-logo.webp',
  'https://staging.followerfast.com': '/logos/ff-logo.webp',
  'https://staging.followerfast.com/': '/logos/ff-logo.webp',
  'www.staging.followerfast.com': '/logos/ff-logo.webp',
  'staging.followerfast.com': '/logos/ff-logo.webp',
};

// Store name to logo mappings for direct matching
export const STORE_NAME_LOGO_MAPPINGS: Record<string, string | null> = {
  'social media daily': '/logos/smd-logo.svg',
  'social media daily de': '/logos/smd-de-logo.svg',
  'socialmediadaily': '/logos/smd-logo.svg',
  'socialmediadaily.com': '/logos/smd-logo.svg',
  'socialmediadaily.de': '/logos/smd-de-logo.svg',
  'smd': '/logos/smd-logo.svg',
  'smd de': '/logos/smd-de-logo.svg',
  'socialmediakaufen': '/logos/smd-de-logo.svg',
  'social media kaufen': '/logos/smd-de-logo.svg',
  // Followerfast
  'followerfast': '/logos/ff-logo.webp',
  'followerfast.com': '/logos/ff-logo.webp',
  'follower fast': '/logos/ff-logo.webp',
};

// Helper function to get logo URL for a store
export function getStoreLogoUrl(storeUrl: string): string | null {
  if (!storeUrl) return null;
  
  // Clean the URL - remove trailing slashes and convert to lowercase
  const cleanUrl = storeUrl.replace(/\/$/, '').toLowerCase();
  
  // Try exact match first
  if (STORE_LOGO_MAPPINGS[cleanUrl]) {
    return STORE_LOGO_MAPPINGS[cleanUrl];
  }
  
  // Try with https:// prefix if not present
  if (!cleanUrl.startsWith('http')) {
    const withHttps = `https://${cleanUrl}`;
    if (STORE_LOGO_MAPPINGS[withHttps]) {
      return STORE_LOGO_MAPPINGS[withHttps];
    }
  }
  
  // Try without protocol
  const withoutProtocol = cleanUrl.replace(/^https?:\/\//, '');
  if (STORE_LOGO_MAPPINGS[withoutProtocol]) {
    return STORE_LOGO_MAPPINGS[withoutProtocol];
  }
  
  // Try to find a partial match - check if the store URL contains any of our mapped domains
  for (const [key, value] of Object.entries(STORE_LOGO_MAPPINGS)) {
    const cleanKey = key.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    const cleanStoreUrl = cleanUrl.replace(/^https?:\/\//, '');
    
    if (cleanStoreUrl.includes(cleanKey) || cleanKey.includes(cleanStoreUrl)) {
      return value;
    }
  }
  
  return null;
}

// Helper function to get logo URL by store name
export function getStoreLogoByName(storeName: string): string | null {
  if (!storeName) return null;
  
  const cleanName = storeName.toLowerCase().trim();
  
  // Try exact match in name mappings
  if (STORE_NAME_LOGO_MAPPINGS[cleanName]) {
    return STORE_NAME_LOGO_MAPPINGS[cleanName];
  }
  
  // Try partial matches
  for (const [key, value] of Object.entries(STORE_NAME_LOGO_MAPPINGS)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return value;
    }
  }
  
  return null;
}