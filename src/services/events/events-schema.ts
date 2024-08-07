import { Schema } from "mongoose";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

export const EventType = z.enum(["A", "B", "C"]);

export const publicEventValidator = z.object({
    eventId: z.coerce.string().default(() => uuidv4()),
    name: z.string(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    points: z.number().min(0),
    description: z.string(),
    isVirtual: z.boolean(),
    imageUrl: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    eventType: EventType,
});

export const privateEventValidator = publicEventValidator.extend({
    attendanceCount: z.number(),
    isVisible: z.boolean(),
});

export const EventSchema = new Schema({
    eventId: {
        type: String,
        required: true,
        unique: true,
        default: () => uuidv4(),
    },
    name: {
        type: String,
        required: true,
    },
    startTime: {
        type: Date,
        required: true,
    },
    endTime: {
        type: Date,
        required: true,
    },
    points: {
        type: Number,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    isVirtual: {
        type: Boolean,
        required: true,
    },
    imageUrl: {
        type: String,
        default: null,
    },
    location: {
        type: String,
        default: null,
    },
    isVisible: {
        type: Boolean,
        default: false,
    },
    attendanceCount: {
        type: Number,
        default: 0,
    },
    eventType: {
        type: String,
        required: true,
        enum: EventType.Values,
    },
});

export const EventAttendanceSchema = new Schema({
    eventId: {
        type: String,
        ref: "Event",
        required: true,
    },
    attendees: [
        {
            type: String,
            ref: "Attendee",
            required: true,
        },
    ],
});

export const EventAttendanceValidator = z.object({
    eventId: z.string(),
    attendees: z.array(z.string()),
});
