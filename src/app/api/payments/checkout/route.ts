import { getAuthUserId, createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { stripe, createCheckoutSession, type SubscriptionTier } from '@/lib/stripe';

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const tier = body.tier as SubscriptionTier;
    if (!tier || !['wingman', 'rizzlord'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier. Must be "wingman" or "rizzlord".' }, { status: 400 });
    }

    const db = createServiceClient();
    const { data: profile, error: profileError } = await db.from('users').select('email, stripe_customer_id').eq('id', userId).single();
    if (profileError) {
      console.error('Failed to fetch profile for checkout:', profileError.message);
      return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
    }

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({ email: profile?.email, metadata: { user_id: userId } });
      customerId = customer.id;
      const { error: updateError } = await db.from('users').update({ stripe_customer_id: customerId }).eq('id', userId);
      if (updateError) {
        console.error('Failed to update stripe customer id:', updateError.message);
        return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    let returnUrl = `${appUrl}/world`;
    if (body.return_url) {
      // Only allow relative paths or URLs matching our app domain
      if (typeof body.return_url === 'string' && body.return_url.startsWith('/') && !body.return_url.startsWith('//')) {
        returnUrl = `${appUrl}${body.return_url}`;
      } else if (typeof body.return_url === 'string' && body.return_url.startsWith(appUrl)) {
        returnUrl = body.return_url;
      }
      // Otherwise ignore and use default
    }
    const session = await createCheckoutSession({ customerId, tier, returnUrl, userId });

    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
