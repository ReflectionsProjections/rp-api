import { Schema } from "mongoose";
import { TierType, IconColorType } from "../../database";
import { Database } from "../../database.types";
import { z } from "zod";
import { registry } from "../../middleware/openapi-registry";

export type DayKey = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

// Database types for consistency with other schema patterns
export type AttendeeType = Database["public"]["Tables"]["attendees"]["Row"];

// Zod enums for runtime validation and .Enum access
export const Tiers = registry.register(
    "Tiers",
    z
        .enum(["TIER1", "TIER2", "TIER3", "TIER4"])
        .openapi("Tiers", { description: "Attendee merchandise tier" })
) satisfies z.ZodEnum<[TierType, ...TierType[]]>;

export const IconColors = z.enum([
    "BLUE",
    "RED",
    "GREEN",
    "PINK",
    "PURPLE",
    "ORANGE",
] as const) satisfies z.ZodEnum<[IconColorType, ...IconColorType[]]>;

// sub-schemas
const HasPriorityDaysView = z.object({
    Mon: z.boolean().default(false),
    Tue: z.boolean().default(false),
    Wed: z.boolean().default(false),
    Thu: z.boolean().default(false),
    Fri: z.boolean().default(false),
    Sat: z.boolean().default(false),
    Sun: z.boolean().default(false),
});

const MerchView = z.object({
    Tshirt: z.boolean(),
    Button: z.boolean(),
    Tote: z.boolean(),
    Cap: z.boolean(),
});

// Main Attendee schema
export const AttendeeView = registry.register(
    "AttendeeView",
    z
        .object({
            userId: z.string(),
            name: z.string(),
            email: z.string().email(),
            events: z.array(z.string()).default([]),
            dietaryRestrictions: z.array(z.string()),
            allergies: z.array(z.string()),
            points: z.number().default(0),
            hasPriority: HasPriorityDaysView.default({
                Mon: false,
                Tue: false,
                Wed: false,
                Thu: false,
                Fri: false,
                Sat: false,
                Sun: false,
            }),
            hasRedeemedMerch: MerchView.default({
                Tshirt: false,
                Button: false,
                Tote: false,
                Cap: false,
            }),
            isEligibleMerch: MerchView.default({
                Tshirt: true,
                Button: false,
                Tote: false,
                Cap: false,
            }),
            favorites: z.array(z.string()).default([]),
            puzzlesCompleted: z.array(z.string()).default([]),
        })
        .openapi("AttendeeView", {
            example: {
                userId: "user_12345",
                name: "Alice Johnson",
                email: "alice@example.com",

                events: ["event_1", "event_2"],

                dietaryRestrictions: ["vegetarian"],
                allergies: ["peanuts"],

                points: 120,

                hasPriority: {
                    Mon: true,
                    Tue: false,
                    Wed: false,
                    Thu: true,
                    Fri: false,
                    Sat: false,
                    Sun: false,
                },

                hasRedeemedMerch: {
                    Tshirt: true,
                    Button: false,
                    Tote: false,
                    Cap: false,
                },

                isEligibleMerch: {
                    Tshirt: true,
                    Button: true,
                    Tote: false,
                    Cap: false,
                },

                favorites: ["event_3", "event_7"],
                puzzlesCompleted: ["puzzle_1", "puzzle_2"],
            },
        })
);

// Mongoose schema for attendee
export const AttendeeSchema = new Schema({
    userId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    events: [{ type: String, ref: "Event", default: [] }],
    dietaryRestrictions: { type: [String], required: true },
    allergies: { type: [String], required: true },
    points: { type: Number, default: 0 },
    hasPriority: {
        type: new Schema(
            {
                Mon: { type: Boolean, default: false },
                Tue: { type: Boolean, default: false },
                Wed: { type: Boolean, default: false },
                Thu: { type: Boolean, default: false },
                Fri: { type: Boolean, default: false },
                Sat: { type: Boolean, default: false },
                Sun: { type: Boolean, default: false },
            },
            { _id: false }
        ),
        default: {
            Mon: false,
            Tue: false,
            Wed: false,
            Thu: false,
            Fri: false,
            Sat: false,
            Sun: false,
        },
    },
    hasRedeemedMerch: {
        type: new Schema(
            {
                Tshirt: { type: Boolean, default: false },
                Button: { type: Boolean, default: false },
                Tote: { type: Boolean, default: false },
                Cap: { type: Boolean, default: false },
            },
            { _id: false }
        ),
        default: {
            Tshirt: false,
            Button: false,
            Tote: false,
            Cap: false,
        },
    },
    isEligibleMerch: {
        type: new Schema(
            {
                Tshirt: { type: Boolean, default: true },
                Button: { type: Boolean, default: false },
                Tote: { type: Boolean, default: false },
                Cap: { type: Boolean, default: false },
            },
            { _id: false }
        ),
        default: {
            Tshirt: true,
            Button: false,
            Tote: false,
            Cap: false,
        },
    },

    favorites: [{ type: String }],
    puzzlesCompleted: [{ type: String, default: [] }],
});

export const AttendeeAttendanceSchema = new Schema({
    userId: {
        type: String,
        ref: "Attendee",
        required: true,
    },
    eventsAttended: [{ type: String, ref: "Event", required: true }],
});
