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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      amazon_offers: {
        Row: {
          affiliate_url: string
          created_at: string
          description: string
          id: string
          image_url: string | null
          is_active: boolean
          sort_order: number
          title: string
        }
        Insert: {
          affiliate_url: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          title: string
        }
        Update: {
          affiliate_url?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      claims: {
        Row: {
          admin_note: string | null
          created_at: string
          details: string | null
          id: string
          order_amount: number
          order_date: string
          order_ref: string
          status: string
          store_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          details?: string | null
          id?: string
          order_amount: number
          order_date: string
          order_ref: string
          status?: string
          store_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          details?: string | null
          id?: string
          order_amount?: number
          order_date?: string
          order_ref?: string
          status?: string
          store_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      clicks: {
        Row: {
          created_at: string
          id: string
          offer_id: string | null
          store_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          offer_id?: string | null
          store_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          offer_id?: string | null
          store_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clicks_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clicks_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_credentials: {
        Row: {
          encrypted_credentials: string
          provider: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          encrypted_credentials: string
          provider: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          encrypted_credentials?: string
          provider?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          code: string | null
          created_at: string
          deal_type: string | null
          description: string | null
          discount_amount: number | null
          discount_currency: string | null
          discount_percent: number | null
          discount_type: string | null
          ends_at: string | null
          id: string
          impact_ad_id: string | null
          impact_campaign_id: string | null
          impact_status: string | null
          is_active: boolean
          is_exclusive: boolean
          is_featured: boolean
          kind: string
          landing_page_url: string | null
          last_synced_at: string | null
          locked_by_admin: boolean
          sort_order: number
          source: string
          starts_at: string | null
          store_id: string | null
          title: string
          tracking_link: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          deal_type?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_currency?: string | null
          discount_percent?: number | null
          discount_type?: string | null
          ends_at?: string | null
          id?: string
          impact_ad_id?: string | null
          impact_campaign_id?: string | null
          impact_status?: string | null
          is_active?: boolean
          is_exclusive?: boolean
          is_featured?: boolean
          kind?: string
          landing_page_url?: string | null
          last_synced_at?: string | null
          locked_by_admin?: boolean
          sort_order?: number
          source?: string
          starts_at?: string | null
          store_id?: string | null
          title: string
          tracking_link?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          deal_type?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_currency?: string | null
          discount_percent?: number | null
          discount_type?: string | null
          ends_at?: string | null
          id?: string
          impact_ad_id?: string | null
          impact_campaign_id?: string | null
          impact_status?: string | null
          is_active?: boolean
          is_exclusive?: boolean
          is_featured?: boolean
          kind?: string
          landing_page_url?: string | null
          last_synced_at?: string | null
          locked_by_admin?: boolean
          sort_order?: number
          source?: string
          starts_at?: string | null
          store_id?: string | null
          title?: string
          tracking_link?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_blocked: boolean
          referral_code: string | null
          referred_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_blocked?: boolean
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_blocked?: boolean
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          cashback_share: number | null
          category_id: string | null
          commission_rate: number | null
          commission_type: string
          created_at: string
          description: string | null
          display_rate_override: number | null
          id: string
          impact_advertiser_id: string | null
          impact_campaign_id: string | null
          impact_details: Json
          impact_status: string | null
          is_active: boolean
          is_featured: boolean
          last_synced_at: string | null
          logo_url: string | null
          name: string
          previous_rate: number | null
          rate_prefix: string
          slug: string
          sort_order: number
          source: string
          terms: string | null
          tracking_link: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          cashback_share?: number | null
          category_id?: string | null
          commission_rate?: number | null
          commission_type?: string
          created_at?: string
          description?: string | null
          display_rate_override?: number | null
          id?: string
          impact_advertiser_id?: string | null
          impact_campaign_id?: string | null
          impact_details?: Json
          impact_status?: string | null
          is_active?: boolean
          is_featured?: boolean
          last_synced_at?: string | null
          logo_url?: string | null
          name: string
          previous_rate?: number | null
          rate_prefix?: string
          slug: string
          sort_order?: number
          source?: string
          terms?: string | null
          tracking_link?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          cashback_share?: number | null
          category_id?: string | null
          commission_rate?: number | null
          commission_type?: string
          created_at?: string
          description?: string | null
          display_rate_override?: number | null
          id?: string
          impact_advertiser_id?: string | null
          impact_campaign_id?: string | null
          impact_details?: Json
          impact_status?: string | null
          is_active?: boolean
          is_featured?: boolean
          last_synced_at?: string | null
          logo_url?: string | null
          name?: string
          previous_rate?: number | null
          rate_prefix?: string
          slug?: string
          sort_order?: number
          source?: string
          terms?: string | null
          tracking_link?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          finished_at: string | null
          id: string
          kind: string
          message: string | null
          started_at: string
          stats: Json
          status: string
          trigger: string
        }
        Insert: {
          finished_at?: string | null
          id?: string
          kind: string
          message?: string | null
          started_at?: string
          stats?: Json
          status?: string
          trigger?: string
        }
        Update: {
          finished_at?: string | null
          id?: string
          kind?: string
          message?: string | null
          started_at?: string
          stats?: Json
          status?: string
          trigger?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          cashback_amount: number
          click_id: string | null
          commission_amount: number
          created_at: string
          currency: string
          event_date: string
          id: string
          impact_action_id: string | null
          impact_campaign_id: string | null
          locked_by_admin: boolean
          note: string | null
          order_amount: number
          referral_for: string | null
          source: string
          status: string
          store_id: string | null
          store_name: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cashback_amount?: number
          click_id?: string | null
          commission_amount?: number
          created_at?: string
          currency?: string
          event_date?: string
          id?: string
          impact_action_id?: string | null
          impact_campaign_id?: string | null
          locked_by_admin?: boolean
          note?: string | null
          order_amount?: number
          referral_for?: string | null
          source?: string
          status?: string
          store_id?: string | null
          store_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cashback_amount?: number
          click_id?: string | null
          commission_amount?: number
          created_at?: string
          currency?: string
          event_date?: string
          id?: string
          impact_action_id?: string | null
          impact_campaign_id?: string | null
          locked_by_admin?: boolean
          note?: string | null
          order_amount?: number
          referral_for?: string | null
          source?: string
          status?: string
          store_id?: string | null
          store_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
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
      withdrawals: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          details: Json
          id: string
          method: string
          processed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          details?: Json
          id?: string
          method: string
          processed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          details?: Json
          id?: string
          method?: string
          processed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_user_list: {
        Args: never
        Returns: {
          approved: number
          available: number
          clicks: number
          created_at: string
          email: string
          full_name: string
          id: string
          is_admin: boolean
          is_blocked: boolean
          pending: number
          withdrawn: number
        }[]
      }
      claim_referral: { Args: { _code: string }; Returns: boolean }
      get_my_balance: {
        Args: never
        Returns: {
          approved: number
          available: number
          pending: number
          withdrawn: number
        }[]
      }
      get_my_referrals: {
        Args: never
        Returns: {
          bonus_paid: boolean
          friend_name: string
          joined_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      request_withdrawal: {
        Args: { _amount: number; _details: Json; _method: string }
        Returns: string
      }
      user_balance: {
        Args: { _user_id: string }
        Returns: {
          approved: number
          available: number
          pending: number
          withdrawn: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
