import { getAuthUserId, createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { COSMETICS_CATALOG } from '@/lib/constants';
import { checkEndpointRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimitResult = checkEndpointRateLimit(userId, 'cosmetics_purchase', 10, 60);
  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { item_id } = body;
  if (!item_id) return NextResponse.json({ error: 'Missing item_id' }, { status: 400 });

  const allItems = [
    ...COSMETICS_CATALOG.hair,
    ...COSMETICS_CATALOG.top,
    ...COSMETICS_CATALOG.bottom,
    ...COSMETICS_CATALOG.accessory,
  ];
  const item = allItems.find((i) => i.id === item_id);
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  if (item.price_cents === 0) return NextResponse.json({ error: 'This item is free, no purchase needed' }, { status: 400 });

  const db = createServiceClient();

  const { data: existing } = await db.from('purchases').select('id').eq('user_id', userId).eq('item_id', item_id).eq('item_type', 'cosmetic').single();
  if (existing) return NextResponse.json({ error: 'Item already owned' }, { status: 409 });

  const { data: profile } = await db.from('users').select('email, stripe_customer_id').eq('id', userId).single();
  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({ email: profile?.email, metadata: { user_id: userId } });
    customerId = customer.id;
    await db.from('users').update({ stripe_customer_id: customerId }).eq('id', userId);
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: item.price_cents,
    currency: 'usd',
    customer: customerId,
    metadata: { user_id: userId, item_id: item.id, item_type: 'cosmetic' },
  });

  await db.from('purchases').insert({ user_id: userId, item_type: 'cosmetic', item_id: item.id, amount_cents: item.price_cents, stripe_payment_id: paymentIntent.id, status: 'pending' });

  return NextResponse.json({ client_secret: paymentIntent.client_secret });
}
