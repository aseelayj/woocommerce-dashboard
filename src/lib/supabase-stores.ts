import { supabase, type Database } from './supabase';

export type Store = Database['public']['Tables']['stores']['Row'];
export type StoreInsert = Database['public']['Tables']['stores']['Insert'];
export type StoreUpdate = Database['public']['Tables']['stores']['Update'];

export const storesService = {
  async getStores(userId: string) {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getStore(id: string) {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async createStore(store: StoreInsert) {
    const { data, error } = await supabase
      .from('stores')
      .insert(store)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateStore(id: string, update: StoreUpdate) {
    const { data, error } = await supabase
      .from('stores')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteStore(id: string) {
    const { error } = await supabase
      .from('stores')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async testConnection(url: string, consumerKey: string, consumerSecret: string) {
    try {
      const authString = btoa(`${consumerKey}:${consumerSecret}`);
      const response = await fetch(`${url}/wp-json/wc/v3/system_status`, {
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Connection failed' };
    }
  },
};