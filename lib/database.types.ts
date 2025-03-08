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
          company_name: string
          date_booked: string
          date_of_demo: string
          email_reminder: boolean
          phone_reminder: boolean
          status: string
          email_reminder_sent: boolean
          phone_reminder_sent: boolean
          attendees: { email: string; name: string }[] | null
          description: string | null
          location: string | null
          created_at: string
          updated_at: string | null
          position: number | null
        }
        Insert: {
          id?: string
          user_id: string
          company_name: string
          date_booked: string
          date_of_demo: string
          email_reminder?: boolean
          phone_reminder?: boolean
          status?: string
          email_reminder_sent?: boolean
          phone_reminder_sent?: boolean
          attendees?: { email: string; name: string }[] | null
          description?: string | null
          location?: string | null
          created_at?: string
          updated_at?: string | null
          position?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          company_name?: string
          date_booked?: string
          date_of_demo?: string
          email_reminder?: boolean
          phone_reminder?: boolean
          status?: string
          email_reminder_sent?: boolean
          phone_reminder_sent?: boolean
          attendees?: { email: string; name: string }[] | null
          description?: string | null
          location?: string | null
          created_at?: string
          updated_at?: string | null
          position?: number | null
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
      add_position_column_if_not_exists: {
        Args: Record<string, never>
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
} 