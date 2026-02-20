
// src/lib/database.types.ts
// This file should align with your 00_initial_schema.sql

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      gyms: {
        Row: {
          id: string // uuid, default gen_random_uuid()
          name: string // text
          owner_email: string | null // text, unique
          owner_user_id: string | null // uuid, unique, FK to auth.users.id (optional if not using Supabase auth for users)
          formatted_gym_id: string // text, unique. User-friendly unique ID for the gym
          status: string // text, default 'active'
          created_at: string // timestamp with time zone, default now()
          payment_id: string | null
          app_email: string | null
          app_pass: string | null
          app_host: string | null
          from_email: string | null
          port: string | null
          session_time_hours: number | null
          max_capacity: number | null
        }
        Insert: {
          id?: string
          name: string
          owner_email?: string | null
          owner_user_id?: string | null
          formatted_gym_id: string
          status?: string
          created_at?: string
          payment_id?: string | null
          app_email?: string | null
          app_pass?: string | null
          app_host?: string | null
          from_email?: string | null
          port?: string | null
          session_time_hours?: number | null
          max_capacity?: number | null
        }
        Update: {
          id?: string
          name?: string
          owner_email?: string | null
          owner_user_id?: string | null
          formatted_gym_id?: string
          status?: string
          created_at?: string
          payment_id?: string | null
          app_email?: string | null
          app_pass?: string | null
          app_host?: string | null
          from_email?: string | null
          port?: string | null
          session_time_hours?: number | null
          max_capacity?: number | null
        }
        Relationships: [] // No direct FK to auth.users listed if not strictly enforced or used in RLS
      }
      plans: {
        Row: {
          id: string // uuid, default gen_random_uuid()
          gym_id: string // uuid, FK to gyms.id
          plan_id: string | null // text. User-defined unique identifier for the plan (unique per gym_id)
          plan_name: string // text. e.g., "Basic", "Premium"
          price: number // numeric, default 0
          duration_months: number | null // integer. e.g., 1, 3, 12
          is_active: boolean // boolean, default true
        }
        Insert: {
          id?: string
          gym_id: string // <<< gym_id is required on insert
          plan_id?: string | null
          plan_name: string
          price?: number
          duration_months?: number | null
          is_active?: boolean
        }
        Update: {
          id?: string
          gym_id?: string // <<< gym_id can be part of an update
          plan_id?: string | null
          plan_name?: string
          price?: number
          duration_months?: number | null
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "plans_gym_id_fkey"
            columns: ["gym_id"]
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          }
        ]
      }
      members: {
        Row: {
          id: string // uuid, default gen_random_uuid()
          gym_id: string // uuid, FK to gyms.id
          plan_id: string | null // uuid, FK to plans.id
          member_id: string // text. User-defined member ID, unique per gym
          name: string // text
          email: string | null // text
          membership_status: string // text, 'active' or 'expired'
          membership_type: string // text, stores the plan name at time of creation/update
          age: number | null // integer
          phone_number: string | null // text
          join_date: string | null // timestamp with time zone
          expiry_date: string | null // timestamp with time zone
          created_at: string // timestamp with time zone, default now()
          profile_url: string | null // text
        }
        Insert: {
          id?: string
          gym_id: string
          plan_id?: string | null
          member_id: string
          name: string
          email?: string | null
          membership_status: string // 'active' or 'expired'
          membership_type: string // text, stores the plan name
          age?: number | null
          phone_number?: string | null
          join_date?: string | null
          expiry_date?: string | null
          created_at?: string
          profile_url?: string | null
        }
        Update: {
          id?: string
          gym_id?: string
          plan_id?: string | null
          member_id?: string
          name?: string
          email?: string | null
          membership_status?: string
          membership_type?: string // text, stores the plan name
          age?: number | null
          phone_number?: string | null
          join_date?: string | null
          expiry_date?: string | null
          created_at?: string
          profile_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_gym_id_fkey"
            columns: ["gym_id"]
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_plan_id_fkey"
            columns: ["plan_id"]
            referencedRelation: "plans"
            referencedColumns: ["id"]
          }
        ]
      }
      check_ins: {
        Row: {
          id: string // uuid, default gen_random_uuid()
          gym_id: string // uuid, FK to gyms.id
          member_table_id: string // uuid, FK to members.id.
          check_in_time: string // timestamp with time zone, default now()
          check_out_time: string | null // timestamp with time zone
          created_at: string // timestamp with time zone, default now()
        }
        Insert: {
          id?: string
          gym_id: string
          member_table_id: string
          check_in_time?: string
          check_out_time?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          gym_id?: string
          member_table_id?: string
          check_in_time?: string
          check_out_time?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_gym_id_fkey"
            columns: ["gym_id"]
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_member_table_id_fkey"
            columns: ["member_table_id"]
            referencedRelation: "members"
            referencedColumns: ["id"]
          }
        ]
      }
      announcements: {
        Row: {
          id: string // uuid, default gen_random_uuid()
          gym_id: string // uuid, FK to gyms.id. The UUID of the gym
          formatted_gym_id: string // text. The user-friendly formatted ID of the gym
          title: string // text
          content: string | null // text
          created_at: string // timestamp with time zone, default now()
        }
        Insert: {
          id?: string
          gym_id: string
          formatted_gym_id: string
          title: string
          content?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          gym_id?: string
          formatted_gym_id?: string
          title?: string
          content?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_gym_id_fkey"
            columns: ["gym_id"]
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          }
        ]
      }
      messages: {
        Row: {
          id: string // uuid
          gym_id: string // uuid
          formatted_gym_id: string | null
          sender_id: string // TEXT (stores formatted_gym_id if admin, or human-readable members.member_id if member)
          receiver_id: string // TEXT (stores human-readable members.member_id if member, or formatted_gym_id if admin)
          sender_type: string // text, 'admin' or 'member'
          receiver_type: string // text, 'admin' or 'member'
          content: string // text
          created_at: string // timestamp with time zone
          read_at: string | null // timestamp with time zone
        }
        Insert: {
          id?: string
          gym_id: string
          formatted_gym_id?: string | null
          sender_id: string // TEXT
          receiver_id: string // TEXT
          sender_type: string
          receiver_type: string
          content: string
          created_at?: string
          read_at?: string | null
        }
        Update: {
          id?: string
          gym_id?: string
          formatted_gym_id?: string | null
          sender_id?: string // TEXT
          receiver_id?: string // TEXT
          sender_type?: string
          receiver_type?: string
          content?: string
          created_at?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_gym_id_fkey"
            columns: ["gym_id"]
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          }
        ]
      }
      super_admins: {
        Row: {
          id: string // uuid, default gen_random_uuid()
          email: string // text, unique
          password_hash: string // text. Store hashed passwords securely
          created_at: string // timestamp with time zone, default now()
          updated_at: string | null // timestamp with time zone, default now()
          smtp_username: string | null
          smtp_pass: string | null
          smtp_host: string | null
          smtp_from: string | null
          smtp_port: string | null
        }
        Insert: {
          id?: string
          email: string
          password_hash: string
          created_at?: string
          updated_at?: string | null
          smtp_username?: string | null
          smtp_pass?: string | null
          smtp_host?: string | null
          smtp_from?: string | null
          smtp_port?: string | null
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string
          created_at?: string
          updated_at?: string | null
          smtp_username?: string | null
          smtp_pass?: string | null
          smtp_host?: string | null
          smtp_from?: string | null
          smtp_port?: string | null
        }
        Relationships: []
      }
      gym_requests: {
        Row: {
          id: string; // uuid
          gym_name: string;
          owner_name: string;
          email: string;
          phone: string;
          city: string;
          status: string; // e.g., 'pending', 'approved', 'rejected'
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_name: string;
          owner_name: string;
          email: string;
          phone: string;
          city: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          gym_name?: string;
          owner_name?: string;
          email?: string;
          phone?: string;
          city?: string;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never // No custom SQL helper functions defined here
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
