import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Project credentials provided for MorariuMark's Project
const DEFAULT_SUPABASE_URL = 'https://vzdiltjsswuqrcvzyrfn.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_FSy0j6BAK4Im6QlOE-RwjQ_IVNLplpj';

export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;

export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!clientInstance) {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return clientInstance;
}

export const supabase = getSupabaseClient();

/**
 * Quick ping to test if Supabase is reachable and the database table is accessible
 */
export async function testSupabaseConnection(): Promise<{ ok: boolean; message?: string }> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('vibe_app_state')
      .select('id, updated_at')
      .limit(1);

    if (error) {
      // If table doesn't exist yet, it's a known schema notice
      if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
        return {
          ok: false,
          message: 'Table public.vibe_app_state not created yet. Please run supabase_setup.sql in Supabase SQL editor.',
        };
      }
      return { ok: false, message: error.message };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Unknown network error' };
  }
}
