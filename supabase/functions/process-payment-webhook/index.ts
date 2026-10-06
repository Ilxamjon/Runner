// Deploy: supabase functions deploy process-payment-webhook
// Interim hardened webhook adapter.
//
// IMPORTANT:
// This endpoint now fails closed when PAYMENT_WEBHOOK_SECRET is missing and
// requires an idempotency key. It is safe for controlled integration testing,
// but each real provider (Click/Payme/Uzum) must still get its native signature
// verification algorithm before public production launch.

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const webhookSecret = Deno.env.get('PAYMENT_WEBHOOK_SECRET');

    // Fail closed: a missing production secret must never disable auth.
    if (!supabaseUrl || !serviceRoleKey || !webhookSecret) {
      console.error('Payment webhook is not configured securely');
      return json({ error: 'Webhook unavailable' }, 503);
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
      user_id?: string;
      amount?: number;
      provider?: string;
      external_ref?: string;
      idempotency_key?: string;
    };

    if (
      !user_id ||
      !Number.isSafeInteger(amount) ||
      (amount ?? 0) <= 0 ||
      !provider ||
      !idempotency_key
    ) {
      return json(
        {
          error:
            'Invalid payload: user_id, positive integer amount, provider and idempotency_key are required',
        },
        400,
      );
    }

    // Keep the provider name intentionally constrained until native provider
    // adapters are implemented.
    const allowedProviders = new Set(['click', 'payme', 'uzum', 'test']);
    const normalizedProvider = provider.trim().toLowerCase();

    if (!allowedProviders.has(normalizedProvider)) {
      return json({ error: 'Unsupported provider' }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // One DB transaction handles duplicate detection, wallet locking,
    // balance update and ledger insertion.
    const { data, error } = await supabase.rpc('provider_wallet_deposit', {
      p_user_id: user_id,
      p_amount: amount,
      p_provider: normalizedProvider,
      p_external_ref: external_ref ?? null,
      p_idempotency_key: idempotency_key,
      p_metadata: {
        received_at: new Date().toISOString(),
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
