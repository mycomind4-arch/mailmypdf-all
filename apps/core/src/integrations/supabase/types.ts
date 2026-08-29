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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      order_events: {
        Row: {
          created_at: string
          id: string
          label: string
          metadata: Json | null
          order_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          metadata?: Json | null
          order_id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          metadata?: Json | null
          order_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string
          file_name: string
          file_size_bytes: number
          id: string
          lob_letter_id: string | null
          lookup_token: string
          mailed_at: string | null
          page_count: number
          paid_at: string | null
          pdf_storage_path: string
          price_cents: number
          recipient_city: string
          recipient_line1: string
          recipient_line2: string | null
          recipient_name: string
          recipient_postal: string
          recipient_state: string
          sender_city: string
          sender_line1: string
          sender_line2: string | null
          sender_name: string
          sender_postal: string
          sender_state: string
          status: Database["public"]["Enums"]["order_status"]
          stripe_session_id: string | null
          updated_at: string
          color: boolean
          mail_class: string
          letter_text: string | null
          vertical_slug: string | null
          vertical_metadata: Json | null
          scheduled_delivery_date: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email: string
          file_name: string
          file_size_bytes: number
          id?: string
          lob_letter_id?: string | null
          lookup_token: string
          mailed_at?: string | null
          page_count: number
          paid_at?: string | null
          pdf_storage_path: string
          price_cents: number
          recipient_city: string
          recipient_line1: string
          recipient_line2?: string | null
          recipient_name: string
          recipient_postal: string
          recipient_state: string
          sender_city: string
          sender_line1: string
          sender_line2?: string | null
          sender_name: string
          sender_postal: string
          sender_state: string
          status?: Database["public"]["Enums"]["order_status"]
          stripe_session_id?: string | null
          updated_at?: string
          color?: boolean
          mail_class?: string
          letter_text?: string | null
          vertical_slug?: string | null
          vertical_metadata?: Json | null
          scheduled_delivery_date?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string
          file_name?: string
          file_size_bytes?: number
          id?: string
          lob_letter_id?: string | null
          lookup_token?: string
          mailed_at?: string | null
          page_count?: number
          paid_at?: string | null
          pdf_storage_path?: string
          price_cents?: number
          recipient_city?: string
          recipient_line1?: string
          recipient_line2?: string | null
          recipient_name?: string
          recipient_postal?: string
          recipient_state?: string
          sender_city?: string
          sender_line1?: string
          sender_line2?: string | null
          sender_name?: string
          sender_postal?: string
          sender_state?: string
          status?: Database["public"]["Enums"]["order_status"]
          stripe_session_id?: string | null
          updated_at?: string
          color?: boolean
          mail_class?: string
          letter_text?: string | null
          vertical_slug?: string | null
          vertical_metadata?: Json | null
          scheduled_delivery_date?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }

      user_profiles: {
        Row: {
          id: string
          full_name: string | null
          phone: string | null
          company: string | null
          marketing_opt_in: boolean
          default_sender_name: string | null
          default_sender_line1: string | null
          default_sender_line2: string | null
          default_sender_city: string | null
          default_sender_state: string | null
          default_sender_postal: string | null
          default_recipient_name: string | null
          default_recipient_line1: string | null
          default_recipient_line2: string | null
          default_recipient_city: string | null
          default_recipient_state: string | null
          default_recipient_postal: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          phone?: string | null
          company?: string | null
          marketing_opt_in?: boolean
          default_sender_name?: string | null
          default_sender_line1?: string | null
          default_sender_line2?: string | null
          default_sender_city?: string | null
          default_sender_state?: string | null
          default_sender_postal?: string | null
          default_recipient_name?: string | null
          default_recipient_line1?: string | null
          default_recipient_line2?: string | null
          default_recipient_city?: string | null
          default_recipient_state?: string | null
          default_recipient_postal?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          phone?: string | null
          company?: string | null
          marketing_opt_in?: boolean
          default_sender_name?: string | null
          default_sender_line1?: string | null
          default_sender_line2?: string | null
          default_sender_city?: string | null
          default_sender_state?: string | null
          default_sender_postal?: string | null
          default_recipient_name?: string | null
          default_recipient_line1?: string | null
          default_recipient_line2?: string | null
          default_recipient_city?: string | null
          default_recipient_state?: string | null
          default_recipient_postal?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      order_status:
        | "draft"
        | "paid"
        | "submitted_to_provider"
        | "provider_processing"
        | "mailed"
        | "in_transit"
        | "delivered"
        | "failed"
        | "uploaded"
        | "priced"
        | "checkout_created"
        | "paid_pending_manual_fulfillment"
        | "manual_fulfillment_in_progress"
        | "cancelled"
        | "refunded"
        | "failed_payment"
        | "failed_fulfillment"
        | "returned"
        | "failed_provider_submission"
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
      app_role: ["admin", "user"],
      order_status: [
        "draft",
        "paid",
        "submitted_to_provider",
        "provider_processing",
        "mailed",
        "in_transit",
        "delivered",
        "failed",
        "uploaded",
        "priced",
        "checkout_created",
        "paid_pending_manual_fulfillment",
        "manual_fulfillment_in_progress",
        "cancelled",
        "refunded",
        "failed_payment",
        "failed_fulfillment",
        "returned",
        "failed_provider_submission",
      ],
    },
  },
} as const
