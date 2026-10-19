// Deploy: supabase functions deploy process-payment-webhook
//
// SECURITY BOUNDARY:
// Click/Payme/Uzum deposits must remain disabled until each provider's native
// callback protocol, signature/authentication, transaction lifecycle and replay
// handling are implemented and tested. A shared secret is NOT a substitute for
// those provider protocols. This handler only permits explicit non-production
// test deposits.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-provider-signature',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const appEnv = Deno.env.get('APP_ENV') ?? 'production';
    const webhookMode = Deno.env.get('PAYMENT_WEBHOOK_MODE') ?? 'disabled';
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const webhookSecret = Deno.env.get('PAYMENT_WEBHOOK_SECRET');

    // Never let missing configuration silently disable authentication.
    if (!supabaseUrl || !serviceRoleKey || !webhookSecret) {
      console.error('Payment webhook is not configured securely');
      return json({ error: 'Webhook unavailable' }, 503);
    }

    // This endpoint does not yet implement Click/Payme/Uzum's official
    // provider-specific callback protocols. Reject those providers explicitly.
    if (
      webhookMode !== 'test' ||
      appEnv === 'production'
    ) {
      return json({ error: 'Payment provider integration is not enabled' }, 503);
    }

    const signature = req.headers.get('x-provider-signature');
    if (!signature || signature !== webhookSecret) {
      return json({ error: 'Invalid signature' }, 401);
    }

    const body = await req.json();
    const {
      user_id,
      amount,
      provider,
      external_ref,
      idempotency_key,
    } = body as {
      user_id?: unknown;
      amount?: unknown;
      provider?: unknown;
      external_ref?: unknown;
      idempotency_key?: unknown;
    };

    if (
      !isUuid(user_id) ||
      typeof amount !== 'number' ||
      !Number.isSafeInteger(amount) ||
      amount <= 0 ||
      amount > 2_000_000_000 ||
      provider !== 'test' ||
      typeof idempotency_key !== 'string' ||
      idempotency_key.trim().length < 8 ||
      idempotency_key.length > 128 ||
      (external_ref !== undefined && external_ref !== null &&
        (typeof external_ref !== 'string' || external_ref.length > 200))
    ) {
      return json({ error: 'Invalid test payment payload' }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // One DB transaction handles duplicate detection, wallet locking,
    // balance update and ledger insertion.
    const { data, error } = await supabase.rpc('provider_wallet_deposit', {
      p_user_id: user_id,
      p_amount: amount,
      p_provider: 'test',
      p_external_ref: external_ref ?? null,
      p_idempotency_key: idempotency_key.trim(),
      p_metadata: {
        received_at: new Date().toISOString(),
        environment: appEnv,
        mode: 'test',
      },
    });

    if (error) {
      console.error('provider_wallet_deposit failed', error);
      return json({ error: 'Deposit failed' }, 400);
    }

    return json(data);
  } catch (err) {
    console.error('payment webhook error', err);
    return json({ error: 'Internal server error' }, 500);
  }
});
