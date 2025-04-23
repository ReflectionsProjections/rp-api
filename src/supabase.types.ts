export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export type Database = {
    graphql_public: {
        Tables: {
            [_ in never]: never;
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            graphql: {
                Args: {
                    operationName?: string;
                    query?: string;
                    variables?: Json;
                    extensions?: Json;
                };
                Returns: Json;
            };
        };
        Enums: {
            [_ in never]: never;
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
    public: {
        Tables: {
            attendee_attendance: {
                Row: {
                    events_attended: string[];
                    user_id: string;
                };
                Insert: {
                    events_attended?: string[];
                    user_id: string;
                };
                Update: {
                    events_attended?: string[];
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "attendee_attendance_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: true;
                        referencedRelation: "roles";
                        referencedColumns: ["user_id"];
                    },
                ];
            };
            attendees: {
                Row: {
                    favorite_events: string[];
                    has_priority_fri: boolean;
                    has_priority_mon: boolean;
                    has_priority_sat: boolean;
                    has_priority_sun: boolean;
                    has_priority_thu: boolean;
                    has_priority_tue: boolean;
                    has_priority_wed: boolean;
                    has_redeemed_button: boolean;
                    has_redeemed_cap: boolean;
                    has_redeemed_tote: boolean;
                    has_redeemed_tshirt: boolean;
                    is_eligible_button: boolean;
                    is_eligible_cap: boolean;
                    is_eligible_tote: boolean;
                    is_eligible_tshirt: boolean;
                    points: number;
                    puzzles_completed: string[];
                    user_id: string;
                };
                Insert: {
                    favorite_events?: string[];
                    has_priority_fri?: boolean;
                    has_priority_mon?: boolean;
                    has_priority_sat?: boolean;
                    has_priority_sun?: boolean;
                    has_priority_thu?: boolean;
                    has_priority_tue?: boolean;
                    has_priority_wed?: boolean;
                    has_redeemed_button?: boolean;
                    has_redeemed_cap?: boolean;
                    has_redeemed_tote?: boolean;
                    has_redeemed_tshirt?: boolean;
                    is_eligible_button?: boolean;
                    is_eligible_cap?: boolean;
                    is_eligible_tote?: boolean;
                    is_eligible_tshirt?: boolean;
                    points?: number;
                    puzzles_completed?: string[];
                    user_id: string;
                };
                Update: {
                    favorite_events?: string[];
                    has_priority_fri?: boolean;
                    has_priority_mon?: boolean;
                    has_priority_sat?: boolean;
                    has_priority_sun?: boolean;
                    has_priority_thu?: boolean;
                    has_priority_tue?: boolean;
                    has_priority_wed?: boolean;
                    has_redeemed_button?: boolean;
                    has_redeemed_cap?: boolean;
                    has_redeemed_tote?: boolean;
                    has_redeemed_tshirt?: boolean;
                    is_eligible_button?: boolean;
                    is_eligible_cap?: boolean;
                    is_eligible_tote?: boolean;
                    is_eligible_tshirt?: boolean;
                    points?: number;
                    puzzles_completed?: string[];
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "attendees_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: true;
                        referencedRelation: "roles";
                        referencedColumns: ["user_id"];
                    },
                ];
            };
            corporate: {
                Row: {
                    email: string;
                    name: string;
                };
                Insert: {
                    email: string;
                    name: string;
                };
                Update: {
                    email?: string;
                    name?: string;
                };
                Relationships: [];
            };
            event_attendance: {
                Row: {
                    attendee: string;
                    event_id: string;
                };
                Insert: {
                    attendee: string;
                    event_id: string;
                };
                Update: {
                    attendee?: string;
                    event_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "event_attendance_attendee_fkey";
                        columns: ["attendee"];
                        isOneToOne: false;
                        referencedRelation: "attendees";
                        referencedColumns: ["user_id"];
                    },
                    {
                        foreignKeyName: "event_attendance_event_id_fkey";
                        columns: ["event_id"];
                        isOneToOne: false;
                        referencedRelation: "events";
                        referencedColumns: ["event_id"];
                    },
                ];
            };
            events: {
                Row: {
                    attendance_count: number;
                    description: string;
                    end_time: string;
                    event_id: string;
                    event_type: Database["public"]["Enums"]["event_type"];
                    image_url: string | null;
                    is_virtual: boolean;
                    is_visible: boolean;
                    location: string | null;
                    name: string;
                    points: number;
                    start_time: string;
                };
                Insert: {
                    attendance_count?: number;
                    description: string;
                    end_time: string;
                    event_id?: string;
                    event_type: Database["public"]["Enums"]["event_type"];
                    image_url?: string | null;
                    is_virtual: boolean;
                    is_visible?: boolean;
                    location?: string | null;
                    name: string;
                    points: number;
                    start_time: string;
                };
                Update: {
                    attendance_count?: number;
                    description?: string;
                    end_time?: string;
                    event_id?: string;
                    event_type?: Database["public"]["Enums"]["event_type"];
                    image_url?: string | null;
                    is_virtual?: boolean;
                    is_visible?: boolean;
                    location?: string | null;
                    name?: string;
                    points?: number;
                    start_time?: string;
                };
                Relationships: [];
            };
            meetings: {
                Row: {
                    committee_type: Database["public"]["Enums"]["committee_names"];
                    meeting_id: string;
                    start_time: string;
                };
                Insert: {
                    committee_type: Database["public"]["Enums"]["committee_names"];
                    meeting_id?: string;
                    start_time: string;
                };
                Update: {
                    committee_type?: Database["public"]["Enums"]["committee_names"];
                    meeting_id?: string;
                    start_time?: string;
                };
                Relationships: [];
            };
            notifications: {
                Row: {
                    device_id: string;
                    user_id: string;
                };
                Insert: {
                    device_id: string;
                    user_id: string;
                };
                Update: {
                    device_id?: string;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "notifications_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: true;
                        referencedRelation: "roles";
                        referencedColumns: ["user_id"];
                    },
                ];
            };
            registrations: {
                Row: {
                    allergies: string[];
                    degree: string;
                    dietary_restrictions: string[];
                    email: string;
                    ethnicity: string[] | null;
                    gender: string | null;
                    graduation: string | null;
                    has_resume: boolean;
                    has_submitted: boolean;
                    hear_about_rp: string[] | null;
                    is_interested_mech_mania: boolean;
                    is_interested_puzzle_bang: boolean;
                    job_interest: string[] | null;
                    major: string | null;
                    name: string;
                    portfolios: string[];
                    university: string;
                    user_id: string;
                };
                Insert: {
                    allergies?: string[];
                    degree: string;
                    dietary_restrictions?: string[];
                    email: string;
                    ethnicity?: string[] | null;
                    gender?: string | null;
                    graduation?: string | null;
                    has_resume?: boolean;
                    has_submitted?: boolean;
                    hear_about_rp?: string[] | null;
                    is_interested_mech_mania: boolean;
                    is_interested_puzzle_bang: boolean;
                    job_interest?: string[] | null;
                    major?: string | null;
                    name: string;
                    portfolios?: string[];
                    university: string;
                    user_id: string;
                };
                Update: {
                    allergies?: string[];
                    degree?: string;
                    dietary_restrictions?: string[];
                    email?: string;
                    ethnicity?: string[] | null;
                    gender?: string | null;
                    graduation?: string | null;
                    has_resume?: boolean;
                    has_submitted?: boolean;
                    hear_about_rp?: string[] | null;
                    is_interested_mech_mania?: boolean;
                    is_interested_puzzle_bang?: boolean;
                    job_interest?: string[] | null;
                    major?: string | null;
                    name?: string;
                    portfolios?: string[];
                    university?: string;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "registrations_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: true;
                        referencedRelation: "roles";
                        referencedColumns: ["user_id"];
                    },
                ];
            };
            roles: {
                Row: {
                    display_name: string;
                    email: string;
                    roles: Database["public"]["Enums"]["role_type"][];
                    user_id: string;
                };
                Insert: {
                    display_name: string;
                    email: string;
                    roles?: Database["public"]["Enums"]["role_type"][];
                    user_id: string;
                };
                Update: {
                    display_name?: string;
                    email?: string;
                    roles?: Database["public"]["Enums"]["role_type"][];
                    user_id?: string;
                };
                Relationships: [];
            };
            speakers: {
                Row: {
                    bio: string;
                    event_description: string;
                    event_title: string;
                    img_url: string;
                    name: string;
                    speaker_id: string;
                    title: string;
                };
                Insert: {
                    bio: string;
                    event_description: string;
                    event_title: string;
                    img_url: string;
                    name: string;
                    speaker_id?: string;
                    title: string;
                };
                Update: {
                    bio?: string;
                    event_description?: string;
                    event_title?: string;
                    img_url?: string;
                    name?: string;
                    speaker_id?: string;
                    title?: string;
                };
                Relationships: [];
            };
            staff: {
                Row: {
                    attendances: Json;
                    email: string;
                    name: string;
                    team: Database["public"]["Enums"]["committee_names"];
                };
                Insert: {
                    attendances?: Json;
                    email: string;
                    name: string;
                    team: Database["public"]["Enums"]["committee_names"];
                };
                Update: {
                    attendances?: Json;
                    email?: string;
                    name?: string;
                    team?: Database["public"]["Enums"]["committee_names"];
                };
                Relationships: [];
            };
            subscriptions: {
                Row: {
                    mailing_list: string;
                    subscriptions: string[];
                };
                Insert: {
                    mailing_list: string;
                    subscriptions?: string[];
                };
                Update: {
                    mailing_list?: string;
                    subscriptions?: string[];
                };
                Relationships: [];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            [_ in never]: never;
        };
        Enums: {
            committee_names:
                | "CONTENT"
                | "CORPORATE"
                | "DESIGN"
                | "DEV"
                | "FULL TEAM"
                | "MARKETING"
                | "OPERATIONS";
            event_type:
                | "SPEAKER"
                | "CORPORATE"
                | "SPECIAL"
                | "PARTNERS"
                | "MEALS"
                | "CHECKIN";
            role_type: "USER" | "STAFF" | "ADMIN" | "CORPORATE" | "PUZZLEBANG";
            staff_attendance_type: "PRESENT" | "EXCUSED" | "ABSENT";
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
};

