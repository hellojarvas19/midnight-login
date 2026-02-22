import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRIMARY_OWNER_TG_ID = "7520618222";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);

    const callerId = claimsData.claims.sub as string;
    const admin = createClient(supabaseUrl, serviceKey);

    // Get caller profile
    const { data: callerProfile } = await admin.from("profiles").select("telegram_id").eq("id", callerId).single();
    if (!callerProfile?.telegram_id) return json({ error: "No profile" }, 403);

    const isPrimary = callerProfile.telegram_id === PRIMARY_OWNER_TG_ID;

    // Check if caller is at least an owner
    const { data: hasOwnerRole } = await admin.rpc("has_role", { _user_id: callerId, _role: "owner" });
    if (!isPrimary && !hasOwnerRole) return json({ error: "Owner access required" }, 403);

    // Get caller permissions (primary has all)
    let perms = {
      can_approve_payments: true,
      can_ban_users: true,
      can_manage_admins: true,
      can_give_credits: true,
    };
    if (!isPrimary) {
      const { data: ownerPerms } = await admin.from("owner_permissions").select("*").eq("user_id", callerId).single();
      if (!ownerPerms) return json({ error: "No permissions assigned" }, 403);
      perms = ownerPerms;
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // ── GET: whoami (returns role info)
    if (req.method === "GET" && action === "whoami") {
      return json({ isPrimary, isOwner: true, permissions: perms });
    }

    // ── GET: list users
    if (req.method === "GET" && action === "list-users") {
      const { data: users } = await admin
        .from("profiles")
        .select("id, username, telegram_id, credits, plan, plan_expires_at, banned, banned_at, created_at")
        .order("created_at", { ascending: false })
        .limit(200);

      // Get roles for all users
      const { data: roles } = await admin.from("user_roles").select("user_id, role");
      const roleMap: Record<string, string[]> = {};
      (roles || []).forEach((r: any) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });

      // Get owner permissions
      const { data: allPerms } = await admin.from("owner_permissions").select("*");
      const permMap: Record<string, any> = {};
      (allPerms || []).forEach((p: any) => { permMap[p.user_id] = p; });

      const enriched = (users || []).map((u: any) => ({
        ...u,
        roles: roleMap[u.id] || [],
        owner_permissions: permMap[u.id] || null,
        is_primary: u.telegram_id === PRIMARY_OWNER_TG_ID,
      }));

      return json(enriched);
    }

    // ── POST actions
    if (req.method === "POST") {
      const body = await req.json();
      const { target_user_id } = body;

      if (!target_user_id) return json({ error: "target_user_id required" }, 400);

      // Prevent actions on primary owner
      const { data: targetProfile } = await admin.from("profiles").select("telegram_id").eq("id", target_user_id).single();
      if (targetProfile?.telegram_id === PRIMARY_OWNER_TG_ID && !isPrimary) {
        return json({ error: "Cannot modify Primary Owner" }, 403);
      }

      // ── Ban user
      if (action === "ban") {
        if (!perms.can_ban_users) return json({ error: "No permission to ban users" }, 403);
        if (targetProfile?.telegram_id === PRIMARY_OWNER_TG_ID) return json({ error: "Cannot ban Primary Owner" }, 403);

        await admin.from("profiles").update({
          banned: true,
          banned_at: new Date().toISOString(),
          banned_by: callerId,
        }).eq("id", target_user_id);

        return json({ success: true, action: "banned" });
      }

      // ── Unban user
      if (action === "unban") {
        if (!perms.can_ban_users) return json({ error: "No permission" }, 403);

        await admin.from("profiles").update({
          banned: false,
          banned_at: null,
          banned_by: null,
        }).eq("id", target_user_id);

        return json({ success: true, action: "unbanned" });
      }

      // ── Give credits
      if (action === "give-credits") {
        if (!perms.can_give_credits) return json({ error: "No permission" }, 403);
        const amount = parseInt(body.amount, 10);
        if (!amount || amount < 1) return json({ error: "Invalid amount" }, 400);

        const { data: profile } = await admin.from("profiles").select("credits").eq("id", target_user_id).single();
        await admin.from("profiles").update({ credits: (profile?.credits || 0) + amount }).eq("id", target_user_id);

        return json({ success: true, new_credits: (profile?.credits || 0) + amount });
      }

      // ── Add admin role
      if (action === "add-admin") {
        if (!perms.can_manage_admins) return json({ error: "No permission" }, 403);

        await admin.from("user_roles").upsert({ user_id: target_user_id, role: "admin" }, { onConflict: "user_id,role" });
        return json({ success: true, action: "admin_added" });
      }

      // ── Remove admin role
      if (action === "remove-admin") {
        if (!perms.can_manage_admins) return json({ error: "No permission" }, 403);

        await admin.from("user_roles").delete().eq("user_id", target_user_id).eq("role", "admin");
        return json({ success: true, action: "admin_removed" });
      }

      // ── Add owner role (PRIMARY ONLY)
      if (action === "add-owner") {
        if (!isPrimary) return json({ error: "Only Primary Owner can add owners" }, 403);

        await admin.from("user_roles").upsert({ user_id: target_user_id, role: "owner" }, { onConflict: "user_id,role" });

        // Create default permissions (all false)
        const defaultPerms = body.permissions || {};
        await admin.from("owner_permissions").upsert({
          user_id: target_user_id,
          can_approve_payments: !!defaultPerms.can_approve_payments,
          can_ban_users: !!defaultPerms.can_ban_users,
          can_manage_admins: !!defaultPerms.can_manage_admins,
          can_give_credits: !!defaultPerms.can_give_credits,
          granted_by: callerId,
        }, { onConflict: "user_id" });

        return json({ success: true, action: "owner_added" });
      }

      // ── Remove owner role (PRIMARY ONLY)
      if (action === "remove-owner") {
        if (!isPrimary) return json({ error: "Only Primary Owner can remove owners" }, 403);
        if (targetProfile?.telegram_id === PRIMARY_OWNER_TG_ID) return json({ error: "Cannot remove Primary Owner" }, 403);

        await admin.from("user_roles").delete().eq("user_id", target_user_id).eq("role", "owner");
        await admin.from("owner_permissions").delete().eq("user_id", target_user_id);
        return json({ success: true, action: "owner_removed" });
      }

      // ── Update owner permissions (PRIMARY ONLY)
      if (action === "update-permissions") {
        if (!isPrimary) return json({ error: "Only Primary Owner can update permissions" }, 403);

        const permsUpdate = body.permissions || {};
        await admin.from("owner_permissions").update({
          can_approve_payments: !!permsUpdate.can_approve_payments,
          can_ban_users: !!permsUpdate.can_ban_users,
          can_manage_admins: !!permsUpdate.can_manage_admins,
          can_give_credits: !!permsUpdate.can_give_credits,
        }).eq("user_id", target_user_id);

        return json({ success: true, action: "permissions_updated" });
      }

      // ── Set unlimited plan for primary owner
      if (action === "set-unlimited") {
        if (!isPrimary) return json({ error: "Only Primary Owner" }, 403);

        const farFuture = new Date("2099-12-31").toISOString();
        await admin.from("profiles").update({
          plan: "pro",
          plan_expires_at: farFuture,
          credits: 999999999,
        }).eq("id", target_user_id);

        return json({ success: true, action: "unlimited_set" });
      }
    }

    return json({ error: "Unknown action" }, 404);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
