export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: "12.2.3 (519615d)";
    };
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
                    extensions?: Json;
                    operationName?: string;
                    query?: string;
                    variables?: Json;
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
            attendeeAttendances: {
                Row: {
                    eventsAttended: string[];
                    userId: string;
                };
                Insert: {
                    eventsAttended?: string[];
                    userId: string;
                };
                Update: {
                    eventsAttended?: string[];
                    userId?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "attendee_attendance_user_id_fkey";
                        columns: ["userId"];
                        isOneToOne: true;
                        referencedRelation: "authInfo";
                        referencedColumns: ["userId"];
                    },
                ];
            };
            attendees: {
                Row: {
                    currentTier: Database["public"]["Enums"]["tierType"];
                    favoriteEvents: string[];
                    hasPriorityFri: boolean;
                    hasPriorityMon: boolean;
                    hasPrioritySat: boolean;
                    hasPrioritySun: boolean;
                    hasPriorityThu: boolean;
                    hasPriorityTue: boolean;
                    hasPriorityWed: boolean;
                    icon: Database["public"]["Enums"]["iconColorType"];
                    points: number;
                    puzzlesCompleted: string[];
                    tags: string[];
                    userId: string;
                };
                Insert: {
                    currentTier?: Database["public"]["Enums"]["tierType"];
                    favoriteEvents?: string[];
                    hasPriorityFri?: boolean;
                    hasPriorityMon?: boolean;
                    hasPrioritySat?: boolean;
                    hasPrioritySun?: boolean;
                    hasPriorityThu?: boolean;
                    hasPriorityTue?: boolean;
                    hasPriorityWed?: boolean;
                    icon?: Database["public"]["Enums"]["iconColorType"];
                    points?: number;
                    puzzlesCompleted?: string[];
                    tags?: string[];
                    userId: string;
                };
                Update: {
                    currentTier?: Database["public"]["Enums"]["tierType"];
                    favoriteEvents?: string[];
                    hasPriorityFri?: boolean;
                    hasPriorityMon?: boolean;
                    hasPrioritySat?: boolean;
                    hasPrioritySun?: boolean;
                    hasPriorityThu?: boolean;
                    hasPriorityTue?: boolean;
                    hasPriorityWed?: boolean;
                    icon?: Database["public"]["Enums"]["iconColorType"];
                    points?: number;
                    puzzlesCompleted?: string[];
                    tags?: string[];
                    userId?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "attendees_user_id_fkey";
                        columns: ["userId"];
                        isOneToOne: true;
                        referencedRelation: "authInfo";
                        referencedColumns: ["userId"];
                    },
                ];
            };
            authCodes: {
                Row: {
                    email: string;
                    expTime: string;
                    hashedVerificationCode: string;
                };
                Insert: {
                    email: string;
                    expTime: string;
                    hashedVerificationCode: string;
                };
                Update: {
                    email?: string;
                    expTime?: string;
                    hashedVerificationCode?: string;
                };
                Relationships: [];
            };
            authInfo: {
                Row: {
                    authId: string;
                    displayName: string;
                    email: string;
                    userId: string;
                };
                Insert: {
                    authId: string;
                    displayName: string;
                    email: string;
                    userId: string;
                };
                Update: {
                    authId?: string;
                    displayName?: string;
                    email?: string;
                    userId?: string;
                };
                Relationships: [];
            };
            authRoles: {
                Row: {
                    role: Database["public"]["Enums"]["roleType"];
                    userId: string;
                };
                Insert: {
                    role: Database["public"]["Enums"]["roleType"];
                    userId: string;
                };
                Update: {
                    role?: Database["public"]["Enums"]["roleType"];
                    userId?: string;
                };
                Relationships: [];
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
            draftRegistrations: {
                Row: {
                    allergies: string[];
                    allergiesOther: string;
                    dietaryOther: string;
                    dietaryRestrictions: string[];
                    educationLevel: string;
                    educationOther: string;
                    email: string;
                    ethnicity: string[];
                    ethnicityOther: string;
                    gender: string;
                    genderOther: string;
                    graduationYear: string;
                    howDidYouHear: string[];
                    isInterestedMechMania: boolean;
                    isInterestedPuzzleBang: boolean;
                    majors: string[];
                    minors: string[];
                    name: string;
                    opportunities: string[];
                    personalLinks: string[];
                    resume: string;
                    school: string;
                    tags: string[];
                    userId: string;
                };
                Insert: {
                    allergies?: string[];
                    allergiesOther: string;
                    dietaryOther: string;
                    dietaryRestrictions?: string[];
                    educationLevel: string;
                    educationOther: string;
                    email: string;
                    ethnicity?: string[];
                    ethnicityOther: string;
                    gender: string;
                    genderOther: string;
                    graduationYear: string;
                    howDidYouHear?: string[];
                    isInterestedMechMania: boolean;
                    isInterestedPuzzleBang: boolean;
                    majors?: string[];
                    minors?: string[];
                    name: string;
                    opportunities?: string[];
                    personalLinks?: string[];
                    resume?: string;
                    school: string;
                    tags?: string[];
                    userId: string;
                };
                Update: {
                    allergies?: string[];
                    allergiesOther?: string;
                    dietaryOther?: string;
                    dietaryRestrictions?: string[];
                    educationLevel?: string;
                    educationOther?: string;
                    email?: string;
                    ethnicity?: string[];
                    ethnicityOther?: string;
                    gender?: string;
                    genderOther?: string;
                    graduationYear?: string;
                    howDidYouHear?: string[];
                    isInterestedMechMania?: boolean;
                    isInterestedPuzzleBang?: boolean;
                    majors?: string[];
                    minors?: string[];
                    name?: string;
                    opportunities?: string[];
                    personalLinks?: string[];
                    resume?: string;
                    school?: string;
                    tags?: string[];
                    userId?: string;
                };
                Relationships: [];
            };
            eventAttendances: {
                Row: {
                    attendee: string;
                    eventId: string;
                };
                Insert: {
                    attendee: string;
                    eventId: string;
                };
                Update: {
                    attendee?: string;
                    eventId?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "event_attendance_attendee_fkey";
                        columns: ["attendee"];
                        isOneToOne: false;
                        referencedRelation: "attendees";
                        referencedColumns: ["userId"];
                    },
                    {
                        foreignKeyName: "event_attendance_event_id_fkey";
                        columns: ["eventId"];
                        isOneToOne: false;
                        referencedRelation: "events";
                        referencedColumns: ["eventId"];
                    },
                ];
            };
            events: {
                Row: {
                    attendanceCount: number;
                    description: string;
                    endTime: string;
                    eventId: string;
                    eventType: Database["public"]["Enums"]["eventType"];
                    imageUrl: string | null;
                    isVirtual: boolean;
                    isVisible: boolean;
                    location: string | null;
                    name: string;
                    points: number;
                    startTime: string;
                };
                Insert: {
                    attendanceCount?: number;
                    description: string;
                    endTime: string;
                    eventId?: string;
                    eventType: Database["public"]["Enums"]["eventType"];
                    imageUrl?: string | null;
                    isVirtual: boolean;
                    isVisible?: boolean;
                    location?: string | null;
                    name: string;
                    points: number;
                    startTime: string;
                };
                Update: {
                    attendanceCount?: number;
                    description?: string;
                    endTime?: string;
                    eventId?: string;
                    eventType?: Database["public"]["Enums"]["eventType"];
                    imageUrl?: string | null;
                    isVirtual?: boolean;
                    isVisible?: boolean;
                    location?: string | null;
                    name?: string;
                    points?: number;
                    startTime?: string;
                };
                Relationships: [];
            };
            meetings: {
                Row: {
                    committeeType: Database["public"]["Enums"]["committeeNames"];
                    meetingId: string;
                    startTime: string;
                };
                Insert: {
                    committeeType: Database["public"]["Enums"]["committeeNames"];
                    meetingId?: string;
                    startTime: string;
                };
                Update: {
                    committeeType?: Database["public"]["Enums"]["committeeNames"];
                    meetingId?: string;
                    startTime?: string;
                };
                Relationships: [];
            };
            notifications: {
                Row: {
                    deviceId: string;
                    userId: string;
                };
                Insert: {
                    deviceId: string;
                    userId: string;
                };
                Update: {
                    deviceId?: string;
                    userId?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "notifications_user_id_fkey";
                        columns: ["userId"];
                        isOneToOne: true;
                        referencedRelation: "authInfo";
                        referencedColumns: ["userId"];
                    },
                ];
            };
            registrations: {
                Row: {
                    allergies: string[];
                    dietaryRestrictions: string[];
                    educationLevel: string;
                    email: string;
                    ethnicity: string[];
                    gender: string;
                    graduationYear: string;
                    howDidYouHear: string[];
                    isInterestedMechMania: boolean;
                    isInterestedPuzzleBang: boolean;
                    majors: string[];
                    minors: string[];
                    name: string;
                    opportunities: string[];
                    personalLinks: string[];
                    school: string;
                    hasResume: boolean;
                    tags: string[];
                    userId: string;
                };
                Insert: {
                    allergies?: string[];
                    dietaryRestrictions?: string[];
                    educationLevel: string;
                    email: string;
                    ethnicity?: string[];
                    gender: string;
                    graduationYear: string;
                    howDidYouHear?: string[];
                    isInterestedMechMania: boolean;
                    isInterestedPuzzleBang: boolean;
                    majors?: string[];
                    minors?: string[];
                    name: string;
                    opportunities?: string[];
                    personalLinks?: string[];
                    school: string;
                    tags?: string[];
                    hasResume?: boolean;
                    userId: string;
                };
                Update: {
                    allergies?: string[];
                    dietaryRestrictions?: string[];
                    educationLevel?: string;
                    email?: string;
                    ethnicity?: string[];
                    gender?: string;
                    graduationYear?: string;
                    howDidYouHear?: string[];
                    isInterestedMechMania?: boolean;
                    isInterestedPuzzleBang?: boolean;
                    majors?: string[];
                    minors?: string[];
                    name?: string;
                    opportunities?: string[];
                    personalLinks?: string[];
                    school?: string;
                    tags?: string[];
                    hasResume?: boolean;
                    userId?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "registrations_user_id_fkey";
                        columns: ["userId"];
                        isOneToOne: true;
                        referencedRelation: "authInfo";
                        referencedColumns: ["userId"];
                    },
                ];
            };
            speakers: {
                Row: {
                    bio: string;
                    eventDescription: string;
                    eventTitle: string;
                    imgUrl: string;
                    name: string;
                    speakerId: string;
                    title: string;
                };
                Insert: {
                    bio: string;
                    eventDescription: string;
                    eventTitle: string;
                    imgUrl: string;
                    name: string;
                    speakerId?: string;
                    title: string;
                };
                Update: {
                    bio?: string;
                    eventDescription?: string;
                    eventTitle?: string;
                    imgUrl?: string;
                    name?: string;
                    speakerId?: string;
                    title?: string;
                };
                Relationships: [];
            };
            staff: {
                Row: {
                    attendances: Json;
                    email: string;
                    name: string;
                    team: Database["public"]["Enums"]["committeeNames"];
                };
                Insert: {
                    attendances?: Json;
                    email: string;
                    name: string;
                    team: Database["public"]["Enums"]["committeeNames"];
                };
                Update: {
                    attendances?: Json;
                    email?: string;
                    name?: string;
                    team?: Database["public"]["Enums"]["committeeNames"];
                };
                Relationships: [];
            };
            shifts: {
                Row: {
                    shiftId: string;
                    name: string;
                    role: Database["public"]["Enums"]["shiftRoleType"];
                    startTime: string;
                    endTime: string;
                    location: string;
                };
                Insert: {
                    shiftId?: string;
                    name: string;
                    role: Database["public"]["Enums"]["shiftRoleType"];
                    startTime: string;
                    endTime: string;
                    location: string;
                };
                Update: {
                    shiftId?: string;
                    name?: string;
                    role?: Database["public"]["Enums"]["shiftRoleType"];
                    startTime?: string;
                    endTime?: string;
                    location?: string;
                };
                Relationships: [];
            };
            shiftAssignments: {
                Row: {
                    assignmentId: string;
                    shiftId: string;
                    staffEmail: string;
                };
                Insert: {
                    assignmentId?: string;
                    shiftId: string;
                    staffEmail: string;
                };
                Update: {
                    assignmentId?: string;
                    shiftId?: string;
                    staffEmail?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "shiftAssignments_shiftId_fkey";
                        columns: ["shiftId"];
                        isOneToOne: false;
                        referencedRelation: "shifts";
                        referencedColumns: ["shiftId"];
                    },
                    {
                        foreignKeyName: "shiftAssignments_staffEmail_fkey";
                        columns: ["staffEmail"];
                        isOneToOne: false;
                        referencedRelation: "staff";
                        referencedColumns: ["email"];
                    },
                ];
            };
            subscriptions: {
                Row: {
                    mailingList: string;
                    subscriptions: string[];
                };
                Insert: {
                    mailingList: string;
                    subscriptions?: string[];
                };
                Update: {
                    mailingList?: string;
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
            shiftRoleType:
                | "CLEAN_UP"
                | "DINNER"
                | "CHECK_IN"
                | "SPEAKER_BUDDY"
                | "DEV_ON_CALL"
                | "CHAIR_ON_CALL";
            committeeNames:
                | "CONTENT"
                | "CORPORATE"
                | "DESIGN"
                | "DEV"
                | "FULL TEAM"
                | "MARKETING"
                | "OPERATIONS";
            eventType:
                | "SPEAKER"
                | "CORPORATE"
                | "SPECIAL"
                | "PARTNERS"
                | "MEALS"
                | "CHECKIN";
            iconColorType:
                | "BLUE"
                | "RED"
                | "GREEN"
                | "YELLOW"
                | "PINK"
                | "BLACK"
                | "PURPLE"
                | "ORANGE";
            roleType: "USER" | "STAFF" | "ADMIN" | "CORPORATE" | "PUZZLEBANG";
            staffAttendanceType: "PRESENT" | "EXCUSED" | "ABSENT";
            tierType: "TIER1" | "TIER2" | "TIER3";
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
    keyof Database,
    "public"
>];

export type Tables<
    DefaultSchemaTableNameOrOptions extends
        | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
              DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
        : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
          DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
        : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
        : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
        | { schema: keyof DatabaseWithoutInternals },
    EnumName extends DefaultSchemaEnumNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
        : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
      ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
      : never;

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
        | keyof DefaultSchema["CompositeTypes"]
        | { schema: keyof DatabaseWithoutInternals },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
        : never = never,
> = PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
      ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
      : never;

export const Constants = {
    graphql_public: {
        Enums: {},
    },
    public: {
        Enums: {
            committeeNames: [
                "CONTENT",
                "CORPORATE",
                "DESIGN",
                "DEV",
                "FULL TEAM",
                "MARKETING",
                "OPERATIONS",
            ],
            eventType: [
                "SPEAKER",
                "CORPORATE",
                "SPECIAL",
                "PARTNERS",
                "MEALS",
                "CHECKIN",
            ],
            iconColorType: [
                "BLUE",
                "RED",
                "GREEN",
                "YELLOW",
                "PINK",
                "BLACK",
                "PURPLE",
                "ORANGE",
            ],
            roleType: ["USER", "STAFF", "ADMIN", "CORPORATE", "PUZZLEBANG"],
            staffAttendanceType: ["PRESENT", "EXCUSED", "ABSENT"],
            tierType: ["TIER1", "TIER2", "TIER3"],
        },
    },
} as const;
