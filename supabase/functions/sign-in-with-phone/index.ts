import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

const corsHeaders = {
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-origin': '*',
  'content-type': 'application/json',
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function unauthorized(): Response {
  return json({ error: 'Invalid login credentials' }, 401);
}

function isCanonicalAlgerianPhone(value: unknown): value is string {
  return typeof value === 'string' && /^\+213[567]\d{8}$/.test(value);
}

function phoneCandidates(value: string): readonly string[] {
  return [value, `0${value.slice(4)}`];
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return json({ error: 'Phone sign-in is not configured' }, 500);
  }

  try {
    const body = await request.json() as { phone?: unknown; password?: unknown };
    if (!isCanonicalAlgerianPhone(body.phone) || typeof body.password !== 'string' || !body.password) {
      return unauthorized();
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id')
      .in('phone', phoneCandidates(body.phone))
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile?.id) return unauthorized();

    const { data: userResult, error: userError } = await admin.auth.admin.getUserById(profile.id);
    if (userError || !userResult.user?.email) return unauthorized();

    const tokenResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${anonKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ email: userResult.user.email, password: body.password }),
    });
    if (!tokenResponse.ok) return unauthorized();

    const tokenPayload = await tokenResponse.json() as Record<string, unknown>;
    return json(tokenPayload);
  } catch {
    return json({ error: 'Phone sign-in failed' }, 500);
  }
});
