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
          id: number
          name: string
          date_booked: string
          demo_date: string
          demo_time: string
          email_sent: boolean
          call_made: boolean
          showed: 'Yes' | 'No' | 'Pending'
          position: number
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: number
          name: string
          date_booked: string
          demo_date: string
          demo_time: string
          email_sent?: boolean
          call_made?: boolean
          showed?: 'Yes' | 'No' | 'Pending'
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          date_booked?: string
          demo_date?: string
          demo_time?: string
          email_sent?: boolean
          call_made?: boolean
          showed?: 'Yes' | 'No' | 'Pending'
          position?: number
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
          full_name?: string
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