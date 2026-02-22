import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── Main handler ── */
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
    const { job_id, cards, proxies } = body as {
      job_id: string;
      cards: { card: string; expiry: string; cvv: string }[];
      proxies: string[];
    };

    if (!job_id || !cards?.length || !proxies?.length) {
      return new Response(JSON.stringify({ error: "Missing required fields: job_id, cards, proxies" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch sites from DB (owner-managed)
    const { data: siteRows, error: sitesErr } = await supabase
      .from("shopify_sites")
      .select("url");

    if (sitesErr || !siteRows?.length) {
      return new Response(JSON.stringify({ error: "No Shopify sites configured. Ask an owner to add sites." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sites = siteRows.map((r: any) => r.url);

    // Update job to running
    await supabase.from("check_jobs").update({ status: "running" }).eq("id", job_id);

    // Process cards in background
    const processCards = async () => {
      let processed = 0, charged = 0, approved = 0, declined = 0;

      for (let i = 0; i < cards.length; i++) {
        // Check if job was stopped
        const { data: jobCheck } = await supabase.from("check_jobs").select("status").eq("id", job_id).single();
        if (jobCheck?.status === "stopped") break;

        const c = cards[i];
        const siteIndex = Math.floor(i / 10) % sites.length;
        const site = sites[siteIndex];
        const proxy = proxies[i % proxies.length];

        // Update result to checking
        await supabase.from("check_results")
          .update({ status: "checking", site_used: site })
          .eq("job_id", job_id)
          .eq("card_number", c.card)
          .eq("expiry", c.expiry)
          .eq("cvv", c.cvv);

        // Parse card
        const parts = c.expiry.split("/");
        const mon = parts[0] || "";
        const yr = parts[1] || "";

        // TODO: Call your external Shopify checker endpoint here
        // Example:
        // const result = await fetch("YOUR_ENDPOINT_URL", {
        //   method: "POST",
        //   headers: { "Content-Type": "application/json" },
        //   body: JSON.stringify({ card: c.card, month: mon, year: yr, cvv: c.cvv, site, proxy }),
        // }).then(r => r.json());
        //
        // Expected result shape: { status: "charged" | "approved" | "declined", code: string, message: string }

        const result = { status: "declined", code: "NOT_IMPLEMENTED", message: "Checker endpoint not configured yet" };

        // Update result
        if (result.status === "charged") charged++;
        else if (result.status === "approved") approved++;
        else declined++;
        processed++;

        await supabase.from("check_results")
          .update({
            status: result.status,
            response_code: result.code,
            response_message: result.message,
            site_used: site,
          })
          .eq("job_id", job_id)
          .eq("card_number", c.card)
          .eq("expiry", c.expiry)
          .eq("cvv", c.cvv);

        // Update job progress
        await supabase.from("check_jobs").update({ processed, charged, approved, declined }).eq("id", job_id);

        // Small delay between cards
        await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
      }

      // Mark job complete
      await supabase.from("check_jobs").update({
        status: "completed", processed, charged, approved, declined, completed_at: new Date().toISOString(),
      }).eq("id", job_id);
    };

    // Fire and forget
    processCards().catch(async (err) => {
      console.error("Job failed:", err);
      await supabase.from("check_jobs").update({ status: "failed" }).eq("id", job_id);
    });

    return new Response(JSON.stringify({ success: true, job_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
