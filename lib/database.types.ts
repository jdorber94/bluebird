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
      demos: {
        Row: {
          id: string
          user_id: string
          name: string
          date_booked: string
          demo_date: string
          demo_time: string
          email_sent: boolean
          email_sent_date: string | null
          call_made: boolean
          call_made_date: string | null
          showed: 'Yes' | 'No' | 'Pending'
          status: 'Accepted' | 'Pending' | 'Cancelled' | 'Rebooked'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          date_booked: string
          demo_date: string
          demo_time: string
          email_sent?: boolean
          email_sent_date?: string | null
          call_made?: boolean
          call_made_date?: string | null
          showed?: 'Yes' | 'No' | 'Pending'
          status?: 'Accepted' | 'Pending' | 'Cancelled' | 'Rebooked'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          date_booked?: string
          demo_date?: string
          demo_time?: string
          email_sent?: boolean
          email_sent_date?: string | null
          call_made?: boolean
          call_made_date?: string | null
          showed?: 'Yes' | 'No' | 'Pending'
          status?: 'Accepted' | 'Pending' | 'Cancelled' | 'Rebooked'
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_type: 'free' | 'pro' | 'enterprise'
          status: 'active' | 'cancelled' | 'expired'
          current_period_start: string
          current_period_end: string
          cancel_at_period_end: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_type: 'free' | 'pro' | 'enterprise'
          status: 'active' | 'cancelled' | 'expired'
          current_period_start: string
          current_period_end: string
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_type?: 'free' | 'pro' | 'enterprise'
          status?: 'active' | 'cancelled' | 'expired'
          current_period_start?: string
          current_period_end?: string
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
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
  }
} 