export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          access_token: string | null
          expires_at: number | null
          id: string
          id_token: string | null
          provider: string
          provider_account_id: string
          refresh_token: string | null
          scope: string | null
          session_state: string | null
          token_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          expires_at?: number | null
          id: string
          id_token?: string | null
          provider: string
          provider_account_id: string
          refresh_token?: string | null
          scope?: string | null
          session_state?: string | null
          token_type?: string | null
          type: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          expires_at?: number | null
          id?: string
          id_token?: string | null
          provider?: string
          provider_account_id?: string
          refresh_token?: string | null
          scope?: string | null
          session_state?: string | null
          token_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: number
          parent_id: number | null
          post_id: number | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: number
          parent_id?: number | null
          post_id?: number | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: number
          parent_id?: number | null
          post_id?: number | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string | null
          id: number
          post_id: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          post_id: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          post_id?: number
          user_id?: string | null
        }
        Relationships: []
      }
      keyword_search_history: {
        Row: {
          created_at: string | null
          id: number
          result_count: number | null
          search_keyword: string
          search_type: string | null
          user_id: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          result_count?: number | null
          search_keyword: string
          search_type?: string | null
          user_id?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          result_count?: number | null
          search_keyword?: string
          search_type?: string | null
          user_id?: number | null
        }
        Relationships: []
      }
      keywords: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: number
          is_featured: boolean | null
          keyword: string
          keyword_type: string | null
          parent_id: number | null
          post_count: number | null
          search_count: number | null
          slug: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: number
          is_featured?: boolean | null
          keyword: string
          keyword_type?: string | null
          parent_id?: number | null
          post_count?: number | null
          search_count?: number | null
          slug: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: number
          is_featured?: boolean | null
          keyword?: string
          keyword_type?: string | null
          parent_id?: number | null
          post_count?: number | null
          search_count?: number | null
          slug?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "keywords_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "keywords"
            referencedColumns: ["id"]
          },
        ]
      }
      like_counts: {
        Row: {
          like_count: number | null
          like_type: string | null
          target_id: number
          updated_at: string | null
        }
        Insert: {
          like_count?: number | null
          like_type?: string | null
          target_id: number
          updated_at?: string | null
        }
        Update: {
          like_count?: number | null
          like_type?: string | null
          target_id?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string | null
          id: number
          like_type: string
          target_id: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          like_type: string
          target_id: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          like_type?: string
          target_id?: number
          user_id?: string | null
        }
        Relationships: []
      }
      points: {
        Row: {
          created_at: string | null
          id: number
          points: number
          reason: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          points: number
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          points?: number
          reason?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      posts: {
        Row: {
          auto_created: boolean | null
          content: string | null
          created_at: string | null
          id: number
          og_description: string | null
          og_image: string | null
          og_title: string | null
          source_url: string | null
          status: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          user_id: string | null
          view_count: number | null
        }
        Insert: {
          auto_created?: boolean | null
          content?: string | null
          created_at?: string | null
          id?: number
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          source_url?: string | null
          status?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
          view_count?: number | null
        }
        Update: {
          auto_created?: boolean | null
          content?: string | null
          created_at?: string | null
          id?: number
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          source_url?: string | null
          status?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          expires: string
          id: string
          session_token: string
          user_id: string
        }
        Insert: {
          expires: string
          id: string
          session_token: string
          user_id: string
        }
        Update: {
          expires?: string
          id?: string
          session_token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          birth_year: string | null
          child_count: number | null
          consecutive_limit: number | null
          created_at: string | null
          email: string | null
          email_subscription: number | null
          email_verified: string | null
          first_comment: number | null
          first_survey: number | null
          first_vote: number | null
          id: string
          image: string | null
          interest_categories: string | null
          is_banned: boolean | null
          job: string | null
          kana_mei: string | null
          kana_sei: string | null
          last_access_date: string | null
          line_access_token: string | null
          line_id: string | null
          line_refresh_token: string | null
          line_token_expires_at: string | null
          line_token_updated_at: string | null
          marriage: string | null
          mei: string | null
          name: string | null
          participate_points: number | null
          prefecture: string | null
          profile_registered: number | null
          profile_slug: string | null
          profile_slug_updated_at: string | null
          reset_token: string | null
          reset_token_expires: string | null
          sei: string | null
          sex: string | null
          show_unvoted_surveys: number | null
          sns_x: string | null
          status: number | null
          updated_at: string | null
          user_activation_key: string | null
          user_description: string | null
          user_nicename: string | null
          user_pass: string | null
          user_registered: string | null
          user_url: string | null
          warning_flag: number | null
          worker_img_id: number | null
          worker_img_url: string | null
          x_access_token: string | null
          x_profile_image: string | null
          x_refresh_token: string | null
          x_screen_name: string | null
          x_token_expires: string | null
          x_user_id: string | null
        }
        Insert: {
          birth_year?: string | null
          child_count?: number | null
          consecutive_limit?: number | null
          created_at?: string | null
          email?: string | null
          email_subscription?: number | null
          email_verified?: string | null
          first_comment?: number | null
          first_survey?: number | null
          first_vote?: number | null
          id: string
          image?: string | null
          interest_categories?: string | null
          is_banned?: boolean | null
          job?: string | null
          kana_mei?: string | null
          kana_sei?: string | null
          last_access_date?: string | null
          line_access_token?: string | null
          line_id?: string | null
          line_refresh_token?: string | null
          line_token_expires_at?: string | null
          line_token_updated_at?: string | null
          marriage?: string | null
          mei?: string | null
          name?: string | null
          participate_points?: number | null
          prefecture?: string | null
          profile_registered?: number | null
          profile_slug?: string | null
          profile_slug_updated_at?: string | null
          reset_token?: string | null
          reset_token_expires?: string | null
          sei?: string | null
          sex?: string | null
          show_unvoted_surveys?: number | null
          sns_x?: string | null
          status?: number | null
          updated_at?: string | null
          user_activation_key?: string | null
          user_description?: string | null
          user_nicename?: string | null
          user_pass?: string | null
          user_registered?: string | null
          user_url?: string | null
          warning_flag?: number | null
          worker_img_id?: number | null
          worker_img_url?: string | null
          x_access_token?: string | null
          x_profile_image?: string | null
          x_refresh_token?: string | null
          x_screen_name?: string | null
          x_token_expires?: string | null
          x_user_id?: string | null
        }
        Update: {
          birth_year?: string | null
          child_count?: number | null
          consecutive_limit?: number | null
          created_at?: string | null
          email?: string | null
          email_subscription?: number | null
          email_verified?: string | null
          first_comment?: number | null
          first_survey?: number | null
          first_vote?: number | null
          id?: string
          image?: string | null
          interest_categories?: string | null
          is_banned?: boolean | null
          job?: string | null
          kana_mei?: string | null
          kana_sei?: string | null
          last_access_date?: string | null
          line_access_token?: string | null
          line_id?: string | null
          line_refresh_token?: string | null
          line_token_expires_at?: string | null
          line_token_updated_at?: string | null
          marriage?: string | null
          mei?: string | null
          name?: string | null
          participate_points?: number | null
          prefecture?: string | null
          profile_registered?: number | null
          profile_slug?: string | null
          profile_slug_updated_at?: string | null
          reset_token?: string | null
          reset_token_expires?: string | null
          sei?: string | null
          sex?: string | null
          show_unvoted_surveys?: number | null
          sns_x?: string | null
          status?: number | null
          updated_at?: string | null
          user_activation_key?: string | null
          user_description?: string | null
          user_nicename?: string | null
          user_pass?: string | null
          user_registered?: string | null
          user_url?: string | null
          warning_flag?: number | null
          worker_img_id?: number | null
          worker_img_url?: string | null
          x_access_token?: string | null
          x_profile_image?: string | null
          x_refresh_token?: string | null
          x_screen_name?: string | null
          x_token_expires?: string | null
          x_user_id?: string | null
        }
        Relationships: []
      }
      verification_tokens: {
        Row: {
          expires: string
          identifier: string
          token: string
        }
        Insert: {
          expires: string
          identifier: string
          token: string
        }
        Update: {
          expires?: string
          identifier?: string
          token?: string
        }
        Relationships: []
      }
      vote_choices: {
        Row: {
          choice: string
          id: number
          post_id: number | null
          vote_count: number | null
        }
        Insert: {
          choice: string
          id: number
          post_id?: number | null
          vote_count?: number | null
        }
        Update: {
          choice?: string
          id?: number
          post_id?: number | null
          vote_count?: number | null
        }
        Relationships: []
      }
      vote_history: {
        Row: {
          choice_id: number | null
          created_at: string | null
          id: number
          ip_address: unknown
          post_id: number | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          choice_id?: number | null
          created_at?: string | null
          id?: number
          ip_address?: unknown
          post_id?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          choice_id?: number | null
          created_at?: string | null
          id?: number
          ip_address?: unknown
          post_id?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vote_history_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      vote_options: {
        Row: {
          close_at: string | null
          created_at: string | null
          id: number
          multi: boolean | null
          post_id: number | null
          random: boolean | null
          vote_sum: number | null
        }
        Insert: {
          close_at?: string | null
          created_at?: string | null
          id?: number
          multi?: boolean | null
          post_id?: number | null
          random?: boolean | null
          vote_sum?: number | null
        }
        Update: {
          close_at?: string | null
          created_at?: string | null
          id?: number
          multi?: boolean | null
          post_id?: number | null
          random?: boolean | null
          vote_sum?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vote_options_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          content: string | null
          created_at: string | null
          guest_check: boolean | null
          id: number
          status: string | null
          title: string
          updated_at: string | null
          user_id: number | null
          vote_budget: number | null
          vote_per_price: number | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          guest_check?: boolean | null
          id?: number
          status?: string | null
          title: string
          updated_at?: string | null
          user_id?: number | null
          vote_budget?: number | null
          vote_per_price?: number | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          guest_check?: boolean | null
          id?: number
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: number | null
          vote_budget?: number | null
          vote_per_price?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

