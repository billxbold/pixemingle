import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
});

export const PRICE_IDS = {
  wingman: process.env.STRIPE_WINGMAN_PRICE_ID || 'price_wingman_999',
  rizzlord: process.env.STRIPE_RIZZLORD_PRICE_ID || 'price_rizzlord_1999',
} as const;

export type SubscriptionTier = 'wingman' | 'rizzlord';

/**
 * Create a Stripe Checkout session for a subscription tier.
 */
export async function createCheckoutSession(opts: {
  customerId: string;
  tier: SubscriptionTier;
  returnUrl: string;
  userId: string;
}) {
  const session = await stripe.checkout.sessions.create({
    customer: opts.customerId,
    mode: 'subscription',
    line_items: [
      {
        price: PRICE_IDS[opts.tier],
        quantity: 1,
      },
    ],
    success_url: `${opts.returnUrl}?session_id={CHECKOUT_SESSION_ID}&status=success`,
    cancel_url: `${opts.returnUrl}?status=cancelled`,
    metadata: {
      user_id: opts.userId,
      tier: opts.tier,
    },
  });

  return session;
}

/**
 * Verify a Stripe webhook signature and return the constructed event.
 */
export function verifyWebhookSignature(
  body: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  return stripe.webhooks.constructEvent(body, signature, webhookSecret);
}
