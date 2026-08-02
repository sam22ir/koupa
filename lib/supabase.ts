import { createClient } from '@supabase/supabase-js';
import { appStorage } from '@/lib/storage';
import type { Database } from '@/src/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const isDevelopmentPreview = process.env.EXPO_PUBLIC_APP_ENV === 'development';
const clientUrl = supabaseUrl || (isDevelopmentPreview ? 'http://127.0.0.1:54321' : undefined);
const clientKey = supabasePublishableKey || (isDevelopmentPreview ? 'development-preview-key' : undefined);

if (!clientUrl || !clientKey) {
  throw new Error('Missing Supabase environment variables. Copy .env.example to .env.local.');
}

export const supabase = createClient<Database>(clientUrl, clientKey, {
  auth: {
    storage: appStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
