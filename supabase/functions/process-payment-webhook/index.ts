// Deploy: supabase functions deploy process-payment-webhook
// Stub for Click / Payme / Uzum webhook verification + wallet deposit

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-provider-signature',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const body = await req.json();
    const {
      user_id,
      amount,
      provider = 'demo',
      external_ref,
      idempotency_key,
    } = body as {
      user_id: string;
      amount: number;
      provider?: string;
      external_ref?: string;
      idempotency_key?: string;
    };

    // Production: verify provider signature here (Click/Payme/Uzum)
    const signature = req.headers.get('x-provider-signature');
    const webhookSecret = Deno.env.get('PAYMENT_WEBHOOK_SECRET');
    if (webhookSecret && signature !== webhookSecret) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!user_id || !amount || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (idempotency_key) {
      const { data: existing } = await supabase
        .from('escrow_transactions')
        .select('id')
        .eq('idempotency_key', `deposit:${idempotency_key}`)
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ ok: true, duplicate: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (walletError || !wallet) {
      return new Response(JSON.stringify({ error: 'Wallet not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const newBalance = wallet.balance + amount;
    const { error: updateError } = await supabase
      .from('wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', wallet.id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase.from('wallet_ledger').insert({
      wallet_id: wallet.id,
      amount,
      balance_after: newBalance,
      description: `Deposit via ${provider}${external_ref ? ` (${external_ref})` : ''}`,
    });

    return new Response(JSON.stringify({ ok: true, balance: newBalance }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
