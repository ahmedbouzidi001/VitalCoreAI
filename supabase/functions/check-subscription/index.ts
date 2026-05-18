import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const logStep = (step: string, details?: any) => {
  const str = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${str}`);
};

// Map Stripe Product IDs to tiers
const PRODUCT_TIER_MAP: Record<string, string> = {
  "prod_premium": "premium",   // Replace with real product IDs
  "prod_pro": "pro",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      // Stripe not configured — return free tier gracefully
      logStep("Stripe not configured, returning free tier");
      return new Response(
        JSON.stringify({ subscribed: false, tier: "free", subscription_end: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user?.email) throw new Error("User not authenticated");

    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find Stripe customer
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      await syncSubscriptionToProfile(supabase, user.id, false, "free", null, null);
      return new Response(
        JSON.stringify({ subscribed: false, tier: "free", subscription_end: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const customerId = customers.data[0].id;
    logStep("Customer found", { customerId });

    // Sync customer ID to profile
    await supabase.from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
      expand: ["data.items.data.price.product"],
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let tier = "free";
    let subscriptionEnd: string | null = null;
    let stripeSubscriptionId: string | null = null;

    if (hasActiveSub) {
      const sub = subscriptions.data[0];
      subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();
      stripeSubscriptionId = sub.id;
      const productId = (sub.items.data[0]?.price?.product as any)?.id || "";
      tier = PRODUCT_TIER_MAP[productId] || "premium";
      logStep("Active subscription", { tier, subscriptionEnd, subId: stripeSubscriptionId });
    } else {
      logStep("No active subscription");
    }

    // Sync to Supabase profiles
    await syncSubscriptionToProfile(supabase, user.id, hasActiveSub, tier, subscriptionEnd, stripeSubscriptionId);

    return new Response(
      JSON.stringify({
        subscribed: hasActiveSub,
        tier,
        subscription_end: subscriptionEnd,
        subscription_id: stripeSubscriptionId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("Error", { message: msg });
    return new Response(
      JSON.stringify({ error: msg, subscribed: false, tier: "free" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 } // Always 200 — never block the app
    );
  }
});

async function syncSubscriptionToProfile(
  supabase: any, userId: string, subscribed: boolean,
  tier: string, subscriptionEnd: string | null, subscriptionId: string | null
) {
  await supabase.from("profiles").update({
    is_premium: subscribed,
    subscription_tier: tier,
    subscription_end: subscriptionEnd,
    subscription_checked_at: new Date().toISOString(),
  }).eq("id", userId);
}
