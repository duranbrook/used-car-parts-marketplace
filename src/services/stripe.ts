/**
 * Stripe Connect Integration (scaffold)
 *
 * To enable, set these env vars:
 * - STRIPE_SECRET_KEY
 * - STRIPE_WEBHOOK_SECRET
 * - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
 *
 * Then install: npm install stripe @stripe/stripe-js
 */

// Placeholder until Stripe is configured
export function isStripeConfigured(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

export async function createConnectAccount(sellerId: string, email: string) {
  if (!isStripeConfigured()) {
    return { error: "Stripe not configured", accountId: null };
  }
  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  // const account = await stripe.accounts.create({ type: 'express', email, metadata: { sellerId } });
  // return { accountId: account.id };
  return { error: "Stripe integration pending", accountId: null };
}

export async function createCheckoutSession(orderId: string, items: { name: string; price: number; quantity: number }[]) {
  if (!isStripeConfigured()) {
    return { error: "Stripe not configured", url: null };
  }
  // Implementation when Stripe keys are available
  return { error: "Stripe integration pending", url: null };
}

export async function createPayout(sellerId: string, amount: number) {
  if (!isStripeConfigured()) {
    return { error: "Stripe not configured" };
  }
  return { error: "Stripe integration pending" };
}
