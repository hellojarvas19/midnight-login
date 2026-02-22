export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      check_jobs: {
        Row: {
          approved: number
          charged: number
          completed_at: string | null
          created_at: string
          declined: number
          gateway: string
          id: string
          processed: number
          proxies: string[]
          sites: string[]
          status: string
          total_cards: number
          updated_at: string
          user_id: string
        }
        Insert: {
          approved?: number
          charged?: number
          completed_at?: string | null
          created_at?: string
          declined?: number
          gateway?: string
          id?: string
          processed?: number
          proxies?: string[]
          sites?: string[]
          status?: string
          total_cards?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          approved?: number
          charged?: number
          completed_at?: string | null
          created_at?: string
          declined?: number
          gateway?: string
          id?: string
          processed?: number
          proxies?: string[]
          sites?: string[]
          status?: string
          total_cards?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      check_results: {
        Row: {
          card_number: string
          created_at: string
          cvv: string
          expiry: string
          id: string
          job_id: string
          response_code: string | null
          response_message: string | null
          site_used: string | null
          status: string
          user_id: string
        }
        Insert: {
          card_number: string
          created_at?: string
          cvv: string
          expiry: string
          id?: string
          job_id: string
          response_code?: string | null
          response_message?: string | null
          site_used?: string | null
          status?: string
          user_id: string
        }
        Update: {
          card_number?: string
          created_at?: string
          cvv?: string
          expiry?: string
          id?: string
          job_id?: string
          response_code?: string | null
          response_message?: string | null
          site_used?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_results_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "check_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_usage: {
        Row: {
          checks_used: number
          id: string
          updated_at: string
          usage_date: string
          user_id: string
        }
        Insert: {
          checks_used?: number
          id?: string
          updated_at?: string
          usage_date?: string
          user_id: string
        }
        Update: {
          checks_used?: number
          id?: string
          updated_at?: string
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          deleted: boolean
          edited: boolean
          id: string
          image_url: string | null
          pinned: boolean
          quoted_message_id: string | null
          sender_avatar_url: string | null
          sender_name: string
          sender_role: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          deleted?: boolean
          edited?: boolean
          id?: string
          image_url?: string | null
          pinned?: boolean
          quoted_message_id?: string | null
          sender_avatar_url?: string | null
          sender_name: string
          sender_role?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted?: boolean
          edited?: boolean
          id?: string
          image_url?: string | null
          pinned?: boolean
          quoted_message_id?: string | null
          sender_avatar_url?: string | null
          sender_name?: string
          sender_role?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_quoted_message_id_fkey"
            columns: ["quoted_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_permissions: {
        Row: {
          can_approve_payments: boolean
          can_ban_users: boolean
          can_give_credits: boolean
          can_manage_admins: boolean
          created_at: string
          granted_by: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_approve_payments?: boolean
          can_ban_users?: boolean
          can_give_credits?: boolean
          can_manage_admins?: boolean
          created_at?: string
          granted_by?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_approve_payments?: boolean
          can_ban_users?: boolean
          can_give_credits?: boolean
          can_manage_admins?: boolean
          created_at?: string
          granted_by?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_usd: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          credits_amount: number | null
          crypto_currency: string
          id: string
          payment_type: string
          plan: string
          status: string
          tx_hash: string | null
          user_id: string
          wallet_address: string
        }
        Insert: {
          amount_usd: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          credits_amount?: number | null
          crypto_currency: string
          id?: string
          payment_type?: string
          plan: string
          status?: string
          tx_hash?: string | null
          user_id: string
          wallet_address: string
        }
        Update: {
          amount_usd?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          credits_amount?: number | null
          crypto_currency?: string
          id?: string
          payment_type?: string
          plan?: string
          status?: string
          tx_hash?: string | null
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banned: boolean
          banned_at: string | null
          banned_by: string | null
          created_at: string
          credits: number
          first_name: string | null
          id: string
          last_name: string | null
          plan: string
          plan_expires_at: string | null
          referral_code: string
          referred_by: string | null
          telegram_id: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          banned?: boolean
          banned_at?: string | null
          banned_by?: string | null
          created_at?: string
          credits?: number
          first_name?: string | null
          id: string
          last_name?: string | null
          plan?: string
          plan_expires_at?: string | null
          referral_code?: string
          referred_by?: string | null
          telegram_id?: string | null
          username?: string
        }
        Update: {
          avatar_url?: string | null
          banned?: boolean
          banned_at?: string | null
          banned_by?: string | null
          created_at?: string
          credits?: number
          first_name?: string | null
          id?: string
          last_name?: string | null
          plan?: string
          plan_expires_at?: string | null
          referral_code?: string
          referred_by?: string | null
          telegram_id?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_sites: {
        Row: {
          added_by: string
          created_at: string
          id: string
          url: string
        }
        Insert: {
          added_by: string
          created_at?: string
          id?: string
          url: string
        }
        Update: {
          added_by?: string
          created_at?: string
          id?: string
          url?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      deduct_credits_atomic: {
        Args: {
          p_checks_requested: number
          p_daily_limit: number
          p_user_id: string
        }
        Returns: Json
      }
      has_owner_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_primary_owner: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "owner"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "owner"],
    },
  },
} as const
