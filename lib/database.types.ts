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
          name: string | null
          date_booked: string | null
          demo_date: string | null
          demo_time: string | null
          email_sent: boolean
          call_made: boolean
          showed: 'Yes' | 'No' | 'Pending'
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name?: string | null
          date_booked?: string | null
          demo_date?: string | null
          demo_time?: string | null
          email_sent?: boolean
          call_made?: boolean
          showed?: 'Yes' | 'No' | 'Pending'
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          date_booked?: string | null
          demo_date?: string | null
          demo_time?: string | null
          email_sent?: boolean
          call_made?: boolean
          showed?: 'Yes' | 'No' | 'Pending'
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          role: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          role?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          role?: string | null
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