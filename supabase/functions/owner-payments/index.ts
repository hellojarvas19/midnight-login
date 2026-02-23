import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendTelegramMessage(chatId: string, text: string) {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!botToken) {
    console.error("TELEGRAM_BOT_TOKEN not configured");
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch (err) {
    console.error("Failed to send Telegram notification:", err);
  }
}

async function notifyOwners(adminClient: any, message: string) {
  const ownerIds = (Deno.env.get("TELEGRAM_OWNER_IDS") || "").split(",").map((id: string) => id.trim()).filter(Boolean);
  for (const ownerId of ownerIds) {
    await sendTelegramMessage(ownerId, message);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = claimsData.claims.sub;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: profile } = await adminClient.from("profiles").select("telegram_id, username").eq("id", userId).single();

    if (!profile?.telegram_id) {
      return new Response(JSON.stringify({ error: "No Telegram ID linked" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // NOTIFY: user submitted a payment — notify owners
    if (req.method === "POST" && action === "notify-submission") {
      const body = await req.json();
      const { plan, amount_usd, crypto_currency, tx_hash } = body;

      const msg = `🆕 <b>New Payment Submitted</b>\n\n` +
        `👤 User: <b>${profile.username || "Unknown"}</b> (TG: ${profile.telegram_id})\n` +
        `📋 Plan: <b>${plan}</b>\n` +
        `💰 Amount: <b>$${amount_usd}</b> (${crypto_currency})\n` +
        `🔗 TX: <code>${tx_hash}</code>\n\n` +
        `Open the Owner Panel to approve or reject.`;

      await notifyOwners(adminClient, msg);

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check if user is owner for remaining actions
    const ownerIds = (Deno.env.get("TELEGRAM_OWNER_IDS") || "").split(",").map((id: string) => id.trim());
    if (!ownerIds.includes(profile.telegram_id)) {
      return new Response(JSON.stringify({ error: "Owner access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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
      const { payment_id, decision } = body;

      if (!payment_id || !["approve", "reject"].includes(decision)) {
        return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

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

      const { error: updateErr } = await adminClient
        .from("payments")
        .update({ status: newStatus, approved_at: new Date().toISOString(), approved_by: userId })
        .eq("id", payment_id);

      if (updateErr) throw updateErr;

      // If approved, activate the plan or add credits
      if (decision === "approve") {
        if (payment.payment_type === "credits" && payment.credits_amount) {
          // Credits purchase: add credits to profile
          const { data: currentProfile } = await adminClient
            .from("profiles")
            .select("credits")
            .eq("id", payment.user_id)
            .single();

          const newCredits = (currentProfile?.credits || 0) + payment.credits_amount;
          const { error: creditsErr } = await adminClient
            .from("profiles")
            .update({ credits: newCredits })
            .eq("id", payment.user_id);

          if (creditsErr) throw creditsErr;
        } else {
          // Plan purchase: activate the plan AND grant credits
          const planDurations: Record<string, number> = { basic: 7, standard: 15, pro: 30 };
          const planCredits: Record<string, number> = { basic: 35000, standard: 75000, pro: 150000 };
          const days = planDurations[payment.plan] || 7;
          const credits = planCredits[payment.plan] || 0;
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + days);

          // Get current credits to add on top
          const { data: currentProfile } = await adminClient
            .from("profiles")
            .select("credits")
            .eq("id", payment.user_id)
            .single();

          const newCredits = (currentProfile?.credits || 0) + credits;

          const { error: profileErr } = await adminClient
            .from("profiles")
            .update({ plan: payment.plan, plan_expires_at: expiresAt.toISOString(), credits: newCredits })
            .eq("id", payment.user_id);

          if (profileErr) throw profileErr;
        }
      }

      // Notify user via Telegram about the decision
      const { data: paymentUser } = await adminClient
        .from("profiles")
        .select("telegram_id, username")
        .eq("id", payment.user_id)
        .single();

      if (paymentUser?.telegram_id) {
        const emoji = decision === "approve" ? "✅" : "❌";
        const statusText = decision === "approve" ? "Approved" : "Rejected";
        const extra = decision === "approve"
          ? (payment.payment_type === "credits"
            ? `\n\n💳 <b>${payment.credits_amount?.toLocaleString()}</b> credits added to your account! 🎉`
            : `\n\nYour <b>${payment.plan}</b> plan is now active with <b>${(planCredits[payment.plan] || 0).toLocaleString()}</b> credits! 🎉`)
          : `\n\nPlease contact support if you believe this is an error.`;

        const userMsg = `${emoji} <b>Payment ${statusText}</b>\n\n` +
          `📋 Plan: <b>${payment.plan}</b>\n` +
          `💰 Amount: <b>$${payment.amount_usd}</b> (${payment.crypto_currency})` +
          extra;

        await sendTelegramMessage(paymentUser.telegram_id, userMsg);
      }

      return new Response(JSON.stringify({ success: true, status: newStatus }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
