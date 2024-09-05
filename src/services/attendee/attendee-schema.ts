import { Schema } from "mongoose";

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
    foodWave: { type: Number, default: 0 },
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
                Button: { type: Boolean, default: false },
                Tote: { type: Boolean, default: false },
                Cap: { type: Boolean, default: false },
            },
            { _id: false }
        ),
    },
    isEligibleMerch: {
        type: new Schema(
            {
                Button: { type: Boolean, default: false },
                Tote: { type: Boolean, default: false },
                Cap: { type: Boolean, default: false },
            },
            { _id: false }
        ),
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
