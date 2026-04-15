# Stripe Paywall Setup

This app gates dashboard routes behind a Stripe subscription. Plans are
**$24/month** and **$100/year**, both with a **14-day free trial**. Existing
users at the time of launch are grandfathered in (permanent free access).
Past-due payments get a **3-day grace period** before access is revoked.

## 1. Run the SQL migration

Open Supabase → SQL Editor and run the new section at the bottom of
`supabase-schema.sql` (the `user_subscriptions` table + RLS + the
`grandfathered` insert). The grandfather insert is idempotent — safe to re-run.

## 2. Create the Stripe product and prices

In the Stripe dashboard (test mode first):

1. **Products** → **Add product**
   - Name: `Master Product Manager`
   - Add two recurring prices:
     - `$24.00 USD` / month → copy the price ID (starts with `price_…`)
     - `$100.00 USD` / year → copy the price ID
2. **Developers** → **API keys** → copy the **Secret key** (starts with `sk_test_…`)

## 3. Environment variables

Add to `.env`:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_MONTHLY=price_...   # the $24/month price ID
STRIPE_PRICE_YEARLY=price_...    # the $100/year price ID
STRIPE_WEBHOOK_SECRET=whsec_...  # filled in step 4

# Used to build success/cancel URLs for Checkout
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production, swap to live keys and set `NEXT_PUBLIC_APP_URL` to your real
domain.

## 4. Install Stripe CLI for local webhook testing

You don't have Stripe CLI yet. Install with Homebrew:

```bash
brew install stripe/stripe-cli/stripe
stripe login
```

Then in a separate terminal (while `npm run dev` is running):

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

It prints a webhook signing secret like `whsec_…`. Paste that into
`STRIPE_WEBHOOK_SECRET` in `.env` and restart `npm run dev`.

For production, register the same webhook URL in
**Stripe Dashboard → Developers → Webhooks**. Subscribe it to these events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

Copy the production signing secret into your prod env vars.

## 5. Test the flow

1. Sign in as a non-grandfathered user (e.g. create a fresh account).
2. You should be redirected to `/billing`.
3. Click **Start free trial** on either plan → Stripe Checkout opens.
4. Use a test card: `4242 4242 4242 4242`, any future expiry, any CVC.
5. After completing checkout, you return to `/billing?success=1` and the
   webhook upserts your subscription. You should now be able to use the app.

To test past-due flow: use `4000 0000 0000 0341` (charges succeed, subsequent
invoices fail).

## How it works

- **Database:** `user_subscriptions` (one row per user) tracks Stripe state.
- **Entitlement:** `src/lib/subscription.ts` decides if a user has access:
  `grandfathered`, `active`, or `trialing` → yes; `past_due` → yes for 3 days
  from `past_due_since`; everything else → no. Admins always pass.
- **Enforcement:** `src/components/layout/AuthGuard.tsx` redirects users
  without entitlement to `/billing` (which itself is exempt).
- **Webhook:** `src/app/api/stripe/webhook/route.ts` is the source of truth —
  it upserts subscription rows on Stripe events.
