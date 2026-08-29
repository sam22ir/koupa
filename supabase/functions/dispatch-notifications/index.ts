import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

interface PendingNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  appointment_id: string | null;
  destination: Record<string, unknown>;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const dispatchSecret = Deno.env.get('NOTIFICATION_DISPATCH_SECRET');
const serviceAccountValue = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
const environment = Deno.env.get('APP_ENV') ?? 'production';

function base64Url(value: Uint8Array | string): string {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToBytes(pem: string): Uint8Array {
  const value = pem.replace(/-----BEGIN PRIVATE KEY-----/g, '').replace(/-----END PRIVATE KEY-----/g, '').replace(/\s/g, '');
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function firebaseAccessToken(account: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64Url(JSON.stringify({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const signingInput = `${header}.${claim}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBytes(account.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signingInput));
  const assertion = `${signingInput}.${base64Url(new Uint8Array(signature))}`;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!response.ok) throw new Error(`Firebase token request failed: ${response.status}`);
  const payload = await response.json() as { access_token?: string };
  if (!payload.access_token) throw new Error('Firebase access token is missing');
  return payload.access_token;
}

async function sendToFirebase(accessToken: string, account: ServiceAccount, token: string, notification: PendingNotification): Promise<{ ok: boolean; invalidToken: boolean; error?: string }> {
  const title = environment === 'staging' ? `【اختبار】 ${notification.title}` : notification.title;
  const body = environment === 'staging' ? `【إشعار تجريبي】 ${notification.body}` : notification.body;
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        data: {
          notification_id: notification.id,
          appointment_id: notification.appointment_id ?? '',
          destination: JSON.stringify(notification.destination),
        },
      },
    }),
  });
  if (response.ok) return { ok: true, invalidToken: false };
  const text = await response.text();
  const invalidToken = response.status === 404 || text.includes('UNREGISTERED') || text.includes('INVALID_ARGUMENT');
  return { ok: false, invalidToken, error: `${response.status}: ${text.slice(0, 500)}` };
}

Deno.serve(async (request) => {
  if (request.method !== 'POST' || !dispatchSecret || request.headers.get('x-notification-dispatch-secret') !== dispatchSecret) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (!supabaseUrl || !serviceRoleKey || !serviceAccountValue) {
    return Response.json({ error: 'Notification worker is not configured' }, { status: 500 });
  }

  try {
    const account = JSON.parse(serviceAccountValue) as ServiceAccount;
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: notifications, error: notificationError } = await admin
      .from('notifications')
      .select('id,user_id,title,body,appointment_id,destination')
      .is('push_delivered_at', null)
      .gte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true })
      .limit(100);
    if (notificationError) throw notificationError;

    const accessToken = await firebaseAccessToken(account);
    let delivered = 0;
    let failed = 0;
    for (const notification of (notifications ?? []) as PendingNotification[]) {
      const { data: tokens, error: tokenError } = await admin
        .from('device_push_tokens')
        .select('id,token')
        .eq('user_id', notification.user_id)
        .eq('platform', 'android')
        .eq('environment', environment);
      if (tokenError) throw tokenError;
      if (!tokens?.length) continue;

      let sent = false;
      let lastError = '';
      for (const device of tokens) {
        const result = await sendToFirebase(accessToken, account, device.token, notification);
        if (result.ok) sent = true;
        if (result.invalidToken) await admin.from('device_push_tokens').delete().eq('id', device.id);
        if (result.error) lastError = result.error;
      }
      if (sent) {
        await admin.from('notifications').update({ push_delivered_at: new Date().toISOString(), push_delivery_error: null }).eq('id', notification.id);
        delivered += 1;
      } else {
        await admin.from('notifications').update({ push_delivery_error: lastError || 'No device accepted the notification' }).eq('id', notification.id);
        failed += 1;
      }
    }
    return Response.json({ processed: notifications?.length ?? 0, delivered, failed });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Notification worker failed' }, { status: 500 });
  }
});
