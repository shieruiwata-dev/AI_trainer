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
      ai_conversations: {
        Row: {
          created_at: string
          dify_conversation_id: string
          id: string
          last_used_at: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dify_conversation_id: string
          id?: string
          last_used_at?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dify_conversation_id?: string
          id?: string
          last_used_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string
          dify_message_id: string | null
          id: string
          intent: string | null
          metadata: Json
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string
          dify_message_id?: string | null
          id?: string
          intent?: string | null
          metadata?: Json
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          dify_message_id?: string | null
          id?: string
          intent?: string | null
          metadata?: Json
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      body_measurements: {
        Row: {
          bmr_kcal: number | null
          body_fat_percent: number | null
          body_fat_percentage: number | null
          body_weight_kg: number | null
          created_at: string
          id: string
          lean_mass_kg: number | null
          measured_at: string
          metadata: Json
          muscle_mass_kg: number | null
          note: string | null
          provider: string
          provider_sample_id: string | null
          standing_heart_rate_bpm: number | null
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          bmr_kcal?: number | null
          body_fat_percent?: number | null
          body_fat_percentage?: number | null
          body_weight_kg?: number | null
          created_at?: string
          id?: string
          lean_mass_kg?: number | null
          measured_at: string
          metadata?: Json
          muscle_mass_kg?: number | null
          note?: string | null
          provider?: string
          provider_sample_id?: string | null
          standing_heart_rate_bpm?: number | null
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          bmr_kcal?: number | null
          body_fat_percent?: number | null
          body_fat_percentage?: number | null
          body_weight_kg?: number | null
          created_at?: string
          id?: string
          lean_mass_kg?: number | null
          measured_at?: string
          metadata?: Json
          muscle_mass_kg?: number | null
          note?: string | null
          provider?: string
          provider_sample_id?: string | null
          standing_heart_rate_bpm?: number | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      external_connections: {
        Row: {
          access_token_encrypted: string | null
          created_at: string
          id: string
          last_synced_at: string | null
          metadata: Json
          provider: string
          provider_user_id: string | null
          refresh_token_encrypted: string | null
          scopes: string[]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_encrypted?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          metadata?: Json
          provider: string
          provider_user_id?: string | null
          refresh_token_encrypted?: string | null
          scopes?: string[]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_encrypted?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          metadata?: Json
          provider?: string
          provider_user_id?: string | null
          refresh_token_encrypted?: string | null
          scopes?: string[]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goal_checkins: {
        Row: {
          adherence_score: number | null
          checkin_date: string
          created_at: string
          goal_id: string
          id: string
          progress_status: string
          recommended_changes: Json
          summary: string
          updated_at: string
          user_id: string
        }
        Insert: {
          adherence_score?: number | null
          checkin_date?: string
          created_at?: string
          goal_id: string
          id?: string
          progress_status?: string
          recommended_changes?: Json
          summary: string
          updated_at?: string
          user_id: string
        }
        Update: {
          adherence_score?: number | null
          checkin_date?: string
          created_at?: string
          goal_id?: string
          id?: string
          progress_status?: string
          recommended_changes?: Json
          summary?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_checkins_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_kpis: {
        Row: {
          created_at: string
          details: Json
          goal_id: string
          id: string
          is_active: boolean
          kpi_type: string
          period: string
          target_value: number | null
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json
          goal_id: string
          id?: string
          is_active?: boolean
          kpi_type: string
          period: string
          target_value?: number | null
          unit: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json
          goal_id?: string
          id?: string
          is_active?: boolean
          kpi_type?: string
          period?: string
          target_value?: number | null
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_kpis_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          calculation_version: string
          created_at: string
          created_by: string
          difficulty: string
          goal_type: string
          id: string
          is_active: boolean
          notes: string | null
          purpose_type: string | null
          start_date: string
          status: string
          target_calories: number | null
          target_carbs_g: number | null
          target_date: string | null
          target_fat_g: number | null
          target_metrics: Json
          target_protein_g: number | null
          target_weight_kg: number | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calculation_version?: string
          created_at?: string
          created_by?: string
          difficulty?: string
          goal_type: string
          id?: string
          is_active?: boolean
          notes?: string | null
          purpose_type?: string | null
          start_date?: string
          status?: string
          target_calories?: number | null
          target_carbs_g?: number | null
          target_date?: string | null
          target_fat_g?: number | null
          target_metrics?: Json
          target_protein_g?: number | null
          target_weight_kg?: number | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calculation_version?: string
          created_at?: string
          created_by?: string
          difficulty?: string
          goal_type?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          purpose_type?: string | null
          start_date?: string
          status?: string
          target_calories?: number | null
          target_carbs_g?: number | null
          target_date?: string | null
          target_fat_g?: number | null
          target_metrics?: Json
          target_protein_g?: number | null
          target_weight_kg?: number | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      health_samples: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          metadata: Json
          provider: string
          provider_sample_id: string | null
          sample_type: string
          source_device: string | null
          started_at: string
          unit: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          metadata?: Json
          provider: string
          provider_sample_id?: string | null
          sample_type: string
          source_device?: string | null
          started_at: string
          unit: string
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          metadata?: Json
          provider?: string
          provider_sample_id?: string | null
          sample_type?: string
          source_device?: string | null
          started_at?: string
          unit?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      meal_items: {
        Row: {
          amount: number | null
          calories: number | null
          carbs_g: number | null
          created_at: string
          fat_g: number | null
          id: string
          meal_id: string
          name: string
          protein_g: number | null
          unit: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          id?: string
          meal_id: string
          name: string
          protein_g?: number | null
          unit?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          id?: string
          meal_id?: string
          name?: string
          protein_g?: number | null
          unit?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_items_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_items_same_owner_fk"
            columns: ["meal_id", "user_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      meals: {
        Row: {
          calories: number
          carbs_g: number
          confidence: number | null
          created_at: string
          eaten_at: string
          estimation_note: string | null
          fat_g: number
          id: string
          image_path: string | null
          meal_type: string
          protein_g: number
          raw_text: string | null
          source_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calories: number
          carbs_g: number
          confidence?: number | null
          created_at?: string
          eaten_at: string
          estimation_note?: string | null
          fat_g: number
          id?: string
          image_path?: string | null
          meal_type?: string
          protein_g: number
          raw_text?: string | null
          source_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calories?: number
          carbs_g?: number
          confidence?: number | null
          created_at?: string
          eaten_at?: string
          estimation_note?: string | null
          fat_g?: number
          id?: string
          image_path?: string | null
          meal_type?: string
          protein_g?: number
          raw_text?: string | null
          source_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_contents: {
        Row: {
          content_key: string
          content_type: string
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          is_skippable: boolean
          sort_order: number
          status: string
          target_level: string
          target_type: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          content_key: string
          content_type?: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_skippable?: boolean
          sort_order?: number
          status?: string
          target_level: string
          target_type: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          content_key?: string
          content_type?: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_skippable?: boolean
          sort_order?: number
          status?: string
          target_level?: string
          target_type?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      pending_actions: {
        Row: {
          action_type: string
          created_at: string
          expires_at: string
          id: string
          payload: Json
          resolved_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          expires_at?: string
          id?: string
          payload: Json
          resolved_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          expires_at?: string
          id?: string
          payload?: Json
          resolved_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: string | null
          available_training_days: number | null
          birth_date: string | null
          body_fat_percent: number | null
          created_at: string
          current_weight_kg: number | null
          diet_strictness: string | null
          display_name: string | null
          experience_assessed_at: string | null
          food_logging_experience: string | null
          height_cm: number | null
          injury_notes: string | null
          nutrition_level: string
          onboarding_completed: boolean
          onboarding_completed_at: string | null
          onboarding_step: string
          pfc_knowledge: string | null
          sex_for_calculation: string | null
          trainer_style: string | null
          training_experience: string | null
          training_experience_months: number | null
          training_level: string
          training_load_management: string | null
          updated_at: string
          user_id: string
          weekly_training_days: number | null
        }
        Insert: {
          activity_level?: string | null
          available_training_days?: number | null
          birth_date?: string | null
          body_fat_percent?: number | null
          created_at?: string
          current_weight_kg?: number | null
          diet_strictness?: string | null
          display_name?: string | null
          experience_assessed_at?: string | null
          food_logging_experience?: string | null
          height_cm?: number | null
          injury_notes?: string | null
          nutrition_level?: string
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          onboarding_step?: string
          pfc_knowledge?: string | null
          sex_for_calculation?: string | null
          trainer_style?: string | null
          training_experience?: string | null
          training_experience_months?: number | null
          training_level?: string
          training_load_management?: string | null
          updated_at?: string
          user_id: string
          weekly_training_days?: number | null
        }
        Update: {
          activity_level?: string | null
          available_training_days?: number | null
          birth_date?: string | null
          body_fat_percent?: number | null
          created_at?: string
          current_weight_kg?: number | null
          diet_strictness?: string | null
          display_name?: string | null
          experience_assessed_at?: string | null
          food_logging_experience?: string | null
          height_cm?: number | null
          injury_notes?: string | null
          nutrition_level?: string
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          onboarding_step?: string
          pfc_knowledge?: string | null
          sex_for_calculation?: string | null
          trainer_style?: string | null
          training_experience?: string | null
          training_experience_months?: number | null
          training_level?: string
          training_load_management?: string | null
          updated_at?: string
          user_id?: string
          weekly_training_days?: number | null
        }
        Relationships: []
      }
      sync_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          metadata: Json
          provider: string
          records_inserted: number
          records_received: number
          records_skipped: number
          records_updated: number
          status: string
          sync_finished_at: string | null
          sync_started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json
          provider: string
          records_inserted?: number
          records_received?: number
          records_skipped?: number
          records_updated?: number
          status?: string
          sync_finished_at?: string | null
          sync_started_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json
          provider?: string
          records_inserted?: number
          records_received?: number
          records_skipped?: number
          records_updated?: number
          status?: string
          sync_finished_at?: string | null
          sync_started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trainer_settings: {
        Row: {
          created_at: string
          explanation_level: string
          trainer_name: string
          trainer_style: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          explanation_level?: string
          trainer_name?: string
          trainer_style?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          explanation_level?: string
          trainer_name?: string
          trainer_style?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_content_progress: {
        Row: {
          completed_at: string | null
          content_id: string
          created_at: string
          id: string
          progress_seconds: number
          skipped_at: string | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          content_id: string
          created_at?: string
          id?: string
          progress_seconds?: number
          skipped_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          content_id?: string
          created_at?: string
          id?: string
          progress_seconds?: number
          skipped_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_content_progress_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "onboarding_contents"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          active_energy_kcal: number | null
          activity_type: string | null
          avg_heart_rate_bpm: number | null
          condition_note: string | null
          created_at: string
          distance_m: number | null
          duration_seconds: number | null
          ended_at: string | null
          estimated_minutes: number | null
          focus_area: string | null
          id: string
          max_heart_rate_bpm: number | null
          plan_json: Json
          provider: string
          provider_workout_id: string | null
          raw_payload: Json
          started_at: string | null
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_energy_kcal?: number | null
          activity_type?: string | null
          avg_heart_rate_bpm?: number | null
          condition_note?: string | null
          created_at?: string
          distance_m?: number | null
          duration_seconds?: number | null
          ended_at?: string | null
          estimated_minutes?: number | null
          focus_area?: string | null
          id?: string
          max_heart_rate_bpm?: number | null
          plan_json?: Json
          provider?: string
          provider_workout_id?: string | null
          raw_payload?: Json
          started_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_energy_kcal?: number | null
          activity_type?: string | null
          avg_heart_rate_bpm?: number | null
          condition_note?: string | null
          created_at?: string
          distance_m?: number | null
          duration_seconds?: number | null
          ended_at?: string | null
          estimated_minutes?: number | null
          focus_area?: string | null
          id?: string
          max_heart_rate_bpm?: number | null
          plan_json?: Json
          provider?: string
          provider_workout_id?: string | null
          raw_payload?: Json
          started_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_sets: {
        Row: {
          actual_reps: number | null
          actual_weight_kg: number | null
          completed_at: string | null
          created_at: string
          exercise_name: string
          exercise_order: number
          id: string
          rpe: number | null
          session_id: string
          set_number: number
          target_reps: number | null
          target_weight_kg: number | null
          user_id: string
        }
        Insert: {
          actual_reps?: number | null
          actual_weight_kg?: number | null
          completed_at?: string | null
          created_at?: string
          exercise_name: string
          exercise_order: number
          id?: string
          rpe?: number | null
          session_id: string
          set_number: number
          target_reps?: number | null
          target_weight_kg?: number | null
          user_id: string
        }
        Update: {
          actual_reps?: number | null
          actual_weight_kg?: number | null
          completed_at?: string | null
          created_at?: string
          exercise_name?: string
          exercise_order?: number
          id?: string
          rpe?: number | null
          session_id?: string
          set_number?: number
          target_reps?: number | null
          target_weight_kg?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_same_owner_fk"
            columns: ["session_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "workout_sets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_goal_targets: {
        Args: { p_goal_type: string }
        Returns: {
          calculation_version: string
          target_calories: number
          target_carbs_g: number
          target_fat_g: number
          target_protein_g: number
        }[]
      }
      confirm_pending_action: {
        Args: { p_action_id: string; p_overrides?: Json }
        Returns: Json
      }
      get_daily_nutrition: {
        Args: { target_date?: string }
        Returns: {
          calories: number
          carbs_g: number
          fat_g: number
          protein_g: number
        }[]
      }
      get_weight_summary: {
        Args: never
        Returns: {
          average_7d_kg: number
          latest_weight_kg: number
          previous_7d_average_kg: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
