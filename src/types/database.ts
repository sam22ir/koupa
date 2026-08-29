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
      activity_logs: {
        Row: {
          action: string
          actor_id: string
          affected_barber_id: string | null
          created_at: string
          details: Json
          id: string
          shop_id: string
        }
        Insert: {
          action: string
          actor_id: string
          affected_barber_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          shop_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          affected_barber_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_affected_barber_id_fkey"
            columns: ["affected_barber_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_attendance_events: {
        Row: {
          appointment_id: string
          checked_in_at: string
          checked_in_by: string
          id: string
          reversed_at: string | null
          reversed_by: string | null
          source: string
        }
        Insert: {
          appointment_id: string
          checked_in_at?: string
          checked_in_by: string
          id?: string
          reversed_at?: string | null
          reversed_by?: string | null
          source: string
        }
        Update: {
          appointment_id?: string
          checked_in_at?: string
          checked_in_by?: string
          id?: string
          reversed_at?: string | null
          reversed_by?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_attendance_events_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_attendance_events_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_attendance_events_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          barber_id: string
          cancelled_at: string | null
          created_at: string
          customer_id: string
          ends_at: string
          id: string
          price_dzd: number
          qr_checked_in_at: string | null
          service_id: string
          shop_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          barber_id: string
          cancelled_at?: string | null
          created_at?: string
          customer_id: string
          ends_at: string
          id?: string
          price_dzd: number
          qr_checked_in_at?: string | null
          service_id: string
          shop_id?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          barber_id?: string
          cancelled_at?: string | null
          created_at?: string
          customer_id?: string
          ends_at?: string
          id?: string
          price_dzd?: number
          qr_checked_in_at?: string | null
          service_id?: string
          shop_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      device_push_tokens: {
        Row: {
          created_at: string
          environment: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          environment: string
          id?: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          environment?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      legal_acceptances: {
        Row: {
          accepted_at: string
          document_key: string
          document_version: string
          user_id: string
        }
        Insert: {
          accepted_at?: string
          document_key: string
          document_version: string
          user_id: string
        }
        Update: {
          accepted_at?: string
          document_key?: string
          document_version?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_acceptances_document_version_fkey"
            columns: ["document_key", "document_version"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["key", "version"]
          },
        ]
      }
      legal_documents: {
        Row: {
          is_active: boolean
          key: string
          published_at: string
          url: string
          version: string
        }
        Insert: {
          is_active?: boolean
          key: string
          published_at?: string
          url: string
          version: string
        }
        Update: {
          is_active?: boolean
          key?: string
          published_at?: string
          url?: string
          version?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          appointment_id: string | null
          body: string
          created_at: string
          destination: Json
          id: string
          push_delivered_at: string | null
          push_delivery_error: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          appointment_id?: string | null
          body: string
          created_at?: string
          destination?: Json
          id?: string
          push_delivered_at?: string | null
          push_delivery_error?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          appointment_id?: string | null
          body?: string
          created_at?: string
          destination?: Json
          id?: string
          push_delivered_at?: string | null
          push_delivery_error?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_drafts: {
        Row: {
          data: Json
          role: Database["public"]["Enums"]["app_role"]
          step: number
          updated_at: string
          user_id: string
        }
        Insert: {
          data?: Json
          role: Database["public"]["Enums"]["app_role"]
          step?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          role?: Database["public"]["Enums"]["app_role"]
          step?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bio: string | null
          booking_window_days: number
          city: string | null
          created_at: string
          id: string
          is_booking_paused: boolean
          is_published: boolean
          latitude: number | null
          locale: string
          longitude: number | null
          maps_url: string | null
          minimum_notice_minutes: number
          name: string
          neighborhood: string | null
          phone: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          workplace_type: string
        }
        Insert: {
          bio?: string | null
          booking_window_days?: number
          city?: string | null
          created_at?: string
          id: string
          is_booking_paused?: boolean
          is_published?: boolean
          latitude?: number | null
          locale?: string
          longitude?: number | null
          maps_url?: string | null
          minimum_notice_minutes?: number
          name: string
          neighborhood?: string | null
          phone: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          workplace_type?: string
        }
        Update: {
          bio?: string | null
          booking_window_days?: number
          city?: string | null
          created_at?: string
          id?: string
          is_booking_paused?: boolean
          is_published?: boolean
          latitude?: number | null
          locale?: string
          longitude?: number | null
          maps_url?: string | null
          minimum_notice_minutes?: number
          name?: string
          neighborhood?: string | null
          phone?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          workplace_type?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          appointment_id: string
          barber_id: string
          created_at: string
          customer_id: string
          id: string
          stars: number
          updated_at: string
        }
        Insert: {
          appointment_id: string
          barber_id: string
          created_at?: string
          customer_id: string
          id?: string
          stars: number
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          barber_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          stars?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_breaks: {
        Row: {
          ends_at: string
          id: string
          schedule_id: string
          starts_at: string
        }
        Insert: {
          ends_at: string
          id?: string
          schedule_id: string
          starts_at: string
        }
        Update: {
          ends_at?: string
          id?: string
          schedule_id?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_breaks_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "weekly_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_exceptions: {
        Row: {
          barber_id: string
          ends_at: string | null
          exception_date: string
          id: string
          is_closed: boolean
          note: string | null
          starts_at: string | null
        }
        Insert: {
          barber_id: string
          ends_at?: string | null
          exception_date: string
          id?: string
          is_closed?: boolean
          note?: string | null
          starts_at?: string | null
        }
        Update: {
          barber_id?: string
          ends_at?: string | null
          exception_date?: string
          id?: string
          is_closed?: boolean
          note?: string | null
          starts_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_exceptions_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          barber_id: string
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          price_dzd: number
          updated_at: string
        }
        Insert: {
          barber_id: string
          created_at?: string
          description?: string | null
          duration_minutes: number
          id?: string
          is_active?: boolean
          name: string
          price_dzd: number
          updated_at?: string
        }
        Update: {
          barber_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          price_dzd?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_memberships: {
        Row: {
          barber_id: string
          created_at: string
          decision_reason: string | null
          id: string
          invitation_expires_at: string | null
          invited_by: string | null
          shop_id: string
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
        }
        Insert: {
          barber_id: string
          created_at?: string
          decision_reason?: string | null
          id?: string
          invitation_expires_at?: string | null
          invited_by?: string | null
          shop_id: string
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
        }
        Update: {
          barber_id?: string
          created_at?: string
          decision_reason?: string | null
          id?: string
          invitation_expires_at?: string | null
          invited_by?: string | null
          shop_id?: string
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_memberships_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_memberships_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          average_rating: number
          bio: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          maps_url: string | null
          name: string
          owner_id: string
          rating_count: number
          updated_at: string
        }
        Insert: {
          average_rating?: number
          bio?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          maps_url?: string | null
          name: string
          owner_id: string
          rating_count?: number
          updated_at?: string
        }
        Update: {
          average_rating?: number
          bio?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          maps_url?: string | null
          name?: string
          owner_id?: string
          rating_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shops_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_schedules: {
        Row: {
          barber_id: string
          day_of_week: number
          ends_at: string
          id: string
          interval_minutes: number
          starts_at: string
        }
        Insert: {
          barber_id: string
          day_of_week: number
          ends_at: string
          id?: string
          interval_minutes: number
          starts_at: string
        }
        Update: {
          barber_id?: string
          day_of_week?: number
          ends_at?: string
          id?: string
          interval_minutes?: number
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_schedules_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_barber_settings_payload: {
        Args: { settings: Json; target_barber_id: string }
        Returns: undefined
      }
      auto_complete_present_appointments: { Args: never; Returns: undefined }
      available_booking_slots: {
        Args: { barber_id: string; local_date: string; service_id: string }
        Returns: {
          ends_at: string
          starts_at: string
        }[]
      }
      barber_appointment_event: {
        Args: { target_appointment_id: string }
        Returns: {
          customer_name: string
          customer_phone: string
          ends_at: string
          id: string
          price_dzd: number
          service_name: string
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
        }[]
      }
      barber_shop_id: { Args: { target_barber_id: string }; Returns: string }
      barber_today_appointments: {
        Args: never
        Returns: {
          customer_name: string
          customer_phone: string
          ends_at: string
          id: string
          price_dzd: number
          qr_check_in_reversible: boolean
          service_name: string
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
        }[]
      }
      book_appointment: {
        Args: { barber_id: string; service_id: string; starts_at_value: string }
        Returns: string
      }
      booking_slot_is_available: {
        Args: {
          barber_id: string
          excluded_appointment_id?: string
          service_id: string
          starts_at_value: string
        }
        Returns: boolean
      }
      cancel_barber_appointment: {
        Args: { appointment_id: string }
        Returns: undefined
      }
      cancel_customer_appointment: {
        Args: { appointment_id: string }
        Returns: undefined
      }
      check_in_with_barber_qr: {
        Args: { target_barber_id: string }
        Returns: Json
      }
      create_shop: {
        Args: {
          shop_bio?: string
          shop_latitude?: number
          shop_longitude?: number
          shop_maps_url?: string
          shop_name: string
        }
        Returns: string
      }
      delete_own_account: { Args: never; Returns: undefined }
      delete_owned_shop: { Args: never; Returns: undefined }
      get_public_barber_profile: {
        Args: { barber_id: string }
        Returns: {
          average_rating: number
          bio: string
          booking_window_days: number
          city: string
          id: string
          maps_url: string
          name: string
          neighborhood: string
          phone: string
          rating_count: number
          services: Json
          shop: Json
          weekly_hours: Json
        }[]
      }
      get_public_shop_profile: {
        Args: { target_shop_id: string }
        Returns: {
          average_rating: number
          barbers: Json
          bio: string
          id: string
          maps_url: string
          name: string
          owner_name: string
          rating_count: number
        }[]
      }
      get_public_shop_profile_v2: {
        Args: { target_shop_id: string }
        Returns: {
          average_rating: number
          barbers: Json
          bio: string
          city: string
          id: string
          maps_url: string
          name: string
          neighborhood: string
          owner_name: string
          rating_count: number
        }[]
      }
      insert_booking_notification: {
        Args: {
          appointment_id_value: string
          body_value: string
          recipient_id: string
          title_value: string
        }
        Returns: undefined
      }
      insert_notification: {
        Args: {
          appointment_id_value?: string
          body_value: string
          destination_value?: Json
          recipient_id: string
          title_value: string
        }
        Returns: undefined
      }
      invite_barber_to_shop: {
        Args: { target_barber_id: string; target_shop_id: string }
        Returns: string
      }
      is_bookable_published_barber: {
        Args: { target_barber_id: string }
        Returns: boolean
      }
      is_independent_published_barber: {
        Args: { barber_id: string }
        Returns: boolean
      }
      leave_shop: { Args: never; Returns: undefined }
      mark_appointment_present: {
        Args: { appointment_id: string }
        Returns: string
      }
      mark_expired_bookings_absent: { Args: never; Returns: undefined }
      mark_notifications_read: {
        Args: { notification_ids?: string[] }
        Returns: number
      }
      normalize_booking_search: { Args: { value: string }; Returns: string }
      publish_barber_profile: { Args: { payload: Json }; Returns: undefined }
      rate_appointment: {
        Args: { stars_value: number; target_appointment_id: string }
        Returns: string
      }
      remove_shop_member: {
        Args: { target_membership_id: string }
        Returns: undefined
      }
      replace_barber_settings: { Args: { settings: Json }; Returns: undefined }
      replace_barber_workspace_settings: {
        Args: { workspace: Json }
        Returns: undefined
      }
      replace_future_barber_schedule_exceptions: {
        Args: { exceptions: Json; target_barber_id: string }
        Returns: undefined
      }
      request_join_shop: { Args: { target_shop_id: string }; Returns: string }
      reschedule_appointment: {
        Args: {
          appointment_id: string
          service_id: string
          starts_at_value: string
        }
        Returns: string
      }
      respond_shop_invitation: {
        Args: { accept: boolean; target_membership_id: string }
        Returns: string
      }
      respond_shop_membership: {
        Args: { accept: boolean; target_membership_id: string }
        Returns: string
      }
      search_nearby_shops: {
        Args: {
          origin_latitude: number
          origin_longitude: number
          page_number?: number
          radius_km?: number
          search_query?: string
        }
        Returns: {
          average_rating: number
          bio: string
          city: string
          distance_km: number
          id: string
          latitude: number
          longitude: number
          maps_url: string
          name: string
          neighborhood: string
          owner_name: string
          rating_count: number
        }[]
      }
      search_published_barbers: {
        Args: {
          city_query?: string
          page_number?: number
          search_query?: string
        }
        Returns: {
          average_rating: number
          bio: string
          city: string
          id: string
          maps_url: string
          name: string
          neighborhood: string
          phone: string
          rating_count: number
          service_count: number
          starting_price_dzd: number
        }[]
      }
      search_published_shops: {
        Args: { page_number?: number; search_query?: string }
        Returns: {
          average_rating: number
          bio: string
          id: string
          maps_url: string
          name: string
          owner_name: string
          rating_count: number
        }[]
      }
      search_published_shops_v2: {
        Args: { page_number?: number; search_query?: string }
        Returns: {
          average_rating: number
          bio: string
          city: string
          id: string
          maps_url: string
          name: string
          neighborhood: string
          owner_name: string
          rating_count: number
        }[]
      }
      shop_activity_history: {
        Args: { target_shop_id: string }
        Returns: {
          action: string
          actor_name: string
          affected_barber_name: string
          created_at: string
          id: string
        }[]
      }
      shop_effective_latitude: {
        Args: {
          explicit_shop_latitude: number
          owner_latitude: number
          owner_maps_url: string
          shop_maps_url: string
        }
        Returns: number
      }
      shop_effective_longitude: {
        Args: {
          explicit_shop_longitude: number
          owner_longitude: number
          owner_maps_url: string
          shop_maps_url: string
        }
        Returns: number
      }
      shop_owner_barber_settings: {
        Args: { target_barber_id: string }
        Returns: Json
      }
      shop_owner_barber_workspace: {
        Args: { target_barber_id: string }
        Returns: Json
      }
      shop_owner_members: {
        Args: { target_shop_id: string }
        Returns: {
          barber_id: string
          barber_name: string
          barber_phone: string
          created_at: string
          id: string
          invitation_expires_at: string
          invited_by: string
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
        }[]
      }
      shop_owner_replace_barber_workspace: {
        Args: { target_barber_id: string; workspace: Json }
        Returns: undefined
      }
      shop_owner_update_barber_settings: {
        Args: { settings: Json; target_barber_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      transition_overdue_appointments: {
        Args: never
        Returns: {
          absent_count: number
          completed_count: number
        }[]
      }
      undo_qr_check_in: {
        Args: { target_appointment_id: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "customer" | "barber"
      appointment_status:
        | "booked"
        | "present"
        | "completed"
        | "absent"
        | "cancelled"
      membership_status: "pending" | "active" | "rejected"
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
      app_role: ["customer", "barber"],
      appointment_status: [
        "booked",
        "present",
        "completed",
        "absent",
        "cancelled",
      ],
      membership_status: ["pending", "active", "rejected"],
    },
  },
} as const
