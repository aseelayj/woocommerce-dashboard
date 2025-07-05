import { useState, useEffect } from 'react';
import { Shop } from '@/types';
import { WooCommerceAPI, isUsingRealAPI } from '@/lib/api-wrapper';
import { getStoreLogoUrl } from '@/config/store-logos';

export function useStoreInfo(shop: Shop | null) {
  const [storeInfo, setStoreInfo] = useState<Shop['storeInfo'] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!shop) {
      setStoreInfo(null);
      return;
    }

    // Check if we already have store info
    if (shop.storeInfo) {
      setStoreInfo(shop.storeInfo);
      return;
    }

    const fetchStoreInfo = async () => {
      setLoading(true);
      try {
        const api = new WooCommerceAPI(isUsingRealAPI() ? shop.id : shop);
        const info = await api.getStoreInfo();
        
        if (info) {
          setStoreInfo(info);
          // Update the shop object with store info
          shop.storeInfo = info;
        }
        
        // Try to fetch logo URL if not already present
        if (!shop.logoUrl) {
          // First check hardcoded mappings
          const hardcodedLogo = getStoreLogoUrl(shop.baseUrl);
          if (hardcodedLogo) {
            shop.logoUrl = hardcodedLogo;
          }
        }
      } catch (error) {
        console.error('Failed to fetch store info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStoreInfo();
  }, [shop]);

  return { storeInfo, loading };
}