import { NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase-server';
import type Stripe from 'stripe';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = verifyWebhookSignature(body, signature);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Webhook verification failed: ${message}` }, { status: 400 });
  }

  const supabase = createServiceClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const tier = session.metadata?.tier;

      if (userId && tier) {
        await supabase
          .from('users')
          .update({
            tier,
            stripe_customer_id: session.customer as string,
          })
          .eq('id', userId);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      // Determine tier from the price
      const priceId = subscription.items.data[0]?.price?.id;
      const wingmanPriceId = process.env.STRIPE_WINGMAN_PRICE_ID || 'price_wingman_999';
      const rizzlordPriceId = process.env.STRIPE_RIZZLORD_PRICE_ID || 'price_rizzlord_1999';

      let newTier: string = 'free';
      if (subscription.status === 'active') {
        if (priceId === rizzlordPriceId) newTier = 'rizzlord';
        else if (priceId === wingmanPriceId) newTier = 'wingman';
      }

      await supabase
        .from('users')
        .update({ tier: newTier })
        .eq('stripe_customer_id', customerId);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      // Reset to free tier
      await supabase
        .from('users')
        .update({ tier: 'free' })
        .eq('stripe_customer_id', customerId);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
