import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Verifica se as credenciais do Supabase foram configuradas corretamente
export const isSupabaseConfigured =
  !!supabaseUrl &&
  !!supabaseAnonKey &&
  !supabaseAnonKey.startsWith('INSIRA_') &&
  supabaseAnonKey !== 'INSIRA_SUA_ANON_KEY_DO_SUPABASE_AQUI';

// Cliente Supabase instanciado apenas se configurado
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: { 'x-app-name': 'EzPDV' },
      },
      db: {
        schema: 'public',
      },
    })
  : null;
