import { Schema } from "mongoose";
import { TierType, IconColorType } from "../../database";
import { Database } from "../../database.types";
import { z } from "zod";

export type DayKey = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

// Database types for consistency with other schema patterns
export type AttendeeType = Database["public"]["Tables"]["attendees"]["Row"];

// Zod enums for runtime validation and .Enum access
export const Tiers = z.enum(["TIER1", "TIER2", "TIER3", "TIER4"]) satisfies z.ZodEnum<
    [TierType, ...TierType[]]
>;

export const IconColors = z.enum([
    "BLUE",
    "RED",
    "GREEN",
    "YELLOW",
    "PINK",
    "BLACK",
    "PURPLE",
    "ORANGE",
] as const) satisfies z.ZodEnum<[IconColorType, ...IconColorType[]]>;

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
