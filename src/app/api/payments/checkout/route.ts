import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { stripe, createCheckoutSession, type SubscriptionTier } from '@/lib/stripe';

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const tier = body.tier as SubscriptionTier;

  if (!tier || !['wingman', 'rizzlord'].includes(tier)) {
    return NextResponse.json({ error: 'Invalid tier. Must be "wingman" or "rizzlord".' }, { status: 400 });
  }

  // Fetch user record to check for existing Stripe customer ID
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  let customerId = profile?.stripe_customer_id;

  // Create Stripe customer if none exists
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;

    // Store customer ID in users table
    const { error: updateError } = await supabase
      .from('users')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  const returnUrl = body.return_url || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/world`;

  const session = await createCheckoutSession({
    customerId,
    tier,
    returnUrl,
    userId: user.id,
  });

  return NextResponse.json({ url: session.url });
}
