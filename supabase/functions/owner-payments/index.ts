import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = claimsData.claims.sub;

    // Get user's telegram_id from profile using service role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: profile } = await adminClient.from("profiles").select("telegram_id").eq("id", userId).single();

    if (!profile?.telegram_id) {
      return new Response(JSON.stringify({ error: "No Telegram ID linked" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check if user is owner
    const ownerIds = (Deno.env.get("TELEGRAM_OWNER_IDS") || "").split(",").map((id: string) => id.trim());
    if (!ownerIds.includes(profile.telegram_id)) {
      return new Response(JSON.stringify({ error: "Owner access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // LIST pending payments
    if (req.method === "GET" && action === "list") {
      const status = url.searchParams.get("status") || "pending";
      const { data: payments, error } = await adminClient
        .from("payments")
        .select("*")
        .eq("status", status)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get usernames for each payment
      const userIds = [...new Set((payments || []).map((p: any) => p.user_id))];
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("id, username, telegram_id")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const enriched = (payments || []).map((p: any) => ({
        ...p,
        user_username: profileMap.get(p.user_id)?.username || "unknown",
        user_telegram_id: profileMap.get(p.user_id)?.telegram_id || "—",
      }));

      return new Response(JSON.stringify(enriched), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // APPROVE or REJECT payment
    if (req.method === "POST") {
      const body = await req.json();
      const { payment_id, decision } = body; // decision: "approve" | "reject"

      if (!payment_id || !["approve", "reject"].includes(decision)) {
        return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Get the payment
      const { data: payment, error: payErr } = await adminClient
        .from("payments")
        .select("*")
        .eq("id", payment_id)
        .single();

      if (payErr || !payment) {
        return new Response(JSON.stringify({ error: "Payment not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (payment.status !== "pending") {
        return new Response(JSON.stringify({ error: "Payment already processed" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const newStatus = decision === "approve" ? "approved" : "rejected";

      // Update payment status
      const { error: updateErr } = await adminClient
        .from("payments")
        .update({ status: newStatus, approved_at: new Date().toISOString(), approved_by: userId })
        .eq("id", payment_id);

      if (updateErr) throw updateErr;

      // If approved, activate the plan
      if (decision === "approve") {
        const planDurations: Record<string, number> = { basic: 7, standard: 15, pro: 30 };
        const days = planDurations[payment.plan] || 7;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);

        const { error: profileErr } = await adminClient
          .from("profiles")
          .update({ plan: payment.plan, plan_expires_at: expiresAt.toISOString() })
          .eq("id", payment.user_id);

        if (profileErr) throw profileErr;
      }

      return new Response(JSON.stringify({ success: true, status: newStatus }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
