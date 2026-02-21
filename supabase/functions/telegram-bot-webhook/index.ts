import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// List of Telegram user IDs allowed to use /addmin (bot owner(s))
const OWNER_TELEGRAM_IDS = (Deno.env.get("TELEGRAM_OWNER_IDS") || "").split(",").map((s) => s.trim()).filter(Boolean);

async function sendTelegramMessage(botToken: string, chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      return new Response("Bot token not configured", { status: 500 });
    }

    const update = await req.json();

    // Only handle message updates with text
    const message = update?.message;
    if (!message?.text) {
      return new Response("OK", { status: 200 });
    }

    const chatId = message.chat.id;
    const senderId = String(message.from.id);
    const text = message.text.trim();

    // Handle /addmin command
    if (text.startsWith("/addmin")) {
      // Check if sender is an owner
      if (OWNER_TELEGRAM_IDS.length > 0 && !OWNER_TELEGRAM_IDS.includes(senderId)) {
        await sendTelegramMessage(botToken, chatId, "❌ You are not authorized to use this command.");
        return new Response("OK", { status: 200 });
      }

      const parts = text.split(/\s+/);
      if (parts.length < 2) {
        await sendTelegramMessage(
          botToken,
          chatId,
          "⚠️ Usage: <code>/addmin [telegram_user_id]</code>\n\nYou can find a user's Telegram ID by asking them to message @userinfobot"
        );
        return new Response("OK", { status: 200 });
      }

      const targetTelegramId = parts[1];

      // Create admin Supabase client
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Find the user's profile by telegram_id
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, first_name, telegram_id")
        .eq("telegram_id", targetTelegramId)
        .single();

      if (profileError || !profile) {
        await sendTelegramMessage(
          botToken,
          chatId,
          `❌ No user found with Telegram ID <code>${targetTelegramId}</code>.\nMake sure the user has logged in to the app first.`
        );
        return new Response("OK", { status: 200 });
      }

      // Check if already admin
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", profile.id)
        .eq("role", "admin")
        .single();

      if (existingRole) {
        await sendTelegramMessage(
          botToken,
          chatId,
          `ℹ️ <b>${profile.first_name || profile.username}</b> is already an admin.`
        );
        return new Response("OK", { status: 200 });
      }

      // Add admin role
      const { error: insertError } = await supabase
        .from("user_roles")
        .insert({ user_id: profile.id, role: "admin" });

      if (insertError) {
        await sendTelegramMessage(botToken, chatId, `❌ Failed to add admin role: ${insertError.message}`);
        return new Response("OK", { status: 200 });
      }

      await sendTelegramMessage(
        botToken,
        chatId,
        `✅ <b>${profile.first_name || profile.username}</b> (TG ID: <code>${targetTelegramId}</code>) is now an admin!`
      );
      return new Response("OK", { status: 200 });
    }

    // Handle /removeadmin command
    if (text.startsWith("/removeadmin")) {
      if (OWNER_TELEGRAM_IDS.length > 0 && !OWNER_TELEGRAM_IDS.includes(senderId)) {
        await sendTelegramMessage(botToken, chatId, "❌ You are not authorized to use this command.");
        return new Response("OK", { status: 200 });
      }

      const parts = text.split(/\s+/);
      if (parts.length < 2) {
        await sendTelegramMessage(botToken, chatId, "⚠️ Usage: <code>/removeadmin [telegram_user_id]</code>");
        return new Response("OK", { status: 200 });
      }

      const targetTelegramId = parts[1];

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, username, first_name")
        .eq("telegram_id", targetTelegramId)
        .single();

      if (!profile) {
        await sendTelegramMessage(botToken, chatId, `❌ No user found with Telegram ID <code>${targetTelegramId}</code>.`);
        return new Response("OK", { status: 200 });
      }

      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", profile.id)
        .eq("role", "admin");

      if (deleteError) {
        await sendTelegramMessage(botToken, chatId, `❌ Failed to remove admin: ${deleteError.message}`);
        return new Response("OK", { status: 200 });
      }

      await sendTelegramMessage(
        botToken,
        chatId,
        `✅ <b>${profile.first_name || profile.username}</b> is no longer an admin.`
      );
      return new Response("OK", { status: 200 });
    }

    // Default: ignore other messages
    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("OK", { status: 200 }); // Always 200 to prevent Telegram retries
  }
});
