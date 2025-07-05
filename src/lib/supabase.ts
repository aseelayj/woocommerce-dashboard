import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      stores: {
        Row: {
          id: string;
          name: string;
          url: string;
          consumer_key: string;
          consumer_secret: string;
          created_at: string;
          updated_at: string;
          user_id: string;
          is_active: boolean;
          logo_url: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          url: string;
          consumer_key: string;
          consumer_secret: string;
          created_at?: string;
          updated_at?: string;
          user_id: string;
          is_active?: boolean;
          logo_url?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          url?: string;
          consumer_key?: string;
          consumer_secret?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
          is_active?: boolean;
          logo_url?: string | null;
        };
      };
    };
  };
};