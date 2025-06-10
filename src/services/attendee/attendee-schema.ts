import { Schema } from "mongoose";

export type DayKey = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

// Mongoose schema for attendee
export const AttendeeSchema = new Schema({
    userId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    events: [{ type: String, ref: "Event", default: [] }],
    dietaryRestrictions: { type: [String], required: true },
    allergies: { type: [String], required: true },
    hasCheckedIn: { type: Boolean, default: false },
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
