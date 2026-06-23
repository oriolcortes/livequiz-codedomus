export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          role: "free" | "trusted" | "owner";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          role?: "free" | "trusted" | "owner";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string | null;
          display_name?: string | null;
          role?: "free" | "trusted" | "owner";
          updated_at?: string;
        };
        Relationships: [];
      };
      rooms: {
        Row: {
          id: string;
          code: string;
          host_id: string;
          status: "active" | "ended" | "expired";
          max_students: number;
          max_questions: number;
          estimated_messages: number;
          created_at: string;
          expires_at: string;
          ended_at: string | null;
        };
        Insert: {
          id?: string;
          code: string;
          host_id: string;
          status?: "active" | "ended" | "expired";
          max_students: number;
          max_questions: number;
          estimated_messages: number;
          created_at?: string;
          expires_at: string;
          ended_at?: string | null;
        };
        Update: {
          status?: "active" | "ended" | "expired";
          ended_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      app_role: "free" | "trusted" | "owner";
      room_status: "active" | "ended" | "expired";
    };
    CompositeTypes: {};
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Room = Database["public"]["Tables"]["rooms"]["Row"];
