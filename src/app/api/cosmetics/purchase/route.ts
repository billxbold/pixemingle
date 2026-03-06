import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { COSMETICS_CATALOG } from '@/lib/constants';

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { item_id } = body;

  if (!item_id) {
    return NextResponse.json({ error: 'Missing item_id' }, { status: 400 });
  }

  // Find item in catalog
  const allItems = [
    ...COSMETICS_CATALOG.hair,
    ...COSMETICS_CATALOG.top,
    ...COSMETICS_CATALOG.bottom,
    ...COSMETICS_CATALOG.accessory,
  ];
  const item = allItems.find((i) => i.id === item_id);

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  if (item.price_cents === 0) {
    return NextResponse.json({ error: 'This item is free, no purchase needed' }, { status: 400 });
  }

  // Check if already owned
  const { data: existing } = await supabase
    .from('purchases')
    .select('id')
    .eq('user_id', user.id)
    .eq('item_id', item_id)
    .eq('item_type', 'cosmetic')
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Item already owned' }, { status: 409 });
  }

  // Get or create Stripe customer
  const { data: profile } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;

    await supabase
      .from('users')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id);
  }

  // Create PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: item.price_cents,
    currency: 'usd',
    customer: customerId,
    metadata: {
      user_id: user.id,
      item_id: item.id,
      item_type: 'cosmetic',
    },
  });

  // Record purchase (pending - will be confirmed by webhook or client)
  await supabase
    .from('purchases')
    .insert({
      user_id: user.id,
      item_type: 'cosmetic',
      item_id: item.id,
      amount_cents: item.price_cents,
      stripe_payment_id: paymentIntent.id,
    });

  return NextResponse.json({ client_secret: paymentIntent.client_secret });
}
