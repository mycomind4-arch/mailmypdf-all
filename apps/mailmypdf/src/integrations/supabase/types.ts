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
      case_drafts: {
        Row: {
          id: string
          case_id: string
          owner_id: string
          version: number
          body_text: string
          created_at: string
        }
        Insert: {
          id?: string
          case_id: string
          owner_id: string
          version: number
          body_text: string
          created_at?: string
        }
        Update: {
          id?: string
          case_id?: string
          owner_id?: string
          version?: number
          body_text?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_drafts_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "workflow_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_cases: {
        Row: {
          id: string
          owner_id: string
          workflow_id: string
          vertical_id: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          workflow_id: string
          vertical_id: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          workflow_id?: string
          vertical_id?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      case_documents: {
        Row: {
          id: string
          case_id: string
          document_id: string
          owner_id: string
          role: string
          evidence_kind: string | null
          page_count: number | null
          included: boolean
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          case_id: string
          document_id: string
          owner_id: string
          role: string
          evidence_kind?: string | null
          page_count?: number | null
          included?: boolean
          position?: number
          created_at?: string
        }
        Update: {
          id?: string
          case_id?: string
          document_id?: string
          owner_id?: string
          role?: string
          evidence_kind?: string | null
          page_count?: number | null
          included?: boolean
          position?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "workflow_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "secure_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      case_approvals: {
        Row: {
          id: string
          case_id: string
          owner_id: string
          packet_sha256: string
          manifest: Json
          response_pages: number
          supporting_pages: number
          recipient: Json
          mail_class: string
          quote: Json
          approved_at: string
        }
        Insert: {
          id?: string
          case_id: string
          owner_id: string
          packet_sha256: string
          manifest: Json
          response_pages: number
          supporting_pages: number
          recipient: Json
          mail_class: string
          quote: Json
          approved_at?: string
        }
        Update: {
          id?: string
          case_id?: string
          owner_id?: string
          packet_sha256?: string
          manifest?: Json
          response_pages?: number
          supporting_pages?: number
          recipient?: Json
          mail_class?: string
          quote?: Json
          approved_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_approvals_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "workflow_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_provider_configs: {
        Row: {
          id: string
          provider: string
          label: string
          encrypted_api_key: string
          api_base_url: string | null
          default_model: string
          enabled: boolean
          metadata: Json
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider: string
          label: string
          encrypted_api_key: string
          api_base_url?: string | null
          default_model: string
          enabled?: boolean
          metadata?: Json
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider?: string
          label?: string
          encrypted_api_key?: string
          api_base_url?: string | null
          default_model?: string
          enabled?: boolean
          metadata?: Json
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_workflow_routes: {
        Row: {
          id: string
          vertical_slug: string
          workflow_slug: string | null
          task: string
          provider_id: string
          model_override: string | null
          prompt_override: string | null
          fallback_provider_id: string | null
          enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vertical_slug: string
          workflow_slug?: string | null
          task: string
          provider_id: string
          model_override?: string | null
          prompt_override?: string | null
          fallback_provider_id?: string | null
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vertical_slug?: string
          workflow_slug?: string | null
          task?: string
          provider_id?: string
          model_override?: string | null
          prompt_override?: string | null
          fallback_provider_id?: string | null
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_workflow_routes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_provider_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_workflow_routes_fallback_provider_id_fkey"
            columns: ["fallback_provider_id"]
            isOneToOne: false
            referencedRelation: "ai_provider_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          id: string
          event_id: string
          event_name: string
          occurred_at: string
          visitor_id: string | null
          session_id: string | null
          user_id: string | null
          page: string | null
          url: string | null
          referrer: string | null
          title: string | null
          properties: Json
          technical: Json
          attribution: Json
          consent_version: string
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          event_name: string
          occurred_at?: string
          visitor_id?: string | null
          session_id?: string | null
          user_id?: string | null
          page?: string | null
          url?: string | null
          referrer?: string | null
          title?: string | null
          properties?: Json
          technical?: Json
          attribution?: Json
          consent_version: string
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          event_name?: string
          occurred_at?: string
          visitor_id?: string | null
          session_id?: string | null
          user_id?: string | null
          page?: string | null
          url?: string | null
          referrer?: string | null
          title?: string | null
          properties?: Json
          technical?: Json
          attribution?: Json
          consent_version?: string
          created_at?: string
        }
        Relationships: []
      }
      analytics_inferences: {
        Row: {
          id: string
          visitor_id: string | null
          user_id: string | null
          inference_type: string
          value: Json
          confidence: number | null
          evidence: Json
          model_version: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          visitor_id?: string | null
          user_id?: string | null
          inference_type: string
          value: Json
          confidence?: number | null
          evidence?: Json
          model_version?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          visitor_id?: string | null
          user_id?: string | null
          inference_type?: string
          value?: Json
          confidence?: number | null
          evidence?: Json
          model_version?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      document_consents: {
        Row: {
          id: string
          owner_id: string
          workflow_id: string
          purpose: string
          consent_version: string
          consented_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          workflow_id: string
          purpose: string
          consent_version: string
          consented_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          workflow_id?: string
          purpose?: string
          consent_version?: string
          consented_at?: string
        }
        Relationships: []
      }
      ecosystem_config_audit: {
        Row: {
          id: string
          actor_user_id: string | null
          action: string
          resource_type: string
          resource_id: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          actor_user_id?: string | null
          action: string
          resource_type: string
          resource_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          actor_user_id?: string | null
          action?: string
          resource_type?: string
          resource_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      ecosystem_runtime_variables: {
        Row: {
          key: string
          plaintext_value: string | null
          encrypted_value: string | null
          is_secret: boolean
          description: string
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          key: string
          plaintext_value?: string | null
          encrypted_value?: string | null
          is_secret?: boolean
          description?: string
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          key?: string
          plaintext_value?: string | null
          encrypted_value?: string | null
          is_secret?: boolean
          description?: string
          updated_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      proof_api_keys: {
        Row: {
          id: string
          tenant_id: string
          key_prefix: string
          key_hash: string
          key_bcrypt_hash: string | null
          environment: string
          label: string
          created_at: string
          revoked_at: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          key_prefix: string
          key_hash: string
          key_bcrypt_hash?: string | null
          environment?: string
          label?: string
          created_at?: string
          revoked_at?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string
          key_prefix?: string
          key_hash?: string
          key_bcrypt_hash?: string | null
          environment?: string
          label?: string
          created_at?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proof_api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "proof_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      proof_communications: {
        Row: {
          id: string
          tenant_id: string
          document_id: string
          document_sha256: string
          legal_reference: Json
          recipient: Json
          mail_type: string
          carrier: string
          lob_letter_id: string | null
          status: string
          tracking_number: string | null
          sent_at: string | null
          delivered_at: string | null
          signature_image_url: string | null
          proof_of_delivery: string | null
          prior_record_hash: string | null
          record_sha256: string
          matter_reference: string
          matter_type: string
          idempotency_key: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          document_id: string
          document_sha256: string
          legal_reference: Json
          recipient: Json
          mail_type: string
          carrier?: string
          lob_letter_id?: string | null
          status?: string
          tracking_number?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          signature_image_url?: string | null
          proof_of_delivery?: string | null
          prior_record_hash?: string | null
          record_sha256: string
          matter_reference: string
          matter_type: string
          idempotency_key?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          document_id?: string
          document_sha256?: string
          legal_reference?: Json
          recipient?: Json
          mail_type?: string
          carrier?: string
          lob_letter_id?: string | null
          status?: string
          tracking_number?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          signature_image_url?: string | null
          proof_of_delivery?: string | null
          prior_record_hash?: string | null
          record_sha256?: string
          matter_reference?: string
          matter_type?: string
          idempotency_key?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proof_communications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "proof_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proof_communications_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "proof_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      proof_custody_events: {
        Row: {
          id: string
          communication_id: string
          timestamp: string
          event_type: string
          description: string
          carrier_event_id: string | null
          event_hash: string
          prior_event_hash: string | null
          created_at: string
        }
        Insert: {
          id?: string
          communication_id: string
          timestamp: string
          event_type: string
          description: string
          carrier_event_id?: string | null
          event_hash: string
          prior_event_hash?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          communication_id?: string
          timestamp?: string
          event_type?: string
          description?: string
          carrier_event_id?: string | null
          event_hash?: string
          prior_event_hash?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proof_custody_events_communication_id_fkey"
            columns: ["communication_id"]
            isOneToOne: false
            referencedRelation: "proof_communications"
            referencedColumns: ["id"]
          },
        ]
      }
      proof_documents: {
        Row: {
          id: string
          tenant_id: string
          filename: string
          mime_type: string
          sha256: string
          size_bytes: number
          storage_path: string
          source: string
          template_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          filename: string
          mime_type: string
          sha256: string
          size_bytes: number
          storage_path: string
          source?: string
          template_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          filename?: string
          mime_type?: string
          sha256?: string
          size_bytes?: number
          storage_path?: string
          source?: string
          template_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proof_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "proof_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      proof_templates: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string
          vertical: string
          body_html: string
          variables: Json
          default_legal_reference: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string
          vertical?: string
          body_html: string
          variables?: Json
          default_legal_reference?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          description?: string
          vertical?: string
          body_html?: string
          variables?: Json
          default_legal_reference?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proof_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "proof_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      proof_tenants: {
        Row: {
          id: string
          name: string
          webhook_url: string | null
          webhook_secret: string | null
          lob_api_key: string | null
          rate_limits: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          webhook_url?: string | null
          webhook_secret?: string | null
          lob_api_key?: string | null
          rate_limits?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          webhook_url?: string | null
          webhook_secret?: string | null
          lob_api_key?: string | null
          rate_limits?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      proof_webhook_deliveries: {
        Row: {
          id: string
          tenant_id: string
          communication_id: string | null
          event_type: string
          event_id: string
          payload: Json
          status: string
          attempts: number
          next_retry_at: string | null
          response_code: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          communication_id?: string | null
          event_type: string
          event_id: string
          payload: Json
          status?: string
          attempts?: number
          next_retry_at?: string | null
          response_code?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          communication_id?: string | null
          event_type?: string
          event_id?: string
          payload?: Json
          status?: string
          attempts?: number
          next_retry_at?: string | null
          response_code?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proof_webhook_deliveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "proof_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proof_webhook_deliveries_communication_id_fkey"
            columns: ["communication_id"]
            isOneToOne: false
            referencedRelation: "proof_communications"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_buckets: {
        Row: {
          id: string
          bucket_key: string
          timestamps: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bucket_key: string
          timestamps?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bucket_key?: string
          timestamps?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      secure_documents: {
        Row: {
          id: string
          owner_id: string
          workflow_id: string
          consent_id: string
          original_filename: string | null
          safe_filename: string | null
          storage_path: string
          mime_type: string | null
          size_bytes: number | null
          sha256: string | null
          security_status: string
          scanner_name: string | null
          scanner_result: Json | null
          scanned_at: string | null
          scan_attempts: number
          last_scan_error: string | null
          deletion_attempts: number
          last_deletion_error: string | null
          retention_until: string
          deletion_requested_at: string | null
          deleted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          workflow_id: string
          consent_id: string
          original_filename?: string | null
          safe_filename?: string | null
          storage_path: string
          mime_type?: string | null
          size_bytes?: number | null
          sha256?: string | null
          security_status?: string
          scanner_name?: string | null
          scanner_result?: Json | null
          scanned_at?: string | null
          scan_attempts?: number
          last_scan_error?: string | null
          deletion_attempts?: number
          last_deletion_error?: string | null
          retention_until?: string
          deletion_requested_at?: string | null
          deleted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          workflow_id?: string
          consent_id?: string
          original_filename?: string | null
          safe_filename?: string | null
          storage_path?: string
          mime_type?: string | null
          size_bytes?: number | null
          sha256?: string | null
          security_status?: string
          scanner_name?: string | null
          scanner_result?: Json | null
          scanned_at?: string | null
          scan_attempts?: number
          last_scan_error?: string | null
          deletion_attempts?: number
          last_deletion_error?: string | null
          retention_until?: string
          deletion_requested_at?: string | null
          deleted_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "secure_documents_consent_id_fkey"
            columns: ["consent_id"]
            isOneToOne: false
            referencedRelation: "document_consents"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          id: number
          owner_id: string | null
          document_id: string | null
          event_type: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: number
          owner_id?: string | null
          document_id?: string | null
          event_type: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: number
          owner_id?: string | null
          document_id?: string | null
          event_type?: string
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_events_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "secure_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          created_at: string
          id: string
          label: string
          metadata: Json | null
          order_id: string
          type: string
          vertical_slug: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          metadata?: Json | null
          order_id: string
          type: string
          vertical_slug?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          metadata?: Json | null
          order_id?: string
          type?: string
          vertical_slug?: string | null
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
      case_packet_documents: {
        Args: {
          p_case_id: string
        }
        Returns: {
          document_id: string
          role: string
          evidence_kind: string | null
          page_count: number | null
          position: number
          sha256: string
          storage_path: string
          safe_filename: string
          mime_type: string
        }[]
      }
      approve_case_packet: {
        Args: {
          p_case_id: string
          p_packet_sha256: string
          p_manifest: Json
          p_response_pages: number
          p_supporting_pages: number
          p_recipient: Json
          p_mail_class: string
          p_quote: Json
        }
        Returns: Database["public"]["Tables"]["case_approvals"]["Row"]
      }
      claim_secure_documents_for_scan: {
        Args: {
          batch_limit?: number
        }
        Returns: Database["public"]["Tables"]["secure_documents"]["Row"][]
      }
      claim_secure_documents_for_deletion: {
        Args: {
          batch_limit?: number
        }
        Returns: Database["public"]["Tables"]["secure_documents"]["Row"][]
      }
      request_secure_document_deletion: {
        Args: {
          document_id: string
        }
        Returns: boolean
      }
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
