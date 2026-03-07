import { getAuthUserId, createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { stripe, createCheckoutSession, type SubscriptionTier } from '@/lib/stripe';

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const tier = body.tier as SubscriptionTier;
  if (!tier || !['wingman', 'rizzlord'].includes(tier)) {
    return NextResponse.json({ error: 'Invalid tier. Must be "wingman" or "rizzlord".' }, { status: 400 });
  }

  const db = createServiceClient();
  const { data: profile, error: profileError } = await db.from('users').select('email, stripe_customer_id').eq('id', userId).single();
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({ email: profile?.email, metadata: { user_id: userId } });
    customerId = customer.id;
    const { error: updateError } = await db.from('users').update({ stripe_customer_id: customerId }).eq('id', userId);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const returnUrl = body.return_url || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/world`;
  const session = await createCheckoutSession({ customerId, tier, returnUrl, userId });

  return NextResponse.json({ url: session.url });
}
