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
      api_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          setting_key: string
          setting_value: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          setting_key: string
          setting_value?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          setting_key?: string
          setting_value?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      auto_creator_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          executed_at: string | null
          execution_type: string | null
          id: number
          message: string | null
          post_id: number | null
          source_url: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          executed_at?: string | null
          execution_type?: string | null
          id?: number
          message?: string | null
          post_id?: number | null
          source_url?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          executed_at?: string | null
          execution_type?: string | null
          id?: number
          message?: string | null
          post_id?: number | null
          source_url?: string | null
          status?: string | null
        }
        Relationships: []
      }
      auto_creator_processed: {
        Row: {
          article_title: string | null
          article_url: string
          created_at: string | null
          id: number
          post_id: number | null
          source_url: string | null
        }
        Insert: {
          article_title?: string | null
          article_url: string
          created_at?: string | null
          id?: number
          post_id?: number | null
          source_url?: string | null
        }
        Update: {
          article_title?: string | null
          article_url?: string
          created_at?: string | null
          id?: number
          post_id?: number | null
          source_url?: string | null
        }
        Relationships: []
      }
      auto_creator_settings: {
        Row: {
          created_at: string | null
          id: number
          setting_key: string
          setting_value: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          setting_key: string
          setting_value?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          setting_key?: string
          setting_value?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      auto_tagger_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          execution_type: string | null
          id: number
          message: string | null
          post_id: number | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          execution_type?: string | null
          id?: number
          message?: string | null
          post_id?: number | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          execution_type?: string | null
          id?: number
          message?: string | null
          post_id?: number | null
          status?: string | null
        }
        Relationships: []
      }
      auto_voter_logs: {
        Row: {
          action_type: string | null
          created_at: string | null
          error_message: string | null
          execution_type: string | null
          id: number
          message: string | null
          post_id: number | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          action_type?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_type?: string | null
          id?: number
          message?: string | null
          post_id?: number | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_type?: string | null
          id?: number
          message?: string | null
          post_id?: number | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      auto_voter_settings: {
        Row: {
          created_at: string | null
          id: number
          setting_key: string
          setting_value: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          setting_key: string
          setting_value?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          setting_key?: string
          setting_value?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      backup_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          file_path: string | null
          file_size: number | null
          id: number
          message: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: number
          message?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: number
          message?: string | null
          status?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: number
          is_active: number | null
          is_featured: number | null
          name: string
          parent_id: number | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: number
          is_active?: number | null
          is_featured?: number | null
          name: string
          parent_id?: number | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: number
          is_active?: number | null
          is_featured?: number | null
          name?: string
          parent_id?: number | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
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
      mail_logs: {
        Row: {
          body: string
          created_at: string | null
          error_message: string | null
          from_email: string
          id: number
          sent_at: string | null
          status: string
          subject: string
          template_key: string | null
          to_email: string
        }
        Insert: {
          body: string
          created_at?: string | null
          error_message?: string | null
          from_email: string
          id?: number
          sent_at?: string | null
          status: string
          subject: string
          template_key?: string | null
          to_email: string
        }
        Update: {
          body?: string
          created_at?: string | null
          error_message?: string | null
          from_email?: string
          id?: number
          sent_at?: string | null
          status?: string
          subject?: string
          template_key?: string | null
          to_email?: string
        }
        Relationships: []
      }
      mail_settings: {
        Row: {
          created_at: string | null
          from_email: string
          from_name: string
          id: number
          is_active: boolean | null
          smtp_host: string
          smtp_pass: string
          smtp_port: number
          smtp_user: string
          updated_at: string | null
          use_ssl: boolean | null
        }
        Insert: {
          created_at?: string | null
          from_email: string
          from_name: string
          id?: number
          is_active?: boolean | null
          smtp_host: string
          smtp_pass: string
          smtp_port: number
          smtp_user: string
          updated_at?: string | null
          use_ssl?: boolean | null
        }
        Update: {
          created_at?: string | null
          from_email?: string
          from_name?: string
          id?: number
          is_active?: boolean | null
          smtp_host?: string
          smtp_pass?: string
          smtp_port?: number
          smtp_user?: string
          updated_at?: string | null
          use_ssl?: boolean | null
        }
        Relationships: []
      }
      mail_templates: {
        Row: {
          body: string
          created_at: string | null
          description: string | null
          id: number
          is_active: boolean | null
          subject: string
          template_key: string
          updated_at: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          subject: string
          template_key: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          subject?: string
          template_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ng_words: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          id: number
          is_active: number | null
          severity: string | null
          updated_at: string | null
          word: string
          word_type: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: number
          is_active?: number | null
          severity?: string | null
          updated_at?: string | null
          word: string
          word_type?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: number
          is_active?: number | null
          severity?: string | null
          updated_at?: string | null
          word?: string
          word_type?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: number
          is_read: boolean | null
          link: string | null
          message: string | null
          read_at: string | null
          title: string
          type: string
          user_id: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: number
        }
        Update: {
          created_at?: string | null
          id?: number
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: number
        }
        Relationships: []
      }
      point_settings: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: number
          is_active: boolean | null
          label: string
          point_type: string
          point_value: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: number
          is_active?: boolean | null
          label: string
          point_type: string
          point_value?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: number
          is_active?: boolean | null
          label?: string
          point_type?: string
          point_value?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      points: {
        Row: {
          amount: number | null
          created_at: string | null
          description: string | null
          id: number
          points: number
          reason: string | null
          related_id: number | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          description?: string | null
          id?: number
          points: number
          reason?: string | null
          related_id?: number | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          description?: string | null
          id?: number
          points?: number
          reason?: string | null
          related_id?: number | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      points_aggregate_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: number
          message: string | null
          status: string | null
          users_processed: number | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: number
          message?: string | null
          status?: string | null
          users_processed?: number | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: number
          message?: string | null
          status?: string | null
          users_processed?: number | null
        }
        Relationships: []
      }
      post_keywords: {
        Row: {
          created_at: string | null
          id: number
          keyword_id: number
          post_id: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          keyword_id: number
          post_id: number
        }
        Update: {
          created_at?: string | null
          id?: number
          keyword_id?: number
          post_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_keywords_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "keywords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_keywords_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          auto_created: boolean | null
          category_id: number | null
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
          total_votes: number | null
          updated_at: string | null
          user_id: string | null
          view_count: number | null
        }
        Insert: {
          auto_created?: boolean | null
          category_id?: number | null
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
          total_votes?: number | null
          updated_at?: string | null
          user_id?: string | null
          view_count?: number | null
        }
        Update: {
          auto_created?: boolean | null
          category_id?: number | null
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
          total_votes?: number | null
          updated_at?: string | null
          user_id?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
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
          birth_year: number | null
          child_count: number | null
          created_at: string | null
          email: string | null
          email_subscription: number | null
          email_verified: string | null
          id: string
          interest_categories: string | null
          is_banned: boolean | null
          job: string | null
          kana_mei: string | null
          kana_sei: string | null
          marriage: string | null
          mei: string | null
          name: string | null
          participate_points: number | null
          prefecture: string | null
          profile_registered: number | null
          profile_slug: string | null
          profile_slug_updated_at: string | null
          reset_token: string | null
          reset_token_expiry: string | null
          sei: string | null
          sex: string | null
          sns_x: string | null
          status: number | null
          updated_at: string | null
          user_description: string | null
          user_img_url: string | null
          user_nicename: string | null
          user_pass: string | null
        }
        Insert: {
          birth_year?: number | null
          child_count?: number | null
          created_at?: string | null
          email?: string | null
          email_subscription?: number | null
          email_verified?: string | null
          id: string
          interest_categories?: string | null
          is_banned?: boolean | null
          job?: string | null
          kana_mei?: string | null
          kana_sei?: string | null
          marriage?: string | null
          mei?: string | null
          name?: string | null
          participate_points?: number | null
          prefecture?: string | null
          profile_registered?: number | null
          profile_slug?: string | null
          profile_slug_updated_at?: string | null
          reset_token?: string | null
          reset_token_expiry?: string | null
          sei?: string | null
          sex?: string | null
          sns_x?: string | null
          status?: number | null
          updated_at?: string | null
          user_description?: string | null
          user_img_url?: string | null
          user_nicename?: string | null
          user_pass?: string | null
        }
        Update: {
          birth_year?: number | null
          child_count?: number | null
          created_at?: string | null
          email?: string | null
          email_subscription?: number | null
          email_verified?: string | null
          id?: string
          interest_categories?: string | null
          is_banned?: boolean | null
          job?: string | null
          kana_mei?: string | null
          kana_sei?: string | null
          marriage?: string | null
          mei?: string | null
          name?: string | null
          participate_points?: number | null
          prefecture?: string | null
          profile_registered?: number | null
          profile_slug?: string | null
          profile_slug_updated_at?: string | null
          reset_token?: string | null
          reset_token_expiry?: string | null
          sei?: string | null
          sex?: string | null
          sns_x?: string | null
          status?: number | null
          updated_at?: string | null
          user_description?: string | null
          user_img_url?: string | null
          user_nicename?: string | null
          user_pass?: string | null
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
          id?: number
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
        Relationships: []
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
        Relationships: []
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
      increment_vote_count: { Args: { choice_id: number }; Returns: undefined }
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