type DefaultSchema = Database[Extract<keyof Database, "public">];

export type Tables<
    DefaultSchemaTableNameOrOptions extends
        | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
        | { schema: keyof Database },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof Database;
    }
        ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
              Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
        : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
    ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
          Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
          Row: infer R;
      }
        ? R
        : never
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
            DefaultSchema["Views"])
      ? (DefaultSchema["Tables"] &
            DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
            Row: infer R;
        }
          ? R
          : never
      : never;

export type TablesInsert<
    DefaultSchemaTableNameOrOptions extends
        | keyof DefaultSchema["Tables"]
        | { schema: keyof Database },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof Database;
    }
        ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
        : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
    ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
          Insert: infer I;
      }
        ? I
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
      ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
            Insert: infer I;
        }
          ? I
          : never
      : never;

export type TablesUpdate<
    DefaultSchemaTableNameOrOptions extends
        | keyof DefaultSchema["Tables"]
        | { schema: keyof Database },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof Database;
    }
        ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
        : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
    ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
          Update: infer U;
      }
        ? U
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
      ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
            Update: infer U;
        }
          ? U
          : never
      : never;

export type Enums<
    DefaultSchemaEnumNameOrOptions extends
        | keyof DefaultSchema["Enums"]
        | { schema: keyof Database },
    EnumName extends DefaultSchemaEnumNameOrOptions extends {
        schema: keyof Database;
    }
        ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
        : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
    ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
      ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
      : never;

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
        | keyof DefaultSchema["CompositeTypes"]
        | { schema: keyof Database },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof Database;
    }
        ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
        : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
    ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
      ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
      : never;

export const Constants = {
    graphql_public: {
        Enums: {},
    },
    public: {
        Enums: {
            committee_names: [
                "CONTENT",
                "CORPORATE",
                "DESIGN",
                "DEV",
                "FULL TEAM",
                "MARKETING",
                "OPERATIONS",
            ],
            event_type: [
                "SPEAKER",
                "CORPORATE",
                "SPECIAL",
                "PARTNERS",
                "MEALS",
                "CHECKIN",
            ],
            role_type: ["USER", "STAFF", "ADMIN", "CORPORATE", "PUZZLEBANG"],
            staff_attendance_type: ["PRESENT", "EXCUSED", "ABSENT"],
        },
    },
} as const;
