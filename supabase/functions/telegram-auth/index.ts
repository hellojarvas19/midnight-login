import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TelegramData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

async function hmacSha256(key: Uint8Array, data: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

async function sha256(data: string): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return new Uint8Array(hash);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyTelegramData(data: TelegramData, botToken: string): Promise<boolean> {
  // Check auth_date is not too old (allow 1 day)
  const now = Math.floor(Date.now() / 1000);
  if (now - data.auth_date > 86400) return false;

  const secretKey = await sha256(botToken);

  const checkArr: string[] = [];
  for (const [key, val] of Object.entries(data)) {
    if (key === "hash") continue;
    if (val !== undefined && val !== null) {
      checkArr.push(`${key}=${val}`);
    }
  }
  checkArr.sort();
  const dataCheckString = checkArr.join("\n");

  const hmac = await hmacSha256(secretKey, dataCheckString);
  return toHex(hmac) === data.hash;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      return new Response(JSON.stringify({ error: "Bot token not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tgData: TelegramData = await req.json();

    // Verify hash
    const valid = await verifyTelegramData(tgData, botToken);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid Telegram data" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create admin Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const email = `tg_${tgData.id}@telegram.user`;
    const password = `tg_${tgData.id}_${botToken.slice(0, 10)}`;

    const metadata = {
      username: tgData.username || tgData.first_name,
      first_name: tgData.first_name,
      last_name: tgData.last_name || "",
      telegram_id: String(tgData.id),
      avatar_url: tgData.photo_url || "",
    };

    // Try to sign in first
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInData?.session) {
      // Check if user is banned
      const { data: profile } = await supabase
        .from("profiles")
        .select("banned")
        .eq("id", signInData.user.id)
        .single();

      if (profile?.banned) {
        return new Response(
          JSON.stringify({ error: "Your account has been banned. Contact support." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update profile with latest Telegram data
      await supabase
        .from("profiles")
        .update({
          username: metadata.username,
          first_name: metadata.first_name,
          last_name: metadata.last_name,
          telegram_id: metadata.telegram_id,
          avatar_url: metadata.avatar_url,
        })
        .eq("id", signInData.user.id);

      return new Response(
        JSON.stringify({
          session: signInData.session,
          user: signInData.user,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // User doesn't exist, create them
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sign in the new user to get a session
    const { data: newSession, error: newSignInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (newSignInError) {
      return new Response(JSON.stringify({ error: newSignInError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        session: newSession.session,
        user: newSession.user,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
